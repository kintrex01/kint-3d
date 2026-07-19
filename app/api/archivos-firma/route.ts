import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  throw new Error("No se recibieron archivos.");
}

const pedidoSeguro = pedido.replace(
  /[^A-Z0-9_-]/g,
  ""
);

if (!pedidoSeguro) {
  throw new Error("El número de pedido no es válido.");
}

const firmados = [];

    for (const archivo of archivos) {
     const nombreOriginal = String(
  archivo.nombre || ""
).trim();

const pesoArchivo = Number(
  archivo.size || 0
);

if (!nombreOriginal) {
  throw new Error(
    "Uno de los archivos no tiene nombre."
  );
}

const extension = nombreOriginal
  .split(".")
  .pop()
  ?.toLowerCase();

if (
  extension !== "stl" &&
  extension !== "skp"
) {
  throw new Error(
    "Solo se permiten archivos STL o SKP."
  );
}

if (pesoArchivo <= 0) {
  throw new Error(
    `${nombreOriginal} está vacío.`
  );
}

if (pesoArchivo > 50 * 1024 * 1024) {
  throw new Error(
    `${nombreOriginal} supera los 50 MB.`
  );
}

const nombreSinExtension =
  nombreOriginal.replace(/\.[^.]+$/, "");

const nombreBaseSeguro = nombreSinExtension
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, "_")
  .replace(/[^a-zA-Z0-9_-]/g, "")
  .replace(/_+/g, "_")
  .replace(/^_+|_+$/g, "") || "archivo";

const nombreFinal =
  `${pedidoSeguro}-${nombreBaseSeguro}.${extension}`;

const ruta =
  `${pedidoSeguro}/${randomUUID()}/${nombreFinal}`;

      const { data, error } = await supabase.storage
        .from("kint-archivos")
        .createSignedUploadUrl(ruta);

      if (error) throw new Error(error.message);

      const publicUrl = supabase.storage
        .from("kint-archivos")
        .getPublicUrl(ruta).data.publicUrl;


firmados.push({
  nombreArchivo: nombreFinal,
  nombreOriginal,
  ruta,
  token: data.token,
  signedUrl: data.signedUrl,
  link: publicUrl,
});
    }

    return Response.json({ ok: true, archivos: firmados });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error.message || "Error al preparar subida." },
      { status: 500 }
    );
  }
}