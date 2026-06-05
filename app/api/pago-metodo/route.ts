export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "metodo_pago",
        pedido: body.pedido,
        codigo: body.codigo,
        metodo: body.metodo,
      }),
    });

    const text = await response.text();
    const data = JSON.parse(text);

    return Response.json(data);
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error?.message || "Error al guardar método de pago.",
    });
  }
}