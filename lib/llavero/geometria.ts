/*
 * Geometría del llavero personalizado (solo en el navegador).
 *
 *   1. El texto se pasa a contornos con la fuente elegida (opentype.js).
 *   2. El borde ("nube" alrededor de las letras) es el texto engordado
 *      BORDE mm, con una banda que une las letras sueltas y la oreja del aro.
 *   3. Las dos piezas se extruyen: base de ALTO_BASE mm y letras de
 *      ALTO_LETRAS mm encima (dos colores en la AMS / H2D).
 *
 * Mismas medidas que el de referencia: "Antonio" mediano ≈ 58 × 17 × 3 mm.
 * Clipper trabaja con enteros: todo va en micras (ESCALA).
 */

import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { parse, type Font, type Path as RutaFuente } from "opentype.js";
import * as ClipperLib from "clipper-lib";
import { FUENTES_LLAVERO, TAMANOS_LLAVERO, type PersonalizacionLlavero } from "./personalizacion";

type Contorno = ClipperLib.Path;
type Contornos = ClipperLib.Paths;

const ESCALA = 1000; // 1 mm = 1000 unidades de Clipper
const PASOS_CURVA = 10;

export const ALTO_BASE = 2;
export const ALTO_LETRAS = 1;
const BORDE = 2.3;
const RADIO_OREJA = 4.3;
const RADIO_AGUJERO = 2;

export type GeometriaLlavero = {
  base: THREE.BufferGeometry;
  letras: THREE.BufferGeometry;
  ancho: number; // mm
  alto: number; // mm
  areaCm2: number;
};

/* ------------------------------------------------------------------ */
/* Fuentes                                                             */
/* ------------------------------------------------------------------ */

const fuentes = new Map<string, Promise<Font>>();

export function cargarFuente(nombre: string) {
  const datos = FUENTES_LLAVERO.find((fuente) => fuente.nombre === nombre) ?? FUENTES_LLAVERO[0];
  let promesa = fuentes.get(datos.nombre);
  if (!promesa) {
    promesa = fetch(datos.archivo)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo cargar la fuente.");
        return respuesta.arrayBuffer();
      })
      .then((buffer) => parse(buffer));
    promesa.catch(() => fuentes.delete(datos.nombre));
    fuentes.set(datos.nombre, promesa);
  }
  return promesa;
}

/* ------------------------------------------------------------------ */
/* Contornos                                                           */
/* ------------------------------------------------------------------ */

/* Curvas de la fuente → polígonos (Y hacia arriba, en micras). */
function aplanar(ruta: RutaFuente): Contornos {
  const contornos: Contornos = [];
  let actual: Contorno = [];
  let x0 = 0;
  let y0 = 0;
  const agregar = (x: number, y: number) =>
    actual.push({ X: Math.round(x * ESCALA), Y: Math.round(-y * ESCALA) });
  const cerrar = () => {
    if (actual.length > 2) contornos.push(actual);
    actual = [];
  };

  for (const comando of ruta.commands) {
    switch (comando.type) {
      case "M":
        cerrar();
        agregar(comando.x, comando.y);
        x0 = comando.x;
        y0 = comando.y;
        break;
      case "L":
        agregar(comando.x, comando.y);
        x0 = comando.x;
        y0 = comando.y;
        break;
      case "Q":
        for (let paso = 1; paso <= PASOS_CURVA; paso++) {
          const t = paso / PASOS_CURVA;
          const u = 1 - t;
          agregar(
            u * u * x0 + 2 * u * t * comando.x1 + t * t * comando.x,
            u * u * y0 + 2 * u * t * comando.y1 + t * t * comando.y
          );
        }
        x0 = comando.x;
        y0 = comando.y;
        break;
      case "C":
        for (let paso = 1; paso <= PASOS_CURVA; paso++) {
          const t = paso / PASOS_CURVA;
          const u = 1 - t;
          agregar(
            u * u * u * x0 + 3 * u * u * t * comando.x1 + 3 * u * t * t * comando.x2 + t * t * t * comando.x,
            u * u * u * y0 + 3 * u * u * t * comando.y1 + 3 * u * t * t * comando.y2 + t * t * t * comando.y
          );
        }
        x0 = comando.x;
        y0 = comando.y;
        break;
      case "Z":
        cerrar();
        break;
    }
  }
  cerrar();
  return contornos;
}

function operar(tipo: ClipperLib.ClipType, sujeto: Contornos, recorte: Contornos = []) {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(sujeto, ClipperLib.PolyType.ptSubject, true);
  if (recorte.length) clipper.AddPaths(recorte, ClipperLib.PolyType.ptClip, true);
  const resultado: Contornos = [];
  clipper.Execute(
    tipo,
    resultado,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );
  return resultado;
}

const unir = (contornos: Contornos) => operar(ClipperLib.ClipType.ctUnion, contornos);

function engordar(contornos: Contornos, mm: number) {
  const offset = new ClipperLib.ClipperOffset(2, 0.02 * ESCALA);
  offset.AddPaths(contornos, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const resultado: Contornos = [];
  offset.Execute(resultado, mm * ESCALA);
  return resultado;
}

function circulo(cx: number, cy: number, radio: number, lados = 64): Contorno {
  return Array.from({ length: lados }, (_, indice) => {
    const angulo = (indice / lados) * Math.PI * 2;
    return {
      X: Math.round((cx + Math.cos(angulo) * radio) * ESCALA),
      Y: Math.round((cy + Math.sin(angulo) * radio) * ESCALA),
    };
  });
}

function rectangulo(x1: number, y1: number, x2: number, y2: number): Contorno {
  return [
    { X: Math.round(x1 * ESCALA), Y: Math.round(y1 * ESCALA) },
    { X: Math.round(x2 * ESCALA), Y: Math.round(y1 * ESCALA) },
    { X: Math.round(x2 * ESCALA), Y: Math.round(y2 * ESCALA) },
    { X: Math.round(x1 * ESCALA), Y: Math.round(y2 * ESCALA) },
  ];
}

function limites(contornos: Contornos) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contorno of contornos) {
    for (const punto of contorno) {
      minX = Math.min(minX, punto.X);
      minY = Math.min(minY, punto.Y);
      maxX = Math.max(maxX, punto.X);
      maxY = Math.max(maxY, punto.Y);
    }
  }
  return { minX: minX / ESCALA, minY: minY / ESCALA, maxX: maxX / ESCALA, maxY: maxY / ESCALA };
}

/* Contornos (con agujeros) → formas de three.js, respetando islas dentro de agujeros. */
function aFormas(contornos: Contornos, dx: number, dy: number) {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(contornos, ClipperLib.PolyType.ptSubject, true);
  const arbol = new ClipperLib.PolyTree();
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    arbol,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  const aVectores = (contorno: Contorno) =>
    contorno.map((punto) => new THREE.Vector2(punto.X / ESCALA - dx, punto.Y / ESCALA - dy));

  const formas: THREE.Shape[] = [];
  const recorrer = (nodo: ClipperLib.PolyNode) => {
    for (const exterior of nodo.Childs()) {
      const forma = new THREE.Shape(aVectores(exterior.Contour()));
      for (const agujero of exterior.Childs()) {
        forma.holes.push(new THREE.Path(aVectores(agujero.Contour())));
        recorrer(agujero);
      }
      formas.push(forma);
    }
  };
  recorrer(arbol);
  return formas;
}

/* ------------------------------------------------------------------ */
/* Llavero                                                             */
/* ------------------------------------------------------------------ */

export async function construirLlavero(personalizacion: PersonalizacionLlavero): Promise<GeometriaLlavero> {
  const fuente = await cargarFuente(personalizacion.fuente);
  const altoMayusculas =
    TAMANOS_LLAVERO.find((tamano) => tamano.nombre === personalizacion.tamano)?.alto ?? TAMANOS_LLAVERO[1].alto;

  // Tamaño de fuente para que la "H" mida altoMayusculas mm.
  const caja = fuente.charToGlyph("H").getBoundingBox();
  const unidadesMayuscula = caja.y2 > 0 ? caja.y2 : fuente.unitsPerEm * 0.7;
  const tamanoFuente = (altoMayusculas * fuente.unitsPerEm) / unidadesMayuscula;

  const texto = personalizacion.texto.trim() || "Kint";
  const letras = unir(aplanar(fuente.getPath(texto, 0, 0, tamanoFuente, { kerning: true })));
  if (!letras.length) throw new Error("Esa fuente no tiene esas letras.");

  const borde = limites(letras);

  // Banda por la mitad de las letras: une las que quedan sueltas.
  const banda = rectangulo(
    borde.minX,
    altoMayusculas * 0.22,
    borde.maxX,
    altoMayusculas * 0.62
  );
  let base = engordar(unir([...letras, banda]), BORDE);

  // Oreja con el agujero del aro, a la izquierda y a media altura.
  const centroY = altoMayusculas * 0.42;
  const centroX = borde.minX - BORDE - RADIO_OREJA * 0.45;
  base = unir([
    ...base,
    circulo(centroX, centroY, RADIO_OREJA),
    rectangulo(centroX, centroY - RADIO_OREJA * 0.85, borde.minX + 1, centroY + RADIO_OREJA * 0.85),
  ]);

  // La base va llena (sin los huecos de la "o", "a"...) y después se le hace el agujero.
  base = base.filter((contorno) => ClipperLib.Clipper.Area(contorno) > 0);
  base = operar(ClipperLib.ClipType.ctDifference, base, [circulo(centroX, centroY, RADIO_AGUJERO, 48)]);

  const total = limites(base);
  const dx = (total.minX + total.maxX) / 2;
  const dy = (total.minY + total.maxY) / 2;

  const geometriaBase = new THREE.ExtrudeGeometry(aFormas(base, dx, dy), {
    depth: ALTO_BASE,
    bevelEnabled: false,
    curveSegments: 1,
  });
  const geometriaLetras = new THREE.ExtrudeGeometry(aFormas(letras, dx, dy), {
    depth: ALTO_LETRAS,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometriaLetras.translate(0, 0, ALTO_BASE);

  const area = base.reduce((suma, contorno) => suma + ClipperLib.Clipper.Area(contorno), 0);

  return {
    base: geometriaBase,
    letras: geometriaLetras,
    ancho: Math.round((total.maxX - total.minX) * 10) / 10,
    alto: Math.round((total.maxY - total.minY) * 10) / 10,
    areaCm2: Math.round((area / (ESCALA * ESCALA) / 100) * 10) / 10,
  };
}

/* STL binario de una pieza (para Bambu Studio). */
export function exportarSTL(geometria: THREE.BufferGeometry) {
  const exportador = new STLExporter();
  const datos = exportador.parse(new THREE.Mesh(geometria), { binary: true }) as DataView;
  return new Blob([datos.buffer as ArrayBuffer], { type: "model/stl" });
}
