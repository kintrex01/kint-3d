"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
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
import { GastosFijos } from "@/components/admin/caja/GastosFijos";

/*
 * Caja: lo que entra (pagos de clientes que confirmaste) y lo que sale
 * (gastos que cargás acá), con gráficas por período. Los ingresos de
 * pedidos se anotan solos y se van solos si el pedido se cancela.
 * Ver Caja_Kint3D.js.
 */

type Filtro = "todo" | "ingreso" | "gasto";
type Periodo = "mes" | "3m" | "12m" | "todo";
type TipoMovimiento = MovimientoCaja["tipo"];

const SIN_DATOS = {};
const ZONA = "America/Montevideo";
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const CATEGORIAS: Record<TipoMovimiento, string[]> = {
  gasto: ["Filamento", "Materiales", "Herramientas", "Repuestos", "Envíos", "Publicidad", "Otro"],
  ingreso: ["Saldo inicial", "Venta fuera de la web", "Otro"],
};

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "mes", texto: "Este mes" },
  { valor: "3m", texto: "3 meses" },
  { valor: "12m", texto: "12 meses" },
  { valor: "todo", texto: "Todo" },
];

const COMPARACION: Record<Periodo, string> = {
  mes: "vs. mes pasado",
  "3m": "vs. 3 meses antes",
  "12m": "vs. año anterior",
  todo: "",
};

/* Colores de las porciones de las tortas. */
const PALETA = ["#38bdf8", "#a78bfa", "#f472b6", "#fb923c", "#facc15", "#34d399", "#94a3b8"];

type Formulario = {
  tipo: TipoMovimiento;
  concepto: string;
  monto: string;
  fecha: string;
  categoria: string;
};

type Cubeta = {
  clave: string; // "2026-10" o "2026-10-16"
  etiqueta: string; // "oct" o "16"
  titulo: string; // "Octubre 2026" o "16 oct"
  ingresos: number;
  gastos: number;
  saldo: number; // al final de la cubeta
};

/* ------------------------------------------------------------------ */
/* Fechas y números                                                    */
/* ------------------------------------------------------------------ */

function redondear(numero: number) {
  return Math.round(numero * 100) / 100;
}

function signo(movimiento: MovimientoCaja) {
  return movimiento.tipo === "ingreso" ? movimiento.monto : -movimiento.monto;
}

/* "yyyy-mm-dd" del movimiento, en hora de Uruguay. */
function diaDe(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("en-CA", { timeZone: ZONA });
}

function siguienteDia(dia: string) {
  const [anio, mes, numero] = dia.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, numero + 1)).toISOString().slice(0, 10);
}

function sumarMeses(mes: string, cantidad: number) {
  const [anio, numero] = mes.split("-").map(Number);
  const total = anio * 12 + (numero - 1) + cantidad;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function nombreMes(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  const nombre = MESES_LARGOS[mes - 1] || "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/* $12.345 → "$12 mil" en los ejes y etiquetas chicas. */
function pesosCortos(valor: number) {
  const absoluto = Math.abs(valor);
  const menos = valor < 0 ? "−" : "";
  if (absoluto >= 1_000_000) {
    return `${menos}$${(absoluto / 1_000_000).toLocaleString("es-UY", { maximumFractionDigits: 1 })} M`;
  }
  if (absoluto >= 10_000) return `${menos}$${Math.round(absoluto / 1000).toLocaleString("es-UY")} mil`;
  return `${menos}${pesos(Math.round(absoluto))}`;
}

function pesosConSigno(valor: number) {
  if (Math.abs(valor) < 0.005) return pesos(0);
  return `${valor < 0 ? "−" : ""}${pesos(Math.abs(valor))}`;
}

/* De dónde vino un ingreso: maquetas, tienda o lo cargado a mano. */
function origenIngreso(movimiento: MovimientoCaja) {
  if (movimiento.pedido.startsWith("KNT-")) return "Maquetas";
  if (movimiento.pedido.startsWith("TND-")) return "Tienda";
  return movimiento.categoria || "Otros";
}

/* Días [desde, hasta) del período, y los del período anterior del mismo largo. */
function rangoPeriodo(periodo: Periodo, hoy: string, primerDia: string) {
  const meses = periodo === "mes" ? 1 : periodo === "3m" ? 3 : periodo === "12m" ? 12 : 0;
  const hasta = siguienteDia(hoy);

  if (!meses) {
    return { desde: `${(primerDia < hoy ? primerDia : hoy).slice(0, 7)}-01`, hasta, anterior: null };
  }

  const mesDesde = sumarMeses(hoy.slice(0, 7), -(meses - 1));
  return {
    desde: `${mesDesde}-01`,
    hasta,
    anterior: { desde: `${sumarMeses(mesDesde, -meses)}-01`, hasta: `${mesDesde}-01` },
  };
}

/* Días (este mes) o meses (el resto), con el saldo acumulado al final de cada uno. */
function armarCubetas(movimientos: MovimientoCaja[], porDia: boolean, desde: string, hoy: string) {
  const cubetas: Cubeta[] = [];

  if (porDia) {
    for (let dia = desde; dia <= hoy; dia = siguienteDia(dia)) {
      const numero = Number(dia.slice(8));
      cubetas.push({
        clave: dia,
        etiqueta: String(numero),
        titulo: `${numero} ${MESES_CORTOS[Number(dia.slice(5, 7)) - 1]}`,
        ingresos: 0,
        gastos: 0,
        saldo: 0,
      });
    }
  } else {
    for (let mes = desde.slice(0, 7); mes <= hoy.slice(0, 7); mes = sumarMeses(mes, 1)) {
      cubetas.push({
        clave: mes,
        etiqueta: MESES_CORTOS[Number(mes.slice(5)) - 1],
        titulo: nombreMes(mes),
        ingresos: 0,
        gastos: 0,
        saldo: 0,
      });
    }
  }

  const posiciones = new Map(cubetas.map((cubeta, posicion) => [cubeta.clave, posicion]));
  let saldo = 0;

  for (const movimiento of movimientos) {
    const dia = diaDe(movimiento.fecha);
    if (!dia) continue;
    if (dia < desde) {
      saldo += signo(movimiento); // lo de antes del período arranca la curva
      continue;
    }
    const posicion = posiciones.get(porDia ? dia : dia.slice(0, 7));
    if (posicion === undefined) continue;
    if (movimiento.tipo === "ingreso") cubetas[posicion].ingresos += movimiento.monto;
    else cubetas[posicion].gastos += movimiento.monto;
  }

  for (const cubeta of cubetas) {
    saldo += cubeta.ingresos - cubeta.gastos;
    cubeta.ingresos = redondear(cubeta.ingresos);
    cubeta.gastos = redondear(cubeta.gastos);
    cubeta.saldo = redondear(saldo);
  }
  return cubetas;
}

function agrupar(movimientos: MovimientoCaja[], clave: (movimiento: MovimientoCaja) => string) {
  const totales = new Map<string, number>();
  for (const movimiento of movimientos) {
    const nombre = clave(movimiento);
    totales.set(nombre, (totales.get(nombre) ?? 0) + movimiento.monto);
  }
  return [...totales.entries()]
    .map(([nombre, monto]) => ({ nombre, monto: redondear(monto) }))
    .sort((a, b) => b.monto - a.monto);
}

function sumar(lista: MovimientoCaja[], tipo: TipoMovimiento) {
  return redondear(
    lista.filter((item) => item.tipo === tipo).reduce((suma, item) => suma + item.monto, 0)
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function CajaAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_caja_listar", SIN_DATOS);
  const avisar = useAvisos();
  const hoy = useHoyMontevideo()?.hoy ?? "";

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<MovimientoCaja | null>(null);
  const [borrando, setBorrando] = useState(false);

  const movimientos = useMemo(() => datos?.movimientos ?? [], [datos]);

  const analisis = useMemo(() => {
    if (!hoy) return null;

    const primerDia = movimientos.map((item) => diaDe(item.fecha)).filter(Boolean).sort()[0] || hoy;
    const rango = rangoPeriodo(periodo, hoy, primerDia);
    const entre = (desde: string, hasta: string) =>
      movimientos.filter((item) => {
        const dia = diaDe(item.fecha);
        return dia >= desde && dia < hasta;
      });

    const delPeriodo = entre(rango.desde, rango.hasta);
    const delAnterior = rango.anterior ? entre(rango.anterior.desde, rango.anterior.hasta) : null;

    const ingresos = sumar(delPeriodo, "ingreso");
    const gastos = sumar(delPeriodo, "gasto");
    const cobrados = delPeriodo.filter((item) => item.tipo === "ingreso" && item.pedido);
    const pedidos = new Set(cobrados.map((item) => item.pedido)).size;

    return {
      saldo: redondear(movimientos.reduce((suma, item) => suma + signo(item), 0)),
      ingresos,
      gastos,
      neto: redondear(ingresos - gastos),
      margen: ingresos > 0 ? Math.round(((ingresos - gastos) / ingresos) * 100) : null,
      pedidos,
      ticket: pedidos ? redondear(cobrados.reduce((suma, item) => suma + item.monto, 0) / pedidos) : 0,
      anterior: delAnterior
        ? {
            ingresos: sumar(delAnterior, "ingreso"),
            gastos: sumar(delAnterior, "gasto"),
            neto: redondear(sumar(delAnterior, "ingreso") - sumar(delAnterior, "gasto")),
          }
        : null,
      cubetas: armarCubetas(movimientos, periodo === "mes", rango.desde, hoy),
      origenes: agrupar(delPeriodo.filter((item) => item.tipo === "ingreso"), origenIngreso),
      categorias: agrupar(
        delPeriodo.filter((item) => item.tipo === "gasto"),
        (item) => item.categoria || "Otro"
      ),
    };
  }, [movimientos, periodo, hoy]);

  /* Lista de abajo: agrupada por mes, del más nuevo al más viejo. */
  const meses = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    const grupos = new Map<string, MovimientoCaja[]>();
    const ordenados = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
    for (const movimiento of ordenados) {
      if (filtro !== "todo" && movimiento.tipo !== filtro) continue;
      if (
        termino &&
        ![movimiento.concepto, movimiento.categoria, movimiento.pedido]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(termino)
      ) {
        continue;
      }
      const clave = diaDe(movimiento.fecha).slice(0, 7) || "sin-fecha";
      grupos.set(clave, [...(grupos.get(clave) ?? []), movimiento]);
    }
    return [...grupos.entries()].map(([clave, lista]) => ({
      clave,
      lista,
      neto: redondear(lista.reduce((suma, item) => suma + signo(item), 0)),
    }));
  }, [movimientos, filtro, busqueda]);

  const cantidades = useMemo(
    () => ({
      todo: movimientos.length,
      ingreso: movimientos.filter((item) => item.tipo === "ingreso").length,
      gasto: movimientos.filter((item) => item.tipo === "gasto").length,
    }),
    [movimientos]
  );

  function abrirFormulario(tipo: TipoMovimiento) {
    setFormulario({ tipo, concepto: "", monto: "", fecha: hoy, categoria: CATEGORIAS[tipo][0] });
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
        sentido: formulario.tipo,
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
        subtitulo="Lo que entra, lo que sale y cuánto queda"
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

      {error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : cargando || !analisis ? (
        <Esqueleto filas={5} />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-x-3">
            <Segmentos opciones={PERIODOS} valor={periodo} onCambiar={setPeriodo} />
            <div className="mb-4 flex gap-2">
              <Boton variante="peligro" icono={<Minus size={16} />} onClick={() => abrirFormulario("gasto")}>
                Gasto
              </Boton>
              <Boton variante="exito" icono={<Plus size={16} />} onClick={() => abrirFormulario("ingreso")}>
                Ingreso
              </Boton>
            </div>
          </div>

          {error && <CajaError mensaje={error} onReintentar={recargar} />}

          {/* Saldo + curva */}
          <Tarjeta className="mb-3 overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Plata que hay
                </p>
                <p
                  className={`mt-1 text-4xl font-black tabular-nums sm:text-5xl ${
                    analisis.saldo < 0 ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  {pesosConSigno(analisis.saldo)}
                </p>
              </div>
              <Variacion
                actual={analisis.neto}
                anterior={analisis.anterior?.neto}
                texto={`${pesosConSigno(analisis.neto)} en el período`}
                positivoEsBueno
              />
            </div>
            <CurvaSaldo cubetas={analisis.cubetas} />
          </Tarjeta>

          {/* Números del período */}
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              titulo="Entró"
              valor={pesos(analisis.ingresos)}
              color="text-emerald-700 dark:text-emerald-400"
              icono={<ArrowDownLeft size={16} />}
              fondoIcono="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
              pie={
                <Variacion
                  actual={analisis.ingresos}
                  anterior={analisis.anterior?.ingresos}
                  texto={COMPARACION[periodo]}
                  positivoEsBueno
                  chico
                />
              }
            />
            <Indicador
              titulo="Salió"
              valor={pesos(analisis.gastos)}
              color="text-red-600 dark:text-red-400"
              icono={<ArrowUpRight size={16} />}
              fondoIcono="bg-red-500/12 text-red-600 dark:text-red-400"
              pie={
                <Variacion
                  actual={analisis.gastos}
                  anterior={analisis.anterior?.gastos}
                  texto={COMPARACION[periodo]}
                  chico
                />
              }
            />
            <Indicador
              titulo="Ganancia"
              valor={pesosConSigno(analisis.neto)}
              color={analisis.neto < 0 ? "text-red-600 dark:text-red-400" : ""}
              icono={<TrendingUp size={16} />}
              fondoIcono="bg-sky-500/12 text-sky-600 dark:text-sky-400"
              pie={
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  {analisis.margen === null ? "Sin ingresos todavía" : `Margen ${analisis.margen}%`}
                </span>
              }
            />
            <Indicador
              titulo="Pedidos cobrados"
              valor={String(analisis.pedidos)}
              icono={<Receipt size={16} />}
              fondoIcono="bg-violet-500/12 text-violet-600 dark:text-violet-400"
              pie={
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  {analisis.pedidos ? `Promedio ${pesos(analisis.ticket)} c/u` : "Ninguno en el período"}
                </span>
              }
            />
          </div>

          {/* Barras + tortas */}
          <div className="mb-8 grid gap-3 lg:grid-cols-5">
            <Tarjeta className="p-4 lg:col-span-3">
              <GraficoBarras cubetas={analisis.cubetas} porDia={periodo === "mes"} />
            </Tarjeta>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
              <Tarjeta className="p-4">
                <Torta
                  titulo="¿De dónde entra?"
                  partes={analisis.origenes}
                  vacio="Todavía no entró plata en este período."
                />
              </Tarjeta>
              <Tarjeta className="p-4">
                <Torta titulo="¿En qué se gasta?" partes={analisis.categorias} vacio="Sin gastos en este período." />
              </Tarjeta>
            </div>
          </div>

          <GastosFijos fijos={datos?.fijos ?? []} onDatos={setDatos} />

          {/* Movimientos */}
          <h2 className="mb-3 text-lg font-black">Movimientos</h2>
          <div className="relative mb-3">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por concepto, categoría o pedido"
              aria-label="Buscar movimientos"
              className={`${claseInput} h-11 pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden`}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Borrar búsqueda"
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)]"
              >
                <X size={16} />
              </button>
            )}
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

          {meses.length === 0 ? (
            <Vacio
              titulo={
                busqueda.trim() ? "Sin resultados" : filtro === "gasto" ? "Sin gastos" : "Todavía no hay movimientos"
              }
              texto={
                busqueda.trim()
                  ? `No hay movimientos con “${busqueda.trim()}”.`
                  : filtro === "gasto"
                    ? "Cuando compres algo, anotalo con «Gasto»."
                    : "Cuando confirmes el pago de un pedido, entra solo acá. Si ya tenés plata guardada, anotala como «Saldo inicial»."
              }
              icono={<Wallet size={30} strokeWidth={1.5} />}
            />
          ) : (
            <div className="space-y-5" aria-busy={recargando}>
              {meses.map((mes) => (
                <section key={mes.clave}>
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h3 className="text-sm font-black">
                      {mes.clave === "sin-fecha" ? "Sin fecha" : nombreMes(mes.clave)}
                    </h3>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        mes.neto < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
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
                placeholder={formulario.tipo === "gasto" ? "Ej.: 2 rollos de PLA blanco" : "Ej.: Plata que ya tenía"}
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

            <div>
              <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Categoría</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS[formulario.tipo].map((categoria) => {
                  const elegida = formulario.categoria === categoria;
                  return (
                    <button
                      key={categoria}
                      type="button"
                      aria-pressed={elegida}
                      onClick={() => setFormulario({ ...formulario, categoria })}
                      className={`min-h-9 rounded-full border px-3 text-xs font-bold transition ${
                        elegida
                          ? "border-[var(--acento)] bg-[var(--acento)] text-white"
                          : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      {categoria}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Hoja>

      <DialogoConfirmar
        abierto={Boolean(aBorrar)}
        titulo="Borrar movimiento"
        mensaje={aBorrar ? `Se borra «${aBorrar.concepto}» (${pesos(aBorrar.monto)}) de la caja.` : ""}
        textoConfirmar="Borrar"
        peligro
        cargando={borrando}
        onConfirmar={() => void borrar()}
        onCancelar={() => setABorrar(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

/* Flechita con el % de cambio contra el período anterior. */
function Variacion({
  actual,
  anterior,
  texto,
  positivoEsBueno = false,
  chico = false,
}: {
  actual: number;
  anterior?: number;
  texto: string;
  positivoEsBueno?: boolean;
  chico?: boolean;
}) {
  const tamano = chico ? "text-[11px]" : "text-xs";
  if (anterior === undefined || Math.abs(anterior) < 0.005) {
    return (
      <span className={`${tamano} font-bold text-[var(--text-muted)]`}>
        {chico ? (texto ? "Sin datos para comparar" : "") : texto}
      </span>
    );
  }

  const cambio = Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
  const sube = cambio >= 0;
  const bueno = positivoEsBueno ? sube : !sube;
  const Flecha = sube ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${tamano} font-bold text-[var(--text-muted)]`}>
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${
          cambio === 0
            ? "bg-[var(--kint-panel-soft)]"
            : bueno
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/12 text-red-600 dark:text-red-400"
        }`}
      >
        <Flecha size={12} strokeWidth={2.6} />
        {Math.abs(cambio)}%
      </span>
      {texto}
    </span>
  );
}

function Indicador({
  titulo,
  valor,
  color = "",
  icono,
  fondoIcono,
  pie,
}: {
  titulo: string;
  valor: string;
  color?: string;
  icono: ReactNode;
  fondoIcono: string;
  pie: ReactNode;
}) {
  return (
    <Tarjeta className="flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--text-muted)]">{titulo}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${fondoIcono}`}>{icono}</span>
      </div>
      <p className={`truncate text-2xl font-black tabular-nums ${color}`}>{valor}</p>
      <div className="min-h-5">{pie}</div>
    </Tarjeta>
  );
}

/* Curva del saldo acumulado, con relleno degradado. Al pasar el dedo muestra el valor. */
function CurvaSaldo({ cubetas }: { cubetas: Cubeta[] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [activa, setActiva] = useState<number | null>(null);

  if (cubetas.length === 0) return <div className="h-6" />;

  const valores = cubetas.map((cubeta) => cubeta.saldo);
  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(1, ...valores);
  const ancho = 100;
  const alto = 40;
  const x = (indice: number) => (cubetas.length === 1 ? ancho : (indice / (cubetas.length - 1)) * ancho);
  const y = (valor: number) => alto - 2 - ((valor - minimo) / (maximo - minimo || 1)) * (alto - 8);

  const linea =
    cubetas.length === 1
      ? `M0,${y(valores[0])} L${ancho},${y(valores[0])}`
      : `M${cubetas.map((cubeta, indice) => `${x(indice)},${y(cubeta.saldo)}`).join(" L")}`;
  const area = `${linea} L${ancho},${alto} L0,${alto} Z`;
  const colorLinea = valores[valores.length - 1] < 0 ? "#ef4444" : "#10b981";
  const elegida = activa === null ? null : cubetas[activa];

  return (
    <div className="mt-3">
      <p className="h-5 px-5 text-xs font-bold text-[var(--text-muted)]">
        {elegida ? (
          <>
            {elegida.titulo}: <span className="text-[var(--text-main)]">{pesosConSigno(elegida.saldo)}</span>
          </>
        ) : (
          "Cómo fue cambiando la plata"
        )}
      </p>
      <div className="relative h-28 sm:h-36">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          preserveAspectRatio="none"
          className="block h-full w-full touch-none"
          role="img"
          aria-label="Evolución del saldo"
          onPointerMove={(evento) => {
            const caja = evento.currentTarget.getBoundingClientRect();
            const proporcion = (evento.clientX - caja.left) / caja.width;
            setActiva(Math.max(0, Math.min(cubetas.length - 1, Math.round(proporcion * (cubetas.length - 1)))));
          }}
          onPointerLeave={() => setActiva(null)}
        >
          <defs>
            <linearGradient id={`relleno${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colorLinea} stopOpacity="0.35" />
              <stop offset="100%" stopColor={colorLinea} stopOpacity="0" />
            </linearGradient>
          </defs>
          {minimo < 0 && (
            <line
              x1="0"
              x2={ancho}
              y1={y(0)}
              y2={y(0)}
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={area} fill={`url(#relleno${id})`} />
          <path
            d={linea}
            fill="none"
            stroke={colorLinea}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {activa !== null && (
            <line
              x1={x(activa)}
              x2={x(activa)}
              y1="0"
              y2={alto}
              stroke="currentColor"
              strokeOpacity="0.3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {activa !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--kint-panel)]"
            style={{
              left: `${x(activa)}%`,
              top: `${(y(cubetas[activa].saldo) / alto) * 100}%`,
              background: colorLinea,
            }}
          />
        )}
      </div>
    </div>
  );
}

/* Barras de ingresos (verde) y gastos (rojo) por día o por mes. */
function GraficoBarras({ cubetas, porDia }: { cubetas: Cubeta[]; porDia: boolean }) {
  const [activa, setActiva] = useState<number | null>(null);
  const maximo = Math.max(1, ...cubetas.map((cubeta) => Math.max(cubeta.ingresos, cubeta.gastos)));
  const elegida = activa === null ? null : cubetas[activa];
  // Con muchos días, solo algunas etiquetas abajo.
  const cadaCuanto = cubetas.length > 16 ? Math.ceil(cubetas.length / 8) : 1;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black">{porDia ? "Día a día" : "Mes a mes"}</p>
          <p className="min-h-4 text-[11px] font-bold text-[var(--text-muted)]">
            {elegida
              ? `${elegida.titulo}: +${pesos(elegida.ingresos)} · −${pesos(elegida.gastos)}`
              : "Tocá una barra para ver el detalle"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Entró
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            Salió
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex h-44 flex-col justify-between pb-5 text-right text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
          <span>{pesosCortos(maximo)}</span>
          <span>{pesosCortos(maximo / 2)}</span>
          <span>$0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-5 top-1.5 flex flex-col justify-between"
          >
            {[0, 1, 2].map((linea) => (
              <span key={linea} className="border-t border-dashed border-[var(--kint-panel-border)]" />
            ))}
          </div>
          <div className="relative flex h-44 items-end gap-[3px] sm:gap-1.5" role="img" aria-label="Ingresos y gastos">
            {cubetas.map((cubeta, indice) => (
              <button
                key={cubeta.clave}
                type="button"
                onPointerEnter={() => setActiva(indice)}
                onPointerLeave={() => setActiva(null)}
                onClick={() => setActiva(activa === indice ? null : indice)}
                aria-label={`${cubeta.titulo}: entró ${pesos(cubeta.ingresos)}, salió ${pesos(cubeta.gastos)}`}
                className={`flex h-full min-w-0 flex-1 flex-col justify-end rounded-md transition ${
                  activa === indice ? "bg-[var(--kint-panel-soft)]" : ""
                }`}
              >
                <span className="flex h-[calc(100%-1.25rem)] w-full items-end justify-center gap-[2px] px-[1px]">
                  <span
                    className="w-full max-w-4 rounded-t-[3px] bg-emerald-500 transition-all"
                    style={{ height: cubeta.ingresos ? `${Math.max(2, (cubeta.ingresos / maximo) * 100)}%` : 0 }}
                  />
                  <span
                    className="w-full max-w-4 rounded-t-[3px] bg-red-500 transition-all"
                    style={{ height: cubeta.gastos ? `${Math.max(2, (cubeta.gastos / maximo) * 100)}%` : 0 }}
                  />
                </span>
                <span className="mt-1 block h-4 truncate text-center text-[10px] font-bold text-[var(--text-muted)]">
                  {indice % cadaCuanto === 0 || indice === cubetas.length - 1 ? cubeta.etiqueta : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* Torta (anillo) con leyenda: % y monto de cada parte. */
function Torta({
  titulo,
  partes,
  vacio,
}: {
  titulo: string;
  partes: { nombre: string; monto: number }[];
  vacio: string;
}) {
  const total = partes.reduce((suma, parte) => suma + parte.monto, 0);
  const radio = 15.915; // circunferencia ≈ 100: los % van directo al trazo
  const separacion = partes.length > 1 ? 0.8 : 0;
  const porciones = partes.map((parte) => (parte.monto / total) * 100);
  const inicios = porciones.map((_, indice) => porciones.slice(0, indice).reduce((suma, valor) => suma + valor, 0));

  return (
    <>
      <p className="mb-3 text-sm font-black">{titulo}</p>
      {total <= 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">{vacio}</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
              <circle cx="21" cy="21" r={radio} fill="none" stroke="var(--kint-panel-soft)" strokeWidth="6" />
              {partes.map((parte, indice) => (
                <circle
                  key={parte.nombre}
                  cx="21"
                  cy="21"
                  r={radio}
                  fill="none"
                  stroke={PALETA[indice % PALETA.length]}
                  strokeWidth="6"
                  strokeDasharray={`${Math.max(0, porciones[indice] - separacion)} ${100 - porciones[indice] + separacion}`}
                  strokeDashoffset={-inicios[indice]}
                >
                  <title>{`${parte.nombre}: ${pesos(parte.monto)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Total</span>
              <span className="text-xs font-black tabular-nums">{pesosCortos(total)}</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {partes.slice(0, 6).map((parte, indice) => (
              <li key={parte.nombre} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: PALETA[indice % PALETA.length] }}
                />
                <span className="min-w-0 flex-1 truncate font-bold">{parte.nombre}</span>
                <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                  {Math.round(porciones[indice])}%
                </span>
                <span className="w-16 shrink-0 text-right font-black tabular-nums">{pesosCortos(parte.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function FilaMovimiento({ movimiento, onBorrar }: { movimiento: MovimientoCaja; onBorrar: () => void }) {
  const ingreso = movimiento.tipo === "ingreso";
  const enlace = movimiento.pedido.startsWith("KNT-")
    ? `/admin/pedidos/${encodeURIComponent(movimiento.pedido)}`
    : movimiento.pedido.startsWith("TND-")
      ? `/admin/tienda?pedido=${encodeURIComponent(movimiento.pedido)}`
      : "";

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
        {enlace ? (
          <Link href={enlace} className="block truncate text-sm font-bold hover:underline">
            {movimiento.concepto}
          </Link>
        ) : (
          <p className="truncate text-sm font-bold">{movimiento.concepto}</p>
        )}
        <p className="truncate text-xs text-[var(--text-muted)]">
          {[fechaHora(movimiento.fecha), ingreso ? origenIngreso(movimiento) : movimiento.categoria]
            .filter(Boolean)
            .join(" · ")}
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
