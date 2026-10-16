"use client";

/*
 * Llavero personalizado en el detalle de una compra: qué pidió el cliente
 * y los dos STL listos para Bambu Studio (borde y letras), armados acá
 * mismo con la misma geometría que vio el cliente.
 */

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import type { PersonalizacionLlavero } from "@/lib/llavero/personalizacion";
import { colorFilamento } from "@/lib/colores-filamento";

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
  window.setTimeout(() => URL.revokeObjectURL(enlace.href), 2000);
}

export function ArchivosLlavero({
  pedido,
  personalizacion,
  colores,
}: {
  pedido: string;
  personalizacion: PersonalizacionLlavero;
  colores: string[]; // [borde, letras]
}) {
  const [armando, setArmando] = useState(false);
  const [error, setError] = useState("");
  const [borde = "", letras = ""] = colores;

  async function bajar() {
    setArmando(true);
    setError("");
    try {
      const { construirLlavero, exportarSTL } = await import("@/lib/llavero/geometria");
      const geometria = await construirLlavero(personalizacion);
      const base = `${pedido} ${nombreArchivo(personalizacion.texto)}`;
      descargar(exportarSTL(geometria.base), `${base} - borde${borde ? ` (${borde})` : ""}.stl`);
      // El navegador a veces frena dos descargas juntas: la segunda va un toque después.
      window.setTimeout(() => {
        descargar(exportarSTL(geometria.letras), `${base} - letras${letras ? ` (${letras})` : ""}.stl`);
      }, 400);
      geometria.base.dispose();
      window.setTimeout(() => geometria.letras.dispose(), 1000);
    } catch {
      setError("No se pudieron armar los archivos.");
    } finally {
      setArmando(false);
    }
  }

  return (
    <span className="mt-1.5 block rounded-xl bg-[var(--kint-panel-soft)] p-2.5">
      <span className="block text-base font-black leading-tight">“{personalizacion.texto}”</span>
      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
        {personalizacion.fuente} · {personalizacion.tamano}
      </span>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        {[
          ["Borde", borde],
          ["Letras", letras],
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
        onClick={() => void bajar()}
        disabled={armando}
        className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f3f85] px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {armando ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        Descargar STL (borde + letras)
      </button>
      <span className="mt-1.5 block text-[11px] leading-4 text-[var(--text-muted)]">
        En Bambu Studio cargá los dos juntos y aceptá «un objeto con varias partes».
      </span>
      {error && <span className="mt-1 block text-[11px] font-bold text-red-600">{error}</span>}
    </span>
  );
}
