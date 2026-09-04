import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Calculadora de Escalas para Arquitectura e Impresión 3D",

  description:
    "Calculadora de escalas online gratis. Convertí medidas a escala 1:50, 1:100, 1:200, 1:250, 1:500 y más, y comprobá espesores mínimos para impresión 3D.",

  alternates: {
    canonical:
      "https://kint3d.com/escalador",
  },

  openGraph: {
    title:
      "Calculadora de Escalas | Kint 3D",
    description:
      "Convertí medidas reales a escala y comprobá si tu modelo puede imprimirse en 3D.",
    url:
      "https://kint3d.com/escalador",
    type: "website",
  },
};

export default function EscaladorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}