import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { pedido, archivos } = await request.json();

    const firmados = [];

    for (const archivo of archivos) {
      const extension = archivo.nombre.split(".").pop()?.toLowerCase();

      if (extension !== "stl" && extension !== "skp") {
        throw new Error("Solo se permiten archivos STL o SKP.");
      }

      if (archivo.size > 50 * 1024 * 1024) {
        throw new Error(`${archivo.nombre} supera los 50 MB.`);
      }

      const nombreSeguro = archivo.nombre
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const ruta = `${pedido}/${Date.now()}-${nombreSeguro}`;

      const { data, error } = await supabase.storage
        .from("kint-archivos")
        .createSignedUploadUrl(ruta);

      if (error) throw new Error(error.message);

      const publicUrl = supabase.storage
        .from("kint-archivos")
        .getPublicUrl(ruta).data.publicUrl;


firmados.push({
  nombreArchivo: archivo.nombre,
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