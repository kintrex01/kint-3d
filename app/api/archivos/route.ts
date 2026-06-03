import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const pedido = String(formData.get("pedido") || "").trim();
    const codigo = String(formData.get("codigo") || "").trim();
    const archivos = formData.getAll("archivos") as File[];

    if (!pedido) {
      throw new Error("Falta el número de pedido.");
    }

    if (!codigo) {
      throw new Error("Falta el código de seguimiento.");
    }

    if (!archivos.length) {
      throw new Error("Seleccioná al menos un archivo.");
    }

    const archivosSubidos = [];

    for (const archivo of archivos) {
      if (archivo.size > 50 * 1024 * 1024) {
        throw new Error(`El archivo ${archivo.name} supera los 50 MB.`);
      }

      const extension = archivo.name.split(".").pop()?.toLowerCase();

      if (extension !== "stl" && extension !== "skp") {
        throw new Error("Solo se permiten archivos STL o SKP.");
      }

      const buffer = Buffer.from(await archivo.arrayBuffer());

      const nombreSeguro = archivo.name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const ruta = `${pedido}/${Date.now()}-${nombreSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from("kint-archivos")
        .upload(ruta, buffer, {
          contentType: archivo.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("kint-archivos")
        .getPublicUrl(ruta);

      archivosSubidos.push({
        nombreArchivo: archivo.name,
        link: data.publicUrl,
        idDrive: ruta,
      });
    }

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "archivo_adicional_link",
        pedido,
        codigo,
        archivos: archivosSubidos,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();

    if (!text || !text.trim()) {
      throw new Error("Apps Script devolvió una respuesta vacía.");
    }

    const data = JSON.parse(text);

    if (!data.ok) {
      throw new Error(data.error || "No se pudo registrar el archivo.");
    }

    return Response.json({
      ok: true,
      archivos: archivosSubidos,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al subir archivos.",
      },
      { status: 500 }
    );
  }
}