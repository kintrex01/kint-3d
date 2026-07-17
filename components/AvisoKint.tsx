"use client";

import Link from "next/link";

type AvisoKintProps = {
  titulo?: string;
  mensaje: string;
  fecha?: string;
  etiquetaFecha?: string;
  tamano?: "compacto" | "grande";

  textoBoton?: string;
  hrefBoton?: string;
  onCerrar?: () => void;

  textoBotonSecundario?: string;
  hrefBotonSecundario?: string;
};

export default function AvisoKint({
  titulo = "Aviso importante",
  mensaje,
  fecha,
  etiquetaFecha = "Reapertura",
  tamano = "compacto",

  textoBoton = "Entendido",
  hrefBoton,
  onCerrar,

  textoBotonSecundario,
  hrefBotonSecundario,
}: AvisoKintProps) {
  const esGrande = tamano === "grande";

  /*
   * AVISO COMPACTO
   * Copia exacta del diseño original.
   */
  if (!esGrande) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
        <section className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950 p-8 text-center text-white shadow-2xl">
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="absolute right-5 top-4 text-3xl leading-none text-slate-400 transition hover:text-white"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          )}

          <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
            Kint 3D
          </p>

          <h2 className="mt-5 text-2xl font-black uppercase tracking-[0.14em]">
            {titulo}
          </h2>

          <p className="mt-7 whitespace-pre-wrap text-sm leading-7 text-slate-300">
  {mensaje}
</p>

          {fecha && (
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em]">
  {etiquetaFecha}: {fecha}
</p>
          )}

          {hrefBoton ? (
            <Link
              href={hrefBoton}
              className="mt-9 flex w-full items-center justify-center rounded-xl border border-red-600 bg-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-transparent"
            >
              {textoBoton}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="mt-9 w-full rounded-xl border border-red-600 bg-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-transparent"
            >
              {textoBoton}
            </button>
          )}
        </section>
      </div>
    );
  }

  /*
 * AVISO GRANDE
 * Pantalla de estado para servicios pausados.
 */
return (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#02050a]/95 px-5 py-8 backdrop-blur-md">
    <section className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 text-white shadow-2xl">
      <div className="h-1 w-full bg-red-600" />

      <div className="px-7 py-12 text-center sm:px-16 sm:py-16">
        <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />

          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-400">
            Estado del servicio
          </span>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.45em] text-red-500">
          Kint 3D
        </p>

        <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-black uppercase leading-tight tracking-[0.12em] sm:text-5xl">
          {titulo}
        </h1>

        <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

        <p className="mx-auto max-w-2xl whitespace-pre-wrap text-base leading-8 text-slate-300 sm:text-lg">
          {mensaje}
        </p>

        {fecha && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              {etiquetaFecha}
            </p>

            <p className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-white sm:text-base">
              {fecha}
            </p>
          </div>
        )}

        <div
          className={`mx-auto mt-10 flex w-full max-w-2xl flex-col gap-4 ${
            textoBotonSecundario &&
            hrefBotonSecundario
              ? "sm:flex-row"
              : ""
          }`}
        >
          {hrefBoton ? (
            <Link
              href={hrefBoton}
              className="flex min-h-[62px] flex-1 items-center justify-center rounded-xl border border-red-600 bg-red-600 px-7 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-transparent"
            >
              {textoBoton}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="min-h-[62px] flex-1 rounded-xl border border-red-600 bg-red-600 px-7 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-transparent"
            >
              {textoBoton}
            </button>
          )}

          {textoBotonSecundario &&
            hrefBotonSecundario && (
              <Link
                href={hrefBotonSecundario}
                className="flex min-h-[62px] flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/[0.03] px-7 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:border-white hover:bg-white/[0.07]"
              >
                {textoBotonSecundario}
              </Link>
            )}
        </div>

        <p className="mt-8 text-xs leading-6 text-slate-500">
          Los pedidos existentes y su seguimiento continúan funcionando normalmente.
        </p>
      </div>
    </section>
  </div>
);
}