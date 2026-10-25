import * as THREE from "three";

/*
 * 3MF con colores para Bambu Studio (las piezas pintadas en el visor): cada
 * color es un objeto aparte, con su color (basematerials, el estándar 3MF) y
 * asignado a un filamento (Metadata/model_settings.config, como guarda Bambu
 * Studio). Al abrirlo, cada objeto ya tiene su filamento y su color.
 * El .3mf es un ZIP: se arma acá, sin comprimir.
 */

const NS_3MF = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";

function hexDe(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/* Agrupa los triángulos por color (los colores del visor están en espacio lineal: se pasan a sRGB). */
function porColor(geometria: THREE.BufferGeometry, factor: number) {
  const posicion = geometria.getAttribute("position");
  const color = geometria.getAttribute("color");
  const indice = geometria.getIndex();
  const total = indice ? indice.count : posicion.count;
  const tono = new THREE.Color();
  const rgb = { r: 1, g: 1, b: 1 };
  const grupos = new Map<string, number[]>();
  for (let i = 0; i + 2 < total; i += 3) {
    const vs = indice ? [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)] : [i, i + 1, i + 2];
    let hex = "#F5F5F4";
    if (color) {
      tono.setRGB(color.getX(vs[0]), color.getY(vs[0]), color.getZ(vs[0])).getRGB(rgb, THREE.SRGBColorSpace);
      hex = hexDe(rgb.r, rgb.g, rgb.b);
    }
    const lista = grupos.get(hex) || grupos.set(hex, []).get(hex)!;
    for (const v of vs) lista.push(posicion.getX(v) * factor, posicion.getY(v) * factor, posicion.getZ(v) * factor);
  }
  return grupos;
}

/* Malla 3MF de un grupo: vértices sin repetir y triángulos. */
function malla(posiciones: number[]) {
  const ids = new Map<string, number>();
  const vertices: string[] = [];
  const triangulos: string[] = [];
  const id = (i: number) => {
    const x = posiciones[i].toFixed(4), y = posiciones[i + 1].toFixed(4), z = posiciones[i + 2].toFixed(4);
    const clave = `${x},${y},${z}`;
    let n = ids.get(clave);
    if (n === undefined) {
      n = vertices.length;
      ids.set(clave, n);
      vertices.push(`<vertex x="${x}" y="${y}" z="${z}"/>`);
    }
    return n;
  };
  for (let i = 0; i + 8 < posiciones.length; i += 9) {
    const a = id(i), b = id(i + 3), c = id(i + 6);
    if (a !== b && b !== c && a !== c) triangulos.push(`<triangle v1="${a}" v2="${b}" v3="${c}"/>`);
  }
  return `<mesh><vertices>${vertices.join("")}</vertices><triangles>${triangulos.join("")}</triangles></mesh>`;
}

/* CRC32 (lo pide el formato ZIP). */
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
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ZIP sin compresión (método "store"). */
function zip(archivos: { nombre: string; texto: string }[]) {
  const codificar = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const { nombre, texto } of archivos) {
    const nombreBytes = codificar.encode(nombre);
    const datos = codificar.encode(texto);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true); // sin compresión
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombreBytes.length, true);
    partes.push(new Uint8Array(local.buffer), nombreBytes, datos);
    const cabecera = new DataView(new ArrayBuffer(46));
    cabecera.setUint32(0, 0x02014b50, true);
    cabecera.setUint16(4, 20, true);
    cabecera.setUint16(6, 20, true);
    cabecera.setUint32(16, crc, true);
    cabecera.setUint32(20, datos.length, true);
    cabecera.setUint32(24, datos.length, true);
    cabecera.setUint16(28, nombreBytes.length, true);
    cabecera.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cabecera.buffer), nombreBytes);
    desplazamiento += 30 + nombreBytes.length + datos.length;
  }
  const tamanoCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)].map((p) => p.slice().buffer), { type: "model/3mf" });
}

export function exportar3mfConColores(geometria: THREE.BufferGeometry, factor = 1, nombre = "Kint 3D") {
  const grupos = [...porColor(geometria, factor).entries()];
  const colores = grupos.map(([hex]) => hex);
  const materiales = colores.map((hex, i) => `<base name="Color ${i + 1}" displaycolor="${hex}FF"/>`).join("");
  const objetos = grupos
    .map(([, posiciones], i) => `<object id="${i + 2}" name="${nombre} ${i + 1}" type="model" pid="1" pindex="${i}">${malla(posiciones)}</object>`)
    .join("");
  const items = grupos.map((_, i) => `<item objectid="${i + 2}"/>`).join("");
  const modelo =
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="es-UY" xmlns="${NS_3MF}">` +
    `<metadata name="Title">${nombre}</metadata><metadata name="Designer">Kint 3D</metadata>` +
    `<resources><basematerials id="1">${materiales}</basematerials>${objetos}</resources><build>${items}</build></model>`;
  // Bambu Studio: cada objeto con su filamento (1, 2, 3…) y los colores de los filamentos.
  const ajustes =
    `<?xml version="1.0" encoding="UTF-8"?>\n<config>` +
    grupos
      .map(
        (_, i) =>
          `<object id="${i + 2}"><metadata key="name" value="${nombre} ${i + 1}"/><metadata key="extruder" value="${i + 1}"/>` +
          `<part id="1" subtype="normal_part"><metadata key="name" value="${nombre} ${i + 1}"/><metadata key="extruder" value="${i + 1}"/></part></object>`
      )
      .join("") +
    `</config>`;
  const proyecto = JSON.stringify({ filament_colour: colores, filament_type: colores.map(() => "PLA"), version: "01.09.00.00" }, null, 2);
  return zip([
    {
      nombre: "[Content_Types].xml",
      texto:
        `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
        `<Default Extension="config" ContentType="text/xml"/></Types>`,
    },
    {
      nombre: "_rels/.rels",
      texto:
        `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
    },
    { nombre: "3D/3dmodel.model", texto: modelo },
    { nombre: "Metadata/model_settings.config", texto: ajustes },
    { nombre: "Metadata/project_settings.config", texto: proyecto },
  ]);
}
