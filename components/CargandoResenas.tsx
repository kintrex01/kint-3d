"use client";

import type { CSSProperties } from "react";

const particulas = Array.from(
  { length: 34 },
  (_, indice) => {
    const izquierda = (indice * 29 + 7) % 100;
    const arriba = (indice * 47 + 11) % 100;
    const duracion = 3.2 + (indice % 7) * 0.55;
    const demora = -((indice % 11) * 0.37);
    const tamano = 2 + (indice % 3);

    return {
      indice,
      izquierda,
      arriba,
      duracion,
      demora,
      tamano,
    };
  }
);

const capas = Array.from(
  { length: 16 },
  (_, indice) => indice
);

export default function CargandoResenas() {
  return (
    <div
      className="kint-loader"
      role="status"
      aria-live="polite"
      aria-label="Cargando reseñas verificadas"
    >
      <div
        className="universo"
        aria-hidden="true"
      >
        <div className="aurora aurora-uno" />
        <div className="aurora aurora-dos" />
        <div className="aurora aurora-tres" />

        <div className="rejilla" />
        <div className="vignette" />
        <div className="scan-global" />

        {particulas.map((particula) => (
          <span
            key={particula.indice}
            className="particula"
            style={
              {
                left: `${particula.izquierda}%`,
                top: `${particula.arriba}%`,
                width: `${particula.tamano}px`,
                height: `${particula.tamano}px`,
                animationDuration: `${particula.duracion}s`,
                animationDelay: `${particula.demora}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="cabecera-loader">
        <div className="estado-superior">
          <span className="estado-punto" />

          <span>
            Sistema de verificación activo
          </span>
        </div>

        <h2>
          Imprimiendo confianza
        </h2>

        <p>
          Cada experiencia se procesa, valida y
          prepara antes de mostrarse.
        </p>
      </div>

      <div
        className="escena"
        aria-hidden="true"
      >
        <div className="onda onda-uno" />
        <div className="onda onda-dos" />
        <div className="onda onda-tres" />

        <div className="orbita orbita-uno">
          <span className="nodo nodo-uno" />
        </div>

        <div className="orbita orbita-dos">
          <span className="nodo nodo-dos" />
        </div>

        <div className="orbita orbita-tres">
          <span className="nodo nodo-tres" />
        </div>

        <div className="mini-resena mini-resena-izquierda">
          <div className="mini-avatar" />

          <div className="mini-contenido">
            <span />
            <span />
          </div>

          <div className="mini-estrellas">
            ★★★★★
          </div>
        </div>

        <div className="mini-resena mini-resena-derecha">
          <div className="mini-avatar" />

          <div className="mini-contenido">
            <span />
            <span />
          </div>

          <div className="mini-estrellas">
            ★★★★★
          </div>
        </div>

        <div className="impresora">
          <div className="resplandor-impresora" />

          <div className="columna columna-izquierda">
            <span />
            <span />
            <span />
          </div>

          <div className="columna columna-derecha">
            <span />
            <span />
            <span />
          </div>

          <div className="barra-superior">
            <div className="riel">
              <span />
            </div>

            <div className="cabezal">
              <span className="detalle-cabezal" />
              <span className="luz-cabezal" />
            </div>
          </div>

          <div className="haz-impresion" />

          <div className="tarjeta-impresa">
            <div className="reflejo-tarjeta" />
            <div className="escaneo-tarjeta" />

            <div className="perfil">
              <div className="perfil-cabeza" />
              <div className="perfil-cuerpo" />
            </div>

            <div className="datos-resena">
              <span className="dato dato-largo" />
              <span className="dato dato-medio" />
              <span className="dato dato-corto" />
            </div>

            <div className="estrellas">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>

            <div className="sello-verificado">
              <span className="check">✓</span>

              <span className="texto-sello">
                Verificada
              </span>
            </div>

            <div className="codigo-resena">
              RES · KINT
            </div>
          </div>

          <div className="capas-impresion">
            {capas.map((capa) => (
              <span
                key={capa}
                style={
                  {
                    top: `${capa * 3}px`,
                    animationDelay: `${capa * 0.075}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="cama-impresion">
            <span className="luz-cama" />
          </div>

          <div className="base-impresora">
            <span className="base-linea" />
            <span className="base-linea" />
            <span className="base-linea" />
          </div>
        </div>

        <div className="destello destello-uno" />
        <div className="destello destello-dos" />
        <div className="destello destello-tres" />
      </div>

      <div className="panel-progreso">
        <div className="barra-progreso">
          <span />
        </div>

        <div className="etapas">
          <div className="etapa etapa-uno">
            <span className="numero">01</span>
            <span className="nombre">
              Recibiendo
            </span>
          </div>

          <div className="etapa etapa-dos">
            <span className="numero">02</span>
            <span className="nombre">
              Analizando
            </span>
          </div>

          <div className="etapa etapa-tres">
            <span className="numero">03</span>
            <span className="nombre">
              Imprimiendo
            </span>
          </div>

          <div className="etapa etapa-cuatro">
            <span className="numero">04</span>
            <span className="nombre">
              Verificando
            </span>
          </div>
        </div>

        <p className="mensaje-inferior">
          Preparando experiencias reales
          <span className="puntos">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>

      <style jsx>{`
        .kint-loader {
          position: relative;
          left: 50%;
          display: flex;
          width: min(1500px, calc(100vw - 12px));
          min-height: clamp(610px, 76vh, 790px);
          transform: translateX(-50%);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          isolation: isolate;
          padding: 54px 20px 42px;
          border-top: 1px solid rgba(90, 186, 255, 0.12);
          border-bottom: 1px solid rgba(90, 186, 255, 0.12);
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(14, 92, 164, 0.12),
              transparent 42%
            ),
            linear-gradient(
              180deg,
              rgba(1, 14, 25, 0.12),
              rgba(1, 12, 22, 0.72)
            );
        }

        .universo {
          position: absolute;
          inset: 0;
          z-index: -4;
          overflow: hidden;
          pointer-events: none;
        }

        .universo::before {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(
              circle at center,
              rgba(106, 201, 255, 0.14) 0,
              rgba(106, 201, 255, 0.14) 1px,
              transparent 1px
            );
          background-size: 46px 46px;
          opacity: 0.16;
          content: "";
          animation: moverEstrellas 18s linear infinite;
        }

        .aurora {
          position: absolute;
          border-radius: 999px;
          filter: blur(90px);
          mix-blend-mode: screen;
          animation: respirarAurora 5s ease-in-out infinite;
        }

        .aurora-uno {
          top: 18%;
          left: 13%;
          width: 380px;
          height: 240px;
          background: rgba(16, 103, 206, 0.2);
        }

        .aurora-dos {
          right: 8%;
          bottom: 12%;
          width: 420px;
          height: 280px;
          background: rgba(31, 174, 235, 0.13);
          animation-delay: -1.7s;
        }

        .aurora-tres {
          top: 42%;
          left: 48%;
          width: 330px;
          height: 330px;
          transform: translate(-50%, -50%);
          background: rgba(69, 172, 255, 0.1);
          animation-delay: -3.1s;
        }

        .rejilla {
          position: absolute;
          inset: 38% -12% -45%;
          transform: perspective(480px) rotateX(68deg);
          transform-origin: center top;
          background-image:
            linear-gradient(
              rgba(80, 177, 244, 0.11) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(80, 177, 244, 0.11) 1px,
              transparent 1px
            );
          background-size: 54px 54px;
          opacity: 0.32;
          animation: moverRejilla 4s linear infinite;
        }

        .vignette {
          position: absolute;
          inset: 0;
          box-shadow:
            inset 0 0 160px 65px rgba(0, 8, 16, 0.85);
        }

        .scan-global {
          position: absolute;
          top: -15%;
          left: 0;
          width: 100%;
          height: 22%;
          opacity: 0;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(91, 194, 255, 0.025),
            rgba(91, 194, 255, 0.16),
            transparent
          );
          animation: escaneoGlobal 4.8s ease-in-out forwards;
        }

        .particula {
          position: absolute;
          border-radius: 50%;
          background: rgba(128, 214, 255, 0.85);
          box-shadow:
            0 0 7px rgba(128, 214, 255, 0.9),
            0 0 18px rgba(54, 158, 230, 0.35);
          animation-name: flotarParticula;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .cabecera-loader {
          position: relative;
          z-index: 8;
          max-width: 760px;
          text-align: center;
          animation: entradaCabecera 0.9s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .estado-superior {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #73c9ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .estado-punto {
          position: relative;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #72ceff;
          box-shadow:
            0 0 8px #72ceff,
            0 0 22px rgba(74, 182, 255, 0.8);
        }

        .estado-punto::after {
          position: absolute;
          inset: -7px;
          border: 1px solid rgba(114, 206, 255, 0.5);
          border-radius: 50%;
          content: "";
          animation: radarEstado 1.8s ease-out infinite;
        }

        .cabecera-loader h2 {
          margin: 19px 0 0;
          color: var(--text-main);
          font-size: clamp(25px, 3.2vw, 48px);
          font-weight: 900;
          letter-spacing: 0.18em;
          line-height: 1.1;
          text-transform: uppercase;
          text-shadow:
            0 0 30px rgba(88, 187, 255, 0.09);
        }

        .cabecera-loader p {
          margin: 17px auto 0;
          max-width: 590px;
          color: var(--text-muted);
          font-size: 12px;
          letter-spacing: 0.13em;
          line-height: 1.8;
          text-transform: uppercase;
        }

        .escena {
          position: relative;
          z-index: 5;
          width: min(680px, 100%);
          height: 350px;
          margin-top: 12px;
          perspective: 1100px;
          animation: entradaEscena 1s 0.15s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .onda {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px solid rgba(103, 200, 255, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0.3);
          opacity: 0;
          animation: expandirOnda 2.8s ease-out infinite;
        }

        .onda-uno {
          width: 250px;
          height: 250px;
        }

        .onda-dos {
          width: 360px;
          height: 360px;
          animation-delay: 0.65s;
        }

        .onda-tres {
          width: 470px;
          height: 470px;
          animation-delay: 1.3s;
        }

        .orbita {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px solid rgba(88, 188, 255, 0.16);
          border-radius: 50%;
          transform-style: preserve-3d;
        }

        .orbita-uno {
          width: 430px;
          height: 180px;
          margin: -90px 0 0 -215px;
          transform: rotate(-11deg);
          animation: rotarOrbitaUno 10s linear infinite;
        }

        .orbita-dos {
          width: 320px;
          height: 270px;
          margin: -135px 0 0 -160px;
          transform: rotate(23deg);
          animation: rotarOrbitaDos 8s linear infinite;
        }

        .orbita-tres {
          width: 230px;
          height: 330px;
          margin: -165px 0 0 -115px;
          transform: rotate(-31deg);
          opacity: 0.5;
          animation: rotarOrbitaTres 12s linear infinite;
        }

        .nodo {
          position: absolute;
          top: 50%;
          left: -5px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #7cd4ff;
          box-shadow:
            0 0 9px #7cd4ff,
            0 0 24px rgba(86, 188, 255, 0.75);
        }

        .nodo-dos {
          top: 12%;
          left: auto;
          right: 7%;
        }

        .nodo-tres {
          top: auto;
          right: 16%;
          bottom: 5%;
          left: auto;
        }

        .mini-resena {
          position: absolute;
          z-index: 2;
          width: 142px;
          height: 86px;
          padding: 13px;
          opacity: 0;
          border: 1px solid rgba(90, 188, 255, 0.28);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(10, 42, 68, 0.78),
              rgba(2, 17, 29, 0.87)
            );
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.35),
            inset 0 1px rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
        }

        .mini-resena-izquierda {
          top: 92px;
          left: 4%;
          transform: translateX(-90px)
            rotateY(32deg) rotateZ(-7deg);
          animation: entradaMiniIzquierda 1s 1.35s
            cubic-bezier(0.22, 1, 0.36, 1)
            forwards,
            flotarMiniIzquierda 4s 2.35s
            ease-in-out infinite;
        }

        .mini-resena-derecha {
          top: 125px;
          right: 3%;
          transform: translateX(90px)
            rotateY(-32deg) rotateZ(7deg);
          animation: entradaMiniDerecha 1s 1.65s
            cubic-bezier(0.22, 1, 0.36, 1)
            forwards,
            flotarMiniDerecha 4.4s 2.65s
            ease-in-out infinite;
        }

        .mini-avatar {
          position: absolute;
          top: 14px;
          left: 13px;
          width: 24px;
          height: 24px;
          border: 1px solid rgba(111, 204, 255, 0.5);
          border-radius: 8px;
          background: rgba(50, 156, 226, 0.14);
          box-shadow:
            inset 0 0 10px rgba(79, 180, 240, 0.15);
        }

        .mini-contenido {
          position: absolute;
          top: 17px;
          left: 47px;
          display: flex;
          width: 74px;
          flex-direction: column;
          gap: 7px;
        }

        .mini-contenido span {
          height: 3px;
          border-radius: 999px;
          background: rgba(172, 224, 255, 0.55);
        }

        .mini-contenido span:last-child {
          width: 65%;
          opacity: 0.45;
        }

        .mini-estrellas {
          position: absolute;
          bottom: 13px;
          left: 14px;
          color: #72caff;
          font-size: 9px;
          letter-spacing: 3px;
          text-shadow:
            0 0 8px rgba(100, 200, 255, 0.7);
        }

        .impresora {
          position: absolute;
          top: 8px;
          left: 50%;
          z-index: 6;
          width: 310px;
          height: 326px;
          transform: translateX(-50%);
          transform-style: preserve-3d;
          animation: flotarImpresora 4s ease-in-out infinite;
        }

        .resplandor-impresora {
          position: absolute;
          top: 40%;
          left: 50%;
          width: 220px;
          height: 220px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(38, 150, 236, 0.12);
          filter: blur(42px);
          animation: pulsoResplandor 2.4s ease-in-out infinite;
        }

        .columna {
          position: absolute;
          top: 50px;
          z-index: 4;
          width: 17px;
          height: 221px;
          overflow: hidden;
          border: 1px solid rgba(107, 201, 255, 0.35);
          border-radius: 8px;
          background:
            linear-gradient(
              90deg,
              rgba(9, 36, 56, 0.98),
              rgba(24, 74, 105, 0.86),
              rgba(6, 25, 41, 0.98)
            );
          box-shadow:
            0 0 21px rgba(39, 152, 224, 0.12);
        }

        .columna-izquierda {
          left: 26px;
        }

        .columna-derecha {
          right: 26px;
        }

        .columna span {
          display: block;
          width: 6px;
          height: 6px;
          margin: 42px auto 0;
          border: 1px solid rgba(109, 204, 255, 0.42);
          border-radius: 50%;
          background: rgba(68, 171, 232, 0.2);
        }

        .barra-superior {
          position: absolute;
          top: 43px;
          left: 26px;
          z-index: 8;
          width: 258px;
          height: 31px;
          border: 1px solid rgba(102, 199, 255, 0.4);
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              rgba(22, 65, 94, 0.98),
              rgba(5, 24, 39, 0.98)
            );
          box-shadow:
            0 8px 23px rgba(0, 0, 0, 0.27),
            0 0 24px rgba(39, 157, 232, 0.1);
        }

        .riel {
          position: absolute;
          top: 50%;
          left: 18px;
          width: calc(100% - 36px);
          height: 3px;
          transform: translateY(-50%);
          border-radius: 999px;
          background: rgba(103, 196, 250, 0.16);
        }

        .riel span {
          display: block;
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(133, 215, 255, 0.8),
            transparent
          );
        }

        .cabezal {
          position: absolute;
          top: 21px;
          left: 20%;
          z-index: 10;
          width: 47px;
          height: 37px;
          transform: translateX(-50%);
          border: 1px solid rgba(111, 205, 255, 0.62);
          border-radius: 8px 8px 13px 13px;
          background:
            linear-gradient(
              180deg,
              rgba(13, 46, 68, 1),
              rgba(2, 18, 30, 1)
            );
          box-shadow:
            0 8px 21px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(65, 174, 242, 0.28);
          animation: moverCabezal 2.15s ease-in-out infinite;
        }

        .detalle-cabezal {
          position: absolute;
          top: 8px;
          left: 50%;
          width: 20px;
          height: 4px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(124, 207, 255, 0.4);
        }

        .luz-cabezal {
          position: absolute;
          right: 7px;
          bottom: 7px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #73ceff;
          box-shadow:
            0 0 7px #73ceff,
            0 0 16px #73ceff;
          animation: parpadearLuz 0.7s ease-in-out infinite;
        }

        .haz-impresion {
          position: absolute;
          top: 100px;
          left: 31%;
          z-index: 3;
          width: 2px;
          height: 93px;
          transform: translateX(-50%);
          transform-origin: top;
          opacity: 0.7;
          background: linear-gradient(
            to bottom,
            #9adfff,
            rgba(74, 183, 247, 0.5),
            transparent
          );
          box-shadow:
            0 0 8px #79cfff,
            0 0 25px rgba(68, 176, 241, 0.8);
          animation:
            moverHaz 2.15s ease-in-out infinite,
            pulsoHaz 0.55s ease-in-out infinite;
        }

        .tarjeta-impresa {
          position: absolute;
          top: 112px;
          left: 50%;
          z-index: 5;
          width: 208px;
          height: 131px;
          overflow: hidden;
          transform: translateX(-50%)
            translateY(95px)
            rotateX(65deg)
            scaleY(0.08);
          transform-origin: bottom center;
          opacity: 0;
          border: 1px solid rgba(112, 204, 255, 0.57);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 25% 10%,
              rgba(60, 166, 232, 0.16),
              transparent 45%
            ),
            linear-gradient(
              145deg,
              rgba(14, 54, 82, 0.98),
              rgba(2, 18, 31, 0.99)
            );
          box-shadow:
            0 28px 55px rgba(0, 0, 0, 0.45),
            0 0 38px rgba(43, 159, 230, 0.2),
            inset 0 1px rgba(255, 255, 255, 0.08);
          animation:
            imprimirTarjeta 1.55s 0.55s
            cubic-bezier(0.22, 1, 0.36, 1)
            forwards,
            respiracionTarjeta 3s 2.1s
            ease-in-out infinite;
        }

        .reflejo-tarjeta {
          position: absolute;
          inset: 0;
          transform: translateX(-140%) skewX(-19deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(153, 223, 255, 0.24),
            transparent
          );
          animation: reflejarTarjeta 2.8s 2.1s
            ease-in-out infinite;
        }

        .escaneo-tarjeta {
          position: absolute;
          top: -25%;
          left: 0;
          z-index: 8;
          width: 100%;
          height: 28%;
          opacity: 0;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(92, 198, 255, 0.18),
            rgba(151, 226, 255, 0.9),
            transparent
          );
          filter: blur(0.2px);
          animation: escanearTarjeta 1.7s 2.45s
            ease-in-out forwards;
        }

        .perfil {
          position: absolute;
          top: 22px;
          left: 19px;
          width: 43px;
          height: 43px;
          opacity: 0;
          border: 1px solid rgba(105, 204, 255, 0.48);
          border-radius: 13px;
          background: rgba(40, 142, 210, 0.1);
          animation: aparecerElemento 0.6s 1.55s
            ease-out forwards;
        }

        .perfil-cabeza {
          position: absolute;
          top: 9px;
          left: 50%;
          width: 12px;
          height: 12px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #78ceff;
          box-shadow: 0 0 10px rgba(120, 206, 255, 0.7);
        }

        .perfil-cuerpo {
          position: absolute;
          bottom: 7px;
          left: 50%;
          width: 23px;
          height: 11px;
          transform: translateX(-50%);
          border-radius: 12px 12px 5px 5px;
          background: rgba(120, 206, 255, 0.45);
        }

        .datos-resena {
          position: absolute;
          top: 26px;
          left: 77px;
          display: flex;
          width: 103px;
          flex-direction: column;
          gap: 9px;
        }

        .dato {
          display: block;
          height: 4px;
          transform: scaleX(0);
          transform-origin: left;
          border-radius: 999px;
          background: rgba(184, 228, 253, 0.65);
          animation: dibujarDato 0.55s ease-out forwards;
        }

        .dato-largo {
          width: 98px;
          animation-delay: 1.65s;
        }

        .dato-medio {
          width: 71px;
          opacity: 0.7;
          animation-delay: 1.78s;
        }

        .dato-corto {
          width: 86px;
          opacity: 0.38;
          animation-delay: 1.91s;
        }

        .estrellas {
          position: absolute;
          bottom: 26px;
          left: 20px;
          display: flex;
          gap: 6px;
          color: #7bd1ff;
          font-size: 14px;
          text-shadow:
            0 0 9px rgba(123, 209, 255, 0.8);
        }

        .estrellas span {
          display: inline-block;
          opacity: 0;
          transform: translateY(12px)
            scale(0.1)
            rotate(-50deg);
          animation: encenderEstrella 0.56s
            cubic-bezier(0.18, 1.5, 0.4, 1)
            forwards;
        }

        .estrellas span:nth-child(1) {
          animation-delay: 2.05s;
        }

        .estrellas span:nth-child(2) {
          animation-delay: 2.18s;
        }

        .estrellas span:nth-child(3) {
          animation-delay: 2.31s;
        }

        .estrellas span:nth-child(4) {
          animation-delay: 2.44s;
        }

        .estrellas span:nth-child(5) {
          animation-delay: 2.57s;
        }

        .sello-verificado {
          position: absolute;
          right: 16px;
          bottom: 18px;
          display: flex;
          height: 30px;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          opacity: 0;
          transform: scale(1.8) rotate(-18deg);
          border: 1px solid rgba(103, 207, 255, 0.7);
          border-radius: 999px;
          background: rgba(32, 139, 205, 0.15);
          color: #8fdcff;
          box-shadow:
            0 0 18px rgba(65, 182, 244, 0.22);
          animation: aplicarSello 0.65s 3.03s
            cubic-bezier(0.18, 1.5, 0.4, 1)
            forwards;
        }

        .check {
          display: flex;
          width: 17px;
          height: 17px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #62c2f4;
          color: #03131f;
          font-size: 10px;
          font-weight: 900;
        }

        .texto-sello {
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .codigo-resena {
          position: absolute;
          right: 17px;
          top: 84px;
          color: rgba(159, 216, 246, 0.35);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .capas-impresion {
          position: absolute;
          top: 233px;
          left: 50%;
          z-index: 3;
          width: 196px;
          height: 50px;
          transform: translateX(-50%);
        }

        .capas-impresion span {
          position: absolute;
          left: 50%;
          width: 174px;
          height: 2px;
          transform: translateX(-50%) scaleX(0);
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(81, 187, 248, 0.85),
            #a4e2ff,
            rgba(81, 187, 248, 0.85),
            transparent
          );
          box-shadow:
            0 0 7px rgba(87, 193, 255, 0.68);
          animation: imprimirCapa 0.82s ease-out
            forwards;
        }

        .cama-impresion {
          position: absolute;
          bottom: 35px;
          left: 50%;
          z-index: 4;
          width: 249px;
          height: 42px;
          transform: translateX(-50%)
            perspective(260px)
            rotateX(64deg);
          border: 1px solid rgba(99, 198, 255, 0.42);
          border-radius: 50%;
          background:
            radial-gradient(
              ellipse at center,
              rgba(52, 164, 230, 0.24),
              rgba(4, 24, 38, 0.96) 64%
            );
          box-shadow:
            0 15px 38px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(48, 158, 226, 0.16);
        }

        .luz-cama {
          position: absolute;
          inset: 8px 30px;
          border-radius: 50%;
          background: rgba(91, 195, 250, 0.24);
          filter: blur(8px);
          animation: pulsoCama 1.2s ease-in-out infinite;
        }

        .base-impresora {
          position: absolute;
          right: 22px;
          bottom: 12px;
          left: 22px;
          display: flex;
          height: 34px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(93, 190, 246, 0.3);
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              rgba(11, 44, 65, 0.98),
              rgba(2, 17, 29, 0.98)
            );
          box-shadow:
            0 17px 30px rgba(0, 0, 0, 0.42);
        }

        .base-linea {
          width: 34px;
          height: 2px;
          border-radius: 999px;
          background: rgba(116, 207, 255, 0.25);
        }

        .destello {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #92dcff;
          box-shadow:
            0 0 8px #92dcff,
            0 0 25px #4ab5ef;
          animation: destellar 1.8s ease-in-out infinite;
        }

        .destello-uno {
          top: 92px;
          left: 25%;
        }

        .destello-dos {
          top: 205px;
          right: 21%;
          animation-delay: -0.7s;
        }

        .destello-tres {
          bottom: 51px;
          left: 30%;
          animation-delay: -1.25s;
        }

        .panel-progreso {
          position: relative;
          z-index: 9;
          width: min(620px, 94%);
          margin-top: 2px;
          text-align: center;
          animation: entradaProgreso 0.8s 0.55s
            ease-out both;
        }

        .barra-progreso {
          position: relative;
          width: 100%;
          height: 2px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(109, 202, 255, 0.14);
        }

        .barra-progreso::before {
          position: absolute;
          inset: -4px;
          background: rgba(72, 182, 247, 0.14);
          filter: blur(7px);
          content: "";
        }

        .barra-progreso span {
          position: relative;
          display: block;
          width: 0;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #247bd5,
            #68c8ff,
            #c1ebff
          );
          box-shadow:
            0 0 12px rgba(102, 202, 255, 0.9);
          animation: completarProgreso 4.8s
            cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .barra-progreso span::after {
          position: absolute;
          top: 50%;
          right: -5px;
          width: 9px;
          height: 9px;
          transform: translateY(-50%);
          border-radius: 50%;
          background: #bceaff;
          box-shadow:
            0 0 9px #bceaff,
            0 0 22px #61c5ff;
          content: "";
        }

        .etapas {
          display: grid;
          margin-top: 18px;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .etapa {
          display: flex;
          flex-direction: column;
          gap: 6px;
          opacity: 0.27;
          color: var(--text-muted);
          animation: activarEtapa 0.55s ease-out forwards;
        }

        .etapa-uno {
          animation-delay: 0.3s;
        }

        .etapa-dos {
          animation-delay: 1.35s;
        }

        .etapa-tres {
          animation-delay: 2.4s;
        }

        .etapa-cuatro {
          animation-delay: 3.45s;
        }

        .numero {
          color: #62c4fa;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .nombre {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .mensaje-inferior {
          margin: 21px 0 0;
          color: var(--text-main);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .puntos {
          display: inline-flex;
          width: 23px;
          justify-content: flex-start;
        }

        .puntos span {
          animation: animarPunto 1.1s ease-in-out infinite;
        }

        .puntos span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .puntos span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes entradaCabecera {
          from {
            opacity: 0;
            transform: translateY(-24px);
            filter: blur(9px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes entradaEscena {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.88);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes entradaProgreso {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes imprimirTarjeta {
          0% {
            opacity: 0;
            transform: translateX(-50%)
              translateY(102px)
              rotateX(72deg)
              scaleY(0.04);
            filter: blur(7px);
          }

          18% {
            opacity: 1;
          }

          72% {
            filter: blur(0);
          }

          100% {
            opacity: 1;
            transform: translateX(-50%)
              translateY(0)
              rotateX(5deg)
              scaleY(1);
            filter: blur(0);
          }
        }

        @keyframes respiracionTarjeta {
          0%,
          100% {
            box-shadow:
              0 28px 55px rgba(0, 0, 0, 0.45),
              0 0 27px rgba(43, 159, 230, 0.15),
              inset 0 1px rgba(255, 255, 255, 0.08);
          }

          50% {
            box-shadow:
              0 32px 64px rgba(0, 0, 0, 0.5),
              0 0 48px rgba(43, 159, 230, 0.35),
              inset 0 1px rgba(255, 255, 255, 0.08);
          }
        }

        @keyframes imprimirCapa {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleX(0.04);
          }

          35% {
            opacity: 1;
          }

          100% {
            opacity: 0.74;
            transform: translateX(-50%) scaleX(1);
          }
        }

        @keyframes moverCabezal {
          0%,
          100% {
            left: 18%;
          }

          50% {
            left: 82%;
          }
        }

        @keyframes moverHaz {
          0%,
          100% {
            left: 31%;
          }

          50% {
            left: 69%;
          }
        }

        @keyframes pulsoHaz {
          0%,
          100% {
            opacity: 0.28;
            transform: translateX(-50%) scaleY(0.7);
          }

          50% {
            opacity: 0.92;
            transform: translateX(-50%) scaleY(1);
          }
        }

        @keyframes dibujarDato {
          from {
            opacity: 0;
            transform: scaleX(0);
          }

          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes aparecerElemento {
          from {
            opacity: 0;
            transform: scale(0.4) rotate(-20deg);
          }

          to {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes encenderEstrella {
          to {
            opacity: 1;
            transform: translateY(0)
              scale(1)
              rotate(0);
          }
        }

        @keyframes aplicarSello {
          0% {
            opacity: 0;
            transform: scale(2)
              rotate(-18deg);
          }

          62% {
            opacity: 1;
            transform: scale(0.88)
              rotate(3deg);
          }

          100% {
            opacity: 1;
            transform: scale(1)
              rotate(0);
          }
        }

        @keyframes escanearTarjeta {
          0% {
            top: -28%;
            opacity: 0;
          }

          15% {
            opacity: 1;
          }

          85% {
            opacity: 0.85;
          }

          100% {
            top: 115%;
            opacity: 0;
          }
        }

        @keyframes reflejarTarjeta {
          0%,
          35% {
            transform: translateX(-140%)
              skewX(-19deg);
          }

          70%,
          100% {
            transform: translateX(160%)
              skewX(-19deg);
          }
        }

        @keyframes entradaMiniIzquierda {
          to {
            opacity: 0.72;
            transform: translateX(0)
              rotateY(26deg)
              rotateZ(-5deg);
          }
        }

        @keyframes entradaMiniDerecha {
          to {
            opacity: 0.65;
            transform: translateX(0)
              rotateY(-26deg)
              rotateZ(5deg);
          }
        }

        @keyframes flotarMiniIzquierda {
          0%,
          100% {
            transform: translateY(0)
              rotateY(26deg)
              rotateZ(-5deg);
          }

          50% {
            transform: translateY(-12px)
              rotateY(20deg)
              rotateZ(-2deg);
          }
        }

        @keyframes flotarMiniDerecha {
          0%,
          100% {
            transform: translateY(0)
              rotateY(-26deg)
              rotateZ(5deg);
          }

          50% {
            transform: translateY(11px)
              rotateY(-20deg)
              rotateZ(2deg);
          }
        }

        @keyframes flotarImpresora {
          0%,
          100% {
            transform: translateX(-50%)
              translateY(0);
          }

          50% {
            transform: translateX(-50%)
              translateY(-6px);
          }
        }

        @keyframes pulsoResplandor {
          0%,
          100% {
            opacity: 0.4;
            transform: translate(-50%, -50%)
              scale(0.85);
          }

          50% {
            opacity: 1;
            transform: translate(-50%, -50%)
              scale(1.1);
          }
        }

        @keyframes expandirOnda {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%)
              scale(0.25);
          }

          22% {
            opacity: 0.6;
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%)
              scale(1.3);
          }
        }

        @keyframes rotarOrbitaUno {
          from {
            transform: rotate(-11deg);
          }

          to {
            transform: rotate(349deg);
          }
        }

        @keyframes rotarOrbitaDos {
          from {
            transform: rotate(383deg);
          }

          to {
            transform: rotate(23deg);
          }
        }

        @keyframes rotarOrbitaTres {
          from {
            transform: rotate(-31deg);
          }

          to {
            transform: rotate(329deg);
          }
        }

        @keyframes pulsoCama {
          0%,
          100% {
            opacity: 0.3;
            transform: scaleX(0.8);
          }

          50% {
            opacity: 0.9;
            transform: scaleX(1.08);
          }
        }

        @keyframes parpadearLuz {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes destellar {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.55);
          }

          45% {
            opacity: 1;
            transform: scale(1.35);
          }
        }

        @keyframes completarProgreso {
          0% {
            width: 0;
          }

          22% {
            width: 25%;
          }

          48% {
            width: 52%;
          }

          74% {
            width: 78%;
          }

          100% {
            width: 100%;
          }
        }

        @keyframes activarEtapa {
          to {
            opacity: 1;
            color: var(--text-main);
            transform: translateY(-2px);
          }
        }

        @keyframes escaneoGlobal {
          0% {
            top: -15%;
            opacity: 0;
          }

          12% {
            opacity: 0.8;
          }

          88% {
            opacity: 0.65;
          }

          100% {
            top: 105%;
            opacity: 0;
          }
        }

        @keyframes moverRejilla {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 0 54px;
          }
        }

        @keyframes moverEstrellas {
          from {
            background-position: 0 0;
          }

          to {
            background-position: 46px 46px;
          }
        }

        @keyframes respirarAurora {
          0%,
          100% {
            opacity: 0.48;
            transform: scale(0.88);
          }

          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }

        @keyframes flotarParticula {
          0%,
          100% {
            opacity: 0.08;
            transform: translateY(12px)
              scale(0.5);
          }

          45% {
            opacity: 0.85;
            transform: translateY(-17px)
              scale(1);
          }
        }

        @keyframes radarEstado {
          0% {
            opacity: 0.8;
            transform: scale(0.35);
          }

          100% {
            opacity: 0;
            transform: scale(1.4);
          }
        }

        @keyframes animarPunto {
          0%,
          60%,
          100% {
            opacity: 0.22;
            transform: translateY(0);
          }

          30% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }

        @media (max-width: 720px) {
          .kint-loader {
            min-height: 660px;
            padding-right: 12px;
            padding-left: 12px;
          }

          .cabecera-loader h2 {
            letter-spacing: 0.11em;
          }

          .cabecera-loader p {
            font-size: 10px;
          }

          .escena {
            height: 350px;
            transform: scale(0.88);
            transform-origin: center;
          }

          .mini-resena {
            display: none;
          }

          .orbita-uno {
            width: 360px;
          }

          .etapas {
            gap: 3px;
          }

          .nombre {
            font-size: 6px;
            letter-spacing: 0.08em;
          }

          .mensaje-inferior {
            font-size: 8px;
            letter-spacing: 0.17em;
          }
        }

        /*
 * MODO CLARO
 * Evita la capa gris que cubría toda
 * la animación de las reseñas.
 */
:global(html:not(.dark)) .kint-loader {
  background:
    radial-gradient(
      circle at 50% 44%,
      rgba(65, 175, 255, 0.17),
      transparent 38%
    ),
    linear-gradient(
      180deg,
      #ffffff 0%,
      #f5faff 54%,
      #edf7ff 100%
    );

  border-color:
    rgba(48, 146, 225, 0.15);
}

:global(html:not(.dark))
  .kint-loader::before {
);
}

:global(html:not(.dark))
  .kint-loader::before {
  opacity: 0.65;

  background:
    rgba(42, 153, 255, 0.11);
}

:global(html:not(.dark))
  .universo::before {
  opacity: 0.08;
}

:global(html:not(.dark))
  .vignette {
  box-shadow:
    inset 0 0 115px 24px
    rgba(22, 87, 148, 0.10);
}

:global(html:not(.dark))
  .aurora {
  opacity: 0.16;
}

:global(html:not(.dark))
  .cabecera-loader h2,
:global(html:not(.dark))
  .mensaje-inferior {
  color: #071a35;
}

:global(html:not(.dark))
  .cabecera-loader p,
:global(html:not(.dark))
  .nombre {
  color: #45627f;
}

:global(html:not(.dark))
  .estado-superior,
:global(html:not(.dark))
  .numero {
  color: #1479bd;
}

:global(html:not(.dark))
  .mini-resena {
  background:
    linear-gradient(
      145deg,
      rgba(244, 251, 255, 0.90),
      rgba(218, 239, 253, 0.86)
    );

  box-shadow:
    0 18px 45px
      rgba(16, 69, 112, 0.13),
    inset 0 1px
      rgba(255, 255, 255, 0.8);
}

        @media (prefers-reduced-motion: reduce) {
          .kint-loader *,
          .kint-loader::before,
          .kint-loader::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            animation-iteration-count: 1 !important;
          }

          .tarjeta-impresa {
            opacity: 1;
            transform: translateX(-50%)
              rotateX(5deg)
              scaleY(1);
          }

          .sello-verificado,
          .perfil,
          .estrellas span {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}