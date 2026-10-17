"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, RefreshCw, ShoppingBag } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { CompraTienda, EstadoTienda } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Chip,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Hoja,
  Segmentos,
  Tarjeta,
  Vacio,
  claseFase,
  faseEstado,
  fechaDia,
  pesos,
  textoDiasHasta,
  tonoEstado,
  useAvisos,
} from "@/components/admin/ui";
import {
  Buscador,
  coincide,
  entregaVencida,
  SelectorOrden,
  ordenarLista,
  useOrdenGuardado,
} from "@/components/admin/pedidos/utilidades";
import {
  DetalleCompra,
  textoLinea,
  textoModalidad,
} from "@/components/admin/tienda/DetalleCompra";

type Filtro = "Pendiente" | "Listo" | "Entregado" | "todos";

type Cambio =
  | { tipo: "pago"; confirmado: boolean }
  | { tipo: "estado"; estado: EstadoTienda };

const VACIOS: Record<Filtro, string> = {
  Pendiente: "No hay compras pendientes de preparar.",
  Listo: "No hay compras listas esperando entrega.",
  Entregado: "Todavía no hay compras entregadas.",
  todos: "Cuando alguien compre en la tienda lo vas a ver acá.",
};


function textoCambio(cambio: Cambio) {
  if (cambio.tipo === "pago") {
    return cambio.confirmado ? "Pago confirmado" : "Confirmación quitada";
  }
  return `Compra marcada como «${cambio.estado}»`;
}

/* Solo se avisa al confirmar el pago o al pasar a Listo / Entregado. */
function correoAplica(cambio: Cambio) {
  return cambio.tipo === "pago"
    ? cambio.confirmado
    : cambio.estado !== "Pendiente";
}

function mensajeCorreo(cambio: Cambio, compra: CompraTienda) {
  if (cambio.tipo === "pago") {
    return `Se marca el pago de ${compra.pedido} como confirmado y ${compra.cliente || "el cliente"} recibe un correo avisándole.`;
  }
  return cambio.estado === "Listo"
    ? `Se marca ${compra.pedido} como «Listo» y ${compra.cliente || "el cliente"} recibe un correo avisando que su compra está pronta.`
    : `Se marca ${compra.pedido} como «Entregado» y ${compra.cliente || "el cliente"} recibe un correo de agradecimiento.`;
}

export default function TiendaAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_tienda_listar", {}, "");
  const avisar = useAvisos();

  // Desde "Todos los pedidos" se llega con ?pedido=TND-0001: se abre esa compra.
  const [abierta, setAbierta] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("pedido")
  );
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useOrdenGuardado("kint-admin-orden-tienda");
  const [notificar, setNotificar] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [porConfirmar, setPorConfirmar] = useState<Cambio | null>(null);
  const [pidiendoCancelar, setPidiendoCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const compras = useMemo(() => datos?.compras ?? [], [datos]);
  const compra = compras.find((item) => item.pedido === abierta) ?? null;

  const cantidades = useMemo(() => {
    const cuenta: Record<Filtro, number> = {
      Pendiente: 0,
      Listo: 0,
      Entregado: 0,
      todos: compras.length,
    };
    for (const item of compras) {
      if (item.estado === "Pendiente" || item.estado === "Listo" || item.estado === "Entregado") {
        cuenta[item.estado] += 1;
      }
    }
    return cuenta;
  }, [compras]);

  const visibles = useMemo(
    () =>
      ordenarLista(
        compras.filter(
          (item) =>
            (filtro === "todos" || item.estado === filtro) &&
            coincide(busqueda, item.pedido, item.cliente, item.alias, item.email)
        ),
        orden,
        (item) => item.fechaEntrega
      ),
    [compras, filtro, busqueda, orden]
  );

  function abrir(pedido: string) {
    setNotificar(true);
    setAbierta(pedido);
  }

  function pedirCambio(cambio: Cambio) {
    if (!compra) return;
    if (notificar && compra.email && correoAplica(cambio)) {
      setPorConfirmar(cambio);
    } else {
      void ejecutar(cambio);
    }
  }

  async function ejecutar(cambio: Cambio) {
    if (!compra) return;
    const avisarCliente = Boolean(notificar && compra.email && correoAplica(cambio));
    setGuardando(cambio.tipo === "pago" ? "pago" : cambio.estado);

    try {
      const respuesta =
        cambio.tipo === "pago"
          ? await accionAdmin("admin_tienda_pago", {
              pedido: compra.pedido,
              confirmado: cambio.confirmado,
              notificar: avisarCliente,
            })
          : await accionAdmin("admin_tienda_estado", {
              pedido: compra.pedido,
              estado: cambio.estado,
              notificar: avisarCliente,
            });

      setDatos((actual) =>
        actual
          ? {
              compras: actual.compras.map((item) =>
                item.pedido === respuesta.compra.pedido ? respuesta.compra : item
              ),
            }
          : actual
      );
      avisar(
        avisarCliente && respuesta.correoEnviado
          ? `${textoCambio(cambio)} · le avisamos por correo`
          : textoCambio(cambio)
      );
      if (avisarCliente && !respuesta.correoEnviado) {
        avisar("No se pudo mandar el correo al cliente.", "error");
      }
      if ("puntos" in respuesta && respuesta.puntos) {
        avisar(`+${respuesta.puntos} Puntos Kint para el cliente`);
      }
      setPorConfirmar(null);
    } catch (errorAccion) {
      avisar(
        errorAccion instanceof Error ? errorAccion.message : "No se pudo guardar.",
        "error"
      );
    } finally {
      setGuardando("");
    }
  }

  /* Borra la compra sin dejar rastro (filas, anti-duplicados y comprobantes). */
  async function cancelarCompra() {
    if (!compra) return;
    setCancelando(true);
    try {
      await accionAdmin("admin_tienda_cancelar", { pedido: compra.pedido });
      setDatos((actual) =>
        actual
          ? { compras: actual.compras.filter((item) => item.pedido !== compra.pedido) }
          : actual
      );
      avisar(`${compra.pedido} cancelada y borrada`);
      setPidiendoCancelar(false);
      setAbierta(null);
    } catch (errorAccion) {
      avisar(
        errorAccion instanceof Error ? errorAccion.message : "No se pudo cancelar.",
        "error"
      );
    } finally {
      setCancelando(false);
    }
  }

  const opciones: { valor: Filtro; texto: string; cantidad: number }[] = [
    { valor: "Pendiente", texto: "Pendientes", cantidad: cantidades.Pendiente },
    { valor: "Listo", texto: "Listos", cantidad: cantidades.Listo },
    { valor: "Entregado", texto: "Entregados", cantidad: cantidades.Entregado },
    { valor: "todos", texto: "Todos", cantidad: cantidades.todos },
  ];

  return (
    <>
      <Encabezado
        titulo="Tienda"
        subtitulo={
          datos
            ? `${cantidades.Pendiente} ${cantidades.Pendiente === 1 ? "pendiente" : "pendientes"} · ${cantidades.Listo} ${cantidades.Listo === 1 ? "listo" : "listos"}`
            : "Compras TND"
        }
        accion={
          <Boton
            variante="fantasma"
            onClick={recargar}
            cargando={recargando}
            icono={<RefreshCw size={16} />}
            aria-label="Actualizar compras"
            className="w-11 px-0"
          />
        }
      />

      <Buscador
        valor={busqueda}
        onCambiar={setBusqueda}
        placeholder="Buscar por pedido, cliente o email"
      />

      <div className="flex flex-wrap items-start justify-between gap-x-3">
        <Segmentos opciones={opciones} valor={filtro} onCambiar={setFiltro} />
        <div className="mb-4">
          <SelectorOrden valor={orden} opciones={["nuevos", "viejos", "entrega"]} onCambiar={setOrden} />
        </div>
      </div>

      {cargando ? (
        <Esqueleto filas={5} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : visibles.length === 0 ? (
        busqueda.trim() ? (
          <Vacio
            titulo="Sin resultados"
            texto={`No hay compras que coincidan con “${busqueda.trim()}” en este filtro.`}
          />
        ) : (
          <Vacio
            titulo="Nada por acá"
            texto={VACIOS[filtro]}
            icono={<ShoppingBag size={30} strokeWidth={1.5} />}
          />
        )
      ) : (
        <ul className="space-y-2.5" aria-busy={recargando}>
          {error && (
            <li>
              <CajaError mensaje={error} onReintentar={recargar} />
            </li>
          )}
          {visibles.map((item) => (
            <li key={item.pedido}>
              <TarjetaCompra compra={item} onAbrir={() => abrir(item.pedido)} />
            </li>
          ))}
        </ul>
      )}

      <Hoja
        abierta={Boolean(compra) && !porConfirmar && !pidiendoCancelar}
        onCerrar={() => {
          if (!guardando) setAbierta(null);
        }}
        titulo={compra?.pedido ?? "Compra"}
      >
        {compra && (
          <DetalleCompra
            compra={compra}
            notificar={notificar}
            onNotificar={setNotificar}
            guardando={guardando}
            onPago={(confirmado) => pedirCambio({ tipo: "pago", confirmado })}
            onEstado={(estado) => pedirCambio({ tipo: "estado", estado })}
            onCancelar={() => setPidiendoCancelar(true)}
          />
        )}
      </Hoja>

      <DialogoConfirmar
        abierto={Boolean(porConfirmar && compra)}
        titulo={
          porConfirmar?.tipo === "pago"
            ? "Confirmar pago y avisar"
            : `Marcar como «${porConfirmar?.tipo === "estado" ? porConfirmar.estado : ""}»`
        }
        mensaje={
          porConfirmar && compra ? (
            <>
              <p>{mensajeCorreo(porConfirmar, compra)}</p>
              <p className="mt-2 text-xs">
                El correo se manda ahora a {compra.email}. Si no querés avisarle,
                apagá “Avisar al cliente por correo”.
              </p>
            </>
          ) : null
        }
        textoConfirmar="Guardar y avisar"
        cargando={Boolean(guardando)}
        onConfirmar={() => {
          if (porConfirmar) void ejecutar(porConfirmar);
        }}
        onCancelar={() => setPorConfirmar(null)}
      />

      <DialogoConfirmar
        abierto={pidiendoCancelar && Boolean(compra)}
        titulo={`Cancelar ${compra?.pedido ?? ""}`}
        peligro
        cargando={cancelando}
        textoConfirmar="Sí, borrar"
        mensaje={
          <div className="space-y-2">
            <p>
              Se borran sus filas de la hoja Tienda y los comprobantes en Drive.
              Si es la última compra, el número queda libre para la próxima.
            </p>
            <p>No se le manda correo al cliente. No se puede deshacer.</p>
          </div>
        }
        onConfirmar={() => void cancelarCompra()}
        onCancelar={() => setPidiendoCancelar(false)}
      />
    </>
  );
}

function TarjetaCompra({
  compra,
  onAbrir,
}: {
  compra: CompraTienda;
  onAbrir: () => void;
}) {
  const vencida = entregaVencida(compra.fechaEntrega, compra.estado);
  const resumen = compra.lineas.map(textoLinea).join(", ");

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento)]/40"
    >
      <Tarjeta
        color={claseFase(faseEstado(compra.estado, compra.pagoConfirmado))}
        className="flex items-center gap-3 px-4 py-3.5 transition hover:border-[var(--kint-selected-border)] active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-black tracking-tight">
              {compra.pedido}
            </span>
            <span className="text-base font-black">{pesos(compra.total)}</span>
          </div>

          <p className="mt-0.5 truncate text-[15px] font-bold">
            {compra.cliente || "Sin nombre"}
            {compra.alias && (
              <span className="ml-1 text-sm font-semibold text-[var(--text-muted)]">
                ({compra.alias})
              </span>
            )}
          </p>

          {resumen && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {resumen}
            </p>
          )}

          {textoModalidad(compra) && (
            <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
              {textoModalidad(compra)}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                vencida
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--text-muted)]"
              }`}
            >
              <CalendarDays size={13} aria-hidden />
              {compra.fechaEntrega ? (
                <>
                  {fechaDia(compra.fechaEntrega)}
                  {compra.estado !== "Entregado" && (
                    <span>· {textoDiasHasta(compra.fechaEntrega)}</span>
                  )}
                </>
              ) : (
                "Sin fecha"
              )}
            </span>
            <span className="flex flex-wrap gap-1.5">
              <Chip tono={tonoEstado(compra.estado)}>
                {compra.estado || "Sin estado"}
              </Chip>
              <Chip tono={compra.pagoConfirmado ? "verde" : "ambar"}>
                {compra.pagoConfirmado ? "Pago confirmado" : "Pago sin confirmar"}
              </Chip>
            </span>
          </div>
        </div>
        <ChevronRight
          size={18}
          aria-hidden
          className="shrink-0 text-[var(--text-muted)]"
        />
      </Tarjeta>
    </button>
  );
}
