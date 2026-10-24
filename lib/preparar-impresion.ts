import * as THREE from "three";

/*
 * "Preparar para imprimir" (visor 3D): deja el STL listo para la impresora.
 *   1. escala a mm;
 *   2. acuesta las piezas paradas (paneles finos y altos);
 *   3. corta el resto a las alturas sugeridas y tapa cada corte (las partes
 *      quedan cerradas);
 *   4. apoya cada parte en la cama y las acomoda separadas, en camas de
 *      `cama` mm (si no entran en una, sigue en otra al lado).
 * Trabaja en coordenadas del STL (Z = altura). Devuelve la geometría en mm.
 */

type V = THREE.Vector3;
type Tri = [V, V, V];

export type ResultadoPreparacion = {
  geometria: THREE.BufferGeometry;
  partes: number;
  acostadas: number;
  cortes: number;
  camas: number;
};

const SEPARACION = 4; // mm entre partes

function cajaDe(tris: Tri[]) {
  const caja = new THREE.Box3();
  for (const t of tris) for (const v of t) caja.expandByPoint(v);
  return caja;
}

/* Piezas separadas: triángulos que comparten vértices (redondeados). */
function separarPiezas(tris: Tri[], paso: number) {
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
  const grupos = new Map<number, Tri[]>();
  tris.forEach((t, i) => {
    const r = raiz(verts[i][0]);
    (grupos.get(r) || grupos.set(r, []).get(r)!).push(t);
  });
  return [...grupos.values()];
}

/*
 * Lo que se toca va junto: en SketchUp cada muro, losa o escalera es un grupo
 * aparte que no comparte vértices con los demás, pero se apoya en ellos. Se
 * juntan las piezas cuyas cajas se tocan o se meten una en otra (barrido por X).
 */
function juntarLoQueSeToca(piezas: Tri[][], tolerancia: number) {
  const cajas = piezas.map((pieza) => cajaDe(pieza).expandByScalar(tolerancia));
  const padre = piezas.map((_, i) => i);
  const raiz = (v: number): number => (padre[v] === v ? v : (padre[v] = raiz(padre[v])));
  const orden = piezas.map((_, i) => i).sort((a, b) => cajas[a].min.x - cajas[b].min.x);
  for (let i = 0; i < orden.length; i++) {
    const a = cajas[orden[i]];
    for (let j = i + 1; j < orden.length && cajas[orden[j]].min.x <= a.max.x; j++) {
      if (a.intersectsBox(cajas[orden[j]])) padre[raiz(orden[j])] = raiz(orden[i]);
    }
  }
  const grupos = new Map<number, Tri[][]>();
  piezas.forEach((pieza, i) => {
    const r = raiz(i);
    (grupos.get(r) || grupos.set(r, []).get(r)!).push(pieza);
  });
  return [...grupos.values()];
}

/* Sólidos cerrados: triángulos unidos por bordes que comparten exactamente dos caras. */
function separarCascaras(tris: Tri[]) {
  const paso = 1e-4;
  const clave = (v: V) => `${Math.round(v.x / paso)}|${Math.round(v.y / paso)}|${Math.round(v.z / paso)}`;
  const porBorde = new Map<string, number[]>();
  tris.forEach((t, i) => {
    const k = t.map(clave);
    for (let j = 0; j < 3; j++) {
      const a = k[j], b = k[(j + 1) % 3];
      const borde = a < b ? `${a}#${b}` : `${b}#${a}`;
      (porBorde.get(borde) || porBorde.set(borde, []).get(borde)!).push(i);
    }
  });
  const padre = new Int32Array(tris.length);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) {
      padre[v] = padre[padre[v]];
      v = padre[v];
    }
    return v;
  };
  porBorde.forEach((lista) => {
    if (lista.length === 2) padre[raiz(lista[1])] = raiz(lista[0]);
  });
  const grupos = new Map<number, Tri[]>();
  tris.forEach((t, i) => {
    const r = raiz(i);
    (grupos.get(r) || grupos.set(r, []).get(r)!).push(t);
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

/* Punto donde el segmento a-b cruza el plano z = h. */
function cruce(a: V, b: V, h: number) {
  const t = (h - a.z) / (b.z - a.z);
  return new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, h);
}

/*
 * Tapa: une los bordes del corte en contornos y los rellena (con huecos).
 * Cada borde tiene sentido; si dos piezas que se tocan dan el mismo borde
 * al revés, se anulan y queda el contorno de las dos juntas.
 */
function tapas(segmentos: [V, V][], h: number, paso: number) {
  const clave = (v: V) => `${Math.round(v.x / paso)}|${Math.round(v.y / paso)}`;
  const puntos = new Map<string, V>();
  const dirigidos = new Map<string, number>();
  for (const [a, b] of segmentos) {
    const ka = clave(a), kb = clave(b);
    if (ka === kb) continue;
    puntos.set(ka, a);
    puntos.set(kb, b);
    const inverso = `${kb}>${ka}`;
    if (dirigidos.get(inverso)) dirigidos.set(inverso, dirigidos.get(inverso)! - 1);
    else dirigidos.set(`${ka}>${kb}`, (dirigidos.get(`${ka}>${kb}`) || 0) + 1);
  }
  const salen = new Map<string, string[]>();
  dirigidos.forEach((n, par) => {
    const [ka, kb] = par.split(">");
    for (let i = 0; i < n; i++) (salen.get(ka) || salen.set(ka, []).get(ka)!).push(kb);
  });

  // Contornos cerrados, siguiendo el sentido.
  const contornos: THREE.Vector2[][] = [];
  salen.forEach((_, inicio) => {
    while ((salen.get(inicio) || []).length) {
      const lazo = [inicio];
      let actual = salen.get(inicio)!.pop()!;
      while (actual !== inicio && lazo.length < 50000) {
        lazo.push(actual);
        const proximo = salen.get(actual)?.pop();
        if (proximo === undefined) break;
        actual = proximo;
      }
      if (actual === inicio && lazo.length >= 3) {
        contornos.push(lazo.map((k) => new THREE.Vector2(puntos.get(k)!.x, puntos.get(k)!.y)));
      }
    }
  });

  // Afuera / adentro (un contorno dentro de otro es un hueco: patio, columna hueca).
  const dentro = (p: THREE.Vector2, poligono: THREE.Vector2[]) => {
    let adentro = false;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const a = poligono[i], b = poligono[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) adentro = !adentro;
    }
    return adentro;
  };
  const profundidad = contornos.map((c, i) => contornos.filter((otro, j) => j !== i && dentro(c[0], otro)).length);

  const arriba: Tri[] = []; // mira para arriba: tapa de la parte de abajo
  contornos.forEach((contorno, i) => {
    if (profundidad[i] % 2 !== 0) return;
    const huecos = contornos.filter((otro, j) => profundidad[j] === profundidad[i] + 1 && dentro(otro[0], contorno));
    const exterior = THREE.ShapeUtils.isClockWise(contorno) ? [...contorno].reverse() : contorno;
    const interiores = huecos.map((h2) => (THREE.ShapeUtils.isClockWise(h2) ? h2 : [...h2].reverse()));
    const todos = [...exterior, ...interiores.flat()];
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(exterior, interiores)) {
      arriba.push([
        new THREE.Vector3(todos[a].x, todos[a].y, h),
        new THREE.Vector3(todos[b].x, todos[b].y, h),
        new THREE.Vector3(todos[c].x, todos[c].y, h),
      ]);
    }
  });
  return arriba;
}

/* Corta una pieza en z = h: devuelve la parte de abajo y la de arriba, tapadas. */
function cortar(tris: Tri[], h: number, paso: number): [Tri[], Tri[]] {
  const abajo: Tri[] = [];
  const encima: Tri[] = [];
  const segmentos: [V, V][] = [];
  const lado = (v: V) => (v.z - h >= 0 ? 1 : -1);

  for (const tri of tris) {
    // Vértices justo en el plano: se corren un pelito para arriba.
    const t = tri.map((v) => (Math.abs(v.z - h) < paso ? new THREE.Vector3(v.x, v.y, h + paso) : v)) as Tri;
    const lados = t.map(lado);
    if (lados.every((s) => s > 0)) {
      encima.push(t);
      continue;
    }
    if (lados.every((s) => s < 0)) {
      abajo.push(t);
      continue;
    }
    // Rota para que el vértice solo quede primero (mantiene el sentido).
    const solo = lados[0] === lados[1] ? 2 : lados[0] === lados[2] ? 1 : 0;
    const [a, b, c] = [t[solo], t[(solo + 1) % 3], t[(solo + 2) % 3]];
    const p = cruce(a, b, h);
    const q = cruce(a, c, h);
    const ladoSolo = lados[solo] > 0 ? encima : abajo;
    const ladoOtro = lados[solo] > 0 ? abajo : encima;
    ladoSolo.push([a, p, q]);
    ladoOtro.push([p, b, c], [p, c, q]);
    segmentos.push(lados[solo] > 0 ? [q, p] : [p, q]);
  }

  const tapaArriba = tapas(segmentos, h, paso);
  abajo.push(...tapaArriba);
  encima.push(...tapaArriba.map(([x, y, z]) => [x, z, y] as Tri)); // misma tapa, mirando para abajo
  return [abajo, encima];
}

export function prepararParaImprimir(
  geometria: THREE.BufferGeometry,
  opciones: { mmPorUnidad: number; cortes: number[]; acostar: boolean; cortar: boolean; cama: number }
): ResultadoPreparacion {
  const pos = geometria.getAttribute("position");
  const indice = geometria.getIndex();
  const k = opciones.mmPorUnidad;
  const vertice = (i: number) => new THREE.Vector3(pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  const tris: Tri[] = [];
  const total = indice ? indice.count : pos.count;
  for (let i = 0; i + 2 < total; i += 3) {
    const [a, b, c] = indice ? [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)] : [i, i + 1, i + 2];
    tris.push([vertice(a), vertice(b), vertice(c)]);
  }

  const cajaTotal = cajaDe(tris);
  const tamano = cajaTotal.getSize(new THREE.Vector3()).length() || 1;
  const paso = Math.max(tamano * 1e-6, 1e-4);
  const alturas = opciones.cortar
    ? [...opciones.cortes].map((c) => cajaTotal.min.z + c * k).sort((x, y) => x - y)
    : [];

  let acostadas = 0;
  let cortes = 0;
  const partes: Tri[][] = [];
  // 0,05 mm impresos: lo que se apoya o se mete en otra pieza va con ella.
  for (const grupo of juntarLoQueSeToca(separarPiezas(tris, paso), Math.max(paso * 10, 0.05))) {
    const pieza = grupo.length === 1 ? grupo[0] : grupo.flat();
    // Solo se acuesta lo que está suelto (un muro apoyado en la losa queda donde está).
    if (opciones.acostar && grupo.length === 1 && estaParada(pieza, tamano)) {
      partes.push(acostar(pieza));
      acostadas++;
      continue;
    }
    if (!alturas.length) {
      partes.push(pieza);
      continue;
    }
    /*
     * Cada sólido (grupo de SketchUp) se corta por separado, así cada tapa
     * cierra bien; después se juntan los pedazos de cada tramo de altura
     * (una planta = una parte, con sus muros juntos).
     */
    const tramos: Tri[][] = alturas.map(() => []);
    tramos.push([]);
    for (let cascara of separarCascaras(pieza)) {
      for (let i = 0; i < alturas.length; i++) {
        const h = alturas[i];
        const caja = cajaDe(cascara);
        if (caja.max.z <= h + paso * 10) break;
        if (caja.min.z >= h - paso * 10) continue;
        const [abajo, encima] = cortar(cascara, h, paso);
        tramos[i].push(...abajo);
        cascara = encima;
      }
      // Lo que queda va al tramo que le corresponde por su altura.
      if (cascara.length) {
        const base = cajaDe(cascara).min.z;
        const tramo = alturas.filter((h) => h <= base + paso * 10).length;
        tramos[tramo].push(...cascara);
      }
    }
    // Cortes = separaciones entre tramos (si el corte cae justo entre muro y losa, no hay que cortar nada).
    const conPiezas = tramos.filter((tramo) => tramo.length);
    cortes += Math.max(0, conPiezas.length - 1);
    partes.push(...conPiezas);
  }

  // Cada parte apoyada en z = 0 y acomodadas en filas, cama por cama.
  const salida: number[] = [];
  const cama = opciones.cama;
  let x = 0, y = 0, altoFila = 0, camaActual = 0;
  const ordenadas = partes
    .map((tri) => ({ tri, caja: cajaDe(tri) }))
    .sort((a, b) => b.caja.getSize(new THREE.Vector3()).y - a.caja.getSize(new THREE.Vector3()).y);
  for (const { tri, caja } of ordenadas) {
    const t = caja.getSize(new THREE.Vector3());
    if (x > 0 && x + t.x > cama) {
      x = 0;
      y += altoFila + SEPARACION;
      altoFila = 0;
    }
    if (y > 0 && y + t.y > cama) {
      camaActual++;
      x = 0;
      y = 0;
      altoFila = 0;
    }
    const corrimiento = new THREE.Vector3(camaActual * (cama + 30) + x - caja.min.x, y - caja.min.y, -caja.min.z);
    for (const triangulo of tri) for (const v of triangulo) salida.push(v.x + corrimiento.x, v.y + corrimiento.y, v.z + corrimiento.z);
    x += t.x + SEPARACION;
    altoFila = Math.max(altoFila, t.y);
  }

  const resultado = new THREE.BufferGeometry();
  resultado.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  resultado.computeVertexNormals();
  return { geometria: resultado, partes: partes.length, acostadas, cortes, camas: camaActual + 1 };
}
