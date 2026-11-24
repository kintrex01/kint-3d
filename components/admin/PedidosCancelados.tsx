"use client";

import { useState } from "react";
import { Ban, ChevronDown } from "lucide-react";
import { useDatosAdmin } from "@/lib/admin-cliente";
import { Tarjeta } from "@/components/admin/ui";

/*
 * Todos los pedidos › Cancelados: quién canceló desde el seguimiento,
 * cuándo, en qué estado estaba y por qué (hoja «Cancelaciones»).
 * Arriba, cuántas veces se repite cada motivo, para saber qué mejorar.
 */

const SIN_DATOS = {};

function fechaCorta(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-UY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Montevideo" });
}

export default function PedidosCancelados() {
  const { datos } = useDatosAdmin("admin_cancelaciones_listar", SIN_DATOS);
  const [verTodos, setVerTodos] = useState(false);
  // Las pruebas que hicimos no cuentan.
  const lista = (datos?.cancelaciones ?? []).filter((item) => !/prueba/i.test(item.comentario));
  if (!lista.length) return null;

  const motivos = new Map<string, number>();
  lista.forEach((item) => motivos.set(item.motivo || "Sin motivo", (motivos.get(item.motivo || "Sin motivo") ?? 0) + 1));
  const ranking = [...motivos.entries()].sort((a, b) => b[1] - a[1]);
  const visibles = verTodos ? lista : lista.slice(0, 5);

  return (
    <Tarjeta className="mt-6 p-4">
      <p className="flex items-center gap-2 text-lg font-black">
        <Ban size={18} className="text-red-600" />
        Cancelados ({lista.length})
      </p>
      <p className="text-xs text-[var(--text-muted)]">Los que cancelaron desde el seguimiento, con el motivo que eligieron.</p>

      {/* Por qué cancelan: lo que más se repite arriba */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ranking.map(([motivo, veces]) => (
          <span key={motivo} className="rounded-full border border-red-600/30 bg-red-600/10 px-2.5 py-1 text-xs font-bold text-red-700 dark:text-red-300">
            {motivo} · {veces}
          </span>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-[var(--kint-panel-border)]">
        {visibles.map((item) => (
          <li key={`${item.pedido}-${item.fecha}`} className="py-2.5 text-sm">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-black">{item.pedido}</span>
              <span className="font-bold">{item.nombre}</span>
              <span className="text-xs text-[var(--text-muted)]">{fechaCorta(item.fecha)}</span>
            </p>
            <p className="mt-0.5 font-bold text-red-700 dark:text-red-300">{item.motivo}</p>
            {item.comentario && <p className="mt-0.5 italic text-[var(--text-main)]">«{item.comentario}»</p>}
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {[`Estaba en ${item.estado || "?"}`, item.email, item.urgente ? "Urgente" : "", item.codigo ? `Código ${item.codigo}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>

      {lista.length > 5 && (
        <button
          type="button"
          onClick={() => setVerTodos((actual) => !actual)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          {verTodos ? "Ver menos" : `Ver los ${lista.length}`}
          <ChevronDown size={14} className={verTodos ? "rotate-180" : ""} />
        </button>
      )}
    </Tarjeta>
  );
}
