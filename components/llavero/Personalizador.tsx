"use client";

/*
 * Llavero con nombre: el cliente escribe, elige fuente, tamaño y colores,
 * y lo ve en 3D al instante. Se carga solo al abrirlo (three.js pesa).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { FlipHorizontal2, LoaderCircle, Minus, Plus, RotateCcw, ShoppingBag, X } from "lucide-react";
import VisorLlavero from "@/components/llavero/VisorLlavero";
import { construirChapita, construirLlavero, type GeometriaLlavero } from "@/lib/llavero/geometria";
import {
  BORDES_LLAVERO,
  FONDOS_LLAVERO,
  FORMAS_CHAPITA,
  MAX_LETRAS_MASCOTA,
  errorTelefonoMascota,
  formatearMascota,
  FUENTES_LLAVERO,
  MAX_LETRAS_LLAVERO,
  SEPARACION_MAX,
  SEPARACION_MIN,
  SEPARACION_PASO,
  RENGLONES_MAX,
  RENGLONES_MIN,
  TAMANOS_LLAVERO,
  errorTextoLlavero,
  formatearPersonalizacion,
  limpiarRenglones,
  limpiarSeparacion,
  limpiarTextoLlavero,
} from "@/lib/llavero/personalizacion";
import { claveColor, colorFilamento, fotoFilamento } from "@/lib/colores-filamento";

export type OpcionesPersonalizado = {
  cadena: string;
  colores: string[]; // [borde, letras]
  comentario: string; // formatearPersonalizacion(...)
  cantidad: number;
};

type ProductoPersonalizable = {
  nombre: string;
  precio: number;
  cadenas: string[];
  colores: string[];
};

const CLASE_BOTON_PRINCIPAL =
  "border-[rgba(90,145,235,0.35)] bg-[#1f3f85] text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,63,133,0.35)]";

function pesos(valor: number) {
  return `$${valor.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

/* El primero de la lista que exista en los colores del producto. */
function elegirColor(colores: string[], preferidos: string[], evitar = "") {
  for (const preferido of preferidos) {
    const encontrado = colores.find((color) => claveColor(color) === preferido && color !== evitar);
    if (encontrado) return encontrado;
  }
  return colores.find((color) => color !== evitar) || "";
}

/* Último diseño, para que no se pierda si cierra sin agregar. */
const CLAVE_DISENO = "kint-llavero-diseno-v1";

type Diseno = {
  texto: string;
  texto2: string;
  fuente: string;
  tamano: string;
  borde: string;
  fondo: string;
  separacion: number;
  renglones: number;
  telefono: string;
  forma: string;
  huella: boolean;
  colorBase: string;
  colorLetras: string;
};

function leerDiseno(): Partial<Diseno> {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_DISENO) || "null");
    return guardado && typeof guardado === "object" ? guardado : {};
  } catch {
    return {};
  }
}

function guardarDiseno(diseno: Diseno) {
  try {
    localStorage.setItem(CLAVE_DISENO, JSON.stringify(diseno));
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

/* @font-face de las fuentes del llavero, para mostrar cada botón con su letra. */
const ESTILO_FUENTES = FUENTES_LLAVERO.map(
  (fuente) =>
    `@font-face{font-family:"Llavero ${fuente.nombre}";src:url("${fuente.archivo}") format("woff");font-display:swap;}`
).join("");

export default function Personalizador({
  producto,
  maxUnidades,
  onAgregar,
  onCerrar,
  tipo = "Llavero",
}: {
  tipo?: "Llavero" | "Mascota";
  producto: ProductoPersonalizable;
  maxUnidades: number;
  onAgregar: (opciones: OpcionesPersonalizado) => string;
  onCerrar: () => void;
}) {
  // Se arranca con el último diseño (si sus opciones siguen existiendo).
  const [inicial] = useState(leerDiseno);
  const [texto, setTexto] = useState(() =>
    errorTextoLlavero(inicial.texto || "") ? "Antonio" : limpiarTextoLlavero(inicial.texto || "")
  );
  const [fuente, setFuente] = useState<string>(() =>
    FUENTES_LLAVERO.some((opcion) => opcion.nombre === inicial.fuente) ? inicial.fuente! : FUENTES_LLAVERO[0].nombre
  );
  const [tamano, setTamano] = useState<string>(() =>
    TAMANOS_LLAVERO.some((opcion) => opcion.nombre === inicial.tamano) ? inicial.tamano! : "Mediano"
  );
  const [borde, setBorde] = useState<string>(() =>
    BORDES_LLAVERO.some((opcion) => opcion.nombre === inicial.borde) ? inicial.borde! : "Normal"
  );
  const [texto2, setTexto2] = useState(() =>
    inicial.texto2 && !errorTextoLlavero(inicial.texto2, true) ? limpiarTextoLlavero(inicial.texto2) : ""
  );
  const [conLinea2, setConLinea2] = useState(() => Boolean(texto2));
  const [fondo, setFondo] = useState<string>(() =>
    FONDOS_LLAVERO.some((opcion) => opcion.nombre === inicial.fondo) ? inicial.fondo! : "Contorno"
  );
  const [separacion, setSeparacion] = useState(() => limpiarSeparacion(inicial.separacion ?? 0));
  const [renglones, setRenglones] = useState(() => limpiarRenglones(inicial.renglones ?? 0));
  const esMascota = tipo === "Mascota";
  const soloLetras = !esMascota && fondo === "Solo letras";
  const [telefono, setTelefono] = useState(() => String(inicial.telefono || "").slice(0, 18));
  const [forma, setForma] = useState<string>(() =>
    FORMAS_CHAPITA.some((opcion) => opcion.nombre === inicial.forma) ? inicial.forma! : "Hueso"
  );
  const [huella, setHuella] = useState(() => inicial.huella !== false);
  const [atras, setAtras] = useState(false);
  const maxLetras = esMascota ? MAX_LETRAS_MASCOTA : MAX_LETRAS_LLAVERO;
  const [colorBase, setColorBase] = useState(() =>
    inicial.colorBase && producto.colores.includes(inicial.colorBase)
      ? inicial.colorBase
      : elegirColor(producto.colores, ["azul", "violeta", "negro", "rojo"])
  );
  const [colorLetras, setColorLetras] = useState(() =>
    inicial.colorLetras && producto.colores.includes(inicial.colorLetras)
      ? inicial.colorLetras
      : elegirColor(producto.colores, ["blanco", "amarillo", "gris claro"], colorBase)
  );

  // Cada cambio queda guardado en este navegador.
  useEffect(() => {
    guardarDiseno({
      texto,
      texto2: conLinea2 ? texto2 : "",
      fuente,
      tamano,
      borde,
      fondo,
      separacion,
      renglones,
      telefono,
      forma,
      huella,
      colorBase,
      colorLetras,
    });
  }, [texto, texto2, conLinea2, fuente, tamano, borde, fondo, separacion, renglones, telefono, forma, huella, colorBase, colorLetras]);
  const [cadena, setCadena] = useState(producto.cadenas[0] || "");
  const [cantidad, setCantidad] = useState(1);
  const [geometria, setGeometria] = useState<GeometriaLlavero | null>(null);
  const [armando, setArmando] = useState(true);
  const [errorArmado, setErrorArmado] = useState("");
  const [errorAgregar, setErrorAgregar] = useState("");
  const anterior = useRef<GeometriaLlavero | null>(null);

  const errorTexto =
    errorTextoLlavero(texto) ||
    (esMascota && texto.trim().length > MAX_LETRAS_MASCOTA ? `Hasta ${MAX_LETRAS_MASCOTA} letras.` : "");
  const errorTelefono = esMascota ? errorTelefonoMascota(telefono) : "";
  const telefonoParaVer = esMascota && !errorTelefono ? telefono.trim() : "";
  const errorTexto2 = !esMascota && conLinea2 ? errorTextoLlavero(texto2, true) : "";
  const textoParaVer = errorTexto ? "" : texto.trim();
  // Mientras la segunda línea tiene algo mal, se ve sin ella.
  const texto2ParaVer = conLinea2 && !errorTexto2 ? texto2.trim() : "";

  // Rearma la pieza (con una pausa corta mientras escribe).
  useEffect(() => {
    if (!textoParaVer) return;
    let cancelado = false;
    const espera = window.setTimeout(() => {
      setArmando(true);
      (esMascota
        ? construirChapita({
            tipo: "Mascota",
            texto: textoParaVer,
            telefono: telefonoParaVer,
            forma,
            huella,
            fuente,
            tamano,
          })
        : construirLlavero({
            texto: textoParaVer,
            texto2: texto2ParaVer,
            fuente,
            tamano,
            borde,
            fondo,
            separacion,
            renglones,
          }))
        .then((nueva) => {
          if (cancelado) {
            nueva.base.dispose();
            nueva.letras.dispose();
            return;
          }
          anterior.current?.base.dispose();
          anterior.current?.letras.dispose();
          anterior.current = nueva;
          setGeometria(nueva);
          setErrorArmado("");
        })
        .catch(() => {
          if (!cancelado) setErrorArmado("No pudimos dibujar el llavero. Probá con otra fuente.");
        })
        .finally(() => {
          if (!cancelado) setArmando(false);
        });
    }, 180);
    return () => {
      cancelado = true;
      window.clearTimeout(espera);
    };
  }, [esMascota, textoParaVer, texto2ParaVer, telefonoParaVer, forma, huella, fuente, tamano, borde, fondo, separacion, renglones]);

  useEffect(
    () => () => {
      anterior.current?.base.dispose();
      anterior.current?.letras.dispose();
    },
    []
  );

  // Escape cierra; sin scroll de fondo.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = desborde;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  const colores = useMemo(() => producto.colores, [producto.colores]);

  function agregar() {
    if (errorTexto || errorTexto2 || errorTelefono) {
      setErrorAgregar(errorTexto || errorTelefono || `Segunda línea: ${errorTexto2}`);
      return;
    }
    if (!colorLetras || (!soloLetras && !colorBase)) {
      setErrorAgregar("Elegí los colores.");
      return;
    }
    const error = onAgregar({
      cadena,
      // Solo letras: una sola pieza, del color de las letras.
      colores: soloLetras ? [colorLetras, colorLetras] : [colorBase, colorLetras],
      comentario: esMascota
        ? formatearMascota({ texto, telefono, forma, huella, fuente, tamano })
        : formatearPersonalizacion({
        texto,
        texto2: conLinea2 ? texto2 : "",
        fuente,
        tamano,
        borde,
        fondo,
        separacion,
        renglones,
      }),
      cantidad,
    });
    if (error) setErrorAgregar(error);
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onCerrar}
    >
      <style>{ESTILO_FUENTES}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Personalizar ${producto.nombre}`}
        onClick={(evento) => evento.stopPropagation()}
        className="relative flex h-full w-full flex-col overflow-hidden border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-main)] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-3xl sm:border md:flex-row"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        >
          <X size={18} />
        </button>

        {/* Vista 3D */}
        <div className="relative h-[38vh] shrink-0 bg-[radial-gradient(ellipse_at_center,#2b3a55_0%,#11151d_70%)] md:h-auto md:min-h-[560px] md:flex-1">
          <VisorLlavero
            geometria={geometria}
            colorBase={colorFilamento(soloLetras ? colorLetras : colorBase)}
            colorLetras={colorFilamento(colorLetras)}
            cadena={cadena}
            atras={atras}
          />
          {esMascota && (
            <button
              type="button"
              onClick={() => setAtras(!atras)}
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/60"
            >
              <FlipHorizontal2 size={14} />
              {atras ? "Ver adelante" : "Ver atrás"}
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-[11px] font-bold text-white/75">
            <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur">
              {armando ? <LoaderCircle size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {armando ? "Armando…" : "Giralo con el dedo"}
            </span>
            {geometria && (
              <span className="rounded-full bg-black/35 px-2.5 py-1 tabular-nums backdrop-blur">
                {Math.round(geometria.ancho)} × {Math.round(geometria.alto)} × {geometria.grosor ?? 3} mm
              </span>
            )}
          </div>
          {errorArmado && (
            <p className="absolute inset-x-3 top-3 rounded-xl bg-red-600/90 px-3 py-2 text-xs font-bold text-white">
              {errorArmado}
            </p>
          )}
        </div>

        {/* Opciones */}
        <div className="flex min-h-0 flex-1 flex-col md:w-[400px] md:flex-none">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 [scrollbar-width:thin] sm:p-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--kint-blue-soft)]">
                {esMascota ? "Chapita para mascota" : "Personalizado"}
              </p>
              <h2 className="mt-0.5 pr-10 text-2xl font-black leading-tight">{producto.nombre}</h2>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>{esMascota ? "Nombre de tu mascota" : "Nombre"}</span>
                <span className="tabular-nums">
                  {texto.length}/{maxLetras}
                </span>
              </span>
              <input
                value={texto}
                onChange={(evento) => {
                  setTexto(limpiarTextoLlavero(evento.target.value).slice(0, maxLetras));
                  setErrorAgregar("");
                }}
                maxLength={maxLetras}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder="Escribí el nombre"
                aria-invalid={Boolean(errorTexto)}
                className="h-14 w-full rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 text-xl font-black text-[var(--text-main)] outline-none transition placeholder:font-semibold placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#87A4B5]/30"
              />
              {errorTexto && texto && (
                <span className="mt-1 block text-[11px] font-semibold text-red-600 dark:text-red-400">{errorTexto}</span>
              )}
            </label>

            {!esMascota && (conLinea2 ? (
              <label className="block">
                <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-[var(--text-muted)]">
                  <span>Segunda línea</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {texto2.length}/{MAX_LETRAS_LLAVERO}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setConLinea2(false);
                        setTexto2("");
                      }}
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-black text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </span>
                </span>
                <input
                  value={texto2}
                  onChange={(evento) => {
                    setTexto2(limpiarTextoLlavero(evento.target.value));
                    setErrorAgregar("");
                  }}
                  maxLength={MAX_LETRAS_LLAVERO}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="Ej.: Arquitecta, una fecha, un apodo"
                  aria-invalid={Boolean(errorTexto2)}
                  className="h-12 w-full rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 text-lg font-black text-[var(--text-main)] outline-none transition placeholder:text-sm placeholder:font-semibold placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#87A4B5]/30"
                />
                {errorTexto2 && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600 dark:text-red-400">{errorTexto2}</span>
                )}
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setConLinea2(true)}
                className="-mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-[var(--kint-panel-border)] px-3.5 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--kint-selected-border)] hover:text-[var(--text-main)]"
              >
                <Plus size={14} />
                Agregar segunda línea
              </button>
            ))}

            {esMascota && (
              <>
                <label className="block">
                  <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-[var(--text-muted)]">
                    <span>Teléfono (va grabado atrás)</span>
                  </span>
                  <input
                    value={telefono}
                    onChange={(evento) => {
                      setTelefono(evento.target.value.replace(/[^0-9+() -]/g, "").slice(0, 18));
                      setErrorAgregar("");
                    }}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="099 123 456"
                    aria-invalid={Boolean(errorTelefono)}
                    className="h-12 w-full rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 text-lg font-black tabular-nums text-[var(--text-main)] outline-none transition placeholder:font-semibold placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#87A4B5]/30"
                  />
                  {errorTelefono && telefono && (
                    <span className="mt-1 block text-[11px] font-semibold text-red-600 dark:text-red-400">{errorTelefono}</span>
                  )}
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                    Si se pierde, quien la encuentre te puede llamar. Tocá «Ver atrás» en la vista 3D.
                  </span>
                </label>

                <fieldset>
                  <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                    <span>Forma</span>
                    <span className="text-[var(--text-main)]">{forma}</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FORMAS_CHAPITA.map((opcion) => {
                      const elegida = opcion.nombre === forma;
                      return (
                        <button
                          key={opcion.nombre}
                          type="button"
                          aria-pressed={elegida}
                          onClick={() => setForma(opcion.nombre)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition ${
                            elegida
                              ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] ring-1 ring-inset ring-[var(--blue-main)]"
                              : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
                          }`}
                        >
                          <DibujoForma forma={opcion.nombre} color={colorFilamento(colorBase)} />
                          <span className="text-[11px] font-black text-[var(--text-main)]">{opcion.nombre}</span>
                          <span className="text-[10px] leading-3 text-[var(--text-muted)]">{opcion.detalle}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--kint-panel-border)] px-3.5 py-3">
                  <span>
                    <span className="block text-sm font-bold">🐾 Huellita</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">Una patita al lado del nombre</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={huella}
                    onChange={(evento) => setHuella(evento.target.checked)}
                    className="h-5 w-5 accent-[#1f3f85]"
                  />
                </label>
              </>
            )}


            <fieldset>
              <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>Letra</span>
                <span>{FUENTES_LLAVERO.length} opciones</span>
              </legend>
              <div className="grid max-h-[17.5rem] grid-cols-2 gap-2 overflow-y-auto rounded-xl pr-1 [scrollbar-width:thin]">
                {FUENTES_LLAVERO.map((opcion) => {
                  const elegida = opcion.nombre === fuente;
                  return (
                    <button
                      key={opcion.nombre}
                      type="button"
                      aria-pressed={elegida}
                      onClick={() => setFuente(opcion.nombre)}
                      className={`flex h-14 flex-col items-center justify-center rounded-xl border px-2 transition ${
                        elegida
                          ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] ring-1 ring-inset ring-[var(--blue-main)]"
                          : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
                      }`}
                    >
                      <span
                        className="max-w-full truncate text-lg leading-tight"
                        style={{ fontFamily: `"Llavero ${opcion.nombre}", sans-serif` }}
                      >
                        {texto.trim() || "Kint"}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {opcion.nombre} · {opcion.estilo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-[var(--text-muted)]">Tamaño</legend>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--kint-panel-border)] p-1">
                {TAMANOS_LLAVERO.map((opcion) => {
                  const elegido = opcion.nombre === tamano;
                  return (
                    <button
                      key={opcion.nombre}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => setTamano(opcion.nombre)}
                      className={`rounded-lg py-2 text-xs font-black transition ${
                        elegido ? "bg-[#1f3f85] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      {opcion.nombre}
                      <span className={`block text-[10px] font-bold ${elegido ? "text-white/70" : ""}`}>
                        letras de {opcion.alto} mm
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {!esMascota && (
              <>
            <fieldset>
              <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>Fondo</span>
                <span className="text-[var(--text-main)]">{fondo}</span>
              </legend>
              <div className="grid grid-cols-3 gap-1.5">
                {FONDOS_LLAVERO.map((opcion) => {
                  const elegido = opcion.nombre === fondo;
                  return (
                    <button
                      key={opcion.nombre}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => setFondo(opcion.nombre)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition ${
                        elegido
                          ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] ring-1 ring-inset ring-[var(--blue-main)]"
                          : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
                      }`}
                    >
                      <DibujoFondo fondo={opcion.nombre} base={colorFilamento(colorBase)} letras={colorFilamento(colorLetras)} />
                      <span className="text-[11px] font-black text-[var(--text-main)]">{opcion.nombre}</span>
                      <span className="text-[10px] leading-3 text-[var(--text-muted)]">{opcion.detalle}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {!soloLetras && (
            <fieldset>
              <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>{fondo === "Placa" ? "Margen alrededor de las letras" : "Borde alrededor de las letras"}</span>
                <span className="text-[var(--text-main)]">{borde}</span>
              </legend>
              <div className="grid grid-cols-4 gap-1.5">
                {BORDES_LLAVERO.map((opcion) => {
                  const elegido = opcion.nombre === borde;
                  return (
                    <button
                      key={opcion.nombre}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => setBorde(opcion.nombre)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-black transition ${
                        elegido
                          ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] ring-1 ring-inset ring-[var(--blue-main)]"
                          : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
                      }`}
                    >
                      {/* Dibujito: la letra con un borde de ese grosor. */}
                      <span
                        aria-hidden
                        className="flex h-7 items-center justify-center rounded-md px-1 text-sm font-black leading-none"
                        style={{
                          background: colorFilamento(colorBase),
                          color: colorFilamento(colorLetras),
                          padding: `${opcion.mm * 1.3}px ${opcion.mm * 2}px`,
                        }}
                      >
                        A
                      </span>
                      {opcion.nombre}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            )}

            <label className="block">
              <span className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>Separación entre letras</span>
                <span className="tabular-nums text-[var(--text-main)]">
                  {separacion === 0 ? "Normal" : `${separacion > 0 ? "+" : ""}${String(separacion).replace(".", ",")} mm`}
                </span>
              </span>
              <input
                type="range"
                min={SEPARACION_MIN}
                max={SEPARACION_MAX}
                step={SEPARACION_PASO}
                value={separacion}
                onChange={(evento) => setSeparacion(limpiarSeparacion(evento.target.value))}
                className="w-full accent-[#1f3f85] dark:accent-sky-400"
              />
              <span className="mt-0.5 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                <span>Pegadas</span>
                <button
                  type="button"
                  onClick={() => setSeparacion(0)}
                  className="rounded px-1 hover:text-[var(--text-main)]"
                >
                  Normal
                </button>
                <span>Separadas</span>
              </span>
              {fondo === "Solo letras" && separacion > -1 && (
                <span className="mt-1.5 block text-[11px] leading-4 text-[var(--text-muted)]">
                  Sin fondo, las letras que no se tocan salen sueltas. Juntalas con la barra si las querés unidas.
                </span>
              )}
            </label>

            {conLinea2 && texto2.trim() && (
              <label className="block">
                <span className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
                  <span>Espacio entre renglones</span>
                  <span className="tabular-nums text-[var(--text-main)]">
                    {renglones === 0 ? "Normal" : `${renglones > 0 ? "+" : ""}${String(renglones).replace(".", ",")} mm`}
                  </span>
                </span>
                <input
                  type="range"
                  min={RENGLONES_MIN}
                  max={RENGLONES_MAX}
                  step={0.5}
                  value={renglones}
                  onChange={(evento) => setRenglones(limpiarRenglones(evento.target.value))}
                  className="w-full accent-[#1f3f85] dark:accent-sky-400"
                />
                <span className="mt-0.5 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                  <span>Juntos</span>
                  <button type="button" onClick={() => setRenglones(0)} className="rounded px-1 hover:text-[var(--text-main)]">
                    Normal
                  </button>
                  <span>Separados</span>
                </span>
              </label>
            )}
              </>
            )}

            {!soloLetras && (
              <SelectorColor
                titulo={esMascota ? "Color de la chapita" : fondo === "Placa" ? "Color de la placa" : "Color del borde"}
                colores={colores}
                elegido={colorBase}
                onElegir={(color) => {
                  setColorBase(color);
                  setErrorAgregar("");
                }}
              />
            )}
            <SelectorColor
              titulo={esMascota ? "Color del nombre" : soloLetras ? "Color" : "Color de las letras"}
              colores={colores}
              elegido={colorLetras}
              onElegir={(color) => {
                setColorLetras(color);
                setErrorAgregar("");
              }}
            />

            {producto.cadenas.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-[var(--text-muted)]">Cadena</legend>
                <div className="flex flex-wrap gap-2">
                  {producto.cadenas.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      aria-pressed={opcion === cadena}
                      onClick={() => setCadena(opcion)}
                      className={`h-10 rounded-full border px-4 text-xs font-black transition ${
                        opcion === cadena
                          ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] ring-1 ring-inset ring-[var(--blue-main)]"
                          : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          {/* Pie: cantidad, precio y agregar */}
          <div className="border-t border-[var(--kint-panel-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {errorAgregar && (
              <p className="mb-2 text-xs font-bold text-red-600 dark:text-red-400">{errorAgregar}</p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-[var(--kint-panel-border)]">
                <button
                  type="button"
                  onClick={() => setCantidad((actual) => Math.max(1, actual - 1))}
                  disabled={cantidad <= 1}
                  aria-label="Uno menos"
                  className="flex h-11 w-10 items-center justify-center disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <span className="w-7 text-center font-black tabular-nums">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((actual) => Math.min(maxUnidades, actual + 1))}
                  disabled={cantidad >= maxUnidades}
                  aria-label="Uno más"
                  className="flex h-11 w-10 items-center justify-center disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={agregar}
                disabled={Boolean(errorTexto || errorTexto2)}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_BOTON_PRINCIPAL}`}
              >
                <ShoppingBag size={16} />
                Agregar · {pesos(producto.precio * cantidad)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Dibujito de cada fondo, con los colores elegidos. */
function DibujoFondo({ fondo, base, letras }: { fondo: string; base: string; letras: string }) {
  return (
    <svg viewBox="0 0 64 28" className="h-7 w-16" aria-hidden>
      {fondo === "Placa" && <rect x="2" y="2" width="60" height="24" rx="5" fill={base} />}
      {fondo === "Contorno" && (
        <path
          d="M6 14a5 5 0 0 1 5-5h3V6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1h8V5a3 3 0 0 1 3-3h7a4 4 0 0 1 4 4v3h4a5 5 0 0 1 0 10h-4v3a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4v-3h-7a5 5 0 0 1-5-5z"
          fill={base}
        />
      )}
      <text
        x="34"
        y="20"
        textAnchor="middle"
        fontSize="15"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        fill={letras}
        stroke={fondo === "Solo letras" ? "rgba(0,0,0,0.25)" : "none"}
        strokeWidth="0.6"
      >
        ABC
      </text>
    </svg>
  );
}

function SelectorColor({
  titulo,
  colores,
  elegido,
  onElegir,
}: {
  titulo: string;
  colores: string[];
  elegido: string;
  onElegir: (color: string) => void;
}) {
  const foto = fotoFilamento(elegido);
  return (
    <fieldset>
      <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
        <span>{titulo}</span>
        <span className="text-[var(--text-main)]">{elegido}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {colores.map((color) => {
          const activo = color === elegido;
          const mini = fotoFilamento(color)?.mini;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onElegir(color)}
              aria-pressed={activo}
              aria-label={color}
              title={color}
              className={`relative h-10 w-10 overflow-hidden rounded-full bg-cover bg-center transition ${
                activo
                  ? "ring-2 ring-[var(--blue-main)] ring-offset-2 ring-offset-[var(--kint-panel)] dark:ring-sky-400"
                  : "ring-1 ring-black/15 hover:scale-110 dark:ring-white/20"
              }`}
              style={mini ? { backgroundImage: `url("${mini}")` } : { background: colorFilamento(color) }}
            />
          );
        })}
      </div>
      {/* Cómo se ve de verdad el color elegido. */}
      {foto && (
        <div className="mt-2.5 flex items-center gap-3 rounded-xl bg-[var(--kint-panel-soft)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.grande}
            alt={`Carrete de filamento ${elegido}`}
            className="h-16 w-16 shrink-0 rounded-lg bg-white object-cover"
            loading="lazy"
          />
          <span className="min-w-0 text-[11px] leading-4 text-[var(--text-muted)]">
            <strong className="block text-xs text-[var(--text-main)]">{elegido}: foto real</strong>
            Así es el filamento. En la vista 3D el color es aproximado.
          </span>
        </div>
      )}
    </fieldset>
  );
}

/* Silueta de cada forma de chapita. */
function DibujoForma({ forma, color }: { forma: string; color: string }) {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-hidden>
      {forma === "Círculo" && (
        <>
          <circle cx="24" cy="18" r="12" fill={color} />
          <circle cx="24" cy="5" r="3.5" fill={color} />
        </>
      )}
      {forma === "Corazón" && (
        <path d="M24 29 C10 20 6 13 11 7.5 C15 3.5 21 5 24 9.5 C27 5 33 3.5 37 7.5 C42 13 38 20 24 29Z" fill={color} />
      )}
      {forma === "Hueso" && (
        <g fill={color}>
          <rect x="10" y="11" width="28" height="10" />
          <circle cx="10" cy="11" r="5.5" />
          <circle cx="10" cy="21" r="5.5" />
          <circle cx="38" cy="11" r="5.5" />
          <circle cx="38" cy="21" r="5.5" />
        </g>
      )}
    </svg>
  );
}
