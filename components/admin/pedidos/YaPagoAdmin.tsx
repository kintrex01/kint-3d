"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type { PedidoDetalle } from "@/lib/admin-tipos";
import { Boton, Hoja, pesos, useAvisos } from "@/components/admin/ui";

/*
 * «Ya pagó»: marcar el pago sin que el cliente haya subido el comprobante
 * (pagó en efectivo, o mandó el comprobante por WhatsApp). Usa lo mismo que
 * «Confirmar pago» / «Confirmar saldo», así entra a la Caja y el cliente
 * recibe el aviso de pago confirmado como siempre.
 */

type Parte = "sena" | "todo" | "saldo" | "pago";

export function YaPagoAdmin({ pedido, onActualizado }: { pedido: PedidoDetalle; onActualizado: (pedido: PedidoDetalle) => void }) {
  const avisar = useAvisos();
  const pago = pedido.pago;
  const [abierto, setAbierto] = useState(false);
  const [parte, setParte] = useState<Parte>("pago");
  const [metodo, setMetodo] = useState<"Efectivo" | "Transferencia">("Efectivo");
  const [guardando, setGuardando] = useState(false);

  if (!pago || !(pago.precioFinal > 0)) return null;
  const esSena = /^seña/i.test(pago.modalidad || "");
  const saldo = Math.max(0, pago.saldoPendiente || 0);
  const pagoEntero = pago.confirmado && (!esSena || pago.saldoConfirmado || saldo <= 0);
  if (pagoEntero) return null;

  // Qué puede marcar ahora.
  const opciones: { parte: Parte; titulo: string; monto: number }[] = !pago.confirmado
    ? esSena
      ? [
          { parte: "sena", titulo: "Pagó la seña", monto: pago.importe },
          { parte: "todo", titulo: "Pagó todo", monto: pago.precioFinal },
        ]
      : [{ parte: "pago", titulo: "Pagó el total", monto: pago.precioFinal }]
    : [{ parte: "saldo", titulo: "Pagó el saldo", monto: saldo }];
  const elegida = opciones.find((opcion) => opcion.parte === parte) ?? opciones[0];

  function abrir() {
    setParte(opciones[0].parte);
    setMetodo(/transfer/i.test(pago?.metodo || "") ? "Transferencia" : "Efectivo");
    setAbierto(true);
  }

  async function confirmar() {
    setGuardando(true);
    try {
      let actualizado = pedido;
      if (elegida.parte !== "saldo") {
        const respuesta = await accionAdmin("admin_pago_confirmar", { pedido: pedido.pedido, metodo });
        actualizado = respuesta.pedido;
      }
      if (elegida.parte === "saldo" || elegida.parte === "todo") {
        const respuesta = await accionAdmin("admin_saldo_confirmar", { pedido: pedido.pedido });
        actualizado = respuesta.pedido;
      }
      onActualizado(actualizado);
      avisar(`${pedido.pedido}: anotado que pagó ${pesos(elegida.monto)}`);
      setAbierto(false);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo marcar el pago.", "error");
    } finally {
      setGuardando(false);
    }
  }

  const chip = (activo: boolean) =>
    `rounded-xl border px-3 py-2.5 text-left transition ${
      activo ? "border-emerald-600 bg-emerald-500/10" : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
    }`;

  return (
    <>
      <Boton className="w-full" icono={<BadgeCheck size={16} />} onClick={abrir}>
        {pago.confirmado ? "Ya pagó el saldo" : "Ya pagó"}
      </Boton>
      <p className="-mt-1 text-center text-[11px] text-[var(--text-muted)]">Si te pagó en efectivo o te mandó el comprobante por WhatsApp.</p>

      <Hoja
        abierta={abierto}
        onCerrar={() => !guardando && setAbierto(false)}
        titulo={`Ya pagó · ${pedido.pedido}`}
        pie={
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" tamano="chico" disabled={guardando} onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton variante="exito" tamano="chico" cargando={guardando} onClick={() => void confirmar()}>
              {`Sí, pagó ${pesos(elegida.monto)}`}
            </Boton>
          </div>
        }
      >
        <div className="space-y-4">
          {opciones.length > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-[var(--text-muted)]">¿Cuánto te pagó?</p>
              <div className="grid grid-cols-2 gap-2">
                {opciones.map((opcion) => (
                  <button key={opcion.parte} type="button" aria-pressed={elegida.parte === opcion.parte} onClick={() => setParte(opcion.parte)} className={chip(elegida.parte === opcion.parte)}>
                    <span className="block text-sm font-bold">{opcion.titulo}</span>
                    <span className="block text-lg font-black tabular-nums">{pesos(opcion.monto)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {opciones.length === 1 && (
            <p className="text-sm">
              {elegida.titulo}: <b className="text-lg tabular-nums">{pesos(elegida.monto)}</b>
            </p>
          )}

          {elegida.parte !== "saldo" && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-[var(--text-muted)]">¿Cómo pagó?</p>
              <div className="grid grid-cols-2 gap-2">
                {(["Efectivo", "Transferencia"] as const).map((opcion) => (
                  <button key={opcion} type="button" aria-pressed={metodo === opcion} onClick={() => setMetodo(opcion)} className={chip(metodo === opcion)}>
                    <span className="block text-sm font-bold">{opcion}</span>
                  </button>
                ))}
              </div>
              {pago.metodo && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Había elegido «{pago.metodo}» en la web: queda ese.</p>}
            </div>
          )}

          <p className="text-xs leading-5 text-[var(--text-muted)]">
            Es lo mismo que confirmar el comprobante: entra a la Caja
            {elegida.parte !== "saldo" ? " y el pedido pasa a «Pago confirmado» (le llega el aviso de pago por correo)" : ""}.
          </p>
        </div>
      </Hoja>
    </>
  );
}
