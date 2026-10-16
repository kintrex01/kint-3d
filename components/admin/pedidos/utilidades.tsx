"use client";

/*
 * Piezas compartidas por las pantallas de maquetas y tienda.
 */

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { ESTADO_CANCELADO, type PedidoResumen } from "@/lib/admin-tipos";
import { claseInput, diasHasta } from "@/components/admin/ui";

/* Minúsculas y sin tildes, para buscar sin importar cómo se escribió. */
export function normalizar(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function coincide(busqueda: string, ...campos: string[]) {
  const termino = normalizar(busqueda.trim());
  if (!termino) return true;
  return campos.some((campo) => normalizar(campo).includes(termino));
}

export function estaCancelado(estado: string) {
  return estado === ESTADO_CANCELADO;
}

export function pagoPorValidar(pedido: PedidoResumen) {
  return Boolean(pedido.pago?.comprobante && !pedido.pago.confirmado);
}

export function saldoPorValidar(pedido: PedidoResumen) {
  return Boolean(
    pedido.pago?.comprobanteSaldo && !pedido.pago.saldoConfirmado
  );
}

/* La fecha de entrega ya pasó y el pedido sigue sin entregarse. */
export function entregaVencida(entrega: string, estado: string) {
  const dias = diasHasta(entrega);
  return (
    dias !== null &&
    dias < 0 &&
    estado !== "Entregado" &&
    !estaCancelado(estado)
  );
}

/* Ordena por fecha de entrega (las sin fecha al final). */
export function porEntrega(a: string, b: string) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

/* ID de un archivo de Drive dentro de un link cualquiera. */
export function idDrive(link: string) {
  if (!/google\.com/.test(link || "")) return "";
  const match = /[-\w]{25,}/.exec(link);
  return match ? match[0] : "";
}

export function Buscador({
  valor,
  onCambiar,
  placeholder,
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-3">
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className={`${claseInput} h-11 pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden`}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambiar("")}
          aria-label="Borrar búsqueda"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)]"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* Fila etiqueta / valor para las tarjetas de detalle. */
export function FilaDato({
  etiqueta,
  children,
  accion,
}: {
  etiqueta: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-xs font-bold text-[var(--text-muted)]">
        {etiqueta}
      </dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-semibold">
        <span className="min-w-0 break-words">{children}</span>
        {accion}
      </dd>
    </div>
  );
}
