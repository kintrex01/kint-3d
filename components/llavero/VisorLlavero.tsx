"use client";

/*
 * Vista 3D del llavero personalizado: se gira con el dedo o el mouse.
 * Recibe las dos piezas ya armadas (lib/llavero/geometria.ts).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GeometriaLlavero } from "@/lib/llavero/geometria";

type Escena = {
  renderer: THREE.WebGLRenderer;
  camara: THREE.PerspectiveCamera;
  controles: OrbitControls;
  grupo: THREE.Group;
  materialBase: THREE.MeshStandardMaterial;
  materialLetras: THREE.MeshStandardMaterial;
};

export default function VisorLlavero({
  geometria,
  colorBase,
  colorLetras,
}: {
  geometria: GeometriaLlavero | null;
  colorBase: string;
  colorLetras: string;
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

    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.minDistance = 30;
    controles.maxDistance = 600;

    escena.current = { renderer, camara, controles, grupo, materialBase, materialLetras };

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

    const medida = Math.max(geometria.ancho, geometria.alto * 2.2);
    if (Math.abs(medida - ultimoAncho.current) > ultimoAncho.current * 0.25) {
      ultimoAncho.current = medida;
      const distancia = (medida / 2 / Math.tan((actual.camara.fov * Math.PI) / 360)) * 1.25;
      actual.camara.position.set(0, -distancia * 0.62, distancia * 0.8);
      actual.controles.target.set(0, 0, 1.5);
      actual.controles.update();
    }
  }, [geometria]);

  useEffect(() => {
    escena.current?.materialBase.color.set(colorBase);
    escena.current?.materialLetras.color.set(colorLetras);
  }, [colorBase, colorLetras]);

  return <div ref={contenedor} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}
