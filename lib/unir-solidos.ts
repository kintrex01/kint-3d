import * as THREE from "three";
import { soldar } from "@/lib/analisis-malla";

/*
 * Unir sólidos (como Herramientas de sólidos → Unión en SketchUp): junta
 * todas las piezas cerradas que se tocan o se meten una en otra en un solo
 * sólido, sin caras internas ni superpuestas, y sin cambiar ninguna medida.
 * Usa Manifold (manifold-3d, WASM), que garantiza un resultado cerrado.
 * Las piezas que no están cerradas no se pueden unir: quedan como estaban.
 */

export type ResultadoUnion = {
  geometria: THREE.BufferGeometry;
  piezasUnidas: number; // cerradas que entraron a la unión
  piezasSinCerrar: number; // abiertas: quedan igual
  piezasFinales: number; // sólidos que quedaron después de unir
};

type ModuloManifold = Awaited<ReturnType<typeof import("manifold-3d").default>>;
let modulo: Promise<ModuloManifold> | null = null;

/* Carga Manifold una sola vez (en el navegador, el .wasm se sirve desde /manifold.wasm). */
function cargarManifold() {
  if (!modulo) {
    modulo = import("manifold-3d").then(async ({ default: crear }) => {
      const enNavegador = typeof window !== "undefined";
      const wasm = await crear(enNavegador ? { locateFile: () => "/manifold.wasm" } : undefined);
      wasm.setup();
      return wasm;
    });
  }
  return modulo;
}

export async function unirSolidos(geometria: THREE.BufferGeometry): Promise<ResultadoUnion> {
  const { Manifold, Mesh } = await cargarManifold();
  geometria.computeBoundingBox();
  const tamano = geometria.boundingBox!.getSize(new THREE.Vector3()).length() || 1;
  const indexada = soldar(geometria, tamano * 1e-6);
  const posiciones = indexada.getAttribute("position").array as Float32Array;
  const indice = indexada.getIndex()!.array;
  indexada.dispose();
  const totalTris = indice.length / 3;

  // Cáscaras: triángulos unidos por aristas de exactamente dos caras.
  const porArista = new Map<string, number[]>();
  const clave = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < totalTris; t++) {
    for (let k = 0; k < 3; k++) {
      const c = clave(indice[t * 3 + k], indice[t * 3 + ((k + 1) % 3)]);
      (porArista.get(c) || porArista.set(c, []).get(c)!).push(t);
    }
  }
  const padre = new Int32Array(totalTris).map((_, i) => i);
  const raiz = (v: number): number => {
    while (padre[v] !== v) { padre[v] = padre[padre[v]]; v = padre[v]; }
    return v;
  };
  /*
   * Arista de 2 caras: se unen. Arista de 4 o más (dos muros que se tocan por una
   * arista): alrededor de la arista, cada cara se une con la próxima que encuentra
   * girando hacia su adentro, que es la que cierra su propio sólido.
   */
  const punto = (v: number) => new THREE.Vector3(posiciones[v * 3], posiciones[v * 3 + 1], posiciones[v * 3 + 2]);
  porArista.forEach((lista, c) => {
    if (lista.length === 2) {
      padre[raiz(lista[1])] = raiz(lista[0]);
      return;
    }
    if (lista.length < 2) return;
    const [ia, ib] = c.split("_").map(Number);
    const a = punto(ia), e = punto(ib).sub(a).normalize();
    const u = Math.abs(e.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    u.sub(e.clone().multiplyScalar(u.dot(e))).normalize();
    const w = e.clone().cross(u);
    const caras = lista.map((t) => {
      const v0 = indice[t * 3], v1 = indice[t * 3 + 1], v2 = indice[t * 3 + 2];
      const tercero = [v0, v1, v2].find((v) => v !== ia && v !== ib)!;
      const d = punto(tercero).sub(a);
      d.sub(e.clone().multiplyScalar(d.dot(e)));
      const angulo = Math.atan2(d.dot(w), d.dot(u));
      const p0 = punto(v0);
      const normal = punto(v1).sub(p0).cross(punto(v2).sub(p0));
      // Hacia dónde está su adentro, girando alrededor de la arista (+1 o -1).
      const sentido = normal.clone().negate().dot(e.clone().cross(d)) > 0 ? 1 : -1;
      return { t, angulo, sentido };
    });
    for (const cara of caras) {
      let mejor = -1, menor = Infinity;
      for (const otra of caras) {
        if (otra === cara) continue;
        let giro = (otra.angulo - cara.angulo) * cara.sentido;
        while (giro <= 1e-9) giro += Math.PI * 2;
        if (giro < menor) { menor = giro; mejor = otra.t; }
      }
      if (mejor >= 0) padre[raiz(mejor)] = raiz(cara.t);
    }
  });
  const cascaras = new Map<number, number[]>();
  for (let t = 0; t < totalTris; t++) (cascaras.get(raiz(t)) || cascaras.set(raiz(t), []).get(raiz(t))!).push(t);

  const solidos: InstanceType<typeof Manifold>[] = [];
  const sueltos: number[] = []; // triángulos de piezas que no se pueden unir
  let piezasSinCerrar = 0;
  cascaras.forEach((tris) => {
    // Cerrada = cada arista la usan exactamente dos triángulos de esta misma pieza.
    const usos = new Map<string, number>();
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const c = clave(indice[t * 3 + k], indice[t * 3 + ((k + 1) % 3)]);
      usos.set(c, (usos.get(c) || 0) + 1);
    }
    let cerrada = true;
    usos.forEach((n) => { if (n % 2 !== 0) cerrada = false; });
    if (cerrada) {
      const nuevoIndice = new Map<number, number>();
      const verts: number[] = [];
      const caras = new Uint32Array(tris.length * 3);
      tris.forEach((t, i) => {
        for (let k = 0; k < 3; k++) {
          const v = indice[t * 3 + k];
          let n = nuevoIndice.get(v);
          if (n === undefined) {
            n = verts.length / 3;
            nuevoIndice.set(v, n);
            verts.push(posiciones[v * 3], posiciones[v * 3 + 1], posiciones[v * 3 + 2]);
          }
          caras[i * 3 + k] = n;
        }
      });
      try {
        const malla = new Mesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: caras });
        malla.merge();
        const solido = new Manifold(malla);
        if (solido.status() === "NoError" && !solido.isEmpty()) {
          // Una pieza dada vuelta (volumen negativo) no llega: Manifold la rechaza o la deja vacía.
          solidos.push(solido);
          return;
        }
        solido.delete();
      } catch {
        // no es un sólido válido: queda como estaba
      }
    }
    piezasSinCerrar++;
    sueltos.push(...tris);
  });

  const salida: number[] = [];
  let piezasFinales = 0;
  if (solidos.length) {
    const union = Manifold.union(solidos);
    const malla = union.getMesh();
    const n = malla.numProp;
    for (let i = 0; i < malla.triVerts.length; i++) {
      const v = malla.triVerts[i];
      salida.push(malla.vertProperties[v * n], malla.vertProperties[v * n + 1], malla.vertProperties[v * n + 2]);
    }
    piezasFinales = union.decompose().length;
    union.delete();
    solidos.forEach((s) => s.delete());
  }
  for (const t of sueltos) for (let k = 0; k < 3; k++) {
    const v = indice[t * 3 + k];
    salida.push(posiciones[v * 3], posiciones[v * 3 + 1], posiciones[v * 3 + 2]);
  }

  const resultado = new THREE.BufferGeometry();
  resultado.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  resultado.computeVertexNormals();
  return { geometria: resultado, piezasUnidas: solidos.length, piezasSinCerrar, piezasFinales: piezasFinales + piezasSinCerrar };
}
