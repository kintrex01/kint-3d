/*
 * Días sin entrega + feriados para el calendario de la web.
 * Lo usan /tienda y /cotizar (components/CalendarioEntrega.tsx).
 */
export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL."
      );
    }

    const response = await fetch(
      `${url}?tipo=calendario_entregas`,
      {
        cache: "no-store",
        redirect: "follow",
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Apps Script no devolvió una respuesta válida."
      );
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
          "No se pudo cargar el calendario."
      );
    }

    // CDN de Vercel: responde al instante. Un día recién bloqueado igual
    // lo rechaza Apps Script al confirmar la compra o el pedido.
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el calendario.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}
