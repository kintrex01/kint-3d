"use client";

/*
 * Llavero personalizado en el detalle de una compra: qué pidió el cliente
 * y los archivos para Bambu Studio, armados acá mismo con la misma
 * geometría que vio el cliente.
 *
 * Una descarga por clic: el navegador bloquea la segunda si no la pidió
 * el usuario (por eso antes llegaba solo el borde).
 */

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import {
  textoVisible,
  type PersonalizacionLlavero,
  type PersonalizacionMascota,
} from "@/lib/llavero/personalizacion";
import { colorFilamento } from "@/lib/colores-filamento";

type Archivo = "3mf" | "borde" | "letras";

function nombreArchivo(texto: string) {
  return texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 -]/g, "").trim() || "llavero";
}

function descargar(blob: Blob, nombre: string) {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
}

export function ArchivosLlavero({
  pedido,
  personalizacion,
  colores,
}: {
  pedido: string;
  personalizacion: PersonalizacionLlavero | PersonalizacionMascota;
  colores: string[]; // [borde, letras]
}) {
  const [armando, setArmando] = useState<Archivo | "">("");
  const [error, setError] = useState("");
  const [borde = "", letras = ""] = colores;
  // Chapita de mascota o llavero con nombre.
  const mascota = "tipo" in personalizacion ? personalizacion : null;
  const llavero = mascota ? null : (personalizacion as PersonalizacionLlavero);
  const soloLetras = llavero?.fondo === "Solo letras";
  const textoArchivo = mascota ? mascota.texto : textoVisible(personalizacion as PersonalizacionLlavero);

  async function bajar(archivo: Archivo) {
    setArmando(archivo);
    setError("");
    try {
      const { construirPieza, exportarSTL } = await import("@/lib/llavero/geometria");
      const geometria = await construirPieza(personalizacion);
      const base = `${pedido} ${nombreArchivo(textoArchivo)}`;
      const parteBorde = `${mascota ? "chapita" : "borde"}${borde ? ` (${borde})` : ""}`;
      const parteLetras = `${mascota ? "nombre" : "letras"}${letras ? ` (${letras})` : ""}`;

      if (archivo === "3mf") {
        const { exportar3MF } = await import("@/lib/llavero/archivo3mf");
        descargar(
          exportar3MF(
            base,
            geometria.soloLetras
              ? [{ nombre: parteLetras, geometria: geometria.base, color: colorFilamento(letras) }]
              : [
                  // La base puede venir en capas (chapita): todas con el filamento 1.
                  ...(geometria.partesBase ?? [geometria.base]).map((parte, indice, todas) => ({
                    nombre: todas.length > 1 ? `${parteBorde} ${indice + 1}` : parteBorde,
                    geometria: parte,
                    color: colorFilamento(borde),
                    filamento: 1,
                  })),
                  { nombre: parteLetras, geometria: geometria.letras, color: colorFilamento(letras), filamento: 2 },
                ]
          ),
          `${base}.3mf`
        );
      } else if (archivo === "borde" || geometria.soloLetras) {
        // Solo letras: una sola pieza (la "base" es el llavero entero).
        descargar(
          exportarSTL(geometria.base),
          `${base} - ${geometria.soloLetras ? parteLetras : parteBorde}.stl`
        );
      } else {
        descargar(exportarSTL(geometria.letras), `${base} - ${parteLetras}.stl`);
      }
      geometria.base.dispose();
      geometria.letras.dispose();
      geometria.partesBase?.forEach((parte) => parte.dispose());
    } catch {
      setError("No se pudo armar el archivo.");
    } finally {
      setArmando("");
    }
  }

  const claseSecundario =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--kint-panel-border)] px-2.5 text-[11px] font-bold transition hover:border-[var(--kint-selected-border)] disabled:opacity-60";

  return (
    <span className="mt-1.5 block rounded-xl bg-[var(--kint-panel-soft)] p-2.5">
      <span className="block text-base font-black leading-tight">“{textoArchivo}”</span>
      {mascota ? (
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          🐾 Chapita {mascota.forma} · tel. <strong className="text-[var(--text-main)]">{mascota.telefono}</strong> ·{" "}
          {mascota.fuente} · {mascota.tamano}
          {mascota.huella ? " · con huellita" : ""}
        </span>
      ) : (
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          {llavero?.fuente} · {llavero?.tamano} · {llavero?.fondo || "Contorno"}
          {llavero?.fondo !== "Solo letras" && <> · borde {llavero?.borde || "Normal"}</>}
          {llavero?.separacion ? (
            <> · separación {llavero.separacion > 0 ? "+" : ""}{llavero.separacion} mm</>
          ) : null}
        </span>
      )}
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        {(soloLetras
          ? [["Color", letras]]
          : [
              ["Borde", borde],
              ["Letras", letras],
            ]
        ).map(([parte, color]) => (
          <span key={parte} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full ring-1 ring-black/20 dark:ring-white/25"
              style={{ background: colorFilamento(color) }}
            />
            {parte}: {color || "—"}
          </span>
        ))}
      </span>

      <button
        type="button"
        onClick={() => void bajar("3mf")}
        disabled={Boolean(armando)}
        className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f3f85] px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {armando === "3mf" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        {soloLetras ? "Descargar 3MF" : "Descargar 3MF (borde + letras juntos)"}
      </button>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        {!soloLetras && (
        <button type="button" onClick={() => void bajar("borde")} disabled={Boolean(armando)} className={claseSecundario}>
          {armando === "borde" ? <LoaderCircle size={12} className="animate-spin" /> : <Download size={12} />}
          STL borde
        </button>
        )}
        <button type="button" onClick={() => void bajar("letras")} disabled={Boolean(armando)} className={claseSecundario}>
          {armando === "letras" ? <LoaderCircle size={12} className="animate-spin" /> : <Download size={12} />}
          STL letras
        </button>
      </span>
      <span className="mt-1.5 block text-[11px] leading-4 text-[var(--text-muted)]">
        {soloLetras
          ? "Una sola pieza, de un solo color."
          : "El 3MF se abre como una pieza con 2 partes: a «letras» asignale el filamento de las letras."}
      </span>
      {error && <span className="mt-1 block text-[11px] font-bold text-red-600">{error}</span>}
    </span>
  );
}
