/*
 * Galería pública de lo impreso (Galeria_Kint3D.js): fotos finales de las
 * maquetas terminadas, con escala y colores. Sin nombres de clientes.
 */
export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");

    const response = await fetch(`${url}?tipo=galeria`, { cache: "no-store", redirect: "follow" });
    const data = JSON.parse(await response.text());
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la galería.");

    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar la galería." },
      { status: 500 }
    );
  }
}
