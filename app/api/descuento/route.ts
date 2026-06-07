export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "aplicar_descuento",
        pedido: body.pedido,
        codigoSeguimiento: body.codigo,
        codigoDescuento: body.codigoDescuento,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();
    const data = JSON.parse(text);

    return Response.json(data);
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error?.message || "Error al aplicar descuento.",
    });
  }
}