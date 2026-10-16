"use client";

/*
 * Secciones de solo lectura del detalle de un pedido de maqueta.
 */

import { Check, ExternalLink, FileText, Flame, ImageIcon, XCircle } from "lucide-react";
import {
  ESTADOS_PEDIDO,
  type ArchivoPedido,
  type OpcionPresupuesto,
} from "@/lib/admin-tipos";
import { Chip, Tarjeta, pesos } from "@/components/admin/ui";
import { estaCancelado, idDrive } from "@/components/admin/pedidos/utilidades";

/* Línea de progreso con los 7 pasos del pedido. */
export function ProgresoEstados({ estado }: { estado: string }) {
  if (estaCancelado(estado)) {
    return (
      <Tarjeta className="flex items-center gap-3 border-red-500/30 px-4 py-3.5">
        <XCircle size={20} className="shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-sm font-semibold">
          Este pedido está cancelado. No se puede cambiar de estado desde acá.
        </p>
      </Tarjeta>
    );
  }

  const actual = ESTADOS_PEDIDO.indexOf(estado as (typeof ESTADOS_PEDIDO)[number]);
  const siguiente = actual >= 0 ? ESTADOS_PEDIDO[actual + 1] : undefined;

  return (
    <Tarjeta className="px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-black">
          {actual >= 0 ? `Paso ${actual + 1} de ${ESTADOS_PEDIDO.length}` : "Estado"}
          <span className="font-semibold text-[var(--text-muted)]">
            {" "}· {estado || "Sin estado"}
          </span>
        </p>
      </div>

      <ol className="mt-3 flex items-center" aria-label="Progreso del pedido">
        {ESTADOS_PEDIDO.map((paso, indice) => {
          const hecho = actual >= 0 && indice < actual;
          const esActual = indice === actual;
          return (
            <li
              key={paso}
              className={`flex items-center ${indice === 0 ? "" : "flex-1"}`}
              aria-current={esActual ? "step" : undefined}
            >
              {indice > 0 && (
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 rounded-full ${
                    hecho || esActual
                      ? "bg-[#1f3f85] dark:bg-[var(--blue-soft)]"
                      : "bg-[var(--kint-panel-border)]"
                  }`}
                />
              )}
              <span
                title={paso}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  hecho
                    ? "bg-[#1f3f85] text-white dark:bg-[var(--blue-soft)] dark:text-[#0f1f3d]"
                    : esActual
                    ? "bg-[#1f3f85] text-white ring-4 ring-[#1f3f85]/20 dark:bg-[var(--blue-soft)] dark:text-[#0f1f3d] dark:ring-[var(--blue-soft)]/25"
                    : "border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
                }`}
              >
                {hecho ? <Check size={12} strokeWidth={3} /> : indice + 1}
                <span className="sr-only">
                  {paso}
                  {hecho ? " (hecho)" : esActual ? " (actual)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {siguiente && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Sigue: <span className="font-bold text-[var(--text-main)]">{siguiente}</span>
        </p>
      )}
    </Tarjeta>
  );
}

export function ListaPresupuestos({
  presupuestos,
}: {
  presupuestos: OpcionPresupuesto[];
}) {
  return (
    <ul className="space-y-2.5">
      {presupuestos.map((opcion, indice) => (
        <li key={`${opcion.opcion}-${indice}`}>
          <Tarjeta
            className={`px-4 py-3.5 ${
              opcion.seleccionado
                ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)]"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black">
                  {opcion.opcion || `Opción ${indice + 1}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {opcion.seleccionado && (
                    <Chip tono="verde">
                      <Check size={11} aria-hidden />
                      Elegida
                    </Chip>
                  )}
                  {opcion.urgente && (
                    <Chip tono="rojo">
                      <Flame size={11} aria-hidden />
                      Urgente +{opcion.recargo}%
                    </Chip>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-black leading-tight">
                  {pesos(opcion.precioTotal)}
                </p>
                {opcion.precioTotal !== opcion.precioBase && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Base {pesos(opcion.precioBase)}
                  </p>
                )}
              </div>
            </div>
            {opcion.descripcion && (
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--text-muted)]">
                {opcion.descripcion}
              </p>
            )}
            {(opcion.tiempo || opcion.filamento) && (
              <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
                {[
                  opcion.tiempo && `${opcion.tiempo} de impresión`,
                  opcion.filamento && `${opcion.filamento} g de filamento`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </Tarjeta>
        </li>
      ))}
    </ul>
  );
}

export function ListaArchivos({ archivos }: { archivos: ArchivoPedido[] }) {
  return (
    <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
      {archivos.map((archivo, indice) => {
        const contenido = (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--blue-main)] dark:text-[var(--blue-soft)]">
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {archivo.nombre || "Archivo sin nombre"}
              </span>
              {archivo.tipo && (
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {archivo.tipo}
                </span>
              )}
            </span>
            {archivo.link && (
              <ExternalLink size={16} className="shrink-0 text-[var(--text-muted)]" />
            )}
          </>
        );

        return archivo.link ? (
          <a
            key={`${archivo.link}-${indice}`}
            href={archivo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--kint-panel-soft)]"
          >
            {contenido}
          </a>
        ) : (
          <div
            key={`sin-link-${indice}`}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5"
          >
            {contenido}
          </div>
        );
      })}
    </Tarjeta>
  );
}

/* Líneas "dd/MM/yyyy HH:mm - estado", la más nueva arriba. */
export function Historial({ lineas }: { lineas: string[] }) {
  const ordenadas = lineas.filter((linea) => linea.trim()).reverse();

  return (
    <Tarjeta className="px-4 py-4">
      <ol className="relative space-y-4 border-l-2 border-[var(--kint-panel-border)] pl-5">
        {ordenadas.map((linea, indice) => {
          const separador = linea.indexOf(" - ");
          const cuando = separador > 0 ? linea.slice(0, separador) : "";
          const que = separador > 0 ? linea.slice(separador + 3) : linea;
          return (
            <li key={`${linea}-${indice}`} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--kint-panel)] ${
                  indice === 0
                    ? "bg-[#1f3f85] dark:bg-[var(--blue-soft)]"
                    : "bg-[var(--kint-panel-border)]"
                }`}
              />
              <p className="text-sm font-bold">{que}</p>
              {cuando && (
                <p className="text-xs text-[var(--text-muted)]">{cuando}</p>
              )}
            </li>
          );
        })}
      </ol>
    </Tarjeta>
  );
}

export function FotoFinal({ link }: { link: string }) {
  const id = idDrive(link);

  return (
    <Tarjeta className="overflow-hidden">
      {id && (
        // Se sirve desde /api/imagen-drive; next/image no aporta acá.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/imagen-drive?id=${encodeURIComponent(id)}`}
          alt="Foto final del pedido"
          loading="lazy"
          onError={(evento) => {
            evento.currentTarget.hidden = true;
          }}
          className="aspect-[4/3] w-full bg-[var(--kint-panel-soft)] object-cover"
        />
      )}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-bold transition hover:bg-[var(--kint-panel-soft)]"
      >
        <ImageIcon size={17} className="text-[var(--text-muted)]" />
        <span className="flex-1">Abrir foto final</span>
        <ExternalLink size={16} className="text-[var(--text-muted)]" />
      </a>
    </Tarjeta>
  );
}
