/*
 * Seguimiento de una compra de la tienda (TND) por el cliente:
 * número de pedido + email de la compra.
 */
export async function POST(request: Request) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");
    }

    const body = await request.json().catch(() => null);

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        tipo: "seguimiento_tienda",
        pedido: String(body?.pedido || "").slice(0, 20),
        email: String(body?.email || "").slice(0, 160),
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Apps Script no devolvió una respuesta válida.");
    }

    return Response.json(data, { status: data.ok ? 200 : 404 });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No pudimos buscar tu compra.",
      },
      { status: 500 }
    );
  }
}
