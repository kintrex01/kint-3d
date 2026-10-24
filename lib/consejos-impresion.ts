import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

/*
 * Consejos de impresión para el visor 3D (/preparador-3d), pensados para
 * maquetas de arquitectura. Trabaja en las coordenadas del STL (Z = altura)
 * y recibe cuántos mm reales vale cada unidad (escala del visor).
 *
 *   paradas = piezas finas y altas (fachadas, paneles, muros sueltos):
 *             acostadas se imprimen más rápido, más firmes y sin soportes.
 *   cortes  = alturas donde hay mucha superficie "en el aire" (losas,
 *             voladizos): cortando ahí cada parte apoya en la cama y no
 *             lleva soportes.
 */

export type PiezaParada = {
  centro: [number, number, number]; // coordenadas del archivo
  radio: number;
  alto: number; // mm impresos
  espesor: number; // mm impresos
};

export type ConsejosImpresion = {
  piezas: number;
  paradas: PiezaParada[];
  // Superficie que necesita soporte (mm² impresos) y alturas sugeridas de corte (mm desde la cama).
  areaSoporte: number;
  areaTotal: number;
  cortes: number[];
  altura: number; // mm impresos
};

export function analizarConsejos(geometria: THREE.BufferGeometry, mmPorUnidad: number): ConsejosImpresion {
  geometria.computeBoundingBox();
  const cajaTotal = geometria.boundingBox!;
  const tamano = Math.max(cajaTotal.getSize(new THREE.Vector3()).length(), 1e-9);

  const copia = new THREE.BufferGeometry();
  copia.setAttribute("position", geometria.getAttribute("position").clone());
  const indexada = BufferGeometryUtils.mergeVertices(copia, tamano * 1e-6);
  if (indexada !== copia) copia.dispose();
  const pos = indexada.getAttribute("position");
  const idx = indexada.getIndex()!.array;

  // --- Piezas separadas (vértices conectados por triángulos) ---
  const padre = new Int32Array(pos.count);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) {
      padre[v] = padre[padre[v]];
      v = padre[v];
    }
    return v;
  };
  const unir = (a: number, b: number) => {
    const ra = raiz(a), rb = raiz(b);
    if (ra !== rb) padre[ra] = rb;
  };
  for (let i = 0; i + 2 < idx.length; i += 3) {
    unir(Number(idx[i]), Number(idx[i + 1]));
    unir(Number(idx[i + 1]), Number(idx[i + 2]));
  }

  const cajas = new Map<number, THREE.Box3>();
  const punto = new THREE.Vector3();
  for (let v = 0; v < pos.count; v++) {
    const r = raiz(v);
    let caja = cajas.get(r);
    if (!caja) {
      caja = new THREE.Box3();
      cajas.set(r, caja);
    }
    caja.expandByPoint(punto.fromBufferAttribute(pos, v));
  }

  // --- Piezas paradas: finas en planta y altas ---
  const paradas: PiezaParada[] = [];
  cajas.forEach((caja) => {
    const t = caja.getSize(new THREE.Vector3());
    const espesor = Math.min(t.x, t.y);
    const largo = Math.max(t.x, t.y);
    const alto = t.z;
    const mayor = Math.max(largo, alto);
    // Ignora piezas mínimas (menos del 3% del modelo).
    if (mayor < tamano * 0.03) return;
    if (espesor / mayor < 0.15 && alto >= largo * 0.5 && alto > espesor * 4) {
      const centro = caja.getCenter(new THREE.Vector3());
      paradas.push({
        centro: [centro.x, centro.y, centro.z],
        radio: t.length() / 2,
        alto: alto * mmPorUnidad,
        espesor: espesor * mmPorUnidad,
      });
    }
  });
  paradas.sort((a, b) => b.alto - a.alto);

  // --- Superficie en el aire (mirando hacia abajo, más de 45°) por altura ---
  const zMin = cajaTotal.min.z;
  const alturaArchivo = Math.max(cajaTotal.max.z - zMin, 1e-9);
  const BANDAS = 200;
  const porBanda = new Float64Array(BANDAS);
  const apoyo = alturaArchivo * 0.004; // lo que toca la cama no lleva soporte
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  let areaSoporte = 0;
  let areaTotal = 0;
  const mm2 = mmPorUnidad * mmPorUnidad;

  for (let i = 0; i + 2 < idx.length; i += 3) {
    A.fromBufferAttribute(pos, Number(idx[i]));
    B.fromBufferAttribute(pos, Number(idx[i + 1]));
    C.fromBufferAttribute(pos, Number(idx[i + 2]));
    n.crossVectors(ab.subVectors(B, A), ac.subVectors(C, A));
    const doble = n.length();
    if (!(doble > 0)) continue;
    const area = (doble / 2) * mm2;
    areaTotal += area;
    const nz = n.z / doble;
    const z = Math.min(A.z, B.z, C.z);
    if (nz < -0.7 && z - zMin > apoyo) {
      areaSoporte += area;
      const banda = Math.min(BANDAS - 1, Math.floor(((A.z + B.z + C.z) / 3 - zMin) / alturaArchivo * BANDAS));
      porBanda[banda] += area;
    }
  }

  // Cortes: alturas con mucha superficie en el aire (losas), separadas entre sí.
  const cortes: number[] = [];
  if (areaSoporte > 0) {
    const umbral = Math.max(areaSoporte * 0.06, 25);
    const separacion = Math.max(3, Math.round(BANDAS * 0.04));
    const candidatas = [...porBanda.keys()]
      .filter((b) => porBanda[b] >= umbral)
      .sort((a, b) => porBanda[b] - porBanda[a]);
    for (const banda of candidatas) {
      if (cortes.length >= 12) break;
      if (cortes.some((otra) => Math.abs(otra - banda) < separacion)) continue;
      cortes.push(banda);
    }
  }

  indexada.dispose();
  const altura = alturaArchivo * mmPorUnidad;
  return {
    piezas: cajas.size,
    paradas: paradas.slice(0, 40),
    areaSoporte,
    areaTotal,
    // Cortar justo debajo de cada losa: la losa queda apoyada en la cama.
    cortes: cortes.sort((a, b) => a - b).map((banda) => Math.round(((banda / BANDAS) * altura) * 10) / 10),
    altura,
  };
}
