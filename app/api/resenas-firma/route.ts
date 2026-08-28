import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXTENSIONES_PERMITIDAS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
];

function mensajeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ||
        "Error desconocido"
    );
  }

  return String(error || "Error desconocido");
}

function obtenerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL en Vercel."
    );
  }

  if (!serviceKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en Vercel."
    );
  }

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function esperar(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function crearFirmaConReintento(
  supabase: ReturnType<
    typeof obtenerSupabaseAdmin
  >,
  ruta: string,
  nombreArchivo: string
) {
  let ultimoError: unknown = null;

  /*
   * Crear una URL firmada no sube todavía el archivo,
   * así que es seguro reintentar una vez si Supabase
   * tiene un fallo de conexión temporal.
   */
  for (
    let intento = 1;
    intento <= 2;
    intento++
  ) {
    try {
      const {
        data,
        error,
      } = await supabase.storage
        .from("kint-archivos")
        .createSignedUploadUrl(ruta);

      if (error) {
        ultimoError = error;
      } else if (
        data &&
        data.token
      ) {
        return data;
      } else {
        ultimoError = new Error(
          "Supabase no devolvió una firma válida."
        );
      }
    } catch (error: unknown) {
      ultimoError = error;
    }

    if (intento < 2) {
      await esperar(400);
    }
  }

  throw new Error(
    `No se pudo preparar "${nombreArchivo}" en Supabase: ` +
      mensajeError(ultimoError)
  );
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const pedido = String(
      body.pedido || ""
    )
      .trim()
      .toUpperCase();

    const archivos =
      Array.isArray(body.archivos)
        ? body.archivos
        : [];

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error:
            "Falta el número de pedido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!archivos.length) {
      return Response.json(
        {
          ok: false,
          error:
            "No se recibieron imágenes.",
        },
        {
          status: 400,
        }
      );
    }

    if (archivos.length > 3) {
      return Response.json(
        {
          ok: false,
          error:
            "Podés subir un máximo de 3 imágenes.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      obtenerSupabaseAdmin();

    const firmados = [];

    for (const archivo of archivos) {
      const nombre = String(
        archivo.nombre || ""
      ).trim();

      const tipo = String(
        archivo.tipo || ""
      )
        .trim()
        .toLowerCase();

      const size = Number(
        archivo.size || 0
      );

      const extension =
        nombre
          .split(".")
          .pop()
          ?.toLowerCase() || "";

      if (!nombre) {
        throw new Error(
          "Una de las imágenes no tiene nombre."
        );
      }

      if (
        !FORMATOS_PERMITIDOS.includes(
          tipo
        ) ||
        !EXTENSIONES_PERMITIDAS.includes(
          extension
        )
      ) {
        throw new Error(
          `${nombre} no tiene un formato válido.`
        );
      }

      if (
        !Number.isFinite(size) ||
        size <= 0
      ) {
        throw new Error(
          `${nombre} está vacío.`
        );
      }

      if (
        size >
        8 * 1024 * 1024
      ) {
        throw new Error(
          `${nombre} supera los 8 MB.`
        );
      }

      let nombreSeguro = nombre
        .replace(/\s+/g, "_")
        .replace(
          /[^a-zA-Z0-9._-]/g,
          ""
        );

      if (!nombreSeguro) {
        nombreSeguro =
          `imagen.${extension}`;
      }

      const identificador =
        crypto.randomUUID();

      const ruta =
        `resenas/${pedido}/` +
        `${identificador}-${nombreSeguro}`;

      const data =
        await crearFirmaConReintento(
          supabase,
          ruta,
          nombre
        );

      const publicUrl =
        supabase.storage
          .from("kint-archivos")
          .getPublicUrl(ruta)
          .data.publicUrl;

      firmados.push({
        nombreArchivo: nombre,
        ruta,
        token: data.token,
        signedUrl:
          data.signedUrl || "",
        link: publicUrl,
      });
    }

    return Response.json({
      ok: true,
      archivos: firmados,
    });
  } catch (error: unknown) {
    console.error(
      "ERROR RESENAS-FIRMA:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Error preparando las imágenes: " +
          mensajeError(error),
      },
      {
        status: 500,
      }
    );
  }
}