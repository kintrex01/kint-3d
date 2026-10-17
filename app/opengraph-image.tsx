import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * La imagen que aparece al compartir kint3d.com (WhatsApp, Instagram,
 * Facebook...). Se arma una vez al publicar.
 */

export const alt = "Kint 3D · Impresión 3D y maquetas en Uruguay";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORES = [
  "#e5e7eb", "#ffffff", "#9ca3af", "#1f2937", "#7c4a2d", "#c9a227", "#d6b98c",
  "#facc15", "#ef4444", "#15803d", "#2dd4bf", "#c4b5fd", "#6d28d9", "#3b82f6",
];

export default async function Image() {
  const rubik = await readFile(join(process.cwd(), "public/fuentes-llavero/rubik.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#ffffff",
          fontFamily: "Rubik",
          background:
            "radial-gradient(60% 70% at 85% 20%, rgba(59,130,246,0.45), transparent 70%), radial-gradient(50% 60% at 10% 100%, rgba(220,38,38,0.35), transparent 70%), linear-gradient(135deg, #040b16 0%, #0b1a33 55%, #10223f 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 34, letterSpacing: 10, opacity: 0.92 }}>KINT 3D</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, maxWidth: 900 }}>Impresión 3D y maquetas</div>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              backgroundImage: "linear-gradient(90deg, #93c5fd, #c4b5fd 55%, #fca5a5)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            en Uruguay
          </div>
          <div style={{ marginTop: 22, fontSize: 30, color: "rgba(226,232,240,0.85)" }}>
            Cotizá online · Llaveros y chapitas con tu nombre · Ruleta de premios
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORES.map((color) => (
              <div
                key={color}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: color,
                  border: "2px solid rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 30,
              padding: "12px 26px",
              borderRadius: 16,
              background: "#dc2626",
            }}
          >
            kint3d.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Rubik", data: rubik, style: "normal", weight: 700 }],
    }
  );
}
