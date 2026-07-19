"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ImagenAmpliableProps = {
  src: string;
  alt: string;
};

export default function ImagenAmpliable({
  src,
  alt,
}: ImagenAmpliableProps) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return;

    function cerrarConEscape(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        setAbierta(false);
      }
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener(
      "keydown",
      cerrarConEscape
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        cerrarConEscape
      );
    };
  }, [abierta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl"
        aria-label={`Ampliar imagen: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          className="max-h-[600px] w-full object-contain transition duration-300 group-hover:scale-[1.02]"
        />

        <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-[var(--border-color)] bg-[var(--page-bg)]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-main)] opacity-0 backdrop-blur transition group-hover:opacity-100">
          Presionar para ampliar
        </span>
      </button>

      {abierta && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            className="fixed right-4 top-4 z-[110] rounded-full border border-white/40 bg-black/60 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:border-red-500 hover:text-red-400 sm:right-8 sm:top-8"
            aria-label="Cerrar imagen ampliada"
          >
            ✕
          </button>

          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(evento) =>
              evento.stopPropagation()
            }
          >
            <Image
              src={src}
              alt={alt}
              width={2200}
              height={1600}
              className="max-h-[92vh] max-w-[96vw] object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}