export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedido = searchParams.get("pedido");

    if (!pedido) {
      return Response.json(
        { ok: false, error: "Falta el número de pedido." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.GOOGLE_APPS_SCRIPT_URL}?pedido=${encodeURIComponent(pedido)}`
    );

    const text = await response.text();
    const data = JSON.parse(text);

    return Response.json(data);
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al consultar pedido.",
      },
      { status: 500 }
    );
  }
}