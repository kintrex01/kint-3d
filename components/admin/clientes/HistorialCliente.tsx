"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Package, ShoppingBag } from "lucide-react";
import { useDatosAdmin } from "@/lib/admin-cliente";
import { Chip, fechaDia, pesos, tonoEstado } from "@/components/admin/ui";

/*
 * Historial desplegable de un cliente: pedidos de maquetas y compras de
 * la tienda, con lo que gastó. Se pide recién cuando se abre.
 */
export function HistorialCliente({ email }: { email: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="mt-3 border-t border-[var(--kint-panel-border)] pt-2">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-bold text-[var(--blue-main)] dark:text-[var(--blue-soft)]"
      >
        {abierto ? "Ocultar historial" : "Ver historial de compras"}
        <ChevronDown
          size={17}
          className={`transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto && <ContenidoHistorial email={email} />}
    </div>
  );
}

function ContenidoHistorial({ email }: { email: string }) {
  const { datos, error, cargando } = useDatosAdmin(
    "admin_cliente_historial",
    { email },
    email
  );

  if (cargando && !datos) {
    return (
      <div className="space-y-2 py-2" aria-busy="true">
        {[0, 1].map((indice) => (
          <div
            key={indice}
            className="h-12 animate-pulse rounded-xl bg-[var(--kint-panel-soft)]"
          />
        ))}
      </div>
    );
  }

  if (error && !datos) {
    return <p className="py-2 text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!datos) return null;

  if (!datos.items.length) {
    return (
      <p className="py-2 text-sm text-[var(--text-muted)]">
        Todavía no hizo pedidos ni compras.
      </p>
    );
  }

  return (
    <div className="pb-1">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Dato titulo="Gastó" valor={pesos(datos.gastado)} destacado />
        <Dato titulo="Maquetas" valor={String(datos.pedidos)} />
        <Dato titulo="Tienda" valor={String(datos.compras)} />
      </div>

      <ul className="space-y-1.5">
        {datos.items.map((item) => {
          const Icono = item.tipo === "maqueta" ? Package : ShoppingBag;
          const contenido = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--text-muted)]">
                <Icono size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-black">{item.pedido}</span>
                  <Chip tono={tonoEstado(item.estado)}>{item.estado}</Chip>
                </span>
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {[item.fecha ? fechaDia(item.fecha) : "", item.detalle || ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-black">
                  {item.monto > 0 ? pesos(item.monto) : "—"}
                </span>
                <span
                  className={`block text-[10px] font-bold ${
                    item.pagado
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.pagado ? "Pagado" : "Sin pagar"}
                </span>
              </span>
            </>
          );

          const clase =
            "flex items-center gap-3 rounded-xl border border-[var(--kint-panel-border)] px-3 py-2 text-sm";

          return (
            <li key={item.pedido}>
              {item.tipo === "maqueta" ? (
                <Link
                  href={`/admin/pedidos/${encodeURIComponent(item.pedido)}`}
                  className={`${clase} transition hover:border-[var(--kint-selected-border)]`}
                >
                  {contenido}
                </Link>
              ) : (
                <div className={clase}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dato({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--kint-panel-soft)] px-2 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {titulo}
      </p>
      <p
        className={`mt-0.5 font-black ${
          destacado ? "text-emerald-700 dark:text-emerald-400" : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
