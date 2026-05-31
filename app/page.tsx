import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* HERO */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600">
          Impresión 3D profesional
        </span>

        <h1 className="text-7xl font-bold tracking-tight">
          Kint 3D
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-zinc-600">
          Maquetas arquitectónicas, prototipos y piezas personalizadas
          con impresión 3D de alta calidad.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/cotizar">
            <button className="rounded-2xl bg-black px-7 py-4 text-white font-semibold transition hover:scale-105">
              Cotizar impresión
            </button>
          </Link>

          <button className="rounded-2xl border border-zinc-300 px-7 py-4 transition hover:bg-zinc-100">
            Ver proyectos
          </button>
        </div>
      </section>
    </main>
  );
}