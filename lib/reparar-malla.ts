import * as THREE from "three";
import { diagonal, soldar } from "@/lib/analisis-malla";

/*
 * Reparación automática de STL (visor 3D y Cotizar). Pensada para lo que
 * sale de SketchUp, en este orden:
 *   1. une vértices repetidos; saca triángulos aplastados, repetidos y las
 *      caras dobles enfrentadas (grupos pegados);
 *   2. cose: cierra rajas finitas entre caras sueltas y las aristas partidas
 *      de un solo lado (una cara dividida contra una entera);
 *   3. da vuelta las caras al revés (las "caras azules");
 *   4. tapa los agujeros siguiendo su forma (también en L o con islas,
 *      como una losa con patio); si no son planos, en abanico;
 *   5. caras sin espesor: si están dentro de un sólido se sacan; si no
 *      (una fachada, una pared de una sola cara) se les da espesor;
 *   6. cada pieza cerrada queda mirando para afuera.
 * Las tolerancias dependen del tamaño del modelo, no de la unidad.
 */

export type ResultadoReparacion = {
  geometria: THREE.BufferGeometry;
  // Triángulos nuevos (tapas y espesores), para pintarlos en el visor.
  parches: Float32Array;
  aplastadosQuitados: number;
  duplicadosQuitados: number;
  carasDoblesQuitadas: number;
  carasDadasVuelta: number;
  agujerosTapados: number;
  rajasCerradas: number;
  aristasCosidas: number;
  laminasEngrosadas: number;
  carasInternasQuitadas: number;
};

export type OpcionesReparacion = {
  /*
   * "suave" (por defecto, el botón del visor): solo lo que no cambia cómo se
   * ve el modelo. No le da espesor a caras sueltas, no saca caras dobles ni
   * internas, solo tapa huecos chicos y planos, y no da vuelta piezas
   * abiertas. "completo": todo (más agresivo; en modelos de arquitectura de
   * SketchUp deformaba: muros sacados, miles de caras engrosadas).
   */
  modo?: "suave" | "completo";
  // Espesor para las caras sueltas, en unidades del archivo (el visor lo pasa según la escala).
  espesorLamina?: number;
};

type Tri = [number, number, number];

/* Clave de una arista sin sentido (a-b = b-a). */
function claveArista(a: number, b: number) {
  return a < b ? a * 4294967296 + b : b * 4294967296 + a;
}

/* Saca aplastados, repetidos y caras dobles enfrentadas. */
function limpiar(tris: Tri[], P: number[], tamano: number, cuenta: Pick<ResultadoReparacion, "aplastadosQuitados" | "duplicadosQuitados" | "carasDoblesQuitadas">, quitarDobles = true) {
  const areaMinima = tamano * tamano * 1e-12;
  const lista: Tri[] = [];
  const quitar = new Set<number>();
  // Clave: la arista de los dos índices menores; se confirma con el tercero.
  const porClave = new Map<number, number[]>();
  for (const t of tris) {
    const [a, b, c] = t;
    if (a === b || b === c || c === a) {
      cuenta.aplastadosQuitados++;
      continue;
    }
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    if (area <= areaMinima) {
      cuenta.aplastadosQuitados++;
      continue;
    }
    // Misma terna empezando por el menor índice: así se comparan orientaciones.
    const m = a < b ? (a < c ? 0 : 2) : b < c ? 1 : 2;
    const segundo = t[(m + 1) % 3];
    const menor = Math.min(a, b, c), mayor = Math.max(a, b, c), medio = a + b + c - menor - mayor;
    const clave = menor * 4294967296 + medio;
    const candidatas = porClave.get(clave);
    let otra: number | undefined;
    if (candidatas) for (const k of candidatas) {
      const o = lista[k];
      if (Math.max(o[0], o[1], o[2]) === mayor) {
        otra = k;
        break;
      }
    }
    if (otra !== undefined) {
      if (quitar.has(otra)) {
        cuenta.duplicadosQuitados++;
        continue;
      }
      const o = lista[otra];
      const mo = o[0] < o[1] ? (o[0] < o[2] ? 0 : 2) : o[1] < o[2] ? 1 : 2;
      if (o[(mo + 1) % 3] === segundo) cuenta.duplicadosQuitados++;
      else if (!quitarDobles) {
        // Suave: se dejan las dos (un muro de una cara exportado de los dos lados se sigue viendo).
        lista.push(t);
      } else {
        // Enfrentadas: las dos sobran (cara de espesor cero entre dos piezas).
        quitar.add(otra);
        cuenta.carasDoblesQuitadas += 2;
      }
      continue;
    }
    if (candidatas) candidatas.push(lista.length);
    else porClave.set(clave, [lista.length]);
    lista.push(t);
  }
  return lista.filter((_, i) => !quitar.has(i));
}

/*
 * Qué triángulos usa cada arista: tabla hash propia sobre arreglos de números
 * (un Map de JavaScript con millones de aristas es varias veces más lento).
 */
type IndiceAristas = { usos: (a: number, b: number) => number; de: (a: number, b: number) => number[] };

function indiceAristas(tris: Tri[]): IndiceAristas {
  let capacidad = 1;
  while (capacidad < tris.length * 4) capacidad <<= 1;
  const mascara = capacidad - 1;
  const ka = new Int32Array(capacidad).fill(-1), kb = new Int32Array(capacidad);
  const uno = new Int32Array(capacidad), dos = new Int32Array(capacidad), cuenta = new Int32Array(capacidad);
  const mas = new Map<number, number[]>();
  const lugar = (a: number, b: number, crear: boolean) => {
    if (a > b) { const x = a; a = b; b = x; }
    let h = (Math.imul(a, 0x9e3779b1) ^ Math.imul(b + 0x7f4a7c15, 0x85ebca77)) & mascara;
    for (;;) {
      if (ka[h] < 0) {
        if (!crear) return -1;
        ka[h] = a; kb[h] = b;
        return h;
      }
      if (ka[h] === a && kb[h] === b) return h;
      h = (h + 1) & mascara;
    }
  };
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    for (let k = 0; k < 3; k++) {
      const h = lugar(t[k], t[(k + 1) % 3], true);
      const n = cuenta[h]++;
      if (n === 0) uno[h] = i;
      else if (n === 1) dos[h] = i;
      else (mas.get(h) || mas.set(h, []).get(h)!).push(i);
    }
  }
  return {
    usos: (a, b) => {
      const h = lugar(a, b, false);
      return h < 0 ? 0 : cuenta[h];
    },
    de: (a, b) => {
      const h = lugar(a, b, false);
      if (h < 0) return [];
      return cuenta[h] === 1 ? [uno[h]] : [uno[h], dos[h], ...(mas.get(h) || [])];
    },
  };
}

/* Aristas que usa un solo triángulo, con el sentido de ese triángulo. */
function aristasAbiertas(tris: Tri[], indice = indiceAristas(tris)) {
  const abiertas: { a: number; b: number; tri: number }[] = [];
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      if (indice.usos(a, b) === 1) abiertas.push({ a, b, tri: i });
    }
  }
  return abiertas;
}

/*
 * Cáscaras: triángulos unidos por aristas "sanas" (de 2 caras). Un techo de
 * caras sueltas apoyado en una caja es otra cáscara aunque comparta aristas.
 */
function cascaras(tris: Tri[], indice = indiceAristas(tris)) {
  const padre = new Int32Array(tris.length);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) { padre[v] = padre[padre[v]]; v = padre[v]; }
    return v;
  };
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      if (indice.usos(a, b) !== 2) continue;
      const [x, y] = indice.de(a, b);
      if (x === i) padre[raiz(y)] = raiz(x);
    }
  }
  const id = new Int32Array(tris.length);
  for (let i = 0; i < tris.length; i++) id[i] = raiz(i);
  return { id, indice };
}

/*
 * Cose los bordes abiertos: une vértices de borde casi pegados (rajas) y
 * parte las aristas que tienen un vértice de otra cara encima (aristas en T).
 */
function coser(tris: Tri[], P: number[], tamano: number, cuenta: ResultadoReparacion, quitarDobles = true) {
  // Solo las rajas de verdad (micro-cortes de la exportación): en un edificio de 180 m son
  // ~2 mm. Con más, dos muros de SketchUp a 2 cm se pegaban y se estiraban.
  const tol = tamano * 1e-5;
  const tol2 = tol * tol;
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const abiertas = aristasAbiertas(tris);
    if (!abiertas.length) return tris;
    const borde = [...new Set(abiertas.flatMap((e) => [e.a, e.b]))];

    // --- Rajas: cada vértice de borde se junta con uno cercano (sin encadenar) ---
    const vecinos = new Set(abiertas.map((e) => claveArista(e.a, e.b)));
    const celda = (x: number) => Math.floor(x / tol);
    const grilla = new Map<string, number[]>();
    const destino = new Map<number, number>();
    for (const v of borde) {
      const cx = celda(P[v * 3]), cy = celda(P[v * 3 + 1]), cz = celda(P[v * 3 + 2]);
      let elegido = -1;
      for (let dx = -1; dx <= 1 && elegido < 0; dx++) for (let dy = -1; dy <= 1 && elegido < 0; dy++) for (let dz = -1; dz <= 1 && elegido < 0; dz++) {
        for (const u of grilla.get(`${cx + dx}|${cy + dy}|${cz + dz}`) || []) {
          if (vecinos.has(claveArista(u, v))) continue;
          const d = (P[u * 3] - P[v * 3]) ** 2 + (P[u * 3 + 1] - P[v * 3 + 1]) ** 2 + (P[u * 3 + 2] - P[v * 3 + 2]) ** 2;
          if (d <= tol2) {
            elegido = u;
            break;
          }
        }
      }
      if (elegido >= 0) destino.set(v, elegido);
      else {
        const k = `${cx}|${cy}|${cz}`;
        (grilla.get(k) || grilla.set(k, []).get(k)!).push(v);
      }
    }
    if (destino.size) {
      cuenta.rajasCerradas += destino.size;
      const nuevos = tris.map((t) => t.map((v) => destino.get(v) ?? v) as Tri);
      tris = limpiar(nuevos, P, tamano, cuenta, quitarDobles);
      continue;
    }

    // --- Aristas en T: vértices de borde que caen sobre una arista abierta ---
    const paso = Math.max(tamano / 200, tol * 4);
    const celdaT = (x: number) => Math.floor(x / paso);
    const grillaT = new Map<string, number[]>();
    for (const v of borde) {
      const k = `${celdaT(P[v * 3])}|${celdaT(P[v * 3 + 1])}|${celdaT(P[v * 3 + 2])}`;
      (grillaT.get(k) || grillaT.set(k, []).get(k)!).push(v);
    }
    const cortesPorTri = new Map<number, Map<string, { t: number; v: number }[]>>();
    let cortes = 0;
    for (const { a, b, tri } of abiertas) {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
      const dx = P[b * 3] - ax, dy = P[b * 3 + 1] - ay, dz = P[b * 3 + 2] - az;
      const largo2 = dx * dx + dy * dy + dz * dz;
      const pasos = Math.min(Math.ceil(Math.sqrt(largo2) / paso), 4000);
      const candidatos = new Set<number>();
      for (let s = 0; s <= pasos; s++) {
        const f = s / Math.max(pasos, 1);
        const cx = celdaT(ax + dx * f), cy = celdaT(ay + dy * f), cz = celdaT(az + dz * f);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          for (const v of grillaT.get(`${cx + i}|${cy + j}|${cz + k}`) || []) candidatos.add(v);
        }
      }
      const encima: { t: number; v: number }[] = [];
      for (const v of candidatos) {
        if (v === a || v === b) continue;
        const px = P[v * 3] - ax, py = P[v * 3 + 1] - ay, pz = P[v * 3 + 2] - az;
        const t = (px * dx + py * dy + pz * dz) / largo2;
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        const d2 = (px - dx * t) ** 2 + (py - dy * t) ** 2 + (pz - dz * t) ** 2;
        if (d2 <= tol2) encima.push({ t, v });
      }
      if (!encima.length) continue;
      encima.sort((x, y) => x.t - y.t);
      const porArista = cortesPorTri.get(tri) || cortesPorTri.set(tri, new Map()).get(tri)!;
      porArista.set(`${a}>${b}`, encima);
      cortes += encima.length;
    }
    if (!cortes) return tris;
    cuenta.aristasCosidas += cortes;

    // Cada triángulo con aristas partidas pasa a ser un abanico desde su centro.
    const nuevos: Tri[] = [];
    tris.forEach((t, i) => {
      const porArista = cortesPorTri.get(i);
      if (!porArista) {
        nuevos.push(t);
        return;
      }
      const contorno: number[] = [];
      for (let k = 0; k < 3; k++) {
        const a = t[k], b = t[(k + 1) % 3];
        contorno.push(a);
        for (const { v } of porArista.get(`${a}>${b}`) || []) contorno.push(v);
      }
      const centro = P.length / 3;
      P.push(
        (P[t[0] * 3] + P[t[1] * 3] + P[t[2] * 3]) / 3,
        (P[t[0] * 3 + 1] + P[t[1] * 3 + 1] + P[t[2] * 3 + 1]) / 3,
        (P[t[0] * 3 + 2] + P[t[1] * 3 + 2] + P[t[2] * 3 + 2]) / 3
      );
      for (let k = 0; k < contorno.length; k++) nuevos.push([contorno[k], contorno[(k + 1) % contorno.length], centro]);
    });
    tris = nuevos;
  }
  return tris;
}

/* Todas las caras de cada pieza para el mismo lado (las vecinas recorren el borde al revés). */
function orientar(tris: Tri[]) {
  const indice = indiceAristas(tris);
  const tieneArista = (t: Tri, a: number, b: number) =>
    (t[0] === a && t[1] === b) || (t[1] === a && t[2] === b) || (t[2] === a && t[0] === b);
  let dadasVuelta = 0;
  const visitado = new Uint8Array(tris.length);
  for (let inicio = 0; inicio < tris.length; inicio++) {
    if (visitado[inicio]) continue;
    visitado[inicio] = 1;
    const pila = [inicio];
    // Caras de esta pieza y cuáles se dieron vuelta (al final se respeta a la mayoría).
    const pieza: number[] = [];
    const vueltas = new Set<number>();
    while (pila.length) {
      const i = pila.pop()!;
      pieza.push(i);
      const t = tris[i];
      for (let k = 0; k < 3; k++) {
        const a = t[k], b = t[(k + 1) % 3];
        if (indice.usos(a, b) !== 2) continue; // solo por bordes "sanos"
        const vecinos = indice.de(a, b);
        const j = vecinos[0] === i ? vecinos[1] : vecinos[0];
        if (visitado[j]) continue;
        visitado[j] = 1;
        if (tieneArista(tris[j], a, b)) {
          tris[j] = [tris[j][0], tris[j][2], tris[j][1]];
          vueltas.add(j);
        }
        pila.push(j);
      }
    }
    // Si quedó dada vuelta la mayoría, era la primera cara la que estaba al revés:
    // se invierte toda la pieza (así se toca lo menos posible).
    if (vueltas.size * 2 > pieza.length) {
      for (const i of pieza) tris[i] = [tris[i][0], tris[i][2], tris[i][1]];
      dadasVuelta += pieza.length - vueltas.size;
    } else dadasVuelta += vueltas.size;
  }
  return dadasVuelta;
}

/* Lazos de borde, ya en el sentido en que los recorre la tapa. */
function lazosDeBorde(tris: Tri[], cascara: Int32Array, indice: IndiceAristas) {
  // Abierta = la usa un solo triángulo de su cáscara.
  const salientes = new Map<number, number[]>();
  const clave = (c: number, v: number) => c * 4294967296 + v;
  tris.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      const usos = indice.usos(a, b);
      if (usos === 2) continue;
      if (usos > 2 && indice.de(a, b).filter((j) => cascara[j] === cascara[i]).length !== 1) continue;
      const kb = clave(cascara[i], b);
      (salientes.get(kb) || salientes.set(kb, []).get(kb)!).push(a);
    }
  });
  const lazos: { lazo: number[]; cascara: number }[] = [];
  salientes.forEach((_, inicioClave) => {
    const c = Math.floor(inicioClave / 4294967296);
    const inicio = inicioClave - c * 4294967296;
    while ((salientes.get(inicioClave) || []).length) {
      const lazo = [inicio];
      let actual = salientes.get(inicioClave)!.pop();
      while (actual !== undefined && actual !== inicio && lazo.length < 200000) {
        lazo.push(actual);
        actual = salientes.get(clave(c, actual))?.pop();
      }
      if (actual === inicio && lazo.length >= 3) lazos.push({ lazo, cascara: c });
    }
  });
  return lazos;
}

type InfoLazo = { lazo: number[]; cascara: number; normal: THREE.Vector3; centro: THREE.Vector3; area: number; plano: boolean; curvatura: number };

function infoLazo(lazo: number[], cascara: number, P: number[]): InfoLazo {
  const normal = new THREE.Vector3();
  const centro = new THREE.Vector3();
  for (let i = 0; i < lazo.length; i++) {
    const a = lazo[i] * 3, b = lazo[(i + 1) % lazo.length] * 3;
    normal.x += (P[a + 1] - P[b + 1]) * (P[a + 2] + P[b + 2]);
    normal.y += (P[a + 2] - P[b + 2]) * (P[a] + P[b]);
    normal.z += (P[a] - P[b]) * (P[a + 1] + P[b + 1]);
    centro.x += P[a]; centro.y += P[a + 1]; centro.z += P[a + 2];
  }
  centro.divideScalar(lazo.length);
  const area = normal.length() / 2;
  if (area > 0) normal.normalize();
  let lejos = 0, tam = 0;
  for (const v of lazo) {
    const p = new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]).sub(centro);
    lejos = Math.max(lejos, Math.abs(p.dot(normal)));
    tam = Math.max(tam, p.length());
  }
  // curvatura: cuánto se aparta del plano, comparado con su tamaño (0 = plano).
  return { lazo, cascara, normal, centro, area, plano: area > 0 && lejos <= tam * 2e-3, curvatura: tam > 0 ? lejos / tam : 1 };
}

/* Base 2D de un plano. */
function base(normal: THREE.Vector3) {
  const u = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  u.sub(normal.clone().multiplyScalar(u.dot(normal))).normalize();
  const v = normal.clone().cross(u);
  return { u, v };
}

const areaFirmada = (pts: THREE.Vector2[]) => {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y);
  return s / 2;
};

const dentroDe = (p: THREE.Vector2, poligono: THREE.Vector2[]) => {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i], b = poligono[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) adentro = !adentro;
  }
  return adentro;
};

/*
 * Triangula un contorno (con islas) proyectado en su plano. Devuelve null si
 * la proyección se cruza (el área de los triángulos no coincide).
 */
function triangularEnPlano(exterior: number[], islas: number[][], normal: THREE.Vector3, P: number[]): Tri[] | null {
  const { u, v } = base(normal);
  const proyectar = (lazo: number[]) => lazo.map((i) => new THREE.Vector2(
    P[i * 3] * u.x + P[i * 3 + 1] * u.y + P[i * 3 + 2] * u.z,
    P[i * 3] * v.x + P[i * 3 + 1] * v.y + P[i * 3 + 2] * v.z
  ));
  const ext2 = proyectar(exterior);
  const islas2 = islas.map(proyectar);
  const esperado = Math.abs(areaFirmada(ext2)) - islas2.reduce((s, h) => s + Math.abs(areaFirmada(h)), 0);
  if (!(esperado > 0)) return null;
  const indices = [...exterior, ...islas.flat()];
  const puntos = [...ext2, ...islas2.flat()];
  let caras: number[][];
  try {
    caras = THREE.ShapeUtils.triangulateShape(ext2, islas2);
  } catch {
    return null;
  }
  const salida: Tri[] = [];
  let suma = 0;
  for (const [a, b, c] of caras) {
    const s = areaFirmada([puntos[a], puntos[b], puntos[c]]);
    suma += Math.abs(s);
    // Positivo = antihorario en la base: mira para el lado de la normal.
    salida.push(s >= 0 ? [indices[a], indices[b], indices[c]] : [indices[a], indices[c], indices[b]]);
  }
  if (Math.abs(suma - esperado) > esperado * 1e-3) return null;
  return salida;
}

/* Tapa en abanico desde el centro (para huecos raros). */
function abanico(lazo: number[], P: number[]): Tri[] {
  let x = 0, y = 0, z = 0;
  for (const v of lazo) { x += P[v * 3]; y += P[v * 3 + 1]; z += P[v * 3 + 2]; }
  const centro = P.length / 3;
  P.push(x / lazo.length, y / lazo.length, z / lazo.length);
  return lazo.map((v, i) => [v, lazo[(i + 1) % lazo.length], centro] as Tri);
}

/*
 * Hueco que no es plano (por ejemplo el borde de un techo a dos aguas): se
 * parte por diagonales nuevas en pedazos planos (los hastiales y el piso).
 * Solo se usa si todo queda en pedazos planos; si no, se tapa proyectado o
 * en abanico.
 */
type Vecinas = {
  existe: (a: number, b: number) => boolean; // la arista ya está en la cáscara
  normal: (a: number, b: number) => THREE.Vector3 | null; // normal de la cara del borde a-b
};

function partirEnPlanos(lazo: number[], P: number[], vecinas: Vecinas, profundidad = 0): Tri[] | null {
  const info = infoLazo(lazo, 0, P);
  if (info.plano) return triangularEnPlano(lazo, [], info.normal, P);
  const n = lazo.length;
  if (n <= 3 || n > 64 || profundidad > 8) return null;
  // Un pedazo sirve si es plano y no queda acostado sobre una cara vecina.
  const sirve = (pedazo: number[]) => {
    const pi = infoLazo(pedazo, 0, P);
    if (!pi.plano) return false;
    for (let k = 0; k + 1 < pedazo.length; k++) {
      const nv = vecinas.normal(pedazo[k], pedazo[k + 1]);
      if (nv && Math.abs(nv.dot(pi.normal)) > 0.999) return false;
    }
    return !!triangularEnPlano(pedazo, [], pi.normal, P);
  };
  let mejor: [number, number] | null = null;
  let puntos = 0;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (vecinas.existe(lazo[i], lazo[j])) continue;
    const uno = lazo.slice(i, j + 1), otro = [...lazo.slice(j), ...lazo.slice(0, i + 1)];
    const a = sirve(uno), b = sirve(otro);
    if (!a && !b) continue;
    // Mejor si los dos pedazos son planos; si no, el pedazo plano más grande (un triángulo solo en huecos chicos).
    const valor = (a ? uno.length : 0) + (b ? otro.length : 0) + (a && b ? 1000 : 0);
    if (Math.max(a ? uno.length : 0, b ? otro.length : 0) < (n <= 8 ? 3 : 4)) continue;
    if (valor > puntos) {
      puntos = valor;
      mejor = [i, j];
    }
  }
  if (!mejor) return null;
  const [i, j] = mejor;
  const uno = partirEnPlanos(lazo.slice(i, j + 1), P, vecinas, profundidad + 1);
  const otro = uno && partirEnPlanos([...lazo.slice(j), ...lazo.slice(0, i + 1)], P, vecinas, profundidad + 1);
  return uno && otro ? [...uno, ...otro] : null;
}

function taparNoPlano(lazo: number[], P: number[], vecinas: Vecinas, tamano: number): Tri[] {
  const enPlanos = partirEnPlanos(lazo, P, vecinas);
  if (enPlanos) return enPlanos;
  // Hueco suave (un pedazo de superficie curva): se tapa proyectado. Uno "doblado" que va
  // por varios planos (piso y muro) y es grande no se inventa: saldrían triángulos largos
  // cruzando el modelo. Queda abierto y lo revisamos a mano. Los chicos, en abanico.
  const info = infoLazo(lazo, 0, P);
  if (info.curvatura <= 0.3) {
    const proyectada = triangularEnPlano(lazo, [], info.normal, P);
    if (proyectada) return proyectada;
  }
  const caja = new THREE.Box3();
  for (const v of lazo) caja.expandByPoint(new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]));
  return caja.getSize(new THREE.Vector3()).length() > tamano * 0.05 ? [] : abanico(lazo, P);
}

/* Tapa todos los agujeros; los planos del mismo plano se tapan juntos (islas). */
function taparAgujeros(tris: Tri[], P: number[], tamano: number, respetarAberturas = false) {
  const { id, indice } = cascaras(tris);
  const infos = lazosDeBorde(tris, id, indice).map(({ lazo, cascara }) => infoLazo(lazo, cascara, P));
  const parches: { t: Tri; cascara: number }[] = [];
  const agregar = (lista: Tri[], cascara: number) => lista.forEach((t) => parches.push({ t, cascara }));
  const hecho = new Set<InfoLazo>();
  const tolPlano = tamano * 1e-4;

  // Normal de la cara de la cáscara que toca el borde a-b.
  const normalVecina = (a: number, b: number, cascara: number) => {
    const j = indice.de(a, b).find((k) => id[k] === cascara);
    if (j === undefined) return null;
    const t = tris[j];
    const p0 = new THREE.Vector3().fromArray(P, t[0] * 3);
    return new THREE.Vector3().fromArray(P, t[1] * 3).sub(p0).cross(new THREE.Vector3().fromArray(P, t[2] * 3).sub(p0)).normalize();
  };
  /*
   * ¿Es una abertura y no un agujero? Si la mayor parte del borde toca caras en el
   * mismo plano que el hueco (el hueco de una pérgola, una ventana, un patio), es una
   * abertura a propósito: no se tapa. Un agujero de verdad (falta la tapa de una
   * caja) está rodeado de caras en ángulo.
   */
  const esAbertura = (info: InfoLazo) => {
    let enPlano = 0, total = 0;
    for (let i = 0; i < info.lazo.length; i++) {
      const a = info.lazo[i], b = info.lazo[(i + 1) % info.lazo.length];
      const largo = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
      total += largo;
      const n = normalVecina(a, b, info.cascara);
      // Plano de verdad (menos de 2°): una superficie curva fina no cuenta como abertura.
      if (n && Math.abs(n.dot(info.normal)) > 0.9995) enPlano += largo;
    }
    return total > 0 && enPlano > total * 0.5;
  };
  let aberturas = 0;
  // Tamaño de cada cáscara (para medir los huecos contra su propia pieza).
  const cajas = new Map<number, THREE.Box3>();
  if (respetarAberturas) tris.forEach((t, i) => {
    const caja = cajas.get(id[i]) || cajas.set(id[i], new THREE.Box3()).get(id[i])!;
    for (const v of t) caja.expandByPoint(new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]));
  });

  for (const info of [...infos].sort((a, b) => b.area - a.area)) {
    if (hecho.has(info)) continue;
    hecho.add(info);
    /*
     * Suave: no se inventan caras. Un hueco "de verdad" (falta una cara) y una abertura a
     * propósito (un lucernario, una pérgola, una ventana sin mochetas) son iguales en la
     * geometría: tapar uno cambiaba modelos de clientes. Solo se cierran las rajas finitas
     * (ancho ≈ 2 × área / perímetro casi cero), que no se ven.
     */
    let perimetro = 0;
    for (let i = 0; i < info.lazo.length; i++) {
      const a = info.lazo[i], b = info.lazo[(i + 1) % info.lazo.length];
      perimetro += Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
    }
    const ancho = (2 * info.area) / Math.max(perimetro, 1e-30);
    const pieza = cajas.get(info.cascara)?.getSize(new THREE.Vector3()).length() || tamano;
    if (respetarAberturas && (ancho > tamano * 1e-4 || ancho > pieza * 1e-3)) {
      aberturas++;
      continue;
    }
    if (respetarAberturas && info.plano && esAbertura(info)) {
      aberturas++;
      continue;
    }
    if (!info.plano) {
      // Diagonal prohibida: una arista que ya tiene esta misma cáscara (taparía encima de sus caras).
      const deLaCascara = (x: number, y: number) => indice.de(x, y).filter((j) => id[j] === info.cascara);
      agregar(taparNoPlano(info.lazo, P, {
        existe: (x, y) => deLaCascara(x, y).length > 0,
        normal: (x, y) => {
          const j = deLaCascara(x, y)[0];
          if (j === undefined) return null;
          const t = tris[j];
          const p0 = new THREE.Vector3().fromArray(P, t[0] * 3);
          return new THREE.Vector3().fromArray(P, t[1] * 3).sub(p0).cross(new THREE.Vector3().fromArray(P, t[2] * 3).sub(p0)).normalize();
        },
      }, tamano), info.cascara);
      continue;
    }
    // Islas: lazos del mismo plano, recorridos al revés y adentro de este.
    const { u, v } = base(info.normal);
    const a2 = (p: number) => new THREE.Vector2(
      P[p * 3] * u.x + P[p * 3 + 1] * u.y + P[p * 3 + 2] * u.z,
      P[p * 3] * v.x + P[p * 3 + 1] * v.y + P[p * 3 + 2] * v.z
    );
    const contorno = info.lazo.map(a2);
    const islas = infos.filter((otro) =>
      !hecho.has(otro) && otro.plano && otro.cascara === info.cascara &&
      otro.normal.dot(info.normal) < -0.999 &&
      Math.abs(otro.centro.clone().sub(info.centro).dot(info.normal)) <= tolPlano &&
      dentroDe(a2(otro.lazo[0]), contorno)
    );
    const tapa = triangularEnPlano(info.lazo, islas.map((i) => i.lazo), info.normal, P);
    if (tapa) {
      islas.forEach((i) => hecho.add(i));
      agregar(tapa, info.cascara);
    } else {
      agregar(triangularEnPlano(info.lazo, [], info.normal, P) || abanico(info.lazo, P), info.cascara);
    }
  }
  return { parches, cascara: id, agujeros: infos.length - aberturas };
}

/* ¿El punto está adentro de esos triángulos cerrados? (rayo, cuenta cruces) */
function adentro(punto: THREE.Vector3, tris: Tri[], P: number[]) {
  const dir = new THREE.Vector3(0.5773, 0.5774, 0.5775).normalize();
  const rayo = new THREE.Ray(punto, dir);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cruce = new THREE.Vector3();
  let cruces = 0;
  for (const t of tris) {
    a.fromArray(P, t[0] * 3); b.fromArray(P, t[1] * 3); c.fromArray(P, t[2] * 3);
    if (rayo.intersectTriangle(a, b, c, false, cruce)) cruces++;
  }
  return cruces % 2 === 1;
}

/* Le da espesor a una cara suelta: la copia para los dos lados y cierra el borde. */
function engrosar(tris: Tri[], P: number[], espesor: number): Tri[] {
  const normales = new Map<number, THREE.Vector3>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const t of tris) {
    a.fromArray(P, t[0] * 3); b.fromArray(P, t[1] * 3); c.fromArray(P, t[2] * 3);
    const n = b.clone().sub(a).cross(c.clone().sub(a)); // largo = 2 × área
    for (const v of t) (normales.get(v) || normales.set(v, new THREE.Vector3()).get(v)!).add(n);
  }
  const arriba = new Map<number, number>(), abajo = new Map<number, number>();
  normales.forEach((n, v) => {
    n.normalize().multiplyScalar(espesor / 2);
    arriba.set(v, P.length / 3);
    P.push(P[v * 3] + n.x, P[v * 3 + 1] + n.y, P[v * 3 + 2] + n.z);
    abajo.set(v, P.length / 3);
    P.push(P[v * 3] - n.x, P[v * 3 + 1] - n.y, P[v * 3 + 2] - n.z);
  });
  const salida: Tri[] = [];
  for (const t of tris) {
    salida.push([arriba.get(t[0])!, arriba.get(t[1])!, arriba.get(t[2])!]);
    salida.push([abajo.get(t[0])!, abajo.get(t[2])!, abajo.get(t[1])!]);
  }
  for (const { a: x, b: y } of aristasAbiertas(tris)) {
    const xa = arriba.get(x)!, ya = arriba.get(y)!, xb = abajo.get(x)!, yb = abajo.get(y)!;
    salida.push([ya, xa, xb], [ya, xb, yb]);
  }
  return salida;
}

export function repararMalla(geometria: THREE.BufferGeometry, opciones: OpcionesReparacion = {}): ResultadoReparacion {
  const tamano = diagonal(geometria);
  const indexada = soldar(geometria, tamano * 1e-6);
  const P: number[] = Array.from(indexada.getAttribute("position").array as ArrayLike<number>);
  const idx = indexada.getIndex()!.array;
  indexada.dispose();
  const cuenta: ResultadoReparacion = {
    geometria: new THREE.BufferGeometry(),
    parches: new Float32Array(0),
    aplastadosQuitados: 0,
    duplicadosQuitados: 0,
    carasDoblesQuitadas: 0,
    carasDadasVuelta: 0,
    agujerosTapados: 0,
    rajasCerradas: 0,
    aristasCosidas: 0,
    laminasEngrosadas: 0,
    carasInternasQuitadas: 0,
  };

  const suave = opciones.modo !== "completo";
  let tris: Tri[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) tris.push([Number(idx[i]), Number(idx[i + 1]), Number(idx[i + 2])]);

  // 1 y 2: limpiar y coser.
  tris = limpiar(tris, P, tamano, cuenta, !suave);
  tris = coser(tris, P, tamano, cuenta, !suave);
  // 3: orientación pareja.
  cuenta.carasDadasVuelta += orientar(tris);
  // 4: tapas (cada una sabe de qué cáscara es).
  const { parches: tapas, cascara, agujeros } = taparAgujeros(tris, P, tamano, suave);
  cuenta.agujerosTapados = agujeros;

  const area = (t: Tri) => {
    const ux = P[t[1] * 3] - P[t[0] * 3], uy = P[t[1] * 3 + 1] - P[t[0] * 3 + 1], uz = P[t[1] * 3 + 2] - P[t[0] * 3 + 2];
    const vx = P[t[2] * 3] - P[t[0] * 3], vy = P[t[2] * 3 + 1] - P[t[0] * 3 + 1], vz = P[t[2] * 3 + 2] - P[t[0] * 3 + 2];
    return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  };
  const volumen = (t: Tri) => {
    const a = t[0] * 3, b = t[1] * 3, c = t[2] * 3;
    return (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
  };

  // 5: caras sin espesor: cáscaras que, ya tapadas, no encierran volumen
  // (una pared, un cartel o una losa de una sola cara).
  const areaTotal = new Map<number, number>(), volumenTotal = new Map<number, number>();
  const sumar = (c: number, t: Tri) => {
    areaTotal.set(c, (areaTotal.get(c) || 0) + area(t));
    volumenTotal.set(c, (volumenTotal.get(c) || 0) + volumen(t));
  };
  tris.forEach((t, i) => sumar(cascara[i], t));
  const conTapa = new Set<number>();
  for (const { t, cascara: c } of tapas) {
    sumar(c, t);
    conTapa.add(c);
  }
  const laminas = new Set<number>();
  conTapa.forEach((c) => {
    if ((2 * Math.abs(volumenTotal.get(c) || 0)) / Math.max(areaTotal.get(c) || 0, 1e-30) < tamano * 1e-4) laminas.add(c);
  });

  if (suave) {
    // Solo se tapa si el parche es chico al lado de su pieza (falta una cara, no media pieza).
    const areaPropia = new Map<number, number>(), areaTapas = new Map<number, number>();
    tris.forEach((t, i) => areaPropia.set(cascara[i], (areaPropia.get(cascara[i]) || 0) + area(t)));
    for (const { t, cascara: c } of tapas) areaTapas.set(c, (areaTapas.get(c) || 0) + area(t));
    const aceptadas = tapas.filter((x) => !laminas.has(x.cascara) && (areaTapas.get(x.cascara) || 0) <= (areaPropia.get(x.cascara) || 0) * 0.3);
    cuenta.agujerosTapados = new Set(aceptadas.map((x) => x.cascara)).size ? Math.min(agujeros, aceptadas.length) : 0;
    const resultado = [
      ...tris.map((t, i) => ({ t, tapa: false, grupo: cascara[i] })),
      ...aceptadas.map((x) => ({ t: x.t, tapa: true, grupo: x.cascara })),
    ];
    // Solo se da vuelta una pieza que quedó cerrada (en una abierta el "adentro" no se sabe).
    const indice = indiceAristas(resultado.map((x) => x.t));
    const abiertas = new Set<number>();
    for (const x of resultado) for (let k = 0; k < 3; k++) {
      if (indice.usos(x.t[k], x.t[(k + 1) % 3]) === 1) abiertas.add(x.grupo);
    }
    const volumenes = new Map<number, number>();
    for (const x of resultado) volumenes.set(x.grupo, (volumenes.get(x.grupo) || 0) + volumen(x.t));
    for (const x of resultado) {
      if (!abiertas.has(x.grupo) && (volumenes.get(x.grupo) || 0) < 0) {
        x.t = [x.t[0], x.t[2], x.t[1]];
        if (!x.tapa) cuenta.carasDadasVuelta++;
      }
    }
    return armar(resultado);
  }

  // grupo = la cáscara de origen (con sus tapas): se orienta como un todo.
  let resultado: { t: Tri; tapa: boolean; grupo: number }[] = [
    ...tris.flatMap((t, i) => (laminas.has(cascara[i]) ? [] : [{ t, tapa: false, grupo: cascara[i] }])),
    ...tapas.filter((x) => !laminas.has(x.cascara)).map((x) => ({ t: x.t, tapa: true, grupo: x.cascara })),
  ];
  if (laminas.size) {
    const solidos = resultado.map((x) => x.t);
    const espesor = opciones.espesorLamina && opciones.espesorLamina > 0 ? opciones.espesorLamina : tamano * 0.0015;
    const porLamina = new Map<number, Tri[]>();
    tris.forEach((t, i) => {
      if (laminas.has(cascara[i])) (porLamina.get(cascara[i]) || porLamina.set(cascara[i], []).get(cascara[i])!).push(t);
    });
    let probadas = 0;
    porLamina.forEach((propias, grupo) => {
      // Punto de prueba: el centro del triángulo más grande de la cara.
      let mayor = propias[0];
      for (const t of propias) if (area(t) > area(mayor)) mayor = t;
      const centro = new THREE.Vector3(
        (P[mayor[0] * 3] + P[mayor[1] * 3] + P[mayor[2] * 3]) / 3,
        (P[mayor[0] * 3 + 1] + P[mayor[1] * 3 + 1] + P[mayor[2] * 3 + 1]) / 3,
        (P[mayor[0] * 3 + 2] + P[mayor[1] * 3 + 2] + P[mayor[2] * 3 + 2]) / 3
      );
      if (probadas++ < 60 && solidos.length && adentro(centro, solidos, P)) cuenta.carasInternasQuitadas++;
      else {
        for (const t of engrosar(propias, P, espesor)) resultado.push({ t, tapa: true, grupo });
        cuenta.laminasEngrosadas++;
      }
    });
  }

  // Una tapa que cae justo sobre otra cara (el piso del techo sobre la caja):
  // las dos sobran y las piezas quedan unidas en una sola.
  const sinDobles = new Set(limpiar(resultado.map((x) => x.t), P, tamano, { aplastadosQuitados: 0, duplicadosQuitados: 0, carasDoblesQuitadas: 0 }));
  if (sinDobles.size !== resultado.length) resultado = resultado.filter((x) => sinDobles.has(x.t));

  // 6: cada cáscara cerrada, mirando para afuera (volumen positivo).
  const volumenes = new Map<number, number>();
  for (const x of resultado) volumenes.set(x.grupo, (volumenes.get(x.grupo) || 0) + volumen(x.t));
  resultado.forEach((x) => {
    if ((volumenes.get(x.grupo) || 0) < 0) {
      x.t = [x.t[0], x.t[2], x.t[1]];
      if (!x.tapa) cuenta.carasDadasVuelta++;
    }
  });

  return armar(resultado);

  function armar(lista: { t: Tri; tapa: boolean }[]) {
    const aPosiciones = (elegidos: { t: Tri }[]) => {
      const salida = new Float32Array(elegidos.length * 9);
      elegidos.forEach(({ t }, i) => {
        for (let k = 0; k < 3; k++) {
          salida[i * 9 + k * 3] = P[t[k] * 3];
          salida[i * 9 + k * 3 + 1] = P[t[k] * 3 + 1];
          salida[i * 9 + k * 3 + 2] = P[t[k] * 3 + 2];
        }
      });
      return salida;
    };
    const final = new THREE.BufferGeometry();
    final.setAttribute("position", new THREE.BufferAttribute(aPosiciones(lista), 3));
    final.computeVertexNormals();
    cuenta.geometria = final;
    cuenta.parches = aPosiciones(lista.filter((x) => x.tapa));
    return cuenta;
  }
}
