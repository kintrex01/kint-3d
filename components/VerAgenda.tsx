"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, X } from "lucide-react";
import AgendaSemanal from "./AgendaSemanal";

/*
 * Botón «Ver mi agenda» (en /cotizar): abre la agenda en una ventana, sin
 * salir del formulario.
 */
export default function VerAgenda() {
  const [abierta, setAbierta] = useState(false);
  const [prendida, setPrendida] = useState(false);

  useEffect(() => {
    let activo = true;
    fetch("/api/agenda")
      .then((respuesta) => respuesta.json())
      .then((data) => activo && setPrendida(Boolean(data?.ok && data.habilitada !== false)))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!abierta) return;
    const cerrar = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierta(false);
    window.addEventListener("keydown", cerrar);
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", cerrar);
      document.body.style.overflow = desborde;
    };
  }, [abierta]);

  if (!prendida) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--kint-panel)] px-4 py-3 text-left transition hover:border-emerald-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CalendarClock size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[var(--text-main)]">Ver mi agenda</span>
          <span className="block text-xs text-[var(--text-muted)]">Cuándo estoy en FADU, cuándo respondo y la impresora</span>
        </span>
      </button>

      {/* En document.body: el formulario tiene animaciones que encerrarían la ventana. */}
      {abierta && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setAbierta(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mi agenda"
            onClick={(evento) => evento.stopPropagation()}
            className="kint-aviso-tarjeta max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[var(--page-bg)] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-600">Agenda</p>
                <p className="text-xl font-black text-[var(--text-main)]">¿Cuándo me encontrás?</p>
              </div>
              <button
                type="button"
                onClick={() => setAbierta(false)}
                aria-label="Cerrar agenda"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kint-panel)] ring-1 ring-[var(--border-color)]"
              >
                <X size={18} />
              </button>
            </div>
            <AgendaSemanal compacta />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
