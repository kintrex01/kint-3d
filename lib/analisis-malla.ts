import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

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
};

export type ResultadoReparacion = {
  geometria: THREE.BufferGeometry;
  aplastadosQuitados: number;
  duplicadosQuitados: number;
  agujerosTapados: number;
};

function diagonal(geometria: THREE.BufferGeometry) {
  geometria.computeBoundingBox();
  const caja = geometria.boundingBox;
  return caja ? Math.max(caja.getSize(new THREE.Vector3()).length(), 1e-9) : 1;
}

/* Une vértices repetidos con una tolerancia relativa al tamaño del modelo. */
function soldar(geometria: THREE.BufferGeometry, tolerancia: number) {
  const copia = new THREE.BufferGeometry();
  copia.setAttribute("position", geometria.getAttribute("position").clone());
  if (geometria.getIndex()) copia.setIndex(geometria.getIndex()!.clone());
  const indexada = BufferGeometryUtils.mergeVertices(copia, tolerancia);
  if (indexada !== copia) copia.dispose();
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
    return { tolerancia, agujeros: { ...vacio, lazos: 0 }, pegadas: vacio, aplastados: vacio };
  }

  const aristas = new Map<string, { a: number; b: number; n: number }>();
  const puntosAplastados: number[] = [];
  const areaMinima = tamano * tamano * 1e-12;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  const sumar = (a: number, b: number) => {
    const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
    const arista = aristas.get(clave);
    if (arista) arista.n++;
    else aristas.set(clave, { a, b, n: 1 });
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
  aristas.forEach(({ a, b, n }) => {
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
  };
}

/*
 * Reparación automática: une vértices, saca triángulos aplastados y
 * repetidos, y tapa los agujeros (cada borde abierto se cierra con un
 * abanico de triángulos hacia el centro del agujero). Las piezas pegadas
 * no se tocan: eso se corrige en SketchUp.
 */
export function repararMalla(geometria: THREE.BufferGeometry): ResultadoReparacion {
  const tamano = diagonal(geometria);
  const indexada = soldar(geometria, tamano * 1e-6);
  const posiciones = indexada.getAttribute("position");
  const idx = indexada.getIndex()!.array;
  const areaMinima = tamano * tamano * 1e-12;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  const triangulos: number[] = [];
  const vistos = new Set<string>();
  let aplastadosQuitados = 0;
  let duplicadosQuitados = 0;

  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = Number(idx[i]), b = Number(idx[i + 1]), c = Number(idx[i + 2]);
    A.fromBufferAttribute(posiciones, a);
    B.fromBufferAttribute(posiciones, b);
    C.fromBufferAttribute(posiciones, c);
    if (a === b || b === c || c === a || ab.subVectors(B, A).cross(ac.subVectors(C, A)).length() / 2 <= areaMinima) {
      aplastadosQuitados++;
      continue;
    }
    const clave = [a, b, c].sort((x, y) => x - y).join("-");
    if (vistos.has(clave)) {
      duplicadosQuitados++;
      continue;
    }
    vistos.add(clave);
    triangulos.push(a, b, c);
  }

  // Bordes abiertos con su sentido: el triángulo nuevo va del otro lado (b → a).
  const usos = new Map<string, number>();
  const clave = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  for (let i = 0; i < triangulos.length; i += 3) {
    for (const [a, b] of [[triangulos[i], triangulos[i + 1]], [triangulos[i + 1], triangulos[i + 2]], [triangulos[i + 2], triangulos[i]]]) {
      usos.set(clave(a, b), (usos.get(clave(a, b)) || 0) + 1);
    }
  }
  const siguiente = new Map<number, number>(); // borde del agujero: b → a
  for (let i = 0; i < triangulos.length; i += 3) {
    for (const [a, b] of [[triangulos[i], triangulos[i + 1]], [triangulos[i + 1], triangulos[i + 2]], [triangulos[i + 2], triangulos[i]]]) {
      if (usos.get(clave(a, b)) === 1) siguiente.set(b, a);
    }
  }

  const nuevas: number[] = Array.from(posiciones.array as ArrayLike<number>);
  let agujerosTapados = 0;
  const usado = new Set<number>();
  siguiente.forEach((_, inicio) => {
    if (usado.has(inicio)) return;
    const lazo: number[] = [];
    let actual: number | undefined = inicio;
    while (actual !== undefined && !usado.has(actual) && lazo.length < 5000) {
      usado.add(actual);
      lazo.push(actual);
      actual = siguiente.get(actual);
    }
    if (lazo.length < 3 || actual !== inicio) return; // solo agujeros cerrados
    let x = 0, y = 0, z = 0;
    for (const v of lazo) {
      x += posiciones.getX(v); y += posiciones.getY(v); z += posiciones.getZ(v);
    }
    const centro = nuevas.length / 3;
    nuevas.push(x / lazo.length, y / lazo.length, z / lazo.length);
    for (let i = 0; i < lazo.length; i++) {
      triangulos.push(lazo[i], lazo[(i + 1) % lazo.length], centro);
    }
    agujerosTapados++;
  });

  const resultado = new THREE.BufferGeometry();
  resultado.setAttribute("position", new THREE.Float32BufferAttribute(nuevas, 3));
  resultado.setIndex(triangulos);
  const final = resultado.toNonIndexed();
  resultado.dispose();
  indexada.dispose();
  final.computeVertexNormals();
  return { geometria: final, aplastadosQuitados, duplicadosQuitados, agujerosTapados };
}
