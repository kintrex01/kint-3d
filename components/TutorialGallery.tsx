"use client";

import { useEffect, useState } from "react";

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
  const [ampliada, setAmpliada] = useState(false);

  const imagenes = images.filter((imagen) => imagen.src);
  const imagenActual = imagenes[indice] || imagenes[0];
  const hayVarias = imagenes.length > 1;

  function anterior() {
    setIndice((actual) =>
      actual === 0 ? imagenes.length - 1 : actual - 1
    );
  }

  function siguiente() {
    setIndice((actual) =>
      actual === imagenes.length - 1 ? 0 : actual + 1
    );
  }

  useEffect(() => {
    if (!ampliada) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAmpliada(false);
      if (evento.key === "ArrowLeft" && hayVarias) anterior();
      if (evento.key === "ArrowRight" && hayVarias) siguiente();
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", manejarTeclado);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", manejarTeclado);
    };
  }, [ampliada, hayVarias, imagenes.length]);

  if (!imagenActual) return null;

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

          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/25 bg-black/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
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
          <div className="mt-4 flex justify-center gap-2" aria-label="Elegir imagen">
            {imagenes.map((imagen, posicion) => (
              <button
                key={`${imagen.src}-${posicion}`}
                type="button"
                onClick={() => setIndice(posicion)}
                className={[
                  "h-2.5 rounded-full transition-all",
                  posicion === indice
                    ? "w-7 bg-red-600"
                    : "w-2.5 bg-[var(--border-color)] hover:bg-red-600/60",
                ].join(" ")}
                aria-label={`Ver imagen ${posicion + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {ampliada && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada: ${imagenActual.alt}`}
          onClick={() => setAmpliada(false)}
        >
          <button
            type="button"
            onClick={() => setAmpliada(false)}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/60 text-2xl text-white transition hover:bg-white hover:text-black sm:right-6 sm:top-6"
            aria-label="Cerrar imagen"
          >
            ×
          </button>

          {hayVarias && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                anterior();
              }}
              className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-3xl text-white transition hover:bg-white hover:text-black sm:left-6"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
          )}

          <div
            className="flex max-h-[94vh] max-w-[94vw] flex-col items-center"
            onClick={(evento) => evento.stopPropagation()}
          >
            <img
              src={imagenActual.src}
              alt={imagenActual.alt}
              className="max-h-[84vh] max-w-[94vw] object-contain"
            />

            <div className="mt-4 max-w-3xl text-center text-sm leading-6 text-white/80">
              {imagenActual.caption || imagenActual.alt}
            </div>

            {hayVarias && (
              <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white/60">
                {indice + 1} / {imagenes.length}
              </div>
            )}
          </div>

          {hayVarias && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                siguiente();
              }}
              className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-3xl text-white transition hover:bg-white hover:text-black sm:right-6"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}