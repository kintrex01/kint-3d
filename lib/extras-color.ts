import { colorFilamento, extrasFilamento, fotoFilamento } from "@/lib/colores-filamento";
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
  // Si la escala es más grande que todas las que hay (ej. 1:50), «Más grande»; si no, «Más chica».
  const conocidas = productos
    .flatMap((producto) => [producto.nombre, ...(producto.variantes ?? [])])
    .map(numeroEscala)
    .filter(Boolean);
  const masGrande = conocidas.length > 0 && n < Math.min(...conocidas);
  for (const producto of productos) {
    const variantes = producto.variantes ?? [];
    const exacta = variantes.find((opcion) => !esTamanoPersonalizado(opcion) && numeroEscala(opcion) === n);
    if (exacta) return { nombre: producto.nombre, tamano: exacta, propia: "" };
    if (!variantes.length && numeroEscala(producto.nombre) === n) return { nombre: producto.nombre, tamano: "", propia: "" };
    const propias = variantes.filter(esTamanoPersonalizado);
    const personalizado =
      propias.find((opcion) => (masGrande ? /grande|mayor/i : /chic|menor/i).test(opcion)) ?? propias[0];
    if (!personalizado) continue;
    const numeros = variantes.map(numeroEscala).filter(Boolean);
    const distancia = numeros.length ? Math.max(0, Math.min(...numeros) - n, n - Math.max(...numeros)) : 0;
    if (!mejor || distancia < mejor.distancia) mejor = { nombre: producto.nombre, tamano: personalizado, propia: `1:${n}`, distancia };
  }
  return mejor && { nombre: mejor.nombre, tamano: mejor.tamano, propia: mejor.propia };
}

/*
 * Precio de 30 monos a una escala que no está cargada (ej. 1:300): sigue la línea de
 * los monos que hay (1:100 $120, 1:150 $110… → cada 50 de escala, $10). Mínimo $10.
 * Igual que kintMonosPrecioEscala_ en Apps Script (lo que se cobra lo calcula el servidor).
 */
export function precioMonosEscala(productos: { nombre: string; precio: number; variantes?: string[] }[], escala: number) {
  const vistos = new Set<number>();
  const puntos = productos
    .filter((p) => pideColor(p.nombre) && p.precio > 0 && !(p.variantes ?? []).length)
    .map((p) => ({ e: numeroEscala(p.nombre), p: p.precio }))
    .filter((punto) => punto.e > 0 && !vistos.has(punto.e) && Boolean(vistos.add(punto.e)))
    .sort((a, b) => a.e - b.e);
  if (!escala || !puntos.length) return 0;
  if (puntos.length === 1) return puntos[0].p;
  let a = puntos[0];
  let b = puntos[1];
  if (escala >= puntos[puntos.length - 1].e) {
    a = puntos[puntos.length - 2];
    b = puntos[puntos.length - 1];
  } else if (escala > puntos[0].e) {
    for (let i = 0; i < puntos.length - 1; i++) {
      if (escala >= puntos[i].e && escala <= puntos[i + 1].e) {
        a = puntos[i];
        b = puntos[i + 1];
        break;
      }
    }
  }
  return Math.max(10, Math.round(a.p + ((escala - a.e) * (b.p - a.p)) / (b.e - a.e)));
}

/* ------------------------------------------------------------------ */
/* Monos a medida: un producto «Monos…» sin escala en el nombre.        */
/* Eligen escala, color y cuántos monos; el precio sale de la escala.   */
/* Igual que kintMonosPrecio30_ en Apps Script (que es el que cobra).   */
/* ------------------------------------------------------------------ */

export const MONOS_POR_PAQUETE = 30; // los precios de Configuración son por 30 monos
export const MONOS_MAXIMO = 200; // monos por línea
export const MONOS_PASO = 10; // el + y el − suman/restan de a 10
export const ESCALAS_MONOS = [50, 75, 100, 125, 150, 200, 250, 500];

export type PreciosMonos = { base: number; paso: number; minimo: number };
export const PRECIOS_MONOS_DEFECTO: PreciosMonos = { base: 120, paso: 10, minimo: 40 };

export function esMonosAMedida(nombre: string) {
  return pideColor(nombre) && !numeroEscala(nombre);
}

/* Configuración (monos_precio, monos_baja_cada_50, monos_precio_minimo) → precios. */
export function preciosMonosDesdeConfig(configuracion: Record<string, { valor?: unknown } | undefined> | null | undefined): PreciosMonos {
  const numero = (clave: string, defecto: number) => {
    const valor = Number(configuracion?.[clave]?.valor);
    return valor > 0 ? valor : defecto;
  };
  return {
    base: numero("monos_precio", PRECIOS_MONOS_DEFECTO.base),
    paso: numero("monos_baja_cada_50", PRECIOS_MONOS_DEFECTO.paso),
    minimo: numero("monos_precio_minimo", PRECIOS_MONOS_DEFECTO.minimo),
  };
}

/*
 * Precio de 30 monos a 1:escala: de 1:100 para arriba baja «paso» cada 50 (sin bajar del mínimo);
 * más grandes que 1:100 crece con el plástico: base × (100 / escala)² (1:50 → 4 veces).
 */
export function precioMonos30(precios: PreciosMonos, escala: number) {
  const n = Number(escala) || 100;
  const precio = n >= 100 ? Math.max(precios.minimo, precios.base - ((n - 100) / 50) * precios.paso) : precios.base * (100 / n) ** 2;
  return Math.round(precio);
}

/* Total de «cantidad» monos, en pesos enteros (lo mismo que cobra Apps Script). */
export function totalMonos(precios: PreciosMonos, escala: number, cantidad: number) {
  return Math.round((precioMonos30(precios, escala) * cantidad) / MONOS_POR_PAQUETE);
}

/* Precio de un mono (lo que se cobra por unidad), con centavos. */
export function precioMono(precios: PreciosMonos, escala: number) {
  return Math.round((precioMonos30(precios, escala) / MONOS_POR_PAQUETE) * 100) / 100;
}

/* Colores con su tono (para pintar el botón del color): Configuración › filamento_* (color: #hex). */
export function coloresConTonoDesdeConfig(configuracion: Record<string, { valor?: unknown; comentario?: unknown }>) {
  return Object.entries(configuracion || {})
    .filter(([clave, opcion]) => clave.startsWith("filamento_") && ["habilitada", "habilitado", "sí", "si"].includes(String(opcion?.valor || "").trim().toLowerCase()))
    .map(([clave, opcion]) => {
      const extras = extrasFilamento(String(opcion?.comentario || ""));
      const deClave = clave
        .replace(/^filamento_/, "")
        .split("_")
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(" ");
      return {
        nombre: extras.nombre || deClave,
        tono: extras.color || colorFilamento(deClave),
        foto: extras.foto || fotoFilamento(deClave)?.mini || "",
        orden: extras.orden ?? Infinity,
      };
    })
    .sort((a, b) => a.orden - b.orden)
    .map(({ nombre, tono, foto }) => ({ nombre, tono, foto }));
}

export type ColorMonos = { nombre: string; tono: string; foto: string };
