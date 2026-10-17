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
  adornoDe,
  coloresPieza,
  limpiarBorde,
  textoVisible,
  type PersonalizacionLlavero,
  type PersonalizacionMascota,
} from "@/lib/llavero/personalizacion";
import { colorFilamento } from "@/lib/colores-filamento";

type Archivo = "3mf" | "3mf-bambu" | "borde" | "letras" | "anillo";

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
  colores: string[]; // ver coloresPieza
}) {
  const [armando, setArmando] = useState<Archivo | "">("");
  const [error, setError] = useState("");
  const partes = coloresPieza(personalizacion, colores);
  const { base: borde, letras } = partes;
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
      const parteLetras = `${mascota ? "borde y nombre" : "letras"}${letras ? ` (${letras})` : ""}`;

      if (archivo === "3mf" || archivo === "3mf-bambu") {
        const { exportar3MF } = await import("@/lib/llavero/archivo3mf");
        // Un filamento por cada color distinto (1, 2, 3...).
        const filamentos: string[] = [];
        const filamento = (color: string) => {
          if (!filamentos.includes(color)) filamentos.push(color);
          return filamentos.indexOf(color) + 1;
        };
        const piezas = geometria.soloLetras
          ? [{ nombre: parteLetras, geometria: geometria.base, color: colorFilamento(letras), filamento: filamento(letras) }]
          : [
              // La base puede venir en capas (chapita): todas con el mismo filamento.
              ...(geometria.partesBase ?? [geometria.base]).map((parte, indice, todas) => ({
                nombre: todas.length > 1 ? `${parteBorde} ${indice + 1}` : parteBorde,
                geometria: parte,
                color: colorFilamento(borde),
                filamento: filamento(borde),
              })),
              { nombre: parteLetras, geometria: geometria.letras, color: colorFilamento(letras), filamento: filamento(letras) },
            ];
        piezas.push({
          nombre: `anillo${partes.anillo ? ` (${partes.anillo})` : ""}`,
          geometria: geometria.anillo,
          color: colorFilamento(partes.anillo),
          filamento: filamento(partes.anillo),
        });
        if (geometria.telefono) {
          piezas.push({
            nombre: `teléfono${partes.telefono ? ` (${partes.telefono})` : ""}`,
            geometria: geometria.telefono,
            color: colorFilamento(partes.telefono),
            filamento: filamento(partes.telefono),
          });
        }
        descargar(
          exportar3MF(base, piezas, { coloresBambu: archivo === "3mf-bambu" }),
          `${base}${archivo === "3mf-bambu" ? " (colores Bambu)" : ""}.3mf`
        );
      } else if (archivo === "anillo") {
        descargar(exportarSTL(geometria.anillo), `${base} - anillo${partes.anillo ? ` (${partes.anillo})` : ""}.stl`);
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
      geometria.telefono?.dispose();
      geometria.anillo.dispose();
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
          {adornoDe(mascota) !== "Ninguno" ? ` · adorno: ${adornoDe(mascota)}` : ""}
          {mascota.relieve ? " · en relieve" : ""}
          {mascota.escalaNombre && mascota.escalaNombre !== 100 ? ` · nombre al ${mascota.escalaNombre}%` : ""}
        </span>
      ) : (
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          {llavero?.fuente} · {llavero?.tamano} · {llavero?.fondo || "Contorno"}
          {llavero?.fondo !== "Solo letras" && <> · borde {String(limpiarBorde(llavero?.borde)).replace(".", ",")} mm</>}
          {llavero?.fondo === "Placa" && llavero.esquinas !== undefined && (
            <> · esquinas {llavero.esquinas ? `${String(llavero.esquinas).replace(".", ",")} mm` : "en punta"}</>
          )}
          {llavero?.separacion ? (
            <> · separación {llavero.separacion > 0 ? "+" : ""}{llavero.separacion} mm</>
          ) : null}
        </span>
      )}
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        {[
          ...(soloLetras
            ? [["Color", letras]]
            : mascota
            ? [
                ["Chapita", borde],
                ["Borde y nombre", letras],
                ...(partes.telefono ? [["Teléfono", partes.telefono]] : []),
              ]
            : [
                ["Borde", borde],
                ["Letras", letras],
              ]),
          ["Anillo", partes.anillo],
        ].map(([parte, color]) => (
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
        className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--acento)] px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {armando === "3mf" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        Descargar 3MF (todas las partes con su color)
      </button>
      <button
        type="button"
        onClick={() => void bajar("3mf-bambu")}
        disabled={Boolean(armando)}
        className="ml-1.5 mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {armando === "3mf-bambu" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        3MF con colores para Bambu Studio
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
        <button type="button" onClick={() => void bajar("anillo")} disabled={Boolean(armando)} className={claseSecundario}>
          {armando === "anillo" ? <LoaderCircle size={12} className="animate-spin" /> : <Download size={12} />}
          STL anillo
        </button>
      </span>
      <span className="mt-1.5 block text-[11px] leading-4 text-[var(--text-muted)]">
        El 3MF se abre como una pieza con sus partes y cada una ya trae su filamento (1, 2, 3…, uno por color).
        El verde además carga los colores en los filamentos del proyecto de Bambu Studio (después los cambiás por los
        tuyos).
      </span>
      {error && <span className="mt-1 block text-[11px] font-bold text-red-600">{error}</span>}
    </span>
  );
}
