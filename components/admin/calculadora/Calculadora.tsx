"use client";

/*
 * Calculadora de costos: perfiles guardados en Apps Script (admin_calc_*),
 * datos de la pieza y resultado en vivo. La usa la página Calculadora y
 * el formulario de presupuesto de un pedido ("Calcular precio").
 */

import { useState, type ReactNode } from "react";
import {
  Calculator,
  ChevronDown,
  Copy,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import {
  IMPRESORAS,
  MULTIPLICADORES,
  calcular,
  perfilNuevo,
  textoTiempo,
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

export type CalculoActual = {
  resultado: ResultadoCalculadora;
  pieza: PiezaCalculadora;
  tiempo: string; // "2 h 10 min"
  perfil: string;
};

function aNumero(texto: string) {
  const valor = Number(String(texto).replace(",", ".").trim());
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
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

/* Colores de cada parte del precio (barra y leyenda). */
const PARTES = [
  { clave: "material", texto: "Material", color: "#38bdf8" },
  { clave: "luz", texto: "Luz", color: "#facc15" },
  { clave: "desgaste", texto: "Desgaste máquina", color: "#a78bfa" },
  { clave: "error", texto: "Margen de error", color: "#fb923c" },
  { clave: "insumos", texto: "Insumos", color: "#f472b6" },
  { clave: "ganancia", texto: "Ganancia", color: "#10b981" },
] as const;

export default function Calculadora({
  extra,
  compacta = false,
}: {
  /* Debajo del total: "Agregar a un pedido" o "Usar este precio". */
  extra?: (calculo: CalculoActual) => ReactNode;
  /* En una hoja: una columna y sin la tarjeta de perfil desplegada. */
  compacta?: boolean;
}) {
  const avisar = useAvisos();
  const { datos, error, cargando, recargar } = useDatosAdmin("admin_calc_listar", SIN_DATOS);

  const [listo, setListo] = useState(false);
  const [perfiles, setPerfiles] = useState<PerfilCalculadora[]>([]);
  const [activoId, setActivoId] = useState("");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [multiplicador, setMultiplicador] = useState(3);
  const [multiplicadorTexto, setMultiplicadorTexto] = useState("");
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState(false);
  const [verCostos, setVerCostos] = useState(!compacta);
  const [piezaTextos, setPiezaTextos] = useState<Record<CampoPieza, string>>({
    horas: "",
    minutos: "",
    gramos: "",
    insumos: "",
    piezas: "1",
  });

  // Primera carga: los perfiles guardados o uno de ejemplo (A1 mini).
  if (datos && !listo) {
    const guardados = datos.perfiles.length ? datos.perfiles : [perfilNuevo("A1 mini")];
    const activo = guardados.find((perfil) => perfil.id === datos.activo) ?? guardados[0];
    setListo(true);
    setPerfiles(guardados);
    setActivoId(activo.id);
    setBorrador(borradorDe(activo));
    setMultiplicador(activo.multiplicador || 3);
    setCambiado(!datos.perfiles.length);
  }

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

  function elegirPerfil(id: string) {
    const elegido = perfiles.find((item) => item.id === id);
    if (!elegido) return;
    setActivoId(id);
    setBorrador(borradorDe(elegido));
    setMultiplicador(elegido.multiplicador || 3);
    setMultiplicadorTexto("");
    setCambiado(false);
  }

  function cambiarCampo(campo: CampoPerfil, valor: string) {
    if (!borrador) return;
    setBorrador({ ...borrador, textos: { ...borrador.textos, [campo]: valor.replace(/[^\d.,]/g, "") } });
    setCambiado(true);
  }

  function cambiarImpresora(nombre: string) {
    if (!borrador) return;
    const impresora = IMPRESORAS.find((item) => item.nombre === nombre);
    setBorrador({
      ...borrador,
      impresora: nombre,
      textos: impresora?.consumoW
        ? { ...borrador.textos, consumoW: String(impresora.consumoW) }
        : borrador.textos,
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
    setCambiado(true);
  }

  function perfilEnBlanco() {
    const nuevo = perfilNuevo(`Perfil ${perfiles.length + 1}`);
    setPerfiles([...perfiles, nuevo]);
    setActivoId(nuevo.id);
    setBorrador(borradorDe(nuevo));
    setMultiplicador(nuevo.multiplicador);
    setCambiado(true);
  }

  async function borrarPerfil() {
    const lista = perfiles.filter((item) => item.id !== activoId);
    if (!lista.length) return;
    const ok = await guardarTodos(lista, lista[0].id, "Perfil borrado");
    if (ok) {
      setBorrador(borradorDe(lista[0]));
      setMultiplicador(lista[0].multiplicador || 3);
    }
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
  const campoPieza = (campo: CampoPieza, etiqueta: string, sufijo: string, ayuda?: string) => (
    <CampoNumero
      etiqueta={etiqueta}
      sufijo={sufijo}
      ayuda={ayuda}
      valor={piezaTextos[campo]}
      grande
      onCambiar={(valor) => setPiezaTextos({ ...piezaTextos, [campo]: valor.replace(/[^\d.,]/g, "") })}
    />
  );

  const totalBarra = PARTES.reduce((suma, parte) => suma + Math.max(0, resultado[parte.clave]), 0);

  return (
    <div className={compacta ? "space-y-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"}>
      <div className="space-y-4">
        {/* Perfil */}
        <Tarjeta className="p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Perfil</span>
              <span className="relative block">
                <select
                  value={activoId}
                  onChange={(evento) => elegirPerfil(evento.target.value)}
                  className={`${claseInput} h-11 appearance-none pr-9 font-bold`}
                >
                  {perfiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
              </span>
            </label>
            <Boton
              variante="fantasma"
              icono={<Plus size={16} />}
              onClick={perfilEnBlanco}
              aria-label="Perfil nuevo"
              title="Perfil nuevo"
              className="w-11 px-0"
            />
            <Boton
              variante="fantasma"
              icono={<Copy size={16} />}
              onClick={duplicarPerfil}
              aria-label="Duplicar perfil"
              title="Duplicar perfil"
              className="w-11 px-0"
            />
            <Boton
              variante="fantasma"
              icono={<Trash2 size={16} />}
              onClick={() => setABorrar(true)}
              disabled={perfiles.length < 2}
              aria-label="Borrar perfil"
              title="Borrar perfil"
              className="w-11 px-0 hover:text-red-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setVerCostos(!verCostos)}
            aria-expanded={verCostos}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1.5 text-left text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 size={14} />
              {verCostos ? "Costos fijos del perfil" : `${borrador.impresora} · filamento ${pesos(aNumero(borrador.textos.precioFilamento))}/kg · luz ${pesos(aNumero(borrador.textos.precioKwh))}/kWh`}
            </span>
            <ChevronDown size={15} className={`shrink-0 transition ${verCostos ? "rotate-180" : ""}`} />
          </button>

          {verCostos && (
            <div className="mt-2 space-y-3">
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
                {campoPerfil("precioFilamento", "Precio del filamento", "$/kg")}
                {campoPerfil("precioKwh", "Precio del kWh", "$")}
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
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                  </span>
                </label>
                {campoPerfil("consumoW", "Consumo de la impresora", "W", "Promedio imprimiendo. Se completa con la impresora.")}
                {campoPerfil("vidaUtilHoras", "Vida útil de la máquina", "horas")}
                {campoPerfil("costoRepuestos", "Costo de repuestos", "$")}
                {campoPerfil("margenError", "Margen de error", "%", "Fallas, purgas y pruebas.")}
                {campoPerfil("recargoInsumos", "Recargo de insumos", "%")}
                {campoPerfil("comisionML", "Comisión de MercadoLibre", "%")}
              </div>
            </div>
          )}

          {cambiado && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Cambios sin guardar en el perfil
              </span>
              <Boton
                tamano="chico"
                variante="principal"
                icono={<Save size={14} />}
                cargando={guardando}
                onClick={guardarPerfil}
              >
                Guardar perfil
              </Boton>
            </div>
          )}
        </Tarjeta>

        {/* Pieza */}
        <Tarjeta className="p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-black">
            <Calculator size={16} className="text-[var(--blue-main)] dark:text-sky-300" />
            Pieza
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {campoPieza("horas", "Horas", "h")}
            {campoPieza("minutos", "Minutos", "min")}
            {campoPieza("gramos", "Filamento", "g")}
            {campoPieza("insumos", "Insumos extra", "$", "Argollas, imanes…")}
            {campoPieza("piezas", "Piezas en la placa", "u", "Para el precio por unidad.")}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[var(--text-muted)]">
            Copiá el tiempo y los gramos que te da Bambu Studio al laminar.
          </p>
        </Tarjeta>
      </div>

      {/* Resultado */}
      <div className={compacta ? "space-y-4" : "space-y-4 lg:sticky lg:top-4"}>
        <Tarjeta className="p-4">
          <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">Multiplicador (ganancia)</p>
          <div className="grid grid-cols-6 gap-1.5">
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
                  className={`h-10 rounded-xl border text-xs font-black tabular-nums transition ${
                    activo
                      ? "border-[#1f3f85] bg-[#1f3f85] text-white"
                      : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  ×{opcion.valor}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className={`${claseInput} h-10`}
              value={multiplicadorTexto}
              inputMode="decimal"
              placeholder="Otro (ej.: 2,8)"
              onChange={(evento) => {
                const texto = evento.target.value.replace(/[^\d.,]/g, "");
                setMultiplicadorTexto(texto);
                if (aNumero(texto) > 0) setMultiplicador(aNumero(texto));
              }}
            />
            <span className="shrink-0 text-[11px] font-bold text-[var(--text-muted)]">
              {MULTIPLICADORES.find((opcion) => opcion.valor === multiplicador)?.texto ?? "Personalizado"}
            </span>
          </div>
        </Tarjeta>

        <Tarjeta className="overflow-hidden">
          <div className="p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Total a cobrar
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums">{pesos(resultado.total)}</p>
            <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">
              Redondeado: <span className="text-[var(--text-main)]">{pesos(resultado.redondeado)}</span>
              {resultado.piezas > 1 && (
                <>
                  {" · "}
                  {pesos(resultado.porPieza)} c/u ({resultado.piezas} piezas)
                </>
              )}
            </p>

            {/* De qué está hecho el precio */}
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--kint-panel-soft)]">
              {!sinDatos &&
                PARTES.map((parte) => {
                  const valor = Math.max(0, resultado[parte.clave]);
                  return valor > 0 ? (
                    <span
                      key={parte.clave}
                      title={`${parte.texto}: ${pesos(valor)}`}
                      style={{ width: `${(valor / (totalBarra || 1)) * 100}%`, background: parte.color }}
                    />
                  ) : null;
                })}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {PARTES.map((parte) => (
                <div key={parte.clave} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: parte.color }} />
                    {parte.texto}
                  </dt>
                  <dd className="font-bold tabular-nums">{pesos(resultado[parte.clave])}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-t border-[var(--kint-panel-border)] pt-2">
                <dt className="font-bold">Costo (sin insumos)</dt>
                <dd className="font-black tabular-nums">{pesos(resultado.costo)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-amber-500/30 bg-amber-500/[0.08] px-4 py-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
              Precio en MercadoLibre
            </span>
            <span className="text-lg font-black tabular-nums">{pesos(resultado.mercadoLibre)}</span>
          </div>
        </Tarjeta>

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

function CampoNumero({
  etiqueta,
  sufijo,
  ayuda,
  valor,
  onCambiar,
  grande = false,
}: {
  etiqueta: string;
  sufijo: string;
  ayuda?: string;
  valor: string;
  onCambiar: (valor: string) => void;
  grande?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-xs font-bold text-[var(--text-muted)]">{etiqueta}</span>
      <span className="relative block">
        <input
          className={`${claseInput} pr-12 tabular-nums ${grande ? "h-12 text-lg font-black" : "h-11 font-bold"}`}
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
