/*
 * App del panel (Kint Panel): se instala aparte de la web y abre directo en
 * /admin a pantalla completa. Está fuera de /admin a propósito: el proxy
 * pide sesión en /admin y el navegador baja el manifiesto sin cookies.
 */
export function GET() {
  const manifiesto = {
    id: "/admin",
    name: "Kint 3D · Panel",
    short_name: "Kint Panel",
    description: "Panel de gestión de Kint 3D: pedidos, reparto, caja y configuración.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1738",
    theme_color: "#0b1738",
    lang: "es-UY",
    icons: [
      { src: "/panel-app/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/panel-app/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/panel-app/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Todos los pedidos", url: "/admin/todos" },
      { name: "Reparto", url: "/admin/reparto" },
      { name: "Calculadora", url: "/admin/calculadora" },
      { name: "Caja", url: "/admin/caja" },
    ],
  };
  return new Response(JSON.stringify(manifiesto), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
