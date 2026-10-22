"use client";

import { estimarPrecio } from "@/lib/precio-estimado";

/*
 * Cotizar: precio aproximado apenas el cliente sube un STL.
 * Rango en grande y, abajo, medidas a escala, material y tiempo, para que
 * el cliente vea de un vistazo si eligió bien la escala.
 */

type Medidas = { mm3: number; mm2: number; medidas: number[] };

function centimetros(mm: number) {
  const cm = mm / 10;
  return cm.toLocaleString("es-UY", { maximumFractionDigits: cm < 10 ? 1 : 0 });
}

function textoHoras(horas: number) {
  const minutos = Math.max(15, Math.round((horas * 60) / 15) * 15);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const claseCaja = "mt-3 rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 text-sm leading-6";

export default function TarjetaPrecioEstimado({
  medidas,
  midiendo,
  haySkp,
  escala,
}: {
  medidas: Medidas[] | null;
  midiendo: boolean;
  haySkp: boolean;
  escala: number;
}) {
  if (midiendo) {
    return (
      <p className={`${claseCaja} animate-pulse text-[var(--text-muted)]`}>Calculando el precio estimado…</p>
    );
  }

  if (!medidas) {
    return haySkp ? (
      <p className={`${claseCaja} text-[var(--text-muted)]`}>
        Con archivos SKP no podemos calcular el precio al instante: te lo mandamos en el presupuesto.
      </p>
    ) : null;
  }

  const estimacion = estimarPrecio(medidas, escala);

  if (estimacion.tipo === "elegiEscala") {
    return (
      <p className={claseCaja}>
        <strong>💡 Tu modelo está en tamaño real.</strong> Elegí la escala (más abajo) y te mostramos acá cuánto
        saldría aproximadamente.
      </p>
    );
  }
  if (estimacion.tipo === "muyGrande") {
    return (
      <p className={claseCaja}>
        <strong>Tu modelo es grande</strong> (más que la impresora): lo revisamos y te mandamos el presupuesto, por
        ejemplo dividiéndolo en partes.
      </p>
    );
  }
  if (estimacion.tipo !== "precio") return null;

  const [ancho, largo, alto] = estimacion.medidas;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-sky-400/40 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(37,99,235,0.06))]">
      <div className="p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
          Precio estimado
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[var(--text-main)]">
          ${estimacion.desde.toLocaleString("es-UY")} a ${estimacion.hasta.toLocaleString("es-UY")}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-[var(--card-bg)] px-2.5 py-1 text-[var(--text-main)] ring-1 ring-sky-400/30">
            📏 {centimetros(ancho)} × {centimetros(largo)} × {centimetros(alto)} cm
            {escala > 1 && Math.max(...medidas.map((pieza) => Math.max(...pieza.medidas))) > 250 ? ` (a 1:${escala})` : ""}
          </span>
          <span className="rounded-full bg-[var(--card-bg)] px-2.5 py-1 text-[var(--text-main)] ring-1 ring-sky-400/30">
            🧵 ~{estimacion.gramos} g de material
          </span>
          <span className="rounded-full bg-[var(--card-bg)] px-2.5 py-1 text-[var(--text-main)] ring-1 ring-sky-400/30">
            ⏱ ~{textoHoras(estimacion.horas)} de impresión
          </span>
        </div>
      </div>

      <p className="border-t border-sky-400/20 px-4 py-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
        Calculado al instante con tu archivo{haySkp ? " (sin contar los SKP)" : ""}. El precio final te lo
        mandamos en el presupuesto: puede variar por el detalle, los colores, el armado o la urgencia.
        {" "}¿Las medidas no son las que esperabas? Revisá la escala.
      </p>
    </div>
  );
}
