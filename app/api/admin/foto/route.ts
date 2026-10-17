/*
 * Sube una foto desde el panel (ej. la de un filamento nuevo) a Supabase
 * y devuelve su enlace público. Solo con la sesión de admin.
 * El navegador ya la manda achicada en WebP.
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { exigirAdmin } from "@/lib/admin-auth";

const TIPOS = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

export async function POST(request: Request) {
  const rechazo = await exigirAdmin(request);
  if (rechazo) return rechazo;

  try {
    const datos = await request.formData();
    const archivo = datos.get("foto");
    if (!(archivo instanceof File)) throw new Error("Falta la foto.");
    const extension = TIPOS.get(archivo.type);
    if (!extension) throw new Error("La foto tiene que ser JPG, PNG o WebP.");
    if (archivo.size > 3 * 1024 * 1024) throw new Error("La foto pesa más de 3 MB.");

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const ruta = `panel/fotos/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("kint-archivos")
      .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type, upsert: false });
    if (error) throw new Error(error.message);

    const url = supabase.storage.from("kint-archivos").getPublicUrl(ruta).data.publicUrl;
    return Response.json({ ok: true, url });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo subir la foto." },
      { status: 400 }
    );
  }
}
