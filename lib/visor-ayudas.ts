import * as THREE from "three";

/*
 * Ayudas visuales del visor 3D (/preparador-3d):
 *   - colorearPorPiezas: cada sólido separado de un color (se distinguen las piezas).
 *   - crearBordes: líneas en las aristas marcadas, como en SketchUp.
 *   - crearMarcaZona: esfera que señala dónde está un problema.
 *   - crearParches: lo que tapó "Reparar", en verde.
 * Todo va como hijo del modelo, en las coordenadas del archivo.
 */

const PALETA = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee", "#f87171", "#a3e635", "#e879f9"];

/* Pone un color por pieza (vértices que se tocan) en el atributo "color". Devuelve cuántas piezas hay. */
export function colorearPorPiezas(geometria: THREE.BufferGeometry) {
  const pos = geometria.getAttribute("position");
  geometria.computeBoundingBox();
  const tamano = geometria.boundingBox!.getSize(new THREE.Vector3()).length() || 1;
  const paso = tamano * 1e-6;

  // Mismo punto (redondeado) = mismo vértice.
  const id = new Int32Array(pos.count);
  const porClave = new Map<string, number>();
  for (let v = 0; v < pos.count; v++) {
    const clave = `${Math.round(pos.getX(v) / paso)}|${Math.round(pos.getY(v) / paso)}|${Math.round(pos.getZ(v) / paso)}`;
    let n = porClave.get(clave);
    if (n === undefined) {
      n = porClave.size;
      porClave.set(clave, n);
    }
    id[v] = n;
  }
  const padre = new Int32Array(porClave.size);
  for (let i = 0; i < padre.length; i++) padre[i] = i;
  const raiz = (v: number): number => {
    while (padre[v] !== v) {
      padre[v] = padre[padre[v]];
      v = padre[v];
    }
    return v;
  };
  for (let v = 0; v + 2 < pos.count; v += 3) {
    const a = raiz(id[v]), b = raiz(id[v + 1]), c = raiz(id[v + 2]);
    padre[b] = a;
    padre[raiz(c)] = raiz(a);
  }

  const colorDe = new Map<number, THREE.Color>();
  const colores = new Float32Array(pos.count * 3);
  for (let v = 0; v < pos.count; v++) {
    const r = raiz(id[v]);
    let color = colorDe.get(r);
    if (!color) {
      color = new THREE.Color(PALETA[colorDe.size % PALETA.length]);
      colorDe.set(r, color);
    }
    colores[v * 3] = color.r;
    colores[v * 3 + 1] = color.g;
    colores[v * 3 + 2] = color.b;
  }
  geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  return colorDe.size;
}

/* Aristas marcadas (más de 25° entre caras), como las líneas negras de SketchUp. */
export function crearBordes(geometria: THREE.BufferGeometry) {
  const lineas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometria, 25),
    new THREE.LineBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.6 })
  );
  lineas.name = "bordes-modelo";
  lineas.renderOrder = 10;
  return lineas;
}

/* Esfera de alambre alrededor de una zona con problemas. */
export function crearMarcaZona(centro: [number, number, number], radio: number) {
  const marca = new THREE.Mesh(
    new THREE.SphereGeometry(radio, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xd946ef, wireframe: true, transparent: true, opacity: 0.9, depthTest: false })
  );
  marca.name = "marca-zona";
  marca.position.set(...centro);
  marca.renderOrder = 60;
  return marca;
}

/* Lo que tapó "Reparar", pintado de verde encima del modelo. */
export function crearParches(posiciones: Float32Array) {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geometria.computeVertexNormals();
  const parches = new THREE.Mesh(
    geometria,
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  parches.name = "parches-reparacion";
  parches.renderOrder = 20;
  return parches;
}

/* Saca (y libera) un hijo del modelo por nombre. */
export function quitarHijo(modelo: THREE.Object3D, nombre: string) {
  const hijo = modelo.getObjectByName(nombre);
  if (!hijo) return;
  modelo.remove(hijo);
  hijo.traverse((objeto) => {
    const conGeometria = objeto as THREE.Mesh;
    conGeometria.geometry?.dispose();
    const material = conGeometria.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
