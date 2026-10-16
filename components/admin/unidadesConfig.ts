/*
 * Unidad que se muestra junto a cada número de Configuración
 * ("%" a la izquierda, "días" a la derecha, etc.), para que "5" no
 * sea ambiguo.
 *
 * Primero se mira EXCEPCIONES (por clave, fácil de editar); si la
 * clave no está, se adivina por el texto de la etiqueta, la clave,
 * la descripción del panel y el comentario de la hoja.
 */

export type UnidadConfig = {
  prefijo?: string; // va antes del número: "%", "$", "pts"
  sufijo?: string; // va después: "días", "hs", "unidades"
};

/* Clave → unidad. {} = sin unidad aunque el texto sugiera otra cosa. */
export const EXCEPCIONES_UNIDAD: Record<string, UnidadConfig> = {
  pedido_urgente_cupos: { sufijo: "cupos" },
  pedidos_por_mayor: { sufijo: "unidades" },
  gran_pedido_por_mayor: { sufijo: "unidades" },
  puntos_valor: { prefijo: "$" },
  puntos_minimo_uso: { prefijo: "pts" },
  armado_precio_maximo: { prefijo: "$" },
  armado_precio_minimo: { prefijo: "$" },
};

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/_/g, " ");
}

/*
 * Orden de las reglas (la primera que coincide gana):
 * 1. % (porcentaje, descuento, seña, recargo)
 * 2. sufijos de cantidad (unidades, días, horas): van antes que "$"
 *    porque "desde cuántas unidades se cobra el precio…" es una cantidad.
 * 3. $ (pesos, precio, valor, costo, monto)
 * 4. pts (puntos que no son ni % ni $)
 */
export function unidadPorTexto(textos: string[]): UnidadConfig {
  const texto = normalizar(textos.join(" "));

  if (/%|\bporcentaje|\bdescuento|\bsena\b|\brecargo/.test(texto)) {
    return { prefijo: "%" };
  }
  if (/\bunidades?\b/.test(texto)) return { sufijo: "unidades" };
  if (/\bdias?\b|\bvencimiento\b/.test(texto)) return { sufijo: "días" };
  if (/\bhoras?\b|\bhs\b/.test(texto)) return { sufijo: "hs" };
  if (/\bpesos?\b|\bprecios?\b|\bvalor\b|\bcostos?\b|\bmontos?\b/.test(texto)) {
    return { prefijo: "$" };
  }
  if (/\bpuntos?\b|\bpts\b/.test(texto)) return { prefijo: "pts" };
  return {};
}

/* Solo para números (y claves de EXCEPCIONES, ej. precios que hoy están vacíos). */
export function unidadConfig(
  fila: { clave: string; etiqueta: string; comentario: string; tipo: string },
  descripcion: string
): UnidadConfig {
  if (EXCEPCIONES_UNIDAD[fila.clave]) return EXCEPCIONES_UNIDAD[fila.clave];
  if (fila.tipo !== "numero") return {};
  return unidadPorTexto([fila.etiqueta, fila.clave, descripcion, fila.comentario]);
}
