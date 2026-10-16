/*
 * Color aproximado de cada filamento por su nombre, para la vista 3D
 * del llavero personalizado. Si no está en la lista, va gris.
 */

const COLORES: Record<string, string> = {
  negro: "#1a1a1a",
  blanco: "#f5f5f5",
  rojo: "#d42020",
  marron: "#7c4a1e",
  cristal: "#dbe4ee",
  transparente: "#dbe4ee",
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
  violeta: "#6d28d9",
  celeste: "#7dd3fc",
  azul: "#2547d0",
  rosa: "#f472b6",
  fucsia: "#d946ef",
  bordo: "#7f1d1d",
};

export function claveColor(nombre: string) {
  return nombre
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function colorFilamento(nombre: string) {
  return COLORES[claveColor(nombre)] || "#9ca3af";
}
