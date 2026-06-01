import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-main)] transition">
      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          

          <h1 className="text-7xl font-black tracking-[0.15em] sm:text-8xl">
            KINT
            </h1>

          <p className="mt-2 text-4xl font-light tracking-[0.35em] text-[var(--text-muted)]">
            3D
          </p>
        </div>

        <div className="mb-8 h-[2px] w-20 bg-red-600" />

        <p className="max-w-2xl text-sm font-medium uppercase leading-8 tracking-[0.35em] text-[var(--text-main)] sm:text-base">
          Impresión 3D para arquitectura, prototipado y diseño.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link href="/cotizar">
            <button className="min-w-64 border border-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-red-600 transition hover:bg-red-600 hover:text-white">
              Cotizar ahora
            </button>
          </Link>

          <a
            href="https://www.instagram.com/kint.3d/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="min-w-64 border border-[var(--border-color)] px-10 py-5 text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-main)] transition hover:border-red-600 hover:text-red-600">
              Ver trabajos
            </button>
          </a>
        </div>

        <div className="mt-20 flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <div className="h-9 w-5 rounded-full border border-[var(--border-color)]" />
          <span className="text-xl leading-none">⌄</span>
        </div>
      </section>

      <section className="border-t border-[var(--border-color)] px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Nuestros servicios
          </p>

          <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

          <div className="grid gap-12 md:grid-cols-3">
            <div className="px-8">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Arquitectura
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Maquetas y modelos arquitectónicos con máximo detalle.
              </p>
            </div>

            <div className="px-8 md:border-x md:border-[var(--border-color)]">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Prototipado
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Prototipos funcionales para validar ideas y proyectos.
              </p>
            </div>

            <div className="px-8">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Personalizados
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Piezas y proyectos a medida según tus necesidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Cómo trabajamos
          </p>

          <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

          <div className="grid gap-12 md:grid-cols-4">
            {[
              ["01", "Enviás tu archivo", "Subí tu archivo 3D y contanos tu idea."],
              ["02", "Presupuestamos", "Analizamos tu proyecto y enviamos un presupuesto."],
              ["03", "Imprimimos", "Una vez aprobado, comenzamos la impresión."],
              ["04", "Entregamos", "Te entregamos el modelo donde lo necesites."],
            ].map(([numero, titulo, texto]) => (
              <div key={numero}>
                <p className="mb-3 text-4xl font-black text-red-600">
                  {numero}
                </p>
                <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.3em]">
                  {titulo}
                </h3>
                <p className="text-sm leading-7 text-[var(--text-muted)]">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <Link href="/cotizar">
              <button className="border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600">
                Iniciar cotización
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}