import type { Metadata } from "next";
import Link from "next/link";
import AgendaSemanal from "@/components/AgendaSemanal";

export const metadata: Metadata = {
  title: "Agenda",
  description:
    "Cuándo estoy en FADU para entregas en mano, cuándo respondo y cotizo, y hasta cuándo está ocupada la impresora de Kint 3D.",
};

export default function AgendaPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-[var(--text-main)] sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-[520px] h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-4xl pb-8 pt-16 text-center sm:pt-20">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-red-600">Agenda</p>
        <h1 className="text-4xl font-black leading-tight sm:text-5xl">¿Cuándo me encontrás?</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
          Los próximos días: cuándo estoy en FADU para entregar en mano, cuándo respondo y cotizo, y hasta cuándo
          está ocupada la impresora. Así elegís qué te conviene.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl">
        <AgendaSemanal />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/cotizar"
            className="flex h-12 items-center justify-center rounded-2xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700"
          >
            Cotizar una impresión
          </Link>
          <Link
            href="/seguimiento"
            className="flex h-12 items-center justify-center rounded-2xl border border-[var(--border-color)] px-6 text-sm font-black transition hover:border-red-600"
          >
            Consultar mi pedido
          </Link>
        </div>
      </section>
    </main>
  );
}
