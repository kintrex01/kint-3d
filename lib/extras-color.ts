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

/* Tamaño «Personalizado» / «Otra escala»: el cliente escribe la escala (igual que kintExtrasTamanoPersonalizado_). */
export function esTamanoPersonalizado(opcion: string) {
  return /personaliz|otra/i.test(opcion || "");
}

/* El tamaño que coincide con la escala de la maqueta («1:100» → la variante «1:100»), para dejarlo elegido. */
export function tamanoDeEscala(tamanos: string[], escala: string) {
  const numero = /1\s*[:/]\s*(\d+)/.exec(escala || "")?.[1];
  if (!numero) return "";
  return tamanos.find((opcion) => /1\s*[:/]\s*(\d+)/.exec(opcion)?.[1] === numero) || "";
}

/* «1:300» → 300 (0 si no hay escala). */
export function numeroEscala(texto: string) {
  const numero = /1\s*[:/]\s*(\d+)/.exec(texto || "")?.[1];
  return numero ? Number(numero) : 0;
}

/*
 * Qué monos le van a la maqueta según su escala:
 * - si un producto tiene esa escala en la lista (o en el nombre), ese, con esa escala;
 * - si no, el que tenga «Personalizado» y la escala más cercana a su lista, con la escala escrita (se cotiza después).
 */
export function monoParaEscala(productos: { nombre: string; variantes?: string[] }[], escala: string) {
  const n = numeroEscala(escala);
  if (!n) return null;
  let mejor: { nombre: string; tamano: string; propia: string; distancia: number } | null = null;
  for (const producto of productos) {
    const variantes = producto.variantes ?? [];
    const exacta = variantes.find((opcion) => !esTamanoPersonalizado(opcion) && numeroEscala(opcion) === n);
    if (exacta) return { nombre: producto.nombre, tamano: exacta, propia: "" };
    if (!variantes.length && numeroEscala(producto.nombre) === n) return { nombre: producto.nombre, tamano: "", propia: "" };
    const personalizado = variantes.find(esTamanoPersonalizado);
    if (!personalizado) continue;
    const numeros = variantes.map(numeroEscala).filter(Boolean);
    const distancia = numeros.length ? Math.max(0, Math.min(...numeros) - n, n - Math.max(...numeros)) : 0;
    if (!mejor || distancia < mejor.distancia) mejor = { nombre: producto.nombre, tamano: personalizado, propia: `1:${n}`, distancia };
  }
  return mejor && { nombre: mejor.nombre, tamano: mejor.tamano, propia: mejor.propia };
}
