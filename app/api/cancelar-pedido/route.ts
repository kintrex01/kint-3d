import { createClient } from "@supabase/supabase-js";

const BUCKET = "kint-archivos";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function obtenerArchivosDeCarpeta(
  carpeta: string
): Promise<string[]> {
  const rutas: string[] = [];

  let offset = 0;
  const limite = 100;

  while (true) {
    const { data, error } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .list(carpeta, {
          limit: limite,
          offset,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const elemento of data) {
      const ruta =
        `${carpeta}/${elemento.name}`;

      /*
       * Los archivos tienen id.
       * Las carpetas virtuales no.
       */
      if (elemento.id) {
        rutas.push(ruta);
      } else {
        const archivosInternos =
          await obtenerArchivosDeCarpeta(
            ruta
          );

        rutas.push(...archivosInternos);
      }
    }

    if (data.length < limite) {
      break;
    }

    offset += data.length;
  }

  return rutas;
}

async function eliminarArchivosPedido(
  pedido: string
) {
  const pedidoSeguro = pedido.replace(
    /[^A-Z0-9_-]/g,
    ""
  );

  if (!pedidoSeguro) {
    throw new Error(
      "El número de pedido no es válido."
    );
  }

  const rutas =
    await obtenerArchivosDeCarpeta(
      pedidoSeguro
    );

  /*
   * Si no hay objetos físicos,
   * no hay nada que borrar.
   */
  if (rutas.length === 0) {
    return;
  }

  /*
   * Los eliminamos por grupos para que también
   * funcione si un pedido tiene muchos archivos.
   */
  const TAMANO_LOTE = 100;

  for (
    let i = 0;
    i < rutas.length;
    i += TAMANO_LOTE
  ) {
    const lote = rutas.slice(
      i,
      i + TAMANO_LOTE
    );

    const { error } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(lote);

    if (error) {
      throw new Error(error.message);
    }
  }
}

const MOTIVOS_VALIDOS = [
  "El precio no me sirve",
  "Solo estaba averiguando",
  "Ya no necesito el pedido",
  "El plazo de entrega no me sirve",
  "Necesito modificar el proyecto",
  "Otro",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pedido = String(
      searchParams.get("pedido") || ""
    )
      .trim()
      .toUpperCase();

    const codigo = String(
      searchParams.get("codigo") || ""
    )
      .trim()
      .toUpperCase();

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error: "Falta el número de pedido.",
        },
        { status: 400 }
      );
    }

    if (!codigo) {
      return Response.json(
        {
          ok: false,
          error: "Falta el código de seguimiento.",
        },
        { status: 400 }
      );
    }

    const url =
      `${process.env.GOOGLE_APPS_SCRIPT_URL}` +
      `?tipo=verificar_cancelacion` +
      `&pedido=${encodeURIComponent(pedido)}` +
      `&codigo=${encodeURIComponent(codigo)}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const text = await response.text();

    if (!text || !text.trim()) {
      throw new Error(
        "Apps Script devolvió una respuesta vacía."
      );
    }

    const data = JSON.parse(text);

    if (!data.ok) {
      return Response.json(
        {
          ok: false,
          error:
            data.error ||
            "Este pedido no puede cancelarse.",
        },
        { status: 400 }
      );
    }

    return Response.json(data);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al verificar el pedido.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const pedido = String(data.pedido || "")
      .trim()
      .toUpperCase();

    const codigo = String(data.codigo || "")
      .trim()
      .toUpperCase();

    const motivo = String(data.motivo || "").trim();

    const comentario = String(
      data.comentario || ""
    ).trim();

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error: "Falta el número de pedido.",
        },
        { status: 400 }
      );
    }

    if (!codigo) {
      return Response.json(
        {
          ok: false,
          error: "Falta el código de seguimiento.",
        },
        { status: 400 }
      );
    }

    if (!motivo) {
      return Response.json(
        {
          ok: false,
          error:
            "Seleccioná el motivo de la cancelación.",
        },
        { status: 400 }
      );
    }

    if (
      !MOTIVOS_VALIDOS.includes(
        motivo as (typeof MOTIVOS_VALIDOS)[number]
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "El motivo de cancelación no es válido.",
        },
        { status: 400 }
      );
    }

    if (
      motivo === "Otro" &&
      comentario.length < 3
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Contanos brevemente por qué querés cancelar.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      process.env.GOOGLE_APPS_SCRIPT_URL!,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          tipo: "cancelar_pedido",
          pedido,
          codigo,
          motivo,
          comentario,
        }),
      }
    );

    const text = await response.text();

    if (!text || !text.trim()) {
      throw new Error(
        "Apps Script devolvió una respuesta vacía."
      );
    }

    const result = JSON.parse(text);

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error:
            result.error ||
            "No se pudo cancelar el pedido.",
        },
        { status: 400 }
      );
    }

    let advertencia = "";

try {
  await eliminarArchivosPedido(pedido);
} catch (error) {
  console.error(
    `El pedido ${pedido} fue cancelado, pero no se pudieron eliminar sus archivos de Supabase:`,
    error
  );

  advertencia =
    "El pedido fue cancelado correctamente, pero quedaron archivos internos pendientes de limpieza.";
}

return Response.json({
  ok: true,
  pedido,
  mensaje:
    result.mensaje ||
    "El pedido fue cancelado correctamente.",
  advertencia,
});
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al cancelar el pedido.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}