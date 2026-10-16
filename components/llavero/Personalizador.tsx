"use client";

/*
 * Llavero con nombre: el cliente escribe, elige fuente, tamaño y colores,
 * y lo ve en 3D al instante. Se carga solo al abrirlo (three.js pesa).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Minus, Plus, RotateCcw, ShoppingBag, X } from "lucide-react";
import VisorLlavero from "@/components/llavero/VisorLlavero";
import { construirLlavero, type GeometriaLlavero } from "@/lib/llavero/geometria";
import {
  FUENTES_LLAVERO,
  MAX_LETRAS_LLAVERO,
  TAMANOS_LLAVERO,
  errorTextoLlavero,
  formatearPersonalizacion,
  limpiarTextoLlavero,
} from "@/lib/llavero/personalizacion";
import { claveColor, colorFilamento } from "@/lib/colores-filamento";

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
}: {
  producto: ProductoPersonalizable;
  maxUnidades: number;
  onAgregar: (opciones: OpcionesPersonalizado) => string;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState("Antonio");
  const [fuente, setFuente] = useState<string>(FUENTES_LLAVERO[0].nombre);
  const [tamano, setTamano] = useState<string>("Mediano");
  const [colorBase, setColorBase] = useState(() =>
    elegirColor(producto.colores, ["azul", "violeta", "negro", "rojo"])
  );
  const [colorLetras, setColorLetras] = useState(() =>
    elegirColor(producto.colores, ["blanco", "amarillo", "gris claro"], colorBase)
  );
  const [cadena, setCadena] = useState(producto.cadenas[0] || "");
  const [cantidad, setCantidad] = useState(1);
  const [geometria, setGeometria] = useState<GeometriaLlavero | null>(null);
  const [armando, setArmando] = useState(true);
  const [errorArmado, setErrorArmado] = useState("");
  const [errorAgregar, setErrorAgregar] = useState("");
  const anterior = useRef<GeometriaLlavero | null>(null);

  const errorTexto = errorTextoLlavero(texto);
  const textoParaVer = errorTexto ? "" : texto.trim();

  // Rearma la pieza (con una pausa corta mientras escribe).
  useEffect(() => {
    if (!textoParaVer) return;
    let cancelado = false;
    const espera = window.setTimeout(() => {
      setArmando(true);
      construirLlavero({ texto: textoParaVer, fuente, tamano })
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
  }, [textoParaVer, fuente, tamano]);

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
    if (errorTexto) {
      setErrorAgregar(errorTexto);
      return;
    }
    if (!colorBase || !colorLetras || colorBase === colorLetras) {
      setErrorAgregar("Elegí un color para el borde y otro distinto para las letras.");
      return;
    }
    const error = onAgregar({
      cadena,
      colores: [colorBase, colorLetras],
      comentario: formatearPersonalizacion({ texto, fuente, tamano }),
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
            colorBase={colorFilamento(colorBase)}
            colorLetras={colorFilamento(colorLetras)}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-[11px] font-bold text-white/75">
            <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur">
              {armando ? <LoaderCircle size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {armando ? "Armando…" : "Giralo con el dedo"}
            </span>
            {geometria && (
              <span className="rounded-full bg-black/35 px-2.5 py-1 tabular-nums backdrop-blur">
                {Math.round(geometria.ancho)} × {Math.round(geometria.alto)} × 3 mm
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
                Personalizado
              </p>
              <h2 className="mt-0.5 pr-10 text-2xl font-black leading-tight">{producto.nombre}</h2>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-[var(--text-muted)]">
                <span>Nombre</span>
                <span className="tabular-nums">
                  {texto.length}/{MAX_LETRAS_LLAVERO}
                </span>
              </span>
              <input
                value={texto}
                onChange={(evento) => {
                  setTexto(limpiarTextoLlavero(evento.target.value));
                  setErrorAgregar("");
                }}
                maxLength={MAX_LETRAS_LLAVERO}
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

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-[var(--text-muted)]">Letra</legend>
              <div className="grid grid-cols-2 gap-2">
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
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{opcion.nombre}</span>
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

            <SelectorColor
              titulo="Color del borde"
              colores={colores}
              elegido={colorBase}
              otro={colorLetras}
              onElegir={(color) => {
                setColorBase(color);
                setErrorAgregar("");
              }}
            />
            <SelectorColor
              titulo="Color de las letras"
              colores={colores}
              elegido={colorLetras}
              otro={colorBase}
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
                disabled={Boolean(errorTexto)}
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

function SelectorColor({
  titulo,
  colores,
  elegido,
  otro,
  onElegir,
}: {
  titulo: string;
  colores: string[];
  elegido: string;
  otro: string;
  onElegir: (color: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full justify-between text-xs font-bold text-[var(--text-muted)]">
        <span>{titulo}</span>
        <span className="text-[var(--text-main)]">{elegido}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {colores.map((color) => {
          const activo = color === elegido;
          const usado = color === otro;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onElegir(color)}
              disabled={usado}
              aria-pressed={activo}
              aria-label={color}
              title={usado ? `${color} (ya está en la otra parte)` : color}
              className={`relative h-9 w-9 rounded-full transition disabled:cursor-not-allowed disabled:opacity-25 ${
                activo
                  ? "ring-2 ring-[var(--blue-main)] ring-offset-2 ring-offset-[var(--kint-panel)] dark:ring-sky-400"
                  : "ring-1 ring-black/15 hover:scale-110 dark:ring-white/20"
              }`}
              style={{ background: colorFilamento(color) }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
