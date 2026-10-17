/*
 * Geometría del llavero personalizado (solo en el navegador).
 *
 *   1. El texto se pasa a contornos con la fuente elegida (opentype.js).
 *   2. El borde ("nube" alrededor de las letras) es el texto engordado
 *      ancho de borde elegido (Fino a Extra), con una banda que une las letras sueltas y la oreja del aro.
 *   3. Las dos piezas se extruyen: base de ALTO_BASE mm y letras de
 *      ALTO_LETRAS mm encima (dos colores en la AMS / H2D).
 *
 * Mismas medidas que el de referencia: "Antonio" mediano ≈ 58 × 17 × 3 mm.
 * Clipper trabaja con enteros: todo va en micras (ESCALA).
 */

import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { parse, type Font, type Path as RutaFuente } from "opentype.js";
import * as ClipperLib from "clipper-lib";
import {
  FUENTES_LLAVERO,
  TAMANOS_LLAVERO,
  bordeMm,
  INTERLINEADO,
  limpiarRenglones,
  limpiarSeparacion,
  type PersonalizacionLlavero,
  type PersonalizacionMascota,
} from "./personalizacion";

type Contorno = ClipperLib.Path;
type Contornos = ClipperLib.Paths;

const ESCALA = 1000; // 1 mm = 1000 unidades de Clipper
const PASOS_CURVA = 10;

export const ALTO_BASE = 2;
export const ALTO_LETRAS = 1;

const RADIO_OREJA = 4.3;
const RADIO_AGUJERO = 2;

export type GeometriaLlavero = {
  base: THREE.BufferGeometry;
  letras: THREE.BufferGeometry; // vacía si es "Solo letras"
  anillo: THREE.BufferGeometry; // el aro de la cadena, por fuera (puede ir de otro color)
  soloLetras: boolean;
  // Centro del agujero y hacia dónde sale la argolla (radianes; 0 = a la izquierda).
  aro: { x: number; y: number; angulo?: number };
  ancho: number; // mm
  grosor?: number; // mm (3 si no viene)
  telefono?: THREE.BufferGeometry; // chapita: teléfono relleno de otro color (atrás)
  // Para exportar: la base en piezas cerradas (la chapita: capa grabada + capa entera).
  partesBase?: THREE.BufferGeometry[];
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

  const margen = bordeMm(personalizacion.borde);
  const fondo = personalizacion.fondo || "Contorno";
  const soloLetras = fondo === "Solo letras";
  // Separación extra entre letras: opentype la toma en "em" del tamaño de fuente.
  const opcionesTexto = {
    kerning: true,
    letterSpacing: limpiarSeparacion(personalizacion.separacion) / tamanoFuente,
  };
  const textos = [personalizacion.texto.trim() || "Kint", personalizacion.texto2?.trim() || ""].filter(Boolean);
  // De renglón a renglón: lugar para las patitas de la "g", "p", "y".
  const interlineado = altoMayusculas * INTERLINEADO + limpiarRenglones(personalizacion.renglones);

  // Cada renglón centrado en x = 0; el segundo, debajo del primero.
  const renglones = textos.map((texto, indice) => {
    const prueba = fuente.getPath(texto, 0, 0, tamanoFuente, opcionesTexto).getBoundingBox();
    const ruta = fuente.getPath(texto, -(prueba.x1 + prueba.x2) / 2, indice * interlineado, tamanoFuente, opcionesTexto);
    const contornos = unir(aplanar(ruta));
    const caja = contornos.length ? limites(contornos) : null;
    return { contornos, caja, linea: -indice * interlineado };
  });
  const letras = unir(renglones.flatMap((renglon) => renglon.contornos));
  if (!letras.length) throw new Error("Esa fuente no tiene esas letras.");
  const todo = limites(letras);

  // Espacio libre entre el renglón de arriba y el de abajo (negativo = se tocan).
  const hueco =
    renglones.length === 2 && renglones[0].caja && renglones[1].caja
      ? renglones[0].caja.minY - renglones[1].caja.maxY
      : 0;

  let base: Contornos;

  if (soloLetras) {
    // Solo las letras, tal cual (si se quieren unidas, se juntan con la separación).
    base = letras;
  } else {
    if (fondo === "Placa") {
      // Rectángulo lleno con las esquinas redondeadas.
      const radio = Math.min(margen, 3);
      base = engordar(
        [rectangulo(todo.minX - margen + radio, todo.minY - margen + radio, todo.maxX + margen - radio, todo.maxY + margen - radio)],
        radio
      );
    } else {
      // Contorno: banda por la mitad de cada renglón para unir las letras sueltas.
      const rellenos: Contornos = [];
      for (const renglon of renglones) {
        if (!renglon.caja) continue;
        rellenos.push(
          rectangulo(
            renglon.caja.minX,
            renglon.linea + altoMayusculas * 0.22,
            renglon.caja.maxX,
            renglon.linea + altoMayusculas * 0.62
          )
        );
      }
      // Dos renglones: relleno entre ambos, del ancho del renglón más corto,
      // y después se "cierra" la forma (engordar y volver a afinar) para que
      // las esquinas queden curvas y siga el dibujo de las letras.
      let cierre = 0;
      if (renglones.length === 2 && renglones[0].caja && renglones[1].caja) {
        const ancho = Math.min(
          renglones[0].caja.maxX - renglones[0].caja.minX,
          renglones[1].caja.maxX - renglones[1].caja.minX
        ) * 0.92;
        if (hueco > -altoMayusculas * 0.3) {
          rellenos.push(rectangulo(-ancho / 2, renglones[1].linea + altoMayusculas * 0.4, ancho / 2, altoMayusculas * 0.4));
        }
        cierre = altoMayusculas * 0.18 + 0.8;
      }
      base = engordar(unir([...letras, ...rellenos]), margen + cierre);
      if (cierre > 0) base = engordar(base, -cierre);
    }
    // La base va llena (sin los huecos de la "o", "a"...).
    base = base.filter((contorno) => ClipperLib.Clipper.Area(contorno) > 0);
  }

  // Anillo: por fuera de la pieza, a la izquierda del primer renglón, a media altura.
  const centroY = altoMayusculas * 0.45;
  const franja = operar(ClipperLib.ClipType.ctIntersection, base, [rectangulo(-1000, centroY - 0.4, 1000, centroY + 0.4)]);
  const desdeX = (franja.length ? limites(franja) : limites(base)).minX;
  const centro = lugarAnillo(base, desdeX, centroY, -1, 0);
  const anillo = armarAnillo(centro, base);

  const total = limites([...base, ...anillo]);
  const dx = (total.minX + total.maxX) / 2;
  const dy = (total.minY + total.maxY) / 2;

  // Solo letras: una sola pieza de todo el alto; la de "letras" queda vacía.
  const altoPieza = soloLetras ? ALTO_BASE + ALTO_LETRAS : ALTO_BASE;
  const geometriaBase = new THREE.ExtrudeGeometry(aFormas(base, dx, dy), {
    depth: altoPieza,
    bevelEnabled: false,
    curveSegments: 1,
  });
  const geometriaAnillo = new THREE.ExtrudeGeometry(aFormas(anillo, dx, dy), {
    depth: altoPieza,
    bevelEnabled: false,
    curveSegments: 1,
  });

  let geometriaLetras = new THREE.BufferGeometry();
  if (!soloLetras) {
    geometriaLetras = new THREE.ExtrudeGeometry(aFormas(letras, dx, dy), {
      depth: ALTO_LETRAS,
      bevelEnabled: false,
      curveSegments: 1,
    });
    geometriaLetras.translate(0, 0, ALTO_BASE);
  }

  const area = [...base, ...anillo].reduce((suma, contorno) => suma + ClipperLib.Clipper.Area(contorno), 0);

  return {
    base: geometriaBase,
    letras: geometriaLetras,
    anillo: geometriaAnillo,
    soloLetras,
    aro: { x: centro.x - dx, y: centro.y - dy },
    ancho: Math.round((total.maxX - total.minX) * 10) / 10,
    alto: Math.round((total.maxY - total.minY) * 10) / 10,
    areaCm2: Math.round((area / (ESCALA * ESCALA) / 100) * 10) / 10,
  };
}

/*
 * Dónde va el anillo: se sale del borde (x, y) hacia (haciaX, haciaY) hasta que
 * el agujero ya no toca la pieza. Así el anillo queda por fuera, pegado al borde.
 */
function lugarAnillo(pieza: Contornos, x: number, y: number, haciaX: number, haciaY: number) {
  for (let distancia = 0; distancia < 25; distancia += 0.2) {
    const cx = x + haciaX * distancia;
    const cy = y + haciaY * distancia;
    const toca = operar(ClipperLib.ClipType.ctIntersection, [circulo(cx, cy, RADIO_AGUJERO + 0.7, 32)], pieza);
    if (!toca.length) return { x: cx, y: cy };
  }
  return { x: x + haciaX * 25, y: y + haciaY * 25 };
}

/* El anillo (aro con agujero), sin lo que se mete dentro de la pieza: es otra parte, con su color. */
function armarAnillo(centro: { x: number; y: number }, pieza: Contornos) {
  const aro = operar(
    ClipperLib.ClipType.ctDifference,
    [circulo(centro.x, centro.y, RADIO_OREJA, 64)],
    [circulo(centro.x, centro.y, RADIO_AGUJERO, 48)]
  );
  return operar(ClipperLib.ClipType.ctDifference, aro, pieza);
}

/* STL binario de una pieza (para Bambu Studio). */
export function exportarSTL(geometria: THREE.BufferGeometry) {
  const exportador = new STLExporter();
  const datos = exportador.parse(new THREE.Mesh(geometria), { binary: true }) as DataView;
  return new Blob([datos.buffer as ArrayBuffer], { type: "model/stl" });
}

/* ------------------------------------------------------------------ */
/* Chapita para mascota                                                */
/* ------------------------------------------------------------------ */

const ALTO_CHAPITA = 3; // la base es más gruesa: atrás va el teléfono grabado
const PROFUNDIDAD_GRABADO = 0.6;
const ESCALA_TAMANO: Record<string, number> = { Chico: 0.85, Mediano: 1, Grande: 1.2 };

function elipse(cx: number, cy: number, rx: number, ry: number, lados = 40): Contorno {
  return Array.from({ length: lados }, (_, indice) => {
    const angulo = (indice / lados) * Math.PI * 2;
    return {
      X: Math.round((cx + Math.cos(angulo) * rx) * ESCALA),
      Y: Math.round((cy + Math.sin(angulo) * ry) * ESCALA),
    };
  });
}

/*
 * Forma de la chapita (pura: el anillo va aparte, por fuera), la zona del
 * nombre (siempre centrada, con o sin huellita) y dónde va la huellita.
 */
function formaChapita(forma: string, k: number) {
  if (forma === "Círculo") {
    const radio = 16 * k;
    return {
      contorno: [circulo(0, 0, radio, 128)],
      zona: { cx: 0, cy: 1 * k, ancho: 25 * k, alto: 10 * k },
      huella: { x: 0, y: -10.3 * k },
    };
  }
  if (forma === "Corazón") {
    const puntos: Contorno = [];
    for (let indice = 0; indice < 160; indice++) {
      const t = (indice / 160) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      puntos.push({ X: Math.round(x * 1.2 * k * ESCALA), Y: Math.round(y * 1.2 * k * ESCALA) });
    }
    return {
      contorno: unir([puntos]),
      zona: { cx: 0, cy: 1.5 * k, ancho: 24 * k, alto: 9.5 * k },
      huella: { x: 0, y: -10.5 * k },
    };
  }
  // Hueso: cuerpo + cuatro "nudos" redondos. La huellita va en el nudo de abajo a la derecha.
  const nudo = 7.6 * k;
  const ancho = 17 * k;
  const alto = 6.4 * k;
  return {
    contorno: unir([
      rectangulo(-ancho, -alto - 0.6 * k, ancho, alto + 0.6 * k),
      circulo(-ancho, alto, nudo, 64),
      circulo(-ancho, -alto, nudo, 64),
      circulo(ancho, alto, nudo, 64),
      circulo(ancho, -alto, nudo, 64),
    ]),
    zona: { cx: 0, cy: 0, ancho: 26 * k, alto: 9.5 * k },
    huella: { x: ancho + 1.4 * k, y: -alto - 0.4 * k },
  };
}

/* Huellita: almohadilla + cuatro deditos. */
function huellita(cx: number, cy: number, k: number): Contornos {
  return unir([
    elipse(cx, cy - 0.8 * k, 2.5 * k, 2 * k),
    circulo(cx - 2.6 * k, cy + 1.6 * k, 0.95 * k, 24),
    circulo(cx - 0.9 * k, cy + 2.8 * k, 0.95 * k, 24),
    circulo(cx + 0.9 * k, cy + 2.8 * k, 0.95 * k, 24),
    circulo(cx + 2.6 * k, cy + 1.6 * k, 0.95 * k, 24),
  ]);
}

/* Texto centrado en (cx, cy) que entra en ancho × alto (achica la letra si hace falta). */
function textoEnCaja(fuente: Font, texto: string, cx: number, cy: number, ancho: number, alto: number) {
  const caja = fuente.charToGlyph("H").getBoundingBox();
  const unidadesMayuscula = caja.y2 > 0 ? caja.y2 : fuente.unitsPerEm * 0.7;
  let tamano = (alto * fuente.unitsPerEm) / unidadesMayuscula;
  const medida = fuente.getPath(texto, 0, 0, tamano, { kerning: true }).getBoundingBox();
  const anchoTexto = medida.x2 - medida.x1;
  if (anchoTexto > ancho) tamano *= ancho / anchoTexto;
  const final = fuente.getPath(texto, 0, 0, tamano, { kerning: true }).getBoundingBox();
  // opentype va con la y para abajo: se ubica para que el texto quede centrado en (cx, cy).
  const x = cx - (final.x1 + final.x2) / 2;
  const y = -cy - (final.y1 + final.y2) / 2;
  return unir(aplanar(fuente.getPath(texto, x, y, tamano, { kerning: true })));
}

function espejar(contornos: Contornos): Contornos {
  return contornos.map((contorno) => contorno.map((punto) => ({ X: -punto.X, Y: punto.Y })).reverse());
}

export async function construirChapita(datos: PersonalizacionMascota): Promise<GeometriaLlavero> {
  const fuente = await cargarFuente(datos.fuente);
  const fuenteNumeros = await cargarFuente("Rubik");
  const k = ESCALA_TAMANO[datos.tamano] ?? 1;
  const forma = formaChapita(datos.forma, k);

  /*
   * Todo plano (nada sobresale: no se ensucia ni lastima). 3 mm en capas:
   *   0 – 0,6   atrás: el teléfono hueco o relleno de otro color
   *   0,6 – 2,4 el cuerpo
   *   2,4 – 3   arriba: borde de color + nombre + huellita (color 2), al ras del resto
   */
  const ABAJO = PROFUNDIDAD_GRABADO;
  const ARRIBA = 0.6;

  const cuerpo = forma.contorno;
  // Anillo arriba al medio, por fuera de la forma (la forma queda entera).
  const franja = operar(ClipperLib.ClipType.ctIntersection, cuerpo, [rectangulo(-0.4, -1000, 0.4, 1000)]);
  const centro = lugarAnillo(cuerpo, 0, limites(franja).maxY, 0, 1);
  const anillo = armarAnillo(centro, cuerpo);

  // Borde de color por el contorno de afuera.
  const ANCHO_BORDE = 1.3;
  const reborde = operar(ClipperLib.ClipType.ctDifference, cuerpo, engordar(cuerpo, -ANCHO_BORDE));

  // Nombre centrado (igual con o sin huellita), lejos del borde.
  const zona = forma.zona;
  let nombre = textoEnCaja(fuente, datos.texto.trim() || "Koni", zona.cx, zona.cy, zona.ancho, zona.alto);
  if (datos.huella) nombre = unir([...nombre, ...huellita(forma.huella.x, forma.huella.y, k)]);
  nombre = operar(ClipperLib.ClipType.ctIntersection, nombre, engordar(cuerpo, -(ANCHO_BORDE + 1.1)));

  const arribaColor = unir([...reborde, ...nombre]);
  const arribaResto = operar(ClipperLib.ClipType.ctDifference, cuerpo, arribaColor);

  // Atrás: teléfono espejado (se lee al dar vuelta la chapita).
  const telefonoTexto = datos.telefono.trim();
  const telefono = telefonoTexto
    ? operar(
        ClipperLib.ClipType.ctIntersection,
        espejar(textoEnCaja(fuenteNumeros, telefonoTexto, 0, forma.zona.cy, forma.zona.ancho * 1.05, 4.6 * k)),
        engordar(cuerpo, -1)
      )
    : [];
  const abajoResto = telefono.length ? operar(ClipperLib.ClipType.ctDifference, cuerpo, telefono) : cuerpo;

  const total = limites([...cuerpo, ...anillo]);
  const dx = (total.minX + total.maxX) / 2;
  const dy = (total.minY + total.maxY) / 2;
  const extruir = (contornos: Contornos, desde: number, alto: number) => {
    const geometria = new THREE.ExtrudeGeometry(aFormas(contornos, dx, dy), {
      depth: alto,
      bevelEnabled: false,
      curveSegments: 1,
    });
    geometria.translate(0, 0, desde);
    return geometria;
  };

  const capaAbajo = extruir(abajoResto, 0, ABAJO);
  const capaMedio = extruir(cuerpo, ABAJO, ALTO_CHAPITA - ABAJO - ARRIBA);
  const capaArriba = extruir(arribaResto, ALTO_CHAPITA - ARRIBA, ARRIBA);
  const geometriaColor = extruir(arribaColor, ALTO_CHAPITA - ARRIBA, ARRIBA);
  const geometriaAnillo = extruir(anillo, 0, ALTO_CHAPITA);
  const geometriaTelefono =
    datos.atras === "Color" && telefono.length ? extruir(telefono, 0, ABAJO) : undefined;

  const area = cuerpo.reduce((suma, contorno) => suma + ClipperLib.Clipper.Area(contorno), 0);
  return {
    // Para ver: el cuerpo en una malla. Para imprimir: las tres capas por separado (cada una cerrada).
    base: mergeGeometries([capaAbajo, capaMedio, capaArriba]) ?? capaMedio,
    partesBase: [capaAbajo, capaMedio, capaArriba],
    letras: geometriaColor,
    anillo: geometriaAnillo,
    telefono: geometriaTelefono,
    soloLetras: false,
    aro: { x: centro.x - dx, y: centro.y - dy, angulo: -Math.PI / 2 },
    ancho: Math.round((total.maxX - total.minX) * 10) / 10,
    alto: Math.round((total.maxY - total.minY) * 10) / 10,
    grosor: ALTO_CHAPITA,
    areaCm2: Math.round((area / (ESCALA * ESCALA) / 100) * 10) / 10,
  };
}

/* Llavero con nombre o chapita de mascota, según lo que pidió el cliente. */
export function construirPieza(datos: PersonalizacionLlavero | PersonalizacionMascota) {
  return "tipo" in datos && datos.tipo === "Mascota"
    ? construirChapita(datos)
    : construirLlavero(datos as PersonalizacionLlavero);
}
