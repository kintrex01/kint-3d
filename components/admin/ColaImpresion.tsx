"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Play, Plus, Printer, X } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ItemColaImpresion } from "@/lib/admin-tipos";
import { Boton, Hoja, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Cola de la impresora (al costado de «Todos los pedidos»): qué imprime
 * ahora, a qué hora termina y qué sigue. La gente ve los horarios (sin
 * nombres) en /cotizar, así sabe cuándo hay lugar.
 */

const ZONA = "America/Montevideo";

function hora(iso: string) {
  return new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(iso));
}

function diaCorto(iso: string) {
  return new Intl.DateTimeFormat("es-UY", { weekday: "short", day: "numeric", timeZone: ZONA }).format(new Date(iso)).replace(".", "");
}

function mismoDia(a: string, b: string) {
  const f = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
  return f(a) === f(b);
}

/* «23:00» o «mié 18, 03:00» si no es hoy. */
export function cuando(iso: string, ahora: string) {
  return mismoDia(iso, ahora) ? hora(iso) : `${diaCorto(iso)}, ${hora(iso)}`;
}

function duracion(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/* ISO → valor de <input type="datetime-local"> (hora de la compu). */
function aLocal(iso: string) {
  if (!iso) return "";
  const fecha = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

type Entrada = { pedido: string; duracionMin: number; inicio: string; nota: string };

export default function ColaImpresion() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_cola_listar", {});
  const avisar = useAvisos();
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<ItemColaImpresion | null>(null);
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [inicio, setInicio] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date().toISOString());

  // La barra de avance se mueve sola (sin volver a leer la planilla).
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date().toISOString()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const cola = datos?.cola ?? [];
  const candidatos = datos?.candidatos ?? [];

  async function guardar(lista: Entrada[], exito: string) {
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_cola_guardar", { items: lista });
      setDatos(respuesta);
      avisar(exito);
      return true;
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar la cola.", "error");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  const base = (): Entrada[] =>
    cola.map((item) => ({ pedido: item.pedido, duracionMin: item.duracionMin, inicio: item.inicioFijo, nota: item.nota }));

  function mover(indice: number, paso: number) {
    const lista = base();
    const destino = indice + paso;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    void guardar(lista, "Orden guardado");
  }

  function quitar(pedido: string) {
    void guardar(base().filter((item) => item.pedido !== pedido), `${pedido} salió de la cola`);
  }

  function empezoAhora(pedido: string) {
    const lista = base().map((item) => (item.pedido === pedido ? { ...item, inicio: new Date().toISOString() } : item));
    void guardar(lista, `${pedido}: empezó a imprimir`);
  }

  function agregar(pedido: string, duracionMin: number) {
    setAgregando(false);
    void guardar([...base(), { pedido, duracionMin: duracionMin || 60, inicio: "", nota: "" }], `${pedido} sumado a la cola`);
  }

  function abrirEdicion(item: ItemColaImpresion) {
    setEditando(item);
    setHoras(String(Math.floor(item.duracionMin / 60)));
    setMinutos(String(item.duracionMin % 60));
    setInicio(aLocal(item.inicioFijo));
  }

  async function guardarEdicion() {
    if (!editando) return;
    const total = (Number(horas) || 0) * 60 + (Number(minutos) || 0);
    const lista = base().map((item) =>
      item.pedido === editando.pedido
        ? { ...item, duracionMin: total, inicio: inicio ? new Date(inicio).toISOString() : "" }
        : item
    );
    if (await guardar(lista, `${editando.pedido} actualizado`)) setEditando(null);
  }

  const pendientes = cola.filter((item) => item.fin > ahora);
  const libreDesde = pendientes.length ? pendientes[pendientes.length - 1].fin : "";

  return (
    <section className="rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
          <Printer size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Impresora</p>
          <p className="truncate text-[11px] font-semibold text-[var(--text-muted)]">
            {cargando && !datos
              ? "Cargando…"
              : libreDesde
              ? `Ocupada hasta ${cuando(libreDesde, ahora)}`
              : "Libre ahora"}
          </p>
        </div>
      </div>

      {cola.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {cola.map((item, indice) => {
            const terminada = item.fin <= ahora;
            const imprimiendo = !terminada && Boolean(item.inicioFijo) && item.inicio <= ahora;
            const avance = imprimiendo
              ? Math.min(100, Math.max(0, ((Date.parse(ahora) - Date.parse(item.inicio)) / (Date.parse(item.fin) - Date.parse(item.inicio))) * 100))
              : terminada ? 100 : 0;
            return (
              <li
                key={item.pedido}
                className={`rounded-xl border px-2.5 py-2 ${
                  imprimiendo
                    ? "border-orange-500/50 bg-orange-500/10"
                    : terminada
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-[var(--kint-panel-border)]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Link href={`/admin/pedidos/${item.pedido}`} className="text-xs font-black hover:underline">
                    {item.pedido.replace(/^KNT-0*/, "KNT-")}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-muted)]">{item.nombre}</span>
                  <button type="button" aria-label="Subir" disabled={guardando || indice === 0} onClick={() => mover(indice, -1)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-25">
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" aria-label="Bajar" disabled={guardando || indice === cola.length - 1} onClick={() => mover(indice, 1)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-25">
                    <ArrowDown size={13} />
                  </button>
                  <button type="button" aria-label="Editar" disabled={guardando} onClick={() => abrirEdicion(item)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    <Pencil size={13} />
                  </button>
                  <button type="button" aria-label="Sacar de la cola" disabled={guardando} onClick={() => quitar(item.pedido)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-red-600">
                    <X size={13} />
                  </button>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums">
                  <span className="font-bold">{cuando(item.inicio, ahora)}</span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="font-bold">{cuando(item.fin, ahora)}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">{duracion(item.duracionMin)}</span>
                </p>
                {(imprimiendo || terminada) && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--border-color)]">
                    <div className={`h-full rounded-full ${terminada ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${avance}%` }} />
                  </div>
                )}
                {terminada && <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Terminó: sacalo de la cola</p>}
                {!item.inicioFijo && indice === cola.findIndex((otro) => !otro.inicioFijo) && !cola.slice(0, indice).some((otro) => otro.fin > ahora) && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => empezoAhora(item.pedido)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-black text-white hover:bg-orange-600"
                  >
                    <Play size={11} />
                    Empezó ahora
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {agregando ? (
        <div className="mt-2.5 space-y-1">
          {candidatos.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">No hay pedidos para sumar (presupuestados, pagos o en impresión).</p>
          ) : (
            candidatos.slice(0, 12).map((candidato) => (
              <button
                key={candidato.pedido}
                type="button"
                disabled={guardando}
                onClick={() => agregar(candidato.pedido, candidato.duracionMin)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-[var(--kint-selected-bg)]"
              >
                <span className="font-black">{candidato.pedido.replace(/^KNT-0*/, "KNT-")}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--text-muted)]">{candidato.nombre}</span>
                <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                  {candidato.duracionMin ? duracion(candidato.duracionMin) : "sin tiempo"}
                </span>
              </button>
            ))
          )}
          <button type="button" onClick={() => setAgregando(false)} className="text-[11px] font-bold text-[var(--text-muted)]">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={guardando || !datos}
          onClick={() => setAgregando(true)}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--kint-panel-border)] py-2 text-xs font-bold text-[var(--text-muted)] transition hover:border-orange-500 hover:text-[var(--text-main)]"
        >
          <Plus size={14} />
          Sumar pedido a la cola
        </button>
      )}

      <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        En /cotizar ven estos horarios (sin nombres), así saben cuándo hay lugar.
      </p>

      <Hoja
        abierta={Boolean(editando)}
        onCerrar={() => !guardando && setEditando(null)}
        titulo={editando ? `${editando.pedido} en la impresora` : ""}
        pie={
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Boton>
            <Boton variante="principal" onClick={guardarEdicion} cargando={guardando}>Guardar</Boton>
          </div>
        }
      >
        <p className="mb-1.5 text-xs font-bold text-[var(--text-muted)]">Cuánto tarda</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <input className={`${claseInput} h-12 pr-8`} inputMode="numeric" value={horas} onChange={(e) => setHoras(e.target.value.replace(/\D/g, ""))} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">h</span>
          </label>
          <label className="relative">
            <input className={`${claseInput} h-12 pr-12`} inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value.replace(/\D/g, ""))} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">min</span>
          </label>
        </div>
        {editando?.tiempoPresupuesto && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">En el presupuesto: {editando.tiempoPresupuesto}</p>
        )}

        <p className="mb-1.5 mt-4 text-xs font-bold text-[var(--text-muted)]">Cuándo empezó (o empieza)</p>
        <input type="datetime-local" className={`${claseInput} h-12`} value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setInicio(aLocal(new Date().toISOString()))} className="rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-700 dark:text-orange-300">
            Ahora
          </button>
          <button type="button" onClick={() => setInicio("")} className="rounded-lg bg-[var(--kint-selected-bg)] px-3 py-1.5 text-xs font-bold">
            Cuando termine el anterior
          </button>
        </div>
      </Hoja>
    </section>
  );
}
