"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Play, Plus, Printer, X } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ItemColaImpresion } from "@/lib/admin-tipos";
import { Boton, Hoja, useAvisos } from "@/components/admin/ui";

/*
 * Cola de la impresora (al costado de «Todos los pedidos»): qué imprime
 * ahora, a qué hora termina y qué sigue. Se encadena sola: cuando uno
 * termina, el siguiente arranca. Pasar un pedido a «En impresión» lo pone
 * a imprimir acá; «Terminado» lo saca. La gente ve los horarios en /cotizar.
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

/* «5 h 5 min», «5h05», «305» → minutos. */
function minutosDe(texto: string) {
  const t = texto.toLowerCase().replace(",", ".");
  const h = /(\d+(?:\.\d+)?)\s*h/.exec(t);
  const m = /(\d+)\s*m/.exec(t);
  if (h || m) return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
  return Math.round(Number(t) || 0);
}

type Entrada = { pedido: string; duracionMin: number; inicio: string; nota: string };
type Modo = "empezo" | "termina" | "despues";

export default function ColaImpresion() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_cola_listar", {});
  const avisar = useAvisos();
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<ItemColaImpresion | null>(null);
  const [minutos, setMinutos] = useState(60);
  const [modo, setModo] = useState<Modo>("empezo");
  const [momento, setMomento] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date().toISOString());

  // La barra de avance se mueve sola (sin volver a leer la planilla).
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date().toISOString()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const cola = datos?.cola ?? [];
  const candidatos = datos?.candidatos ?? [];
  // Estado con el reloj de ahora. Mientras nadie arrancó la cadena (ningún horario cargado
  // arriba), todo espera; después, cada uno imprime entre su inicio y su fin.
  const anclado = (indice: number) => cola.slice(0, indice + 1).some((otro) => otro.inicioFijo);
  const estadoDe = (item: ItemColaImpresion) => {
    const indice = cola.indexOf(item);
    if (!anclado(indice)) return "en cola";
    if (item.fin <= ahora) return "terminada";
    return item.inicio <= ahora ? "imprimiendo" : "en cola";
  };

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
    void guardar(lista, `${pedido}: la máquina arrancó`);
  }

  /* Terminó (antes o justo): sale de la cola y el siguiente arranca ahora. */
  function termino(indice: number) {
    const lista = base();
    const [sale] = lista.splice(indice, 1);
    if (lista[indice] && !lista[indice].inicio) lista[indice] = { ...lista[indice], inicio: new Date().toISOString() };
    void guardar(lista, lista[indice] ? `${sale.pedido} terminó: arrancó ${lista[indice].pedido}` : `${sale.pedido} terminó`);
  }

  function agregar(pedido: string, duracionMin: number) {
    setAgregando(false);
    void guardar([...base(), { pedido, duracionMin: duracionMin || 60, inicio: "", nota: "" }], `${pedido} sumado a la cola`);
  }

  function abrirEdicion(item: ItemColaImpresion) {
    setEditando(item);
    setMinutos(item.duracionMin);
    setModo(item.inicioFijo ? "empezo" : "despues");
    setMomento(aLocal(item.inicioFijo || item.inicio));
  }

  // Vista previa de la edición: cuándo empieza y termina.
  const previa = (() => {
    if (!editando) return null;
    const indice = cola.findIndex((item) => item.pedido === editando.pedido);
    const anteriorFin = indice > 0 ? cola[indice - 1].fin : "";
    let inicio = "";
    if (modo === "empezo" && momento) inicio = new Date(momento).toISOString();
    if (modo === "termina" && momento) inicio = new Date(new Date(momento).getTime() - minutos * 60000).toISOString();
    if (modo === "despues") inicio = anteriorFin && anteriorFin > ahora ? anteriorFin : ahora;
    if (!inicio || Number.isNaN(Date.parse(inicio))) return null;
    return { inicio, fin: new Date(Date.parse(inicio) + minutos * 60000).toISOString() };
  })();

  async function guardarEdicion() {
    if (!editando) return;
    if (minutos < 1) {
      avisar("Poné cuánto tarda.", "error");
      return;
    }
    const inicio = modo === "despues" ? "" : previa?.inicio || "";
    const lista = base().map((item) => (item.pedido === editando.pedido ? { ...item, duracionMin: minutos, inicio } : item));
    if (await guardar(lista, `${editando.pedido} actualizado`)) setEditando(null);
  }

  const pendientes = cola.filter((item) => estadoDe(item) !== "terminada");
  const libreDesde = pendientes.length ? pendientes[pendientes.length - 1].fin : "";
  const presupuesto = editando ? minutosDe(editando.tiempoPresupuesto || "") : 0;

  return (
    <section className="rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
          <Printer size={16} />
          {cola.some((item) => estadoDe(item) === "imprimiendo") && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-[var(--kint-panel)]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Impresora</p>
          <p className="truncate text-[11px] font-semibold text-[var(--text-muted)]">
            {cargando && !datos ? "Cargando…" : libreDesde ? `Ocupada hasta ${cuando(libreDesde, ahora)}` : "Libre ahora"}
          </p>
        </div>
      </div>

      {cola.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {cola.map((item, indice) => {
            const estado = estadoDe(item);
            const imprimiendo = estado === "imprimiendo";
            const terminada = estado === "terminada";
            const avance = imprimiendo
              ? Math.min(100, Math.max(0, ((Date.parse(ahora) - Date.parse(item.inicio)) / (Date.parse(item.fin) - Date.parse(item.inicio))) * 100))
              : terminada
              ? 100
              : 0;
            const primeraEnEspera = !imprimiendo && !terminada && !cola.slice(0, indice).some((otro) => estadoDe(otro) !== "terminada");
            return (
              <li
                key={item.pedido}
                className={`rounded-xl border px-2.5 py-2 ${
                  imprimiendo ? "border-orange-500/50 bg-orange-500/10" : terminada ? "border-emerald-500/40 bg-emerald-500/10" : "border-[var(--kint-panel-border)]"
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
                  <button type="button" aria-label="Editar horario" disabled={guardando} onClick={() => abrirEdicion(item)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)]">
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
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {imprimiendo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:text-orange-300">
                      Imprimiendo · faltan {duracion(Math.max(1, Math.round((Date.parse(item.fin) - Date.parse(ahora)) / 60000)))}
                    </span>
                  )}
                  {(imprimiendo || terminada) && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => termino(indice)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black text-white hover:bg-emerald-700"
                    >
                      <Check size={11} />
                      Terminó{cola[indice + 1] ? ": arranca el siguiente" : ""}
                    </button>
                  )}
                  {primeraEnEspera && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => empezoAhora(item.pedido)}
                      className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-black text-white hover:bg-orange-600"
                    >
                      <Play size={11} />
                      Empezó ahora
                    </button>
                  )}
                </div>
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
        Se encadena sola. «En impresión» en un pedido la arranca; «Terminado» la saca. En /cotizar ven estos horarios.
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
        {editando && (
          <div className="space-y-5">
            {/* Cuánto tarda */}
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Cuánto tarda</p>
              <div className="flex items-center gap-2">
                {[
                  { campo: "h" as const, max: 99 },
                  { campo: "min" as const, max: 59 },
                ].map(({ campo, max }) => {
                  const valor = campo === "h" ? Math.floor(minutos / 60) : minutos % 60;
                  return (
                    <div key={campo} className="flex flex-1 items-center rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)]">
                      <button type="button" aria-label={`Menos ${campo}`} onClick={() => setMinutos((m) => Math.max(0, m - (campo === "h" ? 60 : 5)))} className="h-12 w-10 text-lg font-black text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        −
                      </button>
                      <input
                        inputMode="numeric"
                        value={valor}
                        onChange={(evento) => {
                          const numero = Math.min(max, Math.max(0, Number(evento.target.value.replace(/\D/g, "")) || 0));
                          setMinutos((m) => (campo === "h" ? numero * 60 + (m % 60) : Math.floor(m / 60) * 60 + numero));
                        }}
                        className="h-12 w-full min-w-0 bg-transparent text-center text-xl font-black tabular-nums outline-none"
                        aria-label={campo === "h" ? "Horas" : "Minutos"}
                      />
                      <span className="pr-2 text-xs font-bold text-[var(--text-muted)]">{campo}</span>
                      <button type="button" aria-label={`Más ${campo}`} onClick={() => setMinutos((m) => m + (campo === "h" ? 60 : 5))} className="h-12 w-10 text-lg font-black text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presupuesto > 0 && presupuesto !== minutos && (
                  <button type="button" onClick={() => setMinutos(presupuesto)} className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-black text-orange-700 dark:text-orange-300">
                    Del presupuesto: {duracion(presupuesto)}
                  </button>
                )}
                {[15, 30, 60].map((extra) => (
                  <button key={extra} type="button" onClick={() => setMinutos((m) => m + extra)} className="rounded-full border border-[var(--kint-panel-border)] px-2.5 py-1 text-[11px] font-bold">
                    +{extra} min
                  </button>
                ))}
              </div>
            </div>

            {/* Cuándo */}
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Horario</p>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--kint-panel-soft)] p-1">
                {(
                  [
                    ["empezo", "Empezó a las"],
                    ["termina", "Termina a las"],
                    ["despues", "Después del anterior"],
                  ] as [Modo, string][]
                ).map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => {
                      setModo(valor);
                      if (valor === "termina" && previa) setMomento(aLocal(previa.fin));
                      if (valor === "empezo" && previa) setMomento(aLocal(previa.inicio));
                    }}
                    className={`rounded-xl px-2 py-2 text-[11px] font-black leading-tight transition ${
                      modo === valor ? "bg-[var(--kint-panel)] text-[var(--text-main)] shadow" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              {modo !== "despues" ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="datetime-local"
                    value={momento}
                    onChange={(evento) => setMomento(evento.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-3 text-sm font-bold tabular-nums dark:[color-scheme:dark]"
                  />
                  <button type="button" onClick={() => setMomento(aLocal(new Date().toISOString()))} className="h-12 shrink-0 rounded-2xl bg-orange-500 px-4 text-xs font-black text-white">
                    Ahora
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Arranca solo cuando termina el de arriba.</p>
              )}
            </div>

            {/* Cómo queda */}
            {previa && (
              <div className="flex items-center gap-3 rounded-2xl bg-orange-500/10 px-4 py-3 ring-1 ring-orange-500/25">
                <Printer size={18} className="shrink-0 text-orange-600 dark:text-orange-400" />
                <div className="min-w-0 flex-1 tabular-nums">
                  <p className="text-lg font-black leading-tight">
                    {cuando(previa.inicio, ahora)} <span className="text-[var(--text-muted)]">→</span> {cuando(previa.fin, ahora)}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                    {duracion(minutos)} · los de abajo se corren solos
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Hoja>
    </section>
  );
}
