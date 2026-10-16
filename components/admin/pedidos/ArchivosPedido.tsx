"use client";

/*
 * Archivos que subió el cliente (hoja Archivos), con botones para
 * descargarlos o abrirlos en Drive.
 */

import { Download, ExternalLink, FileText } from "lucide-react";
import type { ArchivoPedido } from "@/lib/admin-tipos";
import { Tarjeta } from "@/components/admin/ui";
import { idDrive } from "@/components/admin/pedidos/utilidades";

const claseEnlace =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-3 text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--kint-selected-border)] active:scale-[0.98]";

/* Link de descarga directa de Drive (si el link es de un archivo de Drive). */
function linkDescarga(link: string) {
  const id = idDrive(link);
  return id && !/\/folders\//.test(link)
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
    : "";
}

export function SeccionArchivos({ archivos }: { archivos: ArchivoPedido[] }) {
  if (!archivos.length) {
    return (
      <Tarjeta className="px-4 py-4 text-sm text-[var(--text-muted)]">
        El cliente no subió archivos (o todavía no están en la hoja Archivos).
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
      {archivos.map((archivo, indice) => {
        const descarga = archivo.link ? linkDescarga(archivo.link) : "";

        return (
          <div
            key={`${archivo.link || archivo.nombre}-${indice}`}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--blue-main)] dark:text-[var(--blue-soft)]">
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-all text-sm font-bold">
                {archivo.nombre || "Archivo sin nombre"}
              </span>
              {archivo.tipo && (
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {archivo.tipo}
                </span>
              )}
            </span>
            {archivo.link ? (
              <span className="flex shrink-0 gap-2">
                {descarga && (
                  <a
                    href={descarga}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={claseEnlace}
                    aria-label={`Descargar ${archivo.nombre}`}
                  >
                    <Download size={15} />
                    Descargar
                  </a>
                )}
                <a
                  href={archivo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={claseEnlace}
                  aria-label={`Abrir ${archivo.nombre} en Drive`}
                >
                  <ExternalLink size={15} />
                  Abrir
                </a>
              </span>
            ) : (
              <span className="shrink-0 text-xs text-[var(--text-muted)]">
                Sin link
              </span>
            )}
          </div>
        );
      })}
    </Tarjeta>
  );
}
