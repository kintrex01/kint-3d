/*
 * Agenda pública (/agenda y la ventana de /cotizar): horarios en FADU y de
 * atención, la impresora y los días sin entrega (Agenda_Kint3D.js).
 */
export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");

    const response = await fetch(`${url}?tipo=agenda`, { cache: "no-store", redirect: "follow" });
    const data = JSON.parse(await response.text());
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la agenda.");

    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar la agenda." },
      { status: 500 }
    );
  }
}
