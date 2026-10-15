"use client";

/*
 * Kit visual del panel de admin. Mobile first, mismos tokens que
 * la web (globals.css) y modo oscuro con la clase .dark.
 */

import {
  AlertTriangle,
  Check,
  Inbox,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

export function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", {
    maximumFractionDigits: 2,
  })}`;
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/* "yyyy-mm-dd" → "vie 23 oct" (sin correr el día por la zona horaria). */
export function fechaDia(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return "";
  const fecha = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return `${DIAS_CORTOS[fecha.getUTCDay()]} ${fecha.getUTCDate()} ${
    MESES_CORTOS[fecha.getUTCMonth()]
  }`;
}

/* ISO completo → "23 oct, 14:05". */
export function fechaHora(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}, ${String(
    fecha.getHours()
  ).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

/* Días desde hoy hasta "yyyy-mm-dd" (0 = hoy, 1 = mañana, -1 = ayer). */
export function diasHasta(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return null;
  const hoy = new Date();
  const inicioHoy = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const destino = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Math.round((destino - inicioHoy) / 86400000);
}

export function textoDiasHasta(iso: string) {
  const dias = diasHasta(iso);
  if (dias === null) return "";
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

/* ------------------------------------------------------------------ */
/* Superficies                                                          */
/* ------------------------------------------------------------------ */

export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-black leading-tight sm:text-3xl">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {subtitulo}
          </p>
        )}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}

export function TituloSeccion({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ */
/* Botones y chips                                                      */
/* ------------------------------------------------------------------ */

type VarianteBoton = "principal" | "secundario" | "peligro" | "exito" | "fantasma";

const CLASES_BOTON: Record<VarianteBoton, string> = {
  principal:
    "border-[rgba(90,145,235,0.35)] bg-[#1f3f85] text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:brightness-110",
  secundario:
    "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-main)] hover:border-[var(--kint-selected-border)]",
  peligro:
    "border-red-600 bg-transparent text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400",
  exito:
    "border-emerald-600 bg-emerald-600 text-white hover:brightness-110",
  fantasma:
    "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]",
};

export function Boton({
  variante = "secundario",
  tamano = "normal",
  cargando = false,
  icono,
  children,
  className = "",
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  tamano?: "chico" | "normal" | "grande";
  cargando?: boolean;
  icono?: ReactNode;
}) {
  const medidas =
    tamano === "chico"
      ? "h-9 px-3 text-xs"
      : tamano === "grande"
      ? "h-13 px-6 py-4 text-sm"
      : "h-11 px-4 text-sm";

  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${medidas} ${CLASES_BOTON[variante]} ${className}`}
      {...resto}
    >
      {cargando ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        icono
      )}
      {children}
    </button>
  );
}

export type Tono = "azul" | "verde" | "ambar" | "rojo" | "gris" | "violeta";

const CLASES_TONO: Record<Tono, string> = {
  azul: "bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  verde: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  ambar: "bg-amber-500/15 text-amber-800 ring-amber-500/35 dark:text-amber-300",
  rojo: "bg-red-500/12 text-red-700 ring-red-500/30 dark:text-red-300",
  gris: "bg-slate-500/10 text-[var(--text-muted)] ring-slate-500/25",
  violeta: "bg-violet-500/12 text-violet-700 ring-violet-500/30 dark:text-violet-300",
};

export function Chip({
  tono = "gris",
  children,
  className = "",
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${CLASES_TONO[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

/* Color de cada estado (maquetas y tienda). */
export function tonoEstado(estado: string): Tono {
  switch (estado) {
    case "Recibido":
    case "Pendiente":
      return "ambar";
    case "Presupuestado":
    case "Método de pago seleccionado":
      return "violeta";
    case "Pago confirmado":
    case "En impresión":
      return "azul";
    case "Terminado":
    case "Listo":
      return "verde";
    case "Entregado":
      return "gris";
    case "❌❌❌":
      return "rojo";
    default:
      return "gris";
  }
}

export function textoEstado(estado: string) {
  return estado === "❌❌❌" ? "Cancelado" : estado || "Sin estado";
}

/* Filtros tipo pestañas, con desplazamiento horizontal en el celular. */
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; texto: string; cantidad?: number }[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1.5">
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => onCambiar(opcion.valor)}
              aria-pressed={activa}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition ${
                activa
                  ? "border-[#1f3f85] bg-[#1f3f85] text-white"
                  : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {opcion.texto}
              {typeof opcion.cantidad === "number" && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    activa ? "bg-white/20" : "bg-[var(--kint-panel-soft)]"
                  }`}
                >
                  {opcion.cantidad}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formularios                                                          */
/* ------------------------------------------------------------------ */

export const claseInput =
  "w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#1f3f85]/20 dark:[color-scheme:dark]";

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
        {etiqueta}
      </span>
      {children}
      {ayuda && (
        <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
          {ayuda}
        </span>
      )}
    </label>
  );
}

export function Interruptor({
  activo,
  onCambiar,
  deshabilitado,
  etiqueta,
}: {
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  deshabilitado?: boolean;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={() => onCambiar(!activo)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        activo ? "bg-emerald-500" : "bg-slate-400/40"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          activo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Estados de carga                                                     */
/* ------------------------------------------------------------------ */

export function Esqueleto({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, indice) => (
        <div
          key={indice}
          className="h-20 animate-pulse rounded-2xl bg-[var(--kint-panel-soft)]"
        />
      ))}
    </div>
  );
}

export function CajaError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar?: () => void;
}) {
  return (
    <Tarjeta className="flex flex-col items-center gap-3 p-6 text-center">
      <AlertTriangle className="text-red-600 dark:text-red-400" size={28} />
      <p className="text-sm font-semibold">{mensaje}</p>
      {onReintentar && (
        <Boton icono={<RefreshCw size={15} />} onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </Tarjeta>
  );
}

export function Vacio({
  titulo,
  texto,
  icono,
}: {
  titulo: string;
  texto?: string;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--kint-panel-border)] px-6 py-10 text-center">
      <span className="text-[var(--kint-blue-soft)]">
        {icono || <Inbox size={30} strokeWidth={1.5} />}
      </span>
      <p className="font-black">{titulo}</p>
      {texto && (
        <p className="max-w-xs text-sm text-[var(--text-muted)]">{texto}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hoja inferior (modal) y confirmación                                 */
/* ------------------------------------------------------------------ */

export function Hoja({
  abierta,
  onCerrar,
  titulo,
  children,
  pie,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    if (!abierta) return;

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }

    const desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = desbordeAnterior;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-main)] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--kint-panel-border)] px-5 py-4">
          <h2 className="text-base font-black">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {pie && (
          <div className="border-t border-[var(--kint-panel-border)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

export function DialogoConfirmar({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  peligro = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar?: string;
  peligro?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Hoja
      abierta={abierto}
      onCerrar={cargando ? () => {} : onCancelar}
      titulo={titulo}
      pie={
        <div className="grid grid-cols-2 gap-3">
          <Boton onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton
            variante={peligro ? "peligro" : "principal"}
            onClick={onConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Boton>
        </div>
      }
    >
      <div className="text-sm leading-6 text-[var(--text-muted)]">
        {mensaje}
      </div>
    </Hoja>
  );
}

/* ------------------------------------------------------------------ */
/* Avisos flotantes (toasts)                                           */
/* ------------------------------------------------------------------ */

type Aviso = { id: number; texto: string; tipo: "exito" | "error" };

const ContextoAvisos = createContext<
  (texto: string, tipo?: "exito" | "error") => void
>(() => {});

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(1);

  const mostrar = useCallback(
    (texto: string, tipo: "exito" | "error" = "exito") => {
      const id = siguiente.current++;
      setAvisos((actuales) => [...actuales, { id, texto, tipo }]);
      window.setTimeout(() => {
        setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
      }, tipo === "error" ? 6000 : 3200);
    },
    []
  );

  return (
    <ContextoAvisos.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[400] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
              aviso.tipo === "error" ? "bg-red-600" : "bg-[#0f1f3d]"
            }`}
          >
            {aviso.tipo === "error" ? (
              <AlertTriangle size={16} className="shrink-0" />
            ) : (
              <Check size={16} className="shrink-0 text-emerald-400" />
            )}
            {aviso.texto}
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export function useAvisos() {
  return useContext(ContextoAvisos);
}

/* ------------------------------------------------------------------ */
/* Contacto                                                             */
/* ------------------------------------------------------------------ */

/* Link de WhatsApp a partir de un número uruguayo cualquiera. */
export function linkWhatsapp(numero: string, texto = "") {
  let digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  if (!digitos.startsWith("598")) digitos = `598${digitos}`;
  return `https://wa.me/${digitos}${
    texto ? `?text=${encodeURIComponent(texto)}` : ""
  }`;
}
