"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

/*
 * Calendario para elegir el día o los días de entrega.
 *
 * - Empieza plegado: un botón "Elegir fecha (opcional)" lo abre.
 * - Con onCambiarDias el cliente toca uno o varios días sueltos
 *   ("me sirve el lunes, el miércoles o el viernes"): quedan en verde.
 *   `valor` es siempre el primero (el que va a la columna de entrega).
 * - Rojo, no se puede elegir: días sin entrega que carga el dueño
 *   (hoja "Días sin entrega" o panel de admin).
 * - Ámbar, se puede elegir: sábados, domingos y feriados (no hay
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

/* Mismo tope que valida Apps Script (kintEntregasTextoDias_). */
export const MAX_DIAS_ENTREGA = 10;

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

/*
 * "el lunes 20 de octubre" o, con varios días,
 * "el lunes 20, el miércoles 22 o el viernes 24 de octubre".
 */
export function describirDias(dias: string[]) {
  const lista = [...dias].sort();
  if (!lista.length) return "";
  if (lista.length === 1) return `el ${describirFecha(lista[0])}`;

  const mismoMes = lista.every(
    (iso) => iso.slice(0, 7) === lista[0].slice(0, 7)
  );
  const corto = (iso: string) =>
    mismoMes ? `${DIAS_LARGOS[diaSemana(iso)]} ${partes(iso).dia}` : describirFecha(iso);

  const textos = lista.map((iso, indice) =>
    indice === lista.length - 1 ? describirFecha(iso) : corto(iso)
  );
  return `el ${textos.slice(0, -1).join(", el ")} o el ${textos[textos.length - 1]}`;
}

/* Si el calendario no carga, se usa el selector de fecha del navegador. */
function hoyISO() {
  const hoy = new Date();
  return aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

export default function CalendarioEntrega({
  valor,
  onCambiar,
  dias,
  onCambiarDias,
  onBloqueados,
}: {
  /* Fecha elegida (con varios días, el primero). */
  valor: string;
  onCambiar: (fecha: string) => void;
  /* Con onCambiarDias se pueden elegir varios días sueltos. */
  dias?: string[];
  onCambiarDias?: (dias: string[]) => void;
  /* Avisa al padre qué días están bloqueados (para validar). */
  onBloqueados?: (fechas: string[]) => void;
}) {
  const [calendario, setCalendario] = useState<Calendario | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState("");
  const [mesVisible, setMesVisible] = useState<{
    anio: number;
    mes: number;
  } | null>(null);

  const varios = Boolean(onCambiarDias);
  const elegidos = varios ? [...(dias || [])].sort() : valor ? [valor] : [];

  useEffect(() => {
    let activo = true;

    fetch("/api/calendario-entregas")
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
          bloqueados: Array.isArray(data.bloqueados) ? data.bloqueados : [],
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

  function aplicar(nuevos: string[]) {
    const ordenados = [...nuevos].sort();
    onCambiarDias?.(ordenados);
    onCambiar(ordenados[0] || "");
  }

  function quitar() {
    setAviso("");
    if (varios) aplicar([]);
    else onCambiar("");
  }

  /* Resumen + botón que despliega el calendario. */
  const resumen = elegidos.length ? describirDias(elegidos) : "";
  const boton = (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
          elegidos.length
            ? "border-emerald-600/50 bg-emerald-500/10 font-bold text-[var(--text-main)]"
            : "border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
        }`}
      >
        <CalendarDays
          size={18}
          className={`shrink-0 ${elegidos.length ? "text-emerald-600" : "text-[var(--blue-main)]"}`}
        />
        <span className="min-w-0 flex-1 first-letter:uppercase">
          {resumen || "Elegir fecha (opcional)"}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {elegidos.length > 0 && (
        <button
          type="button"
          onClick={quitar}
          aria-label="Quitar fecha"
          className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--kint-panel-border)] text-[var(--text-muted)] transition hover:border-red-600/50 hover:text-red-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );

  if (error) {
    return (
      <input
        type="date"
        value={valor}
        min={hoyISO()}
        onChange={(evento) =>
          varios
            ? aplicar(evento.target.value ? [evento.target.value] : [])
            : onCambiar(evento.target.value)
        }
        className="w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 text-sm text-[var(--text-main)] outline-none dark:[color-scheme:dark]"
      />
    );
  }

  if (!calendario) {
    if (!abierto) return boton;
    return (
      <div className="space-y-2">
        {boton}
        <div className="flex h-[312px] items-center justify-center rounded-2xl border border-[var(--kint-panel-border)] text-xs text-[var(--text-muted)]">
          <LoaderCircle size={16} className="mr-2 animate-spin" />
          Cargando calendario...
        </div>
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
  const primero = elegidos[0];
  const actual =
    mesVisible ||
    (primero && primero >= calendario.desde && primero <= calendario.hasta
      ? { anio: partes(primero).anio, mes: partes(primero).mes }
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

  function elegir(iso: string) {
    setAviso("");

    if (!varios) {
      onCambiar(iso);
      setAbierto(false);
      return;
    }

    if (elegidos.includes(iso)) {
      aplicar(elegidos.filter((dia) => dia !== iso));
      return;
    }

    if (elegidos.length >= MAX_DIAS_ENTREGA) {
      setAviso(`Podés elegir hasta ${MAX_DIAS_ENTREGA} días.`);
      return;
    }

    aplicar([...elegidos, iso]);
  }

  // Todos los días elegidos son sin facultad: se coordina el envío.
  const todosSinFacultad =
    elegidos.length > 0 && elegidos.every((dia) => sinFacultad(dia));

  return (
    <div className="space-y-2">
      {boton}

      {abierto && (
        <div className="rounded-2xl border border-[var(--kint-panel-border)] p-3">
          {varios && (
            <p className="mb-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2 text-center text-xs font-semibold leading-5 text-[var(--text-main)]">
              Tocá el día o los días en que te sirve que te entreguemos. Si te
              sirven varios (por ejemplo lunes, miércoles y viernes), marcalos
              todos.
            </p>
          )}

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
                className={`pb-1 text-[10px] font-black ${
                  // Sábado y domingo: sin facultad (lunes primero).
                  indice >= 5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-[var(--text-muted)]"
                }`}
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
              const elegido = elegidos.includes(iso);
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
                  onClick={() => elegir(iso)}
                  title={titulo}
                  aria-label={`${describirFecha(iso)}${titulo ? ` (${titulo})` : ""}`}
                  aria-pressed={elegido}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                    elegido
                      ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30"
                      : bloqueado
                      ? "cursor-not-allowed bg-red-600/15 text-red-600 line-through decoration-2 dark:text-red-400"
                      : fueraDeRango
                      ? "cursor-default text-[var(--text-muted)] opacity-25"
                      : gris
                      ? "bg-amber-500/15 text-amber-800 hover:ring-1 hover:ring-amber-500/60 dark:text-amber-300"
                      : "text-[var(--text-main)] hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-600/40"
                  } ${esHoy && !elegido ? "ring-1 ring-[var(--blue-main)]/50" : ""}`}
                >
                  {elegido ? (
                    <span className="flex items-center gap-0.5">
                      {partes(iso).dia}
                      <Check size={10} strokeWidth={4} />
                    </span>
                  ) : (
                    partes(iso).dia
                  )}
                  {gris && !elegido && !bloqueado && !fueraDeRango && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
              Elegido
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-600/40" />
              Sin entregas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" />
              Fin de semana o feriado: sin facultad (envío a coordinar)
            </span>
          </div>

          {aviso && (
            <p
              role="alert"
              className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400"
            >
              {aviso}
            </p>
          )}

          {varios && elegidos.length > 0 && (
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-emerald-700"
            >
              <Check size={15} strokeWidth={3} />
              Listo ({elegidos.length} {elegidos.length === 1 ? "día" : "días"})
            </button>
          )}
        </div>
      )}

      {todosSinFacultad && (
        <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300">
          {elegidos.length > 1
            ? "En esos días no hay facultad: no se entrega en FADU, coordinamos el envío por WhatsApp."
            : "Ese día no hay facultad: no se entrega en FADU, coordinamos el envío por WhatsApp."}
        </p>
      )}
    </div>
  );
}
