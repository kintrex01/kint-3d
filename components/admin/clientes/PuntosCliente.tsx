"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus, Undo2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { MovimientoPuntos, PuntosCliente as DatosPuntos } from "@/lib/admin-tipos";
import { Boton, Chip, DialogoConfirmar, claseInput, fechaHora, useAvisos } from "@/components/admin/ui";

/*
 * Historial de puntos de un cliente (hoja Puntos), desplegable como el de
 * compras. Desde acá se suman, se quitan o se fija el saldo, y se puede
 * deshacer cualquier movimiento (queda "Revertido" y se agrega la vuelta).
 */
export function PuntosCliente({
  email,
  onPuntos,
}: {
  email: string;
  onPuntos: (puntos: number) => void; // saldo nuevo, para la tarjeta
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="border-t border-[var(--kint-panel-border)] pt-2">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-bold text-amber-600 dark:text-amber-400"
      >
        {abierto ? "Ocultar puntos" : "Ver historial de puntos y editar"}
        <ChevronDown size={17} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && <ContenidoPuntos email={email} onPuntos={onPuntos} />}
    </div>
  );
}

function tonoTipo(movimiento: MovimientoPuntos) {
  if (movimiento.estado === "Revertido") return "gris" as const;
  if (movimiento.tipo === "Ajuste") return "azul" as const;
  if (movimiento.tipo === "Reversión") return "violeta" as const;
  return movimiento.puntos >= 0 ? ("verde" as const) : ("rojo" as const);
}

function ContenidoPuntos({ email, onPuntos }: { email: string; onPuntos: (puntos: number) => void }) {
  const avisar = useAvisos();
  const { datos, setDatos, error, cargando } = useDatosAdmin("admin_puntos_historial", { email }, email);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState("");
  const [deshaciendo, setDeshaciendo] = useState<MovimientoPuntos | null>(null);

  function listo(respuesta: DatosPuntos, mensaje: string) {
    setDatos(respuesta);
    onPuntos(respuesta.puntos);
    avisar(mensaje);
  }

  async function ajustar(modo: "sumar" | "fijar", puntos: number) {
    setGuardando(modo + puntos);
    try {
      const respuesta = await accionAdmin("admin_puntos_ajustar", { email, modo, puntos, motivo: motivo.trim() });
      listo(respuesta, `Ahora tiene ${respuesta.puntos.toLocaleString("es-UY")} puntos`);
      setCantidad("");
      setMotivo("");
    } catch (errorGuardado) {
      avisar(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo ajustar.", "error");
    } finally {
      setGuardando("");
    }
  }

  async function deshacer() {
    if (!deshaciendo) return;
    setGuardando("deshacer");
    try {
      const respuesta = await accionAdmin("admin_puntos_revertir", { email, id: deshaciendo.id });
      listo(respuesta, `${deshaciendo.id} deshecho`);
      setDeshaciendo(null);
    } catch (errorGuardado) {
      avisar(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo deshacer.", "error");
    } finally {
      setGuardando("");
    }
  }

  if (cargando && !datos) {
    return <div className="my-2 h-24 animate-pulse rounded-xl bg-[var(--kint-panel-soft)]" aria-busy="true" />;
  }
  if (error && !datos) return <p className="py-2 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!datos) return null;

  const numero = Math.round(Number(cantidad.replace(",", ".")));
  const valido = cantidad.trim() !== "" && Number.isFinite(numero);

  return (
    <div className="pb-1">
      {/* Saldo y edición */}
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-black tabular-nums">
            {datos.puntos.toLocaleString("es-UY")} <span className="text-base">✨</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Acumulados en total: {datos.acumulados.toLocaleString("es-UY")}
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[-50, -10, 10, 50].map((paso) => (
            <Boton
              key={paso}
              tamano="chico"
              variante="secundario"
              cargando={guardando === "sumar" + paso}
              disabled={Boolean(guardando) || datos.puntos + paso < 0}
              icono={paso < 0 ? <Minus size={13} /> : <Plus size={13} />}
              onClick={() => void ajustar("sumar", paso)}
            >
              {Math.abs(paso)}
            </Boton>
          ))}
        </div>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-[110px_1fr_auto_auto]">
          <input
            value={cantidad}
            onChange={(evento) => setCantidad(evento.target.value.replace(/[^\d,.-]/g, ""))}
            inputMode="numeric"
            placeholder="Puntos"
            aria-label="Cantidad de puntos"
            className={`${claseInput} h-10`}
          />
          <input
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            maxLength={120}
            placeholder="Motivo (opcional, lo ve el cliente)"
            className={`${claseInput} h-10`}
          />
          <Boton
            tamano="chico"
            variante="secundario"
            className="h-10"
            disabled={!valido || Boolean(guardando) || numero === 0}
            cargando={guardando === "sumar" + numero}
            onClick={() => void ajustar("sumar", numero)}
          >
            {numero < 0 ? "Quitar" : "Sumar"}
          </Boton>
          <Boton
            tamano="chico"
            variante="principal"
            className="h-10"
            disabled={!valido || Boolean(guardando) || numero < 0}
            cargando={guardando === "fijar" + numero}
            onClick={() => void ajustar("fijar", numero)}
          >
            Dejar en {valido ? numero : "…"}
          </Boton>
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
          «Sumar» con un número negativo (ej. -30) los quita. «Dejar en» pone el saldo exacto. Los ajustes no cuentan
          para el Top Kint.
        </p>
      </div>

      {/* Historial */}
      {datos.movimientos.length === 0 ? (
        <p className="py-3 text-sm text-[var(--text-muted)]">Todavía no tiene movimientos de puntos.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {datos.movimientos.map((movimiento) => {
            const revertido = movimiento.estado === "Revertido";
            return (
              <li
                key={movimiento.id + movimiento.fecha}
                className={`flex items-center gap-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2 ${revertido ? "opacity-55" : ""}`}
              >
                <span
                  className={`w-16 shrink-0 text-right text-sm font-black tabular-nums ${
                    revertido ? "line-through" : movimiento.puntos >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {movimiento.puntos > 0 ? "+" : ""}
                  {movimiento.puntos.toLocaleString("es-UY")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Chip tono={tonoTipo(movimiento)}>{revertido ? `${movimiento.tipo} · deshecho` : movimiento.tipo}</Chip>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {fechaHora(movimiento.fecha)} · {movimiento.id}
                      {movimiento.pedido ? ` · ${movimiento.pedido}` : ""}
                    </span>
                  </span>
                  {movimiento.comentario && (
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{movimiento.comentario}</span>
                  )}
                </span>
                <span className="hidden shrink-0 text-[11px] tabular-nums text-[var(--text-muted)] sm:block">
                  saldo {movimiento.saldoNuevo.toLocaleString("es-UY")}
                </span>
                {movimiento.revertible && (
                  <Boton
                    tamano="chico"
                    variante="fantasma"
                    aria-label={`Deshacer ${movimiento.id}`}
                    title="Deshacer"
                    icono={<Undo2 size={14} />}
                    disabled={Boolean(guardando)}
                    onClick={() => setDeshaciendo(movimiento)}
                    className="w-9 px-0"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DialogoConfirmar
        abierto={Boolean(deshaciendo)}
        titulo={deshaciendo ? `¿Deshacer ${deshaciendo.id}?` : ""}
        mensaje={
          deshaciendo && (
            <>
              <p>
                {deshaciendo.puntos > 0
                  ? `Se le quitan ${deshaciendo.puntos} puntos.`
                  : `Se le devuelven ${-deshaciendo.puntos} puntos.`}{" "}
                Queda anotado en su historial.
              </p>
              {deshaciendo.tipo === "Utilizados" && deshaciendo.pedido && (
                <p className="mt-2 text-[13px]">
                  Ojo: el descuento que se aplicó en {deshaciendo.pedido} no cambia; solo vuelven los puntos.
                </p>
              )}
            </>
          )
        }
        textoConfirmar="Deshacer"
        peligro
        cargando={guardando === "deshacer"}
        onCancelar={() => setDeshaciendo(null)}
        onConfirmar={() => void deshacer()}
      />
    </div>
  );
}
