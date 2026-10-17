import type { MetadataRoute } from "next";

/* Para instalar Kint 3D en el celular ("Agregar a la pantalla de inicio"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kint 3D · Impresión 3D y maquetas",
    short_name: "Kint 3D",
    description: "Cotizá tu impresión 3D, seguí tus pedidos, comprá en la tienda y girá la Ruleta Kint.",
    start_url: "/",
    display: "standalone",
    background_color: "#040b16",
    theme_color: "#040b16",
    lang: "es-UY",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      { name: "Cotizar", url: "/cotizar" },
      { name: "Seguir mi pedido", url: "/seguimiento" },
      { name: "Tienda", url: "/tienda" },
      { name: "Ruleta Kint", url: "/ruleta" },
    ],
  };
}
