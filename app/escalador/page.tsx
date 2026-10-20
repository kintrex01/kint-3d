"use client";

import ThemeToggle from "../../components/ThemeToggle";
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

        <Escalador />
      </div>
    </main>
  );
}
