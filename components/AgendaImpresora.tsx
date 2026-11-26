"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";

/*
 * /cotizar: hasta cuándo está ocupada la impresora. Sale de la cola que
 * arma el dueño en el panel (número de pedido y horarios, sin nombres).
 * Un panel «en vivo»: qué imprime, cuánto falta para que quede libre
 * (se actualiza solo cada minuto), la cola y desde cuándo puede empezar
 * la maqueta del cliente.
 */

type Bloque = { pedido?: string; inicio: string; fin: string; imprimiendo: boolean };
type PorHacer = { pagadosMin: number; pagados: number; cotizadosMin: number; cotizados: number };
type Agenda = { ahora: string; bloques: Bloque[]; libreDesde: string; oculta?: boolean; porHacer?: PorHacer | null };

/* «13 h», «1 h 30 min», «45 min». */
function horas(minutos: number) {
  if (minutos < 60) return `${Math.max(1, Math.round(minutos))} min`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return h >= 10 || !m ? `${Math.round(minutos / 60)} h` : `${h} h ${m} min`;
}

/* Debajo de la barra: cuántas horas de impresión faltan hacer (pagadas + cotizadas). */
function HorasPorHacer({ datos }: { datos?: PorHacer | null }) {
  const total = (datos?.pagadosMin || 0) + (datos?.cotizadosMin || 0);
  if (!datos || total <= 0) return null;
  const parte = (minutos: number) => `${(minutos / total) * 100}%`;
  const pedidos = (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`;
  return (
    <div className="relative mt-3 rounded-2xl bg-[var(--kint-panel)]/70 px-3.5 py-2.5 ring-1 ring-[var(--border-color)]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Impresiones por hacer</p>
        <p className="text-lg font-black tabular-nums text-[var(--text-main)]">{horas(total)}</p>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[var(--border-color)]/70">
        <span className="bg-orange-500" style={{ width: parte(datos.pagadosMin) }} />
        <span className="bg-orange-300/80 dark:bg-orange-300/50" style={{ width: parte(datos.cotizadosMin) }} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
        {datos.pagadosMin > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <b className="text-[var(--text-main)]">{horas(datos.pagadosMin)}</b> ya pagadas ({pedidos(datos.pagados)})
          </span>
        )}
        {datos.cotizadosMin > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-300" />
            <b className="text-[var(--text-main)]">{horas(datos.cotizadosMin)}</b> cotizadas, esperando el pago ({pedidos(datos.cotizados)})
          </span>
        )}
      </p>
    </div>
  );
}

const ZONA = "America/Montevideo";

function dia(ms: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(ms));
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(iso));
}

/* «hoy 16:19», «mañana 03:00» o «jueves 19, 09:00». */
function cuando(iso: string, ahoraMs: number) {
  const ms = Date.parse(iso);
  if (dia(ms) === dia(ahoraMs)) return `hoy ${hora(iso)}`;
  if (dia(ms) === dia(ahoraMs + 86400000)) return `mañana ${hora(iso)}`;
  const nombre = new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", timeZone: ZONA }).format(new Date(iso));
  return `${nombre}, ${hora(iso)}`;
}

/* «1 h 23 min», «45 min», «2 días 3 h». */
function falta(ms: number) {
  const minutos = Math.max(1, Math.round(ms / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h${minutos % 60 ? ` ${minutos % 60} min` : ""}`;
  const dias = Math.floor(horas / 24);
  return `${dias} ${dias === 1 ? "día" : "días"}${horas % 24 ? ` ${horas % 24} h` : ""}`;
}

export default function AgendaImpresora() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  // Diferencia entre el reloj del servidor y el de la compu, y un tic por minuto.
  const [desfase, setDesfase] = useState(0);
  const [, setTic] = useState(0);

  useEffect(() => {
    let activo = true;
    fetch("/api/cola-impresion")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !data?.ok) return;
        setDesfase(Date.parse(data.ahora) - Date.now());
        setAgenda({ ahora: data.ahora, bloques: data.bloques || [], libreDesde: data.libreDesde || "", oculta: Boolean(data.oculta), porHacer: data.porHacer || null });
      })
      .catch(() => {});
    const reloj = window.setInterval(() => setTic((n) => n + 1), 60000);
    return () => {
      activo = false;
      window.clearInterval(reloj);
    };
  }, []);

  if (!agenda || agenda.oculta) return null;

  // eslint-disable-next-line react-hooks/purity -- el reloj avanza con el tic de cada minuto
  const ahoraMs = Date.now() + desfase;
  const bloques = agenda.bloques.filter((bloque) => Date.parse(bloque.fin) > ahoraMs);

  if (!bloques.length) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-bold text-[var(--text-main)]">
            La impresora está libre: <span className="text-emerald-600 dark:text-emerald-400">tu maqueta puede empezar ya</span>
          </p>
        </div>
        <HorasPorHacer datos={agenda.porHacer} />
      </div>
    );
  }

  const libre = agenda.libreDesde && Date.parse(agenda.libreDesde) > ahoraMs ? agenda.libreDesde : bloques[bloques.length - 1].fin;
  const desde = ahoraMs;
  const hasta = Date.parse(libre);
  const largo = Math.max(1, hasta - desde);
  const posicion = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - desde) / largo) * 100));
  const actual = bloques.find((bloque) => bloque.imprimiendo && Date.parse(bloque.inicio) <= ahoraMs);
  const enCola = bloques.length - (actual ? 1 : 0);

  return (
    <div className="relative mb-3 overflow-hidden rounded-3xl border border-orange-500/25 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(249,115,22,0.04)_45%,transparent_80%)] p-4 sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl" />

      {/* Encabezado: qué imprime y cuánto falta */}
      <div className="relative flex flex-wrap items-start gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fb923c,#ea580c)] text-white shadow-[0_10px_24px_-8px_rgba(234,88,12,0.7)]">
          <Printer size={20} />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-[var(--kint-panel)]" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600 sm:tracking-[0.22em] dark:text-orange-400">Impresora · en vivo</p>
          <p className="mt-0.5 text-base font-black leading-tight text-[var(--text-main)]">
            {actual ? `Imprimiendo ${actual.pedido || "un pedido"}` : "Por arrancar"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {enCola > 0 ? `${enCola} ${enCola === 1 ? "pedido espera" : "pedidos esperan"} en la cola` : "Sin cola detrás"}
          </p>
        </div>
        {/* En el celular va en su propia franja; en la compu, a la derecha. */}
        <div className="flex w-full items-baseline justify-between gap-2 rounded-2xl bg-[var(--kint-panel)]/70 px-3 py-2 ring-1 ring-orange-500/20 sm:block sm:w-auto sm:shrink-0 sm:bg-transparent sm:p-0 sm:text-right sm:ring-0">
          <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Libre en</p>
          <p className="whitespace-nowrap text-lg font-black leading-tight tabular-nums text-[var(--text-main)] sm:text-2xl">{falta(hasta - ahoraMs)}</p>
          <p className="whitespace-nowrap text-[11px] font-bold text-orange-600 dark:text-orange-400">{cuando(libre, ahoraMs)}</p>
        </div>
      </div>

      {/* Línea de tiempo: de ahora hasta que queda libre */}
      <div className="relative mt-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-[var(--border-color)]/70">
          {bloques.map((bloque, indice) => (
            <span
              key={bloque.inicio + indice}
              className={`absolute inset-y-0 ${indice > 0 ? "border-l-2 border-[var(--kint-panel)]" : ""} ${
                bloque === actual ? "kint-rayas-vivas" : indice % 2 ? "bg-orange-400/60" : "bg-orange-500/75"
              }`}
              style={{ left: `${posicion(bloque.inicio)}%`, width: `${posicion(bloque.fin) - posicion(bloque.inicio)}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Ahora
          </span>
          <span>Libre {hora(libre)}</span>
        </div>
      </div>

      <HorasPorHacer datos={agenda.porHacer} />

      {/* La cola */}
      <ol className="relative mt-3 space-y-1.5">
        {bloques.map((bloque, indice) => {
          const vivo = bloque === actual;
          return (
            <li
              key={`${bloque.fin}-${indice}`}
              className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl px-3 py-2 text-xs ${
                vivo ? "bg-orange-500/12 ring-1 ring-orange-500/30" : "bg-[var(--kint-panel)]/70 ring-1 ring-[var(--border-color)]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  vivo ? "bg-orange-500 text-white" : "bg-[var(--border-color)] text-[var(--text-muted)]"
                }`}
              >
                {indice + 1}
              </span>
              <span className="font-black text-[var(--text-main)]">{bloque.pedido || `Impresión ${indice + 1}`}</span>
              {vivo && (
                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                  Imprimiendo
                </span>
              )}
              <span className="ml-auto text-right tabular-nums text-[var(--text-muted)]">
                {vivo ? "termina " : `${cuando(bloque.inicio, ahoraMs)} → `}
                <span className="font-bold text-[var(--text-main)]">{cuando(bloque.fin, ahoraMs)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Desde cuándo puede empezar la suya */}
      <div className="relative mt-3 flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 ring-1 ring-emerald-500/25">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-[var(--text-main)]">
          Tu maqueta puede empezar desde <span className="font-black">{cuando(libre, ahoraMs)}</span>
        </p>
      </div>
    </div>
  );
}
