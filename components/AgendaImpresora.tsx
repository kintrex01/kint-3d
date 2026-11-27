"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/*
 * /cotizar: hasta cuándo está ocupada la impresora. Sale de la cola que
 * arma el dueño en el panel (número de pedido y horarios, sin nombres).
 * Un panel «en vivo»: qué imprime, cuánto falta para que quede libre
 * (se actualiza solo cada minuto), la cola y desde cuándo puede empezar
 * la maqueta del cliente.
 */

type Bloque = { pedido?: string; inicio: string; fin: string; imprimiendo: boolean };
type PorHacer = { pagadosMin: number; pagados: number; cotizadosMin: number; cotizados: number; porCotizar?: number };
type Agenda = { ahora: string; bloques: Bloque[]; libreDesde: string; oculta?: boolean; porHacer?: PorHacer | null };

/* Para los números chicos: «3h 45m», «12h», «45m». */
function horasCorto(minutos: number) {
  const total = Math.max(1, Math.round(minutos));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h >= 10 || !m ? `${Math.round(total / 60)}h` : `${h}h ${m}m`;
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
  const ocupada = bloques.length > 0;

  const libre = !ocupada
    ? ""
    : agenda.libreDesde && Date.parse(agenda.libreDesde) > ahoraMs
      ? agenda.libreDesde
      : bloques[bloques.length - 1].fin;
  const hasta = libre ? Date.parse(libre) : ahoraMs;
  const largo = Math.max(1, hasta - ahoraMs);
  const posicion = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - ahoraMs) / largo) * 100));
  const actual = bloques.find((bloque) => bloque.imprimiendo && Date.parse(bloque.inicio) <= ahoraMs);
  const enCola = bloques.length - (actual ? 1 : 0);

  const porHacer = agenda.porHacer;
  const totalPorHacer = (porHacer?.pagadosMin || 0) + (porHacer?.cotizadosMin || 0);
  const pedidos = (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`;

  const etiqueta = "text-[10px] font-semibold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-[var(--text-muted)]";

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--kint-panel)]">
      {/* Estado: qué imprime y cuándo queda libre */}
      <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {ocupada && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-50 motion-reduce:animate-none" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${ocupada ? "bg-orange-500" : "bg-emerald-500"}`} />
            </span>
            <p className={etiqueta}>
              <span className="hidden sm:inline">Impresora · </span>En vivo
            </p>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug text-[var(--text-main)]">
            {!ocupada ? "Disponible ahora" : actual ? `Imprimiendo ${actual.pedido || "un pedido"}` : "Por arrancar"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {!ocupada
              ? "No hay nada imprimiéndose en este momento"
              : enCola > 0
                ? `${enCola} ${enCola === 1 ? "impresión espera" : "impresiones esperan"} en la cola`
                : "Sin cola detrás"}
          </p>
        </div>
        {ocupada && (
          <div className="shrink-0 text-right">
            <p className={etiqueta}>Libre en</p>
            <p className="mt-1 text-xl font-semibold leading-none tabular-nums text-[var(--text-main)] sm:text-2xl">{falta(hasta - ahoraMs)}</p>
            <p className="mt-1 text-xs tabular-nums text-[var(--text-muted)]">{cuando(libre, ahoraMs)}</p>
          </div>
        )}
      </div>

      {/* Línea de tiempo: de ahora hasta que queda libre */}
      {ocupada && (
        <div className="px-4 pb-4 sm:px-5">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
            {bloques.map((bloque, indice) => (
              <span
                key={bloque.inicio + indice}
                className={`absolute inset-y-0 ${indice > 0 ? "border-l-2 border-[var(--kint-panel)]" : ""} ${
                  bloque === actual ? "bg-orange-500" : "bg-[var(--text-muted)]/45"
                }`}
                style={{ left: `${posicion(bloque.inicio)}%`, width: `${posicion(bloque.fin) - posicion(bloque.inicio)}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-[var(--text-muted)]">
            <span>Ahora</span>
            <span>{hora(libre)}</span>
          </div>
        </div>
      )}

      {/* La cola */}
      {ocupada && (
        <ol className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {bloques.map((bloque, indice) => {
            const vivo = bloque === actual;
            return (
              <li key={`${bloque.fin}-${indice}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] sm:px-5">
                <span className="w-4 shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{indice + 1}</span>
                <span className="whitespace-nowrap font-medium text-[var(--text-main)]">{bloque.pedido || `Impresión ${indice + 1}`}</span>
                {vivo && (
                  <span className="rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                    Imprimiendo
                  </span>
                )}
                <span className="ml-auto whitespace-nowrap text-right text-xs tabular-nums text-[var(--text-muted)]">
                  {vivo ? <span className="hidden sm:inline">termina </span> : <span className="hidden sm:inline">{`${cuando(bloque.inicio, ahoraMs)} → `}</span>}
                  <span className="text-[var(--text-main)]">{cuando(bloque.fin, ahoraMs)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Horas de impresión que faltan hacer (lo ya impreso no cuenta) */}
      {porHacer && totalPorHacer > 0 && (
        <dl className="grid grid-cols-3 divide-x divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {[
            { titulo: "Por imprimir", corto: "Total", valor: totalPorHacer, detalle: pedidos(porHacer.pagados + porHacer.cotizados) },
            { titulo: "Ya pagadas", corto: "Pagadas", valor: porHacer.pagadosMin, detalle: pedidos(porHacer.pagados) },
            { titulo: "Cotizadas", corto: "Cotizadas", valor: porHacer.cotizadosMin, detalle: pedidos(porHacer.cotizados) },
          ].map((dato) => (
            <div key={dato.titulo} className="min-w-0 px-2.5 py-3 sm:px-5">
              <dt className={`${etiqueta} whitespace-nowrap`}>
                <span className="sm:hidden">{dato.corto}</span>
                <span className="hidden sm:inline">{dato.titulo}</span>
              </dt>
              <dd className="mt-1 whitespace-nowrap text-[15px] font-semibold tabular-nums text-[var(--text-main)] sm:text-lg">{dato.valor > 0 ? horasCorto(dato.valor) : "—"}</dd>
              <dd className="truncate text-[11px] text-[var(--text-muted)]">{dato.valor > 0 ? dato.detalle : "Ninguno"}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Pedidos que esperan presupuesto (Recibido): todavía no tienen horas */}
      {(porHacer?.porCotizar ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className={etiqueta}>En cola para cotizar</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Esperan su presupuesto, antes que el tuyo</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-lg font-semibold tabular-nums text-[var(--text-main)] sm:text-xl">{porHacer!.porCotizar}</span>
            <span className="ml-1 text-xs text-[var(--text-muted)]">{porHacer!.porCotizar === 1 ? "pedido" : "pedidos"}</span>
          </p>
        </div>
      )}

      {/* Desde cuándo puede empezar la suya */}
      <div className="flex items-center gap-2.5 border-t border-[var(--border-color)] bg-emerald-500/[0.06] px-4 py-3 sm:px-5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check size={12} strokeWidth={3} />
        </span>
        <p className="text-sm text-[var(--text-main)]">
          {ocupada ? (
            <>
              Tu maqueta puede empezar desde <span className="font-semibold">{cuando(libre, ahoraMs)}</span>
            </>
          ) : (
            <>
              Tu maqueta puede <span className="font-semibold">empezar ya</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
