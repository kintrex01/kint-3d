import type { Metadata, Viewport } from "next";
import ShellAdmin from "@/components/admin/ShellAdmin";

export const metadata: Metadata = {
  title: {
    default: "Panel",
    template: "%s | Panel Kint 3D",
  },
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
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellAdmin>{children}</ShellAdmin>;
}
