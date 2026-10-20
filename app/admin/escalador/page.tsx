"use client";

import { Box, ExternalLink } from "lucide-react";
import Escalador from "@/components/Escalador";
import { Encabezado, Tarjeta } from "@/components/admin/ui";

/*
 * El mismo Escalador de la web, dentro del panel. Para escalar un STL
 * se usa el preparador 3D (se abre en otra pestaña).
 */

export default function EscaladorAdminPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Escalador" subtitulo="Medida real ↔ medida en la maqueta, y si se puede imprimir" />

      <a href="/preparador-3d" target="_blank" rel="noopener noreferrer" className="mb-5 block">
        <Tarjeta className="flex items-center gap-3 p-4 transition hover:border-sky-400">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Box size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black">Escalar un archivo STL</span>
            <span className="block text-xs text-[var(--text-muted)]">
              Subís el STL, elegís la escala (ej. 1:100) y te descarga el archivo escalado.
            </span>
          </span>
          <ExternalLink size={16} className="shrink-0 text-[var(--text-muted)]" />
        </Tarjeta>
      </a>

      <Escalador />
    </div>
  );
}
