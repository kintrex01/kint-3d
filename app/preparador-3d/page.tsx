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

type Medidas = {
  ancho: number;
  profundidad: number;
  altura: number;
};

type TamanoCama = 180 | 250 | 300;

const tamanosCama: TamanoCama[] = [180, 250, 300];

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
  contarPiezasSeparadas(geometria);

setCantidadPiezas(piezasDetectadas);
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

      setMedidas({
        ancho: tamano.x,
        profundidad: tamano.z,
        altura: tamano.y,
      });

      const dimensionMayor = Math.max(
        tamano.x,
        tamano.y,
        tamano.z,
        tamanoCama
      );

      const distancia =
        dimensionMayor * 1.45;

      camara.position.set(
  distancia,
  tamanoCama / 2 + distancia * 0.65,
  distancia
);

      camara.near = Math.max(
        dimensionMayor / 10000,
        0.1
      );

      camara.far =
        dimensionMayor * 20;

      camara.updateProjectionMatrix();

      controles.target.set(
        0,
        Math.min(
          tamano.y / 2,
          tamanoCama / 3
        ),
        0
      );

      controles.update();
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

  function cambiarVista(
  tipo: "isometrica" | "superior"
) {
  const camara = camaraRef.current;
  const controles = controlesRef.current;
  const cama = camaRef.current;
  const modelo = modeloRef.current;

  if (!camara || !controles || !cama) {
    return;
  }

  const cajaTotal = new THREE.Box3();

  cajaTotal.expandByObject(cama);

  if (modelo) {
    cajaTotal.expandByObject(modelo);
  }

  if (cajaTotal.isEmpty()) {
    return;
  }

  const centro = cajaTotal.getCenter(
    new THREE.Vector3()
  );

  const tamano = cajaTotal.getSize(
    new THREE.Vector3()
  );

  const dimensionMayor = Math.max(
    tamano.x,
    tamano.y,
    tamano.z
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

  const distancia =
    (dimensionMayor / 2) /
    Math.tan(fovLimitante / 2) *
    1.45;

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
        0.75,
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
    0.1
  );

  camara.far = distancia * 20;
  camara.updateProjectionMatrix();
  camara.lookAt(centro);

  controles.update();
}

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-10 text-[var(--text-main)]">
      <div className="mx-auto max-w-7xl">

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

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[var(--border-color)] p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]">
              Archivo
            </p>

            <label className="block cursor-pointer rounded-xl border border-red-600 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-600 hover:text-white">
              {cargando
                ? "Cargando..."
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
              <p className="mt-3 break-all text-xs font-semibold">
                {nombreArchivo}
              </p>
            )}

            {cantidadPiezas !== null && (
  <div
    className={`mt-3 rounded-xl border px-4 py-3 text-xs leading-5 ${
      cantidadPiezas === 1
        ? "border-green-600 bg-green-50 text-green-700"
        : "border-blue-500 bg-blue-50 text-blue-800"
    }`}
  >
    <p className="font-bold">
      {cantidadPiezas === 1
        ? "1 pieza detectada"
        : `${cantidadPiezas} piezas separadas detectadas`}
    </p>

    {cantidadPiezas > 1 && (
      <p className="mt-1">
        El archivo contiene varios cuerpos
        independientes. Esto es correcto cuando
        preparaste varias piezas para imprimir juntas.
      </p>
    )}
  </div>
)}

            <div className="my-6 h-px bg-[var(--border-color)]" />

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]">
              Cama de impresión
            </p>

            <div className="grid grid-cols-3 gap-2">
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

            <div className="my-6 h-px bg-[var(--border-color)]" />

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]">
              Medidas del modelo
            </p>

{medidas ? (
  <div className="space-y-2 text-xs">
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">
        Ancho
      </span>

      <strong>
        {medidas.ancho.toFixed(1)} mm
      </strong>
    </div>

    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">
        Profundidad
      </span>

      <strong>
        {medidas.profundidad.toFixed(1)} mm
      </strong>
    </div>

    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">
        Altura
      </span>

      <strong>
        {medidas.altura.toFixed(1)} mm
      </strong>
    </div>

    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] ${
        entraEnCama
          ? "border-green-600 bg-green-50 text-green-700"
          : "border-red-600 bg-red-50 text-red-700"
      }`}
    >
      <p>
        {entraEnCama
          ? "El modelo entra"
          : "El modelo no entra"}
      </p>

      {!entraEnCama && (
        <div className="mt-3 space-y-1 text-left text-[10px] font-semibold normal-case tracking-normal">
          {excesoAncho > 0 && (
            <p>
              El ancho supera la cama por{" "}
              {excesoAncho.toFixed(1)} mm.
            </p>
          )}

          {excesoProfundidad > 0 && (
            <p>
              La profundidad supera la cama por{" "}
              {excesoProfundidad.toFixed(1)} mm.
            </p>
          )}

          {excesoAltura > 0 && (
            <p>
              La altura supera la cama por{" "}
              {excesoAltura.toFixed(1)} mm.
            </p>
          )}
        </div>
      )}
    </div>
  </div>
) : (
  <p className="text-xs leading-5 text-[var(--text-muted)]">
    Las medidas aparecerán después de cargar un STL.
  </p>
)}

            {error && (
              <p className="mt-5 rounded-xl border border-red-600 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                {error}
              </p>
            )}
          </aside>

          <section className="relative overflow-hidden rounded-2xl border border-[var(--border-color)]">
            <div
              ref={contenedorRef}
              className="h-[480px] w-full sm:h-[620px]"
            />

<div className="absolute right-3 top-3 flex gap-2">
  <button
    type="button"
    onClick={() =>
      cambiarVista("isometrica")
    }
    className="rounded-lg border border-[var(--border-color)] bg-[var(--page-bg)]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] backdrop-blur transition hover:border-red-600 hover:text-red-600"
  >
    Centrar
  </button>

  <button
    type="button"
    onClick={() =>
      cambiarVista("superior")
    }
    className="rounded-lg border border-[var(--border-color)] bg-[var(--page-bg)]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] backdrop-blur transition hover:border-red-600 hover:text-red-600"
  >
    Vista superior
  </button>
</div>

            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-[var(--border-color)] bg-[var(--page-bg)]/90 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] backdrop-blur">
              Arrastrar: girar · Rueda: zoom
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}