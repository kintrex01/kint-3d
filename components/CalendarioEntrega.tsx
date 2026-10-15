"use client";

import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

/*
 * Calendario para elegir la fecha de entrega.
 *
 * - Rojo, no se puede elegir: días sin entrega que carga el dueño
 *   (hoja "Días sin entrega" o panel de admin).
 * - Gris, se puede elegir: sábados, domingos y feriados (no hay
 *   facultad, la entrega se coordina por WhatsApp).
 *
 * Las fechas se manejan como "yyyy-mm-dd" y en UTC para que la zona
 * horaria del navegador no corra ningún día.
 */

type DiaBloqueado = { fecha: string; motivo: string };
type Feriado = { fecha: string; nombre: string };

type Calendario = {
  desde: string;
  hasta: string;
  bloqueados: DiaBloqueado[];
  feriados: Feriado[];
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const DIAS_LARGOS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function aISO(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function partes(iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return { anio, mes: mes - 1, dia };
}

function diaSemana(iso: string) {
  const { anio, mes, dia } = partes(iso);
  return new Date(Date.UTC(anio, mes, dia)).getUTCDay();
}

export function describirFecha(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const { mes, dia } = partes(iso);
  return `${DIAS_LARGOS[diaSemana(iso)]} ${dia} de ${MESES[mes].toLowerCase()}`;
}

/* Si el calendario no carga, se usa el selector de fecha del navegador. */
function hoyISO() {
  const hoy = new Date();
  return aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

export default function CalendarioEntrega({
  valor,
  onCambiar,
  onBloqueados,
}: {
  valor: string;
  onCambiar: (fecha: string) => void;
  /* Avisa al padre qué días están bloqueados (para validar). */
  onBloqueados?: (fechas: string[]) => void;
}) {
  const [calendario, setCalendario] = useState<Calendario | null>(null);
  const [error, setError] = useState(false);
  const [mesVisible, setMesVisible] = useState<{
    anio: number;
    mes: number;
  } | null>(null);

  useEffect(() => {
    let activo = true;

    fetch("/api/calendario-entregas", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!activo) return;

        if (!data?.ok) {
          setError(true);
          return;
        }

        const nuevo: Calendario = {
          desde: String(data.desde),
          hasta: String(data.hasta),
          bloqueados: Array.isArray(data.bloqueados)
            ? data.bloqueados
            : [],
          feriados: Array.isArray(data.feriados) ? data.feriados : [],
        };

        setCalendario(nuevo);
        onBloqueados?.(nuevo.bloqueados.map((dia) => dia.fecha));
      })
      .catch(() => {
        if (activo) setError(true);
      });

    return () => {
      activo = false;
    };
    // onBloqueados se llama una sola vez, al cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <input
        type="date"
        value={valor}
        min={hoyISO()}
        onChange={(evento) => onCambiar(evento.target.value)}
        className="w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 text-sm text-[var(--text-main)] outline-none dark:[color-scheme:dark]"
      />
    );
  }

  if (!calendario) {
    return (
      <div className="flex h-[312px] items-center justify-center rounded-2xl border border-[var(--kint-panel-border)] text-xs text-[var(--text-muted)]">
        <LoaderCircle size={16} className="mr-2 animate-spin" />
        Cargando calendario...
      </div>
    );
  }

  const bloqueados = new Map(
    calendario.bloqueados.map((dia) => [dia.fecha, dia.motivo])
  );
  const feriados = new Map(
    calendario.feriados.map((dia) => [dia.fecha, dia.nombre])
  );

  const inicio = partes(calendario.desde);
  const fin = partes(calendario.hasta);
  const actual = mesVisible ||
    (valor && valor >= calendario.desde && valor <= calendario.hasta
      ? { anio: partes(valor).anio, mes: partes(valor).mes }
      : { anio: inicio.anio, mes: inicio.mes });

  const indiceMes = actual.anio * 12 + actual.mes;
  const puedeAtras = indiceMes > inicio.anio * 12 + inicio.mes;
  const puedeAdelante = indiceMes < fin.anio * 12 + fin.mes;

  function moverMes(delta: number) {
    const nuevo = indiceMes + delta;
    setMesVisible({ anio: Math.floor(nuevo / 12), mes: nuevo % 12 });
  }

  const diasDelMes = new Date(
    Date.UTC(actual.anio, actual.mes + 1, 0)
  ).getUTCDate();
  // Semana empezando en lunes.
  const desplazamiento =
    (new Date(Date.UTC(actual.anio, actual.mes, 1)).getUTCDay() + 6) % 7;

  const celdas: (string | null)[] = [
    ...Array.from({ length: desplazamiento }, () => null),
    ...Array.from({ length: diasDelMes }, (_, indice) =>
      aISO(actual.anio, actual.mes, indice + 1)
    ),
  ];

  const sinFacultad = (iso: string) => {
    const semana = diaSemana(iso);
    return semana === 0 || semana === 6 || feriados.has(iso);
  };

  const elegidoSinFacultad = valor && sinFacultad(valor);

  return (
    <div className="rounded-2xl border border-[var(--kint-panel-border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moverMes(-1)}
          disabled={!puedeAtras}
          aria-label="Mes anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] disabled:opacity-25"
        >
          <ChevronLeft size={17} />
        </button>

        <p className="text-sm font-black" aria-live="polite">
          {MESES[actual.mes]} {actual.anio}
        </p>

        <button
          type="button"
          onClick={() => moverMes(1)}
          disabled={!puedeAdelante}
          aria-label="Mes siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] disabled:opacity-25"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {DIAS_SEMANA.map((dia, indice) => (
          <span
            key={`${dia}-${indice}`}
            className="pb-1 text-[10px] font-black text-[var(--text-muted)]"
          >
            {dia}
          </span>
        ))}

        {celdas.map((iso, indice) => {
          if (!iso) return <span key={`vacio-${indice}`} />;

          const fueraDeRango =
            iso < calendario.desde || iso > calendario.hasta;
          const motivo = bloqueados.get(iso);
          const bloqueado = bloqueados.has(iso);
          const gris = sinFacultad(iso);
          const elegido = iso === valor;
          const esHoy = iso === calendario.desde;

          const titulo = bloqueado
            ? `Sin entregas${motivo ? `: ${motivo}` : ""}`
            : feriados.get(iso) ||
              (gris ? "Sin facultad: se coordina el envío" : undefined);

          return (
            <button
              key={iso}
              type="button"
              disabled={fueraDeRango || bloqueado}
              onClick={() => onCambiar(iso)}
              title={titulo}
              aria-label={`${describirFecha(iso)}${titulo ? ` (${titulo})` : ""}`}
              aria-pressed={elegido}
              className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                elegido
                  ? "bg-[var(--blue-main)] text-white shadow-md"
                  : bloqueado
                  ? "cursor-not-allowed bg-red-600/15 text-red-600 line-through decoration-2 dark:text-red-400"
                  : fueraDeRango
                  ? "cursor-default text-[var(--text-muted)] opacity-25"
                  : gris
                  ? "bg-[var(--kint-panel-soft)] text-[var(--text-muted)] hover:ring-1 hover:ring-[var(--kint-selected-border)]"
                  : "text-[var(--text-main)] hover:bg-[var(--kint-selected-bg)] hover:ring-1 hover:ring-[var(--kint-selected-border)]"
              } ${esHoy && !elegido ? "ring-1 ring-[var(--blue-main)]/50" : ""}`}
            >
              {partes(iso).dia}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-600/40" />
          Sin entregas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--kint-panel-soft)] ring-1 ring-[var(--kint-panel-border)]" />
          Sin facultad (envío a coordinar)
        </span>
      </div>

      {valor && (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-[var(--kint-selected-bg)] px-3 py-2 text-xs leading-5">
          <span>
            Elegiste el <strong>{describirFecha(valor)}</strong>
            {elegidoSinFacultad && (
              <span className="block text-[var(--text-muted)]">
                Ese día no hay facultad: coordinamos el envío por WhatsApp.
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={() => onCambiar("")}
            aria-label="Quitar fecha"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
