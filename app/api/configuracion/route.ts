export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL."
      );
    }

    const response = await fetch(
      `${url}?tipo=configuracion`,
      {
        cache: "no-store",
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
          "No se pudo obtener la configuración."
      );
    }

    return Response.json(data);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la configuración.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}