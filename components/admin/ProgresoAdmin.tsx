"use client";

/*
 * Indicadores de carga del panel:
 * - Barra fina arriba mientras hay una llamada en curso o se cambia de página.
 * - Aviso "Actualizando…" cuando se refresca algo que ya está a la vista.
 */

import { Loader2 } from "lucide-react";
import { useActividadAdmin } from "@/lib/admin-cliente";

export function BarraProgreso({ navegando }: { navegando: boolean }) {
  const { enCurso, actualizando } = useActividadAdmin();
  const visible = navegando || enCurso > 0;

  return (
    <>
      <style>{`
        @keyframes kint-progreso {
          0% { transform: translateX(-100%) scaleX(0.35); }
          50% { transform: translateX(40%) scaleX(0.6); }
          100% { transform: translateX(110%) scaleX(0.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kint-progreso-barra { animation-duration: 3s !important; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[70] h-[3px] overflow-hidden transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {visible && (
          <div
            className="kint-progreso-barra h-full w-full origin-left rounded-full bg-[var(--blue-main)] dark:bg-[var(--blue-soft)]"
            style={{ animation: "kint-progreso 1.1s ease-in-out infinite" }}
          />
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.6rem)] z-[70] -translate-x-1/2 lg:left-[calc(50%+8rem)]"
      >
        {actualizando && (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--kint-panel-border)] bg-[var(--kint-panel)]/95 px-3 py-1 text-[11px] font-bold text-[var(--text-muted)] shadow-sm backdrop-blur">
            <Loader2 size={12} className="animate-spin" />
            Actualizando…
          </span>
        )}
      </div>
    </>
  );
}
