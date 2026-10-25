"use client";

import { useState } from "react";
import type { AnalisisMalla, ZonaProblema } from "@/lib/analisis-malla";

/*
 * Visor 3D: qué le pasa al modelo, explicado en criollo y con qué hacer
 * en SketchUp. "Ver dónde" lleva la cámara a cada zona; "Reparar" arregla
 * solo lo que se puede arreglar automáticamente (agujeros y triángulos).
 */

export type TipoProblema = "agujeros" | "pegadas" | "aplastados" | "alReves";

type Reparacion = {
  aplastadosQuitados: number;
  duplicadosQuitados: number;
  carasDoblesQuitadas: number;
  carasDadasVuelta: number;
  agujerosTapados: number;
  rajasCerradas: number;
  aristasCosidas: number;
  laminasEngrosadas: number;
  carasInternasQuitadas: number;
  automatica: boolean;
  quedanAgujeros: number;
  piezasUnidas?: number;
  piezasFinales?: number;
};

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
      "Tocá «Ver dónde» para encontrarlo. En SketchUp, entrá al grupo y dibujá con Línea sobre el borde que falta para que se cree la cara. Si es una abertura a propósito (un lucernario, una pérgola), dejala: la revisamos nosotros.",
    seArregla: true,
  },
  pegadas: {
    titulo: "Piezas pegadas por un borde",
    color: "#f59e0b",
    gravedad: "Leve",
    claseGravedad: "bg-amber-500 text-white",
    que: "Dos piezas se tocan justo en un borde (por ejemplo, una pared apoyada sobre la losa). El laminador las une y casi siempre se imprime bien.",
    sketchup:
      "Normalmente no hace falta hacer nada. «Reparar» saca las caras dobles entre piezas apiladas. Si una pared queda colgando de una sola arista, movela para que apoye con toda su base.",
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
  alReves: {
    titulo: "Caras dadas vuelta",
    color: "#2563eb",
    gravedad: "Leve",
    claseGravedad: "bg-amber-500 text-white",
    que: "Algunas caras miran para adentro. En SketchUp son las que se ven azules (el revés de la cara). Pueden confundir al laminador.",
    sketchup: "Seleccioná las caras azules → clic derecho → Invertir caras. O tocá «Reparar automáticamente».",
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
  onDeshacer,
  onDescargar,
}: {
  analisis: AnalisisMalla;
  piezasFlotantes: number;
  reparacion: Reparacion | null;
  reparando: boolean;
  onVer: (tipo: TipoProblema, zona: ZonaProblema) => void;
  onReparar: () => void;
  onDeshacer: () => void;
  onDescargar: () => void;
}) {
  const [posicion, setPosicion] = useState<Record<TipoProblema, number>>({ agujeros: 0, pegadas: 0, aplastados: 0, alReves: 0 });
  // Después de unir, los bordes "pegados" son las uniones mismas: ya no se muestran.
  const tipos = (["agujeros", "alReves", "pegadas", "aplastados"] as const).filter(
    (tipo) => analisis[tipo].cantidad > 0 && !(tipo === "pegadas" && (reparacion?.piezasUnidas || 0) > 0)
  );
  const reparable = tipos.length > 0;

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
        <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-[11px] leading-5 text-emerald-800 dark:text-emerald-300">
          <p className="font-bold">
            {reparacion.automatica ? "✓ Lo arreglamos solo, no tenés que hacer nada" : "✓ Modelo reparado"}
          </p>
          <ul className="mt-1 space-y-0.5">
            {reparacion.agujerosTapados > 0 && (
              <li>
                • {reparacion.agujerosTapados} {reparacion.agujerosTapados === 1 ? "raja finita cerrada" : "rajas finitas cerradas"}
              </li>
            )}
            {reparacion.laminasEngrosadas > 0 && (
              <li>
                • {reparacion.laminasEngrosadas}{" "}
                {reparacion.laminasEngrosadas === 1
                  ? "cara sin espesor (pared, techo o cartel) a la que le dimos espesor"
                  : "caras sin espesor (paredes, techos o carteles) a las que les dimos espesor"}{" "}
                para que se pueda imprimir
              </li>
            )}
            {(reparacion.piezasUnidas || 0) > 1 && (
              <li>
                • {reparacion.piezasUnidas} piezas unidas en un solo sólido: sin caras superpuestas ni fugas (las medidas no cambian)
              </li>
            )}
            {reparacion.aristasCosidas + reparacion.rajasCerradas > 0 && (
              <li>• {reparacion.aristasCosidas + reparacion.rajasCerradas} uniones entre caras cosidas (rajas y bordes partidos)</li>
            )}
            {reparacion.carasDadasVuelta > 0 && <li>• {reparacion.carasDadasVuelta} caras dadas vuelta para que miren afuera</li>}
            {reparacion.carasDoblesQuitadas + reparacion.carasInternasQuitadas > 0 && (
              <li>
                • {reparacion.carasDoblesQuitadas + reparacion.carasInternasQuitadas} caras de más sacadas (dobles o metidas adentro de un
                sólido)
              </li>
            )}
            {reparacion.aplastadosQuitados + reparacion.duplicadosQuitados > 0 && (
              <li>• {reparacion.aplastadosQuitados + reparacion.duplicadosQuitados} triángulos aplastados o repetidos sacados</li>
            )}
            {(reparacion.piezasUnidas || 0) +
              reparacion.agujerosTapados +
              reparacion.laminasEngrosadas +
              reparacion.aristasCosidas +
              reparacion.rajasCerradas +
              reparacion.carasDadasVuelta +
              reparacion.carasDoblesQuitadas +
              reparacion.carasInternasQuitadas +
              reparacion.aplastadosQuitados +
              reparacion.duplicadosQuitados ===
              0 && <li>• No había nada que se pudiera arreglar solo.</li>}
          </ul>
          {reparacion.quedanAgujeros > 0 && (
            <p className="mt-1.5 font-semibold text-amber-700 dark:text-amber-400">
              Quedan {reparacion.quedanAgujeros} {reparacion.quedanAgujeros === 1 ? "hueco" : "huecos"} sin cerrar (no los inventamos: pueden
              ser aberturas a propósito). Mandalo igual, lo revisamos nosotros.
            </p>
          )}
          <button
            type="button"
            onClick={onDescargar}
            className="mt-2.5 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700"
          >
            Descargar STL reparado
          </button>
          <button
            type="button"
            onClick={onDeshacer}
            className="mt-1.5 w-full rounded-lg px-3 py-1.5 text-[10px] font-semibold underline-offset-2 transition hover:underline"
          >
            Ver mi archivo original (sin arreglar)
          </button>
        </div>
      )}

      {tipos.length === 0 && piezasFlotantes === 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
          {reparacion ? "✓ Ya quedó listo para imprimir." : "✓ No encontramos problemas: el modelo está listo para imprimir."}
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
          Une las piezas que se tocan en un solo sólido (saca las caras superpuestas), da vuelta las caras al revés y cose
          rajas finitas. Las medidas no cambian y no inventa caras: los huecos y aberturas quedan como están.
        </p>
      )}
    </div>
  );
}
