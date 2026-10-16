import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description:
    "Tu cuenta Kint 3D: tus pedidos, tus Puntos Kint y tus datos de contacto.",
  robots: { index: false, follow: false },
};

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
