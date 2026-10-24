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
  // Caras dadas vuelta: dos caras vecinas que recorren el borde para el mismo lado.
  alReves: GrupoProblema;
};

export type ResultadoReparacion = {
  geometria: THREE.BufferGeometry;
  // Triángulos nuevos (tapas de agujeros), para pintarlos en el visor.
  parches: Float32Array;
  aplastadosQuitados: number;
  duplicadosQuitados: number;
  carasDoblesQuitadas: number;
  carasDadasVuelta: number;
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
    return { tolerancia, agujeros: { ...vacio, lazos: 0 }, pegadas: vacio, aplastados: vacio, alReves: vacio };
  }

  // desde = de qué vértice sale el primer triángulo que usa el borde; iguales = otro va para el mismo lado.
  const aristas = new Map<string, { a: number; b: number; n: number; desde: number; iguales: number }>();
  const puntosAplastados: number[] = [];
  const areaMinima = tamano * tamano * 1e-12;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  const sumar = (a: number, b: number) => {
    const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
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

/*
 * Reparación automática (de verdad):
 *   1. une vértices sueltos y saca triángulos aplastados y repetidos;
 *   2. saca las caras dobles (dos caras iguales enfrentadas: típico de
 *      grupos pegados en SketchUp);
 *   3. da vuelta las caras que quedaron al revés, para que todas miren
 *      para afuera (las "caras azules" de SketchUp);
 *   4. tapa todos los agujeros, también los de forma irregular.
 * Devuelve los triángulos nuevos (parches) para pintarlos en el visor.
 * Las piezas que se tocan por un borde no se tocan: el laminador las une.
 */
export function repararMalla(geometria: THREE.BufferGeometry): ResultadoReparacion {
  const tamano = diagonal(geometria);
  const indexada = soldar(geometria, tamano * 1e-6);
  const posiciones = indexada.getAttribute("position");
  const idx = indexada.getIndex()!.array;
  const areaMinima = tamano * tamano * 1e-12;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  // --- 1 y 2: aplastados, repetidos y caras dobles ---
  const lista: [number, number, number][] = [];
  const quitar = new Set<number>();
  const porClave = new Map<string, number>();
  let aplastadosQuitados = 0;
  let duplicadosQuitados = 0;
  let carasDoblesQuitadas = 0;
  // Misma terna empezando por el menor índice: así se comparan orientaciones.
  const canonica = (t: [number, number, number]) => {
    const m = t.indexOf(Math.min(...t));
    return [t[m], t[(m + 1) % 3], t[(m + 2) % 3]];
  };

  for (let i = 0; i + 2 < idx.length; i += 3) {
    const t: [number, number, number] = [Number(idx[i]), Number(idx[i + 1]), Number(idx[i + 2])];
    A.fromBufferAttribute(posiciones, t[0]);
    B.fromBufferAttribute(posiciones, t[1]);
    C.fromBufferAttribute(posiciones, t[2]);
    if (t[0] === t[1] || t[1] === t[2] || t[2] === t[0] || ab.subVectors(B, A).cross(ac.subVectors(C, A)).length() / 2 <= areaMinima) {
      aplastadosQuitados++;
      continue;
    }
    const clave = [...t].sort((x, y) => x - y).join("-");
    const otra = porClave.get(clave);
    if (otra !== undefined) {
      if (quitar.has(otra)) {
        duplicadosQuitados++;
        continue;
      }
      const c1 = canonica(lista[otra]), c2 = canonica(t);
      if (c1[1] === c2[1]) {
        duplicadosQuitados++;
      } else {
        // Enfrentadas: las dos sobran (cara de espesor cero entre dos piezas).
        quitar.add(otra);
        carasDoblesQuitadas += 2;
      }
      continue;
    }
    porClave.set(clave, lista.length);
    lista.push(t);
  }
  const tris = lista.filter((_, i) => !quitar.has(i));

  // --- 3: orientación pareja dentro de cada pieza ---
  const claveArista = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const porArista = new Map<string, number[]>();
  tris.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      const c = claveArista(t[k], t[(k + 1) % 3]);
      (porArista.get(c) || porArista.set(c, []).get(c)!).push(i);
    }
  });
  const tieneArista = (t: [number, number, number], a: number, b: number) =>
    (t[0] === a && t[1] === b) || (t[1] === a && t[2] === b) || (t[2] === a && t[0] === b);
  let carasDadasVuelta = 0;
  const visitado = new Uint8Array(tris.length);
  for (let inicio = 0; inicio < tris.length; inicio++) {
    if (visitado[inicio]) continue;
    visitado[inicio] = 1;
    const pila = [inicio];
    while (pila.length) {
      const i = pila.pop()!;
      const t = tris[i];
      for (let k = 0; k < 3; k++) {
        const a = t[k], b = t[(k + 1) % 3];
        const vecinos = porArista.get(claveArista(a, b))!;
        if (vecinos.length !== 2) continue; // solo por bordes "sanos"
        const j = vecinos[0] === i ? vecinos[1] : vecinos[0];
        if (visitado[j]) continue;
        visitado[j] = 1;
        // El vecino tiene que recorrer el borde al revés (b → a).
        if (tieneArista(tris[j], a, b)) {
          tris[j] = [tris[j][0], tris[j][2], tris[j][1]];
          carasDadasVuelta++;
        }
        pila.push(j);
      }
    }
  }

  // --- 4: tapar agujeros (bordes que usa un solo triángulo) ---
  const usos = new Map<string, number>();
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const c = claveArista(t[k], t[(k + 1) % 3]);
    usos.set(c, (usos.get(c) || 0) + 1);
  }
  const salientes = new Map<number, number[]>(); // b → [a…]: el parche recorre el borde al revés
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3];
    if (usos.get(claveArista(a, b)) === 1) (salientes.get(b) || salientes.set(b, []).get(b)!).push(a);
  }

  const nuevas: number[] = Array.from(posiciones.array as ArrayLike<number>);
  const parches: [number, number, number][] = [];
  let agujerosTapados = 0;
  const tomar = (v: number) => {
    const lista = salientes.get(v);
    if (!lista || !lista.length) return undefined;
    return lista.pop();
  };
  salientes.forEach((_, inicio) => {
    while ((salientes.get(inicio) || []).length) {
      const lazo = [inicio];
      let actual = tomar(inicio);
      while (actual !== undefined && actual !== inicio && lazo.length < 20000) {
        lazo.push(actual);
        actual = tomar(actual);
      }
      if (actual !== inicio || lazo.length < 3) continue; // borde suelto: no se puede cerrar
      let x = 0, y = 0, z = 0;
      for (const v of lazo) {
        x += nuevas[v * 3]; y += nuevas[v * 3 + 1]; z += nuevas[v * 3 + 2];
      }
      const centro = nuevas.length / 3;
      nuevas.push(x / lazo.length, y / lazo.length, z / lazo.length);
      for (let i = 0; i < lazo.length; i++) parches.push([lazo[i], lazo[(i + 1) % lazo.length], centro]);
      agujerosTapados++;
    }
  });

  // --- Cada pieza cerrada, mirando para afuera (volumen positivo) ---
  const todos = [...tris, ...parches];
  const padre = new Int32Array(nuevas.length / 3);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) { padre[v] = padre[padre[v]]; v = padre[v]; }
    return v;
  };
  for (const t of todos) {
    const r0 = raiz(t[0]), r1 = raiz(t[1]), r2 = raiz(t[2]);
    padre[r1] = r0;
    padre[raiz(r2)] = raiz(r0);
  }
  const volumen = new Map<number, number>();
  const punto = (v: number) => new THREE.Vector3(nuevas[v * 3], nuevas[v * 3 + 1], nuevas[v * 3 + 2]);
  for (const t of todos) {
    const r = raiz(t[0]);
    volumen.set(r, (volumen.get(r) || 0) + punto(t[0]).dot(punto(t[1]).cross(punto(t[2]))) / 6);
  }
  const darVuelta = (t: [number, number, number]): [number, number, number] => [t[0], t[2], t[1]];
  for (let i = 0; i < todos.length; i++) {
    if ((volumen.get(raiz(todos[i][0])) || 0) < 0) {
      todos[i] = darVuelta(todos[i]);
      if (i < tris.length) carasDadasVuelta++;
    }
  }

  // --- Geometría final (y los parches aparte, para pintarlos) ---
  const aPosiciones = (lista: [number, number, number][]) => {
    const salida = new Float32Array(lista.length * 9);
    lista.forEach((t, i) => {
      for (let k = 0; k < 3; k++) {
        salida[i * 9 + k * 3] = nuevas[t[k] * 3];
        salida[i * 9 + k * 3 + 1] = nuevas[t[k] * 3 + 1];
        salida[i * 9 + k * 3 + 2] = nuevas[t[k] * 3 + 2];
      }
    });
    return salida;
  };
  const final = new THREE.BufferGeometry();
  final.setAttribute("position", new THREE.BufferAttribute(aPosiciones(todos), 3));
  final.computeVertexNormals();
  indexada.dispose();

  return {
    geometria: final,
    parches: aPosiciones(todos.slice(tris.length)),
    aplastadosQuitados,
    duplicadosQuitados,
    carasDoblesQuitadas,
    carasDadasVuelta,
    agujerosTapados,
  };
}
