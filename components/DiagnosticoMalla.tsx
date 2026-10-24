"use client";

import { useState } from "react";
import type { AnalisisMalla, ZonaProblema } from "@/lib/analisis-malla";

/*
 * Visor 3D: qué le pasa al modelo, explicado en criollo y con qué hacer
 * en SketchUp. "Ver dónde" lleva la cámara a cada zona; "Reparar" arregla
 * solo lo que se puede arreglar automáticamente (agujeros y triángulos).
 */

export type TipoProblema = "agujeros" | "pegadas" | "aplastados";

type Reparacion = { aplastadosQuitados: number; duplicadosQuitados: number; agujerosTapados: number };

const INFO: Record<
  TipoProblema,
  { titulo: string; color: string; gravedad: string; claseGravedad: string; que: string; sketchup: string; seArregla: boolean }
> = {
  agujeros: {
    titulo: "Agujeros (caras que faltan)",
    color: "#ef0000",
    gravedad: "Importante",
    claseGravedad: "bg-red-600 text-white",
    que: "La pieza no está cerrada: falta alguna cara. La impresora puede dejar huecos o relleno raro en esa zona.",
    sketchup:
      "Entrá al grupo y fijate en Información de la entidad: si no dice «Volumen», no es sólido. Dibujá con Línea sobre el borde que falta para que se cree la cara. O tocá «Reparar automáticamente».",
    seArregla: true,
  },
  pegadas: {
    titulo: "Piezas pegadas por un borde",
    color: "#f59e0b",
    gravedad: "Leve",
    claseGravedad: "bg-amber-500 text-white",
    que: "Dos piezas se tocan justo en un borde (por ejemplo, una pared apoyada sobre la losa). El laminador las une y casi siempre se imprime bien.",
    sketchup:
      "Normalmente no hace falta hacer nada. Si una pared queda colgando de una sola arista, movela para que apoye con toda su base.",
    seArregla: false,
  },
  aplastados: {
    titulo: "Triángulos aplastados",
    color: "#ea580c",
    gravedad: "No afecta",
    claseGravedad: "bg-slate-500 text-white",
    que: "Triángulos sin superficie (como una cara de espesor cero). El laminador los ignora: no cambian la impresión.",
    sketchup: "No hace falta tocar nada. Si querés, «Reparar» los saca del archivo.",
    seArregla: true,
  },
};

export default function DiagnosticoMalla({
  analisis,
  piezasFlotantes,
  reparacion,
  reparando,
  onVer,
  onReparar,
}: {
  analisis: AnalisisMalla;
  piezasFlotantes: number;
  reparacion: Reparacion | null;
  reparando: boolean;
  onVer: (tipo: TipoProblema, zona: ZonaProblema) => void;
  onReparar: () => void;
}) {
  const [posicion, setPosicion] = useState<Record<TipoProblema, number>>({ agujeros: 0, pegadas: 0, aplastados: 0 });
  const tipos = (["agujeros", "pegadas", "aplastados"] as const).filter((tipo) => analisis[tipo].cantidad > 0);
  const reparable = analisis.agujeros.cantidad > 0 || analisis.aplastados.cantidad > 0;

  function ver(tipo: TipoProblema, paso: number) {
    const zonas = analisis[tipo].zonas;
    if (!zonas.length) return;
    const siguiente = (posicion[tipo] + paso + zonas.length) % zonas.length;
    setPosicion({ ...posicion, [tipo]: siguiente });
    onVer(tipo, zonas[siguiente]);
  }

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border-color)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Qué le pasa a tu modelo</p>

      {reparacion && (
        <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold leading-5 text-emerald-700 dark:text-emerald-400">
          ✓ Reparado: {reparacion.agujerosTapados} {reparacion.agujerosTapados === 1 ? "agujero tapado" : "agujeros tapados"},{" "}
          {reparacion.aplastadosQuitados + reparacion.duplicadosQuitados} triángulos sacados. El STL que descargues ya va
          arreglado.
        </p>
      )}

      {tipos.length === 0 && piezasFlotantes === 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ No encontramos problemas: el modelo está listo para imprimir.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {tipos.map((tipo) => {
            const info = INFO[tipo];
            const grupo = analisis[tipo];
            const zonas = grupo.zonas.length;
            return (
              <li key={tipo} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: info.color }} />
                  <span className="text-[12px] font-bold">{info.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${info.claseGravedad}`}>
                    {info.gravedad}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {tipo === "agujeros"
                    ? `${analisis.agujeros.lazos} ${analisis.agujeros.lazos === 1 ? "agujero" : "agujeros"}`
                    : `${grupo.cantidad} ${tipo === "pegadas" ? (grupo.cantidad === 1 ? "borde" : "bordes") : grupo.cantidad === 1 ? "triángulo" : "triángulos"}`}{" "}
                  en {zonas} {zonas === 1 ? "zona" : "zonas"}
                </p>
                <p className="mt-2 text-[11px] leading-5">{info.que}</p>
                <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
                  <strong className="text-[var(--text-main)]">En SketchUp:</strong> {info.sketchup}
                </p>
                {zonas > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => ver(tipo, -1)}
                      aria-label="Zona anterior"
                      className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-sm font-bold transition hover:border-red-600"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => ver(tipo, 0)}
                      className="h-8 flex-1 rounded-lg border border-[var(--border-color)] text-[10px] font-bold uppercase tracking-[0.08em] transition hover:border-red-600 hover:text-red-600"
                    >
                      Ver dónde · {posicion[tipo] + 1} de {zonas}
                    </button>
                    <button
                      type="button"
                      onClick={() => ver(tipo, 1)}
                      aria-label="Zona siguiente"
                      className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-sm font-bold transition hover:border-red-600"
                    >
                      ›
                    </button>
                  </div>
                )}
              </li>
            );
          })}

          {piezasFlotantes > 0 && (
            <li className="rounded-xl border border-[var(--border-color)] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                <span className="text-[12px] font-bold">Piezas en el aire</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                  Revisar
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5">
                {piezasFlotantes} {piezasFlotantes === 1 ? "pieza no apoya" : "piezas no apoyan"} sobre nada: se imprimen con
                soporte o hay que apoyarlas. Están marcadas con una caja violeta.
              </p>
            </li>
          )}
        </ul>
      )}

      {reparable && !reparacion && (
        <button
          type="button"
          onClick={onReparar}
          disabled={reparando}
          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {reparando ? "Reparando…" : "Reparar automáticamente"}
        </button>
      )}
      {reparable && !reparacion && (
        <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
          Tapa los agujeros y saca los triángulos aplastados. Las piezas pegadas no se tocan. Tu archivo original no se
          modifica: descargás una copia arreglada.
        </p>
      )}
    </div>
  );
}
