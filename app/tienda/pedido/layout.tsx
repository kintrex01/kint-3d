import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguí tu compra",
  description:
    "Consultá el estado de tu compra en la tienda de Kint 3D con tu número de pedido TND y tu email.",
  robots: { index: false, follow: true },
};

export default function SeguimientoTiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
