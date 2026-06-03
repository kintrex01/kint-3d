export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const pedido = String(formData.get("pedido") || "");
    const codigo = String(formData.get("codigo") || "");
    const archivos = formData.getAll("archivos") as File[];

    if (!pedido) {
      return Response.json({ ok: false, error: "Falta el número de pedido." }, { status: 400 });
    }

    if (!codigo) {
      return Response.json({ ok: false, error: "Falta el código de seguimiento." }, { status: 400 });
    }

    if (!archivos.length) {
      return Response.json({ ok: false, error: "Seleccioná al menos un archivo." }, { status: 400 });
    }

    const archivosPayload = await Promise.all(
      archivos.map(async (archivo) => {
        const buffer = Buffer.from(await archivo.arrayBuffer());

        return {
          archivoBase64: buffer.toString("base64"),
          archivoNombre: archivo.name,
          archivoTipo: archivo.type || "application/octet-stream",
        };
      })
    );

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "archivo_adicional",
        pedido,
        codigo,
        archivos: archivosPayload,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();

    console.log("RESPUESTA APPS SCRIPT ARCHIVOS:", text);

    if (!text) {
      throw new Error("Apps Script devolvió una respuesta vacía.");
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Apps Script no devolvió JSON válido: " + text.slice(0, 300));
    }

    if (!data.ok) {
      throw new Error(data.error || "No se pudieron subir los archivos.");
    }

    return Response.json({
      ok: true,
      archivos: data.archivos || [],
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