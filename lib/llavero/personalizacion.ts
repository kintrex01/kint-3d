/*
 * Llavero personalizado: opciones y formato compartidos por la tienda,
 * el panel y Apps Script (kintTiendaPersonalizacion_ usa las mismas listas).
 *
 * La personalización viaja en el comentario de la línea, así:
 *   "Texto: Antonio | Texto 2: Arquitecto | Fuente: Pacifico | Tamaño: Mediano | Borde: Normal
 *    | Fondo: Contorno | Separación: 0"
 * ("Texto 2", "Borde", "Fondo" y "Separación" son opcionales: los pedidos viejos no los traen)
 * y los colores en la lista de colores: [borde, letras].
 */

export const FUENTES_LLAVERO = [
  { nombre: "Rubik", archivo: "/fuentes-llavero/rubik.woff", estilo: "Redonda gruesa" },
  { nombre: "Fredoka", archivo: "/fuentes-llavero/fredoka.woff", estilo: "Redonda" },
  { nombre: "Baloo", archivo: "/fuentes-llavero/baloo.woff", estilo: "Redonda" },
  { nombre: "Titan One", archivo: "/fuentes-llavero/titan-one.woff", estilo: "Gordita" },
  { nombre: "Luckiest Guy", archivo: "/fuentes-llavero/luckiest-guy.woff", estilo: "Comic" },
  { nombre: "Bangers", archivo: "/fuentes-llavero/bangers.woff", estilo: "Comic" },
  { nombre: "Chewy", archivo: "/fuentes-llavero/chewy.woff", estilo: "Divertida" },
  { nombre: "Righteous", archivo: "/fuentes-llavero/righteous.woff", estilo: "Retro" },
  { nombre: "Bebas Neue", archivo: "/fuentes-llavero/bebas-neue.woff", estilo: "Alta" },
  { nombre: "Pacifico", archivo: "/fuentes-llavero/pacifico.woff", estilo: "Cursiva" },
  { nombre: "Lobster", archivo: "/fuentes-llavero/lobster.woff", estilo: "Cursiva" },
  { nombre: "Dancing Script", archivo: "/fuentes-llavero/dancing-script.woff", estilo: "Cursiva fina" },
  { nombre: "Kaushan Script", archivo: "/fuentes-llavero/kaushan-script.woff", estilo: "Pincel" },
  { nombre: "Permanent Marker", archivo: "/fuentes-llavero/permanent-marker.woff", estilo: "Marcador" },
] as const;

/* Alto de las mayúsculas en mm (la pieza termina ~5 mm más alta por el borde). */
export const TAMANOS_LLAVERO = [
  { nombre: "Chico", alto: 8 },
  { nombre: "Mediano", alto: 11 },
  { nombre: "Grande", alto: 14 },
] as const;

/* Cuánto sobresale el borde alrededor de las letras, en mm. */
export const BORDES_LLAVERO = [
  { nombre: "Fino", mm: 1.6 },
  { nombre: "Normal", mm: 2.3 },
  { nombre: "Grueso", mm: 3.1 },
  { nombre: "Extra", mm: 4 },
] as const;

/* Qué hay detrás de las letras. */
export const FONDOS_LLAVERO = [
  { nombre: "Contorno", detalle: "Sigue la forma de las letras" },
  { nombre: "Placa", detalle: "Un rectángulo lleno" },
  { nombre: "Solo letras", detalle: "Sin fondo, de un solo color" },
] as const;

/* Separación extra entre letras, en mm (negativa = más pegadas). */
export const SEPARACION_MIN = -1.5;
export const SEPARACION_MAX = 4;
export const SEPARACION_PASO = 0.5;

export function limpiarSeparacion(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const redondeado = Math.round(numero / SEPARACION_PASO) * SEPARACION_PASO;
  return Math.min(SEPARACION_MAX, Math.max(SEPARACION_MIN, redondeado));
}

/* Espacio extra entre los dos renglones, en mm (negativo = más pegados). */
export const RENGLONES_MIN = -8;
export const RENGLONES_MAX = 6;

export function limpiarRenglones(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const redondeado = Math.round(numero * 2) / 2;
  return Math.min(RENGLONES_MAX, Math.max(RENGLONES_MIN, redondeado));
}

export const MAX_LETRAS_LLAVERO = 12;

/* Sin "|" ni ":" (separan los campos del comentario). */
export const TEXTO_LLAVERO_VALIDO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'!?&-]+$/;

export type PersonalizacionLlavero = {
  texto: string;
  texto2?: string; // segunda línea, opcional
  fuente: string;
  tamano: string;
  borde?: string; // "Normal" si no viene
  fondo?: string; // "Contorno" si no viene
  separacion?: number; // mm extra entre letras (0 si no viene)
  renglones?: number; // mm extra entre los dos renglones (0 si no viene)
};

export function limpiarTextoLlavero(texto: string) {
  return texto.replace(/\s+/g, " ").trimStart().slice(0, MAX_LETRAS_LLAVERO);
}

/* "" si está bien; si no, qué corregir. La segunda línea puede ir vacía. */
export function errorTextoLlavero(texto: string, opcional = false) {
  const limpio = texto.trim();
  if (!limpio) return opcional ? "" : "Escribí el nombre.";
  if (limpio.length > MAX_LETRAS_LLAVERO) return `Hasta ${MAX_LETRAS_LLAVERO} letras.`;
  if (!TEXTO_LLAVERO_VALIDO.test(limpio)) {
    return "Usá letras, números, espacios y . ' ! ? & -";
  }
  return "";
}

export function bordeMm(nombre?: string) {
  return (BORDES_LLAVERO.find((borde) => borde.nombre === nombre) ?? BORDES_LLAVERO[1]).mm;
}

export function formatearPersonalizacion(personalizacion: PersonalizacionLlavero) {
  return [
    `Texto: ${personalizacion.texto.trim()}`,
    personalizacion.texto2?.trim() ? `Texto 2: ${personalizacion.texto2.trim()}` : "",
    `Fuente: ${personalizacion.fuente}`,
    `Tamaño: ${personalizacion.tamano}`,
    `Borde: ${personalizacion.borde || "Normal"}`,
    `Fondo: ${personalizacion.fondo || "Contorno"}`,
    `Separación: ${limpiarSeparacion(personalizacion.separacion)}`,
    personalizacion.texto2?.trim() ? `Renglones: ${limpiarRenglones(personalizacion.renglones)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

/* Lee el comentario de una línea; null si no es un llavero personalizado. */
export function leerPersonalizacion(comentario: string): PersonalizacionLlavero | null {
  const campos: Record<string, string> = {};
  for (const parte of String(comentario || "").split("|")) {
    const indice = parte.indexOf(":");
    if (indice < 0) continue;
    campos[parte.slice(0, indice).trim().toLocaleLowerCase("es")] = parte.slice(indice + 1).trim();
  }

  const texto = campos["texto"] || "";
  const fuente = FUENTES_LLAVERO.find((opcion) => opcion.nombre === campos["fuente"])?.nombre;
  const tamano = TAMANOS_LLAVERO.find((opcion) => opcion.nombre === campos["tamaño"])?.nombre;
  if (!texto || !fuente || !tamano) return null;

  const borde = BORDES_LLAVERO.find((opcion) => opcion.nombre === campos["borde"])?.nombre ?? "Normal";
  const fondo = FONDOS_LLAVERO.find((opcion) => opcion.nombre === campos["fondo"])?.nombre ?? "Contorno";
  const separacion = limpiarSeparacion(campos["separación"] ?? 0);
  const renglones = limpiarRenglones(campos["renglones"] ?? 0);
  return { texto, texto2: campos["texto 2"] || "", fuente, tamano, borde, fondo, separacion, renglones };
}

/* "“Antonio / Arquitecto”" para mostrar. */
export function textoVisible(personalizacion: PersonalizacionLlavero) {
  return [personalizacion.texto, personalizacion.texto2].filter((linea) => linea?.trim()).join(" / ");
}
