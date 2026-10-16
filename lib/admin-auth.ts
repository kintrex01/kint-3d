/*
 * Autenticación del panel de admin (solo servidor).
 *
 * - Una sola persona (el dueño): contraseña en ADMIN_PASSWORD.
 * - Sesión = cookie httpOnly "kint_admin" con un token firmado:
 *     base64url(JSON {exp, v}) + "." + base64url(HMAC-SHA256)
 *   con ADMIN_SESSION_SECRET. Cambiar ese secreto cierra todas las sesiones.
 * - Apps Script exige ADMIN_API_SECRET en cada acción admin_* (su URL es pública).
 *
 * No importar nunca desde un componente "use client".
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_ADMIN = "kint_admin";
export const DURACION_SESION_SEG = 60 * 60 * 24 * 30; // 30 días

const VERSION_TOKEN = 1;

function secretoSesion() {
  const secreto = process.env.ADMIN_SESSION_SECRET || "";

  if (secreto.length < 32) {
    throw new Error("Falta configurar ADMIN_SESSION_SECRET.");
  }

  return secreto;
}

function firmar(datos: string) {
  return createHmac("sha256", secretoSesion())
    .update(datos)
    .digest("base64url");
}

/* Compara en tiempo constante (sin filtrar el largo por el tiempo). */
function iguales(a: string, b: string) {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB) && a.length === b.length;
}

export function crearTokenSesion() {
  const datos = Buffer.from(
    JSON.stringify({
      v: VERSION_TOKEN,
      exp: Math.floor(Date.now() / 1000) + DURACION_SESION_SEG,
    })
  ).toString("base64url");

  return `${datos}.${firmar(datos)}`;
}

export function tokenValido(token: string | undefined) {
  if (!token) return false;

  const [datos, firma] = token.split(".");
  if (!datos || !firma) return false;

  try {
    if (!iguales(firma, firmar(datos))) return false;

    const contenido = JSON.parse(
      Buffer.from(datos, "base64url").toString("utf8")
    );

    return (
      contenido?.v === VERSION_TOKEN &&
      typeof contenido.exp === "number" &&
      contenido.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function contrasenaCorrecta(intento: string) {
  // Sin espacios de los costados: el teclado del celular a veces agrega uno.
  const correcta = (process.env.ADMIN_PASSWORD || "").trim();

  // Sin contraseña configurada no se puede entrar.
  if (correcta.length < 8) return false;

  return iguales(intento.trim(), correcta);
}

export async function sesionActiva() {
  const almacen = await cookies();
  return tokenValido(almacen.get(COOKIE_ADMIN)?.value);
}

/*
 * Protección CSRF para pedidos que modifican datos: el navegador
 * siempre manda Origin en un POST; tiene que ser este mismo sitio.
 */
export function origenPermitido(request: Request) {
  const origen = request.headers.get("origin");
  if (!origen) return false;

  try {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host");

    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/*
 * Llamar al principio de cada ruta /api/admin/*.
 * Devuelve una respuesta de error, o null si está todo bien.
 */
export async function exigirAdmin(request: Request) {
  if (request.method !== "GET" && !origenPermitido(request)) {
    return Response.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 }
    );
  }

  if (!(await sesionActiva())) {
    return Response.json(
      { ok: false, error: "Tu sesión venció. Volvé a entrar.", sesion: false },
      { status: 401 }
    );
  }

  return null;
}
