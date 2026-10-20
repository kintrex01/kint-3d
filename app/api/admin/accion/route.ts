/*
 * Puerta única del panel hacia Apps Script.
 *
 * El navegador manda { tipo: "admin_...", ...datos }. Acá se verifica
 * la sesión, que la acción exista en el contrato (lib/admin-tipos.ts)
 * y se agrega ADMIN_API_SECRET, que nunca llega al navegador.
 */

import { exigirAdmin } from "@/lib/admin-auth";
import { ACCIONES_ADMIN } from "@/lib/admin-tipos";
import { borrarArchivosPedidos } from "@/lib/archivos-pedido";

export const maxDuration = 60;

const PERMITIDAS = new Set<string>(ACCIONES_ADMIN);

export async function POST(request: Request) {
  const rechazo = await exigirAdmin(request);
  if (rechazo) return rechazo;

  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    const secreto = process.env.ADMIN_API_SECRET;

    if (!url || !secreto) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL o ADMIN_API_SECRET."
      );
    }

    const body = await request.json().catch(() => null);
    const tipo = String(body?.tipo || "");

    if (!PERMITIDAS.has(tipo)) {
      return Response.json(
        { ok: false, error: "Acción no válida." },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ ...body, tipo, adminToken: secreto }),
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

    // Pedido borrado o cancelado: sus archivos de Supabase también se van.
    if (data?.ok) {
      const pedidos =
        tipo === "admin_borrar_pedidos"
          ? data.borrados
          : tipo === "admin_pedido_cancelar" || tipo === "admin_tienda_cancelar"
            ? [body.pedido]
            : null;
      if (Array.isArray(pedidos)) await borrarArchivosPedidos(pedidos);
    }

    return Response.json(data, { status: data?.ok ? 200 : 400 });
  } catch (error: unknown) {
    console.error("ERROR EN ACCIÓN DE ADMIN:", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la acción.",
      },
      { status: 500 }
    );
  }
}
