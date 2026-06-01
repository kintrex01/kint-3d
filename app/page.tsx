import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-main)] transition">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-muted)]">
          Impresión 3D profesional
        </span>

        <h1 className="text-7xl font-bold tracking-tight">
          Kint 3D
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-[var(--text-muted)]">
          Maquetas arquitectónicas, prototipos y piezas personalizadas
          con impresión 3D de alta calidad.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/cotizar">
            <button className="rounded-2xl bg-black px-7 py-4 font-semibold text-white transition hover:scale-105">
              Cotizar impresión
            </button>
          </Link>

          <a
  href="https://www.instagram.com/kint.3d/"
  target="_blank"
  rel="noopener noreferrer"
>
  <button className="rounded-2xl border border-[var(--border-color)] px-7 py-4 transition hover:scale-105">
    Ver trabajos realizados
  </button>
</a>
        </div>
      </section>
    </main>
  );
}