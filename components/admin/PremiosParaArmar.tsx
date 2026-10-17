"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Gift, RefreshCw, Undo2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { PremioGanado } from "@/lib/admin-tipos";
import { Boton, Chip, Esqueleto, Tarjeta, fechaHora, useAvisos } from "@/components/admin/ui";

/*
 * Premios de la ruleta y canjes de puntos: qué reclamó cada cliente (para
 * armarlo) y qué quedó sin usar. Al entregarlo se marca y sale de la lista.
 */
export function PremiosParaArmar() {
  const avisar = useAvisos();
  const { datos, setDatos, error, cargando, recargar, recargando } = useDatosAdmin("admin_premios_listar", {});
  const [guardando, setGuardando] = useState("");
  const [verTodos, setVerTodos] = useState(false);

  async function marcar(premio: PremioGanado, entregado: boolean) {
    setGuardando(premio.codigo);
    try {
      const respuesta = await accionAdmin("admin_premio_estado", { codigo: premio.codigo, entregado });
      setDatos(respuesta);
      avisar(entregado ? `${premio.premio}: entregado` : `${premio.premio}: vuelve a «por armar»`);
    } catch (errorGuardado) {
      avisar(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando("");
    }
  }

  if (cargando && !datos) return <Esqueleto filas={2} />;
  if (error && !datos) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  const premios = datos?.premios ?? [];
  const porArmar = premios.filter((premio) => /^Reclamado/i.test(premio.estado) && premio.tipo === "regalo");
  const sinUsar = premios.filter((premio) => premio.estado === "Disponible");
  const lista = verTodos ? premios : porArmar;

  return (
    <Tarjeta className="mb-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-black">
          <Gift size={17} className="text-fuchsia-500" />
          Premios para armar
          {porArmar.length > 0 && (
            <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[11px] font-black text-white">{porArmar.length}</span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <Boton tamano="chico" variante="fantasma" onClick={() => setVerTodos((actual) => !actual)}>
            {verTodos ? "Solo por armar" : `Ver todos (${premios.length})`}
          </Boton>
          <Boton
            tamano="chico"
            variante="fantasma"
            onClick={recargar}
            cargando={recargando}
            icono={<RefreshCw size={14} />}
            aria-label="Actualizar"
            className="w-9 px-0"
          />
        </div>
      </div>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Lo que la gente reclamó con un pedido (premios de la ruleta y canjes de puntos). {sinUsar.length} sin usar todavía.
      </p>

      {lista.length === 0 ? (
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          {verTodos ? "Todavía no hay premios." : "No hay nada por armar. 🎉"}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {lista.map((premio) => {
            const pedido = (premio.estado.match(/(KNT|TND)-\d+/) || [""])[0];
            const entregado = /^Entregado/i.test(premio.estado);
            const reclamado = /^Reclamado/i.test(premio.estado);
            return (
              <li key={premio.codigo + premio.fecha} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-black">{premio.premio}</span>
                    <Chip tono={entregado ? "verde" : reclamado ? "violeta" : premio.estado === "Disponible" ? "azul" : "gris"}>
                      {entregado ? "Entregado" : reclamado ? "Por armar" : premio.estado || "—"}
                    </Chip>
                    <span className="text-[11px] text-[var(--text-muted)]">{premio.origen}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                    {premio.alias || premio.email} · {fechaHora(premio.fecha)} · {premio.codigo}
                    {premio.tipo === "regalo" && premio.detalle && premio.detalle !== premio.premio ? ` · ${premio.detalle}` : ""}
                  </span>
                </span>
                {pedido && (
                  <Link
                    href={`/admin/${pedido.startsWith("TND") ? "tienda" : "pedidos"}/${pedido.startsWith("TND") ? "" : encodeURIComponent(pedido)}`}
                    className="text-xs font-black text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
                  >
                    {pedido}
                  </Link>
                )}
                {premio.tipo === "regalo" && (reclamado || entregado) && (
                  <Boton
                    tamano="chico"
                    variante={entregado ? "fantasma" : "exito"}
                    cargando={guardando === premio.codigo}
                    icono={entregado ? <Undo2 size={13} /> : <Check size={13} />}
                    onClick={() => void marcar(premio, !entregado)}
                  >
                    {entregado ? "Deshacer" : "Entregado"}
                  </Boton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
