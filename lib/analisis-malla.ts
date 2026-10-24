import * as THREE from "three";

/*
 * Análisis y reparación de mallas STL para el visor 3D (/preparador-3d).
 *
 * La tolerancia depende del tamaño del modelo (no de la unidad): un archivo
 * en metros y el mismo en milímetros dan el mismo resultado.
 *
 *   agujeros   = bordes que usa un solo triángulo (falta una cara)
 *   pegadas    = bordes que usan 3 o más triángulos (piezas que se tocan por
 *                una arista, caras internas): el laminador casi siempre las une
 *   aplastados = triángulos sin superficie: el laminador los ignora
 */

export type ZonaProblema = {
  centro: [number, number, number]; // coordenadas del archivo
  radio: number;
  cantidad: number;
};

export type GrupoProblema = { cantidad: number; zonas: ZonaProblema[] };

export type AnalisisMalla = {
  tolerancia: number;
  agujeros: GrupoProblema & { lazos: number };
  pegadas: GrupoProblema;
  aplastados: GrupoProblema;
  // Caras dadas vuelta: dos caras vecinas que recorren el borde para el mismo lado.
  alReves: GrupoProblema;
};

export function diagonal(geometria: THREE.BufferGeometry) {
  geometria.computeBoundingBox();
  const caja = geometria.boundingBox;
  return caja ? Math.max(caja.getSize(new THREE.Vector3()).length(), 1e-9) : 1;
}

/* Une vértices repetidos con una tolerancia relativa al tamaño del modelo. */
export function soldar(geometria: THREE.BufferGeometry, tolerancia: number) {
  // Tabla hash propia (grilla de la tolerancia): rápida con millones de vértices.
  const posicion = geometria.getAttribute("position");
  const original = geometria.getIndex();
  const n = posicion.count;
  geometria.computeBoundingBox();
  const min = geometria.boundingBox!.min;
  const paso = Math.max(tolerancia, 1e-12);
  let capacidad = 1;
  while (capacidad < n * 2) capacidad <<= 1;
  const mascara = capacidad - 1;
  const tabla = new Int32Array(capacidad).fill(-1);
  const claves = new Int32Array(n * 3);
  const salida = new Float32Array(n * 3);
  const nuevoDe = new Uint32Array(n);
  let unicos = 0;
  for (let i = 0; i < n; i++) {
    const x = posicion.getX(i), y = posicion.getY(i), z = posicion.getZ(i);
    const ix = Math.round((x - min.x) / paso), iy = Math.round((y - min.y) / paso), iz = Math.round((z - min.z) / paso);
    let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & mascara;
    for (;;) {
      const v = tabla[h];
      if (v < 0) {
        tabla[h] = unicos;
        claves[unicos * 3] = ix; claves[unicos * 3 + 1] = iy; claves[unicos * 3 + 2] = iz;
        salida[unicos * 3] = x; salida[unicos * 3 + 1] = y; salida[unicos * 3 + 2] = z;
        nuevoDe[i] = unicos++;
        break;
      }
      if (claves[v * 3] === ix && claves[v * 3 + 1] === iy && claves[v * 3 + 2] === iz) {
        nuevoDe[i] = v;
        break;
      }
      h = (h + 1) & mascara;
    }
  }
  const indice = new Uint32Array(original ? original.count : n);
  for (let i = 0; i < indice.length; i++) indice[i] = nuevoDe[original ? original.getX(i) : i];
  const indexada = new THREE.BufferGeometry();
  indexada.setAttribute("position", new THREE.BufferAttribute(salida.slice(0, unicos * 3), 3));
  indexada.setIndex(new THREE.BufferAttribute(indice, 1));
  return indexada;
}

/* Agrupa puntos en zonas (celdas de 1/25 del modelo), de la más cargada a la menos. */
function agruparEnZonas(puntos: number[], tamanoModelo: number): ZonaProblema[] {
  const celda = Math.max(tamanoModelo / 25, 1e-9);
  const zonas = new Map<string, { x: number; y: number; z: number; n: number; min: THREE.Vector3; max: THREE.Vector3 }>();
  for (let i = 0; i + 2 < puntos.length; i += 3) {
    const x = puntos[i], y = puntos[i + 1], z = puntos[i + 2];
    const clave = `${Math.floor(x / celda)}|${Math.floor(y / celda)}|${Math.floor(z / celda)}`;
    const zona = zonas.get(clave);
    if (zona) {
      zona.x += x; zona.y += y; zona.z += z; zona.n++;
      zona.min.min(new THREE.Vector3(x, y, z));
      zona.max.max(new THREE.Vector3(x, y, z));
    } else {
      zonas.set(clave, { x, y, z, n: 1, min: new THREE.Vector3(x, y, z), max: new THREE.Vector3(x, y, z) });
    }
  }
  return [...zonas.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 40)
    .map((zona) => ({
      centro: [zona.x / zona.n, zona.y / zona.n, zona.z / zona.n] as [number, number, number],
      radio: Math.max(zona.max.distanceTo(zona.min) / 2, celda / 2),
      cantidad: zona.n,
    }));
}

export function analizarMalla(geometria: THREE.BufferGeometry): AnalisisMalla {
  const tamano = diagonal(geometria);
  const tolerancia = tamano * 1e-6;
  const indexada = soldar(geometria, tolerancia);
  const indice = indexada.getIndex();
  const posiciones = indexada.getAttribute("position");
  const vacio = { cantidad: 0, zonas: [] };
  if (!indice || !posiciones) {
    indexada.dispose();
    return { tolerancia, agujeros: { ...vacio, lazos: 0 }, pegadas: vacio, aplastados: vacio, alReves: vacio };
  }

  // desde = de qué vértice sale el primer triángulo que usa el borde; iguales = otro va para el mismo lado.
  const aristas = new Map<number, { a: number; b: number; n: number; desde: number; iguales: number }>();
  const puntosAplastados: number[] = [];
  const areaMinima = tamano * tamano * 1e-12;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  const sumar = (a: number, b: number) => {
    const clave = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    const arista = aristas.get(clave);
    if (arista) {
      arista.n++;
      if (arista.desde === a) arista.iguales++;
    } else aristas.set(clave, { a, b, n: 1, desde: a, iguales: 0 });
  };

  const idx = indice.array;
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = Number(idx[i]), b = Number(idx[i + 1]), c = Number(idx[i + 2]);
    A.fromBufferAttribute(posiciones, a);
    B.fromBufferAttribute(posiciones, b);
    C.fromBufferAttribute(posiciones, c);
    const area = ab.subVectors(B, A).cross(ac.subVectors(C, A)).length() / 2;
    if (a === b || b === c || c === a || area <= areaMinima) {
      puntosAplastados.push((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3, (A.z + B.z + C.z) / 3);
      continue;
    }
    sumar(a, b);
    sumar(b, c);
    sumar(c, a);
  }

  const puntosAgujeros: number[] = [];
  const puntosPegadas: number[] = [];
  let agujeros = 0;
  let pegadas = 0;
  const vecinosBorde = new Map<number, number[]>();
  const puntosAlReves: number[] = [];
  aristas.forEach(({ a, b, n, iguales }) => {
    if (n === 2 && iguales > 0) {
      A.fromBufferAttribute(posiciones, a);
      B.fromBufferAttribute(posiciones, b);
      puntosAlReves.push((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    }
    if (n === 1) {
      agujeros++;
      A.fromBufferAttribute(posiciones, a);
      B.fromBufferAttribute(posiciones, b);
      puntosAgujeros.push((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      (vecinosBorde.get(a) || vecinosBorde.set(a, []).get(a)!).push(b);
      (vecinosBorde.get(b) || vecinosBorde.set(b, []).get(b)!).push(a);
    } else if (n > 2) {
      pegadas++;
      A.fromBufferAttribute(posiciones, a);
      B.fromBufferAttribute(posiciones, b);
      puntosPegadas.push((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    }
  });

  // Cada agujero (bordes abiertos conectados entre sí) es una zona, centrada en el hueco.
  let lazos = 0;
  const zonasAgujeros: ZonaProblema[] = [];
  const visto = new Set<number>();
  vecinosBorde.forEach((_, inicio) => {
    if (visto.has(inicio)) return;
    lazos++;
    const pila = [inicio];
    const vertices: number[] = [];
    visto.add(inicio);
    while (pila.length) {
      const actual = pila.pop()!;
      vertices.push(actual);
      for (const vecino of vecinosBorde.get(actual) || []) {
        if (!visto.has(vecino)) {
          visto.add(vecino);
          pila.push(vecino);
        }
      }
    }
    const caja = new THREE.Box3();
    for (const v of vertices) caja.expandByPoint(A.fromBufferAttribute(posiciones, v));
    const centro = caja.getCenter(new THREE.Vector3());
    zonasAgujeros.push({
      centro: [centro.x, centro.y, centro.z],
      radio: Math.max(caja.getSize(new THREE.Vector3()).length() / 2, tamano / 200),
      cantidad: vertices.length,
    });
  });
  zonasAgujeros.sort((a, b) => b.cantidad - a.cantidad);

  indexada.dispose();
  return {
    tolerancia,
    agujeros: { cantidad: agujeros, lazos, zonas: zonasAgujeros.slice(0, 40) },
    pegadas: { cantidad: pegadas, zonas: agruparEnZonas(puntosPegadas, tamano) },
    aplastados: { cantidad: puntosAplastados.length / 3, zonas: agruparEnZonas(puntosAplastados, tamano) },
    alReves: { cantidad: puntosAlReves.length / 3, zonas: agruparEnZonas(puntosAlReves, tamano) },
  };
}
