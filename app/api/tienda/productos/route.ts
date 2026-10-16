export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL."
      );
    }

    const response = await fetch(
      `${url}?tipo=productos`,
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
          "No se pudo cargar la tienda."
      );
    }

    // CDN de Vercel: responde al instante y renueva en segundo plano.
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la tienda.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}
