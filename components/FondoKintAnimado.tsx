"use client";

import * as THREE from "three";
import {
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * Se conservan las cuatro imágenes originales.
 * El componente carga PC y móvil al mismo tiempo para poder
 * cambiar de formato sin recargar la página ni perder la animación.
 */
const FONDO_CLARO_PC =
  "/fondos/kint-claro-pc.png";

const FONDO_OSCURO_PC =
  "/fondos/kint-oscuro-pc.png";

const FONDO_CLARO_MOVIL =
  "/fondos/kint-claro-movil.png";

const FONDO_OSCURO_MOVIL =
  "/fondos/kint-oscuro-movil.png";

const ANCHO_MAXIMO_MOVIL = 760;

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    gl_Position = vec4(
      position.xy,
      0.0,
      1.0
    );
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D uFondoClaro;
  uniform sampler2D uFondoOscuro;

  uniform vec2 uResolucion;
  uniform vec2 uTamanoClaro;
  uniform vec2 uTamanoOscuro;
  uniform vec2 uPuntero;

  uniform float uTiempo;
  uniform float uTema;
  uniform float uEsMovil;

  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(
      p * vec2(
        123.34,
        456.21
      )
    );

    p += dot(
      p,
      p + 45.32
    );

    return fract(
      p.x * p.y
    );
  }

  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (
      3.0 -
      2.0 * f
    );

    float a = hash(
      i + vec2(0.0, 0.0)
    );

    float b = hash(
      i + vec2(1.0, 0.0)
    );

    float c = hash(
      i + vec2(0.0, 1.0)
    );

    float d = hash(
      i + vec2(1.0, 1.0)
    );

    return mix(
      mix(a, b, f.x),
      mix(c, d, f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float resultado = 0.0;
    float amplitud = 0.5;

    mat2 rotacion = mat2(
      0.80,
      0.60,
      -0.60,
      0.80
    );

    for (
      int indice = 0;
      indice < 5;
      indice++
    ) {
      resultado +=
        amplitud *
        ruido(p);

      p =
        rotacion *
        p *
        2.03;

      amplitud *= 0.5;
    }

    return resultado;
  }

  /*
   * Equivalente a background-size: cover.
   * La diferencia importante es que el recorte queda anclado
   * arriba y a la derecha, donde está el humo de las imágenes.
   *
   * No estira píxeles, no aplasta la imagen y no usa un zoom
   * animado. El único aumento posible es el necesario para cubrir
   * la proporción real de la pantalla, como haría CSS con cover.
   */
  vec2 cubrirArribaDerecha(
    vec2 uv,
    vec2 pantalla,
    vec2 imagen
  ) {
    float aspectoPantalla =
      pantalla.x /
      max(pantalla.y, 1.0);

    float aspectoImagen =
      imagen.x /
      max(imagen.y, 1.0);

    vec2 resultado = uv;

    if (
      aspectoPantalla >
      aspectoImagen
    ) {
      /*
       * La pantalla es más ancha.
       * Se recorta solamente la parte inferior de la imagen,
       * manteniendo intacto el borde superior.
       */
      float altoVisible =
        aspectoImagen /
        aspectoPantalla;

      resultado.y =
        1.0 -
        (
          1.0 - uv.y
        ) *
        altoVisible;
    } else {
      /*
       * La pantalla es más alta o angosta.
       * Se recorta por la izquierda para conservar el humo
       * pegado al borde derecho.
       */
      float anchoVisible =
        aspectoPantalla /
        aspectoImagen;

      resultado.x =
        1.0 -
        (
          1.0 - uv.x
        ) *
        anchoVisible;
    }

    return resultado;
  }

  float mascaraBordesSeguros(vec2 uv) {
    float izquierda =
      smoothstep(
        0.015,
        0.075,
        uv.x
      );

    float derecha =
      1.0 -
      smoothstep(
        0.925,
        0.992,
        uv.x
      );

    float abajo =
      smoothstep(
        0.015,
        0.075,
        uv.y
      );

    float arriba =
      1.0 -
      smoothstep(
        0.925,
        0.992,
        uv.y
      );

    return
      izquierda *
      derecha *
      abajo *
      arriba;
  }

  vec3 obtenerClaro(
    vec2 desplazamiento
  ) {
    vec2 uv = cubrirArribaDerecha(
      vUv,
      uResolucion,
      uTamanoClaro
    );

    uv += desplazamiento;

    uv = clamp(
      uv,
      vec2(0.002),
      vec2(0.998)
    );

    return texture2D(
      uFondoClaro,
      uv
    ).rgb;
  }

  vec3 obtenerOscuro(
    vec2 desplazamiento
  ) {
    vec2 uv = cubrirArribaDerecha(
      vUv,
      uResolucion,
      uTamanoOscuro
    );

    uv += desplazamiento;

    uv = clamp(
      uv,
      vec2(0.002),
      vec2(0.998)
    );

    return texture2D(
      uFondoOscuro,
      uv
    ).rgb;
  }

  /*
   * Evita que el modo oscuro se vea negro puro.
   * Se levantan las sombras hacia un azul noche conservando
   * el contraste y, especialmente, los blancos del humo.
   */
  vec3 levantarAzulOscuro(vec3 color) {
    vec3 azulMinimo = vec3(
      0.012,
      0.050,
      0.105
    );

    color = max(
      color,
      azulMinimo
    );

    vec3 mediosLevantados = sqrt(
      max(
        color,
        vec3(0.0)
      )
    );

    color = mix(
      color,
      mediosLevantados,
      0.135
    );

    float luminancia = dot(
      color,
      vec3(
        0.2126,
        0.7152,
        0.0722
      )
    );

    float sombras =
      1.0 -
      smoothstep(
        0.045,
        0.30,
        luminancia
      );

    color +=
      vec3(
        0.000,
        0.015,
        0.036
      ) *
      sombras;

    return color;
  }

  void main() {
    vec2 uv = vUv;

    /*
     * Velocidad suficiente para que el movimiento se perciba
     * sin hacer zoom ni desplazar la imagen completa.
     */
    float tiempo =
      uTiempo * 0.48;

    /*
     * En móvil la zona de humo comienza antes porque ocupa una
     * porción mayor de la imagen vertical. En PC se concentra
     * más hacia la derecha.
     */
    float inicioHumo = mix(
      0.45,
      0.27,
      uEsMovil
    );

    float mascaraHorizontal =
      smoothstep(
        inicioHumo,
        0.92,
        uv.x
      );

    float mascaraVertical =
      smoothstep(
        0.00,
        0.10,
        uv.y
      );

    float mascaraHumo =
      mascaraHorizontal *
      mascaraVertical;

    mascaraHumo *=
      mascaraBordesSeguros(uv);

    vec2 coordenadasUno = vec2(
      uv.x * 2.25,
      uv.y * 3.35
    );

    coordenadasUno += vec2(
      tiempo * 0.12,
      -tiempo * 0.20
    );

    vec2 coordenadasDos = vec2(
      uv.x * 4.35,
      uv.y * 2.70
    );

    coordenadasDos += vec2(
      -tiempo * 0.15,
      tiempo * 0.10
    );

    float ruidoUno =
      fbm(coordenadasUno);

    float ruidoDos =
      fbm(
        coordenadasDos +
        ruidoUno * 1.75
      );

    float ruidoTres =
      fbm(
        coordenadasUno * 1.68 -
        ruidoDos * 1.15 +
        vec2(
          tiempo * 0.09,
          tiempo * 0.045
        )
      );

    float curva = sin(
      uv.y * 12.5 +
      ruidoUno * 5.2 -
      tiempo * 1.12
    );

    float remolino = cos(
      uv.x * 9.4 -
      ruidoDos * 4.3 +
      tiempo * 0.76
    );

    vec2 flujo = vec2(
      ruidoUno - 0.5,
      ruidoDos - 0.5
    );

    flujo += vec2(
      curva * 0.19,
      remolino * 0.12
    );

    /*
     * Parallax muy suave. En pantallas táctiles el puntero queda
     * centrado, por lo tanto no produce saltos ni desplazamientos.
     */
    vec2 movimientoPuntero =
      uPuntero *
      vec2(
        0.0045,
        0.0030
      );

    /*
     * La amplitud es pequeña para conservar la nitidez original.
     * No se mueve ni se escala la fotografía completa: solamente
     * se refractan suavemente los píxeles dentro del humo.
     */
    vec2 desplazamiento =
      (
        flujo * 0.0155 +
        movimientoPuntero
      ) *
      mascaraHumo;

    vec2 desplazamientoSecundario =
      desplazamiento * 1.48;

    desplazamientoSecundario +=
      vec2(
        sin(
          tiempo * 0.96 +
          uv.y * 15.0
        ),
        cos(
          tiempo * 0.74 +
          uv.x * 12.5
        )
      ) *
      0.0042 *
      mascaraHumo;

    vec3 claroPrincipal =
      obtenerClaro(
        desplazamiento
      );

    vec3 oscuroPrincipal =
      levantarAzulOscuro(
        obtenerOscuro(
          desplazamiento
        )
      );

    vec3 claroSecundario =
      obtenerClaro(
        desplazamientoSecundario
      );

    vec3 oscuroSecundario =
      levantarAzulOscuro(
        obtenerOscuro(
          desplazamientoSecundario
        )
      );

    float mezclaTema =
      smoothstep(
        0.0,
        1.0,
        uTema
      );

    vec3 colorPrincipal = mix(
      claroPrincipal,
      oscuroPrincipal,
      mezclaTema
    );

    vec3 colorSecundario = mix(
      claroSecundario,
      oscuroSecundario,
      mezclaTema
    );

    /*
     * Refracción interna. Se mantiene baja para evitar el efecto
     * borroso o la sensación de imagen de poca calidad.
     */
    float refraccion =
      0.048 *
      mascaraHumo;

    vec3 color = mix(
      colorPrincipal,
      colorSecundario,
      refraccion
    );

    /*
     * Pulso luminoso dentro del humo.
     */
    float energia =
      smoothstep(
        0.46,
        0.83,
        ruidoTres
      );

    energia *= mascaraHumo;

    energia *=
      0.58 +
      0.42 *
      sin(
        tiempo * 1.55 +
        ruidoDos * 8.2
      );

    vec3 azulClaro = vec3(
      0.16,
      0.52,
      0.95
    );

    vec3 azulOscuro = vec3(
      0.10,
      0.38,
      0.82
    );

    vec3 colorLuz = mix(
      azulClaro,
      azulOscuro,
      mezclaTema
    );

    color +=
      colorLuz *
      energia *
      (
        0.070 +
        mezclaTema * 0.055
      );

    /*
     * Filamentos finos y lentos para que la animación sea visible
     * sin destruir los detalles blancos de la imagen.
     */
    float filamento = sin(
      (
        uv.y +
        ruidoUno * 0.17
      ) *
      30.0 -
      tiempo * 1.65
    );

    filamento = smoothstep(
      0.89,
      1.0,
      filamento
    );

    filamento *=
      mascaraHumo *
      smoothstep(
        0.43,
        0.84,
        ruidoDos
      );

    color +=
      vec3(
        0.31,
        0.68,
        1.0
      ) *
      filamento *
      (
        0.042 +
        mezclaTema * 0.030
      );

    /*
     * Brillo respirado muy amplio. No es un zoom y no modifica
     * la geometría de la imagen.
     */
    float respiracion =
      0.5 +
      0.5 *
      sin(
        tiempo * 0.58
      );

    float halo =
      smoothstep(
        0.90,
        0.20,
        distance(
          uv,
          vec2(
            0.88,
            mix(
              0.58,
              0.68,
              uEsMovil
            )
          )
        )
      );

    halo *= mascaraHorizontal;

    color +=
      vec3(
        0.025,
        0.095,
        0.18
      ) *
      halo *
      respiracion *
      mezclaTema *
      0.30;

    /*
     * Grano ultrafino para evitar bandas en degradados grandes.
     */
    float grano =
      hash(
        gl_FragCoord.xy +
        fract(uTiempo) * 200.0
      ) -
      0.5;

    color +=
      grano *
      0.00125;

    gl_FragColor = vec4(
      color,
      1.0
    );
  }
`;

type ColeccionTexturas = {
  claroPc: THREE.Texture;
  oscuroPc: THREE.Texture;
  claroMovil: THREE.Texture;
  oscuroMovil: THREE.Texture;
};

export default function FondoKintAnimado() {
  const contenedorRef =
    useRef<HTMLDivElement>(null);

  const lienzoRef =
    useRef<HTMLDivElement>(null);

  const [listo, setListo] =
    useState(false);

  useEffect(() => {
    const contenedor =
      contenedorRef.current;

    const lienzo =
      lienzoRef.current;

    if (
      !contenedor ||
      !lienzo
    ) {
      return;
    }

    let destruido = false;
    let animacion = 0;
    let formatoMovilActual: boolean | null = null;

    let temaObjetivo =
      document.documentElement
        .classList
        .contains("dark")
        ? 1
        : 0;

    let temaActual =
      temaObjetivo;

    const punteroObjetivo =
      new THREE.Vector2(0, 0);

    const punteroActual =
      new THREE.Vector2(0, 0);

    const temporizador =
      new THREE.Timer();

    temporizador.connect(document);

    const escena =
      new THREE.Scene();

    const camara =
      new THREE.OrthographicCamera(
        -1,
        1,
        1,
        -1,
        0,
        1
      );

    const renderizador =
      new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference:
          "high-performance",
      });

    renderizador.outputColorSpace =
      THREE.SRGBColorSpace;

    renderizador.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        2.0
      )
    );

    renderizador.domElement.className =
      "fondo-kint-canvas";

    renderizador.domElement.setAttribute(
      "aria-hidden",
      "true"
    );

    lienzo.appendChild(
      renderizador.domElement
    );

    const geometria =
      new THREE.PlaneGeometry(
        2,
        2
      );

    const cargador =
      new THREE.TextureLoader();

    let texturas:
      ColeccionTexturas | null = null;

    let material:
      THREE.ShaderMaterial | null = null;

    let plano:
      THREE.Mesh | null = null;

    function prepararTextura(
      textura: THREE.Texture
    ) {
      textura.colorSpace =
        THREE.SRGBColorSpace;

      textura.wrapS =
        THREE.ClampToEdgeWrapping;

      textura.wrapT =
        THREE.ClampToEdgeWrapping;

      textura.generateMipmaps = true;

      textura.minFilter =
        THREE.LinearMipmapLinearFilter;

      textura.magFilter =
        THREE.LinearFilter;

      textura.anisotropy =
        Math.min(
          16,
          renderizador.capabilities
            .getMaxAnisotropy()
        );

      textura.needsUpdate = true;
    }

    function obtenerTamanoImagen(
      textura: THREE.Texture
    ) {
      const imagen =
        textura.image as
          | HTMLImageElement
          | HTMLCanvasElement
          | ImageBitmap;

      return new THREE.Vector2(
        imagen.width || 1,
        imagen.height || 1
      );
    }

    function debeUsarFormatoMovil(
      ancho: number,
      alto: number
    ) {
      /*
       * Solo se usa el archivo móvil cuando la pantalla es angosta
       * y vertical. Un celular girado, una tablet o una ventana más
       * ancha reciben siempre la imagen PC.
       */
      return (
        ancho <= ANCHO_MAXIMO_MOVIL &&
        alto > ancho
      );
    }

    function aplicarFormato(
      usarMovil: boolean
    ) {
      if (
        !material ||
        !texturas
      ) {
        return;
      }

      const texturaClara =
        usarMovil
          ? texturas.claroMovil
          : texturas.claroPc;

      const texturaOscura =
        usarMovil
          ? texturas.oscuroMovil
          : texturas.oscuroPc;

      material.uniforms
        .uFondoClaro
        .value =
        texturaClara;

      material.uniforms
        .uFondoOscuro
        .value =
        texturaOscura;

      material.uniforms
        .uTamanoClaro
        .value
        .copy(
          obtenerTamanoImagen(
            texturaClara
          )
        );

      material.uniforms
        .uTamanoOscuro
        .value
        .copy(
          obtenerTamanoImagen(
            texturaOscura
          )
        );

      material.uniforms
        .uEsMovil
        .value =
        usarMovil
          ? 1
          : 0;

      formatoMovilActual =
        usarMovil;

            const contenedorActual =
        contenedorRef.current;

      if (contenedorActual) {
        contenedorActual.dataset.formato =
          usarMovil
            ? "movil"
            : "pc";
      }
    }

    function actualizarTamano() {
      const elemento =
        contenedorRef.current;

      if (!elemento) {
        return;
      }

      const ancho = Math.max(
        elemento.clientWidth,
        1
      );

      const alto = Math.max(
        elemento.clientHeight,
        1
      );

      renderizador.setSize(
        ancho,
        alto,
        false
      );

      if (material) {
        material.uniforms
          .uResolucion
          .value
          .set(
            ancho,
            alto
          );

        const usarMovil =
          debeUsarFormatoMovil(
            ancho,
            alto
          );

        if (
          formatoMovilActual !==
          usarMovil
        ) {
          aplicarFormato(
            usarMovil
          );
        }
      }
    }

    function moverPuntero(
      evento: PointerEvent
    ) {
      if (
        evento.pointerType ===
        "touch"
      ) {
        return;
      }

      const ancho = Math.max(
        window.innerWidth,
        1
      );

      const alto = Math.max(
        window.innerHeight,
        1
      );

      punteroObjetivo.set(
        evento.clientX /
          ancho -
          0.5,
        evento.clientY /
          alto -
          0.5
      );
    }

    function sacarPuntero() {
      punteroObjetivo.set(
        0,
        0
      );
    }

    function sincronizarTema() {
      temaObjetivo =
        document.documentElement
          .classList
          .contains("dark")
          ? 1
          : 0;
    }

    const observadorTema =
      new MutationObserver(
        sincronizarTema
      );

    observadorTema.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "class",
        ],
      }
    );

    const observadorTamano =
      new ResizeObserver(() => {
        actualizarTamano();
      });

    observadorTamano.observe(
      contenedor
    );

    window.addEventListener(
      "pointermove",
      moverPuntero,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "pointerleave",
      sacarPuntero,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "blur",
      sacarPuntero
    );

    async function iniciar() {
      try {
        /*
         * Se cargan las cuatro imágenes una sola vez. De esta forma
         * el cambio PC/móvil es instantáneo al rotar el teléfono o
         * redimensionar el navegador.
         */
        const resultados =
          await Promise.all([
            cargador.loadAsync(
              FONDO_CLARO_PC
            ),
            cargador.loadAsync(
              FONDO_OSCURO_PC
            ),
            cargador.loadAsync(
              FONDO_CLARO_MOVIL
            ),
            cargador.loadAsync(
              FONDO_OSCURO_MOVIL
            ),
          ]);

        if (destruido) {
          resultados.forEach(
            (textura) => {
              textura.dispose();
            }
          );

          return;
        }

        resultados.forEach(
          prepararTextura
        );

        texturas = {
          claroPc:
            resultados[0],
          oscuroPc:
            resultados[1],
          claroMovil:
            resultados[2],
          oscuroMovil:
            resultados[3],
        };

        const elementoInicial =
  contenedorRef.current;

if (!elementoInicial) {
  return;
}

const anchoInicial = Math.max(
  elementoInicial.clientWidth,
  1
);

const altoInicial = Math.max(
  elementoInicial.clientHeight,
  1
);

        const usarMovilInicial =
          debeUsarFormatoMovil(
            anchoInicial,
            altoInicial
          );

        const texturaClaraInicial =
          usarMovilInicial
            ? texturas.claroMovil
            : texturas.claroPc;

        const texturaOscuraInicial =
          usarMovilInicial
            ? texturas.oscuroMovil
            : texturas.oscuroPc;

        material =
          new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            depthTest: false,
            depthWrite: false,
            uniforms: {
              uFondoClaro: {
                value:
                  texturaClaraInicial,
              },

              uFondoOscuro: {
                value:
                  texturaOscuraInicial,
              },

              uResolucion: {
                value:
                  new THREE.Vector2(
                    anchoInicial,
                    altoInicial
                  ),
              },

              uTamanoClaro: {
                value:
                  obtenerTamanoImagen(
                    texturaClaraInicial
                  ),
              },

              uTamanoOscuro: {
                value:
                  obtenerTamanoImagen(
                    texturaOscuraInicial
                  ),
              },

              uPuntero: {
                value:
                  new THREE.Vector2(
                    0,
                    0
                  ),
              },

              uTiempo: {
                value: 0,
              },

              uTema: {
                value:
                  temaActual,
              },

              uEsMovil: {
                value:
                  usarMovilInicial
                    ? 1
                    : 0,
              },
            },
          });

        plano =
          new THREE.Mesh(
            geometria,
            material
          );

        escena.add(plano);

        formatoMovilActual =
          usarMovilInicial;

        elementoInicial.dataset.formato =
  usarMovilInicial
    ? "movil"
    : "pc";

        actualizarTamano();

        setListo(true);

        let tiempoAnterior =
          performance.now();

        function renderizar(
          tiempoActual: number
        ) {
          if (
            destruido ||
            !material
          ) {
            return;
          }

          const delta = Math.min(
            0.05,
            Math.max(
              0,
              (
                tiempoActual -
                tiempoAnterior
              ) /
                1000
            )
          );

          tiempoAnterior =
            tiempoActual;

          temporizador.update(
            tiempoActual
          );

          /*
           * Transición gradual de tema sin descargar ni reemplazar
           * el canvas. Las dos texturas permanecen siempre activas.
           */
          const suavizadoTema =
            1 -
            Math.exp(
              -delta * 2.35
            );

          temaActual +=
            (
              temaObjetivo -
              temaActual
            ) *
            suavizadoTema;

          punteroActual.lerp(
            punteroObjetivo,
            0.032
          );

          material.uniforms
            .uTiempo
            .value =
            temporizador.getElapsed();

          material.uniforms
            .uTema
            .value =
            temaActual;

          material.uniforms
            .uPuntero
            .value
            .copy(
              punteroActual
            );

          renderizador.render(
            escena,
            camara
          );

          animacion =
            window.requestAnimationFrame(
              renderizar
            );
        }

        animacion =
          window.requestAnimationFrame(
            renderizar
          );
      } catch (error) {
        console.error(
          "No se pudo iniciar el fondo animado:",
          error
        );

        /*
         * Si WebGL falla, las fotografías de respaldo continúan
         * visibles y respetan igualmente PC/móvil y claro/oscuro.
         */
        setListo(false);
      }
    }

    iniciar();

    return () => {
      destruido = true;

      window.cancelAnimationFrame(
        animacion
      );

      observadorTema.disconnect();
      observadorTamano.disconnect();

      window.removeEventListener(
        "pointermove",
        moverPuntero
      );

      window.removeEventListener(
        "pointerleave",
        sacarPuntero
      );

      window.removeEventListener(
        "blur",
        sacarPuntero
      );

      if (plano) {
        escena.remove(plano);
      }

      geometria.dispose();
      material?.dispose();

      if (texturas) {
        texturas.claroPc.dispose();
        texturas.oscuroPc.dispose();
        texturas.claroMovil.dispose();
        texturas.oscuroMovil.dispose();
      }

      temporizador.dispose();
      renderizador.dispose();

      if (
        renderizador.domElement
          .parentElement ===
        lienzo
      ) {
        lienzo.removeChild(
          renderizador.domElement
        );
      }
    };
  }, []);

  return (
    <div
      ref={contenedorRef}
      className={[
        "fondo-kint-webgl",
        listo ? "listo" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      {/*
       * Fotografías de respaldo.
       * También se ven durante los primeros milisegundos de carga.
       */}
      <div className="fallback fallback-claro" />

      <div className="fallback fallback-oscuro" />

      <div
        ref={lienzoRef}
        className="lienzo-webgl"
      />

      <div className="resplandor resplandor-uno" />

      <div className="resplandor resplandor-dos" />

      <div className="rejilla rejilla-superior" />

      <div className="rejilla rejilla-inferior" />

      <div className="acabado" />

      <style jsx>{`
        .fondo-kint-webgl {
          position: absolute;
          inset: 0;

          /*
           * inset: 0 hace que el fondo ocupe la altura REAL de la
           * sección padre. No usamos height: 100% porque el padre tiene
           * altura automática y ese porcentaje podía calcularse antes de
           * que cargara todo el contenido, generando el corte horizontal.
           */

          z-index: 0;

          overflow: hidden;
          isolation: isolate;

          pointer-events: none;

          background: #f3f8ff;

          transform: translateZ(0);
          contain: paint;
        }


        :global(html.dark)
          .fondo-kint-webgl {
          /* Azul noche, nunca negro puro. */
          background: #06182d;
        }

        .fallback {
          position: absolute;
          inset: 0;

          z-index: 1;

          background-position:
            right top;
          background-repeat:
            no-repeat;
          background-size:
            cover;

          transform: none;

          transition:
            opacity
            1500ms
            cubic-bezier(
              0.22,
              1,
              0.36,
              1
            );
        }

        .fallback-claro {
          opacity: 1;

          background-image:
            url("/fondos/kint-claro-pc.png");
        }

        .fallback-oscuro {
          opacity: 0;

          background-color:
            #06182d;

          background-image:
            url("/fondos/kint-oscuro-pc.png");
        }

        :global(html.dark)
          .fallback-claro {
          opacity: 0;
        }

        :global(html.dark)
          .fallback-oscuro {
          opacity: 1;
        }

        .lienzo-webgl {
          position: absolute;
          inset: 0;

          z-index: 2;

          opacity: 0;

          transition:
            opacity
            780ms
            ease;

          transform: translateZ(0);
          will-change: opacity;
        }

        .listo .lienzo-webgl {
          opacity: 1;
        }

        .lienzo-webgl
          :global(.fondo-kint-canvas) {
          position: absolute;
          inset: 0;

          display: block;

          width: 100%;
          height: 100%;

          transform: translateZ(0);
        }

        .resplandor {
          position: absolute;

          z-index: 3;

          border-radius: 50%;

          pointer-events: none;

          opacity: 0.20;

          filter: blur(72px);

          animation:
            respirarResplandor
            8s
            ease-in-out
            infinite;

          will-change: transform, opacity;
        }

        .resplandor-uno {
          top: -13%;
          right: -7%;

          width: 43vw;
          height: 43vw;

          background:
            rgba(
              92,
              186,
              255,
              0.17
            );
        }

        .resplandor-dos {
          right: 5%;
          bottom: -17%;

          width: 37vw;
          height: 37vw;

          background:
            rgba(
              38,
              126,
              226,
              0.12
            );

          animation-delay: -4.5s;
        }

        :global(html.dark)
          .resplandor {
          opacity: 0.31;
        }

        .rejilla {
          position: absolute;

          z-index: 4;

          width: 220px;
          height: 220px;

          opacity: 0.10;

          pointer-events: none;

          background-image:
            radial-gradient(
              circle,
              rgba(
                45,
                145,
                235,
                0.72
              )
                1px,
              transparent
                1.35px
            );

          background-size:
            17px 17px;
        }

        .rejilla-superior {
          top: -12px;
          left: -10px;
        }

        .rejilla-inferior {
          bottom: -20px;
          left: -10px;
        }

        :global(html.dark)
          .rejilla {
          opacity: 0.17;
        }

        .acabado {
          position: absolute;
          inset: 0;

          z-index: 5;

          pointer-events: none;

          /*
           * No se agrega una viñeta negra. Únicamente hay un halo
           * azul muy sutil para integrar el fondo con la interfaz.
           */
          background:
            radial-gradient(
              circle at 86% 28%,
              rgba(
                65,
                159,
                255,
                0.055
              )
                0%,
              transparent
                48%
            ),
            linear-gradient(
              90deg,
              rgba(
                255,
                255,
                255,
                0.022
              )
                0%,
              transparent
                52%
            );
        }

        :global(html.dark)
          .acabado {
          background:
            radial-gradient(
              circle at 86% 28%,
              rgba(
                72,
                164,
                255,
                0.095
              )
                0%,
              transparent
                52%
            ),
            linear-gradient(
              90deg,
              rgba(
                8,
                32,
                58,
                0.10
              )
                0%,
              transparent
                54%
            );
        }

        @keyframes respirarResplandor {
          0%,
          100% {
            transform: scale(0.90);
          }

          50% {
            transform: scale(1.10);
          }
        }

        @media (
          max-width: 760px
        ) and (
          orientation: portrait
        ) {
          /*
           * En móvil no se fija ninguna altura. El fondo se estira con
           * inset: 0 hasta el final real de esta sección.
           */

          .fallback-claro {
            background-image:
              url("/fondos/kint-claro-movil.png");
          }

          .fallback-oscuro {
            background-image:
              url("/fondos/kint-oscuro-movil.png");
          }

          .fallback {
            /* El humo comienza desde el borde superior. */
            background-position:
              right top;
          }

          .resplandor-uno {
            top: -4%;
            right: -18%;
          }

          .resplandor-dos {
            right: -10%;
            bottom: -12%;
          }

          .resplandor-uno,
          .resplandor-dos {
            width: 78vw;
            height: 78vw;
          }

          .rejilla {
            width: 150px;
            height: 150px;

            background-size:
              15px 15px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          /*
           * No se apaga WebGL por completo. En algunos equipos Windows
           * esta preferencia estaba activa y por eso parecía no haber
           * ninguna animación. Solo se vuelve más lenta.
           */
          .resplandor {
            animation-duration: 18s;
          }

          .fallback {
            transition-duration: 350ms;
          }
        }
      `}</style>
    </div>
  );
}