"use client";

import {
  AlertTriangle,
  Check,
  DollarSign,
  FolderOpen,
  Gift,
  ImageIcon,
  Layers,
  Minus,
  Palette,
  Pencil,
  Plus,
  Store,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ComboAdmin, ProductoAdmin, ProductoEntrada } from "@/lib/admin-tipos";
import { COMBO_VACIO, EditorCombo, errorCombo } from "@/components/admin/productos/EditorCombo";
import {
  Boton,
  CajaError,
  Campo,
  Chip,
  Encabezado,
  Esqueleto,
  Hoja,
  Interruptor,
  Segmentos,
  Tarjeta,
  Vacio,
  claseInput,
  pesos,
  useAvisos,
} from "@/components/admin/ui";

const SIN_DATOS = {};

type Filtro = "todos" | "activos" | "pausados";

type Formulario = {
  nombreOriginal: string;
  nombre: string;
  precio: string;
  precioMayor: string;
  precioGranMayor: string;
  foto: string;
  cadenas: string[];
  colores: string[];
  minColores: string;
  variantes: string[];
  descripcion: string;
  etiquetas: string[];
  personalizable: boolean;
  tipoPersonalizado: "Llavero" | "Mascota";
  maxColores: string;
  activo: boolean;
  combo: ComboAdmin;
};

type Errores = Partial<
  Record<
    | "nombre"
    | "precio"
    | "precioMayor"
    | "precioGranMayor"
    | "limitesColores"
    | "variantes"
    | "combo",
    string
  >
>;

const FORMULARIO_NUEVO: Formulario = {
  nombreOriginal: "",
  nombre: "",
  precio: "",
  precioMayor: "",
  precioGranMayor: "",
  foto: "",
  cadenas: [],
  colores: [],
  minColores: "",
  variantes: [],
  descripcion: "",
  etiquetas: [],
  personalizable: false,
  tipoPersonalizado: "Llavero",
  maxColores: "",
  activo: true,
  combo: COMBO_VACIO,
};

function aFormulario(producto: ProductoAdmin): Formulario {
  return {
    nombreOriginal: producto.nombre,
    nombre: producto.nombre,
    precio: producto.precio ? String(producto.precio) : "",
    precioMayor: producto.precioMayor ? String(producto.precioMayor) : "",
    precioGranMayor: producto.precioGranMayor
      ? String(producto.precioGranMayor)
      : "",
    foto: producto.foto || "",
    cadenas: [...(producto.cadenas || [])],
    colores: [...(producto.colores || [])],
    minColores: producto.minColores ? String(producto.minColores) : "",
    variantes: [...(producto.variantes || [])],
    descripcion: producto.descripcion || "",
    etiquetas: [...(producto.etiquetas || [])],
    personalizable: producto.personalizable === true,
    tipoPersonalizado: producto.tipoPersonalizado === "Mascota" ? "Mascota" : "Llavero",
    maxColores: producto.maxColores ? String(producto.maxColores) : "",
    activo: producto.activo,
    combo: producto.combo?.tipo ? { ...producto.combo, productos: [...producto.combo.productos] } : COMBO_VACIO,
  };
}

function aEntrada(producto: ProductoAdmin): ProductoEntrada {
  return {
    nombre: producto.nombre,
    precio: producto.precio,
    precioMayor: producto.precioMayor,
    precioGranMayor: producto.precioGranMayor,
    foto: producto.foto,
    cadenas: producto.cadenas,
    colores: producto.colores || [],
    minColores: producto.minColores || 0,
    variantes: producto.variantes || [],
    descripcion: producto.descripcion || "",
    etiquetas: producto.etiquetas || [],
    personalizable: producto.personalizable === true,
    tipoPersonalizado: producto.tipoPersonalizado === "Mascota" ? "Mascota" : "Llavero",
    maxColores: producto.maxColores || 0,
    activo: producto.activo,
    combo: producto.combo || COMBO_VACIO,
  };
}

/* "" → 0; acepta coma decimal. NaN si no es un número. */
function numero(texto: string) {
  const limpio = texto.trim().replace(",", ".");
  return limpio ? Number(limpio) : 0;
}

function mismoNombre(a: string, b: string) {
  return a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
}

function validar(formulario: Formulario, productos: ProductoAdmin[]) {
  const errores: Errores = {};
  const nombre = formulario.nombre.trim();
  const precio = numero(formulario.precio);
  const mayor = numero(formulario.precioMayor);
  const gran = numero(formulario.precioGranMayor);

  if (!nombre) {
    errores.nombre = "Poné un nombre.";
  } else if (
    productos.some(
      (producto) =>
        mismoNombre(producto.nombre, nombre) &&
        !mismoNombre(producto.nombre, formulario.nombreOriginal)
    )
  ) {
    errores.nombre = "Ya hay un producto con ese nombre.";
  }

  if (!Number.isFinite(precio) || precio <= 0) {
    errores.precio = "El precio tiene que ser mayor a 0.";
  }

  if (!Number.isFinite(mayor) || mayor < 0) {
    errores.precioMayor = "Revisá este precio.";
  } else if (mayor > 0 && Number.isFinite(precio) && mayor > precio) {
    errores.precioMayor = "No puede ser más caro que el precio normal.";
  }

  if (!Number.isFinite(gran) || gran < 0) {
    errores.precioGranMayor = "Revisá este precio.";
  } else if (gran > 0) {
    const tope = mayor > 0 ? mayor : precio;
    if (Number.isFinite(tope) && gran > tope) {
      errores.precioGranMayor =
        mayor > 0
          ? "No puede ser más caro que el precio por mayor."
          : "No puede ser más caro que el precio normal.";
    }
  }

  const minimo = numero(formulario.minColores);
  const maximo = numero(formulario.maxColores);

  if (
    ![minimo, maximo].every(
      (valor) => Number.isInteger(valor) && valor >= 0 && valor <= 20
    )
  ) {
    errores.limitesColores = "Usá números enteros (vacíos = colores fijos de la foto).";
  } else if (minimo && maximo && minimo > maximo) {
    errores.limitesColores = "El mínimo no puede ser mayor que el máximo.";
  }

  // Variantes: ninguna, o 2 o más con título distinto (sin comas).
  const variantes = formulario.variantes.map((variante) => variante.trim());
  if (variantes.length) {
    if (variantes.some((variante) => !variante)) {
      errores.variantes = "Ponele título a cada variante (o quitá las vacías).";
    } else if (variantes.length < 2) {
      errores.variantes = "Con variantes, tienen que ser al menos 2.";
    } else if (variantes.some((variante) => /[,;]/.test(variante))) {
      errores.variantes = "Los títulos no pueden tener comas.";
    } else if (
      new Set(variantes.map((variante) => variante.toLocaleLowerCase("es"))).size !==
      variantes.length
    ) {
      errores.variantes = "Hay dos variantes con el mismo título.";
    }
  }

  const problemaCombo = errorCombo(formulario.combo, formulario.personalizable);
  if (problemaCombo) errores.combo = problemaCombo;

  return errores;
}

function lineaMayor(producto: ProductoAdmin) {
  const partes = [];
  if (producto.precioMayor > 0) {
    partes.push(`Por mayor ${pesos(producto.precioMayor)}`);
  }
  if (producto.precioGranMayor > 0) {
    partes.push(`Gran por mayor ${pesos(producto.precioGranMayor)}`);
  }
  return partes.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Tarjeta de producto                                                 */
/* ------------------------------------------------------------------ */

function TarjetaProducto({
  producto,
  cambiando,
  onEditar,
  onActivo,
}: {
  producto: ProductoAdmin;
  cambiando: boolean;
  onEditar: () => void;
  onActivo: (activo: boolean) => void;
}) {
  const mayor = lineaMayor(producto);

  return (
    <Tarjeta
      className={`flex flex-col overflow-hidden transition ${
        producto.activo ? "" : "opacity-75"
      }`}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black leading-tight">
            {producto.nombre}
          </h3>
          <div className="mt-1.5">
            <Chip tono={producto.activo ? "verde" : "gris"}>
              {producto.activo ? "Activo" : "Pausado"}
            </Chip>
          </div>
        </div>
        <div className="-mr-1 -mt-1 flex h-11 items-center px-1">
          <Interruptor
            activo={producto.activo}
            deshabilitado={cambiando}
            etiqueta={
              producto.activo
                ? `Pausar ${producto.nombre}`
                : `Activar ${producto.nombre}`
            }
            onCambiar={onActivo}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onEditar}
        aria-label={`Editar ${producto.nombre}`}
        className="flex flex-1 flex-col items-stretch gap-2.5 px-4 pb-4 pt-3 text-left transition hover:bg-[var(--kint-panel-soft)]"
      >
        <div>
          <p className="text-2xl font-black tabular-nums leading-none">
            {pesos(producto.precio)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {mayor || "Sin precio por mayor"}
          </p>
        </div>

        {producto.personalizable && (
          <Chip tono="azul">
            {producto.tipoPersonalizado === "Mascota" ? "Chapita de mascota · 3D" : "Personalizable · nombre en 3D"}
          </Chip>
        )}

        {(producto.etiquetas || []).length > 0 && (
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {producto.etiquetas.join(" · ")}
          </p>
        )}

        {(producto.variantes || []).length > 0 && (
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            {producto.variantes.length} variantes: {producto.variantes.join(" · ")}
          </p>
        )}

        {producto.combo?.tipo && (
          <Chip tono="verde">
            {producto.combo.tipo === "fijo"
              ? `Combo: ${producto.combo.productos.join(" + ")}`
              : `Combo: elige ${producto.combo.cantidad} de ${producto.combo.productos.length}`}
          </Chip>
        )}

        {(producto.cadenas.length > 0 || (producto.colores || []).length > 0) && (
          <div className="flex flex-wrap gap-1">
            {(producto.colores || []).map((color) => (
              <Chip key={`color-${color}`} tono="violeta">
                {color}
              </Chip>
            ))}
            {producto.cadenas.map((cadena) => (
              <Chip key={cadena} tono="azul">
                {cadena}
              </Chip>
            ))}
          </div>
        )}

        {producto.fotos > 0 ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <ImageIcon size={14} />
            {producto.fotos === 1 ? "1 foto" : `${producto.fotos} fotos`}
          </p>
        ) : (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold leading-4 text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span className="min-w-0 break-words">
              Sin fotos — subilas a Drive › Tienda - Fotos › {producto.nombre}
            </span>
          </p>
        )}

        {!(producto.precio > 0) && (
          <p className="flex items-start gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold leading-4 text-red-700 dark:text-red-300">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span>Sin precio — no aparece en la tienda hasta que le pongas uno.</span>
          </p>
        )}

        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-bold text-[var(--acento)] dark:text-[var(--blue-soft)]">
          <Pencil size={13} />
          Editar
        </span>
      </button>
    </Tarjeta>
  );
}

/* Chips para elegir opciones (cadenas o colores) + campo para agregar otra. */
/* Muestras para los nombres de color más comunes (si no está, va sin muestra). */
const MUESTRAS: Record<string, string> = {
  negro: "#111111",
  blanco: "#ffffff",
  rojo: "#dc2626",
  marron: "#7c4a1e",
  cristal: "linear-gradient(135deg,#ffffff66,#cbd5e1aa)",
  transparente: "linear-gradient(135deg,#ffffff66,#cbd5e1aa)",
  "gris claro": "#d1d5db",
  gris: "#6b7280",
  oro: "#d4a017",
  dorado: "#d4af37",
  dorada: "#d4af37",
  plateado: "#c0c4cc",
  plateada: "#c0c4cc",
  plata: "#c0c4cc",
  arena: "#d6c08f",
  beige: "#e8d9b5",
  amarillo: "#facc15",
  naranja: "#f97316",
  verde: "#16a34a",
  "verde aguamarina": "#2dd4bf",
  aguamarina: "#2dd4bf",
  "verde claro": "#86efac",
  lila: "#c4b5fd",
  violeta: "#7c3aed",
  celeste: "#7dd3fc",
  azul: "#2563eb",
  rosa: "#f472b6",
  fucsia: "#d946ef",
  bordo: "#7f1d1d",
};

function muestraColor(nombre: string) {
  const clave = nombre
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return MUESTRAS[clave] || "";
}

function EditorOpciones({
  titulo,
  opciones,
  elegidas,
  onCambiar,
  muestras = false,
  ayuda,
}: {
  titulo: string;
  opciones: string[];
  elegidas: string[];
  onCambiar: (elegidas: string[]) => void;
  muestras?: boolean; // puntito con el color al lado del nombre
  ayuda?: ReactNode;
}) {
  const [nueva, setNueva] = useState("");
  const todas = [
    ...opciones,
    ...elegidas.filter((opcion) => !opciones.includes(opcion)),
  ];

  function alternar(opcion: string) {
    onCambiar(
      elegidas.includes(opcion)
        ? elegidas.filter((actual) => actual !== opcion)
        : [...elegidas, opcion]
    );
  }

  function agregar() {
    const limpia = nueva.trim().replace(/[,;]/g, " ").replace(/\s+/g, " ");
    if (!limpia) return;
    const existente =
      todas.find((opcion) => mismoNombre(opcion, limpia)) || limpia;
    if (!elegidas.includes(existente)) onCambiar([...elegidas, existente]);
    setNueva("");
  }

  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-xs font-bold text-[var(--text-muted)]">
        <span>{titulo}</span>
        {elegidas.length > 0 && (
          <span className="text-[11px] font-semibold">
            {elegidas.length} {elegidas.length === 1 ? "elegida" : "elegidas"}
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {todas.map((opcion) => {
          const elegida = elegidas.includes(opcion);
          const muestra = muestras ? muestraColor(opcion) : "";
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => alternar(opcion)}
              aria-pressed={elegida}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-xs font-bold transition active:scale-95 ${
                elegida
                  ? "border-[var(--blue-main)] bg-[var(--blue-main)]/15 text-[var(--text-main)] ring-1 ring-inset ring-[var(--blue-main)] dark:border-sky-400 dark:bg-sky-400/15 dark:ring-sky-400"
                  : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)] hover:text-[var(--text-main)]"
              }`}
            >
              {muestra ? (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/20 dark:ring-white/25"
                  style={{ background: muestra }}
                />
              ) : (
                elegida && <Check size={12} strokeWidth={3} />
              )}
              {opcion}
              {muestra && elegida && <Check size={12} strokeWidth={3} />}
            </button>
          );
        })}
        <span className="inline-flex h-8 items-center rounded-full border border-dashed border-[var(--kint-panel-border)] pl-3 pr-1 focus-within:border-[var(--kint-selected-border)]">
          <Plus size={12} aria-hidden className="shrink-0 text-[var(--text-muted)]" />
          <input
            className="h-full w-24 bg-transparent px-1.5 text-xs font-bold text-[var(--text-main)] outline-none placeholder:font-semibold placeholder:text-[var(--text-muted)]"
            value={nueva}
            onChange={(evento) => setNueva(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                agregar();
              }
            }}
            onBlur={agregar}
            placeholder="Agregar"
            aria-label={`Agregar ${titulo.toLowerCase()}`}
            maxLength={40}
            enterKeyHint="done"
          />
        </span>
      </div>
      {ayuda && <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">{ayuda}</p>}
    </fieldset>
  );
}

/* Bloque del formulario: ícono, título y su contenido en una caja suave. */
function Seccion({
  icono,
  titulo,
  descripcion,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)]/40 p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--blue-main)]/12 text-[var(--blue-main)] dark:bg-sky-400/12 dark:text-sky-300">
          {icono}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black leading-tight">{titulo}</h3>
          {descripcion && (
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{descripcion}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* Campo de plata con "$" adelante. */
function CampoPrecio({
  etiqueta,
  valor,
  onCambiar,
  placeholder,
  error,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder: string;
  error?: string;
  destacado?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">{etiqueta}</span>
      <span className="relative block">
        <span
          aria-hidden
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[var(--text-muted)] ${
            destacado ? "text-base" : "text-sm"
          }`}
        >
          $
        </span>
        <input
          className={`${claseInput} pl-7 tabular-nums ${destacado ? "h-12 text-lg font-black" : "h-12 font-bold"}`}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
        />
      </span>
      {error && (
        <span className="mt-1 block text-[11px] font-semibold leading-4 text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

/* − número + (para mínimo y máximo de colores). */
function Contador({
  etiqueta,
  valor,
  minimo,
  maximo,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  onCambiar: (valor: number) => void;
}) {
  const claseBoton =
    "flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-main)] transition hover:bg-[var(--kint-panel-soft)] disabled:opacity-30";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] py-1 pl-3.5 pr-1">
      <span className="text-xs font-bold text-[var(--text-muted)]">{etiqueta}</span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          className={claseBoton}
          onClick={() => onCambiar(valor - 1)}
          disabled={valor <= minimo}
          aria-label={`Menos (${etiqueta})`}
        >
          <Minus size={15} />
        </button>
        <span className="w-6 text-center text-base font-black tabular-nums" aria-live="polite">
          {valor}
        </span>
        <button
          type="button"
          className={claseBoton}
          onClick={() => onCambiar(valor + 1)}
          disabled={valor >= maximo}
          aria-label={`Más (${etiqueta})`}
        >
          <Plus size={15} />
        </button>
      </span>
    </div>
  );
}

/* "El cliente puede cambiarlos": apagado = mín. y máx. vacíos (colores fijos de la foto). */
function LimitesColores({
  minimoTexto,
  maximoTexto,
  tope,
  error,
  onCambiar,
}: {
  minimoTexto: string;
  maximoTexto: string;
  tope: number;
  error?: string;
  onCambiar: (minimo: string, maximo: string) => void;
}) {
  const puedeCambiar = Boolean(minimoTexto.trim() || maximoTexto.trim());
  const minimo = Math.max(1, Math.floor(numero(minimoTexto)) || 1);
  const maximo = Math.max(minimo, Math.floor(numero(maximoTexto)) || minimo);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-bold">El cliente puede cambiarlos</span>
          <span className="block text-[11px] text-[var(--text-muted)]">
            {puedeCambiar
              ? `Elige de ${minimo} a ${maximo} ${maximo === 1 ? "color" : "colores"}.`
              : "Va siempre con los colores de la foto."}
          </span>
        </span>
        <Interruptor
          activo={puedeCambiar}
          etiqueta="El cliente puede cambiar los colores"
          onCambiar={(activo) =>
            activo ? onCambiar("1", String(Math.min(2, tope))) : onCambiar("", "")
          }
        />
      </div>
      {puedeCambiar && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Contador
            etiqueta="Mínimo"
            valor={minimo}
            minimo={1}
            maximo={maximo}
            onCambiar={(valor) => onCambiar(String(valor), String(maximo))}
          />
          <Contador
            etiqueta="Máximo"
            valor={maximo}
            minimo={minimo}
            maximo={Math.max(tope, maximo)}
            onCambiar={(valor) => onCambiar(String(minimo), String(valor))}
          />
        </div>
      )}
      {error && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function ProductosAdmin() {
  const avisar = useAvisos();
  const { datos, setDatos, error, cargando, recargar } = useDatosAdmin(
    "admin_productos_listar",
    SIN_DATOS
  );
  const productos = datos?.productos || [];
  const cadenasOpciones = datos?.cadenasOpciones || [];
  // Etiquetas ya usadas en otros productos, para elegirlas con un toque.
  const etiquetasOpciones = Array.from(
    new Set(productos.flatMap((producto) => producto.etiquetas || []))
  ).sort((a, b) => a.localeCompare(b, "es"));
  const coloresOpciones = datos?.coloresOpciones || [];
  const hayColores = Boolean(datos?.hayColores);
  const hayLimitesColores = Boolean(datos?.hayLimitesColores);

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cambiando, setCambiando] = useState<string[]>([]);
  const pendientes = useRef(new Map<string, boolean>());
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [ordenando, setOrdenando] = useState(false);

  /* Orden de la tienda: arrastrar un producto (o flechas) y se guarda. */
  async function mover(nombre: string, destino: string | number) {
    const lista = productos.map((producto) => producto.nombre);
    const desde = lista.indexOf(nombre);
    const hasta = typeof destino === "number" ? desde + destino : lista.indexOf(destino);
    if (desde < 0 || hasta < 0 || hasta >= lista.length || desde === hasta || ordenando) return;
    lista.splice(desde, 1);
    lista.splice(hasta, 0, nombre);
    const anterior = datos;
    setDatos((actual) =>
      actual
        ? { ...actual, productos: lista.map((item) => actual.productos.find((p) => p.nombre === item)!).filter(Boolean) }
        : actual
    );
    setOrdenando(true);
    try {
      const respuesta = await accionAdmin("admin_productos_ordenar", { nombres: lista });
      setDatos(respuesta);
      avisar("Orden de la tienda guardado");
    } catch (error) {
      if (anterior) setDatos(anterior);
      avisar(error instanceof Error ? error.message : "No se pudo ordenar.", "error");
    } finally {
      setOrdenando(false);
    }
  }

  const activos = productos.filter((producto) => producto.activo).length;
  const visibles = productos.filter((producto) =>
    filtro === "activos"
      ? producto.activo
      : filtro === "pausados"
      ? !producto.activo
      : true
  );

  /* Reemplaza un producto en la lista sin tocar el resto. */
  function cambiarEnLista(nombre: string, cambio: Partial<ProductoAdmin>) {
    setDatos((actual) =>
      actual
        ? {
            ...actual,
            productos: actual.productos.map((producto) =>
              producto.nombre === nombre ? { ...producto, ...cambio } : producto
            ),
          }
        : actual
    );
  }

  async function alternarActivo(producto: ProductoAdmin, activo: boolean) {
    setCambiando((actual) => [...actual, producto.nombre]);
    pendientes.current.set(producto.nombre, activo);
    cambiarEnLista(producto.nombre, { activo });

    try {
      const respuesta = await accionAdmin("admin_producto_guardar", {
        nombreOriginal: producto.nombre,
        producto: { ...aEntrada(producto), activo },
      });
      pendientes.current.delete(producto.nombre);
      /* Respeta otros interruptores que todavía se están guardando. */
      setDatos((actual) => ({
        productos: respuesta.productos.map((item) =>
          pendientes.current.has(item.nombre)
            ? { ...item, activo: pendientes.current.get(item.nombre)! }
            : item
        ),
        cadenasOpciones: actual?.cadenasOpciones || [],
        coloresOpciones: actual?.coloresOpciones || [],
        hayColores: Boolean(actual?.hayColores),
        hayLimitesColores: Boolean(actual?.hayLimitesColores),
      }));
      avisar(
        activo
          ? `${producto.nombre} ya se ve en la tienda.`
          : `${producto.nombre} quedó pausado.`
      );
    } catch (errorGuardar) {
      pendientes.current.delete(producto.nombre);
      cambiarEnLista(producto.nombre, { activo: producto.activo });
      avisar(
        errorGuardar instanceof Error
          ? errorGuardar.message
          : "No se pudo cambiar el producto.",
        "error"
      );
    } finally {
      setCambiando((actual) =>
        actual.filter((nombre) => nombre !== producto.nombre)
      );
    }
  }

  function abrir(producto?: ProductoAdmin) {
    setFormulario(producto ? aFormulario(producto) : { ...FORMULARIO_NUEVO });
    setIntentado(false);
  }

  const cerrar = useCallback(() => {
    if (!guardando) setFormulario(null);
  }, [guardando]);

  function cambiar(cambio: Partial<Formulario>) {
    setFormulario((actual) => (actual ? { ...actual, ...cambio } : actual));
  }

  const errores = formulario ? validar(formulario, productos) : {};
  const hayErrores = Object.keys(errores).length > 0;
  const renombrado = Boolean(
    formulario?.nombreOriginal &&
      formulario.nombre.trim() &&
      formulario.nombre.trim() !== formulario.nombreOriginal
  );

  async function guardar(evento?: FormEvent) {
    evento?.preventDefault();
    if (!formulario || guardando) return;
    setIntentado(true);
    if (hayErrores) {
      // El error puede quedar fuera de la vista (ej. precio, arriba de todo).
      window.requestAnimationFrame(() => {
        const campo = document.querySelector<HTMLElement>(
          '[role="dialog"] [aria-invalid="true"]'
        );
        campo?.scrollIntoView({ behavior: "smooth", block: "center" });
        campo?.focus({ preventScroll: true });
      });
      return;
    }

    const esNuevo = !formulario.nombreOriginal;
    const producto: ProductoEntrada = {
      nombre: formulario.nombre.trim(),
      precio: numero(formulario.precio),
      precioMayor: numero(formulario.precioMayor),
      precioGranMayor: numero(formulario.precioGranMayor),
      foto: formulario.foto.trim(),
      cadenas: formulario.cadenas,
      colores: formulario.colores,
      minColores: numero(formulario.minColores),
      variantes: formulario.variantes.map((variante) => variante.trim()).filter(Boolean),
      descripcion: formulario.descripcion.trim(),
      etiquetas: formulario.etiquetas.slice(0, 5),
      personalizable: formulario.personalizable,
      tipoPersonalizado: formulario.personalizable ? formulario.tipoPersonalizado : "",
      maxColores: numero(formulario.maxColores),
      activo: formulario.activo,
      combo: formulario.combo,
    };

    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_producto_guardar", {
        nombreOriginal: formulario.nombreOriginal,
        producto,
      });
      setDatos((actual) => {
        const sumar = (base: string[], nuevas: string[]) => [
          ...base,
          ...nuevas.filter((opcion) => !base.includes(opcion)),
        ];
        return {
          productos: respuesta.productos,
          cadenasOpciones: sumar(actual?.cadenasOpciones || [], producto.cadenas),
          coloresOpciones: sumar(actual?.coloresOpciones || [], producto.colores),
          hayColores: Boolean(actual?.hayColores),
          hayLimitesColores: Boolean(actual?.hayLimitesColores),
        };
      });
      avisar(esNuevo ? "Producto creado." : "Cambios guardados.");
      setFormulario(null);
    } catch (errorGuardar) {
      avisar(
        errorGuardar instanceof Error
          ? errorGuardar.message
          : "No se pudo guardar el producto.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Productos"
        subtitulo={
          datos
            ? `${activos} ${activos === 1 ? "activo" : "activos"} · ${
                productos.length - activos
              } ${productos.length - activos === 1 ? "pausado" : "pausados"}`
            : "Lo que se vende en la tienda"
        }
        accion={
          <Boton
            variante="principal"
            icono={<Plus size={17} />}
            onClick={() => abrir()}
            disabled={!datos}
          >
            Nuevo
          </Boton>
        }
      />

      {cargando ? (
        <Esqueleto filas={4} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : !productos.length ? (
        <Vacio
          titulo="Todavía no hay productos"
          texto="Tocá Nuevo para cargar el primero."
          icono={<Wrench size={30} strokeWidth={1.5} />}
        />
      ) : (
        <>
          <Segmentos
            valor={filtro}
            onCambiar={setFiltro}
            opciones={[
              { valor: "todos", texto: "Todos", cantidad: productos.length },
              { valor: "activos", texto: "Activos", cantidad: activos },
              {
                valor: "pausados",
                texto: "Pausados",
                cantidad: productos.length - activos,
              },
            ]}
          />
          {visibles.length ? (
            <>
            {filtro === "todos" && productos.length > 1 && (
              <p className="mb-2 text-[11px] text-[var(--text-muted)]">
                Arrastrá los productos (o usá las flechas) para elegir en qué orden salen en la tienda («Destacados»).
              </p>
            )}
            <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${ordenando ? "opacity-70" : ""}`}>
              {visibles.map((producto) => {
                const posicion = productos.findIndex((item) => item.nombre === producto.nombre);
                const ordenable = filtro === "todos" && productos.length > 1;
                return (
                  <div
                    key={producto.nombre}
                    draggable={ordenable}
                    onDragStart={() => setArrastrando(producto.nombre)}
                    onDragOver={(evento) => evento.preventDefault()}
                    onDrop={() => {
                      if (arrastrando) void mover(arrastrando, producto.nombre);
                      setArrastrando(null);
                    }}
                    onDragEnd={() => setArrastrando(null)}
                    className={`flex flex-col ${ordenable ? "cursor-grab active:cursor-grabbing" : ""} ${arrastrando === producto.nombre ? "opacity-40" : ""}`}
                  >
                    {ordenable && (
                      <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-black text-[var(--text-muted)]">
                        <span>#{posicion + 1}</span>
                        <span className="flex gap-1">
                          <button type="button" aria-label="Antes" disabled={posicion === 0 || ordenando} onClick={() => void mover(producto.nombre, -1)} className="rounded px-1.5 py-0.5 hover:bg-[var(--kint-panel-soft)] disabled:opacity-25">◀</button>
                          <button type="button" aria-label="Después" disabled={posicion === productos.length - 1 || ordenando} onClick={() => void mover(producto.nombre, 1)} className="rounded px-1.5 py-0.5 hover:bg-[var(--kint-panel-soft)] disabled:opacity-25">▶</button>
                        </span>
                      </div>
                    )}
                    <TarjetaProducto
                      producto={producto}
                      cambiando={cambiando.includes(producto.nombre)}
                      onEditar={() => abrir(producto)}
                      onActivo={(activo) => alternarActivo(producto, activo)}
                    />
                  </div>
                );
              })}
            </div>
            </>
          ) : (
            <Vacio
              titulo={
                filtro === "activos"
                  ? "No hay productos activos"
                  : "No hay productos pausados"
              }
            />
          )}
        </>
      )}

      <Hoja
        abierta={Boolean(formulario)}
        onCerrar={cerrar}
        titulo={formulario?.nombreOriginal ? "Editar producto" : "Nuevo producto"}
        ancha
        pie={
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={cerrar} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton
              variante="principal"
              onClick={() => guardar()}
              cargando={guardando}
              disabled={intentado && hayErrores}
              icono={<Check size={16} />}
            >
              Guardar
            </Boton>
          </div>
        }
      >
        {formulario && (
          <form className="space-y-4" onSubmit={guardar} noValidate>
            {/* Nombre + activo */}
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Nombre</span>
                <input
                  className={`${claseInput} h-12 text-lg font-black`}
                  value={formulario.nombre}
                  onChange={(evento) => cambiar({ nombre: evento.target.value })}
                  placeholder="Ej.: Llavero casita"
                  maxLength={80}
                  aria-invalid={Boolean(intentado && errores.nombre)}
                  autoFocus={!formulario.nombreOriginal}
                />
                {intentado && errores.nombre && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600 dark:text-red-400">
                    {errores.nombre}
                  </span>
                )}
              </label>

              {renombrado && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300">
                  <FolderOpen size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Si le cambiás el nombre, renombrá también la carpeta de fotos
                    en Drive › Tienda - Fotos (de “{formulario.nombreOriginal}” a
                    “{formulario.nombre.trim()}”). Si no, la tienda no encuentra
                    las fotos.
                  </span>
                </div>
              )}

              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  formulario.activo
                    ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                    : "border-[var(--kint-panel-border)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      formulario.activo ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" : "bg-slate-400"
                    }`}
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      {formulario.activo ? "Activo en la tienda" : "Pausado"}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {formulario.activo ? "Se ve y se puede comprar." : "No aparece en la tienda."}
                    </span>
                  </span>
                </span>
                <Interruptor
                  activo={formulario.activo}
                  etiqueta="Producto activo"
                  onCambiar={(activo) => cambiar({ activo })}
                />
              </div>
            </div>

            <Seccion
              icono={<DollarSign size={17} />}
              titulo="Precio"
              descripcion="Por unidad. Desde cuántas unidades rige cada precio se cambia en Configuración › Tienda."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <CampoPrecio
                  etiqueta="Precio"
                  valor={formulario.precio}
                  onCambiar={(precio) => cambiar({ precio })}
                  placeholder="0"
                  error={intentado ? errores.precio : undefined}
                  destacado
                />
                <CampoPrecio
                  etiqueta="Por mayor"
                  valor={formulario.precioMayor}
                  onCambiar={(precioMayor) => cambiar({ precioMayor })}
                  placeholder="Sin precio"
                  error={intentado ? errores.precioMayor : undefined}
                />
                <CampoPrecio
                  etiqueta="Gran por mayor"
                  valor={formulario.precioGranMayor}
                  onCambiar={(precioGranMayor) => cambiar({ precioGranMayor })}
                  placeholder="Sin precio"
                  error={intentado ? errores.precioGranMayor : undefined}
                />
              </div>
            </Seccion>

            {(hayColores || hayLimitesColores) && (
              <Seccion
                icono={<Palette size={17} />}
                titulo="Colores"
                descripcion="Los de la foto son los que se compran si el cliente no los cambia."
              >
                {hayColores && (
                  <EditorOpciones
                    titulo="Colores de la foto"
                    opciones={coloresOpciones}
                    elegidas={formulario.colores}
                    onCambiar={(colores) => cambiar({ colores })}
                    muestras
                  />
                )}

                {hayLimitesColores && (
                  <LimitesColores
                    minimoTexto={formulario.minColores}
                    maximoTexto={formulario.maxColores}
                    tope={Math.max(1, coloresOpciones.length || 10)}
                    error={intentado ? errores.limitesColores : undefined}
                    onCambiar={(minColores, maxColores) => cambiar({ minColores, maxColores })}
                  />
                )}
              </Seccion>
            )}

            <Seccion
              icono={<Layers size={17} />}
              titulo="Opciones de compra"
              descripcion="Lo que el cliente elige al agregarlo al carrito."
            >
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  formulario.personalizable
                    ? "border-[var(--blue-main)]/50 bg-[var(--blue-main)]/[0.08] dark:border-sky-400/50 dark:bg-sky-400/[0.08]"
                    : "border-[var(--kint-panel-border)]"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">Lo personaliza el cliente</span>
                  <span className="block text-[11px] leading-4 text-[var(--text-muted)]">
                    Lo arma en 3D con sus datos. Vos descargás el archivo para imprimir desde la compra.
                  </span>
                </span>
                <Interruptor
                  activo={formulario.personalizable}
                  etiqueta="Lo personaliza el cliente"
                  onCambiar={(personalizable) => cambiar({ personalizable })}
                />
              </div>
              {formulario.personalizable && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["Llavero", "🔑 Llavero con nombre", "Texto, letra, fondo y colores"],
                      ["Mascota", "🐾 Chapita de mascota", "Nombre adelante, teléfono atrás"],
                    ] as const
                  ).map(([valor, titulo, detalle]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={formulario.tipoPersonalizado === valor}
                      onClick={() => cambiar({ tipoPersonalizado: valor })}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        formulario.tipoPersonalizado === valor
                          ? "border-[var(--blue-main)] bg-[var(--blue-main)]/10 ring-1 ring-inset ring-[var(--blue-main)] dark:border-sky-400 dark:ring-sky-400"
                          : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)]"
                      }`}
                    >
                      <span className="block text-xs font-black">{titulo}</span>
                      <span className="block text-[11px] text-[var(--text-muted)]">{detalle}</span>
                    </button>
                  ))}
                </div>
              )}

              <EditorOpciones
                titulo="Cadenas"
                opciones={cadenasOpciones}
                elegidas={formulario.cadenas}
                onCambiar={(cadenas) => cambiar({ cadenas })}
                muestras
              />

              <fieldset>
                <legend className="mb-1 block text-xs font-bold text-[var(--text-muted)]">
                  Variantes <span className="font-semibold">(opcional)</span>
                </legend>
                <p className="mb-2 text-[11px] leading-4 text-[var(--text-muted)]">
                  Si las cargás, el cliente tiene que elegir una (ej.: Chocolate entero, mordido o con relleno).
                </p>

                {formulario.variantes.length > 0 && (
                  <ol className="mb-2 space-y-2">
                    {formulario.variantes.map((variante, indice) => (
                      <li key={indice} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--kint-panel)] text-[11px] font-black text-[var(--text-muted)] ring-1 ring-[var(--kint-panel-border)]">
                          {indice + 1}
                        </span>
                        <input
                          className={`${claseInput} h-10`}
                          value={variante}
                          onChange={(evento) =>
                            cambiar({
                              variantes: formulario.variantes.map((actual, otro) =>
                                otro === indice ? evento.target.value : actual
                              ),
                            })
                          }
                          placeholder={`Variante ${indice + 1}`}
                          aria-label={`Título de la variante ${indice + 1}`}
                          maxLength={40}
                          aria-invalid={Boolean(intentado && errores.variantes && !variante.trim())}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            cambiar({
                              variantes: formulario.variantes.filter((_, otro) => otro !== indice),
                            })
                          }
                          aria-label={`Quitar la variante ${indice + 1}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                <button
                  type="button"
                  onClick={() =>
                    cambiar({
                      // La primera vez se arrancan 2 (con una sola no tiene sentido).
                      variantes: formulario.variantes.length ? [...formulario.variantes, ""] : ["", ""],
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-[var(--kint-panel-border)] px-3.5 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--kint-selected-border)] hover:text-[var(--text-main)]"
                >
                  <Plus size={14} />
                  Agregar variante
                </button>

                {intentado && errores.variantes && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                    {errores.variantes}
                  </p>
                )}
              </fieldset>
            </Seccion>

            <Seccion
              icono={<Gift size={17} />}
              titulo="Combo"
              descripcion="Vendé varios juntos más barato: fijos o que el cliente elija."
            >
              <EditorCombo
                valor={formulario.combo}
                onCambiar={(combo) => cambiar({ combo })}
                productos={productos}
                nombreActual={formulario.nombreOriginal || formulario.nombre}
                precio={numero(formulario.precio)}
                error={intentado ? errores.combo || "" : ""}
              />
            </Seccion>

            <Seccion
              icono={<Store size={17} />}
              titulo="En la tienda"
              descripcion="Cómo lo encuentran y qué leen antes de comprar."
            >
              <EditorOpciones
                titulo="Etiquetas (hasta 5)"
                opciones={etiquetasOpciones}
                elegidas={formulario.etiquetas}
                onCambiar={(etiquetas) => cambiar({ etiquetas: etiquetas.slice(0, 5) })}
                ayuda="Qué es: Llavero, Clicker, Combo… La tienda filtra por esto."
              />

              <label className="block">
                <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-[var(--text-muted)]">
                  <span>
                    Descripción <span className="font-semibold">(opcional)</span>
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">
                    {formulario.descripcion.length}/500
                  </span>
                </span>
                <textarea
                  className={`${claseInput} min-h-20 resize-y py-2.5 leading-6`}
                  value={formulario.descripcion}
                  onChange={(evento) => cambiar({ descripcion: evento.target.value })}
                  maxLength={500}
                  rows={3}
                  placeholder="Ej.: Incluye 2 llaveros: casco y portaplanos."
                />
              </label>
            </Seccion>

            <Seccion
              icono={<ImageIcon size={17} />}
              titulo="Fotos"
              descripcion="Se toman solas de Drive › Tienda - Fotos, de la carpeta con el nombre del producto."
            >
              <Campo etiqueta="Link a una foto (opcional)" ayuda="Solo si querés usar otra foto en vez de la carpeta.">
                <input
                  className={claseInput}
                  value={formulario.foto}
                  onChange={(evento) => cambiar({ foto: evento.target.value })}
                  placeholder="https://drive.google.com/…"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Campo>
            </Seccion>

            {/* Enter en un campo guarda. */}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        )}
      </Hoja>
    </>
  );
}
