"use client";

import { useState } from "react";
import { HandCoins, Undo2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { DineroAFavor, PedidoDetalle } from "@/lib/admin-tipos";
import { Boton, Chip, Hoja, claseInput, pesos, useAvisos } from "@/components/admin/ui";

/*
 * Ficha rápida del pedido y su cliente (se abre tocando el nombre en el pedido):
 * cuándo llegó, cuándo se presupuestó, cuándo y cuánto pagó, la seña, el método…
 * y el dinero a favor: cuánto tiene, cargarle plata (con título o sin) y deshacer.
 * El dinero a favor lo usa al pagar su próximo pedido. Nada de esto manda correos.
 */

/* «22/11/2026 14:08 - Presupuestado» → { fecha: "22/11 14:08", texto: "Presupuestado" } */
function leerLinea(linea: string) {
  const partes = /^(\d{1,2})\/(\d{1,2})\/\d{4}\s+(\d{1,2}:\d{2})\s*-\s*(.+)$/.exec(linea.trim());
  return partes ? { fecha: `${partes[1]}/${partes[2]} ${partes[3]}`, texto: partes[4] } : { fecha: "", texto: linea };
}

function fechaLinda(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso || "—";
  return fecha.toLocaleString("es-UY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Montevideo" });
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text-muted)]">{etiqueta}</span>
      <span className="text-right font-bold">{children}</span>
    </div>
  );
}

export default function FichaCliente({ pedido, abierta, onCerrar }: { pedido: PedidoDetalle; abierta: boolean; onCerrar: () => void }) {
  const pago = pedido.pago;
  const esSena = /^seña/i.test(pago?.modalidad || "");
  const pagado = pago?.confirmado ? Math.max(0, (pago.precioFinal || 0) - (pago.saldoPendiente || 0)) : 0;

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={`${pedido.nombre || "Cliente"} · ${pedido.pedido}`}>
      <div className="space-y-4">
        {/* Contacto */}
        <section>
          <p className="text-xs text-[var(--text-muted)]">{[pedido.email, pedido.whatsapp || pedido.telefonoCuenta].filter(Boolean).join(" · ")}</p>
        </section>

        {/* Cuándo pasó cada cosa */}
        <section className="rounded-2xl border border-[var(--kint-panel-border)] p-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Cuándo</p>
          <Fila etiqueta="Llegó">{fechaLinda(pedido.fecha)}</Fila>
          {pedido.entrega && <Fila etiqueta="Entrega pedida">{pedido.entrega.split("-").reverse().join("/")}</Fila>}
          {pedido.historial.filter((linea, indice, todas) => todas.indexOf(linea) === indice).map((linea, indice) => {
            const { fecha, texto } = leerLinea(linea);
            return (
              <Fila key={`${linea}-${indice}`} etiqueta={texto}>
                {fecha || "—"}
              </Fila>
            );
          })}
        </section>

        {/* La plata */}
        {pago && pago.precioFinal > 0 && (
          <section className="rounded-2xl border border-[var(--kint-panel-border)] p-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Pago</p>
            {pago.precioOriginal > 0 && pago.precioOriginal !== pago.precioFinal && <Fila etiqueta="Precio sin descuento">{pesos(pago.precioOriginal)}</Fila>}
            {pedido.codigoDescuento && <Fila etiqueta="Código">{`${pedido.codigoDescuento}${pedido.descuento ? ` (${pedido.descuento}%)` : ""}`}</Fila>}
            <Fila etiqueta="Precio final">{pesos(pago.precioFinal)}</Fila>
            <Fila etiqueta="Modalidad">{pago.modalidad || "Sin elegir"}</Fila>
            {esSena && <Fila etiqueta="Seña">{pesos(pago.importe)}</Fila>}
            <Fila etiqueta="Método">{pago.metodo || "Sin elegir"}</Fila>
            <Fila etiqueta="Pagó">
              <span className={pagado ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}>{pagado ? pesos(pagado) : "Nada todavía"}</span>
            </Fila>
            {pago.saldoPendiente > 0 && (
              <Fila etiqueta="Falta">
                <span className="text-red-600 dark:text-red-400">{pesos(pago.saldoPendiente)}</span>
              </Fila>
            )}
            {pago.estado && <Fila etiqueta="Estado del pago">{pago.estado}</Fila>}
          </section>
        )}

        {pedido.email && <DineroAFavorAdmin email={pedido.email} pedido={pedido.pedido} pagado={pagado} />}
      </div>
    </Hoja>
  );
}

/* Dinero a favor del cliente: saldo, movimientos (con deshacer) y cargar plata. */
function DineroAFavorAdmin({ email, pedido, pagado }: { email: string; pedido: string; pagado: number }) {
  const avisar = useAvisos();
  const { datos, setDatos, cargando } = useDatosAdmin("admin_dinero_favor_ver", { email }, email);
  const [titulo, setTitulo] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState("");

  const numero = Math.round(Number(monto) || 0);

  async function cargar() {
    setGuardando("cargar");
    try {
      const respuesta = await accionAdmin("admin_dinero_favor_cargar", { email, monto: numero, titulo: titulo.trim(), pedido });
      setDatos(respuesta as DineroAFavor);
      avisar(respuesta.aviso);
      setTitulo("");
      setMonto("");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando("");
    }
  }

  async function deshacer(id: string) {
    setGuardando(id);
    try {
      const respuesta = await accionAdmin("admin_dinero_favor_deshacer", { email, id });
      setDatos(respuesta as DineroAFavor);
      avisar(respuesta.aviso);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo deshacer.", "error");
    } finally {
      setGuardando("");
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-black">
          <HandCoins size={16} className="text-emerald-600" />
          Dinero a favor
        </p>
        <p className="text-xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">{cargando && !datos ? "…" : pesos(datos?.saldo ?? 0)}</p>
      </div>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">
        Plata que le dejás para su próximo pedido. Cuando vaya a pagar le aparece «Tenés $X de dinero a favor, ¿querés usarlo?». No le
        llega ningún correo.
      </p>

      {/* Cargar */}
      <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
        <input
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value.slice(0, 120))}
          placeholder="Título (opcional), ej. No retiró la maqueta"
          aria-label="Título"
          className={`${claseInput} h-10`}
        />
        <span className={`${claseInput} flex h-10 items-center gap-1`}>
          <span className="text-[var(--text-muted)]">$</span>
          <input
            value={monto}
            onChange={(evento) => setMonto(evento.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder={pagado ? String(Math.round(pagado / 2)) : "0"}
            aria-label="Monto a favor"
            className="h-full w-full min-w-0 bg-transparent outline-none"
          />
        </span>
        <Boton variante="exito" tamano="chico" className="h-10" disabled={!(numero > 0) || Boolean(guardando)} cargando={guardando === "cargar"} onClick={() => void cargar()}>
          {numero > 0 ? `Dejar ${pesos(numero)} a favor` : "Dejar a favor"}
        </Boton>
      </div>
      {pagado > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[0.5, 1].map((parte) => (
            <button
              key={parte}
              type="button"
              onClick={() => setMonto(String(Math.round(pagado * parte)))}
              className="rounded-full border border-emerald-600/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              {parte === 1 ? "Todo lo que pagó" : "La mitad"} ({pesos(Math.round(pagado * parte))})
            </button>
          ))}
        </div>
      )}

      {/* Movimientos */}
      {(datos?.movimientos.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1.5">
          {datos!.movimientos.map((movimiento) => {
            const deshecho = movimiento.estado === "Deshecho";
            return (
              <li key={movimiento.id} className={`flex items-center gap-2 rounded-xl bg-[var(--kint-panel)] px-2.5 py-2 text-xs ${deshecho ? "opacity-50" : ""}`}>
                <Chip tono={movimiento.monto >= 0 ? "verde" : "ambar"}>{movimiento.tipo}</Chip>
                <span className="min-w-0 flex-1 truncate">
                  <span className={deshecho ? "line-through" : "font-bold"}>{movimiento.titulo || (movimiento.pedido ? `Por ${movimiento.pedido}` : "Sin título")}</span>
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {fechaLinda(movimiento.fecha)}
                    {movimiento.pedido && movimiento.titulo ? ` · ${movimiento.pedido}` : ""}
                    {deshecho ? " · deshecho" : ""}
                  </span>
                </span>
                <span className={`font-black tabular-nums ${movimiento.monto >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`}>
                  {movimiento.monto >= 0 ? "+" : "−"}
                  {pesos(Math.abs(movimiento.monto))}
                </span>
                {!deshecho && movimiento.tipo === "A favor" && (
                  <button
                    type="button"
                    aria-label="Deshacer"
                    title="Deshacer"
                    disabled={Boolean(guardando)}
                    onClick={() => void deshacer(movimiento.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-red-600 disabled:opacity-40"
                  >
                    <Undo2 size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
