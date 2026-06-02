"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";

function ResenaContent() {
  const searchParams = useSearchParams();
  const pedido = searchParams.get("pedido") || "";

  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [mostrarProyecto, setMostrarProyecto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviarResena() {
    setError("");

    if (!pedido) {
      setError("Falta el número de pedido.");
      return;
    }

    if (!comentario.trim()) {
      setError("Escribí un comentario.");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/resenas", {
        method: "POST",
        body: JSON.stringify({
          pedido,
          estrellas,
          comentario,
          mostrarProyecto,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo enviar la reseña.");
      }

      setEnviado(true);
    } catch (error: any) {
      setError(error.message || "Error al enviar la reseña.");
    }

    setEnviando(false);
  }

  

  if (enviado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
        <section className="max-w-xl text-center">
          <h1 className="text-4xl font-black uppercase tracking-[0.25em]">
            Gracias
          </h1>

          <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

          <p className="text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
            Tu reseña fue enviada correctamente.
          </p>

          <Link href="/">
            <button className="mt-10 border border-red-600 px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white">
              Volver al inicio
            </button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)]">
      <section className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
          Kint 3D
        </p>

        <h1 className="text-4xl font-black uppercase tracking-[0.25em] sm:text-5xl">
          Tu experiencia
        </h1>

        <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

        <p className="mb-10 text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
          Reseña para el pedido
        </p>

        <p className="mb-12 text-3xl font-black text-red-600">
          {pedido || "Sin pedido"}
        </p>

        <div className="mb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Calificación
          </p>

          <div className="flex justify-center gap-2 text-4xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setEstrellas(n)}
                className={n <= estrellas ? "text-red-600" : "text-[var(--text-muted)]"}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Escribí tu reseña..."
          className="min-h-40 w-full border border-[var(--border-color)] bg-transparent p-5 text-sm outline-none transition focus:border-red-600"
        />

        <label className="mt-6 flex cursor-pointer items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={mostrarProyecto}
            onChange={(e) => setMostrarProyecto(e.target.checked)}
          />
          Acepto que mi proyecto pueda aparecer en la galería de Kint.
        </label>

        {error && (
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={enviarResena}
          disabled={enviando}
          className="mt-10 w-full border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar reseña"}
        </button>
      </section>
    </main>
  );
}
export default function ResenaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResenaContent />
    </Suspense>
  );
}