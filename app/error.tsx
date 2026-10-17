"use client";

import { useEffect } from "react";
import Link from "next/link";

/* Si algo falla al mostrar una página: un cartel con la marca y para reintentar. */
export default function ErrorPagina({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center text-[var(--text-main)]">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/15 text-3xl">🛠️</span>
      <h1 className="mt-5 text-3xl font-black">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Fue un error nuestro, no tuyo. Probá de nuevo; si sigue pasando, escribinos por WhatsApp.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex h-12 items-center rounded-2xl bg-red-600 px-6 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-red-500"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-2xl border border-[var(--border-color)] px-6 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5 hover:border-red-500"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
