"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Flame,
  Package,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { useDatosAdmin } from "@/lib/admin-cliente";
import type { PedidoResumen } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Chip,
  Encabezado,
  Esqueleto,
  Interruptor,
  Segmentos,
  Tarjeta,
  Vacio,
  claseFase,
  faseEstado,
  fechaDia,
  textoDiasHasta,
  textoEstado,
  tonoEstado,
} from "@/components/admin/ui";
import {
  Buscador,
  coincide,
  entregaVencida,
  estaCancelado,
  pagoPorValidar,
  saldoPorValidar,
  SelectorOrden,
  ordenarLista,
  useOrdenGuardado,
} from "@/components/admin/pedidos/utilidades";

type Filtro = "todos" | "porHacer" | "activos" | "entregados" | "cancelados";

/* Estados en los que el próximo paso es del dueño. */
const ESTADOS_POR_HACER = [
  "Recibido",
  "Pago confirmado",
  "En impresión",
  "Terminado",
];

function necesitaAtencion(pedido: PedidoResumen) {
  if (estaCancelado(pedido.estado)) return false;
  return (
    ESTADOS_POR_HACER.includes(pedido.estado) ||
    pagoPorValidar(pedido) ||
    saldoPorValidar(pedido)
  );
}

function cumpleFiltro(pedido: PedidoResumen, filtro: Filtro) {
  const cancelado = estaCancelado(pedido.estado);
  switch (filtro) {
    case "todos":
      return true;
    case "porHacer":
      return necesitaAtencion(pedido);
    case "activos":
      return !cancelado && pedido.estado !== "Entregado";
    case "entregados":
      return pedido.estado === "Entregado";
    case "cancelados":
      return cancelado;
  }
}


const VACIOS: Record<Filtro, { titulo: string; texto: string }> = {
  todos: {
    titulo: "Sin pedidos",
    texto: "Cuando entre un pedido nuevo lo vas a ver acá.",
  },
  porHacer: {
    titulo: "Nada pendiente",
    texto: "No hay pedidos esperando algo de tu parte. ¡Bien ahí!",
  },
  activos: {
    titulo: "Sin pedidos activos",
    texto: "Cuando entre un pedido nuevo lo vas a ver acá.",
  },
  entregados: {
    titulo: "Sin entregas todavía",
    texto: "Los pedidos entregados aparecen acá.",
  },
  cancelados: {
    titulo: "Sin cancelados",
    texto: "No hay pedidos cancelados.",
  },
};

export default function PedidosAdmin() {
  const [incluirCancelados, setIncluirCancelados] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useOrdenGuardado("kint-admin-orden-maquetas");

  const { datos, error, cargando, recargando, recargar } = useDatosAdmin(
    "admin_pedidos_listar",
    { incluirCancelados },
    incluirCancelados ? "con-cancelados" : "sin-cancelados"
  );

  const pedidos = useMemo(() => datos?.pedidos ?? [], [datos]);

  const cantidades = useMemo(() => {
    const cuenta: Record<Filtro, number> = {
      todos: 0,
      porHacer: 0,
      activos: 0,
      entregados: 0,
      cancelados: 0,
    };
    for (const pedido of pedidos) {
      for (const clave of Object.keys(cuenta) as Filtro[]) {
        if (cumpleFiltro(pedido, clave)) cuenta[clave] += 1;
      }
    }
    return cuenta;
  }, [pedidos]);

  const visibles = useMemo(
    () =>
      ordenarLista(
        pedidos.filter(
          (pedido) =>
            cumpleFiltro(pedido, filtro) &&
            coincide(busqueda, pedido.pedido, pedido.nombre, pedido.email)
        ),
        orden,
        (pedido) => pedido.entrega,
        (pedido) => pedido.prioritario
      ),
    [pedidos, filtro, busqueda, orden]
  );

  function cambiarCancelados(activo: boolean) {
    /* Cambia la clave: se carga solo (al instante si ya estaba en caché). */
    setIncluirCancelados(activo);
    if (activo) setFiltro("cancelados");
    else if (filtro === "cancelados") setFiltro("todos");
  }

  const opciones: { valor: Filtro; texto: string; cantidad?: number }[] = [
    { valor: "todos", texto: "Todos", cantidad: cantidades.todos },
    { valor: "porHacer", texto: "Por hacer", cantidad: cantidades.porHacer },
    { valor: "activos", texto: "Todos activos", cantidad: cantidades.activos },
    { valor: "entregados", texto: "Entregados", cantidad: cantidades.entregados },
  ];
  if (incluirCancelados) {
    opciones.push({
      valor: "cancelados",
      texto: "Cancelados",
      cantidad: cantidades.cancelados,
    });
  }

  return (
    <>
      <Encabezado
        titulo="Maquetas"
        subtitulo={
          datos
            ? `${cantidades.activos} activos · ${cantidades.porHacer} por hacer`
            : "Pedidos KNT"
        }
        accion={
          <Boton
            variante="fantasma"
            onClick={recargar}
            cargando={recargando}
            icono={<RefreshCw size={16} />}
            aria-label="Actualizar pedidos"
            className="w-11 px-0"
          />
        }
      />

      <Buscador
        valor={busqueda}
        onCambiar={setBusqueda}
        placeholder="Buscar por pedido, nombre o email"
      />

      <div className="flex flex-wrap items-start justify-between gap-x-3">
        <Segmentos opciones={opciones} valor={filtro} onCambiar={setFiltro} />
        <div className="mb-4">
          <SelectorOrden
            valor={orden}
            opciones={["nuevos", "viejos", "entrega", "urgentes"]}
            onCambiar={setOrden}
          />
        </div>
      </div>

      <div className="-mt-1 mb-4 flex min-h-11 items-center justify-between gap-3">
        <span
          aria-hidden
          onClick={() => cambiarCancelados(!incluirCancelados)}
          className="flex-1 cursor-pointer select-none py-3 text-xs font-bold text-[var(--text-muted)]"
        >
          Mostrar cancelados
        </span>
        <Interruptor
          activo={incluirCancelados}
          onCambiar={cambiarCancelados}
          etiqueta="Mostrar pedidos cancelados"
        />
      </div>

      {cargando || (recargando && visibles.length === 0) ? (
        <Esqueleto filas={5} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : visibles.length === 0 ? (
        busqueda.trim() ? (
          <Vacio
            titulo="Sin resultados"
            texto={`No hay pedidos que coincidan con “${busqueda.trim()}” en este filtro.`}
          />
        ) : (
          <Vacio
            titulo={VACIOS[filtro].titulo}
            texto={VACIOS[filtro].texto}
            icono={<Package size={30} strokeWidth={1.5} />}
          />
        )
      ) : (
        <ul className="space-y-2.5" aria-busy={recargando}>
          {error && (
            <li>
              <CajaError mensaje={error} onReintentar={recargar} />
            </li>
          )}
          {visibles.map((pedido) => (
            <li key={pedido.pedido}>
              <TarjetaPedido pedido={pedido} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TarjetaPedido({ pedido }: { pedido: PedidoResumen }) {
  const vencida = entregaVencida(pedido.entrega, pedido.estado);
  const porValidar = pagoPorValidar(pedido);
  const saldo = saldoPorValidar(pedido);
  const cancelado = estaCancelado(pedido.estado);

  return (
    <Link
      href={`/admin/pedidos/${encodeURIComponent(pedido.pedido)}`}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f85]/40"
    >
      <Tarjeta
        color={claseFase(faseEstado(pedido.estado))}
        className={`flex items-center gap-3 px-4 py-3.5 transition hover:border-[var(--kint-selected-border)] active:scale-[0.99] ${
          cancelado ? "opacity-70" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-black tracking-tight">
              {pedido.pedido}
            </span>
            <Chip tono={tonoEstado(pedido.estado)}>
              {textoEstado(pedido.estado)}
            </Chip>
          </div>

          <p className="mt-0.5 truncate text-[15px] font-bold">
            {pedido.nombre || "Sin nombre"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                vencida
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--text-muted)]"
              }`}
            >
              <CalendarDays size={13} aria-hidden />
              {pedido.entrega ? (
                <>
                  {fechaDia(pedido.entrega)}
                  {!cancelado && pedido.estado !== "Entregado" && (
                    <span>· {textoDiasHasta(pedido.entrega)}</span>
                  )}
                </>
              ) : (
                "Sin fecha de entrega"
              )}
            </span>

            {(pedido.prioritario || porValidar || saldo) && (
              <span className="flex flex-wrap gap-1.5">
                {pedido.prioritario && (
                  <Chip tono="rojo">
                    <Flame size={11} aria-hidden />
                    Urgente
                  </Chip>
                )}
                {porValidar && (
                  <Chip tono="ambar">
                    <ReceiptText size={11} aria-hidden />
                    Pago por validar
                  </Chip>
                )}
                {saldo && (
                  <Chip tono="ambar">
                    <ReceiptText size={11} aria-hidden />
                    Saldo por validar
                  </Chip>
                )}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          size={18}
          aria-hidden
          className="shrink-0 text-[var(--text-muted)]"
        />
      </Tarjeta>
    </Link>
  );
}
