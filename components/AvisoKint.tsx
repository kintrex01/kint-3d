"use client";

import Link from "next/link";
import { CalendarDays, Info, X } from "lucide-react";

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
   * AVISO EMERGENTE: tarjeta sobria (claro u oscuro según la página), un
   * ícono chico, el título opcional (vacío = sin título), el mensaje, la
   * fecha si hay y un botón. Se cierra tocando afuera, la X o el botón.
   */
  if (!esGrande) {
    const claseBoton =
      "mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--text-main)] text-sm font-semibold text-[var(--page-bg)] transition hover:opacity-90 active:scale-[0.99]";
    return (
      <div
        className="kint-aviso-fondo fixed inset-0 z-[9998] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-[2px] sm:items-center sm:pb-0"
        onClick={onCerrar}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={titulo || "Aviso de Kint 3D"}
          onClick={(evento) => evento.stopPropagation()}
          className="kint-aviso-tarjeta relative w-full max-w-[420px] rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-6 text-[var(--text-main)] shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--kint-panel-soft)] text-[var(--text-main)]">
                <Info size={16} />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] opacity-80">Aviso · Kint 3D</p>
            </div>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
                aria-label="Cerrar aviso"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {titulo && <h2 className="mt-5 text-xl font-semibold leading-snug tracking-tight">{titulo}</h2>}

          <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-muted)] ${titulo ? "mt-2" : "mt-5"}`}>{mensaje}</p>

          {fecha && (
            <p className="mt-4 flex items-center gap-2 border-t border-[var(--kint-panel-border)] pt-4 text-sm">
              <CalendarDays size={15} className="shrink-0 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">{etiquetaFecha}:</span>
              <span className="font-semibold">{fecha}</span>
            </p>
          )}

          {hrefBoton ? (
            <Link href={hrefBoton} className={claseBoton}>
              {textoBoton}
            </Link>
          ) : (
            <button type="button" onClick={onCerrar} className={claseBoton}>
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