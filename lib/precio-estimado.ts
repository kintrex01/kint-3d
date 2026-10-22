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

/* Lado más largo que entra en la impresora (mm). */
const CAMA_MM = 250;

export type Estimacion =
  | { tipo: "precio"; desde: number; hasta: number; gramos: number; horas: number; medidas: number[] }
  | { tipo: "elegiEscala" }
  | { tipo: "muyGrande" }
  | { tipo: "sinDatos" };

/*
 * piezas: lo medido de cada STL. escala: el N de "1:N" (0 si no eligió).
 * Si el archivo no entra en la cama, se asume que está en tamaño real y
 * se achica con la escala elegida.
 */
export function estimarPrecio(piezas: { mm3: number; mm2: number; medidas: number[] }[], escala: number): Estimacion {
  if (!piezas.length) return { tipo: "sinDatos" };

  let mm3 = 0;
  let mm2 = 0;
  // Medidas finales (a escala) de la pieza más grande, para mostrarlas.
  let medidas: number[] = [0, 0, 0];
  for (const pieza of piezas) {
    const lado = Math.max(...pieza.medidas);
    if (!(lado > 0) || !(pieza.mm3 > 0)) return { tipo: "sinDatos" };
    let factor = 1;
    if (lado > CAMA_MM) {
      if (!(escala > 1)) return { tipo: "elegiEscala" };
      factor = 1 / escala;
    }
    if (lado * factor > CAMA_MM * 1.2) return { tipo: "muyGrande" };
    mm3 += pieza.mm3 * factor ** 3;
    mm2 += pieza.mm2 * factor ** 2;
    const finales = pieza.medidas.map((medida) => medida * factor);
    if (Math.max(...finales) > Math.max(...medidas)) medidas = finales;
  }

  // Se imprimen las paredes (~0,8 mm) y un relleno de ~15%; nunca más que macizo. PLA 1,24 g/cm³.
  // (Con el pedido KNT-0018 da 24 g; fueron 20 g.)
  const cm3 = Math.min(mm3, mm2 * 0.8 + mm3 * 0.15) / 1000;
  const gramos = Math.max(3, Math.round(cm3 * 1.24));
  // Las piezas chicas salen a ~10 g/h y las grandes a ~20 g/h (presupuestos reales:
  // 160 g → 7 h 45 min), más la preparación.
  const horas = gramos / Math.min(20, 9 + gramos / 12) + 0.3;
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
