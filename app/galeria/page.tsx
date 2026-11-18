import type { Metadata } from "next";
import Link from "next/link";
import GaleriaImpresos from "@/components/GaleriaImpresos";

export const metadata: Metadata = {
  title: "Galería de maquetas impresas",
  description:
    "Maquetas de arquitectura impresas en 3D por Kint 3D: escalas, colores y terminaciones reales para ver antes de pedir la tuya.",
};

export default function GaleriaPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-[var(--text-main)] sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute -right-40 top-[520px] h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-5xl pb-8 pt-16 text-center sm:pt-20">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-red-600">Galería</p>
        <h1 className="text-4xl font-black leading-tight sm:text-5xl">Todo lo que imprimimos</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
          Maquetas reales, tal cual salieron. Filtrá por escala o color para ver cómo queda la tuya: el espesor de los
          muros, los detalles chicos, cómo se ven los colores juntos.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl">
        <GaleriaImpresos />
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/cotizar"
            className="flex h-12 items-center justify-center rounded-2xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700"
          >
            Cotizar la mía
          </Link>
          <Link
            href="/tutorial"
            className="flex h-12 items-center justify-center rounded-2xl border border-[var(--border-color)] px-6 text-sm font-black transition hover:border-red-600"
          >
            Cómo preparar el archivo
          </Link>
        </div>
      </section>
    </main>
  );
}
