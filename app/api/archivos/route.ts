export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pedido = String(body.pedido || "").trim();
    const codigo = String(body.codigo || "").trim();
    const archivos = body.archivos || [];

    if (!pedido) throw new Error("Falta el número de pedido.");
    if (!codigo) throw new Error("Falta el código de seguimiento.");
    if (!archivos.length) throw new Error("No se recibieron archivos.");

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "archivo_adicional_link",
        pedido,
        codigo,
        archivos,
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
      throw new Error(data.error || "No se pudieron registrar los archivos.");
    }

    return Response.json({
      ok: true,
      archivos,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al registrar archivos.",
      },
      { status: 500 }
    );
  }
}