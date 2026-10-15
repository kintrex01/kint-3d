/*
 * Proxy de Next 16 (antes "middleware"): chequeo rápido de sesión
 * para el panel de admin. Solo lee la cookie, nunca llama a Apps Script.
 *
 * La protección real está en cada ruta /api/admin/* (exigirAdmin),
 * como recomienda la guía de autenticación de Next.
 */

import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ADMIN, tokenValido } from "@/lib/admin-auth";

const PUBLICAS = ["/admin/login", "/api/admin/login"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLICAS.some((ruta) => pathname === ruta)) {
    return NextResponse.next();
  }

  if (tokenValido(request.cookies.get(COOKIE_ADMIN)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Tu sesión venció. Volvé a entrar.", sesion: false },
      { status: 401 }
    );
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("volver", pathname + search);

  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
