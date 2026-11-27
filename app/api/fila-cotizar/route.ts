/*
 * Seguimiento: en qué puesto de la fila para cotizar está el pedido (los «Recibido»,
 * por orden de llegada). POST { pedido, codigo } → { puesto (0 = ya no espera), total }.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pedido?: string; codigo?: string };
    const respuesta = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        tipo: "fila_cotizar",
        pedido: String(body.pedido || "").slice(0, 20),
        codigo: String(body.codigo || "").slice(0, 20),
      }),
      cache: "no-store",
    });
    return Response.json(JSON.parse(await respuesta.text()));
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo ver la fila." });
  }
}
