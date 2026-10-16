"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { MovimientoCaja } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Campo,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Hoja,
  Segmentos,
  Tarjeta,
  Vacio,
  claseInput,
  fechaHora,
  pesos,
  useAvisos,
} from "@/components/admin/ui";
import { MESES_LARGOS, useHoyMontevideo } from "@/components/admin/fechas";

/*
 * Caja: lo que entra (pagos de clientes que confirmaste) y lo que sale
 * (gastos que cargás acá). Los ingresos de pedidos se anotan solos y se
 * van solos si el pedido se cancela. Ver Caja_Kint3D.js.
 */

type Filtro = "todo" | "ingreso" | "gasto";
type TipoMovimiento = MovimientoCaja["tipo"];

const SIN_DATOS = {};

const CATEGORIAS: Record<TipoMovimiento, string[]> = {
  gasto: ["Filamento", "Materiales", "Herramientas", "Repuestos", "Envíos", "Publicidad", "Otro"],
  ingreso: ["Saldo inicial", "Venta fuera de la web", "Otro"],
};

type Formulario = {
  tipo: TipoMovimiento;
  concepto: string;
  monto: string;
  fecha: string;
  categoria: string;
};

function redondear(numero: number) {
  return Math.round(numero * 100) / 100;
}

function signo(movimiento: MovimientoCaja) {
  return movimiento.tipo === "ingreso" ? movimiento.monto : -movimiento.monto;
}

/* "2026-10" a partir de un ISO, en hora de Uruguay. */
function claveMes(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("en-CA", { timeZone: "America/Montevideo" }).slice(0, 7);
}

function nombreMes(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  const nombre = MESES_LARGOS[mes - 1] || "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export default function CajaAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_caja_listar", SIN_DATOS);
  const avisar = useAvisos();
  const hoy = useHoyMontevideo()?.hoy ?? "";

  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<MovimientoCaja | null>(null);
  const [borrando, setBorrando] = useState(false);

  const movimientos = useMemo(() => datos?.movimientos ?? [], [datos]);
  const mesActual = hoy.slice(0, 7);

  const totales = useMemo(() => {
    let saldo = 0;
    let ingresosMes = 0;
    let gastosMes = 0;
    for (const movimiento of movimientos) {
      saldo += signo(movimiento);
      if (claveMes(movimiento.fecha) === mesActual) {
        if (movimiento.tipo === "ingreso") ingresosMes += movimiento.monto;
        else gastosMes += movimiento.monto;
      }
    }
    return {
      saldo: redondear(saldo),
      ingresosMes: redondear(ingresosMes),
      gastosMes: redondear(gastosMes),
    };
  }, [movimientos, mesActual]);

  /* Agrupados por mes, del más nuevo al más viejo. */
  const meses = useMemo(() => {
    const grupos = new Map<string, MovimientoCaja[]>();
    const ordenados = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
    for (const movimiento of ordenados) {
      if (filtro !== "todo" && movimiento.tipo !== filtro) continue;
      const clave = claveMes(movimiento.fecha) || "sin-fecha";
      grupos.set(clave, [...(grupos.get(clave) ?? []), movimiento]);
    }
    return [...grupos.entries()].map(([clave, lista]) => ({
      clave,
      lista,
      neto: redondear(lista.reduce((suma, item) => suma + signo(item), 0)),
    }));
  }, [movimientos, filtro]);

  const cantidades = useMemo(
    () => ({
      todo: movimientos.length,
      ingreso: movimientos.filter((item) => item.tipo === "ingreso").length,
      gasto: movimientos.filter((item) => item.tipo === "gasto").length,
    }),
    [movimientos]
  );

  function abrirFormulario(tipo: TipoMovimiento) {
    setFormulario({
      tipo,
      concepto: "",
      monto: "",
      fecha: hoy,
      categoria: CATEGORIAS[tipo][0],
    });
  }

  async function guardar() {
    if (!formulario) return;
    const monto = Number(formulario.monto.replace(",", "."));
    if (!formulario.concepto.trim()) {
      avisar("Escribí en qué fue.", "error");
      return;
    }
    if (!(monto > 0)) {
      avisar("Poné un monto mayor a 0.", "error");
      return;
    }

    setGuardando(true);
    try {
      const { movimiento } = await accionAdmin("admin_caja_guardar", {
        tipo: formulario.tipo,
        concepto: formulario.concepto.trim(),
        monto,
        fecha: formulario.fecha,
        categoria: formulario.categoria,
      });
      setDatos((actual) =>
        actual ? { ...actual, movimientos: [movimiento, ...actual.movimientos] } : actual
      );
      avisar(movimiento.tipo === "gasto" ? "Gasto anotado" : "Ingreso anotado");
      setFormulario(null);
    } catch (errorAccion) {
      avisar(errorAccion instanceof Error ? errorAccion.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await accionAdmin("admin_caja_borrar", { id: aBorrar.id });
      setDatos((actual) =>
        actual
          ? { ...actual, movimientos: actual.movimientos.filter((item) => item.id !== aBorrar.id) }
          : actual
      );
      avisar("Movimiento borrado");
      setABorrar(null);
    } catch (errorAccion) {
      avisar(errorAccion instanceof Error ? errorAccion.message : "No se pudo borrar.", "error");
    } finally {
      setBorrando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Caja"
        subtitulo="Lo que entra y lo que sale"
        accion={
          <Boton
            variante="fantasma"
            onClick={recargar}
            cargando={recargando}
            icono={<RefreshCw size={16} />}
            aria-label="Actualizar caja"
            className="w-11 px-0"
          />
        }
      />

      {cargando ? (
        <Esqueleto filas={5} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : (
        <>
          <Tarjeta className="mb-3 overflow-hidden">
            <div className="px-5 pb-4 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Plata que hay
              </p>
              <p
                className={`mt-1 text-4xl font-black tabular-nums ${
                  totales.saldo < 0 ? "text-red-600 dark:text-red-400" : ""
                }`}
              >
                {totales.saldo < 0 ? "−" : ""}
                {pesos(Math.abs(totales.saldo))}
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--kint-panel-border)] border-t border-[var(--kint-panel-border)]">
              <div className="px-5 py-3">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">Entró este mes</p>
                <p className="text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                  +{pesos(totales.ingresosMes)}
                </p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">Salió este mes</p>
                <p className="text-lg font-black tabular-nums text-red-600 dark:text-red-400">
                  −{pesos(totales.gastosMes)}
                </p>
              </div>
            </div>
          </Tarjeta>

          <div className="mb-5 grid grid-cols-2 gap-2.5">
            <Boton
              variante="peligro"
              icono={<Minus size={16} />}
              onClick={() => abrirFormulario("gasto")}
            >
              Anotar gasto
            </Boton>
            <Boton
              variante="exito"
              icono={<Plus size={16} />}
              onClick={() => abrirFormulario("ingreso")}
            >
              Anotar ingreso
            </Boton>
          </div>

          <Segmentos
            opciones={[
              { valor: "todo", texto: "Todo", cantidad: cantidades.todo },
              { valor: "ingreso", texto: "Ingresos", cantidad: cantidades.ingreso },
              { valor: "gasto", texto: "Gastos", cantidad: cantidades.gasto },
            ]}
            valor={filtro}
            onCambiar={setFiltro}
          />

          {error && <CajaError mensaje={error} onReintentar={recargar} />}

          {meses.length === 0 ? (
            <Vacio
              titulo={filtro === "gasto" ? "Sin gastos" : "Todavía no hay movimientos"}
              texto={
                filtro === "gasto"
                  ? "Cuando compres algo, anotalo con «Anotar gasto»."
                  : "Cuando confirmes el pago de un pedido, entra solo acá. Si ya tenés plata guardada, anotala como «Saldo inicial»."
              }
              icono={<Wallet size={30} strokeWidth={1.5} />}
            />
          ) : (
            <div className="space-y-5" aria-busy={recargando}>
              {meses.map((mes) => (
                <section key={mes.clave}>
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-black">
                      {mes.clave === "sin-fecha" ? "Sin fecha" : nombreMes(mes.clave)}
                    </h2>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        mes.neto < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {mes.neto < 0 ? "−" : "+"}
                      {pesos(Math.abs(mes.neto))}
                    </span>
                  </div>
                  <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
                    {mes.lista.map((movimiento) => (
                      <FilaMovimiento
                        key={movimiento.id}
                        movimiento={movimiento}
                        onBorrar={() => setABorrar(movimiento)}
                      />
                    ))}
                  </Tarjeta>
                </section>
              ))}
            </div>
          )}

          <p className="mt-6 px-1 text-xs leading-5 text-[var(--text-muted)]">
            Los pagos de pedidos entran solos cuando los confirmás (seña, saldo o pago total) y se
            van solos si cancelás o borrás el pedido. En la tienda, el saldo de una compra con seña
            entra cuando la marcás como Entregado.
            {datos?.desde ? ` La caja cuenta desde el ${fechaHora(datos.desde)}.` : ""}
          </p>
        </>
      )}

      <Hoja
        abierta={Boolean(formulario)}
        onCerrar={() => {
          if (!guardando) setFormulario(null);
        }}
        titulo={formulario?.tipo === "gasto" ? "Anotar gasto" : "Anotar ingreso"}
        pie={
          <Boton
            variante={formulario?.tipo === "gasto" ? "peligro" : "exito"}
            tamano="grande"
            className="w-full"
            cargando={guardando}
            onClick={() => void guardar()}
          >
            Guardar
          </Boton>
        }
      >
        {formulario && (
          <div className="space-y-4">
            <Campo etiqueta={formulario.tipo === "gasto" ? "¿En qué fue?" : "¿De dónde vino?"}>
              <input
                className={claseInput}
                value={formulario.concepto}
                onChange={(evento) => setFormulario({ ...formulario, concepto: evento.target.value })}
                maxLength={200}
                placeholder={
                  formulario.tipo === "gasto" ? "Ej.: 2 rollos de PLA blanco" : "Ej.: Plata que ya tenía"
                }
                autoFocus
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Monto ($)">
                <input
                  className={claseInput}
                  value={formulario.monto}
                  onChange={(evento) =>
                    setFormulario({ ...formulario, monto: evento.target.value.replace(/[^\d.,]/g, "") })
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </Campo>
              <Campo etiqueta="Fecha">
                <input
                  type="date"
                  className={claseInput}
                  value={formulario.fecha}
                  max={hoy || undefined}
                  onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })}
                />
              </Campo>
            </div>

            <Campo etiqueta="Categoría">
              <select
                className={claseInput}
                value={formulario.categoria}
                onChange={(evento) => setFormulario({ ...formulario, categoria: evento.target.value })}
              >
                {CATEGORIAS[formulario.tipo].map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        )}
      </Hoja>

      <DialogoConfirmar
        abierto={Boolean(aBorrar)}
        titulo="Borrar movimiento"
        mensaje={
          aBorrar
            ? `Se borra «${aBorrar.concepto}» (${pesos(aBorrar.monto)}) de la caja.`
            : ""
        }
        textoConfirmar="Borrar"
        peligro
        cargando={borrando}
        onConfirmar={() => void borrar()}
        onCancelar={() => setABorrar(null)}
      />
    </>
  );
}

function FilaMovimiento({
  movimiento,
  onBorrar,
}: {
  movimiento: MovimientoCaja;
  onBorrar: () => void;
}) {
  const ingreso = movimiento.tipo === "ingreso";
  const enlace = movimiento.pedido.startsWith("KNT-")
    ? `/admin/pedidos/${encodeURIComponent(movimiento.pedido)}`
    : movimiento.pedido.startsWith("TND-")
      ? `/admin/tienda?pedido=${encodeURIComponent(movimiento.pedido)}`
      : "";

  const concepto = enlace ? (
    <Link href={enlace} className="block truncate text-sm font-bold hover:underline">
      {movimiento.concepto}
    </Link>
  ) : (
    <p className="truncate text-sm font-bold">{movimiento.concepto}</p>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          ingreso
            ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/12 text-red-600 dark:text-red-400"
        }`}
      >
        {ingreso ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
      </span>

      <div className="min-w-0 flex-1">
        {concepto}
        <p className="truncate text-xs text-[var(--text-muted)]">
          {[fechaHora(movimiento.fecha), movimiento.categoria].filter(Boolean).join(" · ")}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-black tabular-nums ${
          ingreso ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {ingreso ? "+" : "−"}
        {pesos(movimiento.monto)}
      </span>

      {!movimiento.automatico && (
        <button
          type="button"
          onClick={onBorrar}
          aria-label={`Borrar ${movimiento.concepto}`}
          className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
