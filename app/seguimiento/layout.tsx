import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguimiento de tu pedido",
  description: "Mirá en qué etapa está tu pedido de Kint 3D, pagá y reclamá tus premios.",
  // Cada seguimiento es privado: no va a los buscadores.
  robots: { index: false, follow: false },
};

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
