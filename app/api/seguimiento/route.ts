export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pedido = searchParams.get("pedido");
    const codigo = searchParams.get("codigo");

    if (!pedido) {
      return Response.json(
        { ok: false, error: "Falta el número de pedido." },
        { status: 400 }
      );
    }

    if (!codigo) {
      return Response.json(
        { ok: false, error: "Falta el código de seguimiento." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.GOOGLE_APPS_SCRIPT_URL}?pedido=${encodeURIComponent(
        pedido
      )}&codigo=${encodeURIComponent(codigo)}`
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