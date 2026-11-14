"use client";

import { useEffect, useState } from "react";
import InsigniaTop from "./InsigniaTop";

/*
 * Top Kint en el inicio. Lo que se ve lo elige el dueño en Configuración › Puntos:
 * prendido o apagado, cuántos (3, 5 o 10), el período, si se ve en el celular,
 * si muestra los puntos y si el podio lleva insignias.
 */

type ItemTop = { puesto: number; alias: string; puntos: number };

type DatosTop = {
  ranking: ItemTop[];
  periodo: string;
  anio: number | null;
  semestre: number | null;
  celular: boolean;
  mostrarPuntos: boolean;
  insignias: boolean;
};

function textoPeriodo(datos: DatosTop) {
  if (datos.periodo === "anual") return `Ranking ${datos.anio ?? "del año"}`;
  if (datos.periodo === "semestral") return `${datos.semestre === 2 ? "2.º" : "1.er"} semestre ${datos.anio ?? ""}`.trim();
  return "Ranking histórico";
}

let pedido: Promise<DatosTop | null> | null = null;

function cargarTop() {
  // Una sola consulta aunque el componente aparezca dos veces (computadora y celular).
  pedido ??= fetch("/api/top-kint")
    .then((respuesta) => respuesta.json().then((data) => ({ ok: respuesta.ok, data })))
    .then(({ ok, data }) =>
      ok && data.ok && data.habilitado
        ? {
            ranking: Array.isArray(data.ranking) ? data.ranking : [],
            periodo: String(data.periodo || "historico"),
            anio: data.anio ?? null,
            semestre: data.semestre ?? null,
            celular: Boolean(data.celular),
            mostrarPuntos: data.mostrarPuntos !== false,
            insignias: data.insignias !== false,
          }
        : null
    )
    .catch(() => null);
  return pedido;
}

export default function TopKintInicio({ variante }: { variante: "lateral" | "celular" }) {
  const [datos, setDatos] = useState<DatosTop | null>(null);

  useEffect(() => {
    let cancelado = false;
    void cargarTop().then((resultado) => {
      if (!cancelado) setDatos(resultado);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!datos) return null;
  if (variante === "celular" && !datos.celular) return null;

  const lista = (
    <div className="border-t border-[var(--border-color)]">
      {datos.ranking.length > 0 ? (
        datos.ranking.map((item, index) => {
          const podio = datos.insignias && item.puesto <= 3;
          return (
            <div
              key={`${item.alias}-${item.puesto}`}
              className={`flex items-center gap-3 ${podio ? "py-2.5" : "py-3"} ${index > 0 ? "border-t border-[var(--border-color)]" : ""}`}
            >
              <span className="flex w-7 shrink-0 justify-center">
                {podio ? (
                  <InsigniaTop puesto={item.puesto} tamano="sm" />
                ) : (
                  <span className="text-[11px] font-black text-[var(--text-muted)]">
                    {String(item.puesto).padStart(2, "0")}
                  </span>
                )}
              </span>

              <p
                className={`min-w-0 flex-1 truncate font-bold text-[var(--text-main)] ${
                  variante === "celular" ? "text-sm" : "text-[11px]"
                }`}
              >
                {item.alias}
              </p>

              {datos.mostrarPuntos && (
                <div className="shrink-0 text-right">
                  <p className={`font-black text-[var(--blue-soft)] ${variante === "celular" ? "text-sm" : "text-[12px]"}`}>
                    {Number(item.puntos).toLocaleString("es-UY")}
                  </p>
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">pts</p>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Ranking iniciando</p>
        </div>
      )}
    </div>
  );

  const encabezado = (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--text-main)]">Top Kint</p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {textoPeriodo(datos)}
        </p>
      </div>
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7D0018] shadow-[0_0_10px_rgba(125,0,24,0.35)]" />
    </div>
  );

  const claseVidrio =
    "overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(185,211,226,0.34))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_50px_rgba(37,67,93,0.16)] backdrop-blur-[22px] backdrop-saturate-150 [text-shadow:0_1px_3px_rgba(0,0,0,0.18)] dark:border-[#87A4B5]/20 dark:bg-[linear-gradient(135deg,rgba(10,20,31,0.76),rgba(37,67,93,0.48))] dark:shadow-[inset_0_1px_0_rgba(185,211,226,0.10),0_18px_55px_rgba(0,0,0,0.28)] dark:[text-shadow:0_1px_5px_rgba(0,0,0,0.55)]";

  if (variante === "celular") {
    return (
      <div className="relative z-20 mx-auto mt-6 w-full max-w-sm px-6 xl:hidden">
        <section className={claseVidrio} aria-label="Top Kint">
          {encabezado}
          {lista}
          <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">Tus pedidos también suman Puntos Kint.</p>
        </section>
      </div>
    );
  }

  return (
    <aside
      className={`group fixed right-6 top-1/2 z-30 hidden max-h-[80vh] w-[210px] -translate-y-1/2 overflow-y-auto transition-all duration-300 hover:border-[#9b5362]/70 hover:shadow-[0_18px_55px_rgba(125,0,24,0.13)] xl:block ${claseVidrio}`}
    >
      {encabezado}
      {lista}
      <p className="mt-2 max-h-0 overflow-hidden text-[9px] leading-4 text-[var(--text-muted)] opacity-0 transition-all duration-300 group-hover:max-h-10 group-hover:opacity-100">
        Tus pedidos también suman Puntos Kint.
      </p>
    </aside>
  );
}
