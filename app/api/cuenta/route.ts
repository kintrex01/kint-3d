/*
 * Ajustes de la cuenta del cliente (Cuenta_Kint3D.js en Apps Script):
 * pedir código por correo, verificarlo, ver datos y guardar cambios.
 */
const TIPOS = new Set([
  "cuenta_codigo",
  "cuenta_verificar",
  "cuenta_datos",
  "cuenta_guardar",
  // Ruleta y canje de puntos (Premios_Kint3D.js).
  "ruleta_estado",
  "ruleta_girar",
  "puntos_canjear",
]);

export async function POST(request: Request) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");
    }

    const body = await request.json().catch(() => null);
    const tipo = String(body?.tipo || "");

    if (!TIPOS.has(tipo)) {
      return Response.json({ ok: false, error: "Acción no válida." }, { status: 400 });
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        tipo,
        email: String(body?.email || "").slice(0, 160),
        codigo: String(body?.codigo || "").slice(0, 10),
        token: String(body?.token || "").slice(0, 200),
        nombre: String(body?.nombre || "").slice(0, 80),
        alias: String(body?.alias || "").slice(0, 40),
        telefono: String(body?.telefono || "").slice(0, 24),
        // Aparecer o no en el ranking Top Kint (solo al guardar).
        topKint: typeof body?.topKint === "boolean" ? body.topKint : undefined,
        opcion: String(body?.opcion || "").slice(0, 20),
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Apps Script no devolvió una respuesta válida.");
    }

    return Response.json(data, { status: data.ok ? 200 : 400 });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No pudimos completar la acción.",
      },
      { status: 500 }
    );
  }
}
