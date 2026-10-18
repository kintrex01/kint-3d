"use client";

import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type { GastoFijo, AccionesAdmin } from "@/lib/admin-tipos";
import { Boton, Tarjeta, claseInput, pesos, useAvisos } from "@/components/admin/ui";

/*
 * Gastos fijos de cada mes (Netflix, publicidad, internet...): se anotan
 * solos en la Caja el día del mes en que te cobran.
 */

type Respuesta = AccionesAdmin["admin_caja_listar"]["respuesta"];

export function GastosFijos({ fijos, onDatos }: { fijos: GastoFijo[]; onDatos: (datos: Respuesta) => void }) {
  const avisar = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", monto: "", dia: "1", categoria: "" });
  const [guardando, setGuardando] = useState("");
  const total = fijos.reduce((suma, fijo) => suma + fijo.monto, 0);

  async function guardar() {
    setGuardando("nuevo");
    try {
      const respuesta = await accionAdmin("admin_caja_fijo_guardar", {
        nombre: nuevo.nombre.trim(),
        monto: Number(nuevo.monto.replace(",", ".")),
        dia: Number(nuevo.dia),
        categoria: nuevo.categoria.trim(),
      });
      onDatos(respuesta);
      avisar(`${nuevo.nombre.trim()}: se anota solo el día ${nuevo.dia} de cada mes`);
      setNuevo({ nombre: "", monto: "", dia: "1", categoria: "" });
      setAbierto(false);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando("");
    }
  }

  async function borrar(fijo: GastoFijo) {
    if (!window.confirm(`¿Dejar de anotar «${fijo.nombre}» cada mes? Lo ya anotado queda en la Caja.`)) return;
    setGuardando(fijo.id);
    try {
      onDatos(await accionAdmin("admin_caja_fijo_borrar", { id: fijo.id }));
      avisar(`${fijo.nombre} ya no se anota`);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo borrar.", "error");
    } finally {
      setGuardando("");
    }
  }

  return (
    <Tarjeta className="mb-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-black">
          <CalendarClock size={17} className="text-amber-500" />
          Gastos fijos mensuales
        </p>
        {fijos.length > 0 && (
          <span className="text-xs font-bold text-[var(--text-muted)]">{pesos(total)} por mes</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Suscripciones, publicidad, internet… Se anotan solos como gasto el día del mes que te cobran.
      </p>

      {fijos.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {fijos
            .slice()
            .sort((a, b) => a.dia - b.dia)
            .map((fijo) => (
              <li key={fijo.id} className="flex items-center gap-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2">
                <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <span className="text-[9px] font-bold leading-none">DÍA</span>
                  <span className="text-sm font-black leading-none">{fijo.dia}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{fijo.nombre}</span>
                  {fijo.categoria && <span className="block text-[11px] text-[var(--text-muted)]">{fijo.categoria}</span>}
                </span>
                <span className="shrink-0 text-sm font-black tabular-nums">{pesos(fijo.monto)}</span>
                <Boton
                  tamano="chico"
                  variante="fantasma"
                  aria-label={`Quitar ${fijo.nombre}`}
                  cargando={guardando === fijo.id}
                  icono={<Trash2 size={14} />}
                  onClick={() => void borrar(fijo)}
                  className="w-9 px-0"
                />
              </li>
            ))}
        </ul>
      )}

      {abierto ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1.6fr_1fr_0.7fr_1.2fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Qué es</span>
            <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={80} placeholder="Netflix" className={`${claseInput} h-10`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Monto</span>
            <input value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value.replace(/[^\d.,]/g, "") })} inputMode="decimal" placeholder="390" className={`${claseInput} h-10`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Día del mes</span>
            <input value={nuevo.dia} onChange={(e) => setNuevo({ ...nuevo, dia: e.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" className={`${claseInput} h-10`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Categoría (opcional)</span>
            <input value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })} maxLength={60} placeholder="Suscripciones" className={`${claseInput} h-10`} />
          </label>
          <div className="flex gap-1.5">
            <Boton tamano="chico" variante="fantasma" className="h-10" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton
              tamano="chico"
              variante="principal"
              className="h-10"
              cargando={guardando === "nuevo"}
              disabled={!nuevo.nombre.trim() || !Number(nuevo.monto.replace(",", ".")) || !(Number(nuevo.dia) >= 1 && Number(nuevo.dia) <= 31)}
              onClick={() => void guardar()}
            >
              Guardar
            </Boton>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] sm:col-span-5">
            Si el día de este mes ya pasó, se anota ahora. En meses más cortos (ej. día 31) se anota el último día.
          </p>
        </div>
      ) : (
        <Boton tamano="chico" variante="secundario" className="mt-3" icono={<Plus size={14} />} onClick={() => setAbierto(true)}>
          Agregar gasto fijo
        </Boton>
      )}
    </Tarjeta>
  );
}
