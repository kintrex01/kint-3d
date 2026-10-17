"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  KeyRound,
  LoaderCircle,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  PackageSearch,
  Palette,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Upload,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Star,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import FondoKintAnimado from "@/components/FondoKintAnimado";
import { leerMascota, leerPersonalizacion, textoVisible } from "@/lib/llavero/personalizacion";
import { fotoFilamento } from "@/lib/colores-filamento";
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
  // Todos los colores que se pueden elegir (vacío = no se elige color).
  colores: string[];
  // Los de las fotos: se compran esos si el cliente no los cambia.
  coloresDefecto: string[];
  minColores: number;
  maxColores: number;
  resenas: ResenaProducto[];
  // "Entero, Mordido, Con relleno": si hay, el cliente tiene que elegir una.
  variantes: string[];
  // Texto corto del panel ("Incluye 2 llaveros: casco y portaplanos").
  descripcion: string;
  // "Llavero", "Clicker", "Combo": se filtra por estas.
  etiquetas: string[];
  // El cliente escribe el nombre y lo arma en 3D (components/llavero).
  personalizable: boolean;
  // "Mascota" = chapita con teléfono atrás; si no, llavero con nombre.
  tipoPersonalizado: "Llavero" | "Mascota" | "";
  // Para ordenar: posición en la hoja (más alto = más nuevo) y unidades vendidas.
  orden: number;
  vendidos: number;
};

type ResenaProducto = {
  nombre: string;
  estrellas: number;
  comentario: string;
  fecha: string; // yyyy-mm-dd
};

type Catalogo = {
  abierta: boolean;
  mensaje: string;
  senaPorcentaje: number;
  maxUnidades: number;
  // Desde cuántas unidades de un producto rige cada precio por mayor.
  mayorDesde: number;
  granMayorDesde: number;
  // Desplegable "Colores" de la hoja Tienda: para productos sin colores propios.
  coloresGlobales: string[];
  productos: Producto[];
};

type LineaCarrito = {
  producto: string;
  // Variante elegida ("" si el producto no tiene).
  variante: string;
  cadena: string;
  // Los elegidos o, si no tocó nada, los de las fotos.
  colores: string[];
  comentario: string;
  cantidad: number;
};

type OpcionesLinea = {
  variante: string;
  cadena: string;
  colores: string[];
  comentario: string;
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

const Personalizador = dynamic(() => import("@/components/llavero/Personalizador"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 text-sm font-bold text-white backdrop-blur-sm">
      Cargando el personalizador…
    </div>
  ),
});

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

/* Mismo tope que kintTiendaArmarLineas_ (Apps Script). */
const MAX_COMENTARIO_PIEZA = 300;

/* Cuánto se agranda la foto en el visor. */
const ZOOM_VISOR = 2.5;

const TEXTO_ENTREGA =
  "La entrega es gratis en FADU, de lunes a viernes de mañana. Si necesitás envío, lo coordinamos por WhatsApp y te avisamos el costo antes.";

const TEXTO_SALDO =
  "El saldo lo pagás por transferencia antes de la entrega. Te avisamos cuando tu pedido esté listo.";

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
  "Elegí tus productos",
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
  "border-[rgba(90,145,235,0.35)] bg-[var(--acento)] text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,63,133,0.35)]";

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

/*
 * Mismo modelo + misma cadena + mismos colores + mismo comentario
 * = una sola línea (igual que la agrupación de Apps Script).
 */
function claveLinea(linea: {
  producto: string;
  variante?: string;
  cadena: string;
  colores?: string[];
  comentario?: string;
}) {
  return JSON.stringify([
    linea.producto,
    linea.variante || "",
    linea.cadena,
    linea.colores || [],
    linea.comentario || "",
  ]);
}

/* "Colores Rojo + Negro · Cadena Plateada · “comentario”" para mostrar una línea. */
function detalleLinea(linea: {
  variante?: string;
  cadena: string;
  colores?: string[];
  comentario?: string;
}) {
  const colores = linea.colores || [];
  const mascota = leerMascota(linea.comentario || "");
  if (mascota) {
    return [
      `“${mascota.texto}” · tel. ${mascota.telefono}`,
      `${mascota.forma} · ${mascota.fuente} · ${mascota.tamano}${mascota.huella ? " · con huellita" : ""}`,
      colores.length >= 2 ? `Chapita ${colores[0]}, borde y nombre ${colores[1]}` : "",
      mascota.atras === "Color" && colores[2] ? `teléfono ${colores[2]}` : "",
      linea.cadena ? `Cadena ${linea.cadena}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const personalizado = leerPersonalizacion(linea.comentario || "");

  if (personalizado) {
    return [
      `“${textoVisible(personalizado)}”`,
      `${personalizado.fuente} · ${personalizado.tamano} · ${personalizado.fondo || "Contorno"}`,
      personalizado.fondo === "Solo letras"
        ? `Color ${colores[1] || colores[0] || ""}`
        : colores.length === 2
        ? `${personalizado.fondo === "Placa" ? "Placa" : "Borde"} ${colores[0]}, letras ${colores[1]}`
        : "",
      linea.cadena ? `Cadena ${linea.cadena}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    linea.variante || "",
    colores.length
      ? `${colores.length > 1 ? "Colores" : "Color"} ${colores.join(" + ")}`
      : "",
    linea.cadena ? `Cadena ${linea.cadena}` : "",
    linea.comentario ? `“${linea.comentario}”` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/*
 * Muestra de color para los nombres más comunes ("Azul", "Rojo mate"...).
 * Si el nombre no se reconoce, el chip va sin muestra.
 */
const MUESTRAS_COLOR: Record<string, string> = {
  rojo: "#dc2626",
  bordo: "#7f1d1d",
  negro: "#111111",
  blanco: "#ffffff",
  gris: "#9ca3af",
  "gris claro": "#d1d5db",
  // Filamento translúcido: brillo en vez de un color plano.
  cristal: "linear-gradient(135deg,#ffffff 0%,#dbeafe 45%,#f8fafc 55%,#bfdbfe 100%)",
  arena: "#d6c3a0",
  "verde aguamarina": "#2dd4bf",
  plateado: "#c0c4c8",
  // Cadenas: brillo metálico.
  plateada: "linear-gradient(135deg,#f4f5f7 0%,#a9afb6 55%,#e6e8eb 100%)",
  dorada: "linear-gradient(135deg,#fdeaa0 0%,#c9971c 55%,#f6d77a 100%)",
  plata: "#c0c4c8",
  dorado: "#d4a62a",
  oro: "#d4a62a",
  azul: "#2563eb",
  "azul marino": "#1e3a8a",
  celeste: "#7dd3fc",
  turquesa: "#14b8a6",
  verde: "#16a34a",
  "verde agua": "#5eead4",
  amarillo: "#facc15",
  naranja: "#f97316",
  rosa: "#f472b6",
  rosado: "#f472b6",
  fucsia: "#d946ef",
  violeta: "#8b5cf6",
  lila: "#c4b5fd",
  morado: "#7e22ce",
  marron: "#8b5a2b",
  beige: "#e8d8b8",
  crema: "#f5ecd7",
};

/* Para pintar un círculo de color: la foto real del filamento si la hay. */
function fondoColor(nombre: string, porDefecto = "") {
  const foto = fotoFilamento(nombre);
  if (foto) return `center / cover no-repeat url("${foto.mini}")`;
  return muestraColor(nombre) || porDefecto;
}

function muestraColor(nombre: string) {
  const clave = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

  return MUESTRAS_COLOR[clave] || MUESTRAS_COLOR[clave.split(/\s+/)[0]] || "";
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
    // Los carritos guardados antes de los colores opcionales traen "color" (texto).
    const linea = entrada as
      | (Partial<LineaCarrito> & { color?: unknown })
      | null;

    const producto = catalogo.productos.find(
      (opcion) => opcion.nombre === linea?.producto
    );

    if (!producto) continue;

    const cadena = String(linea?.cadena || "");

    const cadenaValida = producto.cadenas.length
      ? producto.cadenas.includes(cadena)
      : cadena === "";

    const colores = Array.isArray(linea?.colores)
      ? linea.colores.map((color) => String(color || "")).filter(Boolean)
      : linea?.color
      ? [String(linea.color)]
      : [];

    // Un color que ya no se ofrece saca la línea, como una cadena vieja.
    const coloresValidos = producto.personalizable
      ? (colores.length === 2 || (producto.tipoPersonalizado === "Mascota" && colores.length === 3)) &&
        colores.every((color) => producto.colores.includes(color)) &&
        Boolean(
          producto.tipoPersonalizado === "Mascota"
            ? leerMascota(String(linea?.comentario || ""))
            : leerPersonalizacion(String(linea?.comentario || ""))
        )
      : (colores.length <= producto.maxColores ||
        mismosColores(colores, producto.coloresDefecto)) &&
      new Set(colores).size === colores.length &&
      colores.every((color) => producto.colores.includes(color));

    const comentario = String(linea?.comentario || "")
      .trim()
      .slice(0, MAX_COMENTARIO_PIEZA);

    const cantidad = Math.floor(Number(linea?.cantidad) || 0);

    // Producto con variantes: la línea tiene que traer una que siga existiendo.
    const variante = String(linea?.variante || "");
    const varianteValida = producto.variantes.length
      ? producto.variantes.includes(variante)
      : variante === "";

    if (!cadenaValida || !coloresValidos || !varianteValida || cantidad < 1) continue;

    const existente = resultado.find(
      (otra) =>
        claveLinea(otra) ===
        claveLinea({
          producto: producto.nombre,
          variante,
          cadena,
          colores,
          comentario,
        })
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
      variante,
      cadena,
      colores,
      comentario,
      cantidad: Math.min(catalogo.maxUnidades, cantidad),
    });
  }

  return resultado;
}

/*
 * Último catálogo que vio este navegador: se muestra al instante
 * mientras llega el nuevo. Los precios los vuelve a validar Apps Script
 * al comprar, así que uno viejo nunca cobra mal.
 */
const CLAVE_CATALOGO = "kint-tienda-catalogo-v1";
const VIGENCIA_CATALOGO_MS = 24 * 60 * 60 * 1000;

function leerCatalogoGuardado(): Catalogo | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CATALOGO) || "null");
    if (!guardado || Date.now() - Number(guardado.en) > VIGENCIA_CATALOGO_MS) {
      return null;
    }
    return normalizarCatalogo(guardado.datos);
  } catch {
    return null;
  }
}

async function pedirCatalogo(): Promise<Catalogo> {
  const response = await fetch("/api/tienda/productos");

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || "No pudimos cargar la tienda."
    );
  }

  try {
    localStorage.setItem(
      CLAVE_CATALOGO,
      JSON.stringify({ en: Date.now(), datos: data })
    );
  } catch {
    // Sin lugar o sin permiso: solo se pierde el atajo.
  }

  return normalizarCatalogo(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarCatalogo(data: any): Catalogo {
  const coloresGlobales = listaDeTextos(data.coloresGlobales);

  return {
    abierta: data.abierta !== false,
    mensaje: String(data.mensaje || ""),
    senaPorcentaje: Number(data.senaPorcentaje) || 20,
    maxUnidades: Number(data.maxUnidades) || 200,
    mayorDesde: Number(data.mayorDesde) || 10,
    granMayorDesde: Number(data.granMayorDesde) || 0,
    coloresGlobales,
    productos: Array.isArray(data.productos)
      ? (data.productos as Producto[]).map((producto) => {
          const coloresDefecto = listaDeTextos(producto.coloresDefecto);
          const colores = listaDeTextos([
            ...listaDeTextos(producto.colores),
            ...coloresDefecto,
          ]);
          // 0 = colores fijos (en el panel no hay mín. ni máx.).
          const maxPedido = Math.floor(Number(producto.maxColores) || 0);
          const maxColores =
            maxPedido > 0 ? Math.min(maxPedido, colores.length || maxPedido) : 0;

          return {
            ...producto,
            precioMayor: Number(producto.precioMayor) || 0,
            precioGranMayor: Number(producto.precioGranMayor) || 0,
            cadenas: Array.isArray(producto.cadenas) ? producto.cadenas : [],
            colores,
            coloresDefecto,
            maxColores,
            minColores: maxColores
              ? Math.max(1, Math.min(Math.floor(Number(producto.minColores) || 1), maxColores))
              : 0,
            variantes: listaDeTextos(producto.variantes),
            descripcion: String(producto.descripcion || "").trim(),
            etiquetas: listaDeTextos(producto.etiquetas).slice(0, 5),
            personalizable: producto.personalizable === true,
            tipoPersonalizado:
              producto.tipoPersonalizado === "Mascota"
                ? "Mascota"
                : producto.personalizable === true
                ? "Llavero"
                : "",
            orden: Number(producto.orden) || 0,
            vendidos: Number(producto.vendidos) || 0,
            resenas: Array.isArray(producto.resenas)
              ? producto.resenas
                  .map((resena) => ({
                    nombre: String(resena?.nombre || ""),
                    estrellas: Math.max(1, Math.min(5, Number(resena?.estrellas) || 5)),
                    comentario: String(resena?.comentario || ""),
                    fecha: String(resena?.fecha || ""),
                  }))
                  .filter((resena) => resena.comentario)
              : [],
          };
        })
      : [],
  };
}

/*
 * Grupo del precio por mayor: mismo producto y mismos colores
 * (la cadena puede variar). Igual que kintTiendaArmarLineas_.
 */
function grupoMayor(producto: string, colores: string[], variante = "") {
  return `${producto}::${variante.toLocaleLowerCase("es")}::${[...colores]
    .map((color) => color.toLocaleLowerCase("es"))
    .sort()
    .join("+")}`;
}

/* Mismos colores sin importar el orden. */
function mismosColores(a: string[], b: string[]) {
  return a.length === b.length && a.every((color) => b.includes(color));
}

/* Lista de textos sin vacíos ni repetidos. */
function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return Array.from(
    new Set(
      valor
        .map((texto) => String(texto ?? "").trim())
        .filter(Boolean)
    )
  );
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

/* Chips para elegir cadena o color (no se muestra si no hay opciones). */
function SelectorOpciones({
  titulo,
  opciones,
  elegida,
  onElegir,
}: {
  titulo: string;
  opciones: string[];
  elegida: string;
  onElegir: (opcion: string) => void;
}) {
  if (!opciones.length) return null;

  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
        {titulo}
      </legend>

      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activa = opcion === elegida;

          return (
            <button
              key={opcion}
              type="button"
              onClick={() => onElegir(opcion)}
              aria-pressed={activa}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                activa
                  ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)] text-[var(--text-main)] ring-1 ring-[#4C6C81]/20"
                  : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-red-600/40"
              }`}
            >
              {activa && (
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
  );
}

/* Precios por mayor que existen para un producto, de menor a mayor cantidad. */
function tramosMayor(
  producto: Producto,
  mayorDesde: number,
  granMayorDesde: number
) {
  const tramos: { desde: number; precio: number }[] = [];

  if (producto.precioMayor > 0) {
    tramos.push({ desde: mayorDesde, precio: producto.precioMayor });
  }

  if (granMayorDesde && producto.precioGranMayor > 0) {
    tramos.push({ desde: granMayorDesde, precio: producto.precioGranMayor });
  }

  return tramos;
}

/* Precios por mayor en chips compactos (no se muestra si no hay). */
function PreciosMayorCompactos({
  producto,
  mayorDesde,
  granMayorDesde,
}: {
  producto: Producto;
  mayorDesde: number;
  granMayorDesde: number;
}) {
  const tramos = tramosMayor(producto, mayorDesde, granMayorDesde);

  if (!tramos.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tramos.map((tramo) => (
        <span
          key={tramo.desde}
          className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
        >
          Desde {tramo.desde}: {pesos(tramo.precio)} c/u
        </span>
      ))}
    </div>
  );
}

function TarjetaProducto({
  producto,
  maxUnidades,
  mayorDesde,
  granMayorDesde,
  enCarrito,
  deshabilitada,
  compacta = false,
  onAbrir,
  onAgregar,
}: {
  producto: Producto;
  // Con 2 o más por fila: foto, nombre, precio y "Ver opciones" (se elige en la ficha).
  compacta?: boolean;
  maxUnidades: number;
  mayorDesde: number;
  granMayorDesde: number;
  enCarrito: number;
  deshabilitada: boolean;
  // Abre la ficha en la foto que se está viendo.
  onAbrir: (indiceFoto: number) => void;
  // Agregado rápido: sin colores (a elección del taller) ni comentario.
  onAgregar: (cadena: string, cantidad: number) => void;
}) {
  const fotos = fotosDe(producto);

  // Sin cadena elegida: el cliente tiene que elegir Plateada o Dorada.
  const [cadena, setCadena] = useState("");
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

  const cadenaElegida = producto.cadenas.includes(cadena) ? cadena : "";
  const faltaCadena = producto.cadenas.length > 0 && !cadenaElegida;
  const conVariantes = producto.variantes.length > 0;

  const indice = Math.min(indiceFoto, Math.max(0, fotos.length - 1));
  const fotoActual = fotos[indice];
  const mostrarFoto = fotoActual && !fotosRotas.includes(indice);

  return (
    <article className={`${CLASE_PANEL} group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(37,67,93,0.18)]`}>
      <div className="relative aspect-square overflow-hidden bg-[var(--kint-panel-soft)]">
        <button
          type="button"
          onClick={() => onAbrir(indice)}
          aria-label={`Ver detalles de ${producto.nombre}`}
          className="absolute inset-0 h-full w-full cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#87A4B5]/60"
        >
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
            <FotoEnCamino />
          )}
        </button>

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
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
            {indice + 1}/{fotos.length}
          </span>
        )}

        {enCarrito > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-main)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
            <ShoppingBag size={12} strokeWidth={2.4} />
            {enCarrito} en el carrito
          </span>
        )}
      </div>

      {compacta ? (
        <div className="flex flex-1 flex-col gap-0.5 p-3 pb-3 sm:p-4 [&>button:last-child]:mt-3">
          <EtiquetasProducto etiquetas={producto.etiquetas} />
          <h3 className="text-sm font-black leading-tight sm:text-base">
            <button
              type="button"
              onClick={() => onAbrir(indice)}
              className="text-left underline-offset-4 hover:underline"
            >
              {producto.nombre}
            </button>
          </h3>
          {producto.descripcion && (
            <p className="line-clamp-2 text-[11px] leading-4 text-[var(--text-muted)]">
              {producto.descripcion}
            </p>
          )}
          <p className="mt-1 text-base font-black text-red-600">
            {pesos(producto.precio)}
          </p>
          {producto.precioMayor > 0 && (
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              Desde {mayorDesde}: {pesos(producto.precioMayor)} c/u
            </p>
          )}
          <button
            type="button"
            disabled={deshabilitada}
            onClick={() => onAbrir(indice)}
            className={`mt-auto flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
              deshabilitada ? CLASE_BOTON_INACTIVO : CLASE_BOTON_PRINCIPAL
            }`}
          >
            {producto.personalizable ? (
              <Sparkles size={14} strokeWidth={2.2} />
            ) : (
              <ShoppingBag size={14} strokeWidth={2.2} />
            )}
            {producto.personalizable ? "Personalizar" : "Ver opciones"}
          </button>
        </div>
      ) : (
      <div className="flex flex-1 flex-col p-5">
        <EtiquetasProducto etiquetas={producto.etiquetas} className="mb-1" />
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-black leading-tight">
            <button
              type="button"
              onClick={() => onAbrir(indice)}
              className="text-left underline-offset-4 hover:underline"
            >
              {producto.nombre}
            </button>
          </h3>

          <p className="shrink-0 text-lg font-black text-red-600">
            {pesos(producto.precio)}
          </p>
        </div>

        {producto.descripcion && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">
            {producto.descripcion}
          </p>
        )}

        <PreciosMayorCompactos
          producto={producto}
          mayorDesde={mayorDesde}
          granMayorDesde={granMayorDesde}
        />

        {producto.personalizable ? (
          <div className="mt-auto pt-5">
            <button
              type="button"
              disabled={deshabilitada}
              onClick={() => onAbrir(indice)}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                deshabilitada ? CLASE_BOTON_INACTIVO : CLASE_BOTON_PRINCIPAL
              }`}
            >
              <Sparkles size={15} strokeWidth={2.2} />
              {producto.tipoPersonalizado === "Mascota" ? "Personalizá la chapita" : "Personalizá con tu nombre"}
            </button>
          </div>
        ) : (
        <>
        <SelectorOpciones
          titulo="Cadena"
          opciones={producto.cadenas}
          elegida={cadenaElegida}
          onElegir={setCadena}
        />

        <button
          type="button"
          onClick={() => onAbrir(indice)}
          className="mt-4 inline-flex w-fit items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--blue-main)] underline-offset-4 hover:underline"
        >
          {producto.maxColores > 0 ? (
            <Palette size={14} strokeWidth={2.2} />
          ) : (
            <Maximize2 size={13} strokeWidth={2.4} />
          )}
          {producto.maxColores > 0
            ? "Ver detalles y cambiar colores"
            : "Ver detalles"}
        </button>

        <div className="mt-auto flex items-center gap-3 pt-5">
          <SelectorCantidad
            valor={cantidad}
            maximo={maxUnidades}
            etiqueta={producto.nombre}
            onCambiar={setCantidad}
          />

          <button
            type="button"
            disabled={deshabilitada || (faltaCadena && !conVariantes)}
            title={faltaCadena ? "Elegí la cadena" : undefined}
            onClick={() => {
              // Con variantes, se elige en la ficha (es obligatorio).
              if (conVariantes) {
                onAbrir(indice);
                return;
              }
              onAgregar(cadenaElegida, cantidad);
              setAgregado(true);
              setCantidad(1);
            }}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
              deshabilitada || (faltaCadena && !conVariantes) ? CLASE_BOTON_INACTIVO : CLASE_BOTON_PRINCIPAL
            }`}
          >
            {agregado ? (
              <>
                <Check size={15} strokeWidth={2.8} />
                Agregado
              </>
            ) : conVariantes ? (
              "Elegir variante"
            ) : faltaCadena ? (
              "Elegí la cadena"
            ) : (
              <>
                <ShoppingBag size={15} strokeWidth={2.2} />
                Agregar
              </>
            )}
          </button>
        </div>
        </>
        )}
      </div>
      )}
    </article>
  );
}

/* Círculos superpuestos con los colores de la foto. */
function MuestrasColor({ colores }: { colores: string[] }) {
  return (
    <span className="flex shrink-0 -space-x-2" aria-hidden="true">
      {colores.slice(0, 4).map((color) => (
        <span
          key={color}
          className="h-8 w-8 rounded-full border-2 border-[var(--kint-panel)] shadow-sm ring-1 ring-black/10 dark:ring-white/40"
          style={{
            background: fondoColor(color, "repeating-linear-gradient(45deg,#c9d4dc 0 4px,#eef2f5 4px 8px)"),
          }}
        />
      ))}
    </span>
  );
}

function Estrellas({ valor, tamano = 12 }: { valor: number; tamano?: number }) {
  return (
    <span className="inline-flex text-amber-500" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((numero) => (
        <Star
          key={numero}
          size={tamano}
          strokeWidth={2}
          className={numero <= Math.round(valor) ? "fill-current" : "opacity-30"}
        />
      ))}
    </span>
  );
}

/*
 * Reseñas del producto al final de la ficha: una línea discreta
 * ("★★★★★ 4,8 · 3 reseñas") que se despliega si el cliente quiere leerlas.
 */
function ResenasProducto({ resenas }: { resenas: ResenaProducto[] }) {
  if (!resenas.length) return null;

  const promedio =
    resenas.reduce((suma, resena) => suma + resena.estrellas, 0) / resenas.length;

  return (
    <details className="group mt-6 border-t border-[var(--kint-panel-border)] pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-[var(--text-muted)] [&::-webkit-details-marker]:hidden">
        <Estrellas valor={promedio} />
        <span className="font-bold tabular-nums">
          {promedio.toLocaleString("es-UY", { maximumFractionDigits: 1 })}
        </span>
        <span>
          · {resenas.length} {resenas.length === 1 ? "reseña" : "reseñas"}
        </span>
        <ChevronRight
          size={14}
          className="ml-auto transition group-open:rotate-90"
        />
      </summary>

      <ul className="mt-3 space-y-3">
        {resenas.map((resena, posicion) => (
          <li key={`${resena.fecha}-${posicion}`} className="text-xs leading-5">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Estrellas valor={resena.estrellas} tamano={10} />
              <span className="font-bold text-[var(--text-main)]">{resena.nombre}</span>
              {resena.fecha && (
                <span>
                  {new Date(`${resena.fecha}T12:00:00`).toLocaleDateString("es-UY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <p className="mt-1 text-[var(--text-muted)]">{resena.comentario}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

/* Mismo aviso que la tarjeta cuando un producto todavía no tiene foto. */
function FotoEnCamino({ tamano = 46 }: { tamano?: number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[var(--kint-blue-soft)]">
      <KeyRound size={tamano} strokeWidth={1.3} />
      <span className="text-[10px] font-black uppercase tracking-[0.24em]">
        Foto en camino
      </span>
    </div>
  );
}

const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Tab y Shift+Tab dan la vuelta dentro de la ventana abierta. */
function atraparFoco(evento: KeyboardEvent, capa: HTMLElement | null) {
  if (!capa) return;

  const enfocables = Array.from(
    capa.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
  );

  if (!enfocables.length) {
    evento.preventDefault();
    return;
  }

  const primero = enfocables[0];
  const ultimo = enfocables[enfocables.length - 1];
  const activo = document.activeElement;
  const afuera = !capa.contains(activo);

  if (evento.shiftKey && (activo === primero || afuera)) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && (activo === ultimo || afuera)) {
    evento.preventDefault();
    primero.focus();
  }
}

/* Lista de precios por cantidad; resalta el que corresponde. */
/* Precios por mayor en chips; el que rige con la cantidad elegida, resaltado. */
function PreciosPorCantidad({
  producto,
  mayorDesde,
  granMayorDesde,
  unidades,
}: {
  producto: Producto;
  mayorDesde: number;
  granMayorDesde: number;
  unidades: number;
}) {
  const tramos = tramosMayor(producto, mayorDesde, granMayorDesde);

  if (!tramos.length) return null;

  // Mismo criterio que precioUnitario: el tramo más alto alcanzado.
  const activo = tramos.reduce(
    (elegido, tramo) => (unidades >= tramo.desde ? tramo.desde : elegido),
    0
  );

  return (
    <div className="mt-3">
    <div className="flex flex-wrap gap-2">
      {tramos.map((tramo) => (
        <span
          key={tramo.desde}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            tramo.desde === activo
              ? "bg-emerald-600 text-white"
              : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          {tramo.desde}+ unidades: {pesos(tramo.precio)} c/u
        </span>
      ))}
    </div>
    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
      Del mismo color. La cadena puede variar.
    </p>
    </div>
  );
}

/*
 * Foto del visor: tocar o hacer clic alterna 1x y 2,5x
 * (acercando donde se tocó). Con zoom se mueve arrastrando;
 * sin zoom, deslizar pasa a la foto siguiente o anterior.
 */
function ImagenZoom({
  foto,
  alt,
  puedeMover,
  onMover,
}: {
  foto: Foto;
  alt: string;
  puedeMover: boolean;
  onMover: (paso: number) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const [rota, setRota] = useState(false);

  const refMarco = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{
    x: number;
    y: number;
    desdeX: number;
    desdeY: number;
    movio: boolean;
  } | null>(null);

  function limitar(x: number, y: number) {
    const marco = refMarco.current;
    if (!marco) return { x, y };

    const maxX = (marco.clientWidth * (ZOOM_VISOR - 1)) / 2;
    const maxY = (marco.clientHeight * (ZOOM_VISOR - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function alternarZoom(clienteX?: number, clienteY?: number) {
    if (zoom) {
      setZoom(false);
      setPosicion({ x: 0, y: 0 });
      return;
    }

    const marco = refMarco.current;

    if (marco && clienteX !== undefined && clienteY !== undefined) {
      // Se acerca al punto tocado: ese punto queda debajo del dedo.
      const caja = marco.getBoundingClientRect();
      const relativoX = clienteX - (caja.left + caja.width / 2);
      const relativoY = clienteY - (caja.top + caja.height / 2);

      setPosicion(
        limitar(
          -(ZOOM_VISOR - 1) * relativoX,
          -(ZOOM_VISOR - 1) * relativoY
        )
      );
    }

    setZoom(true);
  }

  if (rota) {
    return (
      <div className="flex h-full w-full items-center justify-center text-white/70">
        <FotoEnCamino tamano={56} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={refMarco}
        onPointerDown={(evento) => {
          if (evento.button !== 0) return;
          evento.currentTarget.setPointerCapture(evento.pointerId);
          arrastre.current = {
            x: evento.clientX,
            y: evento.clientY,
            desdeX: posicion.x,
            desdeY: posicion.y,
            movio: false,
          };
          setArrastrando(true);
        }}
        onPointerMove={(evento) => {
          const actual = arrastre.current;
          if (!actual) return;

          const dx = evento.clientX - actual.x;
          const dy = evento.clientY - actual.y;

          if (Math.abs(dx) + Math.abs(dy) > 6) actual.movio = true;
          if (zoom) setPosicion(limitar(actual.desdeX + dx, actual.desdeY + dy));
        }}
        onPointerUp={(evento) => {
          const actual = arrastre.current;
          arrastre.current = null;
          setArrastrando(false);
          if (!actual) return;

          const dx = evento.clientX - actual.x;
          const dy = evento.clientY - actual.y;

          if (!actual.movio) {
            alternarZoom(evento.clientX, evento.clientY);
          } else if (
            !zoom &&
            puedeMover &&
            Math.abs(dx) > 50 &&
            Math.abs(dx) > Math.abs(dy)
          ) {
            onMover(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          arrastre.current = null;
          setArrastrando(false);
        }}
        className={`h-full w-full touch-none select-none overflow-hidden ${
          zoom
            ? arrastrando
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlFoto(foto)}
          alt={alt}
          draggable={false}
          onError={() => setRota(true)}
          style={{
            transform: `translate(${posicion.x}px, ${posicion.y}px) scale(${
              zoom ? ZOOM_VISOR : 1
            })`,
          }}
          className={`h-full w-full object-contain ${
            arrastrando ? "" : "transition-transform duration-200"
          }`}
        />
      </div>

      <button
        type="button"
        onClick={() => alternarZoom()}
        aria-label={zoom ? "Alejar la foto" : "Acercar la foto"}
        className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
      >
        {zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
      </button>
    </div>
  );
}

/* Visor a pantalla completa de las fotos de un producto. */
function VisorFotos({
  fotos,
  indice,
  nombre,
  refCapa,
  onMover,
  onCerrar,
}: {
  fotos: Foto[];
  indice: number;
  nombre: string;
  refCapa: React.RefObject<HTMLDivElement | null>;
  onMover: (paso: number) => void;
  onCerrar: () => void;
}) {
  const varias = fotos.length > 1;

  return (
    <div
      ref={refCapa}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${nombre}`}
      className="fixed inset-0 z-[260] flex flex-col bg-black/95 text-white"
    >
      <div
        className="flex items-center justify-between gap-3 px-4 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <span className="w-14 text-sm font-bold tabular-nums text-white/80">
          {varias ? `${indice + 1}/${fotos.length}` : ""}
        </span>

        <p className="min-w-0 truncate text-sm font-black">{nombre}</p>

        <div className="flex w-14 justify-end">
          <button
            type="button"
            onClick={onCerrar}
            autoFocus
            aria-label="Cerrar fotos"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ImagenZoom
          key={indice}
          foto={fotos[indice]}
          alt={`${nombre}, foto ${indice + 1}`}
          puedeMover={varias}
          onMover={onMover}
        />

        {varias && (
          <>
            <button
              type="button"
              onClick={() => onMover(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={() => onMover(1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      <p
        className="px-4 pt-3 text-center text-[11px] text-white/60"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        Tocá la foto para acercarla y arrastrá para moverla.
      </p>
    </div>
  );
}

/*
 * FICHA DEL PRODUCTO
 * Se abre al tocar la foto o el nombre de una tarjeta: fotos grandes,
 * precios por cantidad, cadena, colores opcionales (1 o 2) y un
 * comentario de la pieza. Todo eso viaja con la línea del carrito.
 */
function FichaProducto({
  producto,
  catalogo,
  enCarrito,
  enCarritoConColores,
  deshabilitada,
  fotoInicial,
  onAgregar,
  onCerrar,
}: {
  producto: Producto;
  catalogo: Catalogo;
  enCarrito: number;
  // Unidades ya en el carrito con esos colores (cuentan para el por mayor).
  enCarritoConColores: (colores: string[], variante: string) => number;
  deshabilitada: boolean;
  fotoInicial: number;
  // Devuelve el error si no se pudo agregar ("" si salió bien).
  onAgregar: (opciones: OpcionesLinea) => string;
  onCerrar: () => void;
}) {
  const fotos = fotosDe(producto);
  const idTitulo = useId();

  const [indiceFoto, setIndiceFoto] = useState(fotoInicial);
  const [fotosRotas, setFotosRotas] = useState<number[]>([]);
  const [visor, setVisor] = useState(false);

  // Cadena sin elegir y colores de la foto hasta que el cliente los cambie.
  // Variante: obligatoria si el producto tiene.
  const [variante, setVariante] = useState("");
  const [cadena, setCadena] = useState("");
  const [elegirColores, setElegirColores] = useState(false);
  const [colores, setColores] = useState<string[]>([]);
  const [comentario, setComentario] = useState("");
  const [verComentario, setVerComentario] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState("");

  const refDialogo = useRef<HTMLDivElement>(null);
  const refVisor = useRef<HTMLDivElement>(null);
  const refGaleria = useRef<HTMLDivElement>(null);
  const refCerrar = useRef<HTMLButtonElement>(null);
  const refFotoPrincipal = useRef<HTMLButtonElement>(null);
  const refOnCerrar = useRef(onCerrar);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const ultimoDeslizamiento = useRef(0);

  useEffect(() => {
    refOnCerrar.current = onCerrar;
  });

  const total = fotos.length;
  const indice = Math.min(indiceFoto, Math.max(0, total - 1));
  const fotoActual = fotos[indice];
  const mostrarFoto = Boolean(fotoActual) && !fotosRotas.includes(indice);

  function moverFoto(paso: number) {
    if (total < 2) return;
    setIndiceFoto((indice + paso + total) % total);
  }

  function marcarRota(posicion: number) {
    setFotosRotas((actuales) =>
      actuales.includes(posicion) ? actuales : [...actuales, posicion]
    );
  }

  function abrirVisor() {
    // Un deslizamiento recién terminado no abre el visor.
    if (Date.now() - ultimoDeslizamiento.current < 400) return;
    setVisor(true);
  }

  function cerrarVisor() {
    setVisor(false);
    window.requestAnimationFrame(() => refFotoPrincipal.current?.focus());
  }

  // Fondo quieto mientras la ficha está abierta; al cerrar, el foco vuelve.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    refCerrar.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      anterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        if (visor) cerrarVisor();
        else refOnCerrar.current();
        return;
      }

      if (evento.key === "Tab") {
        atraparFoco(
          evento,
          visor ? refVisor.current : refDialogo.current
        );
        return;
      }

      if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
        const destino = evento.target as HTMLElement | null;

        if (destino && /^(INPUT|TEXTAREA)$/.test(destino.tagName)) return;
        if (!visor && !refGaleria.current?.contains(destino)) return;

        evento.preventDefault();
        moverFoto(evento.key === "ArrowLeft" ? -1 : 1);
      }
    }

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  });

  const cadenaElegida = producto.cadenas.includes(cadena) ? cadena : "";
  const faltaCadena = producto.cadenas.length > 0 && !cadenaElegida;

  const hayColores = producto.colores.length > 0;
  const { minColores, maxColores, coloresDefecto } = producto;
  const coloresElegidos = hayColores && elegirColores ? colores : [];

  const faltanColores =
    hayColores && elegirColores && colores.length < minColores;

  const textoLimiteColores =
    minColores === maxColores
      ? `Elegí ${maxColores} ${maxColores === 1 ? "color" : "colores"}.`
      : `Elegí de ${minColores} a ${maxColores} colores.`;

  const varianteElegida = producto.variantes.includes(variante) ? variante : "";
  const faltaVariante = producto.variantes.length > 0 && !varianteElegida;

  // Por mayor: mismo producto, variante y colores (la cadena puede variar).
  const coloresEfectivos = elegirColores && colores.length ? colores : coloresDefecto;
  const unidadesProducto =
    enCarritoConColores(coloresEfectivos, varianteElegida) + cantidad;
  const precioAplicado = precioUnitario(
    producto,
    unidadesProducto,
    catalogo
  );
  const subtotal = redondear(precioAplicado * cantidad);

  const aviso = deshabilitada
    ? "La tienda está en pausa: por ahora no se pueden agregar productos."
    : faltaVariante
    ? "Elegí la variante."
    : faltaCadena
    ? `Elegí la cadena (${producto.cadenas.join(" o ")}).`
    : faltanColores
    ? `${textoLimiteColores} O dejá los colores de la foto.`
    : "";

  function tocarColor(color: string) {
    setError("");
    setColores((actuales) => {
      if (actuales.includes(color)) {
        return actuales.filter((otro) => otro !== color);
      }

      if (maxColores === 1) return [color];

      // Con el máximo ya elegido, el nuevo reemplaza al último.
      return actuales.length < maxColores
        ? [...actuales, color]
        : [...actuales.slice(0, maxColores - 1), color];
    });
  }

  function alternarColores() {
    setError("");
    setElegirColores((actual) => {
      // Al abrir, se parte de los colores de la foto (si entran en el máximo).
      if (!actual) {
        setColores(
          coloresDefecto.length <= maxColores ? [...coloresDefecto] : []
        );
      }
      return !actual;
    });
  }

  function agregar() {
    if (aviso) return;

    const mensaje = onAgregar({
      variante: varianteElegida,
      cadena: cadenaElegida,
      colores: coloresElegidos,
      comentario: comentario.trim(),
      cantidad,
    });

    if (mensaje) setError(mensaje);
    else onCerrar();
  }

  const botonFlecha =
    "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60";

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={onCerrar}
        className="absolute inset-0 bg-[#06152f]/60 backdrop-blur-sm"
      />

      <div
        ref={refDialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--kint-panel)] text-[var(--text-main)] shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:h-auto sm:max-h-[min(92vh,860px)] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-[var(--kint-panel-border)]"
      >
        <button
          ref={refCerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar detalles"
          className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <X size={20} />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid md:grid-cols-2 md:overflow-hidden">
          <div
            ref={refGaleria}
            className="bg-[var(--kint-panel-soft)] md:overflow-y-auto"
          >
            <div
              className="relative aspect-square w-full overflow-hidden"
              onTouchStart={(evento) => {
                const dedo = evento.touches[0];
                toque.current = { x: dedo.clientX, y: dedo.clientY };
              }}
              onTouchEnd={(evento) => {
                const inicio = toque.current;
                toque.current = null;
                if (!inicio) return;

                const dedo = evento.changedTouches[0];
                const dx = dedo.clientX - inicio.x;
                const dy = dedo.clientY - inicio.y;

                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                  ultimoDeslizamiento.current = Date.now();
                  moverFoto(dx < 0 ? 1 : -1);
                }
              }}
            >
              {mostrarFoto ? (
                <button
                  ref={refFotoPrincipal}
                  type="button"
                  onClick={abrirVisor}
                  aria-label={`Ampliar la foto ${indice + 1} de ${producto.nombre}`}
                  className="h-full w-full cursor-zoom-in outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#87A4B5]/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlFoto(fotoActual)}
                    alt={producto.nombre}
                    draggable={false}
                    onError={() => marcarRota(indice)}
                    className="h-full w-full object-cover"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                    <ZoomIn size={12} strokeWidth={2.4} />
                    Ampliar
                  </span>
                </button>
              ) : (
                <FotoEnCamino tamano={64} />
              )}

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moverFoto(-1)}
                    aria-label="Foto anterior"
                    className={`${botonFlecha} left-3`}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => moverFoto(1)}
                    aria-label="Foto siguiente"
                    className={`${botonFlecha} right-3`}
                  >
                    <ChevronRight size={20} />
                  </button>

                  <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur">
                    {indice + 1}/{total}
                  </span>
                </>
              )}
            </div>

            {total > 1 && (
              <div
                className="flex gap-2 overflow-x-auto p-3"
                aria-label="Miniaturas"
              >
                {fotos.map((foto, posicion) => (
                  <button
                    key={`${foto.url}-${posicion}`}
                    type="button"
                    onClick={() => setIndiceFoto(posicion)}
                    aria-label={`Ver foto ${posicion + 1}`}
                    aria-current={posicion === indice}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[var(--kint-panel)] transition ${
                      posicion === indice
                        ? "border-[var(--blue-main)]"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {fotosRotas.includes(posicion) ? (
                      <span className="flex h-full w-full items-center justify-center text-[var(--kint-blue-soft)]">
                        <KeyRound size={20} strokeWidth={1.5} />
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlFoto(foto)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        onError={() => marcarRota(posicion)}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7 md:overflow-y-auto md:overscroll-contain">
            <EtiquetasProducto etiquetas={producto.etiquetas} className="mb-1.5 pr-10" />
            <h2
              id={idTitulo}
              className="pr-10 text-2xl font-black leading-tight sm:text-3xl md:pr-12"
            >
              {producto.nombre}
            </h2>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <p className="text-2xl font-black text-red-600 dark:text-red-500">
                {pesos(precioAplicado)}
                <span className="ml-1 text-sm font-bold text-[var(--text-muted)]">
                  c/u
                </span>
              </p>
              {precioAplicado < producto.precio && (
                <p className="text-sm font-bold text-[var(--text-muted)] line-through">
                  {pesos(producto.precio)}
                </p>
              )}
            </div>

            {producto.descripcion && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-[var(--kint-panel-soft)] px-3.5 py-2.5 text-sm leading-6 text-[var(--text-main)]">
                {producto.descripcion}
              </p>
            )}

            <PreciosPorCantidad
              producto={producto}
              mayorDesde={catalogo.mayorDesde}
              granMayorDesde={catalogo.granMayorDesde}
              unidades={unidadesProducto}
            />

            {enCarrito > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--kint-selected-bg)] px-3 py-1 text-[11px] font-bold text-[var(--text-main)]">
                <ShoppingBag size={12} strokeWidth={2.4} />
                Ya tenés {enCarrito} en el carrito
              </p>
            )}

            {/* Variante: obligatoria, igual que la cadena. */}
            {producto.variantes.length > 0 && (
              <fieldset className="mt-6">
                <legend className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
                  Elegí la variante
                  {faltaVariante && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] tracking-[0.12em] text-white">
                      Obligatorio
                    </span>
                  )}
                </legend>

                <div className="flex flex-wrap gap-2">
                  {producto.variantes.map((opcion) => {
                    const activa = opcion === varianteElegida;

                    return (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => {
                          setError("");
                          setVariante(opcion);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                          activa
                            ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] text-[var(--text-main)]"
                            : faltaVariante
                            ? "border-dashed border-red-500/70 text-[var(--text-main)] hover:border-red-600 hover:bg-red-500/5"
                            : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
                        }`}
                      >
                        {opcion}
                        {activa && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Cadena: obligatoria, se marca en rojo hasta que la elija. */}
            {producto.cadenas.length > 0 && (
              <fieldset className="mt-6">
                <legend className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
                  Elegí la cadena
                  {faltaCadena && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] tracking-[0.12em] text-white">
                      Obligatorio
                    </span>
                  )}
                </legend>

                <div className="flex flex-wrap gap-2">
                  {producto.cadenas.map((opcion) => {
                    const activa = opcion === cadenaElegida;

                    return (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => {
                          setError("");
                          setCadena(opcion);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                          activa
                            ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)] text-[var(--text-main)]"
                            : faltaCadena
                            ? "border-dashed border-red-500/70 text-[var(--text-main)] hover:border-red-600 hover:bg-red-500/5"
                            : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:border-[var(--kint-selected-border)]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 rounded-full border border-black/15 dark:border-white/30"
                          style={{ background: muestraColor(opcion) || "#c0c4c8" }}
                        />
                        {opcion}
                        {activa && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {hayColores && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
                  Colores
                </p>

                {!elegirColores ? (
                  <div className="flex items-center gap-3">
                    {coloresDefecto.length > 0 ? (
                      <>
                        <MuestrasColor colores={coloresDefecto} />
                        <p className="min-w-0 flex-1 text-sm">
                          <span className="font-bold">
                            {coloresDefecto.join(" + ")}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            Como en la foto
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="min-w-0 flex-1 text-sm text-[var(--text-muted)]">
                        A elección del taller
                      </p>
                    )}

                    {maxColores > 0 && (
                      <button
                        type="button"
                        onClick={alternarColores}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--kint-panel-border)] px-3 py-1.5 text-xs font-bold text-[var(--blue-main)] transition hover:border-[var(--kint-selected-border)]"
                      >
                        <Palette size={14} />
                        {coloresDefecto.length ? "Cambiar" : "Elegir"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-[var(--text-muted)]">
                        {colores.length
                          ? `Elegiste: ${colores.join(" + ")}`
                          : textoLimiteColores}
                      </p>
                      <button
                        type="button"
                        onClick={alternarColores}
                        className="shrink-0 text-xs font-bold text-[var(--blue-main)] underline-offset-4 hover:underline"
                      >
                        {coloresDefecto.length ? "Usar los de la foto" : "Cancelar"}
                      </button>
                    </div>

                    <div
                      role="group"
                      aria-label="Colores disponibles"
                      className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-2 gap-y-3"
                    >
                      {producto.colores.map((color) => {
                        const orden = colores.indexOf(color);
                        const activa = orden !== -1;
                        const muestra = fondoColor(color);

                        return (
                          <button
                            key={color}
                            type="button"
                            aria-pressed={activa}
                            aria-label={color}
                            onClick={() => tocarColor(color)}
                            className="group flex flex-col items-center gap-1.5 text-center"
                          >
                            <span
                              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
                                activa
                                  ? "ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--kint-panel)]"
                                  : "ring-1 ring-[var(--kint-panel-border)] group-hover:ring-[var(--kint-selected-border)]"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className="h-10 w-10 rounded-full border border-black/15 dark:border-white/35"
                                style={{
                                  background:
                                    muestra ||
                                    "repeating-linear-gradient(45deg,#c9d4dc 0 4px,#eef2f5 4px 8px)",
                                }}
                              />
                              {activa && maxColores > 1 && (
                                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue-main)] text-[10px] font-black text-white">
                                  {orden + 1}
                                </span>
                              )}
                            </span>
                            <span
                              className={`max-w-full break-words text-[11px] leading-tight ${
                                activa ? "font-black text-[var(--text-main)]" : "font-semibold text-[var(--text-muted)]"
                              }`}
                            >
                              {color}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {colores.length > 0 && (
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        {textoLimiteColores}
                      </p>
                    )}

                    {colores.some((color) => fotoFilamento(color)) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {colores.map((color) => {
                          const foto = fotoFilamento(color);
                          return foto ? (
                            <figure
                              key={color}
                              className="flex items-center gap-2 rounded-xl bg-[var(--kint-panel-soft)] p-1.5 pr-3"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={foto.grande}
                                alt={`Carrete de filamento ${color}`}
                                className="h-12 w-12 rounded-lg bg-white object-cover"
                                loading="lazy"
                              />
                              <figcaption className="text-[11px] leading-4 text-[var(--text-muted)]">
                                <strong className="block text-xs text-[var(--text-main)]">{color}</strong>
                                Foto real
                              </figcaption>
                            </figure>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {verComentario || comentario ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kint-info)]">
                  Comentario
                </span>
                <textarea
                  value={comentario}
                  onChange={(evento) => {
                    setError("");
                    setComentario(evento.target.value);
                  }}
                  placeholder="Algo que quieras aclarar de esta pieza"
                  rows={3}
                  autoFocus={!comentario}
                  maxLength={MAX_COMENTARIO_PIEZA}
                  className={`${CLASE_INPUT} resize-none`}
                />
                <span className="mt-1 block text-right text-[10px] tabular-nums text-[var(--text-muted)]">
                  {comentario.length}/{MAX_COMENTARIO_PIEZA}
                </span>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setVerComentario(true)}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--blue-main)] underline-offset-4 hover:underline"
              >
                <Plus size={14} />
                Agregar un comentario
              </button>
            )}

            <ResenasProducto resenas={producto.resenas} />
          </div>
        </div>

        <div
          className="border-t border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-5 pt-4 sm:px-7"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {(error || aviso) && (
            <p
              role={error ? "alert" : undefined}
              className={`mb-3 text-xs font-semibold ${
                error
                  ? "text-red-700 dark:text-red-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {error || aviso}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <SelectorCantidad
              valor={cantidad}
              maximo={catalogo.maxUnidades}
              etiqueta={producto.nombre}
              onCambiar={(valor) => {
                setError("");
                setCantidad(valor);
              }}
            />

            <div className="min-w-0 flex-1 text-right" aria-live="polite">
              <p className="text-[11px] text-[var(--text-muted)]">
                {cantidad} × {pesos(precioAplicado)}
                {precioAplicado < producto.precio && (
                  <span className="ml-1 font-bold text-emerald-700 dark:text-emerald-400">
                    · por mayor
                  </span>
                )}
              </p>
              <p className="text-xl font-black text-red-600 dark:text-red-500">
                {pesos(subtotal)}
              </p>
            </div>

            <button
              type="button"
              onClick={agregar}
              disabled={Boolean(aviso)}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 text-xs font-black uppercase tracking-[0.18em] transition-all sm:w-auto sm:flex-1 ${
                aviso ? CLASE_BOTON_INACTIVO : CLASE_BOTON_PRINCIPAL
              }`}
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>

      {visor && fotos.length > 0 && (
        <VisorFotos
          fotos={fotos}
          indice={indice}
          nombre={producto.nombre}
          refCapa={refVisor}
          onMover={moverFoto}
          onCerrar={cerrarVisor}
        />
      )}
    </div>
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
  // La cuenta ya tiene celular guardado (no se muestra el número).
  tieneTelefono: boolean;
  error: string;
};

/* Celular válido: 8 a 15 dígitos (Apps Script lo normaliza a +598...). */
function telefonoValido(texto: string) {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15;
}

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

/* ------------------------------------------------------------------ */
/* Orden y cantidad por fila                                           */
/* ------------------------------------------------------------------ */

type Orden = "destacados" | "vendidos" | "valorados" | "recientes" | "precio" | "nombre";

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: "destacados", texto: "Destacados" },
  { valor: "vendidos", texto: "Más vendidos" },
  { valor: "valorados", texto: "Mejor valorados" },
  { valor: "recientes", texto: "Más nuevos" },
  { valor: "precio", texto: "Precio" },
  { valor: "nombre", texto: "Nombre (A-Z)" },
];

const CLASES_COLUMNAS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

const CLAVE_VISTA = "kint-tienda-vista-v1";

function promedioResenas(producto: Producto) {
  if (!producto.resenas.length) return 0;
  return (
    producto.resenas.reduce((suma, resena) => suma + resena.estrellas, 0) /
    producto.resenas.length
  );
}

/* Ordena una copia; "invertido" da vuelta el sentido natural de cada orden. */
/* "LLAVERO · CLICKER": chiquito y apagado, para no cargar la tarjeta. */
function EtiquetasProducto({
  etiquetas,
  className = "",
}: {
  etiquetas: string[];
  className?: string;
}) {
  if (!etiquetas.length) return null;
  return (
    <p
      className={`truncate text-[10px] font-black uppercase tracking-[0.16em] text-[var(--kint-blue-soft)] ${className}`}
    >
      {etiquetas.join(" · ")}
    </p>
  );
}

/* Clave para comparar etiquetas sin importar mayúsculas ni tildes. */
function claveEtiqueta(texto: string) {
  return texto.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/* Etiquetas de todo el catálogo, las más usadas primero. */
function etiquetasCatalogo(productos: Producto[]) {
  const cuenta = new Map<string, { texto: string; cantidad: number }>();
  for (const producto of productos) {
    for (const etiqueta of producto.etiquetas) {
      const clave = claveEtiqueta(etiqueta);
      const actual = cuenta.get(clave);
      cuenta.set(clave, { texto: actual?.texto ?? etiqueta, cantidad: (actual?.cantidad ?? 0) + 1 });
    }
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1].cantidad - a[1].cantidad || a[1].texto.localeCompare(b[1].texto, "es"))
    .map(([clave, { texto }]) => ({ clave, texto }));
}

/* Una fila de botones: "Todo" + cada etiqueta. Solo si hay etiquetas. */
function FiltroEtiquetas({
  etiquetas,
  elegida,
  onElegir,
}: {
  etiquetas: { clave: string; texto: string }[];
  elegida: string;
  onElegir: (clave: string) => void;
}) {
  if (!etiquetas.length) return null;
  const opciones = [{ clave: "", texto: "Todo" }, ...etiquetas];
  return (
    <div className="-mx-4 mb-3 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por tipo">
      <div className="inline-flex gap-1.5">
        {opciones.map((opcion) => {
          const activa = opcion.clave === elegida;
          return (
            <button
              key={opcion.clave || "todo"}
              type="button"
              aria-pressed={activa}
              onClick={() => onElegir(opcion.clave)}
              className={`h-9 whitespace-nowrap rounded-full border px-4 text-xs font-black transition ${
                activa
                  ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
                  : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {opcion.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ordenarProductos(productos: Producto[], orden: Orden, invertido: boolean) {
  const lista = [...productos];
  const comparar: Record<Orden, (a: Producto, b: Producto) => number> = {
    destacados: (a, b) => a.orden - b.orden,
    vendidos: (a, b) => b.vendidos - a.vendidos || a.orden - b.orden,
    valorados: (a, b) =>
      promedioResenas(b) - promedioResenas(a) ||
      b.resenas.length - a.resenas.length ||
      a.orden - b.orden,
    recientes: (a, b) => b.orden - a.orden,
    precio: (a, b) => a.precio - b.precio || a.orden - b.orden,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  };
  lista.sort(comparar[orden]);
  return invertido ? lista.reverse() : lista;
}

function leerVista(): { orden: Orden; invertido: boolean; columnas: number } {
  const porDefecto = { orden: "destacados" as Orden, invertido: false, columnas: 0 };
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_VISTA) || "null");
    if (!guardada) return porDefecto;
    return {
      orden: ORDENES.some((opcion) => opcion.valor === guardada.orden)
        ? guardada.orden
        : "destacados",
      invertido: guardada.invertido === true,
      columnas: [1, 2, 3, 4].includes(guardada.columnas) ? guardada.columnas : 0,
    };
  } catch {
    return porDefecto;
  }
}

/* Barra arriba de los productos: ordenar, sentido y productos por fila. */
function BarraVista({
  orden,
  invertido,
  columnas,
  onCambiar,
}: {
  orden: Orden;
  invertido: boolean;
  columnas: number;
  onCambiar: (vista: { orden?: Orden; invertido?: boolean; columnas?: number }) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="orden-tienda">
          Ordenar productos
        </label>
        <select
          id="orden-tienda"
          value={orden}
          onChange={(evento) => onCambiar({ orden: evento.target.value as Orden, invertido: false })}
          className="h-10 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-[var(--kint-selected-border)]"
        >
          {ORDENES.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onCambiar({ invertido: !invertido })}
          aria-label={invertido ? "Orden normal" : "Dar vuelta el orden"}
          title={invertido ? "Orden normal" : "Dar vuelta el orden"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--text-main)] transition ${
            invertido
              ? "border-[var(--blue-main)] bg-[var(--kint-selected-bg)]"
              : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] hover:border-[var(--kint-selected-border)]"
          }`}
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      <div
        role="group"
        aria-label="Productos por fila"
        className="flex items-center gap-1 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-1"
      >
        {[1, 2, 3, 4].map((cantidad) => (
          <button
            key={cantidad}
            type="button"
            aria-pressed={columnas === cantidad}
            onClick={() => onCambiar({ columnas: columnas === cantidad ? 0 : cantidad })}
            title={`${cantidad} por fila`}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-black transition ${
              cantidad > 2 ? "hidden lg:block" : ""
            } ${
              columnas === cantidad
                ? "bg-[var(--blue-main)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            {cantidad}
          </button>
        ))}
        <span className="px-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          por fila
        </span>
      </div>
    </div>
  );
}

export default function TiendaPage() {
  const [vista, setVista] = useState<{ orden: Orden; invertido: boolean; columnas: number }>(() =>
    typeof window === "undefined"
      ? { orden: "destacados", invertido: false, columnas: 0 }
      : leerVista()
  );

  function cambiarVista(cambio: Partial<typeof vista>) {
    setVista((actual) => {
      const nueva = { ...actual, ...cambio };
      try {
        localStorage.setItem(CLAVE_VISTA, JSON.stringify(nueva));
      } catch {
        // Sin localStorage: solo dura esta visita.
      }
      return nueva;
    });
  }

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [etiqueta, setEtiqueta] = useState("");
  const [errorCatalogo, setErrorCatalogo] = useState("");

  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [carritoListo, setCarritoListo] = useState(false);
  const [paso, setPaso] = useState<Paso>(0);

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  // Celular: solo se pide a cuentas nuevas o que todavía no lo tienen.
  const [telefono, setTelefono] = useState("");
  const [alias, setAlias] = useState("");
  const [consulta, setConsulta] =
    useState<ConsultaCliente | null>(null);
  const [verificacion, setVerificacion] =
    useState<VerificacionAlias | null>(null);
  const [reintento, setReintento] = useState(0);

  const [fechaEntrega, setFechaEntrega] = useState("");
  // Días que le sirven para la entrega (fechaEntrega = el primero).
  const [diasEntrega, setDiasEntrega] = useState<string[]>([]);
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

  // Ficha abierta (por nombre de producto) y aviso de "agregado".
  // kint3d.com/tienda?personalizar=Llavero%20con%20nombre abre el personalizador directo.
  const [personalizando, setPersonalizando] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("personalizar")
  );
  const [ficha, setFicha] = useState<{
    producto: string;
    foto: number;
  } | null>(null);
  const [avisoAgregado, setAvisoAgregado] = useState<{
    texto: string;
    vez: number;
  } | null>(null);

  useEffect(() => {
    if (!avisoAgregado) return;

    const temporizador = window.setTimeout(
      () => setAvisoAgregado(null),
      4000
    );

    return () => window.clearTimeout(temporizador);
  }, [avisoAgregado]);

  const refCarrito = useRef<HTMLElement>(null);

  useEffect(() => {
    let activo = true;
    let mostrado = false;

    // Al instante: el último catálogo guardado (si hay).
    void Promise.resolve().then(() => {
      const guardado = leerCatalogoGuardado();
      if (!activo || !guardado) return;
      mostrado = true;
      setCatalogo(guardado);
      setCarrito(ajustarCarrito(leerCarritoGuardado(), guardado));
      setIdCompra(leerIdCompraGuardado());
      setCarritoListo(true);
      setCargando(false);
    });

    pedirCatalogo()
      .then((nuevo) => {
        if (!activo) return;
        setCatalogo(nuevo);
        // Si ya se mostraba el guardado, se ajusta el carrito actual.
        setCarrito((actual) =>
          ajustarCarrito(mostrado ? actual : leerCarritoGuardado(), nuevo)
        );
        if (!mostrado) setIdCompra(leerIdCompraGuardado());
        setCarritoListo(true);
      })
      .catch((errorCarga: unknown) => {
        // Con el catálogo guardado a la vista, un error de red no se muestra.
        if (!activo || mostrado) return;
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
          tieneTelefono: data.tieneTelefono === true,
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
          tieneTelefono: false,
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
          mensaje: "No pudimos verificar el nombre público.",
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

  const necesitaTelefono =
    clienteExiste === false ||
    (clienteExiste === true && !consultaActual?.tieneTelefono);

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

  // Si el producto deja de estar en el catálogo, la ficha no se muestra.
  const fichaProducto = ficha
    ? productosPorNombre.get(ficha.producto)
    : undefined;

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

  // Unidades por producto + colores (lo que decide el precio por mayor).
  const unidadesPorGrupo = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const linea of carrito) {
      if (!productosPorNombre.has(linea.producto)) continue;
      const grupo = grupoMayor(linea.producto, linea.colores, linea.variante);
      mapa.set(grupo, (mapa.get(grupo) || 0) + linea.cantidad);
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
              unidadesPorGrupo.get(grupoMayor(linea.producto, linea.colores, linea.variante)) || 0,
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
    [carrito, catalogo, productosPorNombre, unidadesPorGrupo]
  );

  // Productos con precio por mayor a los que todavía les faltan unidades.
  const avisosMayor = catalogo
    ? Array.from(
        new Map(
          carrito.map((linea) => [
            grupoMayor(linea.producto, linea.colores, linea.variante),
            linea,
          ])
        ).entries()
      ).flatMap(([grupo, linea]) => {
        const producto = productosPorNombre.get(linea.producto);
        const unidadesGrupo = unidadesPorGrupo.get(grupo) || 0;

        if (
          !producto ||
          !(producto.precioMayor > 0) ||
          unidadesGrupo >= catalogo.mayorDesde
        ) {
          return [];
        }

        return [
          {
            grupo,
            producto: linea.producto,
            colores: linea.colores,
            faltan: catalogo.mayorDesde - unidadesGrupo,
            precio: producto.precioMayor,
          },
        ];
      })
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
    : necesitaTelefono && !telefonoValido(telefono)
    ? "Escribí tu celular (por ejemplo 099 123 456)."
    : clienteExiste === false && !aliasLimpio
    ? "Elegí tu nombre público."
    : clienteExiste === false && verificandoAlias
    ? "Comprobando el nombre público..."
    : clienteExiste === false && aliasDisponible !== true
    ? mensajeAlias || "Elegí otro nombre público."
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

  /* Devuelve el error si no se pudo agregar ("" si salió bien). */
  function agregarAlCarrito(
    producto: Producto,
    opciones: OpcionesLinea
  ) {
    if (enviando) {
      return "Esperá a que termine de confirmarse la compra.";
    }

    const nueva = {
      producto: producto.nombre,
      variante: opciones.variante,
      cadena: opciones.cadena,
      // Sin elegir: van los de las fotos (así se ven en el carrito y la hoja).
      colores: opciones.colores.length
        ? opciones.colores
        : producto.coloresDefecto,
      comentario: opciones.comentario
        .trim()
        .slice(0, MAX_COMENTARIO_PIEZA),
    };
    const cantidad = opciones.cantidad;
    const clave = claveLinea(nueva);

    if (
      carrito.length >= MAX_LINEAS &&
      !carrito.some((linea) => claveLinea(linea) === clave)
    ) {
      const mensaje = `Podés combinar hasta ${MAX_LINEAS} modelos, cadenas y colores distintos por compra. Si necesitás más, hacé una segunda compra.`;
      setError(mensaje);
      return mensaje;
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
          ...nueva,
          cantidad: Math.min(maxUnidades, cantidad),
        },
      ];
    });

    setError("");
    return "";
  }

  function agregarDesdeFicha(producto: Producto, opciones: OpcionesLinea) {
    const mensaje = agregarAlCarrito(producto, opciones);

    if (!mensaje) {
      setAvisoAgregado({
        texto: `${opciones.cantidad} × ${producto.nombre}`,
        vez: Date.now(),
      });
    }

    return mensaje;
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
          telefono: necesitaTelefono ? telefono.trim() : "",
          email: emailLimpio,
          alias: aliasFinal,
          idCompra: id,
          comentario: comentario.trim(),
          fechaEntrega,
          fechasEntrega: diasEntrega,
          modalidad,
          total,
          items: lineas.map((linea) => ({
            producto: linea.producto,
            variante: linea.variante,
            cadena: linea.cadena,
            colores: linea.colores,
            comentario: linea.comentario,
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

        if (/precios|disponible|cadena|color|cerrad|pausa/i.test(mensaje)) {
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
      setDiasEntrega([]);
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
                  {detalleLinea(linea) && (
                    <span className="block text-xs text-[var(--text-muted)]">
                      {detalleLinea(linea)}
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

          <Link
            href={`/seguimiento?n=${encodeURIComponent(
              confirmada.pedido
            )}&e=${encodeURIComponent(confirmada.email)}`}
            className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)] px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-[var(--text-main)] transition hover:-translate-y-0.5"
          >
            <PackageSearch size={16} />
            Seguí tu compra
          </Link>

          <div className="mt-3 flex flex-col justify-center gap-3 sm:flex-row">
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
            Productos impresos en{" "}
            <span className="text-[var(--blue-main)]">3D</span>
          </h1>

          <div className="mt-5 flex items-center" aria-hidden="true">
            <div className="h-[4px] w-[110px] rounded-full bg-[var(--blue-main)]" />
            <div className="h-[4px] w-[120px] rounded-full bg-[var(--blue-soft)]" />
            <div className="h-3 w-3 rounded-full bg-[var(--blue-soft)]" />
          </div>

          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
            Elegí tu modelo, la cadena y, si querés, los colores. Pagás por
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
              <>
              <FiltroEtiquetas
                etiquetas={etiquetasCatalogo(catalogo.productos)}
                elegida={etiqueta}
                onElegir={setEtiqueta}
              />
              <BarraVista
                orden={vista.orden}
                invertido={vista.invertido}
                columnas={vista.columnas}
                onCambiar={cambiarVista}
              />
              <div
                className={`grid gap-5 ${
                  CLASES_COLUMNAS[vista.columnas] ||
                  "grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3"
                }`}
              >
                {ordenarProductos(
                  etiqueta
                    ? catalogo.productos.filter((producto) =>
                        producto.etiquetas.some((item) => claveEtiqueta(item) === etiqueta)
                      )
                    : catalogo.productos,
                  vista.orden,
                  vista.invertido
                ).map((producto) => (
                  <TarjetaProducto
                    key={producto.nombre}
                    producto={producto}
                    maxUnidades={maxUnidades}
                    mayorDesde={catalogo.mayorDesde}
                    granMayorDesde={catalogo.granMayorDesde}
                    deshabilitada={!tiendaAbierta || enviando}
                    compacta={vista.columnas >= 2}
                    enCarrito={
                      unidadesPorProducto.get(producto.nombre) || 0
                    }
                    onAbrir={(foto) =>
                      producto.personalizable
                        ? setPersonalizando(producto.nombre)
                        : setFicha({ producto: producto.nombre, foto })
                    }
                    onAgregar={(cadena, cantidad) =>
                      agregarAlCarrito(producto, {
                        variante: "",
                        cadena,
                        colores: [],
                        comentario: "",
                        cantidad,
                      })
                    }
                  />
                ))}
              </div>
              </>
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
                  {unidades} {unidades === 1 ? "unidad" : "unidades"}
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
                Todavía no agregaste productos.
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
                              {detalleLinea(linea) && (
                                <p className="break-words text-xs text-[var(--text-muted)]">
                                  {detalleLinea(linea)}
                                </p>
                              )}
                              <p className="text-xs text-[var(--text-muted)]">
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
                        key={aviso.grupo}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-300"
                      >
                        Sumá <strong>{aviso.faltan}</strong>{" "}
                        {aviso.faltan === 1 ? "unidad" : "unidades"} más de{" "}
                        <strong>{aviso.producto}</strong>
                        {aviso.colores.length > 0 &&
                          ` ${aviso.colores.join(" + ")}`}{" "}
                        y pagás <strong>{pesos(aviso.precio)} c/u</strong>{" "}
                        (precio por mayor). Puede ser con otra cadena, pero
                        del mismo color.
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
                  <ul className="mt-1 space-y-0.5 text-xs text-[var(--text-muted)]">
                    {lineas.map((linea) => (
                      <li
                        key={claveLinea(linea)}
                        className="break-words"
                      >
                        {linea.cantidad} × {linea.producto}
                        {detalleLinea(linea)
                          ? ` · ${detalleLinea(linea)}`
                          : ""}
                      </li>
                    ))}
                  </ul>
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

                  {necesitaTelefono && (
                    <label className="block">
                      <span className={CLASE_ETIQUETA}>
                        Celular (WhatsApp)
                      </span>
                      <span className="mb-2 block text-[11px] leading-4 text-[var(--text-muted)]">
                        Lo usamos solo para coordinar tu entrega. Queda
                        guardado en tu cuenta.
                      </span>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(evento) =>
                          setTelefono(evento.target.value)
                        }
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="099 123 456"
                        maxLength={24}
                        className={CLASE_INPUT}
                      />
                    </label>
                  )}

                  {clienteExiste === false && (
                    <label className="block">
                      <span className={CLASE_ETIQUETA}>
                        Nombre público
                      </span>
                      <span className="mb-2 block text-[11px] leading-4 text-[var(--text-muted)]">
                        Es el que se ve en tus reseñas y en el ranking
                        Top Kint (tu correo y tu celular nunca se
                        muestran). Lo podés cambiar en Ajustes.
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
                      dias={diasEntrega}
                      onCambiarDias={setDiasEntrega}
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
                        onClick={() => {
                          // Otro monto: es otra compra para el anti-duplicados.
                          if (opcion !== modalidad) setIdCompra("");
                          setModalidad(opcion);
                        }}
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

      {catalogo && fichaProducto && ficha && (
        <FichaProducto
          key={fichaProducto.nombre}
          producto={fichaProducto}
          catalogo={catalogo}
          fotoInicial={ficha.foto}
          enCarrito={unidadesPorProducto.get(fichaProducto.nombre) || 0}
          enCarritoConColores={(colores, variante) =>
            unidadesPorGrupo.get(grupoMayor(fichaProducto.nombre, colores, variante)) || 0
          }
          deshabilitada={!tiendaAbierta || enviando}
          onAgregar={(opciones) =>
            agregarDesdeFicha(fichaProducto, opciones)
          }
          onCerrar={() => setFicha(null)}
        />
      )}

      {catalogo &&
        personalizando &&
        (() => {
          const producto = catalogo.productos.find((item) => item.nombre === personalizando);
          if (!producto) return null;
          return (
            <Personalizador
              producto={producto}
              tipo={producto.tipoPersonalizado === "Mascota" ? "Mascota" : "Llavero"}
              maxUnidades={maxUnidades}
              onCerrar={() => setPersonalizando(null)}
              onAgregar={(opciones) => {
                if (!tiendaAbierta) return "La tienda está en pausa.";
                const mensaje = agregarDesdeFicha(producto, { ...opciones, variante: "" });
                if (!mensaje) setPersonalizando(null);
                return mensaje;
              }}
            />
          );
        })()}

      {avisoAgregado && (
        <div
          key={avisoAgregado.vez}
          role="status"
          className="fixed inset-x-4 top-4 z-[170] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--kint-panel)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)] lg:right-[440px]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check size={17} strokeWidth={2.8} />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <strong className="block">Agregado al carrito</strong>
            <span className="block truncate text-xs text-[var(--text-muted)]">
              {avisoAgregado.texto}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setAvisoAgregado(null);
              mostrarPanel();
            }}
            className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[var(--blue-main)] underline-offset-4 hover:underline"
          >
            Ver carrito
          </button>
        </div>
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
