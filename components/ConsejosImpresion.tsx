"use client";

import { useState } from "react";
import type { ConsejosImpresion as Consejos } from "@/lib/consejos-impresion";

/*
 * Visor 3D: consejos para imprimir mejor (más rápido, más barato, sin soportes).
 * Los números del análisis están en unidades del archivo; `factor` los pasa a
 * mm impresos según la escala elegida en el visor.
 */

function centimetros(mm: number) {
  const cm = mm / 10;
  return cm.toLocaleString("es-UY", { maximumFractionDigits: cm < 10 ? 1 : 0 });
}

export default function ConsejosImpresion({
  consejos,
  factor,
  cortesVisibles,
  onVerParada,
  onAlternarCortes,
}: {
  consejos: Consejos;
  factor: number;
  cortesVisibles: boolean;
  onVerParada: (indice: number) => void;
  onAlternarCortes: () => void;
}) {
  const [parada, setParada] = useState(0);
  const paradas = consejos.paradas.length;
  const cortes = consejos.cortes.map((altura) => altura * factor);
  const alturaTotal = consejos.altura * factor;
  // Superficie en el aire, en cm² impresos.
  const soporteCm2 = (consejos.areaSoporte * factor * factor) / 100;
  const necesitaSoporte = soporteCm2 >= 1;
  const sinConsejos = !paradas && !necesitaSoporte;

  function verParada(paso: number) {
    const siguiente = (parada + paso + paradas) % paradas;
    setParada(siguiente);
    onVerParada(siguiente);
  }

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border-color)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Consejos para imprimirlo mejor</p>

      {sinConsejos ? (
        <p className="mt-3 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ Así como está se imprime bien: no necesita soportes ni cambios.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {paradas > 0 && (
            <li className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[12px] font-bold">
                🧱 {paradas} {paradas === 1 ? "pieza parada" : "piezas paradas"}: conviene acostarlas
              </p>
              <p className="mt-1.5 text-[11px] leading-5">
                Son piezas finas y altas (fachadas, paneles, muros sueltos). Acostadas se imprimen{" "}
                <strong>más rápido, más prolijas y sin soportes</strong>, y no se quiebran. Paradas, la impresora tiene que
                hacer cientos de capas finitas.
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
                <strong className="text-[var(--text-main)]">En SketchUp:</strong> dejalas como están si es más cómodo: las
                acostamos nosotros al preparar la impresión. Si alguna tiene que ir parada sí o sí, contanos en los
                comentarios.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => verParada(-1)}
                  aria-label="Pieza anterior"
                  className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-sm font-bold transition hover:border-red-600"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => verParada(0)}
                  className="h-8 flex-1 rounded-lg border border-[var(--border-color)] text-[10px] font-bold uppercase tracking-[0.08em] transition hover:border-red-600 hover:text-red-600"
                >
                  Ver cuál · {parada + 1} de {paradas}
                </button>
                <button
                  type="button"
                  onClick={() => verParada(1)}
                  aria-label="Pieza siguiente"
                  className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-sm font-bold transition hover:border-red-600"
                >
                  ›
                </button>
              </div>
            </li>
          )}

          {necesitaSoporte && (
            <li className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[12px] font-bold">
                ✂️ {cortes.length > 0 ? `Conviene cortarlo en ${cortes.length + 1} partes` : "Necesita soportes"}
              </p>
              <p className="mt-1.5 text-[11px] leading-5">
                Tiene unos <strong>{Math.round(soporteCm2).toLocaleString("es-UY")} cm² en el aire</strong> (losas, voladizos):
                así como está lleva soportes, que suman tiempo, material y marcas en la pieza.
                {cortes.length > 0 &&
                  " Cortándolo justo debajo de cada losa, cada parte apoya en la cama: sin soportes, más rápido y más barato."}
              </p>
              {cortes.length > 0 && (
                <>
                  <p className="mt-2 text-[11px] font-semibold">
                    Cortar a {cortes.map((altura) => `${centimetros(altura)} cm`).join(" · ")} de altura (de{" "}
                    {centimetros(alturaTotal)} cm en total).
                  </p>
                  <button
                    type="button"
                    onClick={onAlternarCortes}
                    className={`mt-2 h-8 w-full rounded-lg border text-[10px] font-bold uppercase tracking-[0.08em] transition ${
                      cortesVisibles
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-[var(--border-color)] hover:border-red-600 hover:text-red-600"
                    }`}
                  >
                    {cortesVisibles ? "Ocultar los cortes" : "Ver los cortes en 3D"}
                  </button>
                </>
              )}
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
                <strong className="text-[var(--text-main)]">En SketchUp:</strong> podés separar cada planta en su propio
                grupo, o mandarlo así y lo cortamos nosotros.
              </p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
