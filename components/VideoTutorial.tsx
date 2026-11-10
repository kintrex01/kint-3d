"use client";

import { useState } from "react";

/*
 * Video de YouTube liviano: muestra la miniatura y recién al tocar play
 * carga el reproductor (youtube-nocookie), así el tutorial no se pone lento.
 */
export default function VideoTutorial({
  id,
  titulo,
  canal,
  descripcion,
}: {
  id: string;
  titulo: string;
  canal: string;
  descripcion?: string;
}) {
  const [reproduciendo, setReproduciendo] = useState(false);

  return (
    <figure className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
      <div className="relative aspect-video bg-black">
        {reproduciendo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproduciendo(true)}
            aria-label={`Ver el video: ${titulo}`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
            />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-xl transition group-hover:scale-110">
              ▶
            </span>
          </button>
        )}
      </div>
      <figcaption className="p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">🎬 Video · {canal}</p>
        <p className="mt-2 font-black leading-6">{titulo}</p>
        {descripcion && <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{descripcion}</p>}
      </figcaption>
    </figure>
  );
}
