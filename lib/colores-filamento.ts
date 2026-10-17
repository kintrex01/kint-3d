/*
 * Colores de filamento: tono para la vista 3D y foto real del carrete.
 *
 * Los tonos de los colores con foto salen de las fotos de public/colores
 * (promedio del filamento). Las fotos chicas (mini: recorte del filamento,
 * grande: el carrete entero) se generaron de esas mismas fotos.
 * Si un color no está en la lista, va gris y sin foto.
 */

type Datos = { hex: string; foto?: string };

const COLORES: Record<string, Datos> = {
  // Con foto real (public/colores/*.png).
  amarillo: { hex: "#ffe700", foto: "amarillo" },
  arena: { hex: "#c2a175", foto: "arena" },
  blanco: { hex: "#e9ebe6", foto: "blanco" },
  celeste: { hex: "#1282ce", foto: "celeste" },
  cristal: { hex: "#c9cbc2", foto: "cristal" },
  "gris claro": { hex: "#c2c3bf", foto: "gris-claro" },
  gris: { hex: "#7b8183", foto: "gris" },
  lila: { hex: "#daa5e9", foto: "lila" },
  marron: { hex: "#916048", foto: "marron" },
  negro: { hex: "#303031", foto: "negro" },
  oro: { hex: "#b78a31", foto: "oro" },
  rojo: { hex: "#e61925", foto: "rojo" },
  "verde aguamarina": { hex: "#25cba7", foto: "verde-aguamarina" },
  "verde bosque": { hex: "#809677", foto: "verde-bosque" },
  verde: { hex: "#10b580", foto: "verde" },
  violeta: { hex: "#572369", foto: "violeta" },
  // Sin foto todavía.
  transparente: { hex: "#c9cbc2", foto: "cristal" },
  dorado: { hex: "#c9a13a" },
  dorada: { hex: "#c9a13a" },
  plateado: { hex: "#c0c4cc" },
  plateada: { hex: "#c0c4cc" },
  plata: { hex: "#c0c4cc" },
  beige: { hex: "#e8d9b5" },
  naranja: { hex: "#f97316" },
  "verde claro": { hex: "#86efac" },
  aguamarina: { hex: "#25cba7", foto: "verde-aguamarina" },
  azul: { hex: "#2547d0" },
  rosa: { hex: "#f472b6" },
  fucsia: { hex: "#d946ef" },
  bordo: { hex: "#7f1d1d" },
};

export function claveColor(nombre: string) {
  return nombre
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function colorFilamento(nombre: string) {
  return COLORES[claveColor(nombre)]?.hex || "#9ca3af";
}

/* Fotos reales del color: chica (filamento, para botones) y grande (carrete). */
export function fotoFilamento(nombre: string) {
  const foto = COLORES[claveColor(nombre)]?.foto;
  return foto ? { mini: `/colores/mini/${foto}.webp`, grande: `/colores/grande/${foto}.webp` } : null;
}

/*
 * Filamentos agregados desde el panel: el color y la foto viajan en el
 * comentario de la fila de Configuración ("color: #aabbcc · foto: https://...").
 */
export function extrasFilamento(comentario: string) {
  const texto = String(comentario || "");
  const color = texto.match(/color:\s*(#[0-9a-f]{6})/i)?.[1] || "";
  const foto = texto.match(/foto:\s*(https:\/\/\S+)/i)?.[1] || "";
  return { color, foto };
}
