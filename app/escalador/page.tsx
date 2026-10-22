"use client";

import ThemeToggle from "../../components/ThemeToggle";
import Link from "next/link";
import Escalador from "@/components/Escalador";

export default function EscaladorPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-10 text-[var(--text-main)] transition-colors duration-300">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex justify-end">
          <ThemeToggle />
        </header>

        <section className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
            Herramienta de escala
          </p>

          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] sm:text-4xl">
            Escalador 3D
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Convertí medidas reales a medidas de
            impresión y comprobá el tamaño correcto
            de tu modelo antes de exportarlo.
          </p>
        </section>

        {/* Con el archivo en mano: se escala solo en /preparador-3d. */}
        <Link
          href="/preparador-3d"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-soft)] transition hover:border-red-600"
        >
          <span className="text-2xl" aria-hidden>📦</span>
          <span className="min-w-0 flex-1">
            <span className="block font-black">¿Ya tenés tu archivo STL? Subilo y te lo escalamos</span>
            <span className="block text-xs leading-5 text-[var(--text-muted)]">
              Elegís la escala (ej. 1:100) y te descargás el archivo listo. ¿Tenés un SKP? Te explicamos cómo pasarlo a STL.
            </span>
          </span>
          <span className="text-xl text-red-600" aria-hidden>→</span>
        </Link>

        <Escalador />
      </div>
    </main>
  );
}
