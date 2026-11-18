"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronRight, X } from "lucide-react";
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
        className="group mb-3 flex w-full items-center gap-3 rounded-2xl border border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(59,130,246,0.06)_55%,transparent)] px-4 py-3 text-left transition hover:border-emerald-500/60 hover:shadow-[0_10px_30px_-12px_rgba(16,185,129,0.5)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#059669)] text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.7)]">
          <CalendarClock size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[var(--text-main)]">Ver mi agenda</span>
          <span className="block text-xs text-[var(--text-muted)]">Cuándo estoy en FADU, cuándo respondo y la impresora</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400" />
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
