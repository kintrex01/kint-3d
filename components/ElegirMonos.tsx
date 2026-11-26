"use client";

import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import {
  ESCALAS_MONOS,
  MONOS_MAXIMO,
  MONOS_MINIMO,
  MONOS_PASO,
  MONOS_POR_PAQUETE,
  numeroEscala,
  precioMono,
  precioMonos30,
  totalMonos,
  type ColorMonos,
  type PreciosMonos,
} from "@/lib/extras-color";

/*
 * Monos a medida (cotizar, seguimiento y tienda): eligen la escala (o escriben otra),
 * el color (cada botón con su color real) y cuántos monos; el precio se ve al momento
 * y sube con la cantidad. Lo que se cobra lo calcula Apps Script con la misma fórmula.
 * La línea viaja como cadena «1:300 · Rojo» y cantidad = monos.
 */

type Linea = { cadena: string; cantidad: number };

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

export default function ElegirMonos({
  nombre,
  foto,
  colores,
  precios,
  escalaInicial = "",
  elegidos = [],
  onSumar,
  onQuitar,
  ocupado = false,
  textoBoton = "Sumar",
}: {
  nombre: string;
  foto?: string;
  colores: ColorMonos[];
  precios: PreciosMonos;
  escalaInicial?: string; // la escala de la maqueta: arranca elegida
  elegidos?: Linea[]; // lo que ya sumó de este producto (se muestra abajo para sacarlo)
  onSumar: (cadena: string, cantidad: number) => void;
  onQuitar?: (cadena: string) => void;
  ocupado?: boolean;
  textoBoton?: string;
}) {
  const inicial = numeroEscala(escalaInicial);
  const [escala, setEscala] = useState(inicial && ESCALAS_MONOS.includes(inicial) ? inicial : 0);
  const [otra, setOtra] = useState(inicial && !ESCALAS_MONOS.includes(inicial) ? String(inicial) : "");
  const [usarOtra, setUsarOtra] = useState(Boolean(inicial) && !ESCALAS_MONOS.includes(inicial));
  const [color, setColor] = useState("");
  const [cantidad, setCantidad] = useState(MONOS_POR_PAQUETE);
  const [textoCantidad, setTextoCantidad] = useState(String(MONOS_POR_PAQUETE));

  const n = usarOtra ? Number(otra) || 0 : escala;
  const unidad = n ? precioMono(precios, n) : 0;
  const total = n ? totalMonos(precios, n, cantidad) : 0;
  const falta = !n ? "Elegí la escala" : !color ? "Elegí el color" : "";

  function poner(valor: number) {
    const limpio = Math.min(MONOS_MAXIMO, Math.max(MONOS_MINIMO, Math.round(valor) || MONOS_MINIMO));
    setCantidad(limpio);
    setTextoCantidad(String(limpio));
  }

  const chip = (activo: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
      activo
        ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
        : "border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--blue-main)] hover:text-[var(--text-main)]"
    }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
      <div className="sm:flex">
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={nombre} loading="lazy" className="h-32 w-full object-cover sm:h-auto sm:w-40 sm:shrink-0" />
        )}

        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          {/* Escala */}
          <div>
            <p className={`mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${n ? "text-[var(--text-muted)]" : "text-red-600"}`}>
              {n ? `Escala 1:${n}` : "Elegí la escala"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {ESCALAS_MONOS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={!usarOtra && escala === opcion}
                  onClick={() => {
                    setUsarOtra(false);
                    setEscala(opcion);
                  }}
                  className={chip(!usarOtra && escala === opcion)}
                >
                  1:{opcion}
                </button>
              ))}
              <button type="button" aria-pressed={usarOtra} onClick={() => setUsarOtra(true)} className={chip(usarOtra)}>
                Otra
              </button>
              {usarOtra && (
                <span
                  className={`flex h-7 w-24 items-center rounded-full border bg-[var(--kint-input-bg)] px-2.5 text-xs font-bold focus-within:border-[var(--blue-main)] ${
                    Number(otra) > 0 ? "border-[var(--border-color)]" : "border-dashed border-red-500/70"
                  }`}
                >
                  <span className="text-[var(--text-muted)]">1:</span>
                  <input
                    value={otra}
                    onChange={(evento) => setOtra(evento.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder="300"
                    aria-label="Otra escala"
                    autoFocus
                    className="h-full w-full min-w-0 bg-transparent pl-0.5 outline-none"
                  />
                </span>
              )}
            </div>
          </div>

          {/* Color: cada botón con su color real */}
          <div>
            <p className={`mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${color ? "text-[var(--text-muted)]" : "text-red-600"}`}>
              {color ? `Color: ${color}` : "Elegí el color"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {colores.map((opcion) => (
                <button
                  key={opcion.nombre}
                  type="button"
                  title={opcion.nombre}
                  aria-label={opcion.nombre}
                  aria-pressed={color === opcion.nombre}
                  onClick={() => setColor(opcion.nombre)}
                  className={`relative h-8 w-8 overflow-hidden rounded-full border border-black/15 bg-cover bg-center transition dark:border-white/15 ${
                    color === opcion.nombre ? "ring-2 ring-[var(--blue-main)] ring-offset-2 ring-offset-[var(--card-bg)]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: opcion.tono || "#9ca3af", backgroundImage: opcion.foto ? `url(${opcion.foto})` : undefined }}
                >
                  {color === opcion.nombre && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cuántos monos y precio (sube con la cantidad) */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[var(--border-color)] pt-3">
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">¿Cuántos monos? <span className="normal-case tracking-normal">(mínimo {MONOS_MINIMO})</span></p>
              <div className="flex items-center rounded-xl border border-[var(--border-color)]">
                <button
                  type="button"
                  aria-label={`${MONOS_PASO} menos`}
                  disabled={cantidad <= MONOS_MINIMO}
                  onClick={() => poner(cantidad - MONOS_PASO)}
                  className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <input
                  value={textoCantidad}
                  onChange={(evento) => {
                    const texto = evento.target.value.replace(/\D/g, "").slice(0, 3);
                    setTextoCantidad(texto);
                    if (Number(texto) > 0) setCantidad(Math.min(MONOS_MAXIMO, Math.max(MONOS_MINIMO, Number(texto))));
                  }}
                  onBlur={() => poner(Number(textoCantidad))}
                  inputMode="numeric"
                  aria-label="Cantidad de monos"
                  className="h-9 w-12 bg-transparent text-center text-sm font-black outline-none"
                />
                <button
                  type="button"
                  aria-label={`${MONOS_PASO} más`}
                  disabled={cantidad >= MONOS_MAXIMO}
                  onClick={() => poner(cantidad + MONOS_PASO)}
                  className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="text-right">
                <p className="text-xl font-black leading-none text-red-600">{n ? pesos(total) : "—"}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {n ? `${pesos(unidad)} c/u · 30 por ${pesos(precioMonos30(precios, n))}` : "Elegí la escala para ver el precio"}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(falta) || ocupado}
                onClick={() => onSumar(`1:${n} · ${color}`, cantidad)}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
                {falta || `${textoBoton} ${cantidad}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lo que ya sumó */}
      {elegidos.length > 0 && (
        <ul className="space-y-1.5 border-t border-[var(--border-color)] bg-emerald-500/5 p-3">
          {elegidos.map((linea) => {
            const escalaLinea = numeroEscala(linea.cadena);
            return (
              <li key={linea.cadena} className="flex items-center gap-2 text-xs">
                <Check size={14} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 font-bold">
                  {linea.cantidad} monos · {linea.cadena}
                </span>
                <span className="font-black">{escalaLinea ? pesos(totalMonos(precios, escalaLinea, linea.cantidad)) : ""}</span>
                {onQuitar && (
                  <button
                    type="button"
                    aria-label="Sacar"
                    disabled={ocupado}
                    onClick={() => onQuitar(linea.cadena)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-red-600 disabled:opacity-40"
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
