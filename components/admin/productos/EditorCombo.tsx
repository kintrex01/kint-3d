"use client";

import { Check, Gift, Minus, Plus, X } from "lucide-react";
import type { ComboAdmin, ProductoAdmin } from "@/lib/admin-tipos";
import { claseInput, pesos } from "@/components/admin/ui";

/*
 * Panel › Productos: armar un combo.
 *   - Fijo: siempre los mismos productos (se puede repetir uno: "2 cascos").
 *   - A elección: el cliente elige `cantidad` de los que marques.
 * Se guarda en la columna "Combo" de Productos (Admin_Kint3D.js).
 */

export const COMBO_VACIO: ComboAdmin = { tipo: "", cantidad: 0, productos: [] };

/* Error para mostrar al guardar ("" si está bien). */
export function errorCombo(combo: ComboAdmin, personalizable: boolean) {
  if (!combo.tipo) return "";
  if (personalizable) return "Un combo no puede ser personalizable: apagá «Lo personaliza el cliente».";
  if (combo.tipo === "fijo" && combo.productos.length < 2) return "El combo fijo tiene que incluir al menos 2 productos.";
  if (combo.tipo === "elegir") {
    if (new Set(combo.productos).size < 2) return "Marcá al menos 2 productos para que el cliente elija.";
    if (combo.cantidad < 2 || combo.cantidad > 10) return "El cliente tiene que elegir de 2 a 10.";
  }
  return "";
}

export function EditorCombo({
  valor,
  onCambiar,
  productos,
  nombreActual,
  precio,
  error,
}: {
  valor: ComboAdmin;
  onCambiar: (combo: ComboAdmin) => void;
  // Todos los productos de la hoja (activos o pausados).
  productos: ProductoAdmin[];
  nombreActual: string;
  precio: number;
  error: string;
}) {
  // Pueden ir en un combo: los que no son personalizables ni combos, ni este mismo.
  const disponibles = productos.filter(
    (producto) =>
      !producto.personalizable &&
      !producto.combo?.tipo &&
      producto.nombre.toLocaleLowerCase("es") !== nombreActual.trim().toLocaleLowerCase("es")
  );
  const precioDe = (nombre: string) => productos.find((producto) => producto.nombre === nombre)?.precio || 0;

  const suelto =
    valor.tipo === "fijo"
      ? valor.productos.reduce((suma, nombre) => suma + precioDe(nombre), 0)
      : valor.tipo === "elegir" && valor.productos.length
      ? Math.min(...valor.productos.map(precioDe).filter((p) => p > 0)) * valor.cantidad
      : 0;
  const ahorro = Number.isFinite(suelto) && precio > 0 ? Math.round((suelto - precio) * 100) / 100 : 0;

  const modos = [
    ["", "No es combo", "Producto común"],
    ["fijo", "Combo fijo", "Siempre los mismos"],
    ["elegir", "A elección", "El cliente elige"],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {modos.map(([tipo, titulo, detalle]) => (
          <button
            key={tipo || "nada"}
            type="button"
            aria-pressed={valor.tipo === tipo}
            onClick={() =>
              onCambiar(
                tipo === ""
                  ? COMBO_VACIO
                  : { tipo, cantidad: tipo === "elegir" ? Math.max(2, valor.cantidad || 2) : 0, productos: valor.productos }
              )
            }
            className={`rounded-xl border px-2.5 py-2 text-left transition ${
              valor.tipo === tipo
                ? "border-[var(--blue-main)] bg-[var(--blue-main)]/10 ring-1 ring-inset ring-[var(--blue-main)] dark:border-sky-400 dark:ring-sky-400"
                : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
            }`}
          >
            <span className="block text-xs font-black">{titulo}</span>
            <span className="block text-[10px] text-[var(--text-muted)]">{detalle}</span>
          </button>
        ))}
      </div>

      {valor.tipo === "fijo" && (
        <div>
          <p className="mb-2 text-[11px] leading-4 text-[var(--text-muted)]">
            Elegí qué incluye. Si querés 2 iguales, agregalo dos veces.
          </p>
          {valor.productos.length > 0 && (
            <ol className="mb-2 space-y-1.5">
              {valor.productos.map((nombre, indice) => (
                <li key={`${nombre}-${indice}`} className="flex items-center gap-2 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2">
                  <Gift size={14} className="shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{nombre}</span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">{pesos(precioDe(nombre))}</span>
                  <button
                    type="button"
                    onClick={() => onCambiar({ ...valor, productos: valor.productos.filter((_, otro) => otro !== indice) })}
                    aria-label={`Quitar ${nombre}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <select
            className={`${claseInput} h-10`}
            value=""
            onChange={(evento) => {
              if (evento.target.value) onCambiar({ ...valor, productos: [...valor.productos, evento.target.value].slice(0, 20) });
            }}
            aria-label="Agregar un producto al combo"
          >
            <option value="">+ Agregar un producto…</option>
            {disponibles.map((producto) => (
              <option key={producto.nombre} value={producto.nombre}>
                {producto.nombre} · {pesos(producto.precio)}
                {producto.activo ? "" : " (pausado)"}
              </option>
            ))}
          </select>
        </div>
      )}

      {valor.tipo === "elegir" && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--kint-panel-border)] px-3 py-2">
            <span className="text-sm font-bold">El cliente elige</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCambiar({ ...valor, cantidad: Math.max(2, valor.cantidad - 1) })}
                aria-label="Uno menos"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--kint-panel-border)]"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-lg font-black tabular-nums">{valor.cantidad}</span>
              <button
                type="button"
                onClick={() => onCambiar({ ...valor, cantidad: Math.min(10, valor.cantidad + 1) })}
                aria-label="Uno más"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--kint-panel-border)]"
              >
                <Plus size={14} />
              </button>
            </span>
          </div>
          <p className="mb-2 text-[11px] leading-4 text-[var(--text-muted)]">
            Marcá entre cuáles puede elegir (puede repetir). Sirven también los pausados.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {disponibles.map((producto) => {
              const marcado = valor.productos.includes(producto.nombre);
              return (
                <button
                  key={producto.nombre}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() =>
                    onCambiar({
                      ...valor,
                      productos: marcado
                        ? valor.productos.filter((nombre) => nombre !== producto.nombre)
                        : [...valor.productos, producto.nombre].slice(0, 20),
                    })
                  }
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    marcado
                      ? "border-[var(--blue-main)] bg-[var(--blue-main)]/10 font-bold dark:border-sky-400"
                      : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      marcado ? "border-transparent bg-[var(--blue-main)] text-white" : "border-[var(--kint-panel-border)]"
                    }`}
                  >
                    {marcado && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {producto.nombre}
                    {producto.activo ? "" : <span className="font-normal text-[var(--text-muted)]"> (pausado)</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{pesos(producto.precio)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {valor.tipo && suelto > 0 && precio > 0 && (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-bold ${
            ahorro > 0
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {ahorro > 0
            ? `Sueltos salen ${valor.tipo === "elegir" ? "desde " : ""}${pesos(suelto)}: el cliente ahorra ${valor.tipo === "elegir" ? "desde " : ""}${pesos(ahorro)}.`
            : `Ojo: sueltos salen ${valor.tipo === "elegir" ? "desde " : ""}${pesos(suelto)}. Con este precio el combo no ahorra nada.`}
        </p>
      )}

      {error && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
