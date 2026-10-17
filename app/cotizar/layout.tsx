import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cotizá tu impresión 3D",
  description:
    "Subí tu archivo STL o SKP, elegí escala y colores y te mandamos el presupuesto sin costo. Maquetas, piezas y prototipos en Uruguay.",
  alternates: { canonical: "https://kint3d.com/cotizar" },
  openGraph: {
    title: "Cotizá tu impresión 3D | Kint 3D",
    description: "Subí tu archivo, elegí escala y colores y recibí el presupuesto sin costo.",
    url: "https://kint3d.com/cotizar",
    type: "website",
    siteName: "Kint 3D",
    locale: "es_UY",
  },
};

export default function CotizarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
