"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  KeyRound,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FondoKintAnimado from "@/components/FondoKintAnimado";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarioEntrega from "@/components/CalendarioEntrega";

type Foto = {
  url: string;
  driveId: string;
};

type Producto = {
  nombre: string;
  precio: number;
  // 0 = sin precio por mayor.
  precioMayor: number;
  precioGranMayor: number;
  foto: string;
  fotoId: string;
  fotos: Foto[];
  cadenas: string[];
};

type Catalogo = {
  abierta: boolean;
  mensaje: string;
  senaPorcentaje: number;
  maxUnidades: number;
  // Desde cuántas unidades de un producto rige cada precio por mayor.
  mayorDesde: number;
  granMayorDesde: number;
  productos: Producto[];
};

type LineaCarrito = {
  producto: string;
  cadena: string;
  cantidad: number;
};

type LineaDetallada = LineaCarrito & {
  precio: number;
  precioLista: number;
  mayorista: boolean;
  subtotal: number;
  foto?: Foto;
};

type Modalidad = "Seña" | "Completo";

type CompraConfirmada = {
  pedido: string;
  nombre: string;
  email: string;
  alias: string;
  modalidad: Modalidad;
  total: number;
  montoPagado: number;
  saldoPendiente: number;
  lineas: LineaDetallada[];
  // true si la compra ya estaba registrada (reintento con el mismo idCompra).
  repetida: boolean;
};

const CLAVE_CARRITO = "kint-tienda-carrito-v1";

/*
 * El idCompra se guarda junto con el carrito: si la página se recarga
 * después de un corte, el reintento sigue siendo la misma compra.
 */
const CLAVE_ID_COMPRA = "kint-tienda-id-compra-v1";

function leerIdCompraGuardado() {
  try {
    const id = localStorage.getItem(CLAVE_ID_COMPRA) || "";
    return /^[a-f0-9]{32}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

function guardarIdCompra(id: string) {
  try {
    if (id) localStorage.setItem(CLAVE_ID_COMPRA, id);
    else localStorage.removeItem(CLAVE_ID_COMPRA);
  } catch {
    // Sin almacenamiento: el id dura solo esta visita.
  }
}
const WHATSAPP = "https://wa.me/59892023382";

/* Mismo tope que KINT_TIENDA_MAX_LINEAS en Apps Script. */
const MAX_LINEAS = 30;

const TEXTO_ENTREGA =
  "La entrega es gratis en FADU, de lunes a viernes de mañana. Si necesitás envío, lo coordinamos por WhatsApp y te avisamos el costo antes.";

const TEXTO_SALDO =
  "El saldo lo pagás por transferencia antes de la entrega. Te avisamos cuando tus llaveros estén listos.";

/*
 * Vercel corta los cuerpos de más de 4,5 MB:
 * las imágenes se achican antes de enviarlas
 * y los PDF tienen que pesar menos de 3 MB.
 */
const LIMITE_COMPROBANTE = 3 * 1024 * 1024;
const LIMITE_ARCHIVO_ORIGINAL = 25 * 1024 * 1024;
const COMPRIMIR_DESDE = 900 * 1024;
const LADO_MAXIMO_IMAGEN = 1800;

const EXTENSIONES_COMPROBANTE = /\.(jpe?g|png|webp|heic|pdf)$/i;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DATOS_BANCARIOS = [
  { etiqueta: "Banco", valor: "BBVA" },
  { etiqueta: "Tipo de cuenta", valor: "Cuenta corriente en pesos" },
  { etiqueta: "Titular", valor: "Alexander López" },
  { etiqueta: "Cuenta", valor: "26557312", copiable: true },
];

const PASOS = [
  "Elegí tus llaveros",
  "Transferí seña o total",
  "Subí el comprobante",
];

const CLASE_PANEL =
  "rounded-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] shadow-[var(--shadow-soft)]";

const CLASE_INPUT =
  "w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#87A4B5]/30";

const CLASE_ETIQUETA =
  "mb-1.5 block text-xs font-bold text-[var(--text-muted)]";

const CLASE_BOTON_PRINCIPAL =
  "border-[rgba(90,145,235,0.35)] bg-[#1f3f85] text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,63,133,0.35)]";

const CLASE_BOTON_INACTIVO =
  "cursor-not-allowed border-[#87A4B5]/50 bg-[#eef4f8] text-[#4C6C81] opacity-70 dark:border-[#4C6C81]/35 dark:bg-white/[0.02] dark:text-[#87A4B5] dark:opacity-45";

function pesos(valor: number) {
  return `$${valor.toLocaleString("es-UY", {
    maximumFractionDigits: 2,
  })}`;
}

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

function claveLinea(linea: {
  producto: string;
  cadena: string;
}) {
  return `${linea.producto}::${linea.cadena}`;
}

function urlFoto(foto?: Foto) {
  if (!foto) return "";

  return foto.driveId
    ? `/api/imagen-drive?id=${encodeURIComponent(foto.driveId)}`
    : foto.url;
}

function fotosDe(producto: Producto): Foto[] {
  if (producto.fotos?.length) return producto.fotos;

  return producto.foto
    ? [{ url: producto.foto, driveId: producto.fotoId }]
    : [];
}

function fechaHoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function tamanoLegible(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function leerCarritoGuardado(): unknown[] {
  try {
    const guardado = JSON.parse(
      localStorage.getItem(CLAVE_CARRITO) || "[]"
    );

    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarCarrito(lineas: LineaCarrito[]) {
  try {
    localStorage.setItem(
      CLAVE_CARRITO,
      JSON.stringify(lineas)
    );
  } catch {
    // Sin almacenamiento: el carrito dura solo esta visita.
  }
}

/*
 * Deja solo lo que sigue a la venta, con cadenas
 * válidas y cantidades dentro del límite.
 */
function ajustarCarrito(
  lineas: unknown[],
  catalogo: Catalogo
): LineaCarrito[] {
  const resultado: LineaCarrito[] = [];

  for (const entrada of lineas) {
    const linea = entrada as Partial<LineaCarrito> | null;

    const producto = catalogo.productos.find(
      (opcion) => opcion.nombre === linea?.producto
    );

    if (!producto) continue;

    const cadena = String(linea?.cadena || "");

    const cadenaValida = producto.cadenas.length
      ? producto.cadenas.includes(cadena)
      : cadena === "";

    const cantidad = Math.floor(Number(linea?.cantidad) || 0);

    if (!cadenaValida || cantidad < 1) continue;

    const existente = resultado.find(
      (otra) =>
        claveLinea(otra) ===
        claveLinea({ producto: producto.nombre, cadena })
    );

    if (existente) {
      existente.cantidad = Math.min(
        catalogo.maxUnidades,
        existente.cantidad + cantidad
      );
      continue;
    }

    resultado.push({
      producto: producto.nombre,
      cadena,
      cantidad: Math.min(catalogo.maxUnidades, cantidad),
    });
  }

  return resultado;
}

async function pedirCatalogo(): Promise<Catalogo> {
  const response = await fetch("/api/tienda/productos", {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || "No pudimos cargar la tienda."
    );
  }

  return {
    abierta: data.abierta !== false,
    mensaje: String(data.mensaje || ""),
    senaPorcentaje: Number(data.senaPorcentaje) || 20,
    maxUnidades: Number(data.maxUnidades) || 200,
    mayorDesde: Number(data.mayorDesde) || 10,
    granMayorDesde: Number(data.granMayorDesde) || 0,
    productos: Array.isArray(data.productos)
      ? (data.productos as Producto[]).map((producto) => ({
          ...producto,
          precioMayor: Number(producto.precioMayor) || 0,
          precioGranMayor: Number(producto.precioGranMayor) || 0,
        }))
      : [],
  };
}

/*
 * Mismo cálculo que kintTiendaPrecioUnitario_ (Apps Script):
 * el precio depende de cuántas unidades del producto se llevan,
 * sumando todas sus cadenas.
 */
function precioUnitario(
  producto: Producto,
  unidadesProducto: number,
  catalogo: Catalogo
) {
  if (
    catalogo.granMayorDesde &&
    producto.precioGranMayor > 0 &&
    unidadesProducto >= catalogo.granMayorDesde
  ) {
    return producto.precioGranMayor;
  }

  if (
    producto.precioMayor > 0 &&
    unidadesProducto >= catalogo.mayorDesde
  ) {
    return producto.precioMayor;
  }

  return producto.precio;
}

function leerBase64(archivo: Blob) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () =>
      resolve(String(lector.result).split(",")[1] || "");

    lector.onerror = () =>
      reject(new Error("No pudimos leer el comprobante."));

    lector.readAsDataURL(archivo);
  });
}

async function comprimirImagen(archivo: File) {
  const url = URL.createObjectURL(archivo);

  try {
    const imagen = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const elemento = new Image();
        elemento.onload = () => resolve(elemento);
        elemento.onerror = () =>
          reject(new Error("No se pudo abrir la imagen."));
        elemento.src = url;
      }
    );

    const escala = Math.min(
      1,
      LADO_MAXIMO_IMAGEN /
        Math.max(imagen.naturalWidth, imagen.naturalHeight)
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagen.naturalWidth * escala);
    canvas.height = Math.round(imagen.naturalHeight * escala);

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("No se pudo procesar la imagen.");
    }

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );

    if (!blob) {
      throw new Error("No se pudo procesar la imagen.");
    }

    return new File(
      [blob],
      `${archivo.name.replace(/\.[^.]+$/, "")}.jpg`,
      { type: "image/jpeg" }
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepararComprobante(archivo: File) {
  const esPdf = /\.pdf$/i.test(archivo.name);
  let final = archivo;

  if (!esPdf && archivo.size > COMPRIMIR_DESDE) {
    try {
      const comprimido = await comprimirImagen(archivo);
      if (comprimido.size < archivo.size) final = comprimido;
    } catch {
      // Formatos que el navegador no abre (por ejemplo HEIC):
      // se envían tal cual si entran en el límite.
    }
  }

  if (final.size > LIMITE_COMPROBANTE) {
    throw new Error(
      esPdf
        ? "El PDF pesa más de 3 MB. Probá con una captura de pantalla del comprobante."
        : "La imagen es muy pesada. Probá con una captura de pantalla en JPG o PNG."
    );
  }

  return {
    base64: await leerBase64(final),
    nombre: final.name,
  };
}

function SelectorCantidad({
  valor,
  maximo,
  etiqueta,
  onCambiar,
}: {
  valor: number;
  maximo: number;
  etiqueta: string;
  onCambiar: (valor: number) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)]">
      <button
        type="button"
        onClick={() => onCambiar(valor - 1)}
        disabled={valor <= 1}
        aria-label={`Restar una unidad de ${etiqueta}`}
        className="flex h-10 w-9 items-center justify-center rounded-l-xl text-[var(--text-muted)] transition hover:text-red-600 disabled:opacity-30"
      >
        <Minus size={15} strokeWidth={2.4} />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={maximo}
        value={valor}
        onChange={(evento) => {
          const numero = Math.floor(Number(evento.target.value));
          if (numero >= 1) onCambiar(Math.min(maximo, numero));
        }}
        aria-label={`Cantidad de ${etiqueta}`}
        className="w-10 bg-transparent text-center text-sm font-black tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => onCambiar(valor + 1)}
        disabled={valor >= maximo}
        aria-label={`Sumar una unidad de ${etiqueta}`}
        className="flex h-10 w-9 items-center justify-center rounded-r-xl text-[var(--text-muted)] transition hover:text-red-600 disabled:opacity-30"
      >
        <Plus size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;

    const temporizador = window.setTimeout(
      () => setCopiado(false),
      1600
    );

    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        } catch {
          // El navegador no permitió copiar: el dato sigue visible.
        }
      }}
      className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--kint-panel-border)] align-middle text-[var(--kint-info)] transition hover:border-[var(--kint-selected-border)]"
      aria-label={copiado ? "Copiado" : `Copiar ${texto}`}
    >
      {copiado ? (
        <Check size={14} strokeWidth={2.6} />
      ) : (
        <Copy size={13} strokeWidth={2.2} />
      )}
    </button>
  );
}

function TarjetaProducto({
  producto,
  maxUnidades,
  mayorDesde,
  enCarrito,
  deshabilitada,
  onAgregar,
}: {
  producto: Producto;
  maxUnidades: number;
  mayorDesde: number;
  enCarrito: number;
  deshabilitada: boolean;
  onAgregar: (cadena: string, cantidad: number) => void;
}) {
  const fotos = fotosDe(producto);

  const [cadena, setCadena] = useState(
    producto.cadenas[0] || ""
  );
  const [cantidad, setCantidad] = useState(1);
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [fotosRotas, setFotosRotas] = useState<number[]>([]);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!agregado) return;

    const temporizador = window.setTimeout(
      () => setAgregado(false),
      1600
    );

    return () => window.clearTimeout(temporizador);
  }, [agregado]);

  const cadenaElegida = producto.cadenas.includes(cadena)
    ? cadena
    : producto.cadenas[0] || "";

  const indice = Math.min(indiceFoto, Math.max(0, fotos.length - 1));
  const fotoActual = fotos[indice];
  const mostrarFoto = fotoActual && !fotosRotas.includes(indice);

  return (
    <article className={`${CLASE_PANEL} group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(37,67,93,0.18)]`}>
      <div className="relative aspect-square overflow-hidden bg-[var(--kint-panel-soft)]">
        {mostrarFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFoto(fotoActual)}
            alt={producto.nombre}
            loading="lazy"
            onError={() =>
              setFotosRotas((actuales) => [...actuales, indice])
            }
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[var(--kint-blue-soft)]">
            <KeyRound size={46} strokeWidth={1.3} />
            <span className="text-[10px] font-black uppercase tracking-[0.24em]">
              Foto en camino
            </span>
          </div>
        )}

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setIndiceFoto((indice - 1 + fotos.length) % fotos.length)
              }
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 backdrop-blur transition focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                setIndiceFoto((indice + 1) % fotos.length)
              }
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 backdrop-blur transition focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {fotos.map((foto, posicion) => (
                <button
                  key={`${foto.url}-${posicion}`}
                  type="button"
                  onClick={() => setIndiceFoto(posicion)}
                  aria-label={`Ver foto ${posicion + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    posicion === indice
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/55"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {fotos.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
            {indice + 1}/{fotos.length}
          </span>
        )}

        {enCarrito > 0 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-main)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
            <ShoppingBag size={12} strokeWidth={2.4} />
            {enCarrito} en el carrito
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-black leading-tight">
            {producto.nombre}
          </h3>

          <p className="shrink-0 text-lg font-black text-red-600">
            {pesos(producto.precio)}
          </p>
        </div>

        {/* Solo se anuncia el primer precio por mayor. */}
        {producto.precioMayor > 0 && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            Por mayor ({mayorDesde}+): {pesos(producto.precioMayor)} c/u
          </p>
        )}

        {producto.cadenas.length > 0 && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
              Cadena
            </legend>

            <div className="flex flex-wrap gap-2">
              {producto.cadenas.map((opcion) => {
                const elegida = opcion === cadenaElegida;

                return (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setCadena(opcion)}
                    aria-pressed={elegida}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      elegida
                        ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)] text-[var(--text-main)] ring-1 ring-[#4C6C81]/20"
                        : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-red-600/40"
                    }`}
                  >
                    {elegida && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="-ml-0.5 mr-1 inline align-[-1px]"
                      />
                    )}
                    {opcion}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-auto flex items-center gap-3 pt-5">
          <SelectorCantidad
            valor={cantidad}
            maximo={maxUnidades}
            etiqueta={producto.nombre}
            onCambiar={setCantidad}
          />

          <button
            type="button"
            disabled={deshabilitada}
            onClick={() => {
              onAgregar(cadenaElegida, cantidad);
              setAgregado(true);
              setCantidad(1);
            }}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
              deshabilitada ? CLASE_BOTON_INACTIVO : CLASE_BOTON_PRINCIPAL
            }`}
          >
            {agregado ? (
              <>
                <Check size={15} strokeWidth={2.8} />
                Agregado
              </>
            ) : (
              <>
                <ShoppingBag size={15} strokeWidth={2.2} />
                Agregar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function PasoCheckout({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 border-t border-[var(--kint-panel-border)] pt-6">
      <h3 className="mb-4 flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blue-main)] text-[11px] text-white">
          {numero}
        </span>
        {titulo}
      </h3>

      {children}
    </section>
  );
}

const PASOS_CHECKOUT = [
  "Tus datos",
  "Cómo pagás",
  "Transferí",
  "Comprobante",
];

const CLASE_BOTON_ATRAS =
  "border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400 dark:hover:text-white";

const TEXTO_CONEXION_DUDOSA =
  "Se cortó la conexión y no sabemos si la compra llegó. Tocá «Confirmar compra» de nuevo: si ya había entrado, te mostramos el mismo número de pedido y no se duplica.";

/* 0 = carrito; 1 a 4 = pasos de PASOS_CHECKOUT. */
type Paso = 0 | 1 | 2 | 3 | 4;

type ConsultaCliente = {
  email: string;
  existe: boolean;
  nombre: string;
  alias: string;
  bloqueado: boolean;
  error: string;
};

type VerificacionAlias = {
  clave: string;
  disponible: boolean;
  mensaje: string;
  fallo: boolean;
};

/*
 * Mismas consultas de cuenta que /cotizar
 * (consultar_cliente y verificar_alias).
 */
async function consultarCuenta(
  cuerpo: Record<string, string>,
  signal: AbortSignal
) {
  const response = await fetch("/api/pedidos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
    signal,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || "No pudimos comprobar tus datos."
    );
  }

  return data;
}

/*
 * Código único por intento de compra. Si se reintenta después de un
 * corte, Apps Script reconoce el código y no crea otro TND.
 * getRandomValues (y no randomUUID) funciona también por http en la red local.
 */
function nuevoIdCompra() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function esCancelacion(error: unknown) {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export default function TiendaPage() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");

  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [carritoListo, setCarritoListo] = useState(false);
  const [paso, setPaso] = useState<Paso>(0);

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [alias, setAlias] = useState("");
  const [consulta, setConsulta] =
    useState<ConsultaCliente | null>(null);
  const [verificacion, setVerificacion] =
    useState<VerificacionAlias | null>(null);
  const [reintento, setReintento] = useState(0);

  const [fechaEntrega, setFechaEntrega] = useState("");
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([]);
  const [comentario, setComentario] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad | "">("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [montoComprobante, setMontoComprobante] = useState(0);
  // Se conserva entre reintentos; se borra si cambia la compra.
  const [idCompra, setIdCompra] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [confirmada, setConfirmada] =
    useState<CompraConfirmada | null>(null);

  const [carritoEnPantalla, setCarritoEnPantalla] = useState(false);
  const [hoy] = useState(fechaHoyISO);

  const refCarrito = useRef<HTMLElement>(null);

  useEffect(() => {
    let activo = true;

    pedirCatalogo()
      .then((nuevo) => {
        if (!activo) return;
        setCatalogo(nuevo);
        setCarrito(ajustarCarrito(leerCarritoGuardado(), nuevo));
        setIdCompra(leerIdCompraGuardado());
        setCarritoListo(true);
      })
      .catch((errorCarga: unknown) => {
        if (!activo) return;
        setErrorCatalogo(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No pudimos cargar la tienda."
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (carritoListo) guardarCarrito(carrito);
  }, [carrito, carritoListo]);

  useEffect(() => {
    if (carritoListo) guardarIdCompra(idCompra);
  }, [idCompra, carritoListo]);

  useEffect(() => {
    const elemento = refCarrito.current;

    if (!elemento || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => setCarritoEnPantalla(entrada.isIntersecting),
      { threshold: 0.05 }
    );

    observador.observe(elemento);

    return () => observador.disconnect();
  }, [catalogo, confirmada]);

  const vistaPrevia = useMemo(
    () =>
      comprobante &&
      /\.(jpe?g|png|webp)$/i.test(comprobante.name)
        ? URL.createObjectURL(comprobante)
        : "",
    [comprobante]
  );

  useEffect(
    () => () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia]
  );

  /*
   * CUENTA KINT
   * Igual que /cotizar: con el correo se busca la cuenta.
   * Si existe, ya tenemos nombre y alias; si no, se crea
   * con la compra. Los resultados se guardan junto al
   * correo/alias consultado, así nunca se mezclan.
   */
  const emailLimpio = email.trim();
  const emailValido = EMAIL_VALIDO.test(emailLimpio);

  useEffect(() => {
    if (!emailValido) return;

    const controller = new AbortController();

    const temporizador = window.setTimeout(async () => {
      try {
        const data = await consultarCuenta(
          {
            tipo: "consultar_cliente",
            email: emailLimpio,
          },
          controller.signal
        );

        const aliasCuenta = String(data.alias || "").trim();

        setConsulta({
          email: emailLimpio,
          // Un cliente antiguo sin alias crea uno, como en /cotizar.
          existe: Boolean(data.existe) && Boolean(aliasCuenta),
          nombre: String(data.nombre || "").trim(),
          alias: aliasCuenta,
          // Igual que /cotizar: Apps Script rechazaría la compra al final.
          bloqueado: /^bloquead[oa]$/i.test(
            String(data.estado || "").trim()
          ),
          error: "",
        });
      } catch (errorConsulta: unknown) {
        if (esCancelacion(errorConsulta)) return;

        setConsulta({
          email: emailLimpio,
          existe: false,
          nombre: "",
          alias: "",
          bloqueado: false,
          error: "No pudimos comprobar tu correo.",
        });
      }
    }, 500);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [emailLimpio, emailValido, reintento]);

  // Los errores temporales se guardan: este botón los vuelve a consultar.
  function reintentarCuenta() {
    setConsulta(null);
    setVerificacion(null);
    setReintento((actual) => actual + 1);
  }

  const consultaActual =
    consulta && consulta.email === emailLimpio ? consulta : null;
  const consultandoCliente = emailValido && !consultaActual;
  const clienteExiste =
    consultaActual && !consultaActual.error
      ? consultaActual.existe
      : null;

  const aliasLimpio = alias.trim();
  const largoAlias = Array.from(aliasLimpio).length;
  const errorLargoAlias = !aliasLimpio
    ? ""
    : largoAlias < 3
    ? "El alias debe tener al menos 3 caracteres."
    : largoAlias > 20
    ? "El alias puede tener como máximo 20 caracteres."
    : "";

  const debeVerificarAlias =
    clienteExiste === false && Boolean(aliasLimpio) && !errorLargoAlias;
  const claveAlias = `${emailLimpio}|${aliasLimpio}`;

  useEffect(() => {
    if (!debeVerificarAlias) return;

    const controller = new AbortController();

    const temporizador = window.setTimeout(async () => {
      try {
        const data = await consultarCuenta(
          {
            tipo: "verificar_alias",
            email: emailLimpio,
            alias: aliasLimpio,
          },
          controller.signal
        );

        setVerificacion({
          clave: claveAlias,
          disponible: data.disponible === true,
          mensaje: String(data.mensaje || ""),
          fallo: false,
        });
      } catch (errorVerificacion: unknown) {
        if (esCancelacion(errorVerificacion)) return;

        setVerificacion({
          clave: claveAlias,
          disponible: false,
          mensaje: "No pudimos verificar el nombre de usuario.",
          fallo: true,
        });
      }
    }, 500);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [debeVerificarAlias, emailLimpio, aliasLimpio, claveAlias, reintento]);

  const verificacionActual =
    verificacion?.clave === claveAlias ? verificacion : null;
  const verificandoAlias = debeVerificarAlias && !verificacionActual;
  const aliasDisponible = errorLargoAlias
    ? false
    : verificacionActual
    ? verificacionActual.disponible
    : null;
  const mensajeAlias =
    errorLargoAlias || verificacionActual?.mensaje || "";

  // Un cliente con cuenta pero sin nombre cargado lo completa.
  const necesitaNombre =
    clienteExiste === false ||
    (clienteExiste === true && !consultaActual?.nombre);
  const nombreFinal =
    clienteExiste === true && consultaActual?.nombre
      ? consultaActual.nombre
      : nombre.trim();
  const aliasFinal =
    clienteExiste === true ? consultaActual?.alias || "" : aliasLimpio;

  const productosPorNombre = useMemo(
    () =>
      new Map(
        (catalogo?.productos || []).map((producto) => [
          producto.nombre,
          producto,
        ])
      ),
    [catalogo]
  );

  // Unidades por producto, sumando todas sus cadenas.
  const unidadesPorProducto = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const linea of carrito) {
      if (!productosPorNombre.has(linea.producto)) continue;
      mapa.set(
        linea.producto,
        (mapa.get(linea.producto) || 0) + linea.cantidad
      );
    }

    return mapa;
  }, [carrito, productosPorNombre]);

  const lineas = useMemo<LineaDetallada[]>(
    () =>
      catalogo
        ? carrito.flatMap((linea) => {
            const producto = productosPorNombre.get(linea.producto);
            if (!producto) return [];

            const precio = precioUnitario(
              producto,
              unidadesPorProducto.get(linea.producto) || 0,
              catalogo
            );

            return [
              {
                ...linea,
                precio,
                precioLista: producto.precio,
                mayorista: precio < producto.precio,
                subtotal: redondear(precio * linea.cantidad),
                foto: fotosDe(producto)[0],
              },
            ];
          })
        : [],
    [carrito, catalogo, productosPorNombre, unidadesPorProducto]
  );

  // Productos con precio por mayor a los que todavía les faltan unidades.
  const avisosMayor = catalogo
    ? Array.from(unidadesPorProducto.entries()).flatMap(
        ([nombreProducto, unidadesProducto]) => {
          const producto = productosPorNombre.get(nombreProducto);

          if (
            !producto ||
            !(producto.precioMayor > 0) ||
            unidadesProducto >= catalogo.mayorDesde
          ) {
            return [];
          }

          return [
            {
              producto: nombreProducto,
              faltan: catalogo.mayorDesde - unidadesProducto,
              precio: producto.precioMayor,
            },
          ];
        }
      )
    : [];

  const maxUnidades = catalogo?.maxUnidades || 20;
  const senaPorcentaje = catalogo?.senaPorcentaje || 20;
  const tiendaAbierta = catalogo?.abierta !== false;

  // Con la tienda en pausa o el carrito vacío se vuelve al carrito.
  const pasoVisible: Paso =
    tiendaAbierta && lineas.length ? paso : 0;

  const total = redondear(
    lineas.reduce((suma, linea) => suma + linea.subtotal, 0)
  );
  const ahorroMayor = redondear(
    lineas.reduce(
      (suma, linea) =>
        suma + (linea.precioLista - linea.precio) * linea.cantidad,
      0
    )
  );
  const unidades = lineas.reduce(
    (suma, linea) => suma + linea.cantidad,
    0
  );
  const montoSena = Math.round((total * senaPorcentaje) / 100);
  const montoAhora = modalidad === "Seña" ? montoSena : total;

  const faltaDatos = !emailValido
    ? "Escribí tu correo electrónico."
    : consultandoCliente
    ? "Buscando tu cuenta..."
    : consultaActual?.error
    ? consultaActual.error
    : consultaActual?.bloqueado
    ? "Este correo se encuentra bloqueado. Contactá a Kint 3D."
    : necesitaNombre && !nombre.trim()
    ? "Completá tu nombre."
    : clienteExiste === false && !aliasLimpio
    ? "Elegí tu nombre de usuario."
    : clienteExiste === false && verificandoAlias
    ? "Comprobando el nombre de usuario..."
    : clienteExiste === false && aliasDisponible !== true
    ? mensajeAlias || "Elegí otro nombre de usuario."
    : fechaEntrega && diasBloqueados.includes(fechaEntrega)
    ? "Ese día no hacemos entregas. Elegí otra fecha."
    : fechaEntrega && fechaEntrega < hoy
    ? "La fecha de entrega no puede ser anterior a hoy."
    : "";

  const faltaPago = !modalidad
    ? "Elegí si pagás seña o el total."
    : "";

  // El comprobante vale solo para el monto con el que se subió.
  const faltaComprobante = !comprobante
    ? "Subí el comprobante de la transferencia."
    : montoComprobante !== montoAhora
    ? `El monto a transferir cambió a ${pesos(montoAhora)}. Subí el comprobante de esa transferencia.`
    : "";

  const faltaPaso =
    pasoVisible === 1
      ? faltaDatos
      : pasoVisible === 2
      ? faltaPago
      : pasoVisible === 4
      ? faltaComprobante
      : "";

  const puedeConfirmar =
    pasoVisible === 4 &&
    !faltaDatos &&
    !faltaPago &&
    !faltaComprobante &&
    !enviando;

  function mostrarPanel() {
    const elemento = refCarrito.current;
    if (!elemento) return;

    // En escritorio el panel es fijo: se sube su propio scroll.
    if (window.matchMedia("(min-width: 1024px)").matches) {
      elemento.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function irAPaso(nuevo: Paso) {
    setError("");
    setPaso(nuevo);
    mostrarPanel();
  }

  /*
   * Si el carrito cambia en medio del checkout, se vuelve
   * al carrito para que el monto a transferir no quede viejo.
   */
  function cambiarCarrito(
    actualizar: (actual: LineaCarrito[]) => LineaCarrito[]
  ) {
    setCarrito(actualizar);
    setIdCompra("");
    if (paso > 0) setPaso(0);
  }

  async function recargarCatalogo() {
    setCargando(true);
    setErrorCatalogo("");

    try {
      const nuevo = await pedirCatalogo();
      setCatalogo(nuevo);
      // Precios o productos pudieron cambiar: se revisa el carrito.
      if (paso > 0) setPaso(0);
      // Si la primera carga falló, el carrito guardado todavía no se leyó.
      setCarrito((actual) =>
        ajustarCarrito(
          carritoListo ? actual : leerCarritoGuardado(),
          nuevo
        )
      );
      if (!carritoListo) setIdCompra(leerIdCompraGuardado());
      setCarritoListo(true);
    } catch (errorCarga: unknown) {
      setErrorCatalogo(
        errorCarga instanceof Error
          ? errorCarga.message
          : "No pudimos cargar la tienda."
      );
    } finally {
      setCargando(false);
    }
  }

  function agregarAlCarrito(
    producto: Producto,
    cadena: string,
    cantidad: number
  ) {
    if (enviando) return;

    const clave = claveLinea({ producto: producto.nombre, cadena });

    if (
      carrito.length >= MAX_LINEAS &&
      !carrito.some((linea) => claveLinea(linea) === clave)
    ) {
      setError(
        `Podés combinar hasta ${MAX_LINEAS} modelos y cadenas distintos por compra. Si necesitás más, hacé una segunda compra.`
      );
      return;
    }

    cambiarCarrito((actual) => {
      const existente = actual.find(
        (linea) => claveLinea(linea) === clave
      );

      if (existente) {
        return actual.map((linea) =>
          claveLinea(linea) === clave
            ? {
                ...linea,
                cantidad: Math.min(
                  maxUnidades,
                  linea.cantidad + cantidad
                ),
              }
            : linea
        );
      }

      return [
        ...actual,
        {
          producto: producto.nombre,
          cadena,
          cantidad: Math.min(maxUnidades, cantidad),
        },
      ];
    });

    setError("");
  }

  function cambiarCantidad(clave: string, cantidad: number) {
    if (enviando) return;

    cambiarCarrito((actual) =>
      actual.map((linea) =>
        claveLinea(linea) === clave
          ? {
              ...linea,
              cantidad: Math.max(1, Math.min(maxUnidades, cantidad)),
            }
          : linea
      )
    );
  }

  function quitarLinea(clave: string) {
    if (enviando) return;

    cambiarCarrito((actual) =>
      actual.filter((linea) => claveLinea(linea) !== clave)
    );
  }

  function elegirComprobante(archivo: File | undefined) {
    setError("");

    if (!archivo) return;

    if (!EXTENSIONES_COMPROBANTE.test(archivo.name)) {
      setError(
        "El comprobante tiene que ser una imagen (JPG, PNG, WEBP o HEIC) o un PDF."
      );
      return;
    }

    if (archivo.size > LIMITE_ARCHIVO_ORIGINAL) {
      setError("Ese archivo es demasiado pesado.");
      return;
    }

    if (/\.pdf$/i.test(archivo.name) && archivo.size > LIMITE_COMPROBANTE) {
      setError(
        "El PDF pesa más de 3 MB. Probá con una captura de pantalla del comprobante."
      );
      return;
    }

    // El id se conserva: subir otra vez el comprobante es la misma compra.
    setComprobante(archivo);
    setMontoComprobante(montoAhora);
  }

  async function confirmarCompra() {
    if (!puedeConfirmar || !comprobante || !modalidad) return;

    setEnviando(true);
    setError("");

    const id = idCompra || nuevoIdCompra();
    setIdCompra(id);

    try {
      const archivo = await prepararComprobante(comprobante);

      const response = await fetch("/api/tienda/pedido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombreFinal,
          email: emailLimpio,
          alias: aliasFinal,
          idCompra: id,
          comentario: comentario.trim(),
          fechaEntrega,
          modalidad,
          total,
          items: lineas.map((linea) => ({
            producto: linea.producto,
            cadena: linea.cadena,
            cantidad: linea.cantidad,
          })),
          archivoBase64: archivo.base64,
          archivoNombre: archivo.nombre,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!data) {
        throw new Error(TEXTO_CONEXION_DUDOSA);
      }

      // Un 500 puede llegar después de que Apps Script guardó la compra.
      if (response.status >= 500) {
        throw new Error(TEXTO_CONEXION_DUDOSA);
      }

      if (!response.ok || !data.ok) {
        const mensaje = String(
          data.error || "No pudimos confirmar la compra."
        );

        if (/precios|disponible|cadena|cerrad|pausa/i.test(mensaje)) {
          void recargarCatalogo();
        }

        throw new Error(mensaje);
      }

      setConfirmada({
        pedido: String(data.pedido),
        nombre: String(data.nombre || nombreFinal),
        email: String(data.email || emailLimpio),
        alias: String(data.alias || aliasFinal),
        modalidad:
          data.modalidad === "Seña" || data.modalidad === "Completo"
            ? data.modalidad
            : modalidad,
        repetida: data.repetida === true,
        total: Number(data.total) || total,
        montoPagado: Number(data.montoPagado) || montoAhora,
        saldoPendiente: Number(data.saldoPendiente) || 0,
        lineas,
      });

      setCarrito([]);
      setIdCompra("");
      setPaso(0);
      setModalidad("");
      setComprobante(null);
      setComentario("");
      setFechaEntrega("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (errorCompra: unknown) {
      setError(
        // TypeError = se cortó la conexión: la compra pudo haber entrado.
        errorCompra instanceof TypeError
          ? TEXTO_CONEXION_DUDOSA
          : errorCompra instanceof Error
          ? errorCompra.message
          : "No pudimos confirmar la compra."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (confirmada) {
    const primerNombre = confirmada.nombre.split(/\s+/)[0];

    return (
      <main className="min-h-screen px-4 pb-20 pt-24 text-[var(--text-main)] sm:px-6">
        <FondoOscuro />

        <div className="fixed right-6 top-6 z-50">
          <ThemeToggle />
        </div>

        <section className={`${CLASE_PANEL} mx-auto max-w-2xl p-7 text-center sm:p-10`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check size={32} strokeWidth={2.6} />
          </div>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-[var(--kint-info)]">
            Compra confirmada
          </p>

          <h1
            tabIndex={-1}
            ref={(titulo) => titulo?.focus()}
            className="mt-3 text-3xl font-black outline-none sm:text-4xl"
          >
            ¡Gracias, {primerNombre}!
          </h1>

          <p className="mt-5 text-sm text-[var(--text-muted)]">
            Tu número de pedido es
          </p>

          <p className="mt-1 text-4xl font-black tracking-[0.08em] text-red-600">
            {confirmada.pedido}
            <BotonCopiar texto={confirmada.pedido} />
          </p>

          {confirmada.repetida && (
            <p className="mx-auto mt-4 max-w-md rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
              Esta compra ya estaba registrada: no se duplicó. Estos son
              los datos con los que quedó guardada.
            </p>
          )}

          {confirmada.alias && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Quedó registrada en tu cuenta{" "}
              <strong className="text-[var(--text-main)]">
                {confirmada.alias}
              </strong>
            </p>
          )}

          <ul className="mx-auto mt-8 max-w-md divide-y divide-[var(--kint-panel-border)] rounded-2xl border border-[var(--kint-panel-border)] px-5 text-left">
            {confirmada.lineas.map((linea) => (
              <li
                key={claveLinea(linea)}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span>
                  <strong>
                    {linea.cantidad} × {linea.producto}
                  </strong>
                  {linea.cadena && (
                    <span className="block text-xs text-[var(--text-muted)]">
                      Cadena {linea.cadena}
                    </span>
                  )}
                </span>
                <span className="font-bold">
                  {pesos(linea.subtotal)}
                </span>
              </li>
            ))}

            <li className="flex justify-between gap-4 py-3 text-sm font-black">
              <span>Total</span>
              <span>{pesos(confirmada.total)}</span>
            </li>

            <li className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {confirmada.modalidad === "Seña"
                  ? `Seña ${senaPorcentaje}% transferida`
                  : "Pago total transferido"}
              </span>
              <span className="font-bold">
                {pesos(confirmada.montoPagado)}
              </span>
            </li>

            {confirmada.saldoPendiente > 0 && (
              <li className="flex justify-between gap-4 py-3 text-sm">
                <span>Saldo pendiente</span>
                <span className="font-bold">
                  {pesos(confirmada.saldoPendiente)}
                </span>
              </li>
            )}
          </ul>

          <div className="mx-auto mt-8 max-w-md space-y-3 text-left text-sm leading-6 text-[var(--text-muted)]">
            <p>
              Te vamos a mandar la confirmación a{" "}
              <strong className="text-[var(--text-main)]">
                {confirmada.email}
              </strong>
              . Si no te llega en unos minutos, revisá spam o escribinos
              por WhatsApp con tu número de pedido.
            </p>

            {confirmada.saldoPendiente > 0 && <p>{TEXTO_SALDO}</p>}

            <p className="flex gap-2">
              <MapPin
                size={16}
                className="mt-1 shrink-0 text-[var(--blue-main)]"
              />
              {TEXTO_ENTREGA}
            </p>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirmada(null)}
              className={`rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-[0.22em] transition-all ${CLASE_BOTON_PRINCIPAL}`}
            >
              Seguir comprando
            </button>

            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--kint-panel-border)] px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-[var(--text-main)] transition hover:border-[var(--kint-selected-border)]"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>

            <Link
              href="/"
              className="rounded-2xl border border-[var(--kint-panel-border)] px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-[var(--text-main)] transition hover:border-[var(--kint-selected-border)]"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32 text-[var(--text-main)] lg:pb-16 lg:pr-[420px]">
      <FondoOscuro />

      <div className="fixed right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      {/*
        * MenuNavegacion deja un espacio de h-28 / sm:h-32 arriba.
        * El margen negativo sube el fondo hasta el borde superior
        * y el padding mantiene el texto donde estaba.
        */}
      <section className="relative isolate -mt-28 overflow-hidden px-4 pb-16 pt-52 sm:-mt-32 sm:px-6 sm:pt-56">
        {/*
          * La máscara desvanece el fondo animado hacia transparente,
          * así se funde con FondoOscuro sin dejar un corte.
          */}
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
          <FondoKintAnimado />
        </div>

        <header className="relative z-20 mx-auto max-w-5xl">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--blue-main)]">
            Tienda Kint 3D
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] sm:text-5xl">
            Llaveros impresos en{" "}
            <span className="text-[var(--blue-main)]">3D</span>
          </h1>

          <div className="mt-5 flex items-center" aria-hidden="true">
            <div className="h-[4px] w-[110px] rounded-full bg-[var(--blue-main)]" />
            <div className="h-[4px] w-[120px] rounded-full bg-[var(--blue-soft)]" />
            <div className="h-3 w-3 rounded-full bg-[var(--blue-soft)]" />
          </div>

          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
            Elegí tu modelo y la cadena que más te guste. Pagás por
            transferencia, subís el comprobante y te llega la
            confirmación al correo.
          </p>

          <ol className="mt-6 flex flex-wrap gap-2">
            {PASOS.map((pasoTexto, posicion) => (
              <li
                key={pasoTexto}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] py-1.5 pl-1.5 pr-3.5 text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue-main)] text-[10px] text-white">
                  {posicion + 1}
                </span>
                {pasoTexto}
              </li>
            ))}
          </ol>

          <p className="mt-5 flex max-w-xl gap-2 text-sm leading-6 text-[var(--text-main)]">
            <MapPin
              size={17}
              className="mt-0.5 shrink-0 text-[var(--blue-main)]"
            />
            {TEXTO_ENTREGA}
          </p>
        </header>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        {!catalogo && cargando && (
          <div
            role="status"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3"
            aria-label="Cargando productos"
          >
            {Array.from({ length: 6 }, (_, posicion) => (
              <div
                key={posicion}
                className={`${CLASE_PANEL} overflow-hidden`}
              >
                <div className="aspect-square animate-pulse bg-[var(--kint-panel-soft)]" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--kint-panel-soft)]" />
                  <div className="h-10 animate-pulse rounded-xl bg-[var(--kint-panel-soft)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!catalogo && !cargando && errorCatalogo && (
          <div className={`${CLASE_PANEL} mx-auto max-w-lg p-8 text-center`}>
            <p className="font-black">No pudimos abrir la tienda</p>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {errorCatalogo}
            </p>

            <button
              type="button"
              onClick={recargarCatalogo}
              className={`mt-6 inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${CLASE_BOTON_PRINCIPAL}`}
            >
              <RefreshCw size={15} />
              Reintentar
            </button>
          </div>
        )}

        {catalogo && !tiendaAbierta && (
          <div className="mb-8 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5">
            <p className="font-black">La tienda está en pausa</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {catalogo.mensaje}
            </p>
          </div>
        )}

        {catalogo && (
          <section aria-label="Productos">
            {catalogo.productos.length === 0 ? (
              <div className={`${CLASE_PANEL} p-10 text-center`}>
                <KeyRound
                  size={40}
                  strokeWidth={1.4}
                  className="mx-auto text-[var(--kint-blue-soft)]"
                />
                <p className="mt-4 font-black">
                  Estamos preparando los primeros modelos
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Volvé pronto para verlos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {catalogo.productos.map((producto) => (
                  <TarjetaProducto
                    key={producto.nombre}
                    producto={producto}
                    maxUnidades={maxUnidades}
                    mayorDesde={catalogo.mayorDesde}
                    deshabilitada={!tiendaAbierta || enviando}
                    enCarrito={lineas
                      .filter(
                        (linea) => linea.producto === producto.nombre
                      )
                      .reduce(
                        (suma, linea) => suma + linea.cantidad,
                        0
                      )}
                    onAgregar={(cadena, cantidad) =>
                      agregarAlCarrito(producto, cadena, cantidad)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {catalogo && (
        <aside
          id="carrito"
          ref={refCarrito}
          aria-label="Carrito y compra"
          className="mx-4 mt-10 scroll-mt-24 sm:mx-6 lg:fixed lg:inset-y-0 lg:right-0 lg:z-40 lg:m-0 lg:w-[420px] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-[var(--kint-panel-border)] lg:bg-[var(--kint-panel)] lg:px-7 lg:pb-10 lg:pt-24 lg:shadow-[-24px_0_60px_rgba(0,0,0,0.12)]"
        >
          <div className={`${CLASE_PANEL} p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <ShoppingBag size={20} strokeWidth={2} />
                {pasoVisible === 0 ? "Tu carrito" : "Tu compra"}
              </h2>

              {unidades > 0 && (
                <span className="rounded-full bg-[var(--blue-main)] px-2.5 py-1 text-[11px] font-black text-white">
                  {unidades} {unidades === 1 ? "llavero" : "llaveros"}
                </span>
              )}
            </div>

            {pasoVisible > 0 && (
              <ol
                className="mt-5 grid grid-cols-4 gap-1.5"
                aria-label="Pasos de la compra"
              >
                {PASOS_CHECKOUT.map((titulo, posicion) => {
                  const numero = posicion + 1;
                  const actual = numero === pasoVisible;

                  return (
                    <li
                      key={titulo}
                      aria-current={actual ? "step" : undefined}
                    >
                      <div
                        className={`h-1 rounded-full ${
                          numero <= pasoVisible
                            ? "bg-[var(--blue-main)]"
                            : "bg-[var(--kint-panel-border)]"
                        }`}
                      />
                      <p
                        className={`mt-1.5 text-[9px] font-black uppercase leading-3 tracking-[0.1em] ${
                          actual
                            ? "text-[var(--text-main)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {titulo}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Fuera de los pasos: si el carrito cambia, el error sigue a la vista. */}
            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-600/50 bg-red-600/10 p-3 text-sm font-semibold text-red-700 dark:text-red-400"
              >
                <p>{error}</p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] underline-offset-4 hover:underline"
                >
                  <MessageCircle size={14} />
                  Escribinos por WhatsApp
                </a>
              </div>
            )}

            {lineas.length === 0 && (
              <p className="mt-5 rounded-2xl border border-dashed border-[var(--kint-panel-border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                Todavía no agregaste llaveros.
              </p>
            )}

            {pasoVisible === 0 && lineas.length > 0 && (
              <>
                <ul className="mt-5 divide-y divide-[var(--kint-panel-border)]">
                  {lineas.map((linea) => {
                    const clave = claveLinea(linea);

                    return (
                      <li
                        key={clave}
                        className="flex gap-3 py-4 first:pt-0"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--kint-panel-soft)]">
                          {linea.foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={urlFoto(linea.foto)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--kint-blue-soft)]">
                              <KeyRound size={22} strokeWidth={1.5} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">
                                {linea.producto}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {linea.cadena
                                  ? `Cadena ${linea.cadena} · `
                                  : ""}
                                {linea.mayorista && (
                                  <s className="mr-1 opacity-60">
                                    {pesos(linea.precioLista)}
                                  </s>
                                )}
                                {pesos(linea.precio)} c/u
                              </p>
                              {linea.mayorista && (
                                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                                  Precio por mayor
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => quitarLinea(clave)}
                              aria-label={`Quitar ${linea.producto} del carrito`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-600/10 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <SelectorCantidad
                              valor={linea.cantidad}
                              maximo={maxUnidades}
                              etiqueta={linea.producto}
                              onCambiar={(cantidad) =>
                                cambiarCantidad(clave, cantidad)
                              }
                            />

                            <span className="text-sm font-black">
                              {pesos(linea.subtotal)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {avisosMayor.length > 0 && (
                  <ul className="mb-4 space-y-2">
                    {avisosMayor.map((aviso) => (
                      <li
                        key={aviso.producto}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-300"
                      >
                        Sumá <strong>{aviso.faltan}</strong>{" "}
                        {aviso.faltan === 1 ? "unidad" : "unidades"} más de{" "}
                        <strong>{aviso.producto}</strong> y pagás{" "}
                        <strong>{pesos(aviso.precio)} c/u</strong> (precio
                        por mayor). Podés combinar cadenas.
                      </li>
                    ))}
                  </ul>
                )}

                {ahorroMayor > 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Ahorro por mayor</span>
                    <span>-{pesos(ahorroMayor)}</span>
                  </div>
                )}

                <div className="mt-2 flex items-end justify-between border-t border-[var(--kint-panel-border)] pt-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Total
                  </span>
                  <span className="text-3xl font-black text-red-600 dark:text-red-500">
                    {pesos(total)}
                  </span>
                </div>

                {tiendaAbierta ? (
                  <button
                    type="button"
                    onClick={() => irAPaso(1)}
                    className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-[0.22em] transition-all ${CLASE_BOTON_PRINCIPAL}`}
                  >
                    Continuar con la compra
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <p className="mt-6 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm leading-6">
                    La tienda está en pausa. Tu carrito queda guardado
                    para cuando volvamos a abrir.
                  </p>
                )}
              </>
            )}

            {pasoVisible > 0 && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--kint-panel-border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-black">
                    Total{" "}
                    <span className="text-red-600 dark:text-red-500">
                      {pesos(total)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {lineas
                      .map(
                        (linea) =>
                          `${linea.cantidad} × ${linea.producto}`
                      )
                      .join(", ")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => irAPaso(0)}
                  disabled={enviando}
                  className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[var(--blue-main)] underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Editar
                </button>
              </div>
            )}

            {pasoVisible === 1 && (
              <PasoCheckout numero={1} titulo="Tus datos">
                <div className="space-y-4">
                  <label className="block">
                    <span className={CLASE_ETIQUETA}>
                      Correo electrónico
                    </span>
                    <span className="mb-2 block text-[11px] leading-4 text-[var(--text-muted)]">
                      Con tu correo buscamos tu cuenta Kint y te
                      mandamos la confirmación.
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(evento) =>
                        setEmail(evento.target.value)
                      }
                      autoComplete="email"
                      maxLength={160}
                      className={CLASE_INPUT}
                    />
                  </label>

                  {consultandoCliente && (
                    <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <LoaderCircle size={14} className="animate-spin" />
                      Buscando tu cuenta...
                    </p>
                  )}

                  {(consultaActual?.error || consultaActual?.bloqueado) && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      {consultaActual.error ||
                        "Este correo se encuentra bloqueado. Contactá a Kint 3D."}
                      {consultaActual.error && (
                        <BotonReintentar onClick={reintentarCuenta} />
                      )}
                    </p>
                  )}

                  {clienteExiste === true && !consultaActual?.bloqueado && (
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-4 py-3">
                      <UserRound
                        size={22}
                        className="shrink-0 text-[var(--blue-main)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-black">
                          ¡Hola, {consultaActual?.nombre || aliasFinal}!
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {aliasFinal} · La compra queda en tu cuenta.
                        </p>
                      </div>
                    </div>
                  )}

                  {necesitaNombre && (
                    <label className="block">
                      <span className={CLASE_ETIQUETA}>
                        Nombre y apellido
                      </span>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(evento) =>
                          setNombre(evento.target.value)
                        }
                        autoComplete="name"
                        maxLength={120}
                        className={CLASE_INPUT}
                      />
                    </label>
                  )}

                  {clienteExiste === false && (
                    <label className="block">
                      <span className={CLASE_ETIQUETA}>
                        Nombre de usuario público
                      </span>
                      <span className="mb-2 block text-[11px] leading-4 text-[var(--text-muted)]">
                        Es tu cuenta Kint: queda asociada a tu correo
                        para tus próximos pedidos y compras.
                      </span>
                      <input
                        type="text"
                        value={alias}
                        onChange={(evento) =>
                          setAlias(evento.target.value)
                        }
                        autoComplete="username"
                        maxLength={20}
                        className={CLASE_INPUT}
                      />
                      {(verificandoAlias || mensajeAlias) && (
                        <span
                          className={`mt-1.5 block text-xs font-semibold ${
                            verificandoAlias
                              ? "text-[var(--text-muted)]"
                              : aliasDisponible
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600"
                          }`}
                        >
                          {verificandoAlias
                            ? "Comprobando..."
                            : mensajeAlias}
                          {verificacionActual?.fallo && (
                            <BotonReintentar onClick={reintentarCuenta} />
                          )}
                        </span>
                      )}
                    </label>
                  )}

                  <div>
                    <span className={CLASE_ETIQUETA}>
                      Fecha de entrega (opcional)
                    </span>
                    <span className="mb-2 block text-[11px] leading-4 text-[var(--text-muted)]">
                      Indicá para cuándo los necesitás. Si no tenés
                      una fecha exacta, podés dejar este campo vacío.
                    </span>
                    <CalendarioEntrega
                      valor={fechaEntrega}
                      onCambiar={setFechaEntrega}
                      onBloqueados={setDiasBloqueados}
                    />
                  </div>

                  <label className="block">
                    <span className={CLASE_ETIQUETA}>
                      Comentario (opcional)
                    </span>
                    <textarea
                      value={comentario}
                      onChange={(evento) =>
                        setComentario(evento.target.value)
                      }
                      placeholder="Si es para regalo, un detalle que quieras contarnos..."
                      rows={3}
                      maxLength={1000}
                      className={`${CLASE_INPUT} resize-none`}
                    />
                  </label>
                </div>
              </PasoCheckout>
            )}

            {pasoVisible === 2 && (
              <PasoCheckout numero={2} titulo="Cómo pagás">
                <div className="grid grid-cols-2 gap-3">
                  {(["Seña", "Completo"] as Modalidad[]).map((opcion) => {
                    const esSena = opcion === "Seña";
                    const importe = esSena ? montoSena : total;
                    const elegida = modalidad === opcion;

                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setModalidad(opcion)}
                        aria-pressed={elegida}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          elegida
                            ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)] ring-1 ring-[#4C6C81]/20"
                            : "border-[var(--kint-panel-border)] hover:-translate-y-0.5 hover:border-red-600/40"
                        }`}
                      >
                        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--kint-info)]">
                          {esSena ? `Seña ${senaPorcentaje}%` : "Pago total"}
                        </span>
                        <span className="mt-2 block text-xl font-black">
                          {pesos(importe)}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                          {esSena
                            ? `Saldo pendiente ${pesos(total - importe)}`
                            : "Sin saldo pendiente"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PasoCheckout>
            )}

            {pasoVisible === 3 && (
              <PasoCheckout numero={3} titulo="Transferí">
                {/* Mismos datos y formato que /seguimiento. */}
                <div className="rounded-2xl border border-[var(--border-color)] p-5">
                  <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    Datos bancarios
                  </p>

                  <p className="text-sm leading-7">
                    {DATOS_BANCARIOS.map((dato) => (
                      <span key={dato.etiqueta} className="block">
                        {dato.etiqueta}: {dato.valor}
                        {dato.copiable && (
                          <BotonCopiar texto={dato.valor} />
                        )}
                      </span>
                    ))}
                    <span className="block break-words">
                      Concepto: Tienda - {aliasFinal || nombreFinal}
                    </span>
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border-2 border-red-600 bg-red-50 px-5 py-5 text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                    {modalidad === "Seña"
                      ? "Seña a transferir"
                      : "Total a transferir"}
                  </p>
                  <p className="mt-2 text-4xl font-black text-red-600">
                    {pesos(montoAhora)}
                  </p>

                  {modalidad === "Seña" && (
                    <div className="mt-4 border-t border-red-200 pt-3 text-xs leading-5 dark:border-red-900">
                      <p className="font-bold">
                        Saldo pendiente: {pesos(total - montoSena)}
                      </p>
                      <p className="mt-1">{TEXTO_SALDO}</p>
                    </div>
                  )}
                </div>
              </PasoCheckout>
            )}

            {pasoVisible === 4 && (
              <PasoCheckout numero={4} titulo="Comprobante">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--kint-panel-border)] px-4 py-6 text-center transition focus-within:ring-2 focus-within:ring-[var(--blue-main)]/40 hover:border-[var(--kint-selected-border)] hover:bg-[var(--kint-selected-bg)]">
                  <Upload size={22} className="text-[var(--kint-info)]" />
                  <span className="text-sm font-bold">
                    {comprobante
                      ? "Cambiar comprobante"
                      : "Subir comprobante"}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Captura o PDF de la transferencia de{" "}
                    {pesos(montoAhora)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-80">
                    JPG, PNG, WEBP, HEIC o PDF (hasta 3 MB)
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                    className="sr-only"
                    onChange={(evento) => {
                      elegirComprobante(evento.target.files?.[0]);
                      evento.target.value = "";
                    }}
                  />
                </label>

                {comprobante && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--kint-panel-border)] p-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--kint-panel-soft)] text-[var(--kint-info)]">
                      {vistaPrevia ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vistaPrevia}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {comprobante.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {tamanoLegible(comprobante.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setComprobante(null)}
                      aria-label="Quitar comprobante"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-600/10 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </PasoCheckout>
            )}

            {pasoVisible > 0 && (
              <>
                <div className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <button
                    type="button"
                    onClick={() => irAPaso((pasoVisible - 1) as Paso)}
                    disabled={enviando}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border px-5 py-4 text-xs font-black uppercase tracking-[0.18em] transition disabled:opacity-50 ${CLASE_BOTON_ATRAS}`}
                  >
                    <ArrowLeft size={15} />
                    Atrás
                  </button>

                  {pasoVisible < 4 ? (
                    <button
                      type="button"
                      onClick={() => irAPaso((pasoVisible + 1) as Paso)}
                      disabled={Boolean(faltaPaso)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                        faltaPaso
                          ? CLASE_BOTON_INACTIVO
                          : CLASE_BOTON_PRINCIPAL
                      }`}
                    >
                      {pasoVisible === 3 ? "Ya transferí" : "Siguiente"}
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={confirmarCompra}
                      disabled={!puedeConfirmar}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                        puedeConfirmar
                          ? CLASE_BOTON_PRINCIPAL
                          : CLASE_BOTON_INACTIVO
                      }`}
                    >
                      {enviando ? (
                        <>
                          <LoaderCircle
                            size={16}
                            className="animate-spin"
                          />
                          Confirmando...
                        </>
                      ) : (
                        "Confirmar compra"
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-3 text-center text-[11px] leading-5 text-[var(--text-muted)]">
                  {faltaPaso ||
                    (pasoVisible === 4
                      ? "Revisamos el comprobante y te escribimos para coordinar la entrega."
                      : "")}
                </p>
              </>
            )}
          </div>
        </aside>
      )}

      {catalogo && lineas.length > 0 && !carritoEnPantalla && (
        <button
          type="button"
          onClick={mostrarPanel}
          className={`fixed inset-x-4 bottom-4 z-[150] flex items-center justify-between rounded-2xl border px-5 py-4 lg:hidden ${CLASE_BOTON_PRINCIPAL}`}
        >
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
            <ShoppingBag size={18} />
            {pasoVisible === 0 ? "Ver carrito" : "Seguir compra"} ·{" "}
            {unidades}
          </span>
          <span className="text-base font-black">{pesos(total)}</span>
        </button>
      )}
    </main>
  );
}

/*
 * Brillo azul tenue detrás de toda la página en modo oscuro,
 * para que no quede un negro plano debajo del encabezado.
 */
function BotonReintentar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 inline-flex items-center gap-1 font-black uppercase tracking-[0.12em] underline-offset-4 hover:underline"
    >
      <RefreshCw size={12} />
      Reintentar
    </button>
  );
}

function FondoOscuro() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 hidden bg-[radial-gradient(70%_55%_at_25%_35%,rgba(31,63,133,0.22),transparent_70%),radial-gradient(45%_45%_at_85%_85%,rgba(47,127,208,0.12),transparent_70%)] dark:block"
    />
  );
}
