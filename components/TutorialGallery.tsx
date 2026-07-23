"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type TutorialImage = {
  src: string;
  alt: string;
  caption?: string;
};

type TutorialGalleryProps = {
  images: TutorialImage[];
  imageClassName?: string;
  className?: string;
};

export default function TutorialGallery({
  images,
  imageClassName = "w-full object-contain",
  className = "",
}: TutorialGalleryProps) {
  const [indice, setIndice] = useState(0);
  const [ampliada, setAmpliada] =
    useState(false);
  const [montado, setMontado] =
    useState(false);

  const imagenes = images.filter(
    (imagen) => imagen.src
  );

  const imagenActual =
    imagenes[indice] || imagenes[0];

  const hayVarias = imagenes.length > 1;

  useEffect(() => {
    setMontado(true);
  }, []);

  function anterior() {
    setIndice((actual) =>
      actual === 0
        ? imagenes.length - 1
        : actual - 1
    );
  }

  function siguiente() {
    setIndice((actual) =>
      actual === imagenes.length - 1
        ? 0
        : actual + 1
    );
  }

  function cerrarImagen() {
    setAmpliada(false);
  }

  useEffect(() => {
    if (!ampliada) {
      return;
    }

    const overflowBodyAnterior =
      document.body.style.overflow;

    const overflowHtmlAnterior =
      document.documentElement.style.overflow;

    function manejarTeclado(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        setAmpliada(false);
      }

      if (
        evento.key === "ArrowLeft" &&
        hayVarias
      ) {
        setIndice((actual) =>
          actual === 0
            ? imagenes.length - 1
            : actual - 1
        );
      }

      if (
        evento.key === "ArrowRight" &&
        hayVarias
      ) {
        setIndice((actual) =>
          actual === imagenes.length - 1
            ? 0
            : actual + 1
        );
      }
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      manejarTeclado
    );

    return () => {
      document.body.style.overflow =
        overflowBodyAnterior;

      document.documentElement.style.overflow =
        overflowHtmlAnterior;

      window.removeEventListener(
        "keydown",
        manejarTeclado
      );
    };
  }, [
    ampliada,
    hayVarias,
    imagenes.length,
  ]);

  if (!imagenActual) {
    return null;
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          className="group relative block w-full cursor-zoom-in overflow-hidden"
          aria-label={`Ampliar imagen: ${imagenActual.alt}`}
        >
          <img
            src={imagenActual.src}
            alt={imagenActual.alt}
            className={`${imageClassName} transition duration-300 group-hover:scale-[1.015]`}
          />

          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/25 bg-black/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            Ampliar
          </span>
        </button>

        {hayVarias && (
          <>
            <button
              type="button"
              onClick={anterior}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/65 text-2xl text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
              aria-label="Imagen anterior"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={siguiente}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/65 text-2xl text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
              aria-label="Imagen siguiente"
            >
              ›
            </button>

            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              {indice + 1} / {imagenes.length}
            </span>
          </>
        )}

        {imagenActual.caption && (
          <p className="mt-4 text-center text-xs leading-6 text-[var(--text-muted)]">
            {imagenActual.caption}
          </p>
        )}

        {hayVarias && (
          <div
            className="mt-4 flex justify-center gap-2"
            aria-label="Elegir imagen"
          >
            {imagenes.map(
              (imagen, posicion) => (
                <button
                  key={`${imagen.src}-${posicion}`}
                  type="button"
                  onClick={() =>
                    setIndice(posicion)
                  }
                  className={[
                    "h-2.5 rounded-full transition-all",
                    posicion === indice
                      ? "w-7 bg-red-600"
                      : "w-2.5 bg-[var(--border-color)] hover:bg-red-600/60",
                  ].join(" ")}
                  aria-label={`Ver imagen ${
                    posicion + 1
                  }`}
                />
              )
            )}
          </div>
        )}
      </div>

      {montado &&
        ampliada &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada: ${imagenActual.alt}`}
            onClick={cerrarImagen}
          >
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                cerrarImagen();
              }}
              className="fixed z-[10001] flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/80 text-white shadow-2xl backdrop-blur transition active:scale-95 sm:hover:bg-white sm:hover:text-black"
              style={{
                top: "max(1rem, env(safe-area-inset-top))",
                right:
                  "max(1rem, env(safe-area-inset-right))",
              }}
              aria-label="Cerrar imagen"
            >
              <X
                size={27}
                strokeWidth={2}
              />
            </button>

            {hayVarias && (
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  anterior();
                }}
                className="fixed left-2 top-1/2 z-[10001] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/75 text-3xl text-white backdrop-blur transition active:scale-95 sm:left-6 sm:hover:bg-white sm:hover:text-black"
                aria-label="Imagen anterior"
              >
                ‹
              </button>
            )}

            <div
              className="flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-3 pb-24 pt-24 sm:px-6"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <img
                src={imagenActual.src}
                alt={imagenActual.alt}
                draggable={false}
                className="max-h-[calc(100dvh-12rem)] max-w-[96vw] touch-pinch-zoom select-none object-contain sm:max-h-[82vh] sm:max-w-[92vw]"
              />

              {imagenActual.caption && (
                <p className="mt-4 max-w-3xl px-4 text-center text-xs leading-6 text-white/80 sm:text-sm">
                  {imagenActual.caption}
                </p>
              )}

              {hayVarias && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                  {indice + 1} /{" "}
                  {imagenes.length}
                </p>
              )}
            </div>

            {hayVarias && (
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  siguiente();
                }}
                className="fixed right-2 top-1/2 z-[10001] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/75 text-3xl text-white backdrop-blur transition active:scale-95 sm:right-6 sm:hover:bg-white sm:hover:text-black"
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            )}

            <button
              type="button"
              onClick={cerrarImagen}
              className="fixed bottom-4 left-1/2 z-[10001] -translate-x-1/2 rounded-full border border-white/30 bg-black/80 px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur sm:hidden"
              style={{
                bottom:
                  "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              Cerrar
            </button>
          </div>,
          document.body
        )}
    </>
  );
}