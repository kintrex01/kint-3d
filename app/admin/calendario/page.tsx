"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Package,
  ShoppingBag,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import {
  ESTADO_CANCELADO,
  type CompraTienda,
  type DiaSinEntrega,
  type PedidoResumen,
} from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Campo,
  Chip,
  Esqueleto,
  Hoja,
  Tarjeta,
  TituloSeccion,
  claseInput,
  fechaDia,
  textoEstado,
  tonoEstado,
  useAvisos,
} from "@/components/admin/ui";
import {
  MESES_LARGOS,
  aISO,
  diaSemana,
  esFinDeSemana,
  fechaLarga,
  partesISO,
  soloDia,
  useHoyMontevideo,
} from "@/components/admin/fechas";

const SIN_DATOS = {};
const CABECERA_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

type EntregasDia = { maquetas: PedidoResumen[]; tienda: CompraTienda[] };
type Feriado = { fecha: string; nombre: string };

/* Feriados de la ruta pública del calendario (solo para pintarlos en gris). */
function useFeriados() {
  const [feriados, setFeriados] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let activo = true;
    fetch("/api/calendario-entregas", { cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((data: { feriados?: Feriado[] }) => {
        if (!activo || !Array.isArray(data?.feriados)) return;
        setFeriados(
          new Map(data.feriados.map((feriado) => [feriado.fecha, feriado.nombre]))
        );
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  return feriados;
}

function textoEntregas(cantidad: number) {
  return cantidad === 1 ? "1 entrega" : `${cantidad} entregas`;
}

export default function CalendarioAdmin() {
  const avisar = useAvisos();
  const ahora = useHoyMontevideo();
  const hoy = ahora?.hoy || "";
  const feriados = useFeriados();

  const dias = useDatosAdmin("admin_dias_listar", SIN_DATOS);
  const pedidos = useDatosAdmin("admin_pedidos_listar", SIN_DATOS);
  const tienda = useDatosAdmin("admin_tienda_listar", SIN_DATOS);
  const setDias = dias.setDatos;

  const [mesElegido, setMesElegido] = useState<{
    anio: number;
    mes: number;
  } | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState<"" | "bloquear" | "quitar">("");
  const [quitandoRapido, setQuitandoRapido] = useState("");
  const toqueInicio = useRef<{ x: number; y: number } | null>(null);

  const bloqueados = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const dia of dias.datos?.dias || []) {
      const fecha = soloDia(dia.fecha);
      if (fecha) mapa.set(fecha, dia.motivo || "");
    }
    return mapa;
  }, [dias.datos]);

  const entregas = useMemo(() => {
    const mapa = new Map<string, EntregasDia>();
    const lugar = (fecha: string) => {
      if (!mapa.has(fecha)) mapa.set(fecha, { maquetas: [], tienda: [] });
      return mapa.get(fecha)!;
    };
    for (const pedido of pedidos.datos?.pedidos || []) {
      const fecha = soloDia(pedido.entrega);
      if (!fecha || pedido.estado === "Entregado") continue;
      if (pedido.estado === ESTADO_CANCELADO) continue;
      lugar(fecha).maquetas.push(pedido);
    }
    for (const compra of tienda.datos?.compras || []) {
      const fecha = soloDia(compra.fechaEntrega);
      if (!fecha || compra.estado === "Entregado") continue;
      lugar(fecha).tienda.push(compra);
    }
    return mapa;
  }, [pedidos.datos, tienda.datos]);

  const proximosBloqueados = useMemo(
    () =>
      [...bloqueados.entries()]
        .filter(([fecha]) => hoy && fecha >= hoy)
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    [bloqueados, hoy]
  );

  const actual =
    mesElegido ||
    (hoy
      ? { anio: partesISO(hoy).anio, mes: partesISO(hoy).mes }
      : null);

  function moverMes(delta: number) {
    if (!actual) return;
    const fecha = new Date(Date.UTC(actual.anio, actual.mes + delta, 1));
    setMesElegido({ anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() });
  }

  function alEmpezarToque(evento: TouchEvent) {
    const toque = evento.touches[0];
    toqueInicio.current = { x: toque.clientX, y: toque.clientY };
  }

  function alTerminarToque(evento: TouchEvent) {
    const inicio = toqueInicio.current;
    toqueInicio.current = null;
    if (!inicio) return;
    const toque = evento.changedTouches[0];
    const dx = toque.clientX - inicio.x;
    const dy = toque.clientY - inicio.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      moverMes(dx < 0 ? 1 : -1);
    }
  }

  function abrirDia(fecha: string) {
    setMotivo(bloqueados.get(fecha) || "");
    setDiaAbierto(fecha);
  }

  const cerrarDia = useCallback(() => {
    if (!guardando) setDiaAbierto(null);
  }, [guardando]);

  async function bloquear(fecha: string) {
    const texto = motivo.trim();
    const yaBloqueado = bloqueados.has(fecha);
    setGuardando("bloquear");
    try {
      const respuesta = await accionAdmin("admin_dia_guardar", {
        fecha,
        motivo: texto,
      } satisfies DiaSinEntrega);
      setDias({ dias: respuesta.dias });
      avisar(
        yaBloqueado
          ? "Motivo actualizado."
          : `Bloqueaste el ${fechaDia(fecha)}.`
      );
      setDiaAbierto(null);
    } catch (errorGuardar) {
      avisar(
        errorGuardar instanceof Error
          ? errorGuardar.message
          : "No se pudo bloquear el día.",
        "error"
      );
    } finally {
      setGuardando("");
    }
  }

  async function desbloquear(fecha: string, desdeLista = false) {
    if (desdeLista) setQuitandoRapido(fecha);
    else setGuardando("quitar");
    try {
      const respuesta = await accionAdmin("admin_dia_quitar", { fecha });
      setDias({ dias: respuesta.dias });
      avisar(`El ${fechaDia(fecha)} vuelve a estar disponible.`);
      if (!desdeLista) setDiaAbierto(null);
    } catch (errorQuitar) {
      avisar(
        errorQuitar instanceof Error
          ? errorQuitar.message
          : "No se pudo desbloquear el día.",
        "error"
      );
    } finally {
      setQuitandoRapido("");
      setGuardando("");
    }
  }

  /* Celdas del mes visible, empezando el lunes. */
  const celdas: (string | null)[] = [];
  if (actual) {
    const primero = aISO(actual.anio, actual.mes, 1);
    const desplazamiento = (diaSemana(primero) + 6) % 7;
    const diasDelMes = new Date(
      Date.UTC(actual.anio, actual.mes + 1, 0)
    ).getUTCDate();
    for (let indice = 0; indice < desplazamiento; indice++) celdas.push(null);
    for (let dia = 1; dia <= diasDelMes; dia++) {
      celdas.push(aISO(actual.anio, actual.mes, dia));
    }
  }

  const errorEntregas = pedidos.error || tienda.error;
  const cargandoEntregas = pedidos.cargando || tienda.cargando;

  const entregasAbierto = diaAbierto ? entregas.get(diaAbierto) : undefined;
  const cantidadAbierto =
    (entregasAbierto?.maquetas.length || 0) +
    (entregasAbierto?.tienda.length || 0);
  const abiertoBloqueado = diaAbierto ? bloqueados.has(diaAbierto) : false;
  const abiertoPasado = Boolean(diaAbierto && hoy && diaAbierto < hoy);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-black leading-tight sm:text-3xl">
          Calendario
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Los días bloqueados salen en rojo en la tienda y los clientes no los
          pueden elegir.
        </p>
      </div>

      {dias.cargando || !actual ? (
        <Esqueleto filas={4} />
      ) : dias.error && !dias.datos ? (
        <CajaError mensaje={dias.error} onReintentar={dias.recargar} />
      ) : (
        <>
          <Tarjeta className="p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                aria-label="Mes anterior"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)] active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="text-base font-black first-letter:uppercase">
                  {MESES_LARGOS[actual.mes]} {actual.anio}
                </p>
                {mesElegido &&
                  hoy &&
                  (partesISO(hoy).mes !== actual.mes ||
                    partesISO(hoy).anio !== actual.anio) && (
                    <button
                      type="button"
                      onClick={() => setMesElegido(null)}
                      className="text-[11px] font-bold text-[var(--acento)] dark:text-[var(--blue-soft)]"
                    >
                      Volver a hoy
                    </button>
                  )}
              </div>
              <button
                type="button"
                onClick={() => moverMes(1)}
                aria-label="Mes siguiente"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)] active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div
              className="touch-pan-y select-none"
              onTouchStart={alEmpezarToque}
              onTouchEnd={alTerminarToque}
            >
              <div className="mb-1 grid grid-cols-7 gap-1">
                {CABECERA_SEMANA.map((letra, indice) => (
                  <span
                    key={indice}
                    className={`py-1 text-center text-[11px] font-black ${
                      indice >= 5
                        ? "text-[var(--text-muted)] opacity-60"
                        : "text-[var(--text-muted)]"
                    }`}
                    aria-hidden="true"
                  >
                    {letra}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {celdas.map((fecha, indice) => {
                  if (!fecha) return <span key={`vacio-${indice}`} />;

                  const bloqueado = bloqueados.has(fecha);
                  const feriado = feriados.get(fecha);
                  const libre = esFinDeSemana(fecha) || Boolean(feriado);
                  const pasado = fecha < hoy;
                  const esHoy = fecha === hoy;
                  const delDia = entregas.get(fecha);
                  const hayMaquetas = Boolean(delDia?.maquetas.length);
                  const hayTienda = Boolean(delDia?.tienda.length);
                  const cantidad =
                    (delDia?.maquetas.length || 0) +
                    (delDia?.tienda.length || 0);

                  const etiqueta = [
                    fechaLarga(fecha),
                    esHoy ? "hoy" : "",
                    bloqueado ? "bloqueado" : "",
                    feriado || "",
                    cantidad ? textoEntregas(cantidad) : "",
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <button
                      key={fecha}
                      type="button"
                      onClick={() => abrirDia(fecha)}
                      aria-label={etiqueta}
                      className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm font-bold transition active:scale-95 ${
                        bloqueado
                          ? "bg-red-500/15 text-red-700 ring-1 ring-inset ring-red-500/40 dark:text-red-300"
                          : libre
                          ? "bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
                          : "hover:bg-[var(--kint-panel-soft)]"
                      } ${pasado ? "opacity-40" : ""} ${
                        esHoy
                          ? "ring-2 ring-inset ring-[var(--acento)] dark:ring-[var(--blue-soft)]"
                          : ""
                      }`}
                    >
                      <span className={esHoy ? "font-black" : ""}>
                        {partesISO(fecha).dia}
                      </span>
                      <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                        {hayMaquetas && (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                        )}
                        {hayTienda && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--kint-panel-border)] pt-3 text-[11px] font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Maquetas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tienda
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[4px] bg-red-500/30 ring-1 ring-red-500/50" />
                Bloqueado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[4px] bg-[var(--kint-panel-soft)] ring-1 ring-[var(--kint-panel-border)]" />
                Fin de semana o feriado
              </span>
            </div>
          </Tarjeta>

          {cargandoEntregas && (
            <p className="mt-2 text-xs text-[var(--text-muted)]" role="status">
              Cargando entregas…
            </p>
          )}
          {!cargandoEntregas && errorEntregas && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle size={15} className="shrink-0" />
              <span className="flex-1">
                No se pudieron cargar todas las entregas.
              </span>
              <Boton
                tamano="chico"
                variante="fantasma"
                onClick={() => {
                  if (pedidos.error) pedidos.recargar();
                  if (tienda.error) tienda.recargar();
                }}
              >
                Reintentar
              </Boton>
            </div>
          )}

          <TituloSeccion>Próximos días bloqueados</TituloSeccion>
          {proximosBloqueados.length ? (
            <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
              {proximosBloqueados.map(([fecha, motivoDia]) => (
                <div key={fecha} className="flex items-center gap-2 pr-3">
                  <button
                    type="button"
                    onClick={() => abrirDia(fecha)}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
                  >
                    <Lock
                      size={15}
                      className="shrink-0 text-red-600 dark:text-red-400"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {fechaDia(fecha)}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {motivoDia || "Sin motivo"}
                      </span>
                    </span>
                  </button>
                  <Boton
                    tamano="chico"
                    variante="fantasma"
                    className="h-11"
                    cargando={quitandoRapido === fecha}
                    disabled={Boolean(quitandoRapido)}
                    onClick={() => desbloquear(fecha, true)}
                    aria-label={`Desbloquear el ${fechaDia(fecha)}`}
                    icono={<LockOpen size={14} />}
                  >
                    Desbloquear
                  </Boton>
                </div>
              ))}
            </Tarjeta>
          ) : (
            <Tarjeta className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-muted)]">
              <CalendarCheck2 size={17} className="shrink-0" />
              No hay días bloqueados. Tocá un día del calendario para
              bloquearlo.
            </Tarjeta>
          )}
        </>
      )}

      <Hoja
        abierta={Boolean(diaAbierto)}
        onCerrar={cerrarDia}
        titulo={
          diaAbierto
            ? fechaLarga(diaAbierto).replace(/^./, (letra) =>
                letra.toUpperCase()
              )
            : ""
        }
      >
        {diaAbierto && (
          <div className="space-y-5">
            {(feriados.get(diaAbierto) || esFinDeSemana(diaAbierto)) && (
              <div className="flex flex-wrap gap-1.5">
                {feriados.get(diaAbierto) && (
                  <Chip tono="gris">Feriado: {feriados.get(diaAbierto)}</Chip>
                )}
                {esFinDeSemana(diaAbierto) && (
                  <Chip tono="gris">Fin de semana</Chip>
                )}
              </div>
            )}

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Entregas
              </h3>
              {cantidadAbierto ? (
                <ul className="divide-y divide-[var(--kint-panel-border)] overflow-hidden rounded-xl border border-[var(--kint-panel-border)]">
                  {entregasAbierto!.maquetas.map((pedido) => (
                    <li key={pedido.pedido}>
                      <Link
                        href={`/admin/pedidos/${encodeURIComponent(
                          pedido.pedido
                        )}`}
                        className="flex min-h-12 items-center gap-3 px-3 py-2 transition hover:bg-[var(--kint-panel-soft)]"
                      >
                        <Package
                          size={16}
                          className="shrink-0 text-sky-600 dark:text-sky-400"
                          aria-label="Maqueta"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {pedido.nombre || "Sin nombre"}
                          </span>
                          <span className="block text-[11px] text-[var(--text-muted)]">
                            {pedido.pedido}
                          </span>
                        </span>
                        <Chip tono={tonoEstado(pedido.estado)}>
                          {textoEstado(pedido.estado)}
                        </Chip>
                      </Link>
                    </li>
                  ))}
                  {entregasAbierto!.tienda.map((compra) => (
                    <li key={compra.pedido}>
                      <Link
                        href="/admin/todos"
                        className="flex min-h-12 items-center gap-3 px-3 py-2 transition hover:bg-[var(--kint-panel-soft)]"
                      >
                        <ShoppingBag
                          size={16}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-label="Tienda"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {compra.cliente || "Sin nombre"}
                          </span>
                          <span className="block text-[11px] text-[var(--text-muted)]">
                            {compra.pedido}
                          </span>
                        </span>
                        <Chip tono={tonoEstado(compra.estado)}>
                          {textoEstado(compra.estado)}
                        </Chip>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  {cargandoEntregas
                    ? "Cargando entregas…"
                    : "No hay entregas para este día."}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Disponibilidad
              </h3>

              {abiertoPasado ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {abiertoBloqueado
                    ? `Estuvo bloqueado${
                        bloqueados.get(diaAbierto)
                          ? `: ${bloqueados.get(diaAbierto)}`
                          : "."
                      }`
                    : "Este día ya pasó, no se puede bloquear."}
                </p>
              ) : (
                <div className="space-y-3">
                  {abiertoBloqueado ? (
                    <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                      <Lock size={15} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="font-bold">Bloqueado.</span>{" "}
                        {bloqueados.get(diaAbierto) || "Sin motivo"}
                      </span>
                    </div>
                  ) : (
                    cantidadAbierto > 0 && (
                      <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        Ya hay {textoEntregas(cantidadAbierto)} para este día.
                        Bloquearlo no las mueve: coordiná con esos clientes.
                      </div>
                    )
                  )}

                  <Campo
                    etiqueta={abiertoBloqueado ? "Motivo" : "Motivo (opcional)"}
                    ayuda="Es solo para vos, los clientes no lo ven."
                  >
                    <input
                      className={claseInput}
                      value={motivo}
                      onChange={(evento) => setMotivo(evento.target.value)}
                      placeholder="No voy a la facultad"
                      maxLength={120}
                      enterKeyHint="done"
                      onKeyDown={(evento) => {
                        if (evento.key !== "Enter" || guardando) return;
                        const sinCambios =
                          abiertoBloqueado &&
                          motivo.trim() === (bloqueados.get(diaAbierto) || "");
                        if (!sinCambios) bloquear(diaAbierto);
                      }}
                    />
                  </Campo>

                  {abiertoBloqueado ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Boton
                        onClick={() => bloquear(diaAbierto)}
                        cargando={guardando === "bloquear"}
                        disabled={
                          Boolean(guardando) ||
                          motivo.trim() === (bloqueados.get(diaAbierto) || "")
                        }
                      >
                        Guardar motivo
                      </Boton>
                      <Boton
                        variante="peligro"
                        onClick={() => desbloquear(diaAbierto)}
                        cargando={guardando === "quitar"}
                        disabled={Boolean(guardando)}
                        icono={<LockOpen size={15} />}
                      >
                        Desbloquear
                      </Boton>
                    </div>
                  ) : (
                    <Boton
                      variante="principal"
                      className="w-full"
                      onClick={() => bloquear(diaAbierto)}
                      cargando={guardando === "bloquear"}
                      icono={<Lock size={15} />}
                    >
                      Bloquear este día
                    </Boton>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </Hoja>
    </>
  );
}
