/*
 * Comprobante del saldo de una compra de la tienda (TND).
 * El cliente lo sube desde el seguimiento con número + email de la compra:
 * los datos bancarios no viajan por correo.
 */

export const maxDuration = 60;

/* Mismo tope que /api/tienda/pedido (Vercel corta los cuerpos de más de 4,5 MB). */
const MAX_COMPROBANTE_BASE64 = 4_200_000;

export async function POST(request: Request) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error("Falta configurar GOOGLE_APPS_SCRIPT_URL.");
    }

    const body = await request.json().catch(() => null);

    const archivoBase64 = String(body?.archivoBase64 || "");
    const archivoNombre = String(body?.archivoNombre || "").slice(0, 160);

    if (!archivoBase64 || !archivoNombre) {
      return Response.json(
        { ok: false, error: "Subí el comprobante del saldo." },
        { status: 400 }
      );
    }

    if (archivoBase64.length > MAX_COMPROBANTE_BASE64) {
      return Response.json(
        {
          ok: false,
          error: "El comprobante es demasiado pesado. Probá con una captura o un PDF más liviano.",
        },
        { status: 413 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        tipo: "saldo_tienda",
        pedido: String(body?.pedido || "").slice(0, 20),
        email: String(body?.email || "").slice(0, 160),
        archivoBase64,
        archivoNombre,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
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
        error:
          error instanceof Error
            ? error.message
            : "No pudimos subir el comprobante.",
      },
      { status: 500 }
    );
  }
}
