"use client";

import { useState } from "react";
import { Ban, CalendarDays, ExternalLink, GraduationCap, MessageCircle, Minus, Plus, StickyNote, Trash2, X } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { HorarioAgendaAdmin } from "@/lib/admin-tipos";
import { Boton, Esqueleto, Tarjeta, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Mis horarios (Calendario del panel): se ven en /agenda y en «Ver mi
 * agenda» de /cotizar. Cada horario es:
 *   - En FADU, Respondo, o No disponible (se resta de «Respondo»:
 *     «respondo todo el día, menos de 02:00 a 08:00»);
 *   - para uno o varios días de la semana (L M M J V S D) o un día puntual;
 *   - de una hora a otra (cada media hora; «Todo el día» = 00:00 a 24:00).
 */

const DIAS = [
  { valor: "Lunes", corto: "L" },
  { valor: "Martes", corto: "M" },
  { valor: "Miércoles", corto: "M" },
  { valor: "Jueves", corto: "J" },
  { valor: "Viernes", corto: "V" },
  { valor: "Sábado", corto: "S" },
  { valor: "Domingo", corto: "D" },
];

const TIPOS = [
  { valor: "FADU" as const, texto: "En FADU", icono: GraduationCap, color: "bg-emerald-600" },
  { valor: "Atención" as const, texto: "Respondo", icono: MessageCircle, color: "bg-blue-600" },
  { valor: "No disponible" as const, texto: "No disponible", icono: Ban, color: "bg-slate-600" },
];

// 00:00, 00:30 … 24:00 (en 24 h: sin a.m./p.m.).
const HORAS = Array.from({ length: 49 }, (_, indice) => {
  const minutos = indice * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${minutos % 60 ? "30" : "00"}`;
});

const esFecha = (dia: string) => /^\d{4}-\d{2}-\d{2}$/.test(dia);
const hoyUY = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

const nuevo = (): HorarioAgendaAdmin => ({ tipo: "FADU", dia: "Lunes", desde: "09:00", hasta: "13:00", nota: "" });

/* Hora guardada que no cae justo en la media hora (ej. 09:15): igual se muestra. */
function opcionesHora(actual: string) {
  return HORAS.includes(actual) || !actual ? HORAS : [...HORAS, actual].sort();
}

export default function HorariosAgenda() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_agenda_listar", {});
  const avisar = useAvisos();
  const [borrador, setBorrador] = useState<HorarioAgendaAdmin[] | null>(null);
  const [conNota, setConNota] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  const lista = borrador ?? datos?.horarios ?? [];
  const cambiado = borrador !== null;

  function cambiar(indice: number, cambios: Partial<HorarioAgendaAdmin>) {
    setBorrador(lista.map((horario, i) => (i === indice ? { ...horario, ...cambios } : horario)));
  }

  function alternarDia(indice: number, dia: string) {
    const horario = lista[indice];
    const actuales = esFecha(horario.dia) ? [] : horario.dia.split(",").filter(Boolean);
    const nuevos = actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia];
    const ordenados = DIAS.map((d) => d.valor).filter((d) => nuevos.includes(d));
    cambiar(indice, { dia: ordenados.join(",") });
  }

  async function guardar() {
    const sinDia = lista.findIndex((horario) => !horario.dia);
    if (sinDia !== -1) {
      avisar(`El horario ${sinDia + 1} no tiene ningún día marcado.`, "error");
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_agenda_guardar", { horarios: lista });
      setDatos(respuesta);
      setBorrador(null);
      avisar("Horarios guardados: ya se ven en /agenda");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron guardar los horarios.", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="mb-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">Mis horarios</p>
          <p className="text-xs text-[var(--text-muted)]">
            Se ven en la agenda pública, junto con la impresora y los días llenos.
          </p>
        </div>
        <a
          href="/agenda"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--blue-main)] dark:text-[var(--blue-soft)]"
        >
          Ver /agenda
          <ExternalLink size={12} />
        </a>
      </div>

      {cargando && !datos ? (
        <div className="mt-3">
          <Esqueleto filas={2} />
        </div>
      ) : (
        <>
          {lista.length === 0 && (
            <p className="mt-3 rounded-xl bg-[var(--kint-selected-bg)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
              Ej.: En FADU lunes, martes y miércoles de 17:00 a 22:00. Respondo todos los días, todo el día, y No
              disponible de 02:00 a 08:00.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {lista.map((horario, indice) => {
              const puntual = esFecha(horario.dia);
              const marcados = puntual ? [] : horario.dia.split(",");
              const todoElDia = horario.desde === "00:00" && horario.hasta === "24:00";
              const verNota = Boolean(horario.nota) || conNota.has(indice);
              return (
                <li key={indice} className="rounded-xl border border-[var(--kint-panel-border)] p-2.5">
                  {/* Qué */}
                  <div className="flex flex-wrap items-center gap-1">
                    {TIPOS.map((tipo) => {
                      const activo = horario.tipo === tipo.valor;
                      const Icono = tipo.icono;
                      return (
                        <button
                          key={tipo.valor}
                          type="button"
                          onClick={() => cambiar(indice, { tipo: tipo.valor })}
                          className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-black transition ${
                            activo ? `${tipo.color} text-white` : "border border-[var(--kint-panel-border)] text-[var(--text-muted)]"
                          }`}
                        >
                          <Icono size={12} />
                          {tipo.texto}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-label="Borrar horario"
                      onClick={() => setBorrador(lista.filter((_, i) => i !== indice))}
                      className="ml-auto rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Qué días */}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {DIAS.map((dia) => {
                      const activo = marcados.includes(dia.valor);
                      return (
                        <button
                          key={dia.valor}
                          type="button"
                          title={dia.valor}
                          aria-pressed={activo}
                          onClick={() => alternarDia(indice, dia.valor)}
                          className={`h-8 w-8 rounded-full text-xs font-black transition ${
                            activo
                              ? "bg-[var(--text-main)] text-[var(--kint-panel)]"
                              : "border border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                        >
                          {dia.corto}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => cambiar(indice, { dia: DIAS.map((d) => d.valor).join(",") })}
                      className="h-8 rounded-full border border-[var(--kint-panel-border)] px-2.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiar(indice, { dia: puntual ? "Lunes" : hoyUY() })}
                      className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition ${
                        puntual ? "bg-amber-500 text-white" : "border border-[var(--kint-panel-border)] text-[var(--text-muted)]"
                      }`}
                    >
                      <CalendarDays size={12} />
                      Un día
                    </button>
                    {puntual && (
                      <input
                        type="date"
                        value={horario.dia}
                        min={hoyUY()}
                        onChange={(evento) => evento.target.value && cambiar(indice, { dia: evento.target.value })}
                        className="h-8 rounded-lg border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 text-xs font-bold text-[var(--text-main)] dark:[color-scheme:dark]"
                        aria-label="Fecha"
                      />
                    )}
                  </div>

                  {/* A qué hora */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                    <select
                      value={horario.desde}
                      onChange={(evento) => cambiar(indice, { desde: evento.target.value })}
                      className="h-8 w-[5.25rem] rounded-lg border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 text-sm font-bold tabular-nums text-[var(--text-main)] dark:[color-scheme:dark]"
                      aria-label="Desde"
                    >
                      {opcionesHora(horario.desde).slice(0, -1).map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                    a
                    <select
                      value={horario.hasta}
                      onChange={(evento) => cambiar(indice, { hasta: evento.target.value })}
                      className="h-8 w-[5.25rem] rounded-lg border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 text-sm font-bold tabular-nums text-[var(--text-main)] dark:[color-scheme:dark]"
                      aria-label="Hasta"
                    >
                      {opcionesHora(horario.hasta).slice(1).map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => cambiar(indice, { desde: "00:00", hasta: "24:00" })}
                      className={`h-8 rounded-full px-2.5 text-[11px] font-bold transition ${
                        todoElDia ? "bg-[var(--text-main)] text-[var(--kint-panel)]" : "border border-[var(--kint-panel-border)]"
                      }`}
                    >
                      Todo el día
                    </button>
                    {!verNota && (
                      <button
                        type="button"
                        onClick={() => setConNota(new Set(conNota).add(indice))}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold hover:text-[var(--text-main)]"
                      >
                        <StickyNote size={12} />
                        Nota
                      </button>
                    )}
                  </div>
                  {/* Excepciones: «todo el día, menos de 03:00 a 05:00». */}
                  {(horario.menos ?? []).map((rango, posicion) => (
                    <div key={posicion} className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <span className="w-12 text-right">menos</span>
                      <select
                        value={rango.desde}
                        onChange={(evento) =>
                          cambiar(indice, {
                            menos: (horario.menos ?? []).map((r, i) => (i === posicion ? { ...r, desde: evento.target.value } : r)),
                          })
                        }
                        className="h-8 w-[5.25rem] rounded-lg border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 text-sm font-bold tabular-nums text-[var(--text-main)] dark:[color-scheme:dark]"
                        aria-label="Menos desde"
                      >
                        {opcionesHora(rango.desde).slice(0, -1).map((hora) => (
                          <option key={hora} value={hora}>{hora}</option>
                        ))}
                      </select>
                      a
                      <select
                        value={rango.hasta}
                        onChange={(evento) =>
                          cambiar(indice, {
                            menos: (horario.menos ?? []).map((r, i) => (i === posicion ? { ...r, hasta: evento.target.value } : r)),
                          })
                        }
                        className="h-8 w-[5.25rem] rounded-lg border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 text-sm font-bold tabular-nums text-[var(--text-main)] dark:[color-scheme:dark]"
                        aria-label="Menos hasta"
                      >
                        {opcionesHora(rango.hasta).slice(1).map((hora) => (
                          <option key={hora} value={hora}>{hora}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Quitar esta excepción"
                        onClick={() => cambiar(indice, { menos: (horario.menos ?? []).filter((_, i) => i !== posicion) })}
                        className="rounded-lg p-1 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(horario.menos ?? []).length < 6 && (
                    <button
                      type="button"
                      onClick={() => cambiar(indice, { menos: [...(horario.menos ?? []), { desde: "03:00", hasta: "05:00" }] })}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--kint-panel-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      <Minus size={12} />
                      {(horario.menos ?? []).length ? "Otra excepción" : "Menos… (ej. de 03:00 a 05:00)"}
                    </button>
                  )}
                  {horario.hasta !== "24:00" && horario.hasta <= horario.desde && (
                    <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">Termina al día siguiente.</p>
                  )}
                  {verNota && (
                    <input
                      value={horario.nota}
                      maxLength={80}
                      onChange={(evento) => cambiar(indice, { nota: evento.target.value })}
                      placeholder="Nota (se ve en la agenda), ej.: entregas en el hall"
                      className={`${claseInput} mt-2 h-9 text-sm`}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <Boton icono={<Plus size={15} />} onClick={() => setBorrador([...lista, nuevo()])}>
              Agregar horario
            </Boton>
            {cambiado && (
              <>
                <Boton variante="principal" onClick={guardar} cargando={guardando}>
                  Guardar horarios
                </Boton>
                <Boton variante="fantasma" onClick={() => setBorrador(null)} disabled={guardando}>
                  Deshacer
                </Boton>
              </>
            )}
          </div>
        </>
      )}
    </Tarjeta>
  );
}
