import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { analizarMalla } from "@/lib/analisis-malla";
import { analizarConsejos } from "@/lib/consejos-impresion";

/*
 * Revisión rápida en Cotizar (sin abrir el visor): agujeros, caras al revés,
 * piezas paradas y si conviene cortarlo. Cotizar la carga solo cuando hace
 * falta (import dinámico), así three.js no pesa en la página.
 */

export type RevisionRapida = {
  agujeros: number;
  carasAlReves: boolean;
  paradas: number;
  partes: number; // 0 = no hace falta cortarlo
};

export async function revisarArchivos(archivos: File[]): Promise<RevisionRapida> {
  const resultado: RevisionRapida = { agujeros: 0, carasAlReves: false, paradas: 0, partes: 0 };
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
    } finally {
      geometria.dispose();
    }
  }
  return resultado;
}
