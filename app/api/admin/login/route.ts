import { cookies } from "next/headers";
import {
  COOKIE_ADMIN,
  DURACION_SESION_SEG,
  contrasenaCorrecta,
  crearTokenSesion,
  origenPermitido,
} from "@/lib/admin-auth";

/* Demora fija: hace inútil probar contraseñas por fuerza bruta. */
function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * Límite de intentos por IP; un acierto lo reinicia (en memoria de cada instancia).
 * No reemplaza una contraseña larga, pero corta los ataques en ráfaga.
 */
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const fallos = new Map<string, { cantidad: number; desde: number }>();

function ipDe(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function bloqueada(ip: string) {
  const registro = fallos.get(ip);
  if (!registro) return false;
  if (Date.now() - registro.desde > VENTANA_MS) {
    fallos.delete(ip);
    return false;
  }
  return registro.cantidad >= MAX_FALLOS;
}

function sumarFallo(ip: string) {
  const ahora = Date.now();
  const registro = fallos.get(ip);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    fallos.set(ip, { cantidad: 1, desde: ahora });
  } else {
    registro.cantidad += 1;
  }
  if (fallos.size > 1000) {
    for (const [clave, valor] of fallos) {
      if (ahora - valor.desde > VENTANA_MS) fallos.delete(clave);
    }
  }
}

export async function POST(request: Request) {
  if (!origenPermitido(request)) {
    return Response.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 }
    );
  }

  const ip = ipDe(request);

  if (bloqueada(ip)) {
    return Response.json(
      {
        ok: false,
        error: "Demasiados intentos. Probá de nuevo en 15 minutos.",
      },
      { status: 429 }
    );
  }

  // Se cuenta antes de esperar: así una ráfaga en paralelo también se corta.
  sumarFallo(ip);

  const body = await request.json().catch(() => null);
  const contrasena = String(body?.contrasena || "");

  await esperar(700);

  if (!contrasenaCorrecta(contrasena)) {
    return Response.json(
      { ok: false, error: "Contraseña incorrecta." },
      { status: 401 }
    );
  }

  fallos.delete(ip);

  const almacen = await cookies();

  almacen.set(COOKIE_ADMIN, crearTokenSesion(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });

  return Response.json({ ok: true });
}
