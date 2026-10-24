"use client";

/*
 * Visor 3D: barra de "Ver cómo se imprime" (lib/visor-efectos). Botón para
 * empezar y, mientras simula, reproducir/pausar, una barra para ir capa por
 * capa y el contador de capas y tiempo.
 */

export type EstadoSimulacion = {
  fraccion: number;
  pausa: boolean;
  capas: number;
  horas: number;
  gramos: number;
  altoMm: number;
};

function tiempo(horas: number) {
  const minutos = Math.max(0, Math.round(horas * 60));
  const h = Math.floor(minutos / 60), m = minutos % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

export default function SimuladorImpresion({
  estado,
  onEmpezar,
  onReproducir,
  onPausar,
  onFijar,
  onCerrar,
}: {
  estado: EstadoSimulacion | null;
  onEmpezar: () => void;
  onReproducir: () => void;
  onPausar: () => void;
  onFijar: (fraccion: number) => void;
  onCerrar: () => void;
}) {
  if (!estado) {
    return (
      <button
        type="button"
        onClick={onEmpezar}
        className="group absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 py-2.5 pl-2.5 pr-5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-8px_rgba(234,88,12,0.7)] transition hover:scale-[1.03] hover:shadow-[0_14px_36px_-8px_rgba(234,88,12,0.85)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[12px] transition group-hover:bg-white/30">▶</span>
        Ver cómo se imprime
      </button>
    );
  }

  const capa = Math.max(1, Math.round(estado.capas * estado.fraccion));
  const terminado = estado.fraccion >= 1;
  return (
    <div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-xl rounded-2xl border border-orange-500/40 bg-[var(--page-bg)]/92 p-3 shadow-[0_16px_40px_-12px_rgba(234,88,12,0.45)] backdrop-blur sm:p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={estado.pausa ? onReproducir : onPausar}
          aria-label={estado.pausa ? "Reproducir" : "Pausar"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-sm font-black text-white shadow-md transition hover:scale-105"
        >
          {estado.pausa ? (terminado ? "↻" : "▶") : "❚❚"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.1em]">
              {terminado ? "¡Listo! Así queda impreso" : `Capa ${capa.toLocaleString("es-UY")} de ${estado.capas.toLocaleString("es-UY")}`}
            </p>
            <p className="shrink-0 text-[11px] font-bold tabular-nums text-orange-600">{Math.round(estado.fraccion * 100)}%</p>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(estado.fraccion * 1000)}
            onChange={(e) => onFijar(Number(e.target.value) / 1000)}
            aria-label="Ir a una capa"
            className="mt-1.5 w-full accent-orange-600"
          />
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {(estado.altoMm * estado.fraccion).toFixed(1)} de {estado.altoMm.toFixed(1)} mm · capas de 0,2 mm · aprox.{" "}
            {terminado ? tiempo(estado.horas) : `${tiempo(estado.horas * (1 - estado.fraccion))} restantes`} · ~{estado.gramos} g
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar simulación"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] text-sm transition hover:border-red-600 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
