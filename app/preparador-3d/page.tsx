"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";

type Medidas = {
  ancho: number;
  profundidad: number;
  altura: number;
};

type ResultadoKintCheck = {
  aristasAbiertas: number;
  aristasNoManifold: number;
  triangulosDegenerados: number;
};

type FiltrosProblemas = {
  bordesAbiertos: boolean;
  noManifold: boolean;
  triangulos: boolean;
  flotantes: boolean;
};

type TamanoCama = 180 | 300;

type Vista3D =
  | "modelo"
  | "cama"
  | "superior";

const tamanosCama: TamanoCama[] = [180, 300];

const coloresModelo = [
  { nombre: "Blanco", valor: "#f4f4f4" },
  { nombre: "Negro", valor: "#181818" },
  { nombre: "Rojo", valor: "#ef0000" },
  { nombre: "Amarillo", valor: "#f5c400" },
  { nombre: "Naranja", valor: "#f97316" },
  { nombre: "Azul", valor: "#2563eb" },
  { nombre: "Verde", valor: "#166534" },
  { nombre: "Cristal", valor: "#dff6ff" },
];

function liberarObjeto(objeto: THREE.Object3D) {
  objeto.traverse((hijo) => {
    const elemento = hijo as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    elemento.geometry?.dispose();

    if (Array.isArray(elemento.material)) {
      elemento.material.forEach((material) =>
        material.dispose()
      );
    } else {
      elemento.material?.dispose();
    }
  });
}

function detectarPiezasFlotantes(
  geometria: THREE.BufferGeometry
): THREE.Box3[] {
  const copia = geometria.clone();

  copia.deleteAttribute("normal");

  const geometriaIndexada =
    BufferGeometryUtils.mergeVertices(
      copia,
      0.001
    );

  if (geometriaIndexada !== copia) {
    copia.dispose();
  }

  const indice =
    geometriaIndexada.getIndex();

  const posiciones =
    geometriaIndexada.getAttribute(
      "position"
    );

  if (!indice || !posiciones) {
    geometriaIndexada.dispose();
    return [];
  }

  /*
   * 1. Detectamos cada cuerpo independiente.
   */
  const padres =
    new Int32Array(posiciones.count);

  const usados =
    new Uint8Array(posiciones.count);

  for (
    let i = 0;
    i < posiciones.count;
    i++
  ) {
    padres[i] = i;
  }

  function buscarRaiz(
    numero: number
  ): number {
    let raiz = numero;

    while (padres[raiz] !== raiz) {
      raiz = padres[raiz];
    }

    while (padres[numero] !== numero) {
      const siguiente =
        padres[numero];

      padres[numero] = raiz;
      numero = siguiente;
    }

    return raiz;
  }

  function unir(
    a: number,
    b: number
  ) {
    const raizA =
      buscarRaiz(a);

    const raizB =
      buscarRaiz(b);

    if (raizA !== raizB) {
      padres[raizB] = raizA;
    }
  }

  const indices = indice.array;

  for (
    let i = 0;
    i + 2 < indices.length;
    i += 3
  ) {
    const a = Number(indices[i]);
    const b = Number(indices[i + 1]);
    const c = Number(indices[i + 2]);

    usados[a] = 1;
    usados[b] = 1;
    usados[c] = 1;

    unir(a, b);
    unir(b, c);
    unir(c, a);
  }

  /*
   * 2. Calculamos la caja y el peso
   *    aproximado de cada cuerpo.
   */
  const cajasPorPieza =
    new Map<number, THREE.Box3>();

  const pesoPorPieza =
    new Map<number, number>();

  const punto =
    new THREE.Vector3();

  for (
    let i = 0;
    i < posiciones.count;
    i++
  ) {
    if (usados[i] !== 1) {
      continue;
    }

    const raiz =
      buscarRaiz(i);

    let caja =
      cajasPorPieza.get(raiz);

    if (!caja) {
      caja = new THREE.Box3();

      cajasPorPieza.set(
        raiz,
        caja
      );
    }

    punto.fromBufferAttribute(
      posiciones,
      i
    );

    caja.expandByPoint(punto);

    pesoPorPieza.set(
      raiz,
      (pesoPorPieza.get(raiz) ?? 0) + 1
    );
  }

  const piezas =
    Array.from(
      cajasPorPieza.entries()
    ).map(
      ([raiz, caja]) => ({
        caja,
        peso:
          pesoPorPieza.get(raiz) ?? 1,
      })
    );

  if (piezas.length <= 1) {
    geometriaIndexada.dispose();
    return [];
  }

  /*
   * 3. Calculamos una tolerancia proporcional
   *    al tamaño del modelo.
   */
  const cajaGeneral =
    new THREE.Box3();

  piezas.forEach((pieza) => {
    cajaGeneral.union(
      pieza.caja
    );
  });

  const tamanoGeneral =
    cajaGeneral.getSize(
      new THREE.Vector3()
    );

  const dimensionGeneral =
    Math.max(
      tamanoGeneral.x,
      tamanoGeneral.y,
      tamanoGeneral.z,
      1
    );

  /*
   * Permitimos pequeñas separaciones propias
   * de exportaciones arquitectónicas.
   */
  const toleranciaConexion =
    Math.max(
      0.15,
      dimensionGeneral * 0.002
    );

  const toleranciaBase =
    Math.max(
      0.25,
      dimensionGeneral * 0.003
    );

  function estanCerca(
    a: THREE.Box3,
    b: THREE.Box3
  ) {
    const cajaA =
      a.clone().expandByScalar(
        toleranciaConexion
      );

    const cajaB =
      b.clone().expandByScalar(
        toleranciaConexion
      );

    return cajaA.intersectsBox(
      cajaB
    );
  }

  /*
   * 4. Agrupamos cuerpos que físicamente
   *    forman parte del mismo conjunto.
   *
   * Una columna tocando una viga,
   * una viga tocando una losa, etc.
   */
  const visitados =
    new Set<number>();

  const grupos: {
    indices: number[];
    peso: number;
  }[] = [];

  for (
    let i = 0;
    i < piezas.length;
    i++
  ) {
    if (visitados.has(i)) {
      continue;
    }

    const cola = [i];

    const indicesGrupo: number[] = [];

    let pesoGrupo = 0;

    visitados.add(i);

    while (cola.length > 0) {
      const actual =
        cola.shift();

      if (actual === undefined) {
        break;
      }

      indicesGrupo.push(actual);

      pesoGrupo +=
        piezas[actual].peso;

      for (
        let j = 0;
        j < piezas.length;
        j++
      ) {
        if (visitados.has(j)) {
          continue;
        }

        if (
          estanCerca(
            piezas[actual].caja,
            piezas[j].caja
          )
        ) {
          visitados.add(j);
          cola.push(j);
        }
      }
    }

    grupos.push({
      indices: indicesGrupo,
      peso: pesoGrupo,
    });
  }

/*
 * 5. Detectamos qué grupos están realmente
 *    apoyados desde la base del STL.
 *
 * La geometría más baja será la que apoyará
 * sobre la cama cuando carguemos el modelo.
 */
const baseCama =
  cajaGeneral.min.z;

const cajasGrupos =
  grupos.map((grupo) => {
    const cajaGrupo =
      new THREE.Box3();

    grupo.indices.forEach(
      (indicePieza) => {
        cajaGrupo.union(
          piezas[indicePieza].caja
        );
      }
    );

    return cajaGrupo;
  });

const gruposApoyados =
  new Set<number>();

/*
 * Primero: todo grupo que llega a la
 * parte más baja del STL toca la cama.
 */
cajasGrupos.forEach(
  (caja, indiceGrupo) => {
    if (
      caja.min.z <=
      baseCama + toleranciaBase
    ) {
      gruposApoyados.add(
        indiceGrupo
      );
    }
  }
);

/*
 * Permitimos que otro grupo esté apoyado
 * sobre uno que ya sabemos que está sostenido.
 */
const toleranciaSoporte =
  Math.max(
    toleranciaBase,
    toleranciaConexion * 2
  );

function estaApoyadoSobre(
  superior: THREE.Box3,
  inferior: THREE.Box3
) {
  const distanciaVertical =
    superior.min.z -
    inferior.max.z;

  /*
   * Tiene que estar aproximadamente
   * encima, no muy separado.
   */
  if (
    distanciaVertical <
      -toleranciaSoporte ||
    distanciaVertical >
      toleranciaSoporte
  ) {
    return false;
  }

  /*
   * También tienen que coincidir
   * horizontalmente.
   */
  const solapeX =
    Math.min(
      superior.max.x,
      inferior.max.x
    ) -
    Math.max(
      superior.min.x,
      inferior.min.x
    );

  const solapeY =
    Math.min(
      superior.max.y,
      inferior.max.y
    ) -
    Math.max(
      superior.min.y,
      inferior.min.y
    );

  return (
    solapeX >
      -toleranciaConexion &&
    solapeY >
      -toleranciaConexion
  );
}

/*
 * Propagamos el apoyo:
 *
 * cama → pieza → pieza superior → etc.
 */
let cambio = true;

while (cambio) {
  cambio = false;

  for (
    let i = 0;
    i < cajasGrupos.length;
    i++
  ) {
    if (gruposApoyados.has(i)) {
      continue;
    }

    for (
      const indiceApoyado
      of gruposApoyados
    ) {
      if (
        estaApoyadoSobre(
          cajasGrupos[i],
          cajasGrupos[indiceApoyado]
        )
      ) {
        gruposApoyados.add(i);
        cambio = true;
        break;
      }
    }
  }
}

/*
 * Todo grupo sin una cadena de apoyo
 * hasta la cama queda marcado.
 */
const flotantes =
  cajasGrupos
    .filter(
      (_, indiceGrupo) =>
        !gruposApoyados.has(
          indiceGrupo
        )
    )
    .map((caja) =>
      caja.clone()
    );
  geometriaIndexada.dispose();

  return flotantes;
}

function contarPiezasSeparadas(
  geometria: THREE.BufferGeometry
) {
  const copia = geometria.clone();

  /*
   * Quitamos las normales porque cada cara del STL
   * puede tener normales diferentes aunque comparta
   * exactamente la misma posición.
   */
  copia.deleteAttribute("normal");

  const geometriaIndexada =
    BufferGeometryUtils.mergeVertices(
      copia,
      0.001
    );

  if (geometriaIndexada !== copia) {
    copia.dispose();
  }

  const indice = geometriaIndexada.getIndex();

  const posiciones =
    geometriaIndexada.getAttribute("position");

  if (!indice || !posiciones) {
    geometriaIndexada.dispose();
    return 1;
  }

  const padres = new Int32Array(
    posiciones.count
  );

  const usados = new Uint8Array(
    posiciones.count
  );

  for (
    let numero = 0;
    numero < posiciones.count;
    numero += 1
  ) {
    padres[numero] = numero;
  }

  function buscarRaiz(numero: number): number {
    let raiz = numero;

    while (padres[raiz] !== raiz) {
      raiz = padres[raiz];
    }

    while (padres[numero] !== numero) {
      const siguiente = padres[numero];
      padres[numero] = raiz;
      numero = siguiente;
    }

    return raiz;
  }

  function unir(a: number, b: number) {
    const raizA = buscarRaiz(a);
    const raizB = buscarRaiz(b);

    if (raizA !== raizB) {
      padres[raizB] = raizA;
    }
  }

  const indices = indice.array;

  for (
    let numero = 0;
    numero + 2 < indices.length;
    numero += 3
  ) {
    const a = Number(indices[numero]);
    const b = Number(indices[numero + 1]);
    const c = Number(indices[numero + 2]);

    usados[a] = 1;
    usados[b] = 1;
    usados[c] = 1;

    unir(a, b);
    unir(b, c);
    unir(c, a);
  }

  const piezas = new Set<number>();

  for (
    let numero = 0;
    numero < posiciones.count;
    numero += 1
  ) {
    if (usados[numero] === 1) {
      piezas.add(buscarRaiz(numero));
    }
  }

  geometriaIndexada.dispose();

  return Math.max(piezas.size, 1);
}

function analizarGeometriaSTL(
  geometria: THREE.BufferGeometry
): ResultadoKintCheck {
  const copia = geometria.clone();

  copia.deleteAttribute("normal");

  const geometriaIndexada =
    BufferGeometryUtils.mergeVertices(
      copia,
      0.001
    );

  if (geometriaIndexada !== copia) {
    copia.dispose();
  }

  const indice =
    geometriaIndexada.getIndex();

  const posiciones =
    geometriaIndexada.getAttribute(
      "position"
    );

  if (!indice || !posiciones) {
    geometriaIndexada.dispose();

    return {
      aristasAbiertas: 0,
      aristasNoManifold: 0,
      triangulosDegenerados: 0,
    };
  }

  const aristas =
    new Map<string, number>();

  let triangulosDegenerados = 0;

  const puntoA = new THREE.Vector3();
  const puntoB = new THREE.Vector3();
  const puntoC = new THREE.Vector3();

  const ladoAB = new THREE.Vector3();
  const ladoAC = new THREE.Vector3();
  const cruz = new THREE.Vector3();

  function registrarArista(
    a: number,
    b: number
  ) {
    const menor = Math.min(a, b);
    const mayor = Math.max(a, b);

    const clave = `${menor}-${mayor}`;

    aristas.set(
      clave,
      (aristas.get(clave) ?? 0) + 1
    );
  }

  const indices = indice.array;

  for (
    let numero = 0;
    numero + 2 < indices.length;
    numero += 3
  ) {
    const a = Number(indices[numero]);
    const b = Number(indices[numero + 1]);
    const c = Number(indices[numero + 2]);

    registrarArista(a, b);
    registrarArista(b, c);
    registrarArista(c, a);

    puntoA.fromBufferAttribute(
      posiciones,
      a
    );

    puntoB.fromBufferAttribute(
      posiciones,
      b
    );

    puntoC.fromBufferAttribute(
      posiciones,
      c
    );

    ladoAB.subVectors(
      puntoB,
      puntoA
    );

    ladoAC.subVectors(
      puntoC,
      puntoA
    );

    cruz.crossVectors(
      ladoAB,
      ladoAC
    );

    if (
      a === b ||
      b === c ||
      c === a ||
      cruz.lengthSq() <= 1e-16
    ) {
      triangulosDegenerados++;
    }
  }

  let aristasAbiertas = 0;
  let aristasNoManifold = 0;

  aristas.forEach((cantidad) => {
    if (cantidad === 1) {
      aristasAbiertas++;
    }

    if (cantidad > 2) {
      aristasNoManifold++;
    }
  });

  geometriaIndexada.dispose();

  return {
    aristasAbiertas,
    aristasNoManifold,
    triangulosDegenerados,
  };
}

function crearMarcadoresProblemas(
  geometria: THREE.BufferGeometry,
  cajasFlotantes: THREE.Box3[]
) {
  const grupo = new THREE.Group();

  grupo.name = "kint-problemas";
  grupo.visible = false;

  const copia = geometria.clone();

  copia.deleteAttribute("normal");

  const geometriaIndexada =
    BufferGeometryUtils.mergeVertices(
      copia,
      0.001
    );

  if (geometriaIndexada !== copia) {
    copia.dispose();
  }

  const indice =
    geometriaIndexada.getIndex();

  const posiciones =
    geometriaIndexada.getAttribute(
      "position"
    );

  if (!indice || !posiciones) {
    geometriaIndexada.dispose();
    return grupo;
  }

  const aristas = new Map<
    string,
    {
      a: number;
      b: number;
      cantidad: number;
    }
  >();

  const triangulosDefectuosos: number[] = [];

  function registrarArista(
    a: number,
    b: number
  ) {
    const menor = Math.min(a, b);
    const mayor = Math.max(a, b);

    const clave = `${menor}-${mayor}`;

    const existente = aristas.get(clave);

    if (existente) {
      existente.cantidad += 1;
    } else {
      aristas.set(clave, {
        a: menor,
        b: mayor,
        cantidad: 1,
      });
    }
  }

  const puntoA = new THREE.Vector3();
  const puntoB = new THREE.Vector3();
  const puntoC = new THREE.Vector3();

  const ladoAB = new THREE.Vector3();
  const ladoAC = new THREE.Vector3();
  const cruz = new THREE.Vector3();

  const centroTriangulo =
    new THREE.Vector3();

  const indices = indice.array;

  for (
    let numero = 0;
    numero + 2 < indices.length;
    numero += 3
  ) {
    const a = Number(indices[numero]);
    const b = Number(indices[numero + 1]);
    const c = Number(indices[numero + 2]);

    registrarArista(a, b);
    registrarArista(b, c);
    registrarArista(c, a);

    puntoA.fromBufferAttribute(
      posiciones,
      a
    );

    puntoB.fromBufferAttribute(
      posiciones,
      b
    );

    puntoC.fromBufferAttribute(
      posiciones,
      c
    );

    ladoAB.subVectors(
      puntoB,
      puntoA
    );

    ladoAC.subVectors(
      puntoC,
      puntoA
    );

    cruz.crossVectors(
      ladoAB,
      ladoAC
    );

    if (
      a === b ||
      b === c ||
      c === a ||
      cruz.lengthSq() <= 1e-16
    ) {
      centroTriangulo
        .copy(puntoA)
        .add(puntoB)
        .add(puntoC)
        .multiplyScalar(1 / 3);

      triangulosDefectuosos.push(
        centroTriangulo.x,
        centroTriangulo.y,
        centroTriangulo.z
      );
    }
  }

  const aristasAbiertas: number[] = [];
  const aristasNoManifold: number[] = [];

  aristas.forEach(
    ({ a, b, cantidad }) => {
      if (
        cantidad !== 1 &&
        cantidad <= 2
      ) {
        return;
      }

      puntoA.fromBufferAttribute(
        posiciones,
        a
      );

      puntoB.fromBufferAttribute(
        posiciones,
        b
      );

      const destino =
        cantidad === 1
          ? aristasAbiertas
          : aristasNoManifold;

      destino.push(
        puntoA.x,
        puntoA.y,
        puntoA.z,
        puntoB.x,
        puntoB.y,
        puntoB.z
      );
    }
  );

  function agregarLineas(
    datos: number[],
    color: number,
    nombre: string
  ) {
    if (datos.length === 0) {
      return;
    }

    const geometriaLineas =
      new THREE.BufferGeometry();

    geometriaLineas.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        datos,
        3
      )
    );

    const materialLineas =
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false,
      });

    const lineas =
      new THREE.LineSegments(
        geometriaLineas,
        materialLineas
      );

    lineas.name = nombre;
    lineas.renderOrder = 50;

    grupo.add(lineas);
  }

  function agregarPuntos(
  datos: number[],
  color: number,
  nombre: string
) {
    if (datos.length === 0) {
      return;
    }

    const geometriaPuntos =
      new THREE.BufferGeometry();

    geometriaPuntos.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        datos,
        3
      )
    );

    const materialPuntos =
      new THREE.PointsMaterial({
        color,
        size: 5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false,
      });

    const puntos = new THREE.Points(
  geometriaPuntos,
  materialPuntos
);

puntos.name = nombre;
puntos.renderOrder = 51;

    grupo.add(puntos);
  }

  agregarLineas(
    aristasAbiertas,
    0xef0000,
    "bordes-abiertos"
  );

  agregarLineas(
    aristasNoManifold,
    0xf59e0b,
    "no-manifold"
  );

  agregarPuntos(
  triangulosDefectuosos,
  0xea580c,
  "triangulos-defectuosos"
);

/*
 * PIEZAS FLOTANTES
 */
const grupoFlotantes =
  new THREE.Group();

grupoFlotantes.name =
  "piezas-flotantes";

cajasFlotantes.forEach(
  (caja) => {
    const tamano =
      caja.getSize(
        new THREE.Vector3()
      );

    const centro =
      caja.getCenter(
        new THREE.Vector3()
      );

    const dimensionMayor =
      Math.max(
        tamano.x,
        tamano.y,
        tamano.z
      );

    const margen = Math.max(
      0.2,
      dimensionMayor * 0.03
    );

    const geometriaCaja =
      new THREE.BoxGeometry(
        tamano.x + margen * 2,
        tamano.y + margen * 2,
        tamano.z + margen * 2
      );

    const bordesCaja =
      new THREE.EdgesGeometry(
        geometriaCaja
      );

    geometriaCaja.dispose();

    const materialCaja =
      new THREE.LineBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
      });

    const marcador =
      new THREE.LineSegments(
        bordesCaja,
        materialCaja
      );

    marcador.position.copy(
      centro
    );

    marcador.renderOrder = 55;

    grupoFlotantes.add(
      marcador
    );
  }
);

grupo.add(grupoFlotantes);

geometriaIndexada.dispose();

return grupo;
}

function calcularKintScore(
  resultado: ResultadoKintCheck,
  entraEnCama: boolean
) {
  let puntaje = 100;

  /*
   * Bordes abiertos:
   * es el problema estructural más importante.
   */
  if (resultado.aristasAbiertas > 0) {
    puntaje -= 35;

    if (resultado.aristasAbiertas > 25) {
      puntaje -= 5;
    }

    if (resultado.aristasAbiertas > 100) {
      puntaje -= 10;
    }
  }

  /*
   * No-manifold:
   * puede generar problemas al laminar,
   * pero no siempre hace al STL inutilizable.
   */
  if (resultado.aristasNoManifold > 0) {
    puntaje -= 8;

    if (resultado.aristasNoManifold > 25) {
      puntaje -= 4;
    }

    if (resultado.aristasNoManifold > 100) {
      puntaje -= 8;
    }
  }

  /*
   * Triángulos degenerados:
   * se consideran una advertencia menor.
   */
  if (resultado.triangulosDegenerados > 0) {
    puntaje -= 4;

    if (resultado.triangulosDegenerados > 50) {
      puntaje -= 4;
    }

    if (resultado.triangulosDegenerados > 250) {
      puntaje -= 7;
    }
  }

  /*
   * Si actualmente no entra en la cama
   * seleccionada, todavía no está listo
   * para imprimir en esa configuración.
   */
  if (!entraEnCama) {
    puntaje -= 15;
  }

  /*
   * Una malla abierta nunca puede recibir
   * una valoración demasiado alta aunque
   * tenga pocos errores.
   */
  if (resultado.aristasAbiertas > 0) {
    puntaje = Math.min(puntaje, 60);
  }

  return Math.max(
    0,
    Math.min(100, puntaje)
  );
}

function obtenerNivelKintScore(
  puntaje: number
) {
  if (puntaje >= 90) {
    return {
      texto: "Excelente",
      textoColor: "text-green-600",
      fondo: "bg-green-500/10",
      barra: "bg-green-600",
    };
  }

  if (puntaje >= 75) {
    return {
      texto: "Bueno",
      textoColor: "text-blue-600",
      fondo: "bg-blue-500/10",
      barra: "bg-blue-600",
    };
  }

  if (puntaje >= 55) {
    return {
      texto: "Revisar",
      textoColor: "text-yellow-700",
      fondo: "bg-yellow-500/10",
      barra: "bg-yellow-500",
    };
  }

  return {
    texto: "Atención",
    textoColor: "text-red-600",
    fondo: "bg-red-500/10",
    barra: "bg-red-600",
  };
}

function crearCama(tamano: number) {
  const grupo = new THREE.Group();

  const geometriaBase = new THREE.BoxGeometry(
    tamano,
    2,
    tamano
  );

  const materialBase = new THREE.MeshStandardMaterial({
    color: 0xe8eef5,
    roughness: 0.9,
    metalness: 0,
  });

  const base = new THREE.Mesh(
    geometriaBase,
    materialBase
  );

  base.position.y = -1;
  base.receiveShadow = true;
  grupo.add(base);

  const divisiones = Math.max(
    2,
    Math.round(tamano / 10)
  );

  const cuadricula = new THREE.GridHelper(
    tamano,
    divisiones,
    0x8294aa,
    0xb9c7d8
  );

  cuadricula.position.y = 0.02;
  grupo.add(cuadricula);

  const geometriaVolumen = new THREE.BoxGeometry(
    tamano,
    tamano,
    tamano
  );

  const bordes = new THREE.EdgesGeometry(
    geometriaVolumen
  );

  geometriaVolumen.dispose();

  const materialBordes =
    new THREE.LineBasicMaterial({
      color: 0xef0000,
      transparent: true,
      opacity: 0.25,
    });

  const volumen = new THREE.LineSegments(
    bordes,
    materialBordes
  );

  volumen.position.y = tamano / 2;
  grupo.add(volumen);

  return grupo;
}

export default function Preparador3D() {
  const contenedorRef =
    useRef<HTMLDivElement>(null);

  const escenaRef = useRef<THREE.Scene | null>(
    null
  );

  const camaraRef =
    useRef<THREE.PerspectiveCamera | null>(null);

  const renderizadorRef =
    useRef<THREE.WebGLRenderer | null>(null);

  const controlesRef =
    useRef<OrbitControls | null>(null);

  const modeloRef = useRef<THREE.Mesh | null>(
    null
  );

  const problemasRef =
  useRef<THREE.Group | null>(null);

  const camaRef = useRef<THREE.Group | null>(
    null
  );

  const animacionRef = useRef<number | null>(
    null
  );

  const [tamanoCama, setTamanoCama] =
    useState<TamanoCama>(180);

  const [nombreArchivo, setNombreArchivo] =
    useState("");

  const [medidas, setMedidas] =
    useState<Medidas | null>(null);

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] = useState("");
  const [cantidadPiezas, setCantidadPiezas] =
  useState<number | null>(null);

const [escalaPorcentaje, setEscalaPorcentaje] =
  useState(100);

  const [escalaSeleccionada, setEscalaSeleccionada] =
  useState("");

  const [vistaActiva, setVistaActiva] =
  useState<Vista3D>("cama");
  
  const [colorModelo, setColorModelo] =
  useState("Rojo");

  const [kintCheck, setKintCheck] =
  useState<ResultadoKintCheck | null>(
    null
  );

  const [mostrarProblemas, setMostrarProblemas] =
  useState(false);

  const [piezasFlotantes, setPiezasFlotantes] =
  useState(0);

  const [filtrosProblemas, setFiltrosProblemas] =
  useState<FiltrosProblemas>({
    bordesAbiertos: true,
    noManifold: true,
    triangulos: true,
    flotantes: true,
  });

  const excesoAncho = medidas
  ? Math.max(0, medidas.ancho - tamanoCama)
  : 0;

const excesoProfundidad = medidas
  ? Math.max(
      0,
      medidas.profundidad - tamanoCama
    )
  : 0;

const excesoAltura = medidas
  ? Math.max(0, medidas.altura - tamanoCama)
  : 0;

const entraEnCama =
  medidas !== null &&
  excesoAncho === 0 &&
  excesoProfundidad === 0 &&
  excesoAltura === 0;

const dimensionMenorModelo = medidas
  ? Math.min(
      medidas.ancho,
      medidas.profundidad,
      medidas.altura
    )
  : null;

const dimensionMayorModelo = medidas
  ? Math.max(
      medidas.ancho,
      medidas.profundidad,
      medidas.altura
    )
  : null;

const modeloExtremadamentePequeno =
  dimensionMayorModelo !== null &&
  dimensionMayorModelo < 5;

const dimensionCritica =
  dimensionMenorModelo !== null &&
  dimensionMenorModelo < 0.2;

const dimensionFina =
  dimensionMenorModelo !== null &&
  dimensionMenorModelo >= 0.2 &&
  dimensionMenorModelo < 0.4;

  const kintScore = kintCheck
  ? calcularKintScore(
      kintCheck,
      entraEnCama
    )
  : null;

const nivelKintScore =
  kintScore !== null
    ? obtenerNivelKintScore(kintScore)
    : null;

  useEffect(() => {
    const contenedor = contenedorRef.current;

    if (!contenedor) return;

    const escena = new THREE.Scene();
    escenaRef.current = escena;

    const camara =
      new THREE.PerspectiveCamera(
        45,
        1,
        0.1,
        10000
      );

    camara.position.set(260, 220, 260);
    camaraRef.current = camara;

    const renderizador =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });

    renderizador.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type =
      THREE.PCFSoftShadowMap;

    renderizadorRef.current = renderizador;
    contenedor.appendChild(
      renderizador.domElement
    );

    const luzAmbiente =
      new THREE.HemisphereLight(
        0xffffff,
        0x485568,
        2.2
      );

    escena.add(luzAmbiente);

    const luzPrincipal =
      new THREE.DirectionalLight(
        0xffffff,
        3
      );

    luzPrincipal.position.set(
      250,
      350,
      200
    );

    luzPrincipal.castShadow = true;
    escena.add(luzPrincipal);

    const luzSecundaria =
      new THREE.DirectionalLight(
        0xffffff,
        1.2
      );

    luzSecundaria.position.set(
      -200,
      150,
      -150
    );

    escena.add(luzSecundaria);

    const controles = new OrbitControls(
      camara,
      renderizador.domElement
    );

    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    controles.target.set(0, 35, 0);
    controlesRef.current = controles;

    function ajustarTamano() {
      if (!contenedorRef.current) return;

      const ancho =
        contenedorRef.current.clientWidth;

      const alto =
        contenedorRef.current.clientHeight;

      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();

      renderizador.setSize(
  ancho,
  alto
);
    }

    ajustarTamano();

    const observador = new ResizeObserver(
      ajustarTamano
    );

    observador.observe(contenedor);

    function animar() {
      controles.update();
      renderizador.render(escena, camara);

      animacionRef.current =
        requestAnimationFrame(animar);
    }

    animar();

    return () => {
      observador.disconnect();

      if (animacionRef.current !== null) {
        cancelAnimationFrame(
          animacionRef.current
        );
      }

      controles.dispose();

      if (modeloRef.current) {
        escena.remove(modeloRef.current);
        liberarObjeto(modeloRef.current);
      }

      if (camaRef.current) {
        escena.remove(camaRef.current);
        liberarObjeto(camaRef.current);
      }

      renderizador.dispose();

      if (
        renderizador.domElement.parentNode ===
        contenedor
      ) {
        contenedor.removeChild(
          renderizador.domElement
        );
      }
    };
  }, []);

  useEffect(() => {
    const escena = escenaRef.current;
    const camara = camaraRef.current;
    const controles = controlesRef.current;

    if (!escena || !camara || !controles) {
      return;
    }

    if (camaRef.current) {
      escena.remove(camaRef.current);
      liberarObjeto(camaRef.current);
    }

    const camaNueva = crearCama(tamanoCama);

    camaRef.current = camaNueva;
    escena.add(camaNueva);
    setVistaActiva("cama");

   const centroCama = new THREE.Vector3(
  0,
  tamanoCama / 2,
  0
);

const distancia = tamanoCama * 2.25;

/*
 * Evitamos que la cámara pueda desplazarse
 * lateralmente y perder el centro.
 */
controles.enablePan = false;
controles.target.copy(centroCama);

camara.position.set(
  distancia,
  tamanoCama / 2 + distancia * 0.45,
  distancia
);

camara.up.set(0, 1, 0);

camara.near = 0.1;
camara.far = tamanoCama * 20;
camara.updateProjectionMatrix();

camara.lookAt(centroCama);
controles.update();
controles.saveState();

/*
 * Repetimos el centrado cuando el navegador
 * ya terminó de calcular el tamaño del visor.
 */
requestAnimationFrame(() => {
  controles.target.copy(centroCama);
  camara.lookAt(centroCama);
  controles.update();
});
  }, [tamanoCama]);

function aplicarEscala(nuevoPorcentaje: number) {
  const modelo = modeloRef.current;

  if (!modelo) {
    return;
  }

  const porcentajeSeguro = Math.min(
  1000,
  Math.max(0.01, nuevoPorcentaje)
);

  const factor = porcentajeSeguro / 100;

  modelo.scale.setScalar(factor);
  modelo.updateMatrixWorld(true);

  /*
   * Después de escalar volvemos a centrar
   * el modelo sobre la cama y apoyarlo en Y = 0.
   */
  let caja = new THREE.Box3().setFromObject(modelo);

  const centro = caja.getCenter(
    new THREE.Vector3()
  );

  modelo.position.x -= centro.x;
  modelo.position.z -= centro.z;
  modelo.position.y -= caja.min.y;

  modelo.updateMatrixWorld(true);

  caja = new THREE.Box3().setFromObject(modelo);

  const tamano = caja.getSize(
    new THREE.Vector3()
  );

  setMedidas({
    ancho: tamano.x,
    profundidad: tamano.z,
    altura: tamano.y,
  });

  setEscalaPorcentaje(porcentajeSeguro);
}

function cambiarEscalaArquitectonica(
  valor: string
) {
  setEscalaSeleccionada(valor);

  /*
   * Sin seleccionar escala:
   * dejamos el STL exactamente como fue cargado.
   */
  if (!valor) {
    aplicarEscala(100);
    return;
  }

  const denominador = Number(valor);

  if (
    !Number.isFinite(denominador) ||
    denominador <= 0
  ) {
    return;
  }

  /*
   * Ejemplos:
   * 1:50   = 2%
   * 1:100  = 1%
   * 1:200  = 0.5%
   * 1:500  = 0.2%
   */
  const porcentaje = 100 / denominador;

  aplicarEscala(porcentaje);

  setVistaActiva("modelo");

requestAnimationFrame(() => {
  cambiarVista("modelo");
});
}

function descargarSTLPreparado() {
  const modelo = modeloRef.current;

  if (!modelo || !nombreArchivo) {
    return;
  }

  /*
   * La geometría del Mesh sigue siendo la del STL
   * original. La rotación -90° se usa solamente
   * para visualizarlo correctamente en Three.js.
   *
   * Por eso clonamos la geometría y aplicamos
   * solamente la escala, conservando la orientación
   * original para el archivo descargado.
   */
  const geometriaExportacion =
    modelo.geometry.clone();

  const factor = escalaPorcentaje / 100;

  geometriaExportacion.scale(
    factor,
    factor,
    factor
  );

  geometriaExportacion.computeVertexNormals();

  const modeloExportacion =
    new THREE.Mesh(geometriaExportacion);

  modeloExportacion.updateMatrixWorld(true);

  const exportador = new STLExporter();

  const resultado = exportador.parse(
    modeloExportacion,
    {
      binary: true,
    }
  );

  /*
   * Copiamos los datos binarios a un ArrayBuffer
   * propio para crear el archivo descargable.
   */
  const datos = new Uint8Array(
    resultado.byteLength
  );

  datos.set(
    new Uint8Array(
      resultado.buffer,
      resultado.byteOffset,
      resultado.byteLength
    )
  );

  const archivo = new Blob(
    [datos.buffer],
    {
      type: "model/stl",
    }
  );

  const url = URL.createObjectURL(archivo);

  const enlace =
    document.createElement("a");

  const nombreBase = nombreArchivo.replace(
    /\.stl$/i,
    ""
  );

  const sufijo = escalaSeleccionada
    ? `-escala-1-${escalaSeleccionada}`
    : "-preparado";

  enlace.href = url;
  enlace.download =
    `${nombreBase}${sufijo}.stl`;

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);

  geometriaExportacion.dispose();
}

function cambiarColorModelo(nombre: string) {
  const modelo = modeloRef.current;

  if (!modelo) {
    return;
  }

  const color = coloresModelo.find(
    (opcion) => opcion.nombre === nombre
  );

  if (!color) {
    return;
  }

  const material = modelo.material;

  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return;
  }

  setColorModelo(nombre);

  material.color.set(color.valor);

  if (nombre === "Cristal") {
    material.transparent = true;
    material.opacity = 0.45;
    material.roughness = 0.25;
  } else {
    material.transparent = false;
    material.opacity = 1;
    material.roughness = 0.55;
  }

  material.needsUpdate = true;
}

  async function cargarSTL(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const archivo =
      evento.target.files?.[0];

    evento.target.value = "";

    if (!archivo) return;

    setError("");
setCantidadPiezas(null);
setCargando(true);

    try {
      if (
        !archivo.name
          .toLowerCase()
          .endsWith(".stl")
      ) {
        throw new Error(
          "Seleccioná un archivo STL."
        );
      }

      const escena = escenaRef.current;
      const camara = camaraRef.current;
      const controles = controlesRef.current;

      if (!escena || !camara || !controles) {
        throw new Error(
          "El visor todavía no está listo."
        );
      }

      const contenido =
        await archivo.arrayBuffer();

      const cargador = new STLLoader();

      const geometria =
        cargador.parse(contenido);

      if (
        !geometria.attributes.position ||
        geometria.attributes.position.count ===
          0
      ) {
        geometria.dispose();

        throw new Error(
          "El archivo STL no contiene geometría."
        );
      }

      const piezasDetectadas =
  contarPiezasSeparadas(
    geometria
  );

const cajasFlotantes =
  detectarPiezasFlotantes(
    geometria
  );

const resultadoCheck =
  analizarGeometriaSTL(
    geometria
  );

setCantidadPiezas(
  piezasDetectadas
);

setPiezasFlotantes(
  cajasFlotantes.length
);

setKintCheck(
  resultadoCheck
);

geometria.computeVertexNormals();

      const material =
        new THREE.MeshStandardMaterial({
          color: 0xef0000,
          roughness: 0.55,
          metalness: 0.05,
        });

      const modelo = new THREE.Mesh(
        geometria,
        material
      );

      modelo.castShadow = true;
      modelo.receiveShadow = true;

      const marcadoresProblemas =
  crearMarcadoresProblemas(
    geometria,
    cajasFlotantes
  );

  modelo.add(marcadoresProblemas);

  problemasRef.current =
  marcadoresProblemas;

setMostrarProblemas(false);

setFiltrosProblemas({
  bordesAbiertos: true,
  noManifold: true,
  triangulos: true,
  flotantes: true,
});

      /*
       * Los STL de impresión suelen usar Z
       * como altura. Giramos el modelo para
       * que la altura quede hacia arriba.
       */
      modelo.rotation.x = -Math.PI / 2;
      modelo.updateMatrixWorld(true);

      let caja = new THREE.Box3().setFromObject(
        modelo
      );

      const centro = caja.getCenter(
        new THREE.Vector3()
      );

      modelo.position.x -= centro.x;
      modelo.position.z -= centro.z;
      modelo.position.y -= caja.min.y;

      modelo.updateMatrixWorld(true);

      caja = new THREE.Box3().setFromObject(
        modelo
      );

      const tamano = caja.getSize(
        new THREE.Vector3()
      );

      if (modeloRef.current) {
        escena.remove(modeloRef.current);
        liberarObjeto(modeloRef.current);
      }

      modeloRef.current = modelo;
escena.add(modelo);

setNombreArchivo(archivo.name);
setEscalaPorcentaje(100);
setEscalaSeleccionada("");
setColorModelo("Rojo");

      setMedidas({
        ancho: tamano.x,
        profundidad: tamano.z,
        altura: tamano.y,
      });

      setVistaActiva("modelo");

requestAnimationFrame(() => {
  cambiarVista("modelo");
});

    } catch (problema) {
      const mensaje =
        problema instanceof Error
          ? problema.message
          : "No se pudo abrir el archivo.";

      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  function cambiarFiltroProblema(
  filtro: keyof FiltrosProblemas,
  nombreObjeto: string
) {
  const problemas =
    problemasRef.current;

  if (!problemas) {
    return;
  }

  const nuevoEstado =
    !filtrosProblemas[filtro];

  const objeto =
    problemas.getObjectByName(
      nombreObjeto
    );

  if (objeto) {
    objeto.visible =
      nuevoEstado;
  }

  setFiltrosProblemas(
    (actuales) => ({
      ...actuales,
      [filtro]: nuevoEstado,
    })
  );
}

  function alternarProblemas() {
  const problemas =
    problemasRef.current;

  const modelo =
    modeloRef.current;

  if (!problemas || !modelo) {
    return;
  }

  const nuevoEstado =
    !mostrarProblemas;

  problemas.visible =
    nuevoEstado;

  setMostrarProblemas(
    nuevoEstado
  );

  const material =
    modelo.material;

  if (
    material instanceof
    THREE.MeshStandardMaterial
  ) {
    if (nuevoEstado) {
      /*
       * Modo diagnóstico:
       * neutralizamos el modelo para que
       * rojo, amarillo y naranja destaquen.
       */
      material.color.set("#e5e7eb");
      material.transparent = true;
      material.opacity = 0.55;
      material.roughness = 0.7;
    } else {
      /*
       * Recuperamos el color que el usuario
       * tenía seleccionado.
       */
      const colorOriginal =
        coloresModelo.find(
          (opcion) =>
            opcion.nombre === colorModelo
        );

      if (colorOriginal) {
        material.color.set(
          colorOriginal.valor
        );
      }

      if (colorModelo === "Cristal") {
        material.transparent = true;
        material.opacity = 0.45;
        material.roughness = 0.25;
      } else {
        material.transparent = false;
        material.opacity = 1;
        material.roughness = 0.55;
      }
    }

    material.needsUpdate = true;
  }

  if (nuevoEstado) {
    setVistaActiva("modelo");

    requestAnimationFrame(() => {
      cambiarVista("modelo");
    });
  }
}

  function cambiarVista(tipo: Vista3D) {
  const camara = camaraRef.current;
  const controles = controlesRef.current;
  const cama = camaRef.current;
  const modelo = modeloRef.current;

  if (!camara || !controles || !cama) {
    return;
  }

  const caja = new THREE.Box3();

  /*
   * VISTA MODELO
   *
   * Solamente usamos las dimensiones del STL.
   * Así una pieza pequeña no queda perdida dentro
   * del volumen completo de la impresora.
   */
  if (tipo === "modelo" && modelo) {
    caja.setFromObject(modelo);
  } else {
    /*
     * VISTA CAMA / SUPERIOR
     *
     * Mostramos cama + modelo para comprobar
     * visualmente cómo entra dentro del volumen.
     */
    caja.expandByObject(cama);

    if (modelo) {
      caja.expandByObject(modelo);
    }
  }

  if (caja.isEmpty()) {
    return;
  }

  const centro = caja.getCenter(
    new THREE.Vector3()
  );

  const tamano = caja.getSize(
    new THREE.Vector3()
  );

  const dimensionMayor = Math.max(
    tamano.x,
    tamano.y,
    tamano.z,
    1
  );

  const fovVertical =
    THREE.MathUtils.degToRad(camara.fov);

  const fovHorizontal =
    2 *
    Math.atan(
      Math.tan(fovVertical / 2) *
        camara.aspect
    );

  const fovLimitante = Math.min(
    fovVertical,
    fovHorizontal
  );

  /*
   * En el modelo dejamos un poco más de aire
   * alrededor para que no quede pegado a los bordes.
   */
  const margen =
    tipo === "modelo" ? 1.65 : 1.35;

  const distancia =
    ((dimensionMayor / 2) /
      Math.tan(fovLimitante / 2)) *
    margen;

  controles.target.copy(centro);

  if (tipo === "superior") {
    camara.up.set(0, 0, -1);

    camara.position.set(
      centro.x,
      centro.y + distancia,
      centro.z
    );
  } else {
    camara.up.set(0, 1, 0);

    const direccion =
      new THREE.Vector3(
        1,
        0.72,
        1
      ).normalize();

    camara.position.copy(
      centro
        .clone()
        .add(
          direccion.multiplyScalar(
            distancia
          )
        )
    );
  }

  camara.near = Math.max(
    distancia / 1000,
    0.01
  );

  camara.far = Math.max(
    distancia * 50,
    tamanoCama * 20
  );

  camara.updateProjectionMatrix();
  camara.lookAt(centro);

  controles.minDistance = Math.max(
    dimensionMayor * 0.08,
    0.1
  );

  controles.maxDistance = Math.max(
    dimensionMayor * 20,
    tamanoCama * 10
  );

  controles.update();
}

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
  <div className="mx-auto max-w-[1600px]">

        <div className="mb-8 pt-28 sm:pt-32">
  <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-red-600">
    VISTA PREVIA INTELIGENTE
  </p>

          <h1 className="text-2xl font-black uppercase tracking-[0.12em] sm:text-4xl">
            Ver mi modelo en 3D
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
  Cargá un archivo STL, revisá sus medidas y
  comprobá si entra dentro del volumen de impresión.
</p>

<Link
  href="/tutorial-avanzado"
  className="mt-5 inline-flex items-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:text-red-600"
>
  ¿No tenés el STL preparado? Ver cómo exportarlo correctamente →
</Link>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
  <aside className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
  <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
    Archivo STL
  </p>

  {nombreArchivo && (
    <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-green-600">
      Cargado
    </span>
  )}
</div>

<label className="mt-3 block cursor-pointer rounded-xl border border-red-600 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-600 hover:text-white">
  {cargando
    ? "Cargando..."
    : nombreArchivo
      ? "Cambiar archivo"
      : "Seleccionar STL"}

  <input
    type="file"
    accept=".stl"
    className="hidden"
    disabled={cargando}
    onChange={cargarSTL}
  />
</label>

{nombreArchivo && (
  <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-4 py-3">

    <p
      className="truncate text-xs font-bold"
      title={nombreArchivo}
    >
      {nombreArchivo}
    </p>

    {cantidadPiezas !== null && (
      <div className="mt-2 flex items-center gap-2">

        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            cantidadPiezas === 1
              ? "bg-green-600"
              : "bg-blue-500"
          }`}
        />

        <p className="text-[10px] leading-5 text-[var(--text-muted)]">
          {cantidadPiezas === 1
            ? "1 pieza detectada"
            : `${cantidadPiezas} piezas separadas detectadas`}
        </p>

      </div>
    )}

    {cantidadPiezas !== null &&
      cantidadPiezas > 1 && (
        <p className="mt-2 border-t border-[var(--border-color)] pt-2 text-[9px] leading-4 text-[var(--text-muted)]">
          El STL contiene varios cuerpos independientes.
          Esto puede ser correcto si preparaste varias
          piezas para imprimir juntas.
        </p>
      )}

  </div>
)}



            <div className="my-6 h-px bg-[var(--border-color)]" />

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]">
              Cama de impresión
            </p>

            <div className="grid grid-cols-2 gap-2">
              {tamanosCama.map((tamano) => (
                <button
                  key={tamano}
                  type="button"
                  onClick={() =>
                    setTamanoCama(tamano)
                  }
                  className={`rounded-lg border px-2 py-3 text-[10px] font-bold transition ${
                    tamanoCama === tamano
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-[var(--border-color)] hover:border-red-600"
                  }`}
                >
                  {tamano}
                  <span className="block text-[8px] font-normal">
                    mm
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
              Volumen seleccionado:{" "}
              {tamanoCama} × {tamanoCama} ×{" "}
              {tamanoCama} mm
            </p>

{medidas && (
  <>
    <div className="my-6 h-px bg-[var(--border-color)]" />

    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]">
      Escalar modelo
    </p>

    <select
      value={escalaSeleccionada}
      onChange={(evento) =>
        cambiarEscalaArquitectonica(
          evento.target.value
        )
      }
      className="w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm font-bold outline-none transition focus:border-red-600"
    >
      <option value="">
        Tamaño actual del archivo
      </option>

      <option value="20">Escala 1:20</option>
      <option value="25">Escala 1:25</option>
      <option value="50">Escala 1:50</option>
      <option value="75">Escala 1:75</option>
      <option value="100">Escala 1:100</option>
      <option value="150">Escala 1:150</option>
      <option value="200">Escala 1:200</option>
      <option value="250">Escala 1:250</option>
      <option value="500">Escala 1:500</option>
      <option value="1000">Escala 1:1000</option>
    </select>

    <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
  Si tu STL ya está a escala, no cambies nada.
  Elegí una escala solamente si el archivo fue
  exportado a tamaño real.
</p>

    {escalaSeleccionada && (
  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
    <span className="text-[10px] font-semibold text-[var(--text-muted)]">
      Escala aplicada
    </span>

    <strong className="text-xs text-blue-600">
      1:{escalaSeleccionada}
    </strong>
  </div>
)}
  </>
)}

{medidas && (
  <>
    <div className="my-6 h-px bg-[var(--border-color)]" />

    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
        Previsualizar color
      </p>

      <span className="text-[9px] font-semibold text-[var(--text-muted)]">
        {colorModelo}
      </span>
    </div>

    <div className="grid grid-cols-4 gap-2">
      {coloresModelo.map((color) => (
        <button
          key={color.nombre}
          type="button"
          onClick={() =>
            cambiarColorModelo(color.nombre)
          }
          title={color.nombre}
          className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition ${
            colorModelo === color.nombre
              ? "border-red-600"
              : "border-[var(--border-color)] hover:border-red-600"
          }`}
        >
          <span
            className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
            style={{
              backgroundColor: color.valor,
            }}
          />

          <span className="text-[8px] font-bold">
            {color.nombre}
          </span>
        </button>
      ))}
    </div>

    <p className="mt-3 text-[9px] leading-4 text-[var(--text-muted)]">
      Vista aproximada. El color no modifica el archivo STL.
    </p>
  </>
)}

<div className="my-6 h-px bg-[var(--border-color)]" />

<div className="mb-3 flex items-center justify-between gap-3">
  <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
    Medidas del modelo
  </p>

  {medidas && (
    <span className="text-[9px] font-semibold text-[var(--text-muted)]">
      mm
    </span>
  )}
</div>

{medidas ? (
  <div>
    <div className="grid grid-cols-3 gap-2">

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-3 py-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Ancho
        </p>

        <p className="mt-1 text-sm font-black">
          {medidas.ancho.toFixed(1)}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-3 py-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Prof.
        </p>

        <p className="mt-1 text-sm font-black">
          {medidas.profundidad.toFixed(1)}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-3 py-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Altura
        </p>

        <p className="mt-1 text-sm font-black">
          {medidas.altura.toFixed(1)}
        </p>
      </div>

    </div>

    <div
      className={`mt-3 rounded-xl border px-4 py-3 ${
        entraEnCama
          ? "border-green-500/40 bg-green-500/10"
          : "border-red-500/40 bg-red-500/10"
      }`}
    >
      <div className="flex items-center gap-2">

        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
            entraEnCama
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {entraEnCama ? "✓" : "!"}
        </span>

        <p
          className={`text-[10px] font-black uppercase tracking-[0.08em] ${
            entraEnCama
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {entraEnCama
            ? `Entra en la cama de ${tamanoCama} mm`
            : `No entra en la cama de ${tamanoCama} mm`}
        </p>

      </div>

      {!entraEnCama && (
        <div className="mt-3 space-y-1 border-t border-red-500/20 pt-3 text-[10px] leading-5 text-[var(--text-muted)]">

          {excesoAncho > 0 && (
            <p>
              Ancho: supera el límite por{" "}
              <strong className="text-red-600">
                {excesoAncho.toFixed(1)} mm
              </strong>
            </p>
          )}

          {excesoProfundidad > 0 && (
            <p>
              Profundidad: supera el límite por{" "}
              <strong className="text-red-600">
                {excesoProfundidad.toFixed(1)} mm
              </strong>
            </p>
          )}

          {excesoAltura > 0 && (
            <p>
              Altura: supera el límite por{" "}
              <strong className="text-red-600">
                {excesoAltura.toFixed(1)} mm
              </strong>
            </p>
          )}

        </div>
      )}

    </div>
  </div>
) : (
  <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-4 text-center">
    <p className="text-[10px] leading-5 text-[var(--text-muted)]">
      Las medidas aparecerán después de cargar un STL.
    </p>
  </div>
)}

{medidas && (
  <>
    <div className="my-6 h-px bg-[var(--border-color)]" />

    <button
      type="button"
      onClick={descargarSTLPreparado}
      className="w-full rounded-xl bg-red-600 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-red-700"
    >
      {escalaSeleccionada
        ? `Descargar STL · 1:${escalaSeleccionada}`
        : "Descargar STL preparado"}
    </button>

    <p className="mt-2 text-center text-[9px] leading-4 text-[var(--text-muted)]">
      Se descargará una copia nueva. Tu archivo original no se modifica.
    </p>
  </>
)}

{kintCheck && (
  <>
    <div className="my-6 h-px bg-[var(--border-color)]" />

    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
        Kint Check
      </p>

      <span
        className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${
          kintCheck.aristasAbiertas > 0
            ? "bg-red-500/10 text-red-600"
            : kintCheck.aristasNoManifold > 0 ||
                kintCheck.triangulosDegenerados > 0
              ? "bg-yellow-500/10 text-yellow-700"
              : "bg-green-500/10 text-green-600"
        }`}
      >
        {kintCheck.aristasAbiertas > 0
          ? "Error de malla"
          : kintCheck.aristasNoManifold > 0 ||
              kintCheck.triangulosDegenerados > 0
            ? "Revisión recomendada"
            : "Sin problemas detectados"}
      </span>
    </div>

    {kintScore !== null &&
  nivelKintScore && (
    <div
      className={`mt-3 rounded-2xl border border-[var(--border-color)] p-4 ${nivelKintScore.fondo}`}
    >
      <div className="flex items-end justify-between gap-4">

        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Kint Score
          </p>

          <div className="mt-1 flex items-baseline gap-1">
            <strong className="text-3xl font-black">
              {kintScore}
            </strong>

            <span className="text-xs font-semibold text-[var(--text-muted)]">
              /100
            </span>
          </div>
        </div>

        <span
          className={`text-xs font-black uppercase tracking-[0.08em] ${nivelKintScore.textoColor}`}
        >
          {nivelKintScore.texto}
        </span>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${nivelKintScore.barra}`}
          style={{
            width: `${kintScore}%`,
          }}
        />
      </div>

      <p className="mt-3 text-[9px] leading-4 text-[var(--text-muted)]">
        Puntaje orientativo según geometría y
        compatibilidad con la cama seleccionada.
      </p>
    </div>
    )}

  <details className="group mt-3">
    <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-4 py-3 transition hover:border-red-600 [&::-webkit-details-marker]:hidden">
      <div>
        <p className="text-[10px] font-bold">
          Ver análisis completo
        </p>

        <p className="mt-1 text-[9px] text-[var(--text-muted)]">
          Tamaño, malla y geometría del STL
        </p>
      </div>

      <span className="text-xs font-bold transition-transform duration-200 group-open:rotate-180">
        ↓
      </span>
    </summary>

    <div className="mt-3">

      {/* TAMAÑO Y ESCALA */}
      {medidas && (
  <div
    className={`rounded-xl border px-4 py-3 ${
      modeloExtremadamentePequeno ||
      dimensionCritica
        ? "border-red-500/40 bg-red-500/5"
        : dimensionFina
          ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-green-500/30 bg-green-500/5"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold">
          Tamaño y escala
        </p>

        <p className="mt-1 text-[9px] leading-4 text-[var(--text-muted)]">
          Comprueba dimensiones generales que pueden
          indicar un error de escala o unidades.
        </p>
      </div>

      <strong
        className={`shrink-0 text-xs ${
          modeloExtremadamentePequeno ||
          dimensionCritica
            ? "text-red-600"
            : dimensionFina
              ? "text-yellow-700"
              : "text-green-600"
        }`}
      >
        {modeloExtremadamentePequeno ||
        dimensionCritica
          ? "!"
          : dimensionFina
            ? "⚠"
            : "✓"}
      </strong>
    </div>

    {(modeloExtremadamentePequeno ||
      dimensionCritica ||
      dimensionFina) && (
      <div className="mt-3 border-t border-[var(--border-color)] pt-3">

        {modeloExtremadamentePequeno && (
          <p className="text-[9px] leading-5 text-red-600">
            El modelo completo mide menos de 5 mm.
            Revisá las unidades y la escala antes de imprimir.
          </p>
        )}

        {dimensionCritica && (
          <p className="mt-1 text-[9px] leading-5 text-red-600">
            Una dimensión general del modelo es menor
            a 0,2 mm.
          </p>
        )}

        {dimensionFina && (
          <p className="mt-1 text-[9px] leading-5 text-yellow-700">
            Una dimensión general está entre 0,2 y
            0,4 mm. Puede requerir revisión según la pieza.
          </p>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-[9px] font-bold">
            ¿Qué tengo que revisar?
          </summary>

          <p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">
            Confirmá que el STL fue exportado en milímetros
            y que la escala seleccionada es la correcta.
            Si el archivo ya estaba escalado, dejá
            “Tamaño actual del archivo”.
          </p>
        </details>

      </div>
    )}
  </div>
)}

    <div className="mt-3 space-y-2">

      {/* MALLA CERRADA */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          kintCheck.aristasAbiertas === 0
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/40 bg-red-500/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold">
              Malla cerrada
            </p>

            <p className="mt-1 text-[9px] leading-4 text-[var(--text-muted)]">
              Comprueba si existen bordes abiertos o agujeros en el modelo.
            </p>
          </div>

          <strong
            className={`shrink-0 text-xs ${
              kintCheck.aristasAbiertas === 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {kintCheck.aristasAbiertas === 0
              ? "✓"
              : kintCheck.aristasAbiertas}
          </strong>
        </div>

        {kintCheck.aristasAbiertas > 0 && (
          <details className="mt-3 border-t border-red-500/20 pt-3">
            <summary className="cursor-pointer text-[9px] font-bold text-red-600">
              ¿Cómo lo arreglo?
            </summary>

            <p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">
              Revisá el modelo buscando caras faltantes,
              huecos o superficies que no estén cerradas.
              Para impresión 3D, cada pieza debería formar
              un volumen completamente cerrado.
            </p>
          </details>
        )}
      </div>

      {/* NO MANIFOLD */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          kintCheck.aristasNoManifold === 0
            ? "border-green-500/30 bg-green-500/5"
            : "border-yellow-500/40 bg-yellow-500/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold">
              Geometría no-manifold
            </p>

            <p className="mt-1 text-[9px] leading-4 text-[var(--text-muted)]">
              Detecta aristas compartidas de una forma que
              puede generar conflictos al laminar.
            </p>
          </div>

          <strong
            className={`shrink-0 text-xs ${
              kintCheck.aristasNoManifold === 0
                ? "text-green-600"
                : "text-yellow-700"
            }`}
          >
            {kintCheck.aristasNoManifold === 0
              ? "✓"
              : kintCheck.aristasNoManifold}
          </strong>
        </div>

        {kintCheck.aristasNoManifold > 0 && (
          <details className="mt-3 border-t border-yellow-500/20 pt-3">
            <summary className="cursor-pointer text-[9px] font-bold text-yellow-700">
              ¿Cómo lo arreglo?
            </summary>

            <p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">
              Revisá caras internas, geometrías superpuestas
              o zonas donde varios volúmenes se cruzan sin
              estar correctamente unidos. El archivo puede
              seguir siendo imprimible, pero recomendamos
              revisarlo antes de enviarlo.
            </p>
          </details>
        )}
      </div>

      {/* TRIÁNGULOS */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          kintCheck.triangulosDegenerados === 0
            ? "border-green-500/30 bg-green-500/5"
            : "border-yellow-500/40 bg-yellow-500/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold">
              Triángulos defectuosos
            </p>

            <p className="mt-1 text-[9px] leading-4 text-[var(--text-muted)]">
              Busca caras extremadamente pequeñas o sin
              superficie útil.
            </p>
          </div>

          <strong
            className={`shrink-0 text-xs ${
              kintCheck.triangulosDegenerados === 0
                ? "text-green-600"
                : "text-yellow-700"
            }`}
          >
            {kintCheck.triangulosDegenerados === 0
              ? "✓"
              : kintCheck.triangulosDegenerados}
          </strong>
        </div>

        {kintCheck.triangulosDegenerados > 0 && (
          <details className="mt-3 border-t border-yellow-500/20 pt-3">
            <summary className="cursor-pointer text-[9px] font-bold text-yellow-700">
              ¿Cómo lo arreglo?
            </summary>

            <p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">
              Generalmente aparecen por geometría duplicada,
              puntos demasiado próximos o errores durante la
              exportación. Podés limpiar el modelo y volver a
              exportarlo como STL. Una cantidad pequeña no
              significa necesariamente que la impresión vaya
              a fallar.
            </p>
          </details>
        )}
      </div>

    </div>

        <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/50 px-4 py-3">
      <p className="text-[9px] leading-5 text-[var(--text-muted)]">
        <strong className="text-[var(--text-main)]">
          Importante:
        </strong>{" "}
        Kint Check analiza automáticamente la geometría del
        STL. Una advertencia no significa necesariamente que
        el archivo no pueda imprimirse; la revisión final se
        realiza antes de comenzar el pedido.
      </p>
    </div>

    </div>
  </details>
  </>
)}
            {error && (
              <p className="mt-5 rounded-xl border border-red-600 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                {error}
              </p>
            )}
          </aside>

          <section className="relative flex overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:min-h-[620px] lg:max-h-[860px] lg:flex-col">

  {/* Barra superior */}
  <div className="relative z-20 flex flex-col gap-3 border-b border-[var(--border-color)] bg-[var(--page-bg)]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">

    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">

        <p className="text-[10px] font-black uppercase tracking-[0.18em]">
          Vista 3D
        </p>

        {medidas && (
          <span
            className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${
              entraEnCama
                ? "bg-green-500/10 text-green-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {entraEnCama
              ? "Entra en la cama"
              : "No entra"}
          </span>
        )}

      </div>

      <p className="mt-1 max-w-[360px] truncate text-[10px] text-[var(--text-muted)]">
        {nombreArchivo
          ? `${nombreArchivo}${
              escalaSeleccionada
                ? ` · 1:${escalaSeleccionada}`
                : " · tamaño actual"
            }`
          : "Cargá un STL para comenzar"}
      </p>
    </div>

    <div className="flex flex-wrap gap-2">

      <button
        type="button"
        disabled={!medidas}
        onClick={() => {
          setVistaActiva("modelo");
          cambiarVista("modelo");
        }}
        className={`rounded-lg border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] transition ${
          vistaActiva === "modelo"
            ? "border-red-600 bg-red-600 text-white"
            : "border-[var(--border-color)] hover:border-red-600 hover:text-red-600"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        Modelo
      </button>

      <button
        type="button"
        onClick={() => {
          setVistaActiva("cama");
          cambiarVista("cama");
        }}
        className={`rounded-lg border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] transition ${
          vistaActiva === "cama"
            ? "border-red-600 bg-red-600 text-white"
            : "border-[var(--border-color)] hover:border-red-600 hover:text-red-600"
        }`}
      >
        Cama
      </button>

      <button
        type="button"
        onClick={() => {
          setVistaActiva("superior");
          cambiarVista("superior");
        }}
        className={`rounded-lg border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] transition ${
          vistaActiva === "superior"
            ? "border-red-600 bg-red-600 text-white"
            : "border-[var(--border-color)] hover:border-red-600 hover:text-red-600"
        }`}
      >
        Superior
      </button>

{kintCheck &&
  (kintCheck.aristasAbiertas > 0 ||
    kintCheck.aristasNoManifold > 0 ||
    kintCheck.triangulosDegenerados > 0 ||
    piezasFlotantes > 0) && (
    <button
      type="button"
      onClick={alternarProblemas}
      className={`rounded-lg border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] transition ${
        mostrarProblemas
          ? "border-red-600 bg-red-600 text-white"
          : "border-[var(--border-color)] hover:border-red-600 hover:text-red-600"
      }`}
    >
      {mostrarProblemas
        ? "Ocultar problemas"
        : "Ver problemas"}
    </button>
  )}

    </div>
  </div>

  {/* Visor */}
  <div
    ref={contenedorRef}
    className="h-[500px] w-full sm:h-[620px] lg:min-h-0 lg:flex-1"
  />

{mostrarProblemas && (
  <div className="absolute bottom-3 right-3 z-20 w-[210px] rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)]/95 px-3 py-3 shadow-sm backdrop-blur">

    <div className="mb-2">
      <p className="text-[8px] font-black uppercase tracking-[0.12em]">
        Filtros de problemas
      </p>

      <p className="mt-1 text-[7px] text-[var(--text-muted)]">
        Tocá una categoría para mostrarla u ocultarla.
      </p>
    </div>

    <div className="space-y-1">

      <button
        type="button"
        onClick={() =>
          cambiarFiltroProblema(
            "bordesAbiertos",
            "bordes-abiertos"
          )
        }
        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-black/5 ${
          filtrosProblemas.bordesAbiertos
            ? ""
            : "opacity-40"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" />

          <span className="text-[8px] font-semibold">
            Bordes abiertos
          </span>
        </span>

        <span className="text-[7px] font-black">
          {filtrosProblemas.bordesAbiertos
            ? "ON"
            : "OFF"}
        </span>
      </button>

      <button
        type="button"
        onClick={() =>
          cambiarFiltroProblema(
            "noManifold",
            "no-manifold"
          )
        }
        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-black/5 ${
          filtrosProblemas.noManifold
            ? ""
            : "opacity-40"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />

          <span className="text-[8px] font-semibold">
            Geometría no-manifold
          </span>
        </span>

        <span className="text-[7px] font-black">
          {filtrosProblemas.noManifold
            ? "ON"
            : "OFF"}
        </span>
      </button>

      <button
        type="button"
        onClick={() =>
          cambiarFiltroProblema(
            "triangulos",
            "triangulos-defectuosos"
          )
        }
        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-black/5 ${
          filtrosProblemas.triangulos
            ? ""
            : "opacity-40"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />

          <span className="text-[8px] font-semibold">
            Triángulos defectuosos
          </span>
        </span>

        <span className="text-[7px] font-black">
          {filtrosProblemas.triangulos
            ? "ON"
            : "OFF"}
        </span>
      </button>

{piezasFlotantes > 0 && (
  <button
    type="button"
    onClick={() =>
      cambiarFiltroProblema(
        "flotantes",
        "piezas-flotantes"
      )
    }
    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-black/5 ${
      filtrosProblemas.flotantes
        ? ""
        : "opacity-40"
    }`}
  >
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />

      <span className="text-[8px] font-semibold">
        Piezas flotantes ({piezasFlotantes})
      </span>
    </span>

    <span className="text-[7px] font-black">
      {filtrosProblemas.flotantes
        ? "ON"
        : "OFF"}
    </span>
  </button>
)}

    </div>
  </div>
)}

  {/* Mensaje inicial */}
  {!medidas && !cargando && (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[72px] flex items-center justify-center p-8">

      <div className="max-w-xs rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg)]/85 px-6 py-5 text-center backdrop-blur">

        <p className="text-[10px] font-black uppercase tracking-[0.16em]">
          Sin modelo cargado
        </p>

        <p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">
          Seleccioná un archivo STL para verlo,
          medirlo y comprobar su escala.
        </p>

      </div>

    </div>
  )}

  <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-lg border border-[var(--border-color)] bg-[var(--page-bg)]/90 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.07em] backdrop-blur sm:block">
    Arrastrar: girar · Rueda: zoom
  </div>

</section>
        </div>
      </div>
    </main>
  );
}