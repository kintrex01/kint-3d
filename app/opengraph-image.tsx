import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* La imagen al compartir kint3d.com: el logo y una línea. Nada más. */

export const alt = "Kint 3D · Impresión 3D";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const montserrat = await readFile(join(process.cwd(), "public/fuentes-llavero/montserrat.woff"));
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/icono-512.png"))).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070f24",
          color: "#f5f3ee",
          fontFamily: "Montserrat",
        }}
      >
        <img src={logo} width={150} height={150} style={{ borderRadius: 34, background: "#ffffff" }} />
        <div style={{ display: "flex", marginTop: 40, fontSize: 64, letterSpacing: 18 }}>
          KINT<span style={{ color: "#8fc7e8", marginLeft: 24 }}>3D</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 28, letterSpacing: 6, color: "rgba(245,243,238,0.6)" }}>IMPRESIÓN 3D</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Montserrat", data: montserrat, style: "normal", weight: 900 }] }
  );
}
