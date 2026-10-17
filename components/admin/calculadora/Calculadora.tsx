"use client";

/*
 * Calculadora de costos: perfiles guardados en Apps Script (admin_calc_*),
 * datos de la pieza y resultado en vivo. La usa la página Calculadora y
 * el formulario de presupuesto de un pedido ("Calcular precio").
 *
 * Lo que se cargó de la pieza y el multiplicador quedan guardados en el
 * navegador: al volver, está como se dejó.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Calculator,
  ChevronDown,
  Clock,
  Copy,
  Layers,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  ShoppingCart,
  Sparkles,
  Trash2,
  Weight,
  Zap,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import {
  IMPRESORAS,
  MULTIPLICADORES,
  analizarVenta,
  calcular,
  perfilNuevo,
  textoTiempo,
  type AnalisisVenta,
  type PerfilCalculadora,
  type PiezaCalculadora,
  type ResultadoCalculadora,
} from "@/lib/calculadora";
import {
  Boton,
  CajaError,
  DialogoConfirmar,
  Esqueleto,
  Tarjeta,
  claseInput,
  pesos,
  useAvisos,
} from "@/components/admin/ui";

const SIN_DATOS = {};
const CLAVE_LOCAL = "kint-calculadora-v1";

const CAMPOS_PERFIL = [
  "precioFilamento",
  "precioKwh",
  "consumoW",
  "vidaUtilHoras",
  "costoRepuestos",
  "margenError",
  "recargoInsumos",
  "comisionML",
] as const;
type CampoPerfil = (typeof CAMPOS_PERFIL)[number];

type Borrador = {
  nombre: string;
  impresora: string;
  textos: Record<CampoPerfil, string>;
};

type CampoPieza = keyof PiezaCalculadora;
type TextosPieza = Record<CampoPieza, string>;

export type CalculoActual = {
  resultado: ResultadoCalculadora;
  pieza: PiezaCalculadora;
  tiempo: string; // "2 h 10 min"
  perfil: string;
};

const PIEZA_EN_BLANCO: TextosPieza = { horas: "", minutos: "", gramos: "", insumos: "", piezas: "1" };

/* Lo último que se dejó cargado (en este navegador). */
type Recuerdo = {
  pieza?: Partial<TextosPieza>;
  multiplicador?: number;
  multiplicadorTexto?: string;
  precioVenta?: string;
};

function leerRecuerdo(): Recuerdo {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || "null");
    return guardado && typeof guardado === "object" ? guardado : {};
  } catch {
    return {};
  }
}

function aNumero(texto: string) {
  const valor = Number(String(texto).replace(",", ".").trim());
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

function soloNumero(texto: string) {
  return texto.replace(/[^\d.,]/g, "");
}

function borradorDe(perfil: PerfilCalculadora): Borrador {
  const textos = {} as Record<CampoPerfil, string>;
  for (const campo of CAMPOS_PERFIL) textos[campo] = String(perfil[campo]);
  return { nombre: perfil.nombre, impresora: perfil.impresora, textos };
}

function perfilDe(base: PerfilCalculadora, borrador: Borrador, multiplicador: number): PerfilCalculadora {
  const perfil = { ...base, nombre: borrador.nombre.trim() || "Perfil", impresora: borrador.impresora, multiplicador };
  for (const campo of CAMPOS_PERFIL) perfil[campo] = aNumero(borrador.textos[campo]);
  return perfil;
}

/* Partes del precio (anillo y leyenda). */
const PARTES = [
  { clave: "material", texto: "Material", color: "#38bdf8" },
  { clave: "luz", texto: "Luz", color: "#facc15" },
  { clave: "desgaste", texto: "Desgaste", color: "#a78bfa" },
  { clave: "error", texto: "Margen de error", color: "#fb923c" },
  { clave: "insumos", texto: "Insumos", color: "#f472b6" },
  { clave: "ganancia", texto: "Ganancia", color: "#34d399" },
] as const;

export default function Calculadora({
  extra,
  compacta = false,
}: {
  /* Debajo del total: "Agregar a un pedido" o "Usar este precio". */
  extra?: (calculo: CalculoActual) => ReactNode;
  /* En una hoja: una sola columna. */
  compacta?: boolean;
}) {
  const avisar = useAvisos();
  const { datos, error, cargando, recargar } = useDatosAdmin("admin_calc_listar", SIN_DATOS);

  const [recuerdo] = useState(leerRecuerdo);
  const [listo, setListo] = useState(false);
  const [perfiles, setPerfiles] = useState<PerfilCalculadora[]>([]);
  const [activoId, setActivoId] = useState("");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [multiplicador, setMultiplicador] = useState(recuerdo.multiplicador || 3);
  const [multiplicadorTexto, setMultiplicadorTexto] = useState(recuerdo.multiplicadorTexto || "");
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(false);
  const [verCostos, setVerCostos] = useState(false);
  const [piezaTextos, setPiezaTextos] = useState<TextosPieza>(() => ({ ...PIEZA_EN_BLANCO, ...recuerdo.pieza }));
  const [precioVenta, setPrecioVenta] = useState(recuerdo.precioVenta || "");

  // Primera carga: los perfiles guardados o uno de ejemplo (A1 mini).
  if (datos && !listo) {
    const guardados = datos.perfiles.length ? datos.perfiles : [perfilNuevo("A1 mini")];
    const activo = guardados.find((perfil) => perfil.id === datos.activo) ?? guardados[0];
    setListo(true);
    setPerfiles(guardados);
    setActivoId(activo.id);
    setBorrador(borradorDe(activo));
    if (!recuerdo.multiplicador) setMultiplicador(activo.multiplicador || 3);
    setCambiado(!datos.perfiles.length);
  }

  // La pieza y el multiplicador quedan como se dejaron.
  useEffect(() => {
    try {
      localStorage.setItem(
        CLAVE_LOCAL,
        JSON.stringify({ pieza: piezaTextos, multiplicador, multiplicadorTexto, precioVenta })
      );
    } catch {
      // Sin almacenamiento: dura solo esta visita.
    }
  }, [piezaTextos, multiplicador, multiplicadorTexto, precioVenta]);

  const base = perfiles.find((perfil) => perfil.id === activoId) ?? perfiles[0];
  const perfil = base && borrador ? perfilDe(base, borrador, multiplicador) : null;
  const pieza: PiezaCalculadora = {
    horas: aNumero(piezaTextos.horas),
    minutos: aNumero(piezaTextos.minutos),
    gramos: aNumero(piezaTextos.gramos),
    insumos: aNumero(piezaTextos.insumos),
    piezas: Math.max(1, Math.floor(aNumero(piezaTextos.piezas)) || 1),
  };
  const resultado = perfil ? calcular(perfil, pieza) : null;
  const sinDatos = !(pieza.gramos > 0 || pieza.horas > 0 || pieza.minutos > 0 || pieza.insumos > 0);
  const venta =
    perfil && !sinDatos && aNumero(precioVenta) > 0 ? analizarVenta(perfil, pieza, aNumero(precioVenta)) : null;

  function elegirPerfil(id: string) {
    const elegido = perfiles.find((item) => item.id === id);
    if (!elegido) return;
    setActivoId(id);
    setBorrador(borradorDe(elegido));
    setCambiado(false);
  }

  function cambiarCampo(campo: CampoPerfil, valor: string) {
    if (!borrador) return;
    setBorrador({ ...borrador, textos: { ...borrador.textos, [campo]: soloNumero(valor) } });
    setCambiado(true);
  }

  function cambiarImpresora(nombre: string) {
    if (!borrador) return;
    const impresora = IMPRESORAS.find((item) => item.nombre === nombre);
    setBorrador({
      ...borrador,
      impresora: nombre,
      textos: impresora?.consumoW ? { ...borrador.textos, consumoW: String(impresora.consumoW) } : borrador.textos,
    });
    setCambiado(true);
  }

  async function guardarTodos(lista: PerfilCalculadora[], activo: string, aviso: string) {
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_calc_guardar", { perfiles: lista, activo });
      setPerfiles(respuesta.perfiles);
      setActivoId(respuesta.activo);
      setCambiado(false);
      avisar(aviso);
      return true;
    } catch (errorAccion) {
      avisar(errorAccion instanceof Error ? errorAccion.message : "No se pudo guardar.", "error");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function guardarPerfil() {
    if (!perfil) return;
    const lista = perfiles.some((item) => item.id === perfil.id)
      ? perfiles.map((item) => (item.id === perfil.id ? perfil : item))
      : [...perfiles, perfil];
    void guardarTodos(lista, perfil.id, `Perfil «${perfil.nombre}» guardado`);
  }

  function duplicarPerfil() {
    if (!perfil) return;
    const copia = { ...perfil, id: perfilNuevo().id, nombre: `${perfil.nombre} (copia)`.slice(0, 40) };
    setPerfiles([...perfiles, copia]);
    setActivoId(copia.id);
    setBorrador(borradorDe(copia));
    setVerCostos(true);
    setCambiado(true);
  }

  function perfilEnBlanco() {
    const nuevo = perfilNuevo(`Perfil ${perfiles.length + 1}`);
    setPerfiles([...perfiles, nuevo]);
    setActivoId(nuevo.id);
    setBorrador(borradorDe(nuevo));
    setVerCostos(true);
    setCambiado(true);
  }

  async function borrarPerfil() {
    const lista = perfiles.filter((item) => item.id !== activoId);
    if (!lista.length) return;
    const ok = await guardarTodos(lista, lista[0].id, "Perfil borrado");
    if (ok) setBorrador(borradorDe(lista[0]));
    setABorrar(false);
  }

  if (error && !datos) return <CajaError mensaje={error} onReintentar={recargar} />;
  if (cargando || !borrador || !perfil || !resultado) return <Esqueleto filas={4} />;

  const campoPerfil = (campo: CampoPerfil, etiqueta: string, sufijo: string, ayuda?: string) => (
    <CampoNumero
      etiqueta={etiqueta}
      sufijo={sufijo}
      ayuda={ayuda}
      valor={borrador.textos[campo]}
      onCambiar={(valor) => cambiarCampo(campo, valor)}
    />
  );

  const campoPieza = (campo: CampoPieza, etiqueta: string, sufijo: string, icono: ReactNode) => (
    <CampoPieza
      etiqueta={etiqueta}
      sufijo={sufijo}
      icono={icono}
      valor={piezaTextos[campo]}
      onCambiar={(valor) => setPiezaTextos({ ...piezaTextos, [campo]: soloNumero(valor) })}
    />
  );

  return (
    <div className={compacta ? "space-y-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start"}>
      <div className="space-y-4">
        {/* Perfil: impresora y costos fijos */}
        <Tarjeta className="overflow-hidden">
          <div className="flex items-center gap-3 bg-[linear-gradient(120deg,rgba(31,63,133,0.35),transparent_70%)] p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1f3f85] text-white shadow-[0_8px_24px_rgba(31,63,133,0.45)]">
              <Printer size={22} />
            </span>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Perfil</span>
              <select
                value={activoId}
                onChange={(evento) => elegirPerfil(evento.target.value)}
                className="w-full cursor-pointer appearance-none truncate bg-transparent pr-7 text-xl font-black text-[var(--text-main)] outline-none"
              >
                {perfiles.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[var(--kint-panel)] text-base">
                    {item.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-0 top-3 text-[var(--text-muted)]" />
              <span className="block truncate text-xs font-bold text-[var(--text-muted)]">{borrador.impresora}</span>
            </label>
            <div className="flex shrink-0">
              <BotonIcono titulo="Perfil nuevo" onClick={perfilEnBlanco}>
                <Plus size={16} />
              </BotonIcono>
              <BotonIcono titulo="Duplicar perfil" onClick={duplicarPerfil}>
                <Copy size={15} />
              </BotonIcono>
              <BotonIcono titulo="Borrar perfil" onClick={() => setABorrar(true)} deshabilitado={perfiles.length < 2} peligro>
                <Trash2 size={15} />
              </BotonIcono>
            </div>
          </div>

          {/* Datos clave del perfil, a la vista */}
          <div className="grid grid-cols-3 border-t border-[var(--kint-panel-border)]">
            <Dato icono={<Layers size={13} />} texto="Filamento" valor={`${pesos(aNumero(borrador.textos.precioFilamento))}/kg`} />
            <Dato icono={<Zap size={13} />} texto="Luz" valor={`${pesos(aNumero(borrador.textos.precioKwh))}/kWh`} />
            <Dato icono={<Printer size={13} />} texto="Consumo" valor={`${aNumero(borrador.textos.consumoW)} W`} />
          </div>

          <button
            type="button"
            onClick={() => setVerCostos(!verCostos)}
            aria-expanded={verCostos}
            className="flex w-full items-center justify-between gap-2 border-t border-[var(--kint-panel-border)] px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 size={14} />
              {verCostos ? "Ocultar costos fijos" : "Editar costos fijos del perfil"}
            </span>
            <ChevronDown size={15} className={`shrink-0 transition ${verCostos ? "rotate-180" : ""}`} />
          </button>

          {verCostos && (
            <div className="space-y-3 border-t border-[var(--kint-panel-border)] p-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Nombre del perfil</span>
                <input
                  className={claseInput}
                  value={borrador.nombre}
                  maxLength={40}
                  onChange={(evento) => {
                    setBorrador({ ...borrador, nombre: evento.target.value });
                    setCambiado(true);
                  }}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {campoPerfil("precioFilamento", "Precio del filamento", "$/kg", "PLA Basic de Bambu en Uruguay: $1.025.")}
                {campoPerfil("precioKwh", "Precio del kWh", "$", "UTE Residencial Simple 2026 con IVA: $10,31.")}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Impresora</span>
                  <span className="relative block">
                    <select
                      value={IMPRESORAS.some((item) => item.nombre === borrador.impresora) ? borrador.impresora : "Otra"}
                      onChange={(evento) => cambiarImpresora(evento.target.value)}
                      className={`${claseInput} h-11 appearance-none pr-9`}
                    >
                      {IMPRESORAS.map((item) => (
                        <option key={item.nombre} value={item.nombre}>
                          {item.nombre}
                          {item.consumoW ? ` (${item.consumoW} W)` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  </span>
                </label>
                {campoPerfil("consumoW", "Consumo de la impresora", "W", "Promedio imprimiendo PLA (tabla de Bambu Lab).")}
                {campoPerfil("vidaUtilHoras", "Vida útil de la máquina", "horas")}
                {campoPerfil("costoRepuestos", "Costo de repuestos", "$", "Lo que gastás en repuestos en esa vida útil.")}
                {campoPerfil("margenError", "Margen de error", "%", "Fallas, purgas y pruebas.")}
                {campoPerfil("recargoInsumos", "Recargo de insumos", "%")}
                {campoPerfil("comisionML", "Comisión de MercadoLibre", "%")}
              </div>
            </div>
          )}

          {cambiado && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Cambios sin guardar en el perfil</span>
              <Boton tamano="chico" variante="principal" icono={<Save size={14} />} cargando={guardando} onClick={guardarPerfil}>
                Guardar perfil
              </Boton>
            </div>
          )}
        </Tarjeta>

        {/* Pieza */}
        <Tarjeta className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-base font-black">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
                <Calculator size={16} />
              </span>
              La pieza
            </p>
            {!sinDatos && (
              <button
                type="button"
                onClick={() => setPiezaTextos(PIEZA_EN_BLANCO)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
              >
                <RotateCcw size={13} />
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {campoPieza("horas", "Horas", "h", <Clock size={14} />)}
            {campoPieza("minutos", "Minutos", "min", <Clock size={14} />)}
            {campoPieza("gramos", "Filamento", "g", <Weight size={14} />)}
            {campoPieza("insumos", "Insumos extra", "$", <Package size={14} />)}
            {campoPieza("piezas", "Piezas en la placa", "u", <Layers size={14} />)}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[var(--text-muted)]">
            Tiempo y gramos: los que te da Bambu Studio al laminar. Insumos: argollas, imanes, cadenas…
          </p>
        </Tarjeta>
      </div>

      {/* Resultado */}
      <div className={compacta ? "space-y-4" : "space-y-4 lg:sticky lg:top-4"}>
        <div className="overflow-hidden rounded-3xl border border-[rgba(90,145,235,0.35)] bg-[radial-gradient(120%_120%_at_0%_0%,#2a4fa8_0%,#16295c_45%,#0b1530_100%)] text-white shadow-[0_20px_60px_rgba(31,63,133,0.35)]">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Total a cobrar</p>
                <p className="mt-1 text-5xl font-black tabular-nums leading-none tracking-tight">{pesos(resultado.total)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pastilla>Redondeado {pesos(resultado.redondeado)}</Pastilla>
                  {resultado.piezas > 1 && <Pastilla>{pesos(resultado.porPieza)} c/u</Pastilla>}
                  {!sinDatos && <Pastilla>{textoTiempo(pieza)}</Pastilla>}
                </div>
              </div>
              <Dona resultado={resultado} vacia={sinDatos} />
            </div>

            {/* Multiplicador */}
            <div className="mt-5">
              <p className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-white/60">
                <span>Multiplicador</span>
                <span className="normal-case tracking-normal text-white/80">
                  {MULTIPLICADORES.find((opcion) => opcion.valor === multiplicador)?.texto ?? "Personalizado"}
                </span>
              </p>
              <div className="grid grid-cols-7 gap-1 rounded-2xl bg-black/25 p-1">
                {MULTIPLICADORES.map((opcion) => {
                  const activo = !multiplicadorTexto && multiplicador === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      title={opcion.texto}
                      aria-pressed={activo}
                      onClick={() => {
                        setMultiplicador(opcion.valor);
                        setMultiplicadorTexto("");
                      }}
                      className={`h-9 rounded-xl text-xs font-black tabular-nums transition ${
                        activo ? "bg-white text-[#16295c] shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      ×{opcion.valor}
                    </button>
                  );
                })}
                <input
                  value={multiplicadorTexto}
                  inputMode="decimal"
                  placeholder="×?"
                  aria-label="Otro multiplicador"
                  onChange={(evento) => {
                    const texto = soloNumero(evento.target.value);
                    setMultiplicadorTexto(texto);
                    if (aNumero(texto) > 0) setMultiplicador(aNumero(texto));
                  }}
                  className={`h-9 w-full min-w-0 rounded-xl text-center text-xs font-black outline-none placeholder:text-white/40 ${
                    multiplicadorTexto ? "bg-white text-[#16295c]" : "bg-transparent text-white focus:bg-white/10"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Desglose */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 bg-black/20 px-5 py-4 text-sm">
            {PARTES.map((parte) => (
              <div key={parte.clave} className="flex items-center justify-between gap-2">
                <dt className="flex min-w-0 items-center gap-2 text-white/70">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: parte.color }} />
                  <span className="truncate">{parte.texto}</span>
                </dt>
                <dd className="font-bold tabular-nums">{pesos(resultado[parte.clave])}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-5 py-3">
            <span className="text-xs font-bold text-white/70">Costo real (sin insumos)</span>
            <span className="font-black tabular-nums">{pesos(resultado.costo)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-[#ffe600] px-5 py-3 text-[#2d3277]">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
              <ShoppingCart size={15} />
              MercadoLibre
            </span>
            <span className="text-lg font-black tabular-nums">{pesos(resultado.mercadoLibre)}</span>
          </div>
        </div>

        {!sinDatos && (
          <TarjetaVenta
            analisis={venta}
            valor={precioVenta}
            onCambiar={setPrecioVenta}
            sugerido={resultado.piezas > 1 ? Math.ceil(resultado.porPieza / 5) * 5 : resultado.redondeado}
            comisionML={aNumero(borrador.textos.comisionML)}
          />
        )}

        {sinDatos && (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-[var(--kint-panel-border)] px-4 py-3 text-xs font-bold text-[var(--text-muted)]">
            <Sparkles size={15} className="shrink-0 text-[var(--blue-main)] dark:text-sky-300" />
            Cargá el tiempo y los gramos de la pieza y el precio aparece al instante.
          </p>
        )}

        {extra?.({ resultado, pieza, tiempo: textoTiempo(pieza), perfil: perfil.nombre })}
      </div>

      <DialogoConfirmar
        abierto={aBorrar}
        titulo="Borrar perfil"
        mensaje={`Se borra el perfil «${perfil.nombre}».`}
        textoConfirmar="Borrar"
        peligro
        cargando={guardando}
        onConfirmar={() => void borrarPerfil()}
        onCancelar={() => setABorrar(false)}
      />
    </div>
  );
}

/* Anillo con lo que compone el precio; al medio, cuánto es ganancia. */
function Dona({ resultado, vacia }: { resultado: ResultadoCalculadora; vacia: boolean }) {
  const valores = PARTES.map((parte) => Math.max(0, resultado[parte.clave]));
  const total = valores.reduce((suma, valor) => suma + valor, 0);
  const radio = 15.915;
  const inicios = valores.map((_, indice) => valores.slice(0, indice).reduce((suma, valor) => suma + valor, 0));
  const margen = resultado.total > 0 ? Math.round((resultado.ganancia / resultado.total) * 100) : 0;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="21" cy="21" r={radio} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        {!vacia &&
          total > 0 &&
          valores.map((valor, indice) =>
            valor > 0 ? (
              <circle
                key={PARTES[indice].clave}
                cx="21"
                cy="21"
                r={radio}
                fill="none"
                stroke={PARTES[indice].color}
                strokeWidth="5"
                strokeDasharray={`${(valor / total) * 100} ${100 - (valor / total) * 100}`}
                strokeDashoffset={-(inicios[indice] / total) * 100}
              />
            ) : null
          )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none">{vacia ? "—" : `${margen}%`}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">ganancia</span>
      </div>
    </div>
  );
}

function Pastilla({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90 ring-1 ring-inset ring-white/15">
      {children}
    </span>
  );
}

function Dato({ icono, texto, valor }: { icono: ReactNode; texto: string; valor: string }) {
  return (
    <div className="min-w-0 border-r border-[var(--kint-panel-border)] px-3 py-2.5 last:border-r-0">
      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {icono}
        {texto}
      </p>
      <p className="mt-0.5 truncate text-sm font-black tabular-nums">{valor}</p>
    </div>
  );
}

function BotonIcono({
  titulo,
  onClick,
  children,
  deshabilitado = false,
  peligro = false,
}: {
  titulo: string;
  onClick: () => void;
  children: ReactNode;
  deshabilitado?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={deshabilitado}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] disabled:opacity-30 ${
        peligro ? "hover:text-red-600" : "hover:text-[var(--text-main)]"
      }`}
    >
      {children}
    </button>
  );
}

/* Campo grande de la pieza, con ícono y unidad. */
function CampoPieza({
  etiqueta,
  sufijo,
  icono,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  sufijo: string;
  icono: ReactNode;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <label className="group block min-w-0 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-3.5 py-2.5 transition focus-within:border-[var(--kint-selected-border)] focus-within:ring-2 focus-within:ring-[#1f3f85]/20">
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
        {icono}
        {etiqueta}
      </span>
      <span className="mt-0.5 flex items-baseline gap-1">
        <input
          className="w-full min-w-0 bg-transparent text-2xl font-black tabular-nums text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-40"
          value={valor}
          inputMode="decimal"
          placeholder="0"
          onChange={(evento) => onCambiar(evento.target.value)}
        />
        <span className="shrink-0 text-xs font-bold text-[var(--text-muted)]">{sufijo}</span>
      </span>
    </label>
  );
}

function CampoNumero({
  etiqueta,
  sufijo,
  ayuda,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  sufijo: string;
  ayuda?: string;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-xs font-bold text-[var(--text-muted)]">{etiqueta}</span>
      <span className="relative block">
        <input
          className={`${claseInput} h-11 pr-12 font-bold tabular-nums`}
          value={valor}
          inputMode="decimal"
          placeholder="0"
          onChange={(evento) => onCambiar(evento.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
          {sufijo}
        </span>
      </span>
      {ayuda && <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">{ayuda}</span>}
    </label>
  );
}

/* "Si lo vendo a $X": cuánto gano, con el mismo desglose que el total. */
function TarjetaVenta({
  analisis,
  valor,
  onCambiar,
  sugerido,
  comisionML,
}: {
  analisis: AnalisisVenta | null;
  valor: string;
  onCambiar: (valor: string) => void;
  sugerido: number;
  comisionML: number;
}) {
  const pierde = Boolean(analisis && analisis.ganancia < 0);
  const partes = analisis
    ? [
        { texto: "Material", valor: analisis.material, color: "#38bdf8" },
        { texto: "Luz", valor: analisis.luz, color: "#facc15" },
        { texto: "Desgaste", valor: analisis.desgaste, color: "#a78bfa" },
        { texto: "Margen de error", valor: analisis.error, color: "#fb923c" },
        { texto: "Insumos", valor: analisis.insumos, color: "#f472b6" },
        { texto: pierde ? "Pérdida" : "Ganancia", valor: analisis.ganancia, color: pierde ? "#ef4444" : "#34d399" },
      ]
    : [];

  return (
    <div
      className={`overflow-hidden rounded-3xl border text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${
        pierde
          ? "border-red-500/40 bg-[radial-gradient(120%_120%_at_0%_0%,#7f1d1d_0%,#3b0d14_50%,#160509_100%)]"
          : "border-emerald-400/30 bg-[radial-gradient(120%_120%_at_0%_0%,#0f6b4f_0%,#0b3a2e_50%,#05140f_100%)]"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
              Si lo vendo a{analisis && analisis.piezas > 1 ? " (c/u)" : ""}
            </span>
            <span className="mt-1 flex items-baseline gap-1 border-b-2 border-white/25 pb-1 focus-within:border-white">
              <span className="text-3xl font-black text-white/60">$</span>
              <input
                value={valor}
                inputMode="decimal"
                placeholder={String(sugerido || 0)}
                onChange={(evento) => onCambiar(evento.target.value.replace(/[^\d.,]/g, ""))}
                className="w-full min-w-0 bg-transparent text-5xl font-black tabular-nums leading-none tracking-tight text-white outline-none placeholder:text-white/25"
                aria-label="Precio de venta"
              />
            </span>
          </label>
          <AnilloPartes
            partes={partes.map((parte) => ({ valor: Math.max(0, parte.valor), color: parte.color }))}
            centro={analisis ? `${analisis.margen}%` : "—"}
            debajo={pierde ? "pérdida" : "ganancia"}
          />
        </div>

        {analisis ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Pastilla>
              {pierde ? "Perdés" : "Ganás"} {pesos(Math.abs(analisis.ganancia))}
              {analisis.piezas > 1 ? " c/u" : ""}
            </Pastilla>
            {analisis.piezas > 1 && (
              <Pastilla>
                {pesos(Math.abs(analisis.gananciaTotal))} en la placa ({analisis.piezas})
              </Pastilla>
            )}
            <Pastilla>×{String(analisis.veces).replace(".", ",")} el costo</Pastilla>
            <Pastilla>Mínimo sin perder {pesos(analisis.minimo)}</Pastilla>
          </div>
        ) : (
          <p className="mt-3 text-xs font-bold text-white/60">
            Poné a cuánto lo vendés y te muestra cuánto te queda de verdad.
          </p>
        )}
      </div>

      {analisis && (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 bg-black/20 px-5 py-4 text-sm">
            {partes.map((parte) => (
              <div key={parte.texto} className="flex items-center justify-between gap-2">
                <dt className="flex min-w-0 items-center gap-2 text-white/70">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: parte.color }} />
                  <span className="truncate">{parte.texto}</span>
                </dt>
                <dd className={`font-bold tabular-nums ${parte.valor < 0 ? "text-red-300" : ""}`}>
                  {parte.valor < 0 ? "−" : ""}
                  {pesos(Math.abs(parte.valor))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-5 py-3">
            <span className="text-xs font-bold text-white/70">Costo total (con insumos)</span>
            <span className="font-black tabular-nums">{pesos(analisis.costo)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-[#ffe600] px-5 py-3 text-[#2d3277]">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
              <ShoppingCart size={15} />
              En MercadoLibre ({comisionML}%)
            </span>
            <span className="text-sm font-black tabular-nums">
              {analisis.gananciaML < 0 ? "Perdés" : "Ganás"} {pesos(Math.abs(analisis.gananciaML))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* Anillo genérico: porciones y un texto al medio. */
function AnilloPartes({
  partes,
  centro,
  debajo,
}: {
  partes: { valor: number; color: string }[];
  centro: string;
  debajo: string;
}) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const radio = 15.915;
  let acumulado = 0;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="21" cy="21" r={radio} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        {total > 0 &&
          partes.map((parte, indice) => {
            if (parte.valor <= 0) return null;
            const porcion = (parte.valor / total) * 100;
            const inicio = acumulado;
            acumulado += porcion;
            return (
              <circle
                key={indice}
                cx="21"
                cy="21"
                r={radio}
                fill="none"
                stroke={parte.color}
                strokeWidth="5"
                strokeDasharray={`${porcion} ${100 - porcion}`}
                strokeDashoffset={-inicio}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none">{centro}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">{debajo}</span>
      </div>
    </div>
  );
}
