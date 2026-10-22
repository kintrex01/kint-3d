/*
 * Embudo de Cotizar (anónimo): anota hasta qué paso llegó esta visita.
 * Un número al azar por pestaña; ni correo ni nombre. Si falla, no pasa nada.
 */

export type PasoEmbudo = "entro" | "correo" | "archivo" | "completo" | "envio";

const enviados = new Set<PasoEmbudo>();

function sesionEmbudo() {
  try {
    let sesion = sessionStorage.getItem("kint-embudo");
    if (!sesion) {
      sesion = crypto.randomUUID();
      sessionStorage.setItem("kint-embudo", sesion);
    }
    return sesion;
  } catch {
    return "";
  }
}

export function marcarPaso(paso: PasoEmbudo) {
  if (enviados.has(paso)) return;
  const sesion = sesionEmbudo();
  if (!sesion) return;
  enviados.add(paso);
  fetch("/api/embudo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sesion, paso }),
    keepalive: true,
  }).catch(() => {
    // Sin conexión: este paso no se cuenta.
  });
}
