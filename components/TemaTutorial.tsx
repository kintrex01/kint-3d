"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * Tema plegable del tutorial («para saber más»). Si se entra con un link a
 * algo de adentro (ej. /tutorial#espesores), se abre solo y baja hasta ahí.
 */
export default function TemaTutorial({
  id,
  icono,
  titulo,
  resumen,
  children,
}: {
  id: string;
  icono: string;
  titulo: string;
  resumen: string;
  children: ReactNode;
}) {
  const caja = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const destino = window.location.hash.slice(1);
    if (!destino || !caja.current) return;
    const elemento = document.getElementById(destino);
    if (destino === `tema-${id}` || (elemento && caja.current.contains(elemento))) {
      caja.current.open = true;
      window.setTimeout(() => (elemento ?? caja.current)?.scrollIntoView({ block: "start" }), 50);
    }
  }, [id]);

  return (
    <details
      ref={caja}
      id={`tema-${id}`}
      className="group scroll-mt-24 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:px-7">
        <span aria-hidden className="text-2xl">
          {icono}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black leading-6">{titulo}</span>
          <span className="block text-xs text-[var(--text-muted)]">{resumen}</span>
        </span>
        <span className="text-2xl font-light text-red-600 transition group-open:rotate-45">+</span>
      </summary>
      {/* Las secciones de adentro traen márgenes grandes para la página: acá se achican. */}
      <div className="flex flex-col gap-10 border-t border-[var(--border-color)] px-4 py-8 sm:px-7 [&>*]:!m-0 [&>*]:!max-w-none">
        {children}
      </div>
    </details>
  );
}
