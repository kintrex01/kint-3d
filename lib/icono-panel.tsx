import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Ícono de la app del panel (distinto al de la web): fondo azul del panel,
 * una K grande y «PANEL» abajo. Ocupa todo el cuadrado y deja el contenido
 * en el centro, así sirve también como ícono «maskable» (Android lo recorta).
 */
export async function iconoPanel(lado: number) {
  const montserrat = await readFile(join(process.cwd(), "public/fuentes-llavero/montserrat.woff"));
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
          background: "linear-gradient(145deg, #2449a6 0%, #14295f 55%, #0b1738 100%)",
          color: "#ffffff",
          fontFamily: "Montserrat",
        }}
      >
        <div style={{ fontSize: lado * 0.42, fontWeight: 700, lineHeight: 1, marginTop: lado * 0.02 }}>K</div>
        <div style={{ fontSize: lado * 0.085, fontWeight: 700, letterSpacing: lado * 0.022, marginTop: lado * 0.03, opacity: 0.85 }}>
          PANEL
        </div>
      </div>
    ),
    { width: lado, height: lado, fonts: [{ name: "Montserrat", data: montserrat, weight: 700, style: "normal" }] }
  );
}
