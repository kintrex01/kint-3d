import * as THREE from "three";
import { soldar } from "@/lib/analisis-malla";
import { paresAlrededor } from "@/lib/reparar-malla";

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

export type OpcionesUnion = {
  /*
   * Hasta cuánto se pega lo que está casi junto (en unidades del archivo). El
   * visor pasa 0,1 mm impresos según la escala; sin escala, una diezmilésima
   * del tamaño del modelo. Dos muros a 2 cm de verdad no se tocan.
   */
  juntarHasta?: number;
};

/*
 * La unión como sólido de Manifold (para cortarla con planos en "Ordenar") y
 * los triángulos de las piezas que no se pudieron unir (abiertas), aparte.
 * Quien la pide la tiene que liberar con union.delete().
 */
export async function solidoUnido(geometria: THREE.BufferGeometry, opciones: OpcionesUnion = {}) {
  const { Manifold, Mesh } = await cargarManifold();
  const { solidos, sueltosPos, piezasSinCerrar } = await armarSolidos(geometria, opciones);
  const union = solidos.length ? Manifold.union(solidos) : null;
  solidos.forEach((solido) => solido.delete());
  return { union, sueltos: sueltosPos, piezasSinCerrar, Mesh };
}

export async function unirSolidos(geometria: THREE.BufferGeometry, opciones: OpcionesUnion = {}): Promise<ResultadoUnion> {
  const { Manifold } = await cargarManifold();
  const { solidos, sueltosPos, piezasSinCerrar } = await armarSolidos(geometria, opciones);
  const salida: number[] = [];
  let piezasFinales = 0;
  if (solidos.length) {
    const union = Manifold.union(solidos);
    salida.push(...trianglesDe(union));
    piezasFinales = union.decompose().length;
    union.delete();
    solidos.forEach((s) => s.delete());
  }
  salida.push(...sueltosPos);
  const resultado = new THREE.BufferGeometry();
  resultado.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  resultado.computeVertexNormals();
  return { geometria: resultado, piezasUnidas: solidos.length, piezasSinCerrar, piezasFinales: piezasFinales + piezasSinCerrar };
}

/* Triángulos (x, y, z sueltos) de un sólido de Manifold. */
export function trianglesDe(solido: { getMesh: () => { numProp: number; triVerts: Uint32Array; vertProperties: Float32Array } }) {
  const malla = solido.getMesh();
  const n = malla.numProp;
  const salida: number[] = [];
  for (let i = 0; i < malla.triVerts.length; i++) {
    const v = malla.triVerts[i];
    salida.push(malla.vertProperties[v * n], malla.vertProperties[v * n + 1], malla.vertProperties[v * n + 2]);
  }
  return salida;
}

async function armarSolidos(geometria: THREE.BufferGeometry, opciones: OpcionesUnion) {
  const { Manifold, Mesh } = await cargarManifold();
  geometria.computeBoundingBox();
  const tamano = geometria.boundingBox!.getSize(new THREE.Vector3()).length() || 1;
  const indexada = soldar(geometria, tamano * 1e-6);
  const posiciones = indexada.getAttribute("position").array as Float32Array;
  const indice = indexada.getIndex()!.array;
  indexada.dispose();
  const totalTris = indice.length / 3;
  const trisIndice: [number, number, number][] = [];
  for (let t = 0; t < totalTris; t++) trisIndice.push([indice[t * 3], indice[t * 3 + 1], indice[t * 3 + 2]]);

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
  porArista.forEach((lista, c) => {
    if (lista.length === 2) {
      padre[raiz(lista[1])] = raiz(lista[0]);
      return;
    }
    if (lista.length < 2) return;
    const [ia, ib] = c.split("_").map(Number);
    // Solo pares que se eligen mutuamente (una pieza rota no se pega a la vecina).
    for (const [x, y] of paresAlrededor(lista, Math.min(ia, ib), Math.max(ia, ib), trisIndice, Array.from(posiciones))) padre[raiz(y)] = raiz(x);
  });
  const cascaras = new Map<number, number[]>();
  for (let t = 0; t < totalTris; t++) (cascaras.get(raiz(t)) || cascaras.set(raiz(t), []).get(raiz(t))!).push(t);

  const solidos: InstanceType<typeof Manifold>[] = [];
  const sueltos: number[] = []; // triángulos de piezas que no se pueden unir
  let piezasSinCerrar = 0;

  // 1) Piezas cerradas, cada una con sus propios vértices (para poder moverlos sin tocar a las demás).
  type Pieza = { verts: number[]; caras: Uint32Array; tris: number[] };
  const cerradas: Pieza[] = [];
  cascaras.forEach((tris) => {
    // Cerrada = cada arista la usan una cantidad par de triángulos de esta misma pieza.
    const usos = new Map<string, number>();
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const c = clave(indice[t * 3 + k], indice[t * 3 + ((k + 1) % 3)]);
      usos.set(c, (usos.get(c) || 0) + 1);
    }
    let cerrada = true;
    usos.forEach((n) => { if (n % 2 !== 0) cerrada = false; });
    if (!cerrada) {
      piezasSinCerrar++;
      sueltos.push(...tris);
      return;
    }
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
    // Mirando para afuera: si el volumen da negativo, la pieza está dada vuelta.
    let volumen = 0;
    for (let i = 0; i < caras.length; i += 3) {
      const [x, y, z] = [caras[i] * 3, caras[i + 1] * 3, caras[i + 2] * 3];
      volumen += (verts[x] * (verts[y + 1] * verts[z + 2] - verts[y + 2] * verts[z + 1]) -
        verts[x + 1] * (verts[y] * verts[z + 2] - verts[y + 2] * verts[z]) +
        verts[x + 2] * (verts[y] * verts[z + 1] - verts[y + 1] * verts[z])) / 6;
    }
    if (volumen < 0) for (let i = 0; i < caras.length; i += 3) [caras[i + 1], caras[i + 2]] = [caras[i + 2], caras[i + 1]];
    cerradas.push({ verts, caras, tris });
  });

  // 2) Lo casi pegado se pega: cada vértice que queda a menos de la tolerancia de una cara
  //    de otra pieza se apoya sobre ella (así se unen sin dejar rajitas ni caras adentro).
  const juntar = opciones.juntarHasta && opciones.juntarHasta > 0 ? opciones.juntarHasta : tamano * 1e-4;
  if (cerradas.length > 1) {
    const celda = Math.max(juntar * 4, tamano / 300);
    const grilla = new Map<string, [number, number][]>(); // celda → [pieza, cara]
    const caja = new THREE.Box3();
    cerradas.forEach((pieza, ip) => {
      for (let i = 0; i < pieza.caras.length; i += 3) {
        caja.makeEmpty();
        for (let k = 0; k < 3; k++) caja.expandByPoint(new THREE.Vector3().fromArray(pieza.verts, pieza.caras[i + k] * 3));
        caja.expandByScalar(juntar);
        for (let x = Math.floor(caja.min.x / celda); x <= Math.floor(caja.max.x / celda); x++)
          for (let y = Math.floor(caja.min.y / celda); y <= Math.floor(caja.max.y / celda); y++)
            for (let z = Math.floor(caja.min.z / celda); z <= Math.floor(caja.max.z / celda); z++) {
              const k = `${x}|${y}|${z}`;
              (grilla.get(k) || grilla.set(k, []).get(k)!).push([ip, i]);
            }
      }
    });
    // Jerarquía: la pieza chica se mueve hacia la grande, nunca al revés (la losa no se corre).
    const tamanoPieza = cerradas.map((pieza) => {
      const c = new THREE.Box3();
      for (let v = 0; v < pieza.verts.length / 3; v++) c.expandByPoint(new THREE.Vector3().fromArray(pieza.verts, v * 3));
      return c.getSize(new THREE.Vector3()).length();
    });
    const mayor = (a: number, b: number) => tamanoPieza[a] > tamanoPieza[b] || (tamanoPieza[a] === tamanoPieza[b] && a < b);

    // a) Esquinas de piezas distintas casi en el mismo lugar: van a la esquina de la pieza más grande.
    const grupos = new Map<string, [number, number][]>();
    const celdaV = juntar * 2;
    cerradas.forEach((pieza, ip) => {
      for (let v = 0; v < pieza.verts.length / 3; v++) {
        const k = [0, 1, 2].map((e) => Math.floor(pieza.verts[v * 3 + e] / celdaV)).join("|");
        (grupos.get(k) || grupos.set(k, []).get(k)!).push([ip, v]);
      }
    });
    const vistos = new Set<string>();
    grupos.forEach((_, k) => {
      const [cx, cy, cz] = k.split("|").map(Number);
      const vecinos: [number, number][] = [];
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) vecinos.push(...(grupos.get(`${cx + x}|${cy + y}|${cz + z}`) || []));
      for (const [ip, v] of grupos.get(k)!) {
        const id = `${ip}:${v}`;
        if (vistos.has(id)) continue;
        const base = cerradas[ip].verts;
        const cerca = vecinos.filter(([op, ov]) => {
          if (op === ip || vistos.has(`${op}:${ov}`)) return false;
          const o = cerradas[op].verts;
          return Math.hypot(o[ov * 3] - base[v * 3], o[ov * 3 + 1] - base[v * 3 + 1], o[ov * 3 + 2] - base[v * 3 + 2]) < juntar;
        });
        if (!cerca.length) continue;
        // Una sola por pieza (nunca se juntan dos vértices de la misma pieza).
        const elegidos = new Map<number, number>([[ip, v]]);
        for (const [op, ov] of cerca) if (!elegidos.has(op)) elegidos.set(op, ov);
        let principal = ip;
        elegidos.forEach((_, op) => { if (mayor(op, principal)) principal = op; });
        const centro = [0, 1, 2].map((e) => cerradas[principal].verts[elegidos.get(principal)! * 3 + e]);
        elegidos.forEach((ov, op) => {
          for (let e = 0; e < 3; e++) cerradas[op].verts[ov * 3 + e] = centro[e];
          vistos.add(`${op}:${ov}`);
        });
      }
    });

    // b) Cada vértice se apoya sobre las caras de otras piezas que tiene muy cerca
    //    (varias pasadas: un vértice en una esquina queda sobre los tres planos).
    const punto = new THREE.Vector3(), cercano = new THREE.Vector3();
    for (let pasada = 0; pasada < 3; pasada++) cerradas.forEach((pieza, ip) => {
      for (let v = 0; v < pieza.verts.length / 3; v++) {
        punto.fromArray(pieza.verts, v * 3);
        const k = `${Math.floor(punto.x / celda)}|${Math.floor(punto.y / celda)}|${Math.floor(punto.z / celda)}`;
        // Se apoya sobre cada cara cercana, de la más cerca a la más lejos; las que ya
        // toca (a menos de una milésima de la tolerancia) no cuentan.
        const yaApoyado = juntar * 1e-3;
        const caras: { d: number; tri: THREE.Triangle }[] = [];
        for (const [otra, i] of grilla.get(k) || []) {
          if (otra === ip || !mayor(otra, ip)) continue; // solo sobre piezas más grandes
          const o = cerradas[otra];
          const cara = new THREE.Triangle(
            new THREE.Vector3().fromArray(o.verts, o.caras[i] * 3),
            new THREE.Vector3().fromArray(o.verts, o.caras[i + 1] * 3),
            new THREE.Vector3().fromArray(o.verts, o.caras[i + 2] * 3)
          );
          const d = cara.closestPointToPoint(punto, cercano).distanceTo(punto);
          if (d > yaApoyado && d < juntar) caras.push({ d, tri: cara });
        }
        caras.sort((x, y) => x.d - y.d);
        let movido = false;
        for (const { tri: cara } of caras) {
          const d = cara.closestPointToPoint(punto, cercano).distanceTo(punto);
          if (d > yaApoyado && d < juntar) {
            punto.copy(cercano);
            movido = true;
          }
        }
        if (movido) punto.toArray(pieza.verts, v * 3);
      }
    });
  }

  // 3) Cada pieza a Manifold; la que no es un sólido válido queda como estaba.
  for (const pieza of cerradas) {
    try {
      const malla = new Mesh({ numProp: 3, vertProperties: new Float32Array(pieza.verts), triVerts: pieza.caras });
      malla.merge();
      const solido = new Manifold(malla);
      if (solido.status() === "NoError" && !solido.isEmpty()) {
        solidos.push(solido);
        continue;
      }
      solido.delete();
    } catch {
      // no es un sólido válido
    }
    piezasSinCerrar++;
    sueltos.push(...pieza.tris);
  }

  const sueltosPos: number[] = [];
  for (const t of sueltos) for (let k = 0; k < 3; k++) {
    const v = indice[t * 3 + k];
    sueltosPos.push(posiciones[v * 3], posiciones[v * 3 + 1], posiciones[v * 3 + 2]);
  }
  return { solidos, sueltosPos, piezasSinCerrar };
}
