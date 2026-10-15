import { cookies } from "next/headers";
import { COOKIE_ADMIN, origenPermitido } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!origenPermitido(request)) {
    return Response.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 }
    );
  }

  (await cookies()).delete(COOKIE_ADMIN);

  return Response.json({ ok: true });
}
