/*
 * Cobros extra en el seguimiento (pieza olvidada, etc.): verlos y subir el comprobante.
 * POST { accion: "ver" | "comprobante", pedido, codigo, id?, archivoBase64?, archivoNombre? }
 * → Apps Script (CobrosExtra_Kint3D.js). El pedido se valida con su código de seguimiento.
 */
const TIPOS: Record<string, string> = {
  ver: "cobros_extra_ver",
  comprobante: "cobro_extra_comprobante",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accion?: string;
      pedido?: string;
      codigo?: string;
      id?: string;
      archivoBase64?: string;
      archivoNombre?: string;
    };
    const tipo = TIPOS[String(body.accion || "ver")];
    if (!tipo) return Response.json({ ok: false, error: "Acción no válida." }, { status: 400 });
    const respuesta = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        tipo,
        pedido: String(body.pedido || "").slice(0, 20),
        codigo: String(body.codigo || "").slice(0, 20),
        id: String(body.id || "").slice(0, 20),
        archivoBase64: tipo === "cobro_extra_comprobante" ? String(body.archivoBase64 || "") : undefined,
        archivoNombre: String(body.archivoNombre || "").slice(0, 120),
      }),
      cache: "no-store",
    });
    return Response.json(JSON.parse(await respuesta.text()));
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "No se pudo consultar el cobro." });
  }
}
