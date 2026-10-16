"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronRight,
  ListOrdered,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { PedidoGeneral } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Chip,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Segmentos,
  Vacio,
  claseInput,
  fechaHora,
  pesos,
  tonoEstado,
  claseFase,
  faseEstado,
  textoEstado,
  useAvisos,
} from "@/components/admin/ui";

/*
 * Todos los pedidos: maquetas (KNT) y tienda (TND) en una sola lista,
 * los más nuevos arriba. Desde acá se pueden borrar varios a la vez
 * (pedidos de prueba): se borran de todos lados (ver PedidosTodos_Kint3D.js).
 */

type Filtro = "todos" | "maqueta" | "tienda";

const SIN_DATOS = {};

function coincide(busqueda: string, pedido: PedidoGeneral) {
  const texto = busqueda.trim().toLocaleLowerCase("es");
  if (!texto) return true;
  return [pedido.pedido, pedido.cliente, pedido.email, pedido.estado, pedido.detalle]
    .join(" ")
    .toLocaleLowerCase("es")
    .includes(texto);
}

export default function TodosLosPedidos() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_todos_listar", SIN_DATOS);
  const avisar = useAvisos();

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionando, setSeleccionando] = useState(false);
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const pedidos = useMemo(() => datos?.pedidos ?? [], [datos]);

  const visibles = useMemo(
    () =>
      pedidos.filter(
        (pedido) =>
          (filtro === "todos" || pedido.tipo === filtro) && coincide(busqueda, pedido)
      ),
    [pedidos, filtro, busqueda]
  );

  const cantidades = {
    todos: pedidos.length,
    maqueta: pedidos.filter((pedido) => pedido.tipo === "maqueta").length,
    tienda: pedidos.filter((pedido) => pedido.tipo === "tienda").length,
  };

  function alternar(numero: string) {
    setElegidos((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(numero)) nuevos.delete(numero);
      else nuevos.add(numero);
      return nuevos;
    });
  }

  function salirDeSeleccion() {
    setSeleccionando(false);
    setElegidos(new Set());
  }

  const todosVisiblesElegidos =
    visibles.length > 0 && visibles.every((pedido) => elegidos.has(pedido.pedido));

  async function borrar() {
    setBorrando(true);
    try {
      const respuesta = await accionAdmin("admin_borrar_pedidos", {
        pedidos: [...elegidos],
      });
      const borrados = new Set(respuesta.borrados);
      setDatos((actual) =>
        actual
          ? { pedidos: actual.pedidos.filter((pedido) => !borrados.has(pedido.pedido)) }
          : actual
      );
      avisar(
        respuesta.borrados.length === 1
          ? `${respuesta.borrados[0]} borrado`
          : `${respuesta.borrados.length} pedidos borrados`
      );
      if (respuesta.errores.length) {
        avisar(`No se pudieron borrar: ${respuesta.errores.join(" · ")}`, "error");
      }
      setConfirmando(false);
      salirDeSeleccion();
    } catch (errorBorrado) {
      avisar(
        errorBorrado instanceof Error ? errorBorrado.message : "No se pudo borrar.",
        "error"
      );
    } finally {
      setBorrando(false);
    }
  }

  const listaElegidos = [...elegidos];

  return (
    <>
      <Encabezado
        titulo="Todos los pedidos"
        subtitulo="Maquetas y tienda, los más nuevos arriba."
        accion={
          datos && (
            <Boton
              variante="fantasma"
              onClick={recargar}
              cargando={recargando}
              icono={<RefreshCw size={16} />}
              aria-label="Actualizar"
              className="w-11 px-0"
            />
          )
        }
      />

      <div className="relative mb-3">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          className={`${claseInput} pl-10`}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por número, cliente, email o estado"
          aria-label="Buscar pedidos"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmentos<Filtro>
          valor={filtro}
          onCambiar={setFiltro}
          opciones={[
            { valor: "todos", texto: "Todos", cantidad: cantidades.todos },
            { valor: "maqueta", texto: "Maquetas", cantidad: cantidades.maqueta },
            { valor: "tienda", texto: "Tienda", cantidad: cantidades.tienda },
          ]}
        />
        {datos && pedidos.length > 0 && (
          <Boton
            variante={seleccionando ? "secundario" : "fantasma"}
            icono={seleccionando ? <X size={15} /> : <CheckSquare size={15} />}
            onClick={() => (seleccionando ? salirDeSeleccion() : setSeleccionando(true))}
          >
            {seleccionando ? "Cancelar" : "Seleccionar"}
          </Boton>
        )}
      </div>

      {seleccionando && visibles.length > 0 && (
        <button
          type="button"
          onClick={() =>
            setElegidos((actuales) => {
              const nuevos = new Set(actuales);
              visibles.forEach((pedido) =>
                todosVisiblesElegidos ? nuevos.delete(pedido.pedido) : nuevos.add(pedido.pedido)
              );
              return nuevos;
            })
          }
          className="mb-2 text-xs font-bold text-[var(--blue-main)] dark:text-[var(--blue-soft)]"
        >
          {todosVisiblesElegidos ? "Quitar todos los de la lista" : "Elegir todos los de la lista"}
        </button>
      )}

      {cargando && !datos ? (
        <Esqueleto filas={6} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : visibles.length === 0 ? (
        <Vacio
          icono={<ListOrdered size={30} strokeWidth={1.5} />}
          titulo={busqueda.trim() ? "Sin resultados" : "Todavía no hay pedidos"}
          texto={
            busqueda.trim()
              ? `No hay pedidos que coincidan con “${busqueda.trim()}”.`
              : "Cuando entren pedidos de maquetas o compras de la tienda, aparecen acá."
          }
        />
      ) : (
        <ul className="space-y-2 pb-24" aria-busy={recargando}>
          {visibles.map((pedido) => (
            <li key={pedido.pedido}>
              <FilaPedido
                pedido={pedido}
                seleccionando={seleccionando}
                elegido={elegidos.has(pedido.pedido)}
                onAlternar={() => alternar(pedido.pedido)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Barra de borrado (con pedidos elegidos). */}
      {seleccionando && elegidos.size > 0 && (
        <div
          className="fixed inset-x-0 z-40 px-4 lg:left-64"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-red-600/30 bg-[var(--kint-panel)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
            <span className="text-sm font-black">
              {elegidos.size} {elegidos.size === 1 ? "elegido" : "elegidos"}
            </span>
            <Boton
              variante="peligro"
              icono={<Trash2 size={15} />}
              onClick={() => setConfirmando(true)}
            >
              Borrar
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmar
        abierto={confirmando}
        titulo={
          elegidos.size === 1 ? `Borrar ${listaElegidos[0]}` : `Borrar ${elegidos.size} pedidos`
        }
        peligro
        cargando={borrando}
        textoConfirmar="Sí, borrar de todos lados"
        mensaje={
          <div className="space-y-2">
            <p>
              Se borran de todos lados: hojas de pedidos, pagos, archivos,
              presupuestos, reseñas, extras y los Puntos Kint que generaron (se
              le descuentan al cliente). Los números quedan libres.
            </p>
            <p className="break-words font-bold text-[var(--text-main)]">
              {listaElegidos.slice(0, 12).join(", ")}
              {listaElegidos.length > 12 ? ` y ${listaElegidos.length - 12} más` : ""}
            </p>
            <p>No se le manda correo a nadie. No se puede deshacer.</p>
          </div>
        }
        onConfirmar={() => void borrar()}
        onCancelar={() => setConfirmando(false)}
      />
    </>
  );
}

function FilaPedido({
  pedido,
  seleccionando,
  elegido,
  onAlternar,
}: {
  pedido: PedidoGeneral;
  seleccionando: boolean;
  elegido: boolean;
  onAlternar: () => void;
}) {
  const Icono = pedido.tipo === "maqueta" ? Package : ShoppingBag;

  const contenido = (
    <>
      {seleccionando ? (
        <span className={elegido ? "text-red-600" : "text-[var(--text-muted)]"}>
          {elegido ? <CheckSquare size={22} /> : <Square size={22} />}
        </span>
      ) : (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            pedido.tipo === "maqueta"
              ? "bg-[#1f3f85]/10 text-[#1f3f85] dark:bg-sky-400/10 dark:text-sky-300"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          <Icono size={18} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-black">{pedido.pedido}</span>
          <Chip tono={tonoEstado(pedido.estado, pedido.tipo === "tienda" && pedido.pagado)}>
            {textoEstado(pedido.estado)}
          </Chip>
        </span>
        <span className="block truncate text-sm font-semibold">
          {pedido.cliente || "Sin nombre"}
          {pedido.email && (
            <span className="font-normal text-[var(--text-muted)]"> · {pedido.email}</span>
          )}
        </span>
        <span className="block truncate text-xs text-[var(--text-muted)]">
          {[pedido.fecha ? fechaHora(pedido.fecha) : "", pedido.detalle]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-black tabular-nums">
          {pedido.monto > 0 ? pesos(pedido.monto) : "—"}
        </span>
        <span
          className={`block text-[10px] font-bold ${
            pedido.pagado ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-muted)]"
          }`}
        >
          {pedido.pagado ? "Pagado" : "Sin pagar"}
        </span>
      </span>

      {!seleccionando && pedido.tipo === "maqueta" && (
        <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />
      )}
    </>
  );

  const clase = `flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
    elegido
      ? "border-red-600/60 bg-red-500/[0.06]"
      : `${
          claseFase(faseEstado(pedido.estado, pedido.tipo === "tienda" && pedido.pagado)) ||
          "border-[var(--kint-panel-border)] bg-[var(--kint-panel)]"
        } hover:border-[var(--kint-selected-border)]`
  }`;

  if (seleccionando) {
    return (
      <button type="button" onClick={onAlternar} aria-pressed={elegido} className={clase}>
        {contenido}
      </button>
    );
  }

  return pedido.tipo === "maqueta" ? (
    <Link href={`/admin/pedidos/${encodeURIComponent(pedido.pedido)}`} className={clase}>
      {contenido}
    </Link>
  ) : (
    <Link href={`/admin/tienda?pedido=${encodeURIComponent(pedido.pedido)}`} className={clase}>
      {contenido}
    </Link>
  );
}
