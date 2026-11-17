"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

/*
 * /cotizar: hasta cuándo está ocupada la impresora. Sale de la cola que
 * arma el dueño en el panel (número de pedido y horarios, sin nombres).
 */

type Bloque = { pedido?: string; inicio: string; fin: string; imprimiendo: boolean };
type Agenda = { ahora: string; bloques: Bloque[]; libreDesde: string };

const ZONA = "America/Montevideo";

function dia(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA }).format(new Date(iso));
}

/* «20:00», «mañana 03:00» o «jueves 19, 09:00». */
function cuando(iso: string, ahora: string) {
  const hoy = dia(ahora);
  const manana = dia(new Date(Date.parse(ahora) + 86400000).toISOString());
  if (dia(iso) === hoy) return `hoy ${hora(iso)}`;
  if (dia(iso) === manana) return `mañana ${hora(iso)}`;
  const nombre = new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", timeZone: ZONA }).format(new Date(iso));
  return `${nombre}, ${hora(iso)}`;
}

export default function AgendaImpresora() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/cola-impresion")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (activo && data?.ok) setAgenda({ ahora: data.ahora, bloques: data.bloques || [], libreDesde: data.libreDesde || "" });
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  if (!agenda) return null;

  const ahora = agenda.ahora;
  const bloques = agenda.bloques.filter((bloque) => bloque.fin > ahora);

  if (!bloques.length) {
    return (
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        La impresora está libre ahora
      </p>
    );
  }

  const desde = Date.parse(ahora);
  const hasta = Date.parse(bloques[bloques.length - 1].fin);
  const largo = Math.max(1, hasta - desde);
  const posicion = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - desde) / largo) * 100));

  return (
    <div className="mb-3 min-w-0 overflow-hidden rounded-2xl border border-orange-500/30 bg-orange-500/[0.07] p-4">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
          <Printer size={16} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-[var(--kint-panel)]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--text-main)]">La impresora está a full</p>
          <p className="text-xs text-[var(--text-muted)]">
            {bloques.length === 1 ? "Hay 1 impresión" : `Hay ${bloques.length} impresiones`} antes de la tuya.
          </p>
        </div>
      </div>

      {/* Línea de tiempo: de ahora hasta que queda libre. */}
      <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-[var(--border-color)]">
        {bloques.map((bloque, indice) => (
          <div
            key={bloque.inicio + indice}
            className={`absolute inset-y-0 border-r-2 border-[var(--kint-panel)] ${
              bloque.imprimiendo
                ? "bg-[repeating-linear-gradient(135deg,#f97316_0_6px,#fb923c_6px_12px)]"
                : indice % 2
                ? "bg-orange-400/70"
                : "bg-orange-500/80"
            }`}
            style={{ left: `${posicion(bloque.inicio)}%`, width: `${posicion(bloque.fin) - posicion(bloque.inicio)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
        <span>Ahora</span>
        <span>Libre</span>
      </div>

      <ol className="mt-3 space-y-1">
        {bloques.map((bloque, indice) => (
          <li key={`${bloque.fin}-${indice}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-main)]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${bloque.imprimiendo ? "bg-orange-500" : "bg-orange-400/70"}`} />
            <span className="font-black">{bloque.pedido || `Impresión ${indice + 1}`}</span>
            {bloque.imprimiendo && (
              <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                Imprimiendo
              </span>
            )}
            <span className="ml-auto text-right text-[11px] tabular-nums text-[var(--text-muted)]">
              {bloque.imprimiendo ? "termina" : cuando(bloque.inicio, ahora)} → <span className="font-bold text-[var(--text-main)]">{cuando(bloque.fin, ahora)}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 rounded-xl bg-[var(--kint-panel)] px-3 py-2 text-sm text-[var(--text-main)]">
        Lo más pronto que puede empezar tu maqueta: <span className="font-black">{cuando(agenda.libreDesde || bloques[bloques.length - 1].fin, ahora)}</span>.
      </p>
    </div>
  );
}
