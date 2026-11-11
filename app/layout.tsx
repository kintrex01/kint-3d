import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import EstadoPagina from "../components/EstadoPagina";
import MenuNavegacion from "../components/MenuNavegacion";
import ScrollASeccion from "../components/ScrollASeccion";
import BotonWhatsapp from "../components/BotonWhatsapp";

// Montserrat guardada en el proyecto (antes se bajaba de Google al publicar y a veces fallaba el build).
// Mismos grosores de siempre: 300 a 700.
const montserrat = localFont({
  src: "./fuentes/montserrat-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-montserrat",
  display: "swap",
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
    title: "Kint 3D",
    description: "Impresión 3D de maquetas, llaveros y regalos. Cotizá online.",
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
      <head>
        {/* Tema y fondo elegidos, antes de pintar (sin parpadeo). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;if(localStorage.getItem('theme')==='dark')d.classList.add('dark');var f=localStorage.getItem('kint-fondo');if(f)d.setAttribute('data-fondo',f);}catch(e){}",
          }}
        />
      </head>
      <body
  suppressHydrationWarning
  className="flex min-h-full flex-col"
>
  {/* Para Google: quién es Kint 3D. */}
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Kint 3D",
        url: "https://kint3d.com",
        logo: "https://kint3d.com/icon.png",
        description: "Impresión 3D y maquetas en Uruguay: cotización online, tienda y llaveros personalizados.",
        areaServed: { "@type": "Country", name: "Uruguay" },
      }),
    }}
  />

  <EstadoPagina />

  <MenuNavegacion />

  <ScrollASeccion />

  {children}

  <BotonWhatsapp />
</body>
    </html>
  );
}