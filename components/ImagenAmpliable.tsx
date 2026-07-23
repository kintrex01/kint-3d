"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

type ImagenAmpliableProps = {
  src: string;
  alt: string;
};

export default function ImagenAmpliable({
  src,
  alt,
}: ImagenAmpliableProps) {
  const [abierta, setAbierta] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierta) {
      return;
    }

    const overflowBodyAnterior =
      document.body.style.overflow;

    const overflowHtmlAnterior =
      document.documentElement.style.overflow;

    function cerrarConEscape(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        setAbierta(false);
      }
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      cerrarConEscape
    );

    return () => {
      document.body.style.overflow =
        overflowBodyAnterior;

      document.documentElement.style.overflow =
        overflowHtmlAnterior;

      window.removeEventListener(
        "keydown",
        cerrarConEscape
      );
    };
  }, [abierta]);

  function abrirImagen() {
    setAbierta(true);
  }

  function cerrarImagen() {
    setAbierta(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirImagen}
        className="group relative flex w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl bg-black/10"
        aria-label={`Ampliar imagen: ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-auto max-h-[520px] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
        />

        <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          <ZoomIn size={15} />
          Ampliar
        </span>
      </button>

      {montado &&
        abierta &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada: ${alt}`}
            onClick={cerrarImagen}
          >
            {/* Botón siempre visible en PC y celular */}
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                cerrarImagen();
              }}
              className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-[10001] flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-black/80 text-white shadow-2xl backdrop-blur transition active:scale-95 sm:hover:bg-white sm:hover:text-black"
              aria-label="Cerrar imagen"
            >
              <X size={27} strokeWidth={2} />
            </button>

            {/* Contenedor adaptable a la altura real del celular */}
            <div
              className="flex h-[100dvh] w-full items-center justify-center overflow-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(4.75rem,calc(env(safe-area-inset-top)+4.75rem))] sm:px-6"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="max-h-[calc(100dvh-6rem)] max-w-[96vw] touch-pinch-zoom select-none object-contain sm:max-h-[90vh] sm:max-w-[92vw]"
              />
            </div>

            {/* Cerrar tocando el fondo inferior */}
            <button
              type="button"
              onClick={cerrarImagen}
              className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-[10001] -translate-x-1/2 rounded-full border border-white/30 bg-black/80 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur sm:hidden"
            >
              Cerrar
            </button>
          </div>,
          document.body
        )}
    </>
  );
}