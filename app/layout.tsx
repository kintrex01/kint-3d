import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import EstadoPagina from "../components/EstadoPagina";
import MenuNavegacion from "../components/MenuNavegacion";
import ScrollASeccion from "../components/ScrollASeccion";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kint3d.com"),

  title: {
    default:
      "Kint 3D | Impresión 3D y Maquetas en Uruguay",
    template:
      "%s | Kint 3D",
  },

  description:
    "Servicio de impresión 3D en Uruguay para piezas, prototipos y maquetas. Cotizá online y utilizá herramientas gratuitas de escala e imprimibilidad.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title:
      "Kint 3D | Impresión 3D y Maquetas en Uruguay",
    description:
      "Impresión 3D, maquetas, piezas, prototipos y herramientas gratuitas para preparar modelos en Uruguay.",
    url: "https://kint3d.com",
    siteName: "Kint 3D",
    locale: "es_UY",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body
  suppressHydrationWarning
  className="flex min-h-full flex-col"
>
  <EstadoPagina />

  <MenuNavegacion />

  <ScrollASeccion />

  {children}
</body>
    </html>
  );
}