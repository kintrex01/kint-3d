"use client";

import Link from "next/link";
import { CalendarDays, Megaphone, X } from "lucide-react";

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
  /*
   * AVISO EMERGENTE: tarjeta oscura con brillo, ícono, título opcional
   * (el que escribe el dueño; vacío = sin título), el mensaje y la fecha.
   */
  if (!esGrande) {
    return (
      <div
        className="kint-aviso-fondo fixed inset-0 z-[9998] flex items-center justify-center bg-black/55 px-5 backdrop-blur-md"
        onClick={onCerrar}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={titulo || "Aviso de Kint 3D"}
          onClick={(evento) => evento.stopPropagation()}
          className="kint-aviso-tarjeta relative w-full max-w-md overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#0d1526_0%,#0a0f1c_55%,#140b14_100%)] text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
        >
          {/* Brillos de fondo y línea de color arriba */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-red-600/30 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div aria-hidden="true" className="h-1 w-full bg-[linear-gradient(90deg,#dc2626,#f97316_45%,#38bdf8)]" />

          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-slate-300 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white"
              aria-label="Cerrar aviso"
            >
              <X size={17} />
            </button>
          )}

          <div className="relative px-7 pb-7 pt-8 sm:px-9">
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444,#b91c1c)] shadow-[0_10px_28px_rgba(220,38,38,0.45)]">
                <span aria-hidden="true" className="kint-aviso-pulso absolute inset-0 rounded-2xl ring-2 ring-red-500/60" />
                <Megaphone size={22} className="-rotate-12" />
              </span>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-400">Kint 3D</p>
            </div>

            {titulo && (
              <h2 className="mt-6 text-2xl font-black leading-tight tracking-tight sm:text-[28px]">{titulo}</h2>
            )}

            <p className={`whitespace-pre-wrap text-[15px] leading-7 text-slate-200 ${titulo ? "mt-3" : "mt-6 text-base font-semibold leading-8 text-white"}`}>
              {mensaje}
            </p>

            {fecha && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2 text-sm font-bold text-slate-100 ring-1 ring-white/10">
                <CalendarDays size={15} className="text-sky-300" />
                <span className="text-slate-400">{etiquetaFecha}</span>
                {fecha}
              </p>
            )}

            {hrefBoton ? (
              <Link
                href={hrefBoton}
                className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444,#dc2626)] text-sm font-black text-white shadow-[0_12px_30px_rgba(220,38,38,0.35)] transition hover:brightness-110 active:scale-[0.98]"
              >
                {textoBoton}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onCerrar}
                className="mt-7 h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#ef4444,#dc2626)] text-sm font-black text-white shadow-[0_12px_30px_rgba(220,38,38,0.35)] transition hover:brightness-110 active:scale-[0.98]"
              >
                {textoBoton}
              </button>
            )}
          </div>
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