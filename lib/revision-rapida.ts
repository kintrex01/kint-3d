import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { analizarMalla } from "@/lib/analisis-malla";
import { analizarConsejos } from "@/lib/consejos-impresion";
import { repararMalla } from "@/lib/reparar-malla";

/*
 * Revisión rápida en Cotizar (sin abrir el visor): agujeros, caras al revés,
 * piezas paradas y si conviene cortarlo. Si algo se arregla solo, se arregla
 * acá mismo y Cotizar manda la copia arreglada (el cliente no hace nada).
 * Cotizar la carga solo cuando hace falta (import dinámico), así three.js no
 * pesa en la página.
 */

export type RevisionRapida = {
  agujeros: number;
  carasAlReves: boolean;
  paradas: number;
  partes: number; // 0 = no hace falta cortarlo
  // Copias arregladas de los STL que lo necesitaban.
  reparados: { original: File; reparado: File }[];
  arreglos: { agujeros: number; laminas: number; costuras: number; carasDadasVuelta: number };
};

const LIMITE_SUBIDA = 50 * 1024 * 1024;
const ARREGLAR_EN_COTIZAR = false;

export async function revisarArchivos(archivos: File[]): Promise<RevisionRapida> {
  const resultado: RevisionRapida = {
    agujeros: 0,
    carasAlReves: false,
    paradas: 0,
    partes: 0,
    reparados: [],
    arreglos: { agujeros: 0, laminas: 0, costuras: 0, carasDadasVuelta: 0 },
  };
  const cargador = new STLLoader();

  for (const archivo of archivos) {
    if (!/\.stl$/i.test(archivo.name)) continue;
    const geometria: THREE.BufferGeometry = cargador.parse(await archivo.arrayBuffer());
    try {
      const analisis = analizarMalla(geometria);
      const consejos = analizarConsejos(geometria, 1);
      resultado.agujeros += analisis.agujeros.lazos;
      resultado.carasAlReves ||= analisis.alReves.cantidad > 0;
      resultado.paradas += consejos.paradas.length;
      if (consejos.cortes.length) resultado.partes = Math.max(resultado.partes, consejos.cortes.length + 1);

      // Desactivado: la copia arreglada cambiaba modelos de clientes. Solo se avisa.
      if (ARREGLAR_EN_COTIZAR && analisis.agujeros.cantidad + analisis.alReves.cantidad + analisis.aplastados.cantidad > 0) {
        const arreglo = repararMalla(geometria);
        const datos = new STLExporter().parse(new THREE.Mesh(arreglo.geometria), { binary: true });
        arreglo.geometria.dispose();
        const copia = new Uint8Array(datos.byteLength);
        copia.set(new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength));
        if (copia.byteLength <= LIMITE_SUBIDA) {
          const reparado = new File([copia], archivo.name.replace(/\.stl$/i, "") + "-reparado.stl", { type: "model/stl" });
          resultado.reparados.push({ original: archivo, reparado });
          resultado.arreglos.agujeros += arreglo.agujerosTapados;
          resultado.arreglos.laminas += arreglo.laminasEngrosadas;
          resultado.arreglos.costuras += arreglo.aristasCosidas + arreglo.rajasCerradas;
          resultado.arreglos.carasDadasVuelta += arreglo.carasDadasVuelta;
        }
      }
    } finally {
      geometria.dispose();
    }
  }
  return resultado;
}
