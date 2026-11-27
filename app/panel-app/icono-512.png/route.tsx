import { iconoPanel } from "@/lib/icono-panel";

/* Ícono 512px de la app del panel (lib/icono-panel.tsx). */
export async function GET() {
  const imagen = await iconoPanel(512);
  imagen.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
  return imagen;
}
