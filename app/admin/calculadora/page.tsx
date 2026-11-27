"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink, Search, Send, X } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { PedidoResumen } from "@/lib/admin-tipos";
import Calculadora, { type CalculoActual } from "@/components/admin/calculadora/Calculadora";
import {
  Boton,
  Chip,
  Encabezado,
  Tarjeta,
  claseInput,
  pesos,
  textoEstado,
  tonoEstado,
  useAvisos,
} from "@/components/admin/ui";
import { coincide, estaCancelado } from "@/components/admin/pedidos/utilidades";
import { colorFilamento } from "@/lib/colores-filamento";

/*
 * Calculadora: se calcula el precio y, con un toque, se agrega como
 * opción al presupuesto de un pedido (admin_presupuesto_guardar). Si el
 * pedido está en «Recibido», «Agregar y enviar» además lo pasa a
 * «Presupuestado» (admin_pedido_estado), que le manda el correo al cliente,
 * sin entrar al pedido. Corre en segundo plano.
 */

const OPCIONES = ["Recomendada", "Premium", "Barata"];
const ESTADOS_LIBRES = ["Recibido", "Presupuestado"];

type Agregado = { pedido: string; nombre: string; opcion: string; precio: number; extra?: boolean };

export default function CalculadoraAdmin() {
  return (
    <>
      <Encabezado
        titulo="Calculadora"
        subtitulo="Calculá el costo real y mandalo como presupuesto a un pedido"
      />
      <Calculadora extraIzquierda={(calculo) => <AgregarAPedido calculo={calculo} />} />
    </>
  );
}

function AgregarAPedido({ calculo }: { calculo: CalculoActual }) {
  const avisar = useAvisos();
  const { datos } = useDatosAdmin("admin_pedidos_listar", {});
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState("");
  const [opcion, setOpcion] = useState("Recomendada");
  const [descripcion, setDescripcion] = useState("");
  const [precioTexto, setPrecioTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [agregados, setAgregados] = useState<Agregado[]>([]);
  // Pedidos a los que ya se les mandó el presupuesto desde acá.
  const [enviados, setEnviados] = useState<string[]>([]);

  // Primero los que esperan presupuesto; después el resto, los más nuevos arriba.
  const pedidos = useMemo(() => {
    const lista = (datos?.pedidos ?? []).filter(
      (pedido) => !estaCancelado(pedido.estado) && pedido.estado !== "Entregado"
    );
    return lista.sort(
      (a, b) =>
        Number(ESTADOS_LIBRES.includes(b.estado)) - Number(ESTADOS_LIBRES.includes(a.estado)) ||
        b.pedido.localeCompare(a.pedido)
    );
  }, [datos]);

  const visibles = pedidos.filter((pedido) => coincide(busqueda, pedido.pedido, pedido.nombre, pedido.email));
  const pedido = pedidos.find((item) => item.pedido === elegido) ?? null;
  // El precio sugerido es el redondeado; se puede cambiar a mano.
  const precio = precioTexto.trim() ? Number(precioTexto.replace(",", ".")) : calculo.resultado.redondeado;
  const avanzado = Boolean(pedido && !ESTADOS_LIBRES.includes(pedido.estado));
  // Ya pagó o se está imprimiendo: lo normal es cobrarlo como extra (le aparece en su seguimiento para pagar).
  // Lo que eligió vale para ese pedido; al cambiar de pedido vuelve a lo normal.
  const [modoElegido, setModoElegido] = useState<{ pedido: string; modo: "extra" | "presupuesto" } | null>(null);
  const comoExtra = avanzado && !(modoElegido?.pedido === elegido && modoElegido.modo === "presupuesto");
  const conceptoExtra =
    descripcion.trim() ||
    ["Pieza extra", [calculo.tiempo !== "0 min" ? calculo.tiempo : "", calculo.pieza.gramos > 0 ? `${Math.round(calculo.pieza.gramos)} g` : ""].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" · ");

  /* Cobro extra (CobrosExtra): no toca el presupuesto; el cliente lo paga aparte desde su seguimiento. */
  async function cobrarExtra() {
    if (!pedido) return;
    if (!(precio > 0)) {
      avisar("Poné un precio mayor a 0.", "error");
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_cobro_extra_crear", { pedido: pedido.pedido, concepto: conceptoExtra, monto: Math.round(precio) });
      setAgregados([{ pedido: pedido.pedido, nombre: pedido.nombre, opcion: `Extra: ${conceptoExtra}`, precio: Math.round(precio), extra: true }, ...agregados]);
      avisar(`${pedido.pedido}: ${respuesta.aviso || "cobro extra cargado"}`);
      setDescripcion("");
      setPrecioTexto("");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo cargar el cobro.", "error");
    } finally {
      setGuardando(false);
    }
  }

  /* Pasa el pedido a «Presupuestado»: el cliente recibe el correo con las opciones. */
  function enviarPresupuesto(numero: string) {
    setEnviados((lista) => [...lista, numero]);
    avisar(`Enviando el presupuesto de ${numero}… podés seguir.`);
    accionAdmin("admin_pedido_estado", { pedido: numero, estado: "Presupuestado" })
      .then((respuesta) => avisar(`${numero}: ${respuesta.aviso || "presupuesto enviado al cliente"}`))
      .catch((error) => {
        setEnviados((lista) => lista.filter((item) => item !== numero));
        avisar(`${numero}: ${error instanceof Error ? error.message : "no se pudo enviar."}`, "error");
      });
  }

  async function agregar(yEnviar = false) {
    if (!pedido) return;
    if (!(precio > 0)) {
      avisar("Poné un precio mayor a 0.", "error");
      return;
    }
    if (avanzado && !confirmar) {
      setConfirmar(true);
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_presupuesto_guardar", {
        pedido: pedido.pedido,
        index: null,
        opcion: {
          opcion: opcion.trim() || "Recomendada",
          descripcion: descripcion.trim(),
          tiempo: calculo.tiempo === "0 min" ? "" : calculo.tiempo,
          filamento: calculo.pieza.gramos > 0 ? String(Math.round(calculo.pieza.gramos)) : "",
          precioBase: Math.round(precio),
        },
        confirmar: avanzado ? true : undefined,
      });
      setAgregados([
        { pedido: pedido.pedido, nombre: pedido.nombre, opcion: opcion.trim(), precio: Math.round(precio) },
        ...agregados,
      ]);
      avisar(respuesta.aviso || `Agregado al presupuesto de ${pedido.pedido}`);
      if (yEnviar) enviarPresupuesto(pedido.pedido);
      setDescripcion("");
      setPrecioTexto("");
      setConfirmar(false);
      // La siguiente suele ser otra opción del mismo pedido.
      const siguiente = OPCIONES[(OPCIONES.indexOf(opcion) + 1) % OPCIONES.length];
      if (OPCIONES.includes(opcion)) setOpcion(siguiente);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo agregar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="p-4">
      <p className="text-sm font-black">Agregar al presupuesto de un pedido</p>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">
        Elegí el pedido y tocá «Agregar y enviar»: se suma la opción y el cliente recibe el presupuesto. Si querés varias opciones (Recomendada, Premium, Barata…), agregalas y mandá al final.
      </p>

      {/* Pedido */}
      {pedido ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--blue-main)]/50 bg-[var(--kint-selected-bg)] px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-sm font-black">
              {pedido.pedido} · {pedido.nombre || "Sin nombre"}
            </span>
            <span className="mt-0.5 block">
              <Chip tono={tonoEstado(pedido.estado)}>{textoEstado(pedido.estado)}</Chip>
            </span>
          </span>
          <button
            type="button"
            aria-label="Quitar el pedido"
            title="Quitar el pedido"
            onClick={() => {
              setElegido("");
              setConfirmar(false);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-red-600/10 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              className={`${claseInput} h-10 pl-9`}
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar pedido o cliente"
              aria-label="Buscar pedido o cliente"
            />
          </div>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto [scrollbar-width:thin]">
            {!datos && <li className="px-2 py-3 text-xs text-[var(--text-muted)]">Cargando pedidos…</li>}
            {datos && visibles.length === 0 && (
              <li className="px-2 py-3 text-xs text-[var(--text-muted)]">No hay pedidos activos con eso.</li>
            )}
            {visibles.slice(0, 40).map((item: PedidoResumen) => (
              <li key={item.pedido}>
                <button
                  type="button"
                  onClick={() => setElegido(item.pedido)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--kint-panel-soft)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      <span className="font-mono">{item.pedido}</span> · {item.nombre || "Sin nombre"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Chip tono={tonoEstado(item.estado)}>{textoEstado(item.estado)}</Chip>
                    <ChevronRight size={14} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lo que importa para el precio, chiquito. */}
      {pedido && <DatosParaPrecio numero={pedido.pedido} urgente={pedido.prioritario} />}

      {pedido && (
        <div className="mt-3 space-y-3">
          {avanzado && (
            <div>
              <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
                {pedido.pedido} ya está en «{textoEstado(pedido.estado)}». ¿Cómo lo sumás?
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { valor: "extra" as const, titulo: "Cobro extra", detalle: "Lo paga aparte, desde su seguimiento" },
                  { valor: "presupuesto" as const, titulo: "Al presupuesto", detalle: "Otra opción (no se suele tocar)" },
                ].map((modo) => {
                  const activo = (modo.valor === "extra") === comoExtra;
                  return (
                    <button
                      key={modo.valor}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        setModoElegido({ pedido: elegido, modo: modo.valor });
                        setConfirmar(false);
                      }}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        activo
                          ? "border-[var(--acento)] bg-[var(--acento)]/10"
                          : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
                      }`}
                    >
                      <span className="block text-xs font-black">{modo.titulo}</span>
                      <span className="block text-[11px] leading-4 text-[var(--text-muted)]">{modo.detalle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!comoExtra && (
          <div>
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Opción</span>
            <div className="flex flex-wrap gap-1.5">
              {OPCIONES.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  aria-pressed={opcion === nombre}
                  onClick={() => setOpcion(nombre)}
                  className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                    opcion === nombre
                      ? "border-[var(--acento)] bg-[var(--acento)] text-white"
                      : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {nombre}
                </button>
              ))}
              <input
                className="h-8 w-28 rounded-full border border-dashed border-[var(--kint-panel-border)] bg-transparent px-3 text-xs font-bold outline-none focus:border-[var(--kint-selected-border)]"
                value={OPCIONES.includes(opcion) ? "" : opcion}
                onChange={(evento) => setOpcion(evento.target.value.slice(0, 60))}
                placeholder="Otra…"
                aria-label="Otro nombre de opción"
              />
            </div>
          </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
              {comoExtra ? "Qué le cobrás (lo ve el cliente)" : "Descripción (opcional)"}
            </span>
            <input
              className={`${claseInput} h-10`}
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder={comoExtra ? conceptoExtra : "Ej.: PLA blanco, escala 1:100, base incluida"}
              maxLength={comoExtra ? 120 : 300}
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Precio para el cliente</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-black text-[var(--text-muted)]">
                  $
                </span>
                <input
                  className={`${claseInput} h-11 pl-7 text-lg font-black tabular-nums`}
                  value={precioTexto}
                  inputMode="decimal"
                  placeholder={String(calculo.resultado.redondeado)}
                  onChange={(evento) => setPrecioTexto(evento.target.value.replace(/[^\d.,]/g, ""))}
                />
              </span>
            </label>
            <span className="pb-2 text-right text-[11px] leading-4 text-[var(--text-muted)]">
              {calculo.tiempo !== "0 min" && <span className="block">{calculo.tiempo}</span>}
              {calculo.pieza.gramos > 0 && <span className="block">{Math.round(calculo.pieza.gramos)} g</span>}
            </span>
          </div>

          {confirmar && (
            <p className="rounded-xl bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              {pedido.pedido} ya está en «{textoEstado(pedido.estado)}». Normalmente el presupuesto no se toca
              a esta altura. Tocá de nuevo para agregarlo igual.
            </p>
          )}

          {comoExtra ? (
            <Boton
              variante="principal"
              className="w-full"
              icono={<Check size={16} />}
              cargando={guardando}
              disabled={!(precio > 0)}
              onClick={() => void cobrarExtra()}
            >
              {`Cobrarle como extra · ${pesos(Math.round(precio || 0))}`}
            </Boton>
          ) : pedido.estado === "Recibido" && !enviados.includes(pedido.pedido) ? (
            <>
              {/* Lo más común: una opción y listo, se la manda ya. */}
              <Boton
                variante="principal"
                className="w-full"
                icono={<Send size={16} />}
                cargando={guardando}
                disabled={!(precio > 0)}
                onClick={() => void agregar(true)}
              >
                {`Agregar y enviar al cliente · ${pesos(Math.round(precio || 0))}`}
              </Boton>
              <Boton className="w-full" icono={<Check size={16} />} disabled={guardando || !(precio > 0)} onClick={() => void agregar()}>
                Solo agregar (cargo más opciones y mando después)
              </Boton>
            </>
          ) : (
            <Boton
              variante="principal"
              className="w-full"
              icono={<Check size={16} />}
              cargando={guardando}
              disabled={!(precio > 0)}
              onClick={() => void agregar()}
            >
              {confirmar ? "Agregar igual" : `Agregar ${opcion.trim() || "opción"} · ${pesos(Math.round(precio || 0))}`}
            </Boton>
          )}
        </div>
      )}

      {agregados.length > 0 && (
        <div className="mt-4 border-t border-[var(--kint-panel-border)] pt-3">
          <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">Agregados ahora</p>
          <ul className="space-y-1.5">
            {agregados.map((item, indice) => (
              <li key={`${item.pedido}-${indice}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-bold">{item.pedido}</span> · {item.opcion} · {pesos(item.precio)}
                </span>
                {!item.extra &&
                  indice === agregados.findIndex((otro) => otro.pedido === item.pedido && !otro.extra) &&
                  (enviados.includes(item.pedido) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Check size={12} />
                      Enviado
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => enviarPresupuesto(item.pedido)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--acento)] px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110"
                      >
                        <Send size={12} />
                        Enviar
                      </button>
                      <Link
                        href={`/admin/pedidos/${encodeURIComponent(item.pedido)}`}
                        title="Abrir el pedido"
                        className="inline-flex items-center rounded-lg border border-[var(--kint-panel-border)] px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </span>
                  ))}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
            «Enviar» le manda el presupuesto al cliente (pasa a «Presupuestado») sin salir de acá.
          </p>
        </div>
      )}
    </Tarjeta>
  );
}

/*
 * Ficha del pedido elegido: escala, colores, armado, boquilla, urgente,
 * descuento, productos sumados y comentarios (lo que cambia el precio).
 */
function DatosParaPrecio({ numero, urgente }: { numero: string; urgente: boolean }) {
  const { datos, cargando } = useDatosAdmin("admin_pedido_detalle", { pedido: numero }, numero);
  const detalle = datos?.pedido;

  if (cargando && !detalle) {
    return <p className="mt-2 px-1 text-[11px] text-[var(--text-muted)]">Cargando los datos del pedido…</p>;
  }
  if (!detalle) return null;

  const colores =
    detalle.colores ??
    detalle.color.split(/\s*,\s*/).filter(Boolean).map((nombre) => ({ nombre, visible: nombre, hex: "" }));
  const armado = /^s[ií]/i.test(detalle.armado);
  const boquilla = detalle.boquilla.replace(/ — .*/, "");
  const extras = detalle.extras ?? [];

  const fila = (titulo: string, valor: React.ReactNode, destacado = false) => (
    <div className="flex items-baseline gap-2">
      <dt className="w-16 shrink-0 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--text-muted)]">{titulo}</dt>
      <dd className={`min-w-0 text-xs ${destacado ? "font-black text-amber-700 dark:text-amber-300" : "font-semibold"}`}>{valor}</dd>
    </div>
  );

  return (
    <dl data-ficha-pedido className="mt-2 space-y-1 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-3 py-2.5">
      {fila("Escala", detalle.escala || "—")}
      {fila(
        "Colores",
        colores.length ? (
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {colores.map((color) => (
              <span key={color.nombre} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ background: color.hex || colorFilamento(color.nombre) }} />
                {color.visible}
              </span>
            ))}
            {colores.length > 1 && <span className="text-[var(--text-muted)]">({colores.length} colores)</span>}
          </span>
        ) : (
          "—"
        ),
        colores.length > 1
      )}
      {fila("Armado", armado ? "Sí, lo armás vos" : "No", armado)}
      {boquilla && fila("Boquilla", boquilla)}
      {urgente && fila("Urgente", "Sí: lleva recargo", true)}
      {detalle.codigoDescuento && fila("Código", `${detalle.codigoDescuento}${detalle.descuento ? ` (−${detalle.descuento}%)` : ""}`)}
      {extras.length > 0 &&
        fila("Suma", extras.map((extra) => `${extra.cantidad > 1 ? `${extra.cantidad}× ` : ""}${extra.producto}`).join(", "))}
      {detalle.archivos.length > 0 && fila("Archivos", `${detalle.archivos.length}`)}
      {detalle.comentarios && fila("Notas", <span className="line-clamp-3 whitespace-pre-line">{detalle.comentarios}</span>)}
    </dl>
  );
}
