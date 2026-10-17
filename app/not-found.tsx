import Link from "next/link";

/* Página que no existe: con la marca y caminos para seguir. */
export default function NoEncontrada() {
  return (
    <main className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center text-[var(--text-main)]">
      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-500">Error 404</p>
      <h1 className="mt-3 bg-[linear-gradient(90deg,#93c5fd,#c4b5fd_55%,#fca5a5)] bg-clip-text text-7xl font-black leading-none text-transparent sm:text-8xl">
        Ups
      </h1>
      <p className="mt-5 max-w-md text-lg font-bold">Esta página no existe (o se nos cayó de la impresora).</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Revisá el enlace o seguí por acá:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-2xl bg-red-600 px-6 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-red-500"
        >
          Ir al inicio
        </Link>
        <Link
          href="/cotizar"
          className="inline-flex h-12 items-center rounded-2xl border border-[var(--border-color)] px-6 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5 hover:border-red-500"
        >
          Cotizar
        </Link>
        <Link
          href="/tienda"
          className="inline-flex h-12 items-center rounded-2xl border border-[var(--border-color)] px-6 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5 hover:border-red-500"
        >
          Tienda
        </Link>
      </div>
    </main>
  );
}
