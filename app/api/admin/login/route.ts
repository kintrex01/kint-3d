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

export async function POST(request: Request) {
  if (!origenPermitido(request)) {
    return Response.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const contrasena = String(body?.contrasena || "");

  await esperar(700);

  if (!contrasenaCorrecta(contrasena)) {
    return Response.json(
      { ok: false, error: "Contraseña incorrecta." },
      { status: 401 }
    );
  }

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
