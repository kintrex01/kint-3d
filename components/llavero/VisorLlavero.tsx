"use client";

/*
 * Vista 3D del llavero personalizado: se gira con el dedo o el mouse.
 * Recibe las dos piezas ya armadas (lib/llavero/geometria.ts).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GeometriaLlavero } from "@/lib/llavero/geometria";

/* Argolla y eslabones de la cadena, según el color que eligió ("Dorada" / "Plateada"). */
function colorMetal(cadena: string) {
  const clave = cadena.toLocaleLowerCase("es");
  if (clave.includes("dor") || clave.includes("oro")) return 0xd9b04f;
  if (clave.includes("negr")) return 0x2a2a2a;
  return 0xcfd3d8;
}

function armarCadena(cadena: string, aro: { x: number; y: number }) {
  const grupo = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: colorMetal(cadena), metalness: 0.85, roughness: 0.28 });

  // Argolla: pasa por el agujero, parada (perpendicular al llavero).
  const radio = 11;
  const argolla = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.9, 16, 72), material);
  argolla.rotation.x = Math.PI / 2;
  argolla.position.set(aro.x - radio + 1.2, aro.y, 1.5);
  grupo.add(argolla);

  // Unos eslabones colgando del otro lado de la argolla.
  let x = aro.x - radio * 2 + 1.2;
  for (let indice = 0; indice < 4; indice++) {
    const eslabon = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.55, 10, 28), material);
    eslabon.scale.set(1.45, 1, 1);
    eslabon.position.set(x - 2.6, aro.y, 1.5);
    if (indice % 2 === 0) eslabon.rotation.x = Math.PI / 2;
    grupo.add(eslabon);
    x -= 5.6;
  }
  return grupo;
}

type Escena = {
  renderer: THREE.WebGLRenderer;
  camara: THREE.PerspectiveCamera;
  controles: OrbitControls;
  grupo: THREE.Group;
  cadena: THREE.Group;
  materialBase: THREE.MeshStandardMaterial;
  materialLetras: THREE.MeshStandardMaterial;
};

export default function VisorLlavero({
  geometria,
  colorBase,
  colorLetras,
  cadena = "",
}: {
  geometria: GeometriaLlavero | null;
  colorBase: string;
  colorLetras: string;
  cadena?: string; // "" = sin argolla
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const ultimoAncho = useRef(0);

  // Escena, luces y controles: una sola vez.
  useEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    caja.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    camara.up.set(0, 0, 1);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(-40, -60, 120);
    scene.add(sol);
    const contraluz = new THREE.DirectionalLight(0xbcd4ff, 0.8);
    contraluz.position.set(60, 80, 40);
    scene.add(contraluz);

    const materialBase = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
    const materialLetras = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
    const grupo = new THREE.Group();
    scene.add(grupo);
    const cadenaGrupo = new THREE.Group();
    scene.add(cadenaGrupo);

    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.minDistance = 30;
    controles.maxDistance = 600;

    escena.current = { renderer, camara, controles, grupo, cadena: cadenaGrupo, materialBase, materialLetras };

    const ajustar = () => {
      const ancho = caja.clientWidth || 1;
      const alto = caja.clientHeight || 1;
      renderer.setSize(ancho, alto, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(caja);

    let cuadro = 0;
    const dibujar = () => {
      cuadro = requestAnimationFrame(dibujar);
      controles.update();
      renderer.render(scene, camara);
    };
    dibujar();

    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      controles.dispose();
      materialBase.dispose();
      materialLetras.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      escena.current = null;
    };
  }, []);

  // Piezas nuevas: se reemplazan y, si cambió mucho el tamaño, se reencuadra.
  useEffect(() => {
    const actual = escena.current;
    if (!actual || !geometria) return;

    actual.grupo.clear();
    actual.grupo.add(new THREE.Mesh(geometria.base, actual.materialBase));
    actual.grupo.add(new THREE.Mesh(geometria.letras, actual.materialLetras));

    const medida = Math.max(geometria.ancho + 26, geometria.alto * 2.2);
    if (Math.abs(medida - ultimoAncho.current) > ultimoAncho.current * 0.25) {
      ultimoAncho.current = medida;
      const distancia = (medida / 2 / Math.tan((actual.camara.fov * Math.PI) / 360)) * 1.25;
      actual.camara.position.set(0, -distancia * 0.62, distancia * 0.8);
      actual.controles.target.set(0, 0, 1.5);
      actual.controles.update();
    }
  }, [geometria]);

  // La argolla con la cadena elegida, enganchada en el agujero.
  useEffect(() => {
    const actual = escena.current;
    if (!actual) return;
    actual.cadena.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) {
        hijo.geometry.dispose();
        (hijo.material as THREE.Material).dispose();
      }
    });
    actual.cadena.clear();
    if (geometria && cadena) actual.cadena.add(armarCadena(cadena, geometria.aro));
  }, [geometria, cadena]);

  useEffect(() => {
    escena.current?.materialBase.color.set(colorBase);
    escena.current?.materialLetras.color.set(colorLetras);
  }, [colorBase, colorLetras]);

  return <div ref={contenedor} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}
