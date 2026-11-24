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
