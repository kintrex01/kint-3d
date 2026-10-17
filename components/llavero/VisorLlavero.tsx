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

function armarCadena(cadena: string, aro: { x: number; y: number; angulo?: number }, grosor: number) {
  const grupo = new THREE.Group();
  // Se arma con el agujero en el origen y la cadena hacia la izquierda; después se gira.
  grupo.position.set(aro.x, aro.y, 0);
  grupo.rotation.z = -(aro.angulo ?? 0);
  const material = new THREE.MeshStandardMaterial({ color: colorMetal(cadena), metalness: 0.85, roughness: 0.28 });

  // Como uno de verdad: argollita en el agujero → eslabones → aro grande (el de la mochila).
  const argollita = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.55, 14, 40), material);
  argollita.rotation.x = Math.PI / 2;
  argollita.position.set(-3.6 + 1.2, 0, grosor / 2);
  grupo.add(argollita);

  let x = -7.2 + 1.2;
  for (let indice = 0; indice < 4; indice++) {
    const eslabon = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.5, 10, 28), material);
    eslabon.scale.set(1.45, 1, 1);
    eslabon.position.set(x - 2.4, 0, grosor / 2);
    if (indice % 2 === 0) eslabon.rotation.x = Math.PI / 2;
    grupo.add(eslabon);
    x -= 5.2;
  }

  const radio = 11;
  const aroGrande = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.9, 16, 72), material);
  aroGrande.rotation.x = Math.PI / 2;
  aroGrande.position.set(x - radio + 1.4, 0, grosor / 2);
  grupo.add(aroGrande);
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
  materialTelefono: THREE.MeshStandardMaterial;
};

export default function VisorLlavero({
  geometria,
  colorBase,
  colorLetras,
  colorTelefono = "#ffffff",
  cadena = "",
  atras = false,
}: {
  geometria: GeometriaLlavero | null;
  colorBase: string;
  colorLetras: string;
  colorTelefono?: string; // chapita: teléfono relleno de otro color
  cadena?: string; // "" = sin argolla
  atras?: boolean; // mostrar la pieza dada vuelta (chapita: el teléfono)
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
    // Luz de abajo: para ver bien la parte de atrás (chapita: el teléfono).
    const abajo = new THREE.DirectionalLight(0xffffff, 1.6);
    abajo.position.set(20, 40, -120);
    scene.add(abajo);

    const materialBase = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
    const materialLetras = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
    const materialTelefono = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
    const grupo = new THREE.Group();
    scene.add(grupo);
    const cadenaGrupo = new THREE.Group();
    scene.add(cadenaGrupo);

    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.minDistance = 30;
    controles.maxDistance = 600;

    escena.current = {
      renderer,
      camara,
      controles,
      grupo,
      cadena: cadenaGrupo,
      materialBase,
      materialLetras,
      materialTelefono,
    };

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
      materialTelefono.dispose();
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
    if (geometria.telefono) actual.grupo.add(new THREE.Mesh(geometria.telefono, actual.materialTelefono));

    const medida = Math.max(geometria.ancho + 30, geometria.alto * 2.2);
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
    if (geometria && cadena) actual.cadena.add(armarCadena(cadena, geometria.aro, geometria.grosor ?? 3));
  }, [geometria, cadena]);

  // Dar vuelta la pieza (y su cadena) para ver la parte de atrás.
  useEffect(() => {
    const actual = escena.current;
    if (!actual) return;
    const giro = atras ? Math.PI : 0;
    actual.grupo.rotation.y = giro;
    actual.cadena.rotation.y = giro;
    const grosor = geometria?.grosor ?? 3;
    actual.grupo.position.z = atras ? grosor : 0;
    actual.cadena.position.z = atras ? grosor : 0;
  }, [atras, geometria]);

  useEffect(() => {
    escena.current?.materialBase.color.set(colorBase);
    escena.current?.materialLetras.color.set(colorLetras);
    escena.current?.materialTelefono.color.set(colorTelefono);
  }, [colorBase, colorLetras, colorTelefono]);

  return <div ref={contenedor} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}
