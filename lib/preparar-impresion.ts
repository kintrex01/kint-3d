import * as THREE from "three";
import { solidoUnido, trianglesDe } from "@/lib/unir-solidos";

/*
 * "Ordenar automáticamente" (visor 3D): deja el modelo listo para la impresora.
 *   1. escala a mm y separa las piezas; lo que se toca va junto, salvo que el
 *      cliente lo haya pintado de otro color;
 *   2. acuesta las piezas sueltas paradas (paneles finos y altos);
 *   3. corta a las alturas pedidas con Manifold (cada corte queda tapado y
 *      cerrado). Cada corte se ajusta a la cara de abajo de la losa más
 *      cercana: así no quedan láminas de una capa con todo flotando arriba;
 *   4. apoya cada parte en la cama y las acomoda (el mejor hueco libre,
 *      girándolas si entran mejor); si no entran en una cama, usa otra al lado.
 * Cada parte conserva el color de su pieza (el pintado o el de la vista).
 * Trabaja en coordenadas del STL (Z = altura). Devuelve la geometría en mm.
 */

type V = THREE.Vector3;
type Tri = [V, V, V];
type Pieza = { tris: Tri[]; color: string };

export type ResultadoPreparacion = {
  geometria: THREE.BufferGeometry;
  partes: number;
  acostadas: number;
  cortes: number;
  camas: number;
  // Partes que no entran en ninguna cama a esta escala (con la medida de la más grande, en mm).
  noEntran: number;
  masGrande: [number, number, number];
};

export const SEPARACION_CAMAS = 30; // mm entre una cama y la siguiente (también en el visor)
const SEPARACION = 4; // mm entre partes

function cajaDe(tris: Tri[]) {
  const caja = new THREE.Box3();
  for (const t of tris) for (const v of t) caja.expandByPoint(v);
  return caja;
}

/* Piezas separadas: triángulos que comparten vértices (redondeados), con su color. */
function separarPiezas(tris: Tri[], colores: string[], paso: number): Pieza[] {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const clave = `${Math.round(v.x / paso)}|${Math.round(v.y / paso)}|${Math.round(v.z / paso)}`;
    let n = ids.get(clave);
    if (n === undefined) {
      n = ids.size;
      ids.set(clave, n);
    }
    return n;
  };
  const verts = tris.map((t) => t.map(id));
  const padre = new Int32Array(ids.size);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) {
      padre[v] = padre[padre[v]];
      v = padre[v];
    }
    return v;
  };
  for (const [a, b, c] of verts) {
    padre[raiz(b)] = raiz(a);
    padre[raiz(c)] = raiz(a);
  }
  const grupos = new Map<number, { tris: Tri[]; cuenta: Map<string, number> }>();
  tris.forEach((t, i) => {
    const r = raiz(verts[i][0]);
    const grupo = grupos.get(r) || grupos.set(r, { tris: [], cuenta: new Map() }).get(r)!;
    grupo.tris.push(t);
    grupo.cuenta.set(colores[i], (grupo.cuenta.get(colores[i]) || 0) + 1);
  });
  // El color de la pieza es el que más tiene (una pieza pintada es de un solo color).
  return [...grupos.values()].map(({ tris: lista, cuenta }) => ({
    tris: lista,
    color: [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0],
  }));
}

/*
 * Lo que se toca va junto (cada muro, losa o escalera de SketchUp es un grupo
 * aparte que se apoya en los demás), salvo que esté pintado de otro color: el
 * cliente lo quiere separado para imprimirlo en otro filamento.
 */
function juntarLoQueSeToca(piezas: Pieza[], tolerancia: number, respetarColores: boolean) {
  const cajas = piezas.map((pieza) => cajaDe(pieza.tris).expandByScalar(tolerancia));
  const padre = piezas.map((_, i) => i);
  const raiz = (v: number): number => (padre[v] === v ? v : (padre[v] = raiz(padre[v])));
  const orden = piezas.map((_, i) => i).sort((a, b) => cajas[a].min.x - cajas[b].min.x);
  for (let i = 0; i < orden.length; i++) {
    const a = cajas[orden[i]];
    for (let j = i + 1; j < orden.length && cajas[orden[j]].min.x <= a.max.x; j++) {
      if ((!respetarColores || piezas[orden[i]].color === piezas[orden[j]].color) && a.intersectsBox(cajas[orden[j]])) padre[raiz(orden[j])] = raiz(orden[i]);
    }
  }
  const grupos = new Map<number, Pieza[]>();
  piezas.forEach((pieza, i) => {
    const r = raiz(i);
    (grupos.get(r) || grupos.set(r, []).get(r)!).push(pieza);
  });
  return [...grupos.values()];
}

/* Pieza parada: fina en planta y alta (mismo criterio que lib/consejos-impresion). */
function estaParada(tris: Tri[], tamanoModelo: number) {
  const t = cajaDe(tris).getSize(new THREE.Vector3());
  const espesor = Math.min(t.x, t.y);
  const largo = Math.max(t.x, t.y);
  const mayor = Math.max(largo, t.z);
  if (mayor < tamanoModelo * 0.03) return false;
  return espesor / mayor < 0.15 && t.z >= largo * 0.5 && t.z > espesor * 4;
}

/* Acuesta la pieza: gira 90° para que su lado fino quede vertical. */
function acostar(tris: Tri[]) {
  const t = cajaDe(tris).getSize(new THREE.Vector3());
  const giro = new THREE.Matrix4();
  if (t.x < t.y) giro.makeRotationY(Math.PI / 2);
  else giro.makeRotationX(Math.PI / 2);
  return tris.map((tri) => tri.map((v) => v.clone().applyMatrix4(giro)) as Tri);
}

/*
 * Alturas de las caras que miran para abajo (la cara de abajo de cada losa o
 * voladizo): un corte pedido cerca se corre justo ahí. Así la parte de abajo
 * termina donde empieza la losa (las patas solas) y la de arriba arranca plana
 * con la losa; nunca queda una losa finita apoyada arriba de las patas.
 */
function alturasDeCaras(tris: Tri[]) {
  const alturas: number[] = [];
  const normal = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    normal.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const largo = normal.length();
    if (largo === 0 || normal.z / largo > -0.999) continue; // solo las que miran para abajo
    alturas.push((a.z + b.z + c.z) / 3);
  }
  return alturas;
}

function ajustarCorte(h: number, alturas: number[], margen: number) {
  let mejor = h, distancia = margen;
  for (const z of alturas) {
    const d = Math.abs(z - h);
    if (d <= distancia) {
      distancia = d;
      mejor = z;
    }
  }
  return mejor;
}

/*
 * Acomoda rectángulos en camas (MaxRects, "el hueco donde sobra menos"): cada
 * parte va al mejor hueco libre de cualquier cama, girada si entra mejor; si no
 * entra en ninguna, se agrega una cama nueva.
 */
type Lugar = { cama: number; x: number; y: number; girada: boolean } | null;
type Hueco = { x: number; y: number; w: number; h: number };

function empacar(medidas: { w: number; h: number }[], cama: number): Lugar[] {
  const camas: Hueco[][] = [];
  const lugares: Lugar[] = medidas.map(() => null);
  const orden = medidas.map((_, i) => i).sort((a, b) => Math.max(medidas[b].w, medidas[b].h) - Math.max(medidas[a].w, medidas[a].h));
  const tamano = cama + SEPARACION; // cada parte ocupa su medida + separación
  for (const i of orden) {
    const w = medidas[i].w + SEPARACION, h = medidas[i].h + SEPARACION;
    if (Math.max(w, h) > tamano) continue; // no entra en ninguna cama (la cama es cuadrada: girar no ayuda)
    let elegido: { cama: number; hueco: Hueco; girada: boolean; sobra: number } | null = null;
    const probar = (indice: number) => {
      for (const hueco of camas[indice]) {
        for (const girada of [false, true]) {
          const [ancho, alto] = girada ? [h, w] : [w, h];
          if (ancho <= hueco.w + 1e-6 && alto <= hueco.h + 1e-6) {
            const sobra = Math.min(hueco.w - ancho, hueco.h - alto);
            if (!elegido || sobra < elegido.sobra) elegido = { cama: indice, hueco, girada, sobra };
          }
        }
      }
    };
    for (let c = 0; c < camas.length && !elegido; c++) probar(c);
    if (!elegido) {
      camas.push([{ x: 0, y: 0, w: tamano, h: tamano }]);
      probar(camas.length - 1);
    }
    if (!elegido) continue; // más grande que la cama
    const { cama: indice, hueco, girada } = elegido as { cama: number; hueco: Hueco; girada: boolean };
    const [ancho, alto] = girada ? [h, w] : [w, h];
    const ocupado = { x: hueco.x, y: hueco.y, w: ancho, h: alto };
    lugares[i] = { cama: indice, x: ocupado.x, y: ocupado.y, girada };
    // Partir los huecos que se superponen con lo ocupado (MaxRects).
    const nuevos: Hueco[] = [];
    for (const libre of camas[indice]) {
      const toca = ocupado.x < libre.x + libre.w && ocupado.x + ocupado.w > libre.x && ocupado.y < libre.y + libre.h && ocupado.y + ocupado.h > libre.y;
      if (!toca) {
        nuevos.push(libre);
        continue;
      }
      if (ocupado.x > libre.x) nuevos.push({ x: libre.x, y: libre.y, w: ocupado.x - libre.x, h: libre.h });
      if (ocupado.x + ocupado.w < libre.x + libre.w) nuevos.push({ x: ocupado.x + ocupado.w, y: libre.y, w: libre.x + libre.w - ocupado.x - ocupado.w, h: libre.h });
      if (ocupado.y > libre.y) nuevos.push({ x: libre.x, y: libre.y, w: libre.w, h: ocupado.y - libre.y });
      if (ocupado.y + ocupado.h < libre.y + libre.h) nuevos.push({ x: libre.x, y: ocupado.y + ocupado.h, w: libre.w, h: libre.y + libre.h - ocupado.y - ocupado.h });
    }
    // Sacar los huecos contenidos en otros.
    camas[indice] = nuevos.filter((a, ia) => !nuevos.some((b, ib) => ib !== ia && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && (ib < ia || a.w !== b.w || a.h !== b.h || a.x !== b.x || a.y !== b.y)));
  }
  return lugares;
}

/* Triángulos de un arreglo x, y, z (de a 9). */
function trisDe(posiciones: ArrayLike<number>): Tri[] {
  const lista: Tri[] = [];
  for (let i = 0; i + 8 < posiciones.length; i += 9) {
    lista.push([
      new THREE.Vector3(posiciones[i], posiciones[i + 1], posiciones[i + 2]),
      new THREE.Vector3(posiciones[i + 3], posiciones[i + 4], posiciones[i + 5]),
      new THREE.Vector3(posiciones[i + 6], posiciones[i + 7], posiciones[i + 8]),
    ]);
  }
  return lista;
}

function geometriaDe(tris: Tri[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(tris.flatMap((t) => t.flatMap((v) => [v.x, v.y, v.z])), 3));
  return g;
}

export async function prepararParaImprimir(
  geometria: THREE.BufferGeometry,
  opciones: {
    mmPorUnidad: number;
    cortes: number[];
    acostar: boolean;
    cortar: boolean;
    cama: number;
    // true si el cliente pintó piezas: lo de otro color no se junta (va en otro filamento).
    respetarColores?: boolean;
  }
): Promise<ResultadoPreparacion> {
  const pos = geometria.getAttribute("position");
  const colorAtributo = geometria.getAttribute("color");
  const indice = geometria.getIndex();
  const k = opciones.mmPorUnidad;
  const vertice = (i: number) => new THREE.Vector3(pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  const tris: Tri[] = [];
  const colores: string[] = [];
  const total = indice ? indice.count : pos.count;
  for (let i = 0; i + 2 < total; i += 3) {
    const [a, b, c] = indice ? [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)] : [i, i + 1, i + 2];
    tris.push([vertice(a), vertice(b), vertice(c)]);
    colores.push(colorAtributo ? [colorAtributo.getX(a), colorAtributo.getY(a), colorAtributo.getZ(a)].map((x) => x.toFixed(3)).join(",") : "1,1,1");
  }

  const cajaTotal = cajaDe(tris);
  const tamano = cajaTotal.getSize(new THREE.Vector3()).length() || 1;
  const paso = Math.max(tamano * 1e-6, 1e-4);
  const pedidas = opciones.cortar ? [...opciones.cortes].map((c) => cajaTotal.min.z + c * k).sort((x, y) => x - y) : [];

  let acostadas = 0;
  const cortesHechos = new Set<number>();
  const partes: Pieza[] = [];
  // 0,05 mm impresos: lo que se apoya o se mete en otra pieza va con ella.
  for (const grupo of juntarLoQueSeToca(separarPiezas(tris, colores, paso), Math.max(paso * 10, 0.05), Boolean(opciones.respetarColores))) {
    // El color del grupo: el de su pieza más grande (las partes cortadas quedan del mismo color).
    const color = grupo.reduce((mayor, pieza) => (pieza.tris.length > mayor.tris.length ? pieza : mayor)).color;
    let pieza = grupo.length === 1 ? grupo[0].tris : grupo.flatMap((g) => g.tris);
    // Solo se acuesta lo que está suelto (un muro apoyado en la losa queda donde está).
    if (opciones.acostar && grupo.length === 1 && estaParada(pieza, tamano)) {
      pieza = acostar(pieza);
      acostadas++;
      partes.push({ tris: pieza, color });
      continue;
    }
    const caja = cajaDe(pieza);
    // Los cortes que pasan por esta pieza, corridos a la cara horizontal más cercana (hasta 1 mm).
    const caras = alturasDeCaras(pieza);
    const alturas = [...new Set(pedidas.map((h) => ajustarCorte(h, caras, 2)))]
      .filter((h) => h > caja.min.z + 0.2 && h < caja.max.z - 0.2)
      .sort((a, b) => a - b);
    if (!alturas.length) {
      partes.push({ tris: pieza, color });
      continue;
    }
    // Cortar con Manifold: cada pedazo queda cerrado y con la cara del corte plana.
    const { union, sueltos } = await solidoUnido(geometriaDe(pieza));
    if (!union) {
      partes.push({ tris: pieza, color });
      continue;
    }
    let resto = union;
    for (const h of alturas) {
      const [arriba, abajo] = resto.splitByPlane([0, 0, 1], h);
      resto.delete();
      if (!abajo.isEmpty() && !arriba.isEmpty()) cortesHechos.add(Math.round(h * 100));
      for (const parte of abajo.decompose()) {
        partes.push({ tris: trisDe(trianglesDe(parte)), color });
        parte.delete();
      }
      abajo.delete();
      resto = arriba;
    }
    for (const parte of resto.decompose()) {
      partes.push({ tris: trisDe(trianglesDe(parte)), color });
      parte.delete();
    }
    resto.delete();
    // Lo que no estaba cerrado no se corta: va como estaba.
    if (sueltos.length) partes.push({ tris: trisDe(sueltos), color });
  }

  // Cada parte apoyada en z = 0 y acomodada en las camas.
  const cama = opciones.cama;
  let noEntran = 0;
  let masGrande: [number, number, number] = [0, 0, 0];
  const medidas = partes.map((parte) => {
    const t = cajaDe(parte.tris).getSize(new THREE.Vector3());
    if (Math.max(t.x, t.y) > cama || t.z > cama) noEntran++;
    if (Math.max(t.x, t.y, t.z) > Math.max(...masGrande)) masGrande = [t.x, t.y, t.z];
    return { w: t.x, h: t.y };
  });
  const lugares = noEntran ? [] : empacar(medidas, cama);

  const posiciones: number[] = [];
  const coloresSalida: number[] = [];
  let camas = 1;
  const giro = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
  partes.forEach((parte, i) => {
    const lugar = lugares[i];
    if (!lugar) return;
    camas = Math.max(camas, lugar.cama + 1);
    const lista = lugar.girada ? parte.tris.map((t) => t.map((v) => v.clone().applyMatrix4(giro)) as Tri) : parte.tris;
    const caja = cajaDe(lista);
    const corrimiento = new THREE.Vector3(lugar.cama * (cama + SEPARACION_CAMAS) + lugar.x - caja.min.x, lugar.y - caja.min.y, -caja.min.z);
    const [r, g, b] = parte.color.split(",").map(Number);
    for (const t of lista) for (const v of t) {
      posiciones.push(v.x + corrimiento.x, v.y + corrimiento.y, v.z + corrimiento.z);
      coloresSalida.push(r, g, b);
    }
  });

  const resultado = new THREE.BufferGeometry();
  resultado.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  resultado.setAttribute("color", new THREE.Float32BufferAttribute(coloresSalida, 3));
  resultado.computeVertexNormals();
  return {
    geometria: resultado,
    partes: partes.length,
    acostadas,
    cortes: cortesHechos.size,
    camas,
    noEntran,
    masGrande,
  };
}
