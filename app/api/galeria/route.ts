/*
 * Galería pública de lo impreso (Galeria_Kint3D.js): fotos finales de las
 * maquetas terminadas, con escala, colores, reseña, likes y comentarios.
 * POST: like o comentario (GaleriaInteraccion_Kint3D.js). Los likes de las
 * maquetas con reseña van por /api/resenas (like_resena).
 */
function urlAppsScript() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");
  return url;
}

export async function GET() {
  try {
    const response = await fetch(`${urlAppsScript()}?tipo=galeria`, { cache: "no-store", redirect: "follow" });
    const data = JSON.parse(await response.text());
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la galería.");

    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar la galería." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = await request.json().catch(() => ({}));
    const tipo = cuerpo?.tipo === "like" ? "galeria_like" : cuerpo?.tipo === "comentario" ? "galeria_comentario" : "";
    if (!tipo) return Response.json({ ok: false, error: "Acción no válida." }, { status: 400 });

    const payload = {
      tipo,
      pedido: String(cuerpo.pedido || "").slice(0, 20),
      dispositivo: String(cuerpo.dispositivo || "").slice(0, 80),
      nombre: String(cuerpo.nombre || "").slice(0, 40),
      texto: String(cuerpo.texto || "").slice(0, 300),
    };
    const response = await fetch(urlAppsScript(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "follow",
    });
    const data = JSON.parse(await response.text());
    return Response.json(data, { status: data.ok ? 200 : 400 });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 500 }
    );
  }
}
