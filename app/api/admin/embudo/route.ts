import { createClient } from "@supabase/supabase-js";
import { exigirAdmin } from "@/lib/admin-auth";

/* Panel: cuántas visitas llegaron a cada paso de Cotizar en los últimos días. */

const PASOS = ["entro", "correo", "archivo", "completo", "envio"] as const;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const rechazo = await exigirAdmin(request);
  if (rechazo) return rechazo;

  const dias = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("dias")) || 30));
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  try {
    const conteos = await Promise.all(
      PASOS.map(async (paso) => {
        const { count, error } = await supabase
          .from("embudo_cotizar")
          .select("id", { count: "exact", head: true })
          .eq("paso", paso)
          .gte("creado", desde);
        if (error) throw error;
        return { paso, visitas: count ?? 0 };
      })
    );
    return Response.json({ ok: true, dias, pasos: conteos });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo leer el embudo." },
      { status: 500 }
    );
  }
}
