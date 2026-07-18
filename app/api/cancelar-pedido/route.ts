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

    return Response.json({
      ok: true,
      pedido,
      mensaje:
        result.mensaje ||
        "El pedido fue cancelado correctamente.",
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