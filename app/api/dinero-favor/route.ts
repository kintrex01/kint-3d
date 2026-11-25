/*
 * Dinero a favor en el seguimiento: ver cuánto tiene, usarlo en el pedido o sacarlo.
 * POST { accion: "ver" | "usar" | "quitar", pedido, codigo } → Apps Script (DineroAFavor_Kint3D.js).
 * El pedido se valida con su código de seguimiento; no manda correos.
 */
const TIPOS: Record<string, string> = {
  ver: "dinero_favor_ver",
  usar: "dinero_favor_usar",
  quitar: "dinero_favor_quitar",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accion?: string; pedido?: string; codigo?: string };
    const tipo = TIPOS[String(body.accion || "ver")];
    if (!tipo) return Response.json({ ok: false, error: "Acción no válida." }, { status: 400 });
    const respuesta = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        tipo,
        pedido: String(body.pedido || "").slice(0, 20),
        codigo: String(body.codigo || "").slice(0, 20),
      }),
      cache: "no-store",
    });
    return Response.json(JSON.parse(await respuesta.text()));
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar el dinero a favor." });
  }
}
