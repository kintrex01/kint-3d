"use client";

import { useState } from "react";
import { ExternalLink, GraduationCap, MessageCircle, Plus, Trash2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { HorarioAgendaAdmin } from "@/lib/admin-tipos";
import { Boton, Esqueleto, Tarjeta, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Mis horarios (Calendario del panel): cuándo estoy en FADU y cuándo
 * respondo. Se ven en /agenda y en la ventana «Ver mi agenda» de /cotizar.
 * Cada horario es semanal («todos los lunes») o de un día puntual.
 */

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PUNTUAL = "puntual";

const nuevo = (): HorarioAgendaAdmin => ({ tipo: "FADU", dia: "Lunes", desde: "09:00", hasta: "13:00", nota: "" });

export default function HorariosAgenda() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_agenda_listar", {});
  const avisar = useAvisos();
  const [borrador, setBorrador] = useState<HorarioAgendaAdmin[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  const lista = borrador ?? datos?.horarios ?? [];
  const cambiado = borrador !== null;

  function cambiar(indice: number, cambios: Partial<HorarioAgendaAdmin>) {
    setBorrador(lista.map((horario, i) => (i === indice ? { ...horario, ...cambios } : horario)));
  }

  async function guardar() {
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
              Todavía no cargaste horarios. Ej.: FADU todos los lunes de 09:00 a 13:00, o respondo de 18:00 a 02:00.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {lista.map((horario, indice) => {
              const puntual = /^\d{4}-\d{2}-\d{2}$/.test(horario.dia);
              return (
                <li key={indice} className="rounded-xl border border-[var(--kint-panel-border)] p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["FADU", "Atención"] as const).map((tipo) => {
                      const activo = horario.tipo === tipo;
                      const Icono = tipo === "FADU" ? GraduationCap : MessageCircle;
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => cambiar(indice, { tipo })}
                          className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-black transition ${
                            activo
                              ? tipo === "FADU"
                                ? "bg-emerald-600 text-white"
                                : "bg-blue-600 text-white"
                              : "border border-[var(--kint-panel-border)] text-[var(--text-muted)]"
                          }`}
                        >
                          <Icono size={13} />
                          {tipo === "FADU" ? "En FADU" : "Respondo"}
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

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <select
                      value={puntual ? PUNTUAL : horario.dia}
                      onChange={(evento) =>
                        cambiar(indice, {
                          dia:
                            evento.target.value === PUNTUAL
                              ? new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
                              : evento.target.value,
                        })
                      }
                      className={`${claseInput} h-10 text-sm`}
                      aria-label="Día"
                    >
                      {DIAS.map((dia) => (
                        <option key={dia} value={dia}>
                          Todos los {dia.toLowerCase()}
                          {dia === "Sábado" || dia === "Domingo" ? "s" : ""}
                        </option>
                      ))}
                      <option value={PUNTUAL}>Un día puntual</option>
                    </select>
                    {puntual ? (
                      <input
                        type="date"
                        value={horario.dia}
                        onChange={(evento) => evento.target.value && cambiar(indice, { dia: evento.target.value })}
                        className={`${claseInput} h-10 text-sm`}
                        aria-label="Fecha"
                      />
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      de
                      <input type="time" value={horario.desde} onChange={(evento) => cambiar(indice, { desde: evento.target.value })} className={`${claseInput} h-10 text-sm`} />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      a
                      <input type="time" value={horario.hasta} onChange={(evento) => cambiar(indice, { hasta: evento.target.value })} className={`${claseInput} h-10 text-sm`} />
                    </label>
                  </div>
                  {horario.hasta <= horario.desde && horario.hasta !== "" && (
                    <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">Termina al día siguiente.</p>
                  )}
                  <input
                    value={horario.nota}
                    maxLength={80}
                    onChange={(evento) => cambiar(indice, { nota: evento.target.value })}
                    placeholder="Nota (opcional), ej.: entregas en el hall"
                    className={`${claseInput} mt-2 h-10 text-sm`}
                  />
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
