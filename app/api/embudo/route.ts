import { createClient } from "@supabase/supabase-js";

/*
 * Embudo de Cotizar: cada visita (número al azar, sin datos personales)
 * anota hasta dónde llegó. Lo lee el panel en /admin/embudo.
 */

const PASOS = new Set(["entro", "correo", "archivo", "completo", "envio"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const sesion = String(body?.sesion || "");
    const paso = String(body?.paso || "");

    if (!/^[a-z0-9-]{8,40}$/i.test(sesion) || !PASOS.has(paso)) {
      return Response.json({ ok: false }, { status: 400 });
    }

    // Cada paso cuenta una vez por visita (unique sesion+paso).
    await supabase
      .from("embudo_cotizar")
      .upsert({ sesion, paso }, { onConflict: "sesion,paso", ignoreDuplicates: true });

    return Response.json({ ok: true });
  } catch {
    // Nunca molesta al cliente: si falla, no pasa nada.
    return Response.json({ ok: false });
  }
}
