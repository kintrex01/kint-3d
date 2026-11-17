/*
 * Horarios de la impresora para /cotizar (número de pedido y horarios, sin nombres).
 * Sale de la cola que arma el dueño en el panel (ColaImpresion_Kint3D.js).
 */
export async function GET() {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");

    const response = await fetch(`${url}?tipo=cola_impresion`, { cache: "no-store", redirect: "follow" });
    const data = JSON.parse(await response.text());
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la impresora.");

    return Response.json(
      { ok: true, oculta: Boolean(data.oculta), ahora: data.ahora, bloques: data.bloques || [], libreDesde: data.libreDesde || "" },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar la impresora." },
      { status: 500 }
    );
  }
}
