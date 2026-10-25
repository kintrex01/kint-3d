"use client";

import type { ReactNode } from "react";

/*
 * Visor 3D: una sección del menú que se abre y se cierra, con su número de
 * paso y un resumen de una línea (así se entiende todo sin leer de más).
 */

export default function SeccionVisor({
  numero,
  titulo,
  resumen,
  tono = "neutro",
  abierta = false,
  children,
}: {
  numero?: string;
  titulo: string;
  resumen?: string;
  tono?: "neutro" | "bien" | "aviso";
  abierta?: boolean;
  children: ReactNode;
}) {
  const colorResumen =
    tono === "bien" ? "text-emerald-600 dark:text-emerald-400" : tono === "aviso" ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]";
  return (
    <details open={abierta} className="group mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg)]/40 transition open:bg-transparent">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        {numero ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--text-main)] text-[11px] font-black text-[var(--page-bg)]">
            {numero}
          </span>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] text-[12px] font-black">
            +
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-black">{titulo}</span>
          {resumen && <span className={`block truncate text-[10px] font-semibold ${colorResumen}`}>{resumen}</span>}
        </span>
        <span className="shrink-0 text-xs font-bold text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180">↓</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
