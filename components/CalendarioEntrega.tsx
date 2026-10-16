"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

/*
 * Calendario para elegir la fecha de entrega.
 *
 * - Empieza plegado: un botón "Elegir fecha (opcional)" lo abre.
 * - Un día o, si el padre pasa onCambiarHasta, "entre dos fechas".
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

type Modo = "dia" | "rango";

/* Mismo tope que valida Apps Script. */
export const MAX_DIAS_RANGO = 31;

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

function diasEntre(desde: string, hasta: string) {
  const a = partes(desde);
  const b = partes(hasta);
  return Math.round(
    (Date.UTC(b.anio, b.mes, b.dia) - Date.UTC(a.anio, a.mes, a.dia)) /
      86400000,
  );
}

export function describirFecha(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const { mes, dia } = partes(iso);
  return `${DIAS_LARGOS[diaSemana(iso)]} ${dia} de ${MESES[mes].toLowerCase()}`;
}

/* "el lunes 20 de octubre" o "entre el lunes 20 y el miércoles 22 de octubre". */
export function describirEntrega(desde: string, hasta = "") {
  if (!desde) return "";
  if (!hasta || hasta === desde) return `el ${describirFecha(desde)}`;

  const a = partes(desde);
  const b = partes(hasta);
  const inicio =
    a.mes === b.mes && a.anio === b.anio
      ? `${DIAS_LARGOS[diaSemana(desde)]} ${a.dia}`
      : describirFecha(desde);

  return `entre el ${inicio} y el ${describirFecha(hasta)}`;
}

/* Si el calendario no carga, se usa el selector de fecha del navegador. */
function hoyISO() {
  const hoy = new Date();
  return aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

export default function CalendarioEntrega({
  valor,
  onCambiar,
  hasta = "",
  onCambiarHasta,
  onBloqueados,
}: {
  /* Fecha elegida (o el "desde" del rango). */
  valor: string;
  onCambiar: (fecha: string) => void;
  /* Con onCambiarHasta se puede elegir "entre dos fechas". */
  hasta?: string;
  onCambiarHasta?: (fecha: string) => void;
  /* Avisa al padre qué días están bloqueados (para validar). */
  onBloqueados?: (fechas: string[]) => void;
}) {
  const [calendario, setCalendario] = useState<Calendario | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>(hasta ? "rango" : "dia");
  const [aviso, setAviso] = useState("");
  const [mesVisible, setMesVisible] = useState<{
    anio: number;
    mes: number;
  } | null>(null);

  const permiteRango = Boolean(onCambiarHasta);

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

  function quitar() {
    onCambiar("");
    onCambiarHasta?.("");
    setAviso("");
  }

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setAviso("");
    if (nuevo === "dia") onCambiarHasta?.("");
  }

  /* Resumen + botón que despliega el calendario. */
  const resumen = valor ? describirEntrega(valor, hasta) : "";
  const boton = (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
          valor
            ? "border-[var(--blue-main)]/50 bg-[var(--kint-selected-bg)] font-bold text-[var(--text-main)]"
            : "border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
        }`}
      >
        <CalendarDays size={18} className="shrink-0 text-[var(--blue-main)]" />
        <span className="min-w-0 flex-1 first-letter:uppercase">
          {resumen || "Elegir fecha (opcional)"}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {valor && (
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
        onChange={(evento) => onCambiar(evento.target.value)}
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
    calendario.bloqueados.map((dia) => [dia.fecha, dia.motivo]),
  );
  const feriados = new Map(
    calendario.feriados.map((dia) => [dia.fecha, dia.nombre]),
  );

  const inicio = partes(calendario.desde);
  const fin = partes(calendario.hasta);
  const actual =
    mesVisible ||
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
    Date.UTC(actual.anio, actual.mes + 1, 0),
  ).getUTCDate();
  // Semana empezando en lunes.
  const desplazamiento =
    (new Date(Date.UTC(actual.anio, actual.mes, 1)).getUTCDay() + 6) % 7;

  const celdas: (string | null)[] = [
    ...Array.from({ length: desplazamiento }, () => null),
    ...Array.from({ length: diasDelMes }, (_, indice) =>
      aISO(actual.anio, actual.mes, indice + 1),
    ),
  ];

  const sinFacultad = (iso: string) => {
    const semana = diaSemana(iso);
    return semana === 0 || semana === 6 || feriados.has(iso);
  };

  const enRango = modo === "rango" && permiteRango;
  const esperandoHasta = enRango && Boolean(valor) && !hasta;

  function elegir(iso: string) {
    setAviso("");

    if (!enRango) {
      onCambiar(iso);
      onCambiarHasta?.("");
      setAbierto(false);
      return;
    }

    // Primer toque (o uno anterior al "desde"): empieza un rango nuevo.
    if (!valor || hasta || iso <= valor) {
      onCambiar(iso);
      onCambiarHasta?.("");
      return;
    }

    if (diasEntre(valor, iso) > MAX_DIAS_RANGO) {
      setAviso(`El rango puede ser de hasta ${MAX_DIAS_RANGO} días.`);
      return;
    }

    onCambiarHasta?.(iso);
    setAbierto(false);
  }

  // Días sin entrega dentro del rango elegido (solo aviso).
  const bloqueadosEnRango =
    valor && hasta
      ? calendario.bloqueados
          .map((dia) => dia.fecha)
          .filter((fecha) => fecha > valor && fecha < hasta)
      : [];

  const rangoConFacultad =
    valor && hasta
      ? Array.from({ length: diasEntre(valor, hasta) + 1 }, (_, indice) => {
          const { anio, mes, dia } = partes(valor);
          const fecha = new Date(Date.UTC(anio, mes, dia + indice));
          return aISO(
            fecha.getUTCFullYear(),
            fecha.getUTCMonth(),
            fecha.getUTCDate(),
          );
        }).some((fecha) => !sinFacultad(fecha) && !bloqueados.has(fecha))
      : true;

  const elegidoSinFacultad =
    valor && (hasta ? !rangoConFacultad : sinFacultad(valor));

  return (
    <div className="space-y-2">
      {boton}

      {abierto && (
        <div className="rounded-2xl border border-[var(--kint-panel-border)] p-3">
          {permiteRango && (
            <div
              role="group"
              aria-label="Tipo de fecha"
              className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-[var(--kint-panel-soft)] p-1"
            >
              {(
                [
                  ["dia", "Un día"],
                  ["rango", "Entre dos fechas"],
                ] as const
              ).map(([opcion, texto]) => (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={modo === opcion}
                  onClick={() => cambiarModo(opcion)}
                  className={`h-9 rounded-lg text-xs font-black transition ${
                    modo === opcion
                      ? "bg-[var(--kint-panel)] text-[var(--text-main)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          )}

          {enRango && (
            <p
              className="mb-2 text-center text-xs text-[var(--text-muted)]"
              aria-live="polite"
            >
              {esperandoHasta
                ? "Ahora tocá el último día que te sirve."
                : "Tocá el primer día que te sirve."}
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
              const extremo =
                iso === valor || (Boolean(hasta) && iso === hasta);
              const intermedio =
                Boolean(valor && hasta) && iso > valor && iso < hasta;
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
                  aria-pressed={extremo}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                    extremo
                      ? "bg-[var(--blue-main)] text-white shadow-md"
                      : bloqueado
                        ? "cursor-not-allowed bg-red-600/15 text-red-600 line-through decoration-2 dark:text-red-400"
                        : fueraDeRango
                          ? "cursor-default text-[var(--text-muted)] opacity-25"
                          : intermedio
                            ? "bg-[var(--blue-main)]/15 text-[var(--text-main)] ring-1 ring-[var(--blue-main)]/25"
                            : gris
                              ? "bg-amber-500/15 text-amber-800 hover:ring-1 hover:ring-amber-500/60 dark:text-amber-300"
                              : "text-[var(--text-main)] hover:bg-[var(--kint-selected-bg)] hover:ring-1 hover:ring-[var(--kint-selected-border)]"
                  } ${esHoy && !extremo ? "ring-1 ring-[var(--blue-main)]/50" : ""}`}
                >
                  {partes(iso).dia}
                  {gris && !extremo && !bloqueado && !fueraDeRango && (
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
        </div>
      )}

      {elegidoSinFacultad && (
        <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300">
          {hasta
            ? "En esos días no hay facultad: no se entrega en FADU, coordinamos el envío por WhatsApp."
            : "Ese día no hay facultad: no se entrega en FADU, coordinamos el envío por WhatsApp."}
        </p>
      )}

      {bloqueadosEnRango.length > 0 && (
        <p className="rounded-lg bg-red-600/10 px-3 py-2 text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
          {bloqueadosEnRango.length === 1
            ? `El ${describirFecha(bloqueadosEnRango[0])} no hay entregas: te lo entregamos otro día del rango.`
            : "Hay días sin entregas dentro del rango: te lo entregamos en otro de esos días."}
        </p>
      )}
    </div>
  );
}
