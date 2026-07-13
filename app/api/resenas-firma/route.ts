import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXTENSIONES_PERMITIDAS = ["jpg", "jpeg", "png", "webp"];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pedido = String(body.pedido || "")
      .trim()
      .toUpperCase();

    const archivos = Array.isArray(body.archivos)
      ? body.archivos
      : [];

    if (!pedido) {
      throw new Error("Falta el número de pedido.");
    }

    if (!archivos.length) {
      throw new Error("No se recibieron imágenes.");
    }

    if (archivos.length > 3) {
      throw new Error("Podés subir un máximo de 3 imágenes.");
    }

    const firmados = [];

    for (const archivo of archivos) {
      const nombre = String(archivo.nombre || "").trim();
      const tipo = String(archivo.tipo || "").trim().toLowerCase();
      const size = Number(archivo.size || 0);

      const extension =
        nombre.split(".").pop()?.toLowerCase() || "";

      if (
        !FORMATOS_PERMITIDOS.includes(tipo) ||
        !EXTENSIONES_PERMITIDAS.includes(extension)
      ) {
        throw new Error(
          `${nombre || "Una imagen"} no tiene un formato válido.`
        );
      }

      if (size <= 0) {
        throw new Error(`${nombre} está vacío.`);
      }

      if (size > 8 * 1024 * 1024) {
        throw new Error(`${nombre} supera los 8 MB.`);
      }

      const nombreSeguro = nombre
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const identificador =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

      const ruta =
        `resenas/${pedido}/` +
        `${identificador}-${nombreSeguro}`;

      const { data, error } = await supabase.storage
        .from("kint-archivos")
        .createSignedUploadUrl(ruta);

      if (error) {
        throw new Error(error.message);
      }

      const publicUrl = supabase.storage
        .from("kint-archivos")
        .getPublicUrl(ruta).data.publicUrl;

      firmados.push({
        nombreArchivo: nombre,
        ruta,
        token: data.token,
        signedUrl: data.signedUrl,
        link: publicUrl,
      });
    }

    return Response.json({
      ok: true,
      archivos: firmados,
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al preparar la subida de imágenes.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}