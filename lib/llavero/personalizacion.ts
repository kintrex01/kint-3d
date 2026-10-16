/*
 * Llavero personalizado: opciones y formato compartidos por la tienda,
 * el panel y Apps Script (kintTiendaPersonalizacion_ usa las mismas listas).
 *
 * La personalización viaja en el comentario de la línea, así:
 *   "Texto: Antonio | Fuente: Pacifico | Tamaño: Mediano"
 * y los colores en la lista de colores: [borde, letras].
 */

export const FUENTES_LLAVERO = [
  { nombre: "Rubik", archivo: "/fuentes-llavero/rubik.woff" },
  { nombre: "Fredoka", archivo: "/fuentes-llavero/fredoka.woff" },
  { nombre: "Pacifico", archivo: "/fuentes-llavero/pacifico.woff" },
  { nombre: "Lobster", archivo: "/fuentes-llavero/lobster.woff" },
  { nombre: "Bebas Neue", archivo: "/fuentes-llavero/bebas-neue.woff" },
  { nombre: "Luckiest Guy", archivo: "/fuentes-llavero/luckiest-guy.woff" },
] as const;

/* Alto de las mayúsculas en mm (la pieza termina ~5 mm más alta por el borde). */
export const TAMANOS_LLAVERO = [
  { nombre: "Chico", alto: 8 },
  { nombre: "Mediano", alto: 11 },
  { nombre: "Grande", alto: 14 },
] as const;

export const MAX_LETRAS_LLAVERO = 12;

/* Sin "|" ni ":" (separan los campos del comentario). */
export const TEXTO_LLAVERO_VALIDO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'!?&-]+$/;

export type PersonalizacionLlavero = {
  texto: string;
  fuente: string;
  tamano: string;
};

export function limpiarTextoLlavero(texto: string) {
  return texto.replace(/\s+/g, " ").trimStart().slice(0, MAX_LETRAS_LLAVERO);
}

/* "" si está bien; si no, qué corregir. */
export function errorTextoLlavero(texto: string) {
  const limpio = texto.trim();
  if (!limpio) return "Escribí el nombre.";
  if (limpio.length > MAX_LETRAS_LLAVERO) return `Hasta ${MAX_LETRAS_LLAVERO} letras.`;
  if (!TEXTO_LLAVERO_VALIDO.test(limpio)) {
    return "Usá letras, números, espacios y . ' ! ? & -";
  }
  return "";
}

export function formatearPersonalizacion(personalizacion: PersonalizacionLlavero) {
  return `Texto: ${personalizacion.texto.trim()} | Fuente: ${personalizacion.fuente} | Tamaño: ${personalizacion.tamano}`;
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
  return { texto, fuente, tamano };
}
