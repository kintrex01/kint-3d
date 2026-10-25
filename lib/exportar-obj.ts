import * as THREE from "three";

/*
 * OBJ con colores (para piezas pintadas en el visor). Bambu Studio lo abre
 * con los colores puestos y deja asignar un filamento a cada color, así no
 * hay que pintarlo a mano. Cada vértice lleva su color: "v x y z r g b".
 * La geometría se exporta como está (sin la rotación de la vista), con el
 * factor de escala que se pase.
 */

export function exportarObjConColores(geometria: THREE.BufferGeometry, factor = 1) {
  const posicion = geometria.getAttribute("position");
  const color = geometria.getAttribute("color");
  const indice = geometria.getIndex();
  const lineas: string[] = ["# Kint 3D · piezas pintadas en el visor (kint3d.com)"];
  const numero = (valor: number) => Number(valor.toFixed(5)).toString();
  // Los colores del visor están en espacio lineal; el archivo los lleva como se ven (sRGB).
  const tono = new THREE.Color();
  const rgb = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < posicion.count; i++) {
    const base = `v ${numero(posicion.getX(i) * factor)} ${numero(posicion.getY(i) * factor)} ${numero(posicion.getZ(i) * factor)}`;
    if (color) {
      tono.setRGB(color.getX(i), color.getY(i), color.getZ(i)).getRGB(rgb, THREE.SRGBColorSpace);
      lineas.push(`${base} ${numero(rgb.r)} ${numero(rgb.g)} ${numero(rgb.b)}`);
    } else lineas.push(base);
  }
  const total = indice ? indice.count : posicion.count;
  for (let i = 0; i + 2 < total; i += 3) {
    const [a, b, c] = indice ? [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)] : [i, i + 1, i + 2];
    lineas.push(`f ${a + 1} ${b + 1} ${c + 1}`);
  }
  return lineas.join("\n") + "\n";
}

/*
 * Piezas sueltas de una geometría (vértices que se tocan): para pintar con
 * el balde, cada toque pinta toda la pieza. Devuelve la pieza de cada vértice.
 */
export function piezasPorVertice(geometria: THREE.BufferGeometry) {
  const posicion = geometria.getAttribute("position");
  const n = posicion.count;
  const padre = new Int32Array(n);
  for (let i = 0; i < n; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) { padre[v] = padre[padre[v]]; v = padre[v]; }
    return v;
  };
  // Vértices en el mismo lugar = misma pieza.
  const lugar = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const clave = `${posicion.getX(i).toFixed(5)}|${posicion.getY(i).toFixed(5)}|${posicion.getZ(i).toFixed(5)}`;
    const otro = lugar.get(clave);
    if (otro === undefined) lugar.set(clave, i);
    else padre[raiz(i)] = raiz(otro);
  }
  const indice = geometria.getIndex();
  const total = indice ? indice.count : n;
  for (let i = 0; i + 2 < total; i += 3) {
    const [a, b, c] = indice ? [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)] : [i, i + 1, i + 2];
    padre[raiz(b)] = raiz(a);
    padre[raiz(c)] = raiz(a);
  }
  const pieza = new Int32Array(n);
  for (let i = 0; i < n; i++) pieza[i] = raiz(i);
  return pieza;
}
