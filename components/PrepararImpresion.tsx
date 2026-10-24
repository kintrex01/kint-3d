"use client";

import { useState } from "react";

/*
 * Visor 3D: "Preparar para imprimir" (lib/preparar-impresion).
 * Escala, acuesta lo parado, corta por plantas y acomoda todo en la cama:
 * sale un STL listo para arrastrar a Bambu Studio.
 */

type Resultado = { partes: number; acostadas: number; cortes: number; camas: number };

export default function PrepararImpresion({
  hayParadas,
  hayCortes,
  nombreCama,
  resultado,
  preparando,
  onPreparar,
  onDescargar,
  onVolver,
}: {
  hayParadas: boolean;
  hayCortes: boolean;
  nombreCama: string;
  resultado: Resultado | null;
  preparando: boolean;
  onPreparar: (opciones: { acostar: boolean; cortar: boolean }) => void;
  onDescargar: () => void;
  onVolver: () => void;
}) {
  const [acostar, setAcostar] = useState(true);
  const [cortar, setCortar] = useState(true);

  return (
    <div className="mt-3 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/[0.06] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">
        ⚡ Preparar para imprimir
      </p>
      <p className="mt-1.5 text-[11px] leading-5">
        Lo dejamos listo para la impresora: a escala, {hayParadas ? "con lo parado acostado, " : ""}
        {hayCortes ? "cortado por plantas, " : ""}apoyado y acomodado en la cama de la {nombreCama}.
      </p>

      {resultado ? (
        <>
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold leading-5 text-emerald-800 dark:text-emerald-300">
            ✓ Listo: {resultado.partes} {resultado.partes === 1 ? "parte" : "partes"}
            {resultado.acostadas > 0 && ` · ${resultado.acostadas} acostadas`}
            {resultado.cortes > 0 && ` · ${resultado.cortes} ${resultado.cortes === 1 ? "corte" : "cortes"}`} ·{" "}
            {resultado.camas === 1 ? "entra en 1 cama" : `${resultado.camas} camas (van una al lado de la otra)`}.
          </p>
          <button
            type="button"
            onClick={onDescargar}
            className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700"
          >
            Descargar STL listo para imprimir
          </button>
          <button
            type="button"
            onClick={onVolver}
            className="mt-2 w-full rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:border-red-600"
          >
            Volver al modelo original
          </button>
          <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
            En Bambu Studio: al importarlo, aceptá «separar en objetos» y cada parte queda suelta.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {hayParadas && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold">
                <input type="checkbox" checked={acostar} onChange={(e) => setAcostar(e.target.checked)} />
                Acostar las piezas paradas
              </label>
            )}
            {hayCortes && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold">
                <input type="checkbox" checked={cortar} onChange={(e) => setCortar(e.target.checked)} />
                Cortar por plantas (sin soportes)
              </label>
            )}
          </div>
          <button
            type="button"
            disabled={preparando}
            onClick={() => onPreparar({ acostar: hayParadas && acostar, cortar: hayCortes && cortar })}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {preparando ? "Preparando…" : "⚡ Preparar para imprimir"}
          </button>
        </>
      )}
    </div>
  );
}
