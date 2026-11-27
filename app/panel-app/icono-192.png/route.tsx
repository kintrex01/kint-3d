import { iconoPanel } from "@/lib/icono-panel";

/* Ícono 192px de la app del panel (lib/icono-panel.tsx). */
export async function GET() {
  const imagen = await iconoPanel(192);
  imagen.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
  return imagen;
}
