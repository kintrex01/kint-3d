import { createClient } from "@supabase/supabase-js";

/*
 * Archivos de Supabase de un pedido: su carpeta (KNT-0031/...) y las
 * fotos de su reseña (resenas/KNT-0031/...). Se borran cuando el pedido
 * se elimina o se cancela, y antes de usar un número que quedó libre,
 * para que un pedido nuevo nunca herede archivos de uno viejo.
 */

const BUCKET = "kint-archivos";

function cliente() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function listarRutas(supabase: ReturnType<typeof cliente>, carpeta: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(carpeta, { limit: 1000 });
  if (error) throw error;
  const rutas: string[] = [];
  for (const item of data || []) {
    const ruta = `${carpeta}/${item.name}`;
    // Sin id es una subcarpeta (cada subida va en su propia carpeta uuid).
    if (item.id) rutas.push(ruta);
    else rutas.push(...(await listarRutas(supabase, ruta)));
  }
  return rutas;
}

/** Borra los archivos de esos pedidos. Devuelve cuántos borró; nunca tira error. */
export async function borrarArchivosPedidos(pedidos: string[]): Promise<number> {
  const validos = [...new Set(pedidos.map((p) => String(p || "").trim().toUpperCase()))].filter((p) =>
    /^(KNT|TND)-\d{1,6}$/.test(p)
  );
  if (!validos.length) return 0;

  const supabase = cliente();
  let borrados = 0;

  for (const pedido of validos) {
    try {
      const rutas = [
        ...(await listarRutas(supabase, pedido)),
        ...(await listarRutas(supabase, `resenas/${pedido}`)),
      ].filter((ruta) => ruta.startsWith(`${pedido}/`) || ruta.startsWith(`resenas/${pedido}/`));

      for (let i = 0; i < rutas.length; i += 100) {
        const { data, error } = await supabase.storage.from(BUCKET).remove(rutas.slice(i, i + 100));
        if (error) throw error;
        borrados += data?.length || 0;
      }
    } catch (error) {
      console.error(`ARCHIVOS: no se pudieron borrar los de ${pedido}:`, error);
    }
  }

  return borrados;
}
