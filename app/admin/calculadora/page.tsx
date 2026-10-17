"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink, Search, Send } from "lucide-react";
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

/*
 * Calculadora: se calcula el precio y, con un toque, se agrega como
 * opción al presupuesto de un pedido (admin_presupuesto_guardar).
 * Después se manda desde el pedido, como siempre ("Enviar presupuesto").
 */

const OPCIONES = ["Recomendada", "Premium", "Barata"];
const ESTADOS_LIBRES = ["Recibido", "Presupuestado"];

type Agregado = { pedido: string; nombre: string; opcion: string; precio: number };

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

  async function agregar() {
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
        Se suma como una opción más. Podés agregar varias (Recomendada, Premium, Barata…) y después
        lo mandás desde el pedido.
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
            onClick={() => {
              setElegido("");
              setConfirmar(false);
            }}
            className="shrink-0 text-xs font-black text-[var(--blue-main)] hover:underline dark:text-sky-300"
          >
            Cambiar
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

      {pedido && (
        <div className="mt-3 space-y-3">
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

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Descripción (opcional)</span>
            <input
              className={`${claseInput} h-10`}
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="Ej.: PLA blanco, escala 1:100, base incluida"
              maxLength={300}
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
                {indice === agregados.findIndex((otro) => otro.pedido === item.pedido) && (
                  <Link
                    href={`/admin/pedidos/${encodeURIComponent(item.pedido)}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--acento)] px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110"
                  >
                    <Send size={12} />
                    Enviar
                    <ExternalLink size={11} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
            «Enviar» abre el pedido: ahí revisás las opciones y tocás «Enviar presupuesto al cliente».
          </p>
        </div>
      )}
    </Tarjeta>
  );
}
