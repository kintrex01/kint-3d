/*
 * El correo del cliente en este dispositivo, para no pedírselo cada vez:
 * el de la sesión de su cuenta (app/cuenta) o el del último pedido o compra.
 * "¿No sos vos?" lo olvida (y cierra la sesión de la cuenta en este dispositivo).
 */

const CLAVE_SESION = "kint-cuenta-sesion-v1";
const CLAVE_ULTIMO = "kint-ultimo-correo-v1";
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function correoRecordado(): string {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
    if (sesion?.email && EMAIL_VALIDO.test(sesion.email)) return String(sesion.email).trim();
    const ultimo = localStorage.getItem(CLAVE_ULTIMO) || "";
    return EMAIL_VALIDO.test(ultimo) ? ultimo.trim() : "";
  } catch {
    return "";
  }
}

export function recordarCorreo(email: string) {
  try {
    if (EMAIL_VALIDO.test(email.trim())) localStorage.setItem(CLAVE_ULTIMO, email.trim());
  } catch {
    // Sin almacenamiento: la próxima vez lo escribe de nuevo.
  }
}

export function olvidarCorreo() {
  try {
    localStorage.removeItem(CLAVE_ULTIMO);
    localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Nada que olvidar.
  }
}
