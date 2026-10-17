/*
 * Llavero en un solo .3mf: un objeto con dos partes (borde y letras),
 * para abrirlo directo en Bambu Studio y asignarle un filamento a cada parte.
 * El zip se arma acá mismo (sin compresión), no hace falta otra librería.
 */

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* Malla con los vértices soldados (sin bordes abiertos para el laminador). */
function mallaXml(id: number, nombre: string, geometria: THREE.BufferGeometry, color: number | null) {
  const limpia = new THREE.BufferGeometry();
  limpia.setAttribute("position", geometria.getAttribute("position").clone());
  if (geometria.index) limpia.setIndex(geometria.index.clone());
  const soldada = mergeVertices(limpia, 1e-4);
  limpia.dispose();

  const posiciones = soldada.getAttribute("position");
  const indices = soldada.index;
  const vertices: string[] = [];
  for (let i = 0; i < posiciones.count; i++) {
    vertices.push(
      `<vertex x="${posiciones.getX(i).toFixed(4)}" y="${posiciones.getY(i).toFixed(4)}" z="${posiciones.getZ(i).toFixed(4)}"/>`
    );
  }
  const triangulos: string[] = [];
  const total = indices ? indices.count : posiciones.count;
  for (let i = 0; i < total; i += 3) {
    const a = indices ? indices.getX(i) : i;
    const b = indices ? indices.getX(i + 1) : i + 1;
    const c = indices ? indices.getX(i + 2) : i + 2;
    if (a === b || b === c || a === c) continue; // triángulos que quedaron sin área
    triangulos.push(`<triangle v1="${a}" v2="${b}" v3="${c}"/>`);
  }
  soldada.dispose();

  return (
    `<object id="${id}" name="${nombre}" type="model"${color === null ? "" : ` pid="100" pindex="${color}"`}><mesh>` +
    `<vertices>${vertices.join("")}</vertices>` +
    `<triangles>${triangulos.join("")}</triangles>` +
    `</mesh></object>`
  );
}

function escaparXml(texto: string) {
  return texto.replace(/[<>&"']/g, (letra) => `&#${letra.charCodeAt(0)};`);
}

/* ---------------- Zip sin compresión ---------------- */

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i++) crc = TABLA_CRC[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function armarZip(archivos: { nombre: string; texto: string }[]) {
  const codificador = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.nombre);
    const datos = codificador.encode(archivo.texto);
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true); // sin compresión
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    partes.push(new Uint8Array(local.buffer), nombre, datos);

    const cabecera = new DataView(new ArrayBuffer(46));
    cabecera.setUint32(0, 0x02014b50, true);
    cabecera.setUint16(4, 20, true);
    cabecera.setUint16(6, 20, true);
    cabecera.setUint32(16, crc, true);
    cabecera.setUint32(20, datos.length, true);
    cabecera.setUint32(24, datos.length, true);
    cabecera.setUint16(28, nombre.length, true);
    cabecera.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cabecera.buffer), nombre);

    desplazamiento += 30 + nombre.length + datos.length;
  }

  const tamanoCentral = central.reduce((suma, parte) => suma + parte.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);

  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)] as BlobPart[], {
    type: "model/3mf",
  });
}

/* ---------------- 3MF ---------------- */

/* "#572369" → "#572369FF" (3MF pide el alfa). */
function colorRgba(hex: string) {
  const limpio = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : "#9CA3AF";
  return `${limpio}FF`;
}

export function exportar3MF(
  nombre: string,
  piezas: { nombre: string; geometria: THREE.BufferGeometry; color?: string; filamento?: number }[]
) {
  // Colores de cada parte (los ven Bambu Studio y los visores de 3MF).
  const conColor = piezas.some((pieza) => pieza.color);
  const materiales = conColor
    ? `<basematerials id="100">${piezas
        .map((pieza) => `<base name="${escaparXml(pieza.nombre)}" displaycolor="${colorRgba(pieza.color || "")}"/>`)
        .join("")}</basematerials>`
    : "";
  const objetos = piezas.map((pieza, indice) =>
    mallaXml(indice + 1, escaparXml(pieza.nombre), pieza.geometria, conColor ? indice : null)
  );
  const idGrupo = piezas.length + 1;
  const componentes = piezas.map((_, indice) => `<component objectid="${indice + 1}"/>`).join("");

  const modelo =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model unit="millimeter" xml:lang="es-UY" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">` +
    `<metadata name="Title">${escaparXml(nombre)}</metadata>` +
    `<metadata name="Application">Kint 3D</metadata>` +
    `<resources>${materiales}${objetos.join("")}` +
    `<object id="${idGrupo}" name="${escaparXml(nombre)}" type="model"><components>${componentes}</components></object>` +
    `</resources>` +
    // Centrado en la cama de la A1 mini (180 × 180).
    `<build><item objectid="${idGrupo}" transform="1 0 0 0 1 0 0 0 1 90 90 0"/></build>` +
    `</model>`;

  return armarZip([
    {
      nombre: "[Content_Types].xml",
      texto:
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
        `</Types>`,
    },
    {
      nombre: "_rels/.rels",
      texto:
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
        `</Relationships>`,
    },
    { nombre: "3D/3dmodel.model", texto: modelo },
    // Bambu Studio: cada parte con su filamento (borde = 1, letras = 2).
    {
      nombre: "Metadata/model_settings.config",
      texto:
        `<?xml version="1.0" encoding="UTF-8"?><config>` +
        `<object id="${idGrupo}"><metadata key="name" value="${escaparXml(nombre)}"/><metadata key="extruder" value="1"/>` +
        piezas
          .map(
            (pieza, indice) =>
              `<part id="${indice + 1}" subtype="normal_part"><metadata key="name" value="${escaparXml(pieza.nombre)}"/>` +
              `<metadata key="extruder" value="${pieza.filamento ?? indice + 1}"/></part>`
          )
          .join("") +
        `</object></config>`,
    },
  ]);
}
