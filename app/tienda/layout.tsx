import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Tienda de productos impresos en 3D",

  description:
    "Productos impresos en 3D en Uruguay. Elegí tu modelo, pagá por transferencia y recibí la confirmación al instante.",

  alternates: {
    canonical:
      "https://kint3d.com/tienda",
  },

  openGraph: {
    title:
      "Tienda | Kint 3D",
    description:
      "Productos impresos en 3D en Uruguay. Elegí tu modelo y pagá por transferencia.",
    url:
      "https://kint3d.com/tienda",
    type: "website",
    siteName: "Kint 3D",
    locale: "es_UY",
  },
};

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
