"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, MessageCircle, Package, PackageCheck, RefreshCw, ShoppingBag, Truck, Undo2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { PedidoGeneral } from "@/lib/admin-tipos";
import { mensajeFadu } from "@/lib/whatsapp-etapas";
import {
  Boton,
  CajaError,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Vacio,
  claseInput,
  fechaDia,
  linkWhatsapp,
  pesos,
  useAvisos,
  FranjaUrgente,
  MarcaUrgente,
  claseUrgente,
} from "@/components/admin/ui";

/*
 * Modo reparto: los pedidos listos para entregar (maquetas «Terminado», tienda «Listo»).
 * - Tick «Guardado» (empaquetado): solo para vos, queda en la planilla (hoja Reparto).
 * - «Estoy en FADU»: abre su WhatsApp con el mensaje (Configuración › Whatsapp › Whatsapp fadu),
 *   con «hasta las …» si lo pusiste y lo que falta cobrar si debe plata.
 * - «Entregado»: lo marca de un toque (igual que desde el pedido); se puede deshacer.
 */

const SIN_DATOS = {};
const CLAVE_HASTA = "kint-reparto-hasta";

function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });
}

/* 0 = para hoy (o atrasado) · 1 = próximos días · 2 = sin fecha */
function grupoEntrega(pedido: PedidoGeneral, hoy: string) {
  if (!pedido.entrega) return 2;
  return pedido.entrega <= hoy ? 0 : 1;
}
const TITULOS = ["Para hoy", "Próximos días", "Sin fecha de entrega"];

function listo(pedido: PedidoGeneral) {
  return pedido.tipo === "maqueta" ? pedido.estado === "Terminado" : pedido.estado === "Listo";
}

export default function Reparto() {
  const avisar = useAvisos();
  const { datos, setDatos, error, cargando, recargando, recargar } = useDatosAdmin("admin_todos_listar", SIN_DATOS);
  const [hasta, setHasta] = useState("");
  const [plantilla, setPlantilla] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [confirmar, setConfirmar] = useState<PedidoGeneral | null>(null);
  // Lo entregado desde acá (para poder deshacer).
  const [entregados, setEntregados] = useState<PedidoGeneral[]>([]);

  // «Hasta las…» se recuerda en este dispositivo; el mensaje sale de Configuración.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_HASTA) || "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setHasta(guardado);
    } catch {}
    let activo = true;
    fetch("/api/configuracion")
      .then((respuesta) => respuesta.json())
      .then((data) => activo && setPlantilla(String(data?.configuracion?.whatsapp_fadu?.valor || "")))
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  const hoy = hoyISO();
  const pedidos = useMemo(
    () =>
      (datos?.pedidos ?? [])
        .filter(listo)
        .sort(
          (a, b) =>
            grupoEntrega(a, hoy) - grupoEntrega(b, hoy) ||
            (a.entrega || "").localeCompare(b.entrega || "") ||
            a.pedido.localeCompare(b.pedido)
        ),
    [datos, hoy]
  );
  const guardados = pedidos.filter((pedido) => pedido.guardado).length;

  function cambiarHasta(valor: string) {
    setHasta(valor);
    try {
      localStorage.setItem(CLAVE_HASTA, valor);
    } catch {}
  }

  function actualizar(numero: string, cambios: Partial<PedidoGeneral>) {
    setDatos((actual) =>
      actual ? { ...actual, pedidos: actual.pedidos.map((pedido) => (pedido.pedido === numero ? { ...pedido, ...cambios } : pedido)) } : actual
    );
  }

  async function tildar(pedido: PedidoGeneral) {
    const guardado = !pedido.guardado;
    actualizar(pedido.pedido, { guardado: guardado ? new Date().toISOString() : "" });
    try {
      await accionAdmin("admin_reparto_guardar", { pedido: pedido.pedido, guardado });
    } catch (problema) {
      actualizar(pedido.pedido, { guardado: pedido.guardado });
      avisar(problema instanceof Error ? problema.message : "No se pudo guardar.", "error");
    }
  }

  async function entregar(pedido: PedidoGeneral) {
    setConfirmar(null);
    setOcupado(pedido.pedido);
    try {
      if (pedido.tipo === "maqueta") await accionAdmin("admin_pedido_estado", { pedido: pedido.pedido, estado: "Entregado" });
      else await accionAdmin("admin_tienda_estado", { pedido: pedido.pedido, estado: "Entregado", notificar: true });
      actualizar(pedido.pedido, { estado: "Entregado" });
      setEntregados((actual) => [pedido, ...actual]);
      avisar(`${pedido.pedido} entregado`);
    } catch (problema) {
      avisar(problema instanceof Error ? problema.message : "No se pudo marcar.", "error");
    } finally {
      setOcupado("");
    }
  }

  // Vuelve a «listo» sin avisarle nada al cliente.
  async function deshacer(pedido: PedidoGeneral) {
    setOcupado(pedido.pedido);
    try {
      if (pedido.tipo === "maqueta") await accionAdmin("admin_pedido_estado", { pedido: pedido.pedido, estado: "Terminado", avisar: false });
      else await accionAdmin("admin_tienda_estado", { pedido: pedido.pedido, estado: "Listo", notificar: false });
      actualizar(pedido.pedido, { estado: pedido.estado });
      setEntregados((actual) => actual.filter((otro) => otro.pedido !== pedido.pedido));
      avisar(`${pedido.pedido} volvió a «para entregar»`);
    } catch (problema) {
      avisar(problema instanceof Error ? problema.message : "No se pudo deshacer.", "error");
    } finally {
      setOcupado("");
    }
  }

  return (
    <>
      <Encabezado
        titulo="Reparto"
        subtitulo="Lo que está listo para entregar: guardalo, avisá que estás en FADU y marcalo entregado."
        accion={
          datos && (
            <Boton variante="fantasma" onClick={recargar} cargando={recargando} icono={<RefreshCw size={16} />} aria-label="Actualizar" className="w-11 px-0" />
          )
        }
      />

      {/* Hasta qué hora estás (va en el mensaje) */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-3">
        <Truck size={20} className="text-emerald-500" />
        <label className="flex items-center gap-2 text-sm font-bold">
          Estoy en FADU hasta las
          <input type="time" value={hasta} onChange={(evento) => cambiarHasta(evento.target.value)} className={`${claseInput} h-9 w-28`} aria-label="Hasta qué hora" />
        </label>
        {hasta && (
          <button type="button" onClick={() => cambiarHasta("")} className="text-xs font-bold text-[var(--text-muted)] hover:text-red-600">
            Sin hora
          </button>
        )}
        {pedidos.length > 0 && (
          <span className="ml-auto text-xs font-bold text-[var(--text-muted)]">
            {pedidos.length} para entregar · {guardados} guardados
          </span>
        )}
      </div>

      {error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : cargando && !datos ? (
        <Esqueleto filas={4} />
      ) : pedidos.length === 0 ? (
        <Vacio icono={<PackageCheck size={30} strokeWidth={1.5} />} titulo="Nada para entregar" texto="Cuando una maqueta esté Terminada (o una compra Lista), aparece acá." />
      ) : (
        <ul className="space-y-2.5">
          {pedidos.map((pedido, indice) => {
            const grupo = grupoEntrega(pedido, hoy);
            const titulo = indice === 0 || grupoEntrega(pedidos[indice - 1], hoy) !== grupo;
            const cobrar = pedido.debe ?? 0;
            const whatsapp = pedido.whatsapp
              ? linkWhatsapp(pedido.whatsapp, mensajeFadu({ nombre: pedido.cliente, pedido: pedido.pedido, hasta, cobrar: pedido.revisar ? 0 : cobrar }, plantilla))
              : "";
            const atrasado = pedido.entrega && pedido.entrega < hoy;
            return (
              <li key={pedido.pedido}>
                {titulo && (
                  <p className={`mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] ${indice ? "mt-5" : ""}`}>
                    {TITULOS[grupo]} · {pedidos.filter((otro) => grupoEntrega(otro, hoy) === grupo).length}
                  </p>
                )}
                <div
                  className={`flex items-stretch gap-3 rounded-2xl border p-3 transition ${
                    pedido.guardado ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)]"
                  } ${pedido.urgente ? `${claseUrgente} pl-4` : ""}`}
                >
                  {pedido.urgente && <FranjaUrgente />}
                  {/* Tick: guardado / empaquetado */}
                  <button
                    type="button"
                    onClick={() => void tildar(pedido)}
                    aria-pressed={Boolean(pedido.guardado)}
                    aria-label={pedido.guardado ? "Marcar como no guardado" : "Marcar como guardado"}
                    className={`flex w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 text-[10px] font-black uppercase transition ${
                      pedido.guardado
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-dashed border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-emerald-500"
                    }`}
                  >
                    {pedido.guardado ? <Check size={22} strokeWidth={3} /> : <Package size={20} />}
                    {pedido.guardado ? "Guardado" : "Guardar"}
                  </button>

                  {/* Datos */}
                  <Link href={pedido.tipo === "maqueta" ? `/admin/pedidos/${pedido.pedido}` : `/admin/tienda/${pedido.pedido}`} className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-black">{pedido.pedido}</span>
                      {pedido.urgente && <MarcaUrgente className="self-center" />}
                      <span className="truncate font-bold">{pedido.cliente}</span>
                    </p>
                    {pedido.detalle && <p className="text-xs text-[var(--text-muted)]">{pedido.detalle}</p>}
                    <p className="truncate text-xs text-[var(--text-muted)]">{pedido.whatsapp || "Sin celular"}</p>
                    {pedido.extras && <p className="truncate text-xs font-bold text-amber-600 dark:text-amber-400">+ {pedido.extras}</p>}
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold">
                      {pedido.entrega && (
                        <span className={atrasado ? "text-red-600 dark:text-red-400" : "text-[var(--text-muted)]"}>
                          {atrasado ? "Atrasado · " : ""}Entrega {fechaDia(pedido.entrega)}
                        </span>
                      )}
                      {cobrar > 0 && !pedido.revisar && <span className="text-red-600 dark:text-red-400">Cobrar {pesos(cobrar)}</span>}
                      {pedido.revisar && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                          {pedido.revisar === "saldo" ? `Subió el comprobante del saldo (${pesos(cobrar)})` : pedido.revisar === "extra" ? "Subió el comprobante del extra" : "Subió el comprobante"} · tocá para validarlo
                        </span>
                      )}
                    </p>
                  </Link>

                  {/* Avisar y entregar */}
                  <div className="flex w-32 shrink-0 flex-col justify-center gap-1.5 sm:w-40">
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-2 text-xs font-black text-white transition hover:brightness-95"
                      >
                        <MessageCircle size={15} />
                        Estoy en FADU
                      </a>
                    ) : (
                      <span className="flex h-10 items-center justify-center rounded-xl border border-dashed border-[var(--kint-panel-border)] px-2 text-center text-[10px] font-bold text-[var(--text-muted)]">
                        Sin WhatsApp
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={ocupado === pedido.pedido}
                      onClick={() => (cobrar > 0 ? setConfirmar(pedido) : void entregar(pedido))}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--kint-panel-border)] px-2 text-xs font-black transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {ocupado === pedido.pedido ? "…" : "Entregado"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Entregados ahora (por si te equivocaste) */}
      {entregados.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Entregados ahora</p>
          <ul className="space-y-1.5">
            {entregados.map((pedido) => (
              <li key={pedido.pedido} className="flex items-center gap-3 rounded-xl border border-[var(--kint-panel-border)] px-3 py-2 text-sm">
                <ShoppingBag size={15} className="text-emerald-500" />
                <span className="min-w-0 flex-1 truncate">
                  <strong>{pedido.pedido}</strong> · {pedido.cliente}
                </span>
                <Boton tamano="chico" variante="fantasma" icono={<Undo2 size={14} />} disabled={ocupado === pedido.pedido} onClick={() => void deshacer(pedido)}>
                  Deshacer
                </Boton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DialogoConfirmar
        abierto={Boolean(confirmar)}
        titulo={`¿Ya te pagó ${confirmar ? pesos(confirmar.debe ?? 0) : ""}?`}
        mensaje={
          <p>
            {confirmar?.cliente} todavía debe {confirmar ? pesos(confirmar.debe ?? 0) : ""}. Si ya te pagó, confirmá el pago en el pedido; igual lo podés marcar entregado.
          </p>
        }
        textoConfirmar="Marcar entregado igual"
        onCancelar={() => setConfirmar(null)}
        onConfirmar={() => confirmar && void entregar(confirmar)}
      />
    </>
  );
}
