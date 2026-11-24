import { extrasFilamento } from "@/lib/colores-filamento";
/*
 * Productos de la tienda que se suman a la maqueta y piden elegir color
 * (los monos / figuras humanas). Igual que kintExtrasPideColor_ en Apps Script.
 * El color viaja en el campo «cadena» del extra.
 */
export function pideColor(nombre: string) {
  return /\bmonos?\b/i.test(nombre || "");
}

/* Los monos van primero: es lo que más se suma a una maqueta. */
export function monosPrimero<T extends { nombre: string }>(productos: T[]): T[] {
  return [...productos].sort((a, b) => Number(pideColor(b.nombre)) - Number(pideColor(a.nombre)));
}

/*
 * Los colores habilitados con el nombre que ve la gente (Configuración › filamento_*),
 * en el orden que eligió el dueño. Lo mismo que arma /cotizar.
 */
export function coloresVisiblesDesdeConfig(configuracion: Record<string, { valor?: unknown; comentario?: unknown }>) {
  return Object.entries(configuracion || {})
    .filter(([clave, opcion]) => clave.startsWith("filamento_") && ["habilitada", "habilitado", "sí", "si"].includes(String(opcion?.valor || "").trim().toLowerCase()))
    .map(([clave, opcion]) => {
      const extras = extrasFilamento(String(opcion?.comentario || ""));
      const deClave = clave
        .replace(/^filamento_/, "")
        .split("_")
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(" ");
      return { nombre: extras.nombre || deClave, orden: extras.orden ?? Infinity };
    })
    .sort((a, b) => a.orden - b.orden)
    .map((color) => color.nombre);
}
