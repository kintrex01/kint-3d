export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL."
      );
    }

    const response = await fetch(
      `${url}?tipo=estadisticas_inicio`,
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
        "Apps Script devolvió una respuesta no válida."
      );
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
          "No se pudieron obtener las estadísticas."
      );
    }

    return Response.json({
      ok: true,
      impresionesEnCurso: Number(
        data.impresionesEnCurso || 0
      ),
      pedidosFinalizados: Number(
        data.pedidosFinalizados || 0
      ),
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudieron obtener las estadísticas.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
        impresionesEnCurso: 0,
        pedidosFinalizados: 0,
      },
      { status: 500 }
    );
  }
}