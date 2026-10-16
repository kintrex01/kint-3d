"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarOff,
  CalendarX2,
  Check,
  ChevronRight,
  Mail,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useDatosAdmin } from "@/lib/admin-cliente";
import {
  ESTADOS_PEDIDO,
  type EntregaAgenda,
  type MetricasAdmin,
  type ResumenAdmin,
} from "@/lib/admin-tipos";
import {
  CajaError,
  Chip,
  Esqueleto,
  Tarjeta,
  TituloSeccion,
  Vacio,
  fechaDia,
  pesos,
  textoEstado,
  tonoEstado,
  type Tono,
} from "@/components/admin/ui";
import {
  fechaLarga,
  soloDia,
  sumarDias,
  useHoyMontevideo,
} from "@/components/admin/fechas";

const SIN_DATOS = {};

function saludo(hora: number | undefined) {
  if (hora === undefined) return "Hola";
  if (hora >= 5 && hora < 12) return "Buen día";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

/* ------------------------------------------------------------------ */
/* Banner con métricas                                                 */
/* ------------------------------------------------------------------ */

/* Variación contra el mes anterior: +12% / -5% / null si no hay base. */
function variacion(actual: number, anterior: number) {
  if (!(anterior > 0)) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

function Banner({
  titulo,
  fecha,
  metricas,
  accion,
}: {
  titulo: string;
  fecha: string;
  metricas?: MetricasAdmin | null;
  accion: React.ReactNode;
}) {
  const cambio = metricas
    ? variacion(metricas.ventasMes, metricas.ventasMesAnterior)
    : null;

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#1f3f85_0%,#132a5e_55%,#0a1838_100%)] p-5 text-white shadow-[0_18px_50px_rgba(15,35,80,0.35)] sm:p-7">
      {/* Brillos decorativos */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-sky-400/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-red-500/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100">
            <Sparkles size={12} />
            Kint 3D
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
            {titulo}
          </h1>
          <p className="mt-1 min-h-5 text-sm text-sky-100/80 first-letter:uppercase">
            {fecha}
          </p>
        </div>
        {accion}
      </div>

      {metricas && (
        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="col-span-2 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10 backdrop-blur sm:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/80">
              Ventas del mes
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {pesos(metricas.ventasMes)}
            </p>
            {cambio !== null && (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${
                  cambio >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {cambio >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {cambio >= 0 ? "+" : ""}
                {cambio}% vs. el mes pasado
              </p>
            )}
            {cambio === null && (
              <p className="mt-1 text-xs text-sky-100/70">Pagos confirmados</p>
            )}
          </div>
          <DatoBanner
            titulo="Maquetas este mes"
            valor={metricas.pedidosMes}
            icono={Package}
          />
          <DatoBanner
            titulo="Compras en la tienda"
            valor={metricas.comprasMes}
            icono={ShoppingBag}
          />
        </div>
      )}
    </section>
  );
}

function DatoBanner({
  titulo,
  valor,
  icono: Icono,
}: {
  titulo: string;
  valor: number;
  icono: LucideIcon;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10 backdrop-blur">
      <Icono size={18} className="text-sky-200" />
      <p className="mt-2 text-2xl font-black tabular-nums">{valor}</p>
      <p className="text-[11px] font-bold leading-tight text-sky-100/80">
        {titulo}
      </p>
    </div>
  );
}

/* Barras de las últimas 8 semanas (maquetas + tienda apiladas). */
function GraficoSemanas({ metricas }: { metricas: MetricasAdmin }) {
  const semanas = metricas.semanas || [];
  const maximo = Math.max(1, ...semanas.map((s) => s.maquetas + s.tienda));
  const total = semanas.reduce((suma, s) => suma + s.maquetas + s.tienda, 0);

  return (
    <Tarjeta className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black">
          {total} {total === 1 ? "pedido" : "pedidos"} en 8 semanas
        </p>
        <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1f3f85] dark:bg-sky-400" />
            Maquetas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            Tienda
          </span>
        </div>
      </div>

      <div className="flex h-36 items-end gap-2" role="img" aria-label="Pedidos por semana">
        {semanas.map((semana, indice) => {
          const actual = indice === semanas.length - 1;
          const suma = semana.maquetas + semana.tienda;
          return (
            <div key={semana.desde} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-black tabular-nums text-[var(--text-muted)]">
                {suma || ""}
              </span>
              <div
                className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-md bg-[var(--kint-panel-soft)]"
                style={{ height: `${Math.max(6, (suma / maximo) * 100)}%` }}
                title={`Semana del ${fechaDia(semana.desde)}: ${semana.maquetas} maquetas, ${semana.tienda} tienda`}
              >
                <div
                  className="bg-[#1f3f85] transition-all dark:bg-sky-400"
                  style={{ height: suma ? `${(semana.maquetas / suma) * 100}%` : 0 }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ height: suma ? `${(semana.tienda / suma) * 100}%` : 0 }}
                />
              </div>
              <span
                className={`truncate text-[10px] font-bold ${
                  actual ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
                }`}
              >
                {actual ? "Hoy" : fechaDia(semana.desde).replace(/^\w+\.?\s*/, "")}
              </span>
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjetas "Para hacer hoy"                                           */
/* ------------------------------------------------------------------ */

const ANILLO_TONO: Record<Tono, string> = {
  azul: "ring-sky-500/45 bg-sky-500/[0.06]",
  verde: "ring-emerald-500/45 bg-emerald-500/[0.06]",
  ambar: "ring-amber-500/55 bg-amber-500/[0.07]",
  rojo: "ring-red-500/45 bg-red-500/[0.06]",
  gris: "ring-slate-500/30",
  violeta: "ring-violet-500/45 bg-violet-500/[0.06]",
};

const TEXTO_TONO: Record<Tono, string> = {
  azul: "text-sky-700 dark:text-sky-300",
  verde: "text-emerald-700 dark:text-emerald-300",
  ambar: "text-amber-700 dark:text-amber-300",
  rojo: "text-red-700 dark:text-red-300",
  gris: "text-[var(--text-muted)]",
  violeta: "text-violet-700 dark:text-violet-300",
};

const BARRA_TONO: Record<Tono, string> = {
  azul: "bg-sky-500",
  verde: "bg-emerald-500",
  ambar: "bg-amber-500",
  rojo: "bg-red-500",
  gris: "bg-slate-400 dark:bg-slate-500",
  violeta: "bg-violet-500",
};

type Pendiente = {
  titulo: string;
  cantidad: number;
  href: string;
  tono: Tono;
  icono: LucideIcon;
  textoCero: string;
};

function TarjetaPendiente({ item }: { item: Pendiente }) {
  const Icono = item.icono;
  const hay = item.cantidad > 0;

  return (
    <Link
      href={item.href}
      className={`group flex min-h-[7.5rem] flex-col justify-between rounded-2xl border border-[var(--kint-panel-border)] p-4 transition active:scale-[0.98] ${
        hay
          ? `ring-2 ring-inset ${ANILLO_TONO[item.tono]} shadow-[var(--shadow-soft)]`
          : "bg-[var(--kint-panel)] opacity-80 hover:opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            hay
              ? `bg-[var(--kint-panel)] ${TEXTO_TONO[item.tono]}`
              : "bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
          }`}
        >
          <Icono size={18} />
        </span>
        {hay ? (
          <ChevronRight
            size={17}
            className="mt-2 text-[var(--text-muted)] transition group-hover:translate-x-0.5"
          />
        ) : (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          >
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="mt-3">
        <p
          className={`text-3xl font-black leading-none tabular-nums ${
            hay ? TEXTO_TONO[item.tono] : "text-[var(--text-muted)]"
          }`}
        >
          {item.cantidad}
        </p>
        <p className="mt-1.5 text-[13px] font-bold leading-tight">
          {item.titulo}
        </p>
        {!hay && (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {item.textoCero}
          </p>
        )}
      </div>
    </Link>
  );
}

function pendientesDe(resumen: ResumenAdmin): Pendiente[] {
  return [
    {
      titulo: "Pagos por validar",
      cantidad: resumen.pedidos.pagosPorValidar,
      href: "/admin/pedidos",
      tono: "ambar",
      icono: BadgeDollarSign,
      textoCero: "Todo validado",
    },
    {
      titulo: "Saldos por validar",
      cantidad: resumen.pedidos.saldosPorValidar,
      href: "/admin/pedidos",
      tono: "ambar",
      icono: Wallet,
      textoCero: "Todo validado",
    },
    {
      titulo: "Tienda pendientes",
      cantidad: resumen.tienda.pendientes,
      href: "/admin/tienda",
      tono: "azul",
      icono: ShoppingBag,
      textoCero: "Nada por preparar",
    },
    {
      titulo: "Pagos de tienda por confirmar",
      cantidad: resumen.tienda.pagosPorConfirmar,
      href: "/admin/tienda",
      tono: "ambar",
      icono: BadgeDollarSign,
      textoCero: "Todo confirmado",
    },
    {
      titulo: "Reseñas pendientes",
      cantidad: resumen.resenasPendientes,
      href: "/admin/resenas",
      tono: "violeta",
      icono: Star,
      textoCero: "Nada por revisar",
    },
    {
      titulo: "Pedidos activos",
      cantidad: resumen.pedidos.activos,
      href: "/admin/pedidos",
      tono: "azul",
      icono: Package,
      textoCero: "Sin pedidos en curso",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Agenda de entregas                                                  */
/* ------------------------------------------------------------------ */

function etiquetaDia(fecha: string, hoy: string | undefined) {
  if (hoy && fecha === hoy) return "Hoy";
  if (hoy && fecha === sumarDias(hoy, 1)) return "Mañana";
  return fechaDia(fecha);
}

function AgendaEntregas({
  entregas,
  hoy,
}: {
  entregas: EntregaAgenda[];
  hoy: string | undefined;
}) {
  if (!entregas.length) {
    return (
      <Vacio
        titulo="Sin entregas cerca"
        texto="No hay entregas en las próximas dos semanas."
        icono={<CalendarOff size={30} strokeWidth={1.5} />}
      />
    );
  }

  const grupos = new Map<string, EntregaAgenda[]>();
  for (const entrega of entregas) {
    const fecha = soloDia(entrega.fecha);
    if (!fecha) continue;
    grupos.set(fecha, [...(grupos.get(fecha) || []), entrega]);
  }
  const dias = [...grupos.keys()].sort();

  return (
    <Tarjeta className="divide-y divide-[var(--kint-panel-border)] overflow-hidden">
      {dias.map((fecha) => {
        const etiqueta = etiquetaDia(fecha, hoy);
        const destacado = etiqueta === "Hoy" || etiqueta === "Mañana";
        return (
          <section key={fecha} aria-label={etiqueta}>
            <h3
              className={`flex items-center justify-between bg-[var(--kint-panel-soft)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${
                destacado
                  ? "text-[#1f3f85] dark:text-[var(--blue-soft)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {etiqueta}
              {destacado && (
                <span className="font-bold normal-case tracking-normal text-[var(--text-muted)]">
                  {fechaDia(fecha)}
                </span>
              )}
            </h3>
            <ul className="divide-y divide-[var(--kint-panel-border)]">
              {grupos.get(fecha)!.map((entrega) => {
                const esTienda = entrega.tipo === "tienda";
                const href = esTienda
                  ? "/admin/tienda"
                  : `/admin/pedidos/${encodeURIComponent(entrega.pedido)}`;
                return (
                  <li key={`${entrega.tipo}-${entrega.pedido}`}>
                    <Link
                      href={href}
                      className="flex min-h-[3.25rem] items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--kint-panel-soft)]"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          esTienda
                            ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                            : "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                        }`}
                        aria-label={esTienda ? "Tienda" : "Maqueta"}
                      >
                        {esTienda ? (
                          <ShoppingBag size={15} />
                        ) : (
                          <Package size={15} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {entrega.nombre || "Sin nombre"}
                        </span>
                        <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
                          {entrega.pedido}
                        </span>
                      </span>
                      <Chip tono={tonoEstado(entrega.estado)}>
                        {textoEstado(entrega.estado)}
                      </Chip>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* Pedidos por estado (barras en CSS)                                  */
/* ------------------------------------------------------------------ */

function BarrasEstado({ porEstado }: { porEstado: Record<string, number> }) {
  const filas = ESTADOS_PEDIDO.map((estado) => ({
    estado,
    cantidad: Number(porEstado[estado] || 0),
  }));
  const total = filas.reduce((suma, fila) => suma + fila.cantidad, 0);
  const maximo = Math.max(1, ...filas.map((fila) => fila.cantidad));

  if (!total) {
    return <Vacio titulo="Todavía no hay pedidos" />;
  }

  return (
    <Tarjeta className="p-4">
      <ul className="space-y-2.5">
        {filas.map((fila) => (
          <li
            key={fila.estado}
            className="grid grid-cols-[minmax(0,8.5rem)_1fr_2rem] items-center gap-3 text-xs"
          >
            <span className="truncate font-semibold text-[var(--text-muted)]">
              {fila.estado}
            </span>
            <span
              className="h-2.5 overflow-hidden rounded-full bg-[var(--kint-panel-soft)]"
              role="presentation"
            >
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${
                  BARRA_TONO[tonoEstado(fila.estado)]
                }`}
                style={{
                  width: fila.cantidad
                    ? `${Math.max(4, (fila.cantidad / maximo) * 100)}%`
                    : "0%",
                }}
              />
            </span>
            <span
              className={`text-right font-black tabular-nums ${
                fila.cantidad ? "" : "text-[var(--text-muted)] opacity-60"
              }`}
            >
              {fila.cantidad}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-[var(--kint-panel-border)] pt-3 text-[11px] text-[var(--text-muted)]">
        {total} {total === 1 ? "pedido" : "pedidos"} en total, sin contar
        cancelados.
      </p>
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* Salud del sistema                                                   */
/* ------------------------------------------------------------------ */

function esPorTiempo(tipo: string) {
  return /clock|tiempo|time/i.test(tipo || "");
}

function SaludSistema({
  diagnostico,
}: {
  diagnostico: ResumenAdmin["diagnostico"];
}) {
  const cuota = Number(diagnostico.cuotaCorreos || 0);
  const cuotaBaja = cuota < 20;
  const hayActivador = (diagnostico.activadores || []).some(
    (activador) =>
      activador.funcion === "revisarEstados" && esPorTiempo(activador.tipo)
  );

  return (
    <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <Mail
          size={17}
          className={
            cuotaBaja
              ? "text-amber-600 dark:text-amber-400"
              : "text-[var(--text-muted)]"
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Correos disponibles hoy</p>
          {cuotaBaja && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Quedan pocos: Google corta el envío al llegar a 0.
            </p>
          )}
        </div>
        <Chip tono={cuotaBaja ? "ambar" : "verde"}>{cuota}</Chip>
      </div>

      <div className="flex items-start gap-3 px-4 py-3">
        {hayActivador ? (
          <Timer size={17} className="mt-0.5 text-[var(--text-muted)]" />
        ) : (
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Avisos automáticos de maquetas</p>
          {hayActivador ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              El activador de revisarEstados está funcionando.
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
              Los avisos por correo de maquetas no se están enviando: falta el
              activador de revisarEstados en Apps Script.
            </p>
          )}
        </div>
        <Chip tono={hayActivador ? "verde" : "rojo"}>
          {hayActivador ? "Activo" : "Falta"}
        </Chip>
      </div>
    </Tarjeta>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

const ATAJOS = [
  { href: "/admin/calendario", texto: "Bloquear un día", icono: CalendarX2 },
  { href: "/admin/productos", texto: "Productos", icono: Wrench },
  { href: "/admin/configuracion", texto: "Configuración", icono: Settings },
];

export default function InicioAdmin() {
  const ahora = useHoyMontevideo();
  const { datos, error, cargando, recargando, recargar } = useDatosAdmin(
    "admin_resumen",
    SIN_DATOS
  );
  const resumen = datos?.resumen;
  const fechaHoy = ahora ? fechaLarga(ahora.hoy) : "";

  return (
    <>
      <Banner
        titulo={`${saludo(ahora?.hora)}, Alexander`}
        fecha={fechaHoy}
        metricas={resumen?.metricas}
        accion={
          <button
            type="button"
            onClick={recargar}
            disabled={cargando || recargando}
            aria-label="Actualizar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={17} className={recargando ? "animate-spin" : undefined} />
          </button>
        }
      />

      {cargando ? (
        <Esqueleto filas={5} />
      ) : error && !resumen ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : resumen ? (
        <>
          {error && !recargando && (
            <p
              className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300"
              role="status"
            >
              <AlertTriangle size={14} className="shrink-0" />
              No se pudo actualizar: {error}
            </p>
          )}
          <TituloSeccion>Para hacer hoy</TituloSeccion>
          {(() => {
            const todos = pendientesDe(resumen);
            const conAlgo = todos.filter((item) => item.cantidad > 0);
            const alDia = todos.filter((item) => item.cantidad === 0);

            return (
              <>
                {conAlgo.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {conAlgo.map((item) => (
                      <TarjetaPendiente key={item.titulo} item={item} />
                    ))}
                  </div>
                ) : (
                  <Tarjeta className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check size={20} strokeWidth={3} />
                    </span>
                    <span>
                      <span className="block font-black">¡Todo al día!</span>
                      <span className="text-sm text-[var(--text-muted)]">
                        No hay pagos, compras ni reseñas esperándote.
                      </span>
                    </span>
                  </Tarjeta>
                )}
                {conAlgo.length > 0 && alDia.length > 0 && (
                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    <Check size={13} className="mr-1 inline align-[-2px] text-emerald-600" />
                    Al día: {alDia.map((item) => item.titulo.toLowerCase()).join(" · ")}
                  </p>
                )}
              </>
            );
          })()}

          {resumen.metricas && (
            <>
              <TituloSeccion>Últimas 8 semanas</TituloSeccion>
              <GraficoSemanas metricas={resumen.metricas} />
            </>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {ATAJOS.map((atajo) => {
              const Icono = atajo.icono;
              return (
                <Link
                  key={atajo.href}
                  href={atajo.href}
                  className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-2 py-2 text-center text-[11px] font-bold leading-tight transition hover:border-[var(--kint-selected-border)] active:scale-[0.98]"
                >
                  <Icono
                    size={17}
                    className="text-[#1f3f85] dark:text-[var(--blue-soft)]"
                  />
                  {atajo.texto}
                </Link>
              );
            })}
          </div>

          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div>
              <TituloSeccion>Próximas entregas</TituloSeccion>
              <AgendaEntregas
                entregas={resumen.proximasEntregas || []}
                hoy={ahora?.hoy}
              />
            </div>

            <div>
              <TituloSeccion>Pedidos por estado</TituloSeccion>
              <BarrasEstado porEstado={resumen.pedidos.porEstado || {}} />

              <div className="mb-2 mt-6 flex items-center justify-between">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Días sin entrega
                </h2>
                <Link
                  href="/admin/calendario"
                  className="-my-2 flex min-h-11 items-center gap-0.5 text-xs font-bold text-[#1f3f85] dark:text-[var(--blue-soft)]"
                >
                  Calendario
                  <ChevronRight size={14} />
                </Link>
              </div>
              {(resumen.diasSinEntrega || []).length ? (
                <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
                  {resumen.diasSinEntrega.map((dia) => (
                    <div
                      key={dia.fecha}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span className="w-24 shrink-0 text-sm font-bold text-red-700 dark:text-red-300">
                        {etiquetaDia(soloDia(dia.fecha), ahora?.hoy)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">
                        {dia.motivo || "Sin motivo"}
                      </span>
                    </div>
                  ))}
                </Tarjeta>
              ) : (
                <Tarjeta className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  No bloqueaste ningún día en los próximos 30 días.
                </Tarjeta>
              )}
            </div>
          </div>

          {resumen.diagnostico && (
            <>
              <TituloSeccion>Salud del sistema</TituloSeccion>
              <SaludSistema diagnostico={resumen.diagnostico} />
            </>
          )}
        </>
      ) : null}
    </>
  );
}
