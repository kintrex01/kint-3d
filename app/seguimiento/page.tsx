"use client";

import Link from "next/link";
import { useState } from "react";

export default function Seguimiento() {
  const [pedido, setPedido] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState("");

  async function consultarPedido() {
    setError("");
    setResultado(null);

    if (!pedido.trim()) {
      setError("Ingresá tu número de pedido.");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        `/api/seguimiento?pedido=${encodeURIComponent(pedido)}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "No encontramos ese pedido.");
      }

      setResultado(data);
    } catch (error: any) {
      setError(error.message || "Error al consultar el pedido.");
    }

    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
      <div className="fixed left-8 top-8 z-50">
        <Link href="/">
          <button className="text-sm font-bold uppercase tracking-[0.3em] hover:text-red-600">
            ‹ Inicio
          </button>
        </Link>
      </div>

      <section className="mx-auto flex min-h-[75vh] max-w-3xl flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-black uppercase tracking-[0.25em] sm:text-6xl">
          Seguimiento
        </h1>

        <div className="my-8 h-[2px] w-20 bg-red-600" />

        <p className="mb-10 max-w-xl text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
          Ingresá tu número de pedido para consultar el estado actual.
        </p>

        <div className="w-full max-w-xl">
          <input
            value={pedido}
            onChange={(e) => setPedido(e.target.value.toUpperCase())}
            placeholder="Ej: KNT-0026"
            className="w-full border border-[var(--border-color)] bg-transparent px-6 py-5 text-center text-xl font-bold uppercase tracking-[0.25em] outline-none transition focus:border-red-600"
          />

          <button
            onClick={consultarPedido}
            disabled={cargando}
            className="mt-6 w-full border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600 disabled:opacity-50"
          >
            {cargando ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {error && (
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            {error}
          </p>
        )}

        {resultado && (
          <div className="mt-12 w-full max-w-xl border border-[var(--border-color)] p-8 text-left">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Número de pedido
            </p>
            <p className="mb-6 text-3xl font-black">{resultado.pedido}</p>

            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Estado
            </p>
            <p className="mb-6 text-2xl font-bold text-red-600">
              {resultado.estado || "Sin estado"}
            </p>

            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Precio
            </p>
            <p className="text-xl font-semibold">
              {resultado.precio || "Pendiente"}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}