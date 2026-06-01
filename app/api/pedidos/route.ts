export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo") as File | null;

    let archivoBase64 = "";
    let archivoNombre = "";
    let archivoTipo = "";

    if (archivo && archivo.size > 0) {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      archivoBase64 = buffer.toString("base64");
      archivoNombre = archivo.name;
      archivoTipo = archivo.type || "application/octet-stream";
    }

    const payload = {
      nombre: String(formData.get("nombre") || ""),
      fechaEntrega: String(formData.get("fechaEntrega") || ""),
      escala: String(formData.get("escala") || ""),
      color: String(formData.get("color") || ""),
      armado: String(formData.get("armado") || ""),
      alisado: String(formData.get("alisado") || ""),
      boquilla: String(formData.get("boquilla") || ""),
      comentarios: String(formData.get("comentarios") || ""),
      archivoBase64,
      archivoNombre,
      archivoTipo,
    };

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();
    const data = JSON.parse(text);

    if (!data.ok) {
      throw new Error(data.error || "Error en Apps Script");
    }

    return Response.json({
  ok: true,
  pedido: data.pedido,
});
  } catch (error: any) {
    console.error("ERROR APPS SCRIPT:", error);

    return Response.json(
      {
        ok: false,
        error: error?.message || JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}