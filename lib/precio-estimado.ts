import { perfilNuevo, precioRecomendado } from "@/lib/calculadora";

/*
 * Precio estimado en Cotizar a partir del STL: volumen → gramos → horas
 * → precio recomendado de la Calculadora del panel (lib/calculadora.ts).
 * Es orientativo: el precio final lo pone el dueño en el presupuesto.
 */

/* Volumen (mm³), superficie (mm²) y medidas (mm) de un STL binario o de texto. */
export function medirSTL(buffer: ArrayBuffer) {
  const vista = new DataView(buffer);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let volumen = 0;
  let superficie = 0;

  function triangulo(a: number[], b: number[], c: number[]) {
    volumen +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    superficie += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    for (const punto of [a, b, c]) {
      for (let eje = 0; eje < 3; eje++) {
        if (punto[eje] < min[eje]) min[eje] = punto[eje];
        if (punto[eje] > max[eje]) max[eje] = punto[eje];
      }
    }
  }

  const esBinario = buffer.byteLength >= 84 && 84 + vista.getUint32(80, true) * 50 === buffer.byteLength;
  if (esBinario) {
    const cantidad = vista.getUint32(80, true);
    for (let i = 0; i < cantidad; i++) {
      const base = 84 + i * 50 + 12;
      const punto = (k: number) => [
        vista.getFloat32(base + k * 12, true),
        vista.getFloat32(base + k * 12 + 4, true),
        vista.getFloat32(base + k * 12 + 8, true),
      ];
      triangulo(punto(0), punto(1), punto(2));
    }
  } else {
    const texto = new TextDecoder().decode(buffer);
    const vertices: number[][] = [];
    for (const coincidencia of texto.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) {
      vertices.push([Number(coincidencia[1]), Number(coincidencia[2]), Number(coincidencia[3])]);
    }
    for (let i = 0; i + 2 < vertices.length; i += 3) triangulo(vertices[i], vertices[i + 1], vertices[i + 2]);
  }

  const medidas = max.map((valor, eje) => (Number.isFinite(valor) ? valor - min[eje] : 0));
  return { mm3: Math.abs(volumen), mm2: superficie, medidas };
}

export type Estimacion =
  | { tipo: "precio"; desde: number; hasta: number; gramos: number; horas: number; medidas: number[] }
  | { tipo: "elegiEscala" }
  | { tipo: "sinDatos" };

/*
 * El STL no dice en qué unidades se exportó desde SketchUp. El modelo está
 * en tamaño real (1:1) y en metros (requisitos de Cotizar), así que se prueba
 * primero metros, después milímetros y centímetros: la primera con la que el
 * lado más largo da un tamaño real razonable (de 2 m a 300 m).
 * Ej.: un edificio de 60 m llega como 60 (m) o 60000 (mm).
 */
/*
 * En qué está el archivo: "m" y "mm" = tamaño real (1:1) exportado en esa
 * unidad; "escala" = ya está a escala, listo para imprimir (en mm).
 */
export type UnidadArchivo = "m" | "mm" | "escala";

/* La unidad que se adivina por el tamaño (ver milimetrosPorUnidad). */
export function unidadDetectada(piezas: { medidas: number[] }[]): UnidadArchivo {
  const lado = Math.max(0, ...piezas.map((pieza) => Math.max(...pieza.medidas)));
  return milimetrosPorUnidad(lado) === 1000 ? "m" : "mm";
}

export function milimetrosPorUnidad(lado: number) {
  for (const unidad of [1000, 1, 10]) {
    const metros = (lado * unidad) / 1000;
    if (metros >= 2 && metros <= 300) return unidad;
  }
  return lado < 2 ? 1000 : 1;
}

/*
 * piezas: lo medido de cada STL (en tamaño real). escala: el N de "1:N";
 * 1 = sin escala (pieza que no es maqueta, se toma tal cual en mm);
 * 0 = todavía no eligió: no se calcula nada.
 */
export function estimarPrecio(
  piezas: { mm3: number; mm2: number; medidas: number[] }[],
  escala: number,
  // Sin dato: se adivina por el tamaño.
  unidad?: UnidadArchivo
): Estimacion {
  if (!piezas.length) return { tipo: "sinDatos" };
  const yaAEscala = unidad === "escala" || escala === 1;
  if (!yaAEscala && !(escala >= 1)) return { tipo: "elegiEscala" };

  const ladoModelo = Math.max(...piezas.map((pieza) => Math.max(...pieza.medidas)));
  if (!(ladoModelo > 0)) return { tipo: "sinDatos" };
  const milimetros = unidad === "m" ? 1000 : unidad === "mm" ? 1 : milimetrosPorUnidad(ladoModelo);
  const factor = yaAEscala ? 1 : milimetros / escala;

  let mm3 = 0;
  let mm2 = 0;
  // Medidas finales (a escala, en mm) de la pieza más grande, para mostrarlas.
  let medidas: number[] = [0, 0, 0];
  for (const pieza of piezas) {
    if (!(pieza.mm3 > 0)) return { tipo: "sinDatos" };
    mm3 += pieza.mm3 * factor ** 3;
    mm2 += pieza.mm2 * factor ** 2;
    const finales = pieza.medidas.map((medida) => medida * factor);
    if (Math.max(...finales) > Math.max(...medidas)) medidas = finales;
  }
  // Aunque no entre en la impresora se calcula igual: lo que importa es el costo y el tiempo.

  // Paredes (~0,8 mm) y relleno de ~15%; nunca más que macizo. PLA 1,24 g/cm³. Calibrado con
  // Bambu Studio: edificio a 1:250 (27 × 16 × 15 cm) = 130 g; KNT-0018 = 20 g.
  const cm3 = Math.min(mm3, mm2 * 0.8 + mm3 * 0.15) / 1000;
  const gramos = Math.max(3, Math.round(cm3 * 1.24 * 0.65));
  // H2D: las piezas chicas salen a ~12 g/h y las grandes a ~36 g/h (130 g → 3 h 32 min;
  // 20 g → 1 h 55 min), más la preparación.
  const horas = gramos / Math.min(36, 8 + gramos / 4.5) + 0.3;
  const precio = precioRecomendado(perfilNuevo(), { horas, minutos: 0, gramos, insumos: 0, piezas: 1 });
  if (!(precio > 0)) return { tipo: "sinDatos" };

  // Rango como el que daría el dueño (ej. $500 a $800), con números redondos.
  const redondear = (valor: number) => {
    const paso = valor >= 1000 ? 100 : valor >= 300 ? 50 : 10;
    return Math.max(paso, Math.round(valor / paso) * paso);
  };
  const desde = redondear(precio * 0.85);
  const hasta = Math.max(desde + (desde >= 300 ? 50 : 20), redondear(precio * 1.35));
  return { tipo: "precio", desde, hasta, gramos, horas, medidas };
}

/*
 * Rango con los datos del laminador (horas, minutos, gramos): misma cuenta
 * que «Te recomiendo» de la Calculadora del panel, con insumos de $30
 * (desde) a $100 (hasta). Urgente suma el recargo % de Configuración.
 * Ej.: 1 h 15 min y 20 g → $180 a $390.
 */
export const INSUMOS_DESDE = 30;
export const INSUMOS_HASTA = 100;
/* El tope del rango va 20% más arriba: margen para cobrar más si hace falta. */
export const MARGEN_HASTA = 1.2;

export function rangoPorDatos(datos: { horas: number; minutos: number; gramos: number; recargoUrgente: number }) {
  const horas = Math.max(0, datos.horas || 0);
  const minutos = Math.max(0, datos.minutos || 0);
  const gramos = Math.max(0, datos.gramos || 0);
  if (!(gramos > 0) || !(horas * 60 + minutos > 0)) return null;

  const perfil = perfilNuevo();
  const factor = 1 + Math.max(0, datos.recargoUrgente || 0) / 100;
  const conInsumos = (insumos: number, margen = 1) => {
    const precio = precioRecomendado(perfil, { horas, minutos, gramos, insumos, piezas: 1 }) * factor * margen;
    const paso = precio >= 500 ? 50 : 10;
    return Math.ceil(precio / paso) * paso;
  };

  const desde = conInsumos(INSUMOS_DESDE);
  const hasta = conInsumos(INSUMOS_HASTA, MARGEN_HASTA);
  return desde > 0 ? { desde, hasta: Math.max(desde, hasta) } : null;
}
