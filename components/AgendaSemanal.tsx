"use client";

import { useEffect, useState } from "react";
import { GraduationCap, LoaderCircle, MessageCircle, Printer } from "lucide-react";

/*
 * Agenda pública (página /agenda y ventana en /cotizar): los próximos 7 días
 * con cuándo estoy en FADU, cuándo respondo y cotizo, hasta cuándo está
 * ocupada la impresora y qué días están llenos o sin entregas.
 * Todo se carga en el panel (Calendario › Mis horarios, cola de la impresora
 * y Configuración › Agenda). Uruguay: UTC−3 todo el año.
 */

export type HorarioAgenda = { tipo: "FADU" | "Atención"; dia: string; desde: string; hasta: string; nota: string };
type Bloque = { pedido?: string; inicio: string; fin: string; imprimiendo: boolean };
type Agenda = {
  habilitada: boolean;
  dias: number;
  ahora: string;
  mensaje: string;
  horarios: HorarioAgenda[];
  impresora: { bloques: Bloque[]; libreDesde: string } | null;
  diasSinEntrega: { fecha: string; lleno: boolean }[];
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DESFASE = -3 * 60; // minutos respecto de UTC (Uruguay)

const CAPAS = {
  FADU: { texto: "En FADU", detalle: "entregas en mano", color: "#10b981", icono: GraduationCap },
  "Atención": { texto: "Respondo y cotizo", detalle: "WhatsApp y pedidos", color: "#3b82f6", icono: MessageCircle },
  impresora: { texto: "Impresora ocupada", detalle: "", color: "#f97316", icono: Printer },
} as const;

/* "yyyy-mm-dd" de Uruguay para un instante. */
function fechaUY(ms: number) {
  return new Date(ms + DESFASE * 60000).toISOString().slice(0, 10);
}

function inicioDelDia(fecha: string) {
  return Date.parse(`${fecha}T00:00:00-03:00`);
}

function sumarDias(fecha: string, dias: number) {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);
}

function nombreDia(fecha: string) {
  return DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
}

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* finReal: la hora en que termina de verdad (si sigue al día siguiente). */
type Tramo = { capa: keyof typeof CAPAS; desde: number; hasta: number; nota?: string; pedido?: string; sigue?: boolean; venia?: boolean; finReal?: string };

/* Tramos de un día (en minutos desde las 00:00); los que cruzan la medianoche se parten. */
function tramosDelDia(agenda: Agenda, fecha: string): Tramo[] {
  const tramos: Tramo[] = [];
  const anterior = sumarDias(fecha, -1);
  const aplica = (horario: HorarioAgenda, dia: string) => horario.dia === dia || horario.dia === nombreDia(dia);

  for (const horario of agenda.horarios) {
    const desde = minutos(horario.desde);
    const hasta = minutos(horario.hasta);
    const cruza = hasta <= desde;
    if (aplica(horario, fecha)) {
      tramos.push({ capa: horario.tipo, desde, hasta: cruza ? 1440 : hasta, nota: horario.nota, sigue: cruza, finReal: horario.hasta });
    }
    if (cruza && aplica(horario, anterior) && hasta > 0) {
      tramos.push({ capa: horario.tipo, desde: 0, hasta, nota: horario.nota, venia: true });
    }
  }

  const inicio = inicioDelDia(fecha);
  const fin = inicio + 86400000;
  for (const bloque of agenda.impresora?.bloques ?? []) {
    const a = Math.max(Date.parse(bloque.inicio), inicio);
    const b = Math.min(Date.parse(bloque.fin), fin);
    if (b > a) {
      tramos.push({
        capa: "impresora",
        desde: Math.round((a - inicio) / 60000),
        hasta: Math.round((b - inicio) / 60000),
        pedido: bloque.pedido,
        venia: Date.parse(bloque.inicio) < inicio,
        sigue: Date.parse(bloque.fin) > fin,
        finReal: hhmm(Math.round((Date.parse(bloque.fin) - inicioDelDia(fechaUY(Date.parse(bloque.fin)))) / 60000)),
      });
    }
  }
  return tramos.sort((x, y) => x.desde - y.desde);
}

export default function AgendaSemanal({ compacta = false }: { compacta?: boolean }) {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    fetch("/api/agenda")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo) return;
        if (!data?.ok) return setError(true);
        setAgenda({
          habilitada: data.habilitada !== false,
          ahora: data.ahora || new Date().toISOString(),
          mensaje: data.mensaje || "",
          horarios: Array.isArray(data.horarios) ? data.horarios : [],
          impresora: data.impresora?.ok ? data.impresora : null,
          diasSinEntrega: Array.isArray(data.diasSinEntrega) ? data.diasSinEntrega : [],
          dias: Math.min(31, Math.max(1, Number(data.dias) || 7)),
        });
      })
      .catch(() => activo && setError(true));
    return () => {
      activo = false;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-[var(--text-muted)]">No pudimos cargar la agenda. Probá de nuevo en un rato.</p>;
  }
  if (!agenda) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <LoaderCircle size={16} className="animate-spin" />
        Cargando la agenda…
      </p>
    );
  }
  if (!agenda.habilitada) {
    return <p className="text-sm text-[var(--text-muted)]">La agenda no está disponible ahora.</p>;
  }

  const ahoraMs = Date.parse(agenda.ahora);
  const hoy = fechaUY(ahoraMs);
  const ahoraMin = Math.round((ahoraMs - inicioDelDia(hoy)) / 60000);
  const dias = Array.from({ length: agenda.dias }, (_, indice) => sumarDias(hoy, indice));
  const sinEntrega = new Map(agenda.diasSinEntrega.map((dia) => [dia.fecha, dia.lleno]));

  // Ahora mismo
  const tramosHoy = tramosDelDia(agenda, hoy);
  const ahoraEn = (capa: keyof typeof CAPAS) =>
    tramosHoy.find((tramo) => tramo.capa === capa && tramo.desde <= ahoraMin && tramo.hasta > ahoraMin);
  const enFadu = ahoraEn("FADU");
  const atendiendo = ahoraEn("Atención");
  const imprimiendo = agenda.impresora?.bloques.find((bloque) => Date.parse(bloque.inicio) <= ahoraMs && Date.parse(bloque.fin) > ahoraMs);
  const libreDesde = agenda.impresora?.libreDesde && Date.parse(agenda.impresora.libreDesde) > ahoraMs ? agenda.impresora.libreDesde : "";
  const cuandoLibre = libreDesde
    ? (() => {
        const fecha = fechaUY(Date.parse(libreDesde));
        const hora = hhmm(Math.round((Date.parse(libreDesde) - inicioDelDia(fecha)) / 60000));
        return fecha === hoy ? `hoy ${hora}` : fecha === sumarDias(hoy, 1) ? `mañana ${hora}` : `${nombreDia(fecha).toLowerCase()} ${hora}`;
      })()
    : "";

  return (
    <div className="space-y-4">
      {agenda.mensaje && (
        <p className="rounded-2xl bg-[var(--kint-panel)] px-4 py-3 text-sm leading-6 text-[var(--text-main)] ring-1 ring-[var(--border-color)]">
          {agenda.mensaje}
        </p>
      )}

      {/* Ahora mismo */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { capa: "FADU" as const, activo: Boolean(enFadu), texto: enFadu ? `Estoy en FADU hasta las ${enFadu.finReal || hhmm(enFadu.hasta)}` : "Ahora no estoy en FADU" },
          { capa: "Atención" as const, activo: Boolean(atendiendo), texto: atendiendo ? `Respondo hasta las ${atendiendo.finReal || hhmm(atendiendo.hasta)}` : "Ahora no estoy respondiendo" },
          ...(agenda.impresora
            ? [{ capa: "impresora" as const, activo: Boolean(libreDesde), texto: libreDesde ? `Impresora ocupada${imprimiendo?.pedido ? ` (${imprimiendo.pedido})` : ""}: libre ${cuandoLibre}` : "La impresora está libre" }]
            : []),
        ].map(({ capa, activo, texto }) => {
          const Icono = CAPAS[capa].icono;
          return (
            <div
              key={capa}
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold ring-1"
              style={{
                background: activo ? `${CAPAS[capa].color}1f` : "transparent",
                color: activo ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: `inset 0 0 0 1px ${activo ? CAPAS[capa].color + "66" : "var(--border-color)"}`,
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: activo ? CAPAS[capa].color : "var(--border-color)" }}
              >
                <Icono size={14} />
              </span>
              {texto}
            </div>
          );
        })}
      </div>

      {/* Referencias */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-[var(--text-muted)]">
        {(Object.keys(CAPAS) as (keyof typeof CAPAS)[])
          .filter((capa) => capa !== "impresora" || agenda.impresora)
          .map((capa) => (
            <span key={capa} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAPAS[capa].color }} />
              {CAPAS[capa].texto}
              {CAPAS[capa].detalle && <span className="font-semibold opacity-80">({CAPAS[capa].detalle})</span>}
            </span>
          ))}
      </div>

      {/* Los 7 días */}
      <ol className={compacta ? "space-y-2" : "grid gap-2.5 md:grid-cols-2"}>
        {dias.map((fecha) => {
          const tramos = tramosDelDia(agenda, fecha);
          const esHoy = fecha === hoy;
          const estado = sinEntrega.has(fecha) ? (sinEntrega.get(fecha) ? "Lleno" : "Sin entregas") : "";
          const [, mes, dia] = fecha.split("-").map(Number);
          const carriles = (["FADU", "Atención", "impresora"] as const).filter((capa) => capa !== "impresora" || agenda.impresora);
          return (
            <li
              key={fecha}
              className={`rounded-2xl border bg-[var(--kint-panel)] p-3 ${esHoy ? "border-[var(--blue-main)]/60 ring-2 ring-[var(--blue-main)]/15" : "border-[var(--border-color)]"}`}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-[var(--text-main)]">
                  {esHoy ? "Hoy" : fecha === sumarDias(hoy, 1) ? "Mañana" : nombreDia(fecha)}
                  <span className="ml-1.5 font-semibold text-[var(--text-muted)]">
                    {esHoy || fecha === sumarDias(hoy, 1) ? `${nombreDia(fecha).toLowerCase()} ` : ""}
                    {dia} {MESES[mes - 1]}
                  </span>
                </p>
                {estado && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${estado === "Lleno" ? "bg-red-600 text-white" : "bg-red-600/15 text-red-600 dark:text-red-400"}`}>
                    {estado}
                  </span>
                )}
              </div>

              {/* Línea de 24 h con un carril por cosa */}
              <div className="relative mt-2.5 space-y-1">
                {carriles.map((capa) => (
                  <div key={capa} className="relative h-2 overflow-hidden rounded-full bg-[var(--border-color)]/60">
                    {tramos
                      .filter((tramo) => tramo.capa === capa)
                      .map((tramo, indice) => (
                        <span
                          key={indice}
                          className="absolute inset-y-0 rounded-full"
                          style={{
                            left: `${(tramo.desde / 1440) * 100}%`,
                            width: `${Math.max(0.8, ((tramo.hasta - tramo.desde) / 1440) * 100)}%`,
                            background: CAPAS[capa].color,
                          }}
                        />
                      ))}
                  </div>
                ))}
                {esHoy && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -top-0.5 w-0.5 rounded-full bg-red-600"
                    style={{ left: `${(ahoraMin / 1440) * 100}%` }}
                  />
                )}
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] font-bold text-[var(--text-muted)]">
                <span>0</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
              </div>

              {tramos.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {tramos.map((tramo, indice) => (
                    <li key={indice} className="flex items-baseline gap-2 text-xs text-[var(--text-main)]">
                      <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: CAPAS[tramo.capa].color }} />
                      <span className="font-bold tabular-nums">
                        {hhmm(tramo.desde)}–{tramo.sigue ? tramo.finReal : hhmm(tramo.hasta)}
                      </span>
                      {(tramo.sigue || tramo.venia) && (
                        <span className="shrink-0 text-[10px] font-bold text-[var(--text-muted)]">
                          {tramo.sigue ? "(sigue mañana)" : "(viene de ayer)"}
                        </span>
                      )}
                      <span className="min-w-0 text-[var(--text-muted)]">
                        {tramo.capa === "impresora" ? `Imprimiendo ${tramo.pedido || ""}`.trim() : CAPAS[tramo.capa].texto}
                        {tramo.nota ? ` · ${tramo.nota}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Sin horarios cargados.</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
