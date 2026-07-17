import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import EstadoPagina from "../components/EstadoPagina";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Kint 3D",
  description: "Impresión 3D profesional",
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
        className="min-h-full flex flex-col"
      >
        <EstadoPagina />
        
        {children}
      </body>
    </html>
  );
}