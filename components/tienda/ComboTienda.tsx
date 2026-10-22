"use client";

import { Check, Gift, Minus, Plus } from "lucide-react";

/*
 * Combos de la tienda (columna "Combo" de Productos, ver Tienda_Kint3D.js):
 *   - fijo:   incluye siempre los mismos productos.
 *   - elegir: el cliente elige `cantidad` de las opciones (puede repetir).
 * Lo elegido viaja en el comentario de la línea: "Combo: A + B | comentario".
 */

export type OpcionCombo = { nombre: string; precio: number; foto: string; fotoId: string };

export type ComboTienda = {
  tipo: "fijo" | "elegir";
  cantidad: number;
  opciones: OpcionCombo[];
  // Fijo: lo que costarían sueltos. Elegir: lo más barato posible (ahorro "desde").
  valorSuelto: number;
};

export function normalizarCombo(valor: unknown): ComboTienda | null {
  const combo = valor as Partial<ComboTienda> | null;
  if (!combo || (combo.tipo !== "fijo" && combo.tipo !== "elegir")) return null;
  const opciones = (Array.isArray(combo.opciones) ? combo.opciones : [])
    .map((opcion) => ({
      nombre: String(opcion?.nombre || ""),
      precio: Number(opcion?.precio) || 0,
      foto: String(opcion?.foto || ""),
      fotoId: String(opcion?.fotoId || ""),
    }))
    .filter((opcion) => opcion.nombre);
  const cantidad = Math.floor(Number(combo.cantidad) || 0);
  if (!opciones.length || cantidad < 2) return null;
  return { tipo: combo.tipo, cantidad, opciones, valorSuelto: Number(combo.valorSuelto) || 0 };
}

/* Comentario de la línea con lo elegido adelante. */
export function comentarioCombo(elegidos: string[], comentario: string) {
  return `Combo: ${elegidos.join(" + ")}${comentario.trim() ? ` | ${comentario.trim()}` : ""}`;
}

/* "Combo: A + B | hola" → { elegidos: ["A", "B"], resto: "hola" }; null si no es de combo. */
export function leerComentarioCombo(comentario: string) {
  const coincidencia = /^(?:Combo|Incluye):\s*([^|]*?)\s*(?:\|\s*([\s\S]*))?$/.exec(comentario || "");
  if (!coincidencia) return null;
  return {
    elegidos: coincidencia[1].split("+").map((nombre) => nombre.trim()).filter(Boolean),
    resto: (coincidencia[2] || "").trim(),
  };
}

/* Cuánto se ahorra frente a comprarlos sueltos (0 si no hay ahorro). */
export function ahorroCombo(combo: ComboTienda | null | undefined, precio: number) {
  if (!combo || !(combo.valorSuelto > precio)) return 0;
  return Math.round((combo.valorSuelto - precio) * 100) / 100;
}

function pesos(valor: number) {
  return `$${valor.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

function urlOpcion(opcion: OpcionCombo) {
  return opcion.fotoId ? `/api/imagen-drive?id=${encodeURIComponent(opcion.fotoId)}` : opcion.foto;
}

function Miniatura({ opcion, tamano = 56 }: { opcion: OpcionCombo; tamano?: number }) {
  const url = urlOpcion(opcion);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-xl bg-white object-cover ring-1 ring-[var(--kint-panel-border)]"
      style={{ width: tamano, height: tamano }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
      style={{ width: tamano, height: tamano }}
    >
      <Gift size={18} />
    </span>
  );
}

/* Etiqueta "Combo · Ahorrás $X" para las tarjetas. */
export function EtiquetaCombo({ combo, precio }: { combo: ComboTienda; precio: number }) {
  const ahorro = ahorroCombo(combo, precio);
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400">
      <Gift size={11} strokeWidth={2.6} />
      {combo.tipo === "elegir" ? `Combo · elegí ${combo.cantidad}` : "Combo"}
      {ahorro > 0 && <span className="normal-case tracking-normal">· −{pesos(ahorro)}</span>}
    </span>
  );
}

/* Sección del combo en la ficha del producto. */
export function ComboFicha({
  combo,
  precio,
  elegidos,
  onCambiar,
  falta,
}: {
  combo: ComboTienda;
  precio: number;
  elegidos: string[];
  onCambiar: (elegidos: string[]) => void;
  falta: boolean;
}) {
  const ahorro = ahorroCombo(combo, precio);
  const textoAhorro =
    ahorro > 0 ? (
      <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        {combo.tipo === "fijo"
          ? `Por separado saldrían ${pesos(combo.valorSuelto)}: ahorrás ${pesos(ahorro)}.`
          : `Comprándolos sueltos salen desde ${pesos(combo.valorSuelto)}: ahorrás desde ${pesos(ahorro)}.`}
      </p>
    ) : null;

  if (combo.tipo === "fijo") {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          <Gift size={13} /> El combo incluye
        </p>
        <ul className="mt-3 space-y-2">
          {combo.opciones.map((opcion, indice) => (
            <li key={`${opcion.nombre}-${indice}`} className="flex items-center gap-3">
              <Miniatura opcion={opcion} tamano={44} />
              <span className="min-w-0 flex-1 text-sm font-bold">{opcion.nombre}</span>
              {opcion.precio > 0 && (
                <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)] line-through">{pesos(opcion.precio)}</span>
              )}
            </li>
          ))}
        </ul>
        {textoAhorro}
      </div>
    );
  }

  const total = elegidos.length;
  const lleno = total >= combo.cantidad;

  function cuantos(nombre: string) {
    return elegidos.filter((elegido) => elegido === nombre).length;
  }

  function sumar(nombre: string) {
    if (lleno) return;
    onCambiar([...elegidos, nombre]);
  }

  function restar(nombre: string) {
    const posicion = elegidos.lastIndexOf(nombre);
    if (posicion === -1) return;
    onCambiar(elegidos.filter((_, indice) => indice !== posicion));
  }

  return (
    <fieldset className="mt-6">
      <legend className="mb-2 flex w-full flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
        Elegí {combo.cantidad} para tu combo
        {falta ? (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] tracking-[0.12em] text-white">Obligatorio</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] tracking-[0.12em] text-white">
            <Check size={10} strokeWidth={3} /> Listo
          </span>
        )}
        <span className="ml-auto text-[11px] tracking-normal text-[var(--text-muted)] normal-case">
          {total} de {combo.cantidad}
        </span>
      </legend>

      {/* Lugares del combo: se ve qué va y qué falta. */}
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: combo.cantidad }, (_, indice) => (
          <span
            key={indice}
            className={`h-1.5 flex-1 rounded-full transition ${indice < total ? "bg-emerald-500" : "bg-[var(--kint-panel-soft)]"}`}
          />
        ))}
      </div>

      <ul className="space-y-2">
        {combo.opciones.map((opcion) => {
          const cantidad = cuantos(opcion.nombre);
          return (
            <li
              key={opcion.nombre}
              className={`flex items-center gap-3 rounded-2xl border-2 p-2 pr-3 transition ${
                cantidad > 0
                  ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)]"
                  : falta
                  ? "border-dashed border-red-500/50"
                  : "border-[var(--kint-panel-border)]"
              }`}
            >
              <button type="button" onClick={() => sumar(opcion.nombre)} disabled={lleno && !cantidad} className="shrink-0 disabled:opacity-60">
                <Miniatura opcion={opcion} />
              </button>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">{opcion.nombre}</span>
                {opcion.precio > 0 && (
                  <span className="block text-[11px] text-[var(--text-muted)]">Suelto {pesos(opcion.precio)}</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {cantidad > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => restar(opcion.nombre)}
                      aria-label={`Sacar un ${opcion.nombre}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] transition hover:border-red-500"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-5 text-center text-sm font-black tabular-nums">{cantidad}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => sumar(opcion.nombre)}
                  disabled={lleno}
                  aria-label={`Sumar un ${opcion.nombre}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--acento)] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus size={15} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">Podés repetir el mismo si querés.</p>
      {textoAhorro}
    </fieldset>
  );
}
