import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ruleta Kint",
  description:
    "Girá la Ruleta Kint y ganá puntos, descuentos y regalos. Premios nuevos todos los días y un premio misterioso.",
  alternates: { canonical: "https://kint3d.com/ruleta" },
  openGraph: {
    title: "Ruleta Kint | Kint 3D",
    description: "Premios nuevos todos los días: puntos, descuentos, regalos y un premio misterioso.",
    url: "https://kint3d.com/ruleta",
    type: "website",
    siteName: "Kint 3D",
    locale: "es_UY",
  },
};

export default function RuletaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
