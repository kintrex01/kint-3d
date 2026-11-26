"use client";

import { useState } from "react";
import { Check, ExternalLink, MessageCircle, Plus, Undo2, X } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { CobroExtra, CobrosExtra } from "@/lib/admin-tipos";
import { Boton, Chip, Tarjeta, claseInput, linkWhatsapp, pesos, useAvisos } from "@/components/admin/ui";
import { linkSeguimiento } from "@/lib/whatsapp-etapas";

/*
 * Cobrar algo más a un pedido ya cotizado o pago (ej. se olvidó una pieza)
 * sin crear otro pedido. Le aparece en su seguimiento para transferir y
 * subir el comprobante; acá se valida (entra solo a la Caja).
 * No manda correos al cliente: se le avisa por WhatsApp con el botón.
 */

const TONO: Record<CobroExtra["estado"], "ambar" | "azul" | "verde" | "gris"> = {
  Pendiente: "ambar",
  "Por validar": "azul",
  Pagado: "verde",
  Anulado: "gris",
};

function fechaCorta(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString("es-UY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Montevideo" });
}

export function CobrosExtraAdmin({
  pedido,
  nombre,
  telefono,
  codigo,
  onCambio,
}: {
  pedido: string;
  nombre: string;
  telefono: string;
  codigo: string;
  onCambio?: () => void;
}) {
  const avisar = useAvisos();
  const { datos, setDatos, cargando } = useDatosAdmin("admin_cobros_extra_ver", { pedido }, pedido);
  const [abierto, setAbierto] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState("");

  const numero = Math.round(Number(monto) || 0);
  const cobros = (datos?.cobros ?? []).filter((cobro) => cobro.estado !== "Anulado");
  const anulados = (datos?.cobros ?? []).length - cobros.length;

  function mensaje(cobro: CobroExtra) {
    const primero = nombre.trim().split(/\s+/)[0] || "";
    return `¡Hola${primero ? ` ${primero}` : ""}! Te sumé a tu pedido ${pedido}: ${cobro.concepto} ($${cobro.monto.toLocaleString("es-UY")}). Lo podés pagar y subir el comprobante acá: ${linkSeguimiento(pedido, codigo)}#cobros-extra`;
  }

  async function ejecutar(clave: string, trabajo: () => Promise<CobrosExtra>) {
    setGuardando(clave);
    try {
      const respuesta = await trabajo();
      setDatos(respuesta);
      if (respuesta.aviso) avisar(respuesta.aviso);
      onCambio?.();
      return true;
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
      return false;
    } finally {
      setGuardando("");
    }
  }

  async function crear() {
    const ok = await ejecutar("crear", () => accionAdmin("admin_cobro_extra_crear", { pedido, concepto: concepto.trim(), monto: numero }));
    if (ok) {
      setConcepto("");
      setMonto("");
      setAbierto(false);
    }
  }

  function cambiarEstado(cobro: CobroExtra, estado: "Pagado" | "Pendiente" | "Anulado") {
    if (estado === "Anulado" && !window.confirm(`¿Anular «${cobro.concepto}» (${pesos(cobro.monto)})? Ya no le va a aparecer para pagar.`)) return;
    void ejecutar(cobro.id, () => accionAdmin("admin_cobro_extra_estado", { id: cobro.id, estado }));
  }

  return (
    <Tarjeta className="p-4">
      <p className="text-xs leading-5 text-[var(--text-muted)]">
        Para cobrarle algo que se olvidó (una pieza, un cambio…) sin hacer otro pedido. Le aparece en su seguimiento para transferir y
        subir el comprobante. No le llega correo: avisale por WhatsApp.
      </p>

      {cargando && !datos && <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando…</p>}

      {cobros.length > 0 && (
        <ul className="mt-3 space-y-2">
          {cobros.map((cobro) => {
            const whatsapp = linkWhatsapp(telefono, mensaje(cobro));
            const ocupado = guardando === cobro.id;
            return (
              <li key={cobro.id} className="rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{cobro.concepto}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {cobro.id} · {fechaCorta(cobro.fecha)}
                      {cobro.estado === "Pagado" && cobro.fechaPagado ? ` · validado ${fechaCorta(cobro.fechaPagado)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-base font-black tabular-nums ${cobro.estado === "Pagado" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {pesos(cobro.monto)}
                    </p>
                    <Chip tono={TONO[cobro.estado]}>{cobro.estado === "Por validar" ? "Subió el comprobante" : cobro.estado === "Pendiente" ? "Sin pagar" : cobro.estado}</Chip>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {cobro.comprobante && (
                    <a
                      href={cobro.comprobante}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--kint-panel-border)] px-2.5 text-xs font-bold hover:border-[var(--kint-selected-border)]"
                    >
                      <ExternalLink size={13} /> Ver comprobante
                    </a>
                  )}
                  {cobro.estado !== "Pagado" && (
                    <Boton tamano="chico" variante="exito" icono={<Check size={14} />} cargando={ocupado} disabled={Boolean(guardando)} onClick={() => cambiarEstado(cobro, "Pagado")}>
                      {cobro.estado === "Por validar" ? "Validar pago" : "Marcar pagado"}
                    </Boton>
                  )}
                  {cobro.estado === "Pagado" && (
                    <Boton tamano="chico" variante="fantasma" icono={<Undo2 size={14} />} cargando={ocupado} disabled={Boolean(guardando)} onClick={() => cambiarEstado(cobro, "Pendiente")}>
                      Deshacer
                    </Boton>
                  )}
                  {cobro.estado === "Pendiente" && whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#25d366] px-2.5 text-xs font-bold text-white hover:brightness-95"
                    >
                      <MessageCircle size={13} /> Avisarle
                    </a>
                  )}
                  {cobro.estado !== "Pagado" && (
                    <button
                      type="button"
                      disabled={Boolean(guardando)}
                      onClick={() => cambiarEstado(cobro, "Anulado")}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--text-muted)] hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={13} /> Anular
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {anulados > 0 && <p className="mt-2 text-[11px] text-[var(--text-muted)]">{anulados === 1 ? "1 cobro anulado" : `${anulados} cobros anulados`} (no se muestran).</p>}

      {abierto ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px]">
          <input
            value={concepto}
            onChange={(evento) => setConcepto(evento.target.value.slice(0, 120))}
            placeholder="Qué le cobrás, ej. Pieza que faltaba (escalera)"
            aria-label="Concepto"
            autoFocus
            className={`${claseInput} h-10`}
          />
          <span className={`${claseInput} flex h-10 items-center gap-1`}>
            <span className="text-[var(--text-muted)]">$</span>
            <input
              value={monto}
              onChange={(evento) => setMonto(evento.target.value.replace(/\D/g, "").slice(0, 7))}
              inputMode="numeric"
              placeholder="0"
              aria-label="Monto"
              className="h-full w-full min-w-0 bg-transparent outline-none"
            />
          </span>
          <div className="flex gap-2 sm:col-span-2">
            <Boton tamano="chico" variante="fantasma" disabled={guardando === "crear"} onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton
              tamano="chico"
              variante="principal"
              cargando={guardando === "crear"}
              disabled={!concepto.trim() || !(numero > 0)}
              onClick={() => void crear()}
            >
              {numero > 0 ? `Cobrarle ${pesos(numero)}` : "Cobrarle"}
            </Boton>
          </div>
        </div>
      ) : (
        <Boton tamano="chico" className="mt-3" icono={<Plus size={14} />} onClick={() => setAbierto(true)}>
          Cobrar un extra
        </Boton>
      )}
    </Tarjeta>
  );
}
