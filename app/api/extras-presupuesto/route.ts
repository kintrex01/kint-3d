/*
 * Productos de la tienda como extra del presupuesto de una maqueta.
 * POST { pedido, codigo }                → ver ofertas y extras elegidos.
 * POST { pedido, codigo, items: [...] }  → guardar los extras.
 */
export async function POST(request: Request) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");
    }

    const body = await request.json().catch(() => null);
    const guardar = Array.isArray(body?.items);

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        tipo: guardar ? "extras_presupuesto" : "extras_presupuesto_ver",
        pedido: String(body?.pedido || "").slice(0, 20),
        codigo: String(body?.codigo || "").slice(0, 120), // código o correo del pedido
        items: guardar
          ? (body.items as unknown[]).slice(0, 5).map((item) => {
              const linea = item as Record<string, unknown>;
              return {
                producto: String(linea?.producto || "").slice(0, 80),
                cadena: String(linea?.cadena || "").slice(0, 40),
                cantidad: Number(linea?.cantidad) || 0,
              };
            })
          : undefined,
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
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

    return Response.json(data, { status: data.ok ? 200 : 400 });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No pudimos cargar los extras.",
      },
      { status: 500 }
    );
  }
}
