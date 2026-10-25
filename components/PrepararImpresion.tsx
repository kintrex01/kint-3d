"use client";

import { useState } from "react";

/*
 * Visor 3D: "Ordenar automáticamente" (lib/preparar-impresion). En un clic:
 * escala, acuesta lo parado, corta por plantas y acomoda todo en la cama; si
 * no entra en una, usa las que hagan falta, una al lado de la otra. Los cortes
 * los puede elegir el cliente (los sugeridos y los suyos). Si una pieza no
 * entra en ninguna cama a esa escala, se avisa y no se ordena.
 */

type Resultado = {
  partes: number;
  acostadas: number;
  cortes: number;
  camas: number;
  noEntran: number;
  masGrande: [number, number, number];
};

export type CorteVisor = { altura: number; activo: boolean; propio: boolean }; // altura en mm impresos desde la base

const cm = (mm: number) => (mm / 10).toLocaleString("es-UY", { maximumFractionDigits: 1 });

export default function PrepararImpresion({
  hayParadas,
  nombreCama,
  tamanoCama,
  altoModelo,
  cortes,
  cortar,
  onCortar,
  resultado,
  preparando,
  onAlternarCorte,
  onAgregarCorte,
  onPreparar,
  onDescargar,
  onVolver,
}: {
  hayParadas: boolean;
  nombreCama: string;
  tamanoCama: number;
  altoModelo: number; // mm impresos
  cortes: CorteVisor[];
  cortar: boolean;
  onCortar: (activo: boolean) => void;
  resultado: Resultado | null;
  preparando: boolean;
  onAlternarCorte: (indice: number) => void;
  onAgregarCorte: (alturaMm: number) => void;
  onPreparar: (opciones: { acostar: boolean; cortar: boolean }) => void;
  onDescargar: () => void;
  onVolver: () => void;
}) {
  const [acostar, setAcostar] = useState(true);
  const [nuevoCorte, setNuevoCorte] = useState("");
  const activos = cortes.filter((corte) => corte.activo).length;

  if (resultado && resultado.noEntran > 0) {
    const [x, y, z] = resultado.masGrande;
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-[11px] leading-5">
        <p className="font-black text-red-600">No entra en la cama a esta escala</p>
        <p className="mt-1">
          {resultado.noEntran === 1 ? "Una pieza mide" : `${resultado.noEntran} piezas no entran; la más grande mide`} {cm(x)} × {cm(y)} × {cm(z)} cm y la
          cama de la {nombreCama} es de {cm(tamanoCama)} × {cm(tamanoCama)} cm.
        </p>
        <p className="mt-1 text-[var(--text-muted)]">Elegí una escala más chica en «Escalar» o agregá cortes acá abajo.</p>
        <button
          type="button"
          onClick={onVolver}
          className="mt-2 w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:border-red-600"
        >
          Entendido
        </button>
      </div>
    );
  }

  if (resultado) {
    return (
      <div>
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold leading-5 text-emerald-800 dark:text-emerald-300">
          ✓ Listo: {resultado.partes} {resultado.partes === 1 ? "parte" : "partes"}
          {resultado.acostadas > 0 && ` · ${resultado.acostadas} acostadas`}
          {resultado.cortes > 0 && ` · ${resultado.cortes} ${resultado.cortes === 1 ? "corte" : "cortes"}`} ·{" "}
          {resultado.camas === 1 ? "entra en 1 cama" : `${resultado.camas} camas, una al lado de la otra`}.
        </p>
        <button
          type="button"
          onClick={onDescargar}
          className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700"
        >
          Descargar STL ordenado
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="mt-2 w-full rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:border-red-600"
        >
          Volver al modelo
        </button>
        <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">En Bambu Studio aceptá «separar en objetos».</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] leading-5 text-[var(--text-muted)]">
        Corta por plantas, acuesta lo fino y acomoda todo en la {nombreCama}. Si no entra en una cama, usa las que hagan
        falta.
      </p>

      {/* Cortar: apagado de entrada. Prendido, se ven los cortes en el visor (en rojo). */}
      <button
        type="button"
        aria-pressed={cortar}
        onClick={() => onCortar(!cortar)}
        className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[11px] font-black transition ${
          cortar ? "border-red-600 bg-red-600/10 text-red-600" : "border-[var(--border-color)] hover:border-red-600"
        }`}
      >
        <span>✂ Cortar en partes {cortar ? `(${activos})` : ""}</span>
        <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${cortar ? "bg-red-600" : "bg-[var(--border-color)]"}`}>
          <span className={`h-4 w-4 rounded-full bg-white shadow transition ${cortar ? "translate-x-4" : ""}`} />
        </span>
      </button>
      {cortar && (
      <>
      <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        Mirá los cortes en rojo en el visor. Tocá uno para sacarlo o agregá otro. Cada corte va justo debajo de la losa
        más cercana: cada parte queda plana sobre la cama.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {cortes.map((corte, indice) => (
          <button
            key={`${corte.altura}-${indice}`}
            type="button"
            aria-pressed={corte.activo}
            onClick={() => onAlternarCorte(indice)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
              corte.activo
                ? "border-red-600 bg-red-600 text-white"
                : "border-[var(--border-color)] text-[var(--text-muted)] line-through hover:text-[var(--text-main)]"
            }`}
          >
            {corte.propio ? "✂ " : ""}a {cm(corte.altura)} cm
          </button>
        ))}
        {!cortes.length && <span className="text-[10px] text-[var(--text-muted)]">No hace falta cortarlo.</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          value={nuevoCorte}
          onChange={(evento) => setNuevoCorte(evento.target.value.replace(/[^\d.,]/g, ""))}
          inputMode="decimal"
          placeholder={`Cortar a… (0 a ${cm(altoModelo)} cm)`}
          aria-label="Altura del corte en centímetros"
          className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--border-color)] bg-transparent px-3 text-[11px] outline-none focus:border-red-600"
        />
        <button
          type="button"
          disabled={!(Number(nuevoCorte.replace(",", ".")) > 0)}
          onClick={() => {
            const mm = Number(nuevoCorte.replace(",", ".")) * 10;
            if (mm > 0 && mm < altoModelo) onAgregarCorte(mm);
            setNuevoCorte("");
          }}
          className="h-9 shrink-0 rounded-lg border border-[var(--border-color)] px-3 text-[10px] font-bold transition hover:border-red-600 disabled:opacity-40"
        >
          ✂ Agregar
        </button>
      </div>
      </>
      )}

      {hayParadas && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] font-semibold">
          <input type="checkbox" checked={acostar} onChange={(e) => setAcostar(e.target.checked)} />
          Acostar las piezas finas paradas
        </label>
      )}

      <button
        type="button"
        disabled={preparando}
        onClick={() => onPreparar({ acostar: hayParadas && acostar, cortar: cortar && activos > 0 })}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-4 py-3.5 text-[12px] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_24px_-10px_rgba(5,150,105,0.8)] transition hover:scale-[1.02] disabled:opacity-60"
      >
        {preparando ? "Ordenando…" : "⚡ Ordenar en la cama"}
      </button>
    </div>
  );
}
