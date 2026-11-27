import type { Metadata, Viewport } from "next";
import ShellAdmin from "@/components/admin/ShellAdmin";

export const metadata: Metadata = {
  title: {
    default: "Panel",
    template: "%s | Panel Kint 3D",
  },
  // App del panel: se instala aparte de la web (app/panel-app/manifest.webmanifest).
  manifest: "/panel-app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kint Panel", statusBarStyle: "black-translucent" },
  icons: { apple: "/panel-app/icono-180.png" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1738",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellAdmin>{children}</ShellAdmin>;
}
