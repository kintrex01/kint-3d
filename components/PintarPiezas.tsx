"use client";

/*
 * Visor 3D: el balde de pintura. Se elige un color y cada pieza que se toca
 * en el visor se pinta. Se descarga en un OBJ con colores, que Bambu Studio
 * abre ya pintado (cada color se asigna a un filamento).
 */

export const COLORES_PINTURA = [
  { nombre: "Blanco", valor: "#f5f5f4" },
  { nombre: "Gris", valor: "#9ca3af" },
  { nombre: "Negro", valor: "#1f2937" },
  { nombre: "Madera", valor: "#c08552" },
  { nombre: "Rojo", valor: "#dc2626" },
  { nombre: "Naranja", valor: "#f97316" },
  { nombre: "Amarillo", valor: "#facc15" },
  { nombre: "Verde", valor: "#16a34a" },
  { nombre: "Celeste", valor: "#38bdf8" },
  { nombre: "Azul", valor: "#2563eb" },
] as const;

export default function PintarPiezas({
  activo,
  color,
  pintado,
  onActivar,
  onColor,
  onBorrar,
  onDescargar,
}: {
  activo: boolean;
  color: string;
  pintado: boolean;
  onActivar: (activo: boolean) => void;
  onColor: (color: string) => void;
  onBorrar: () => void;
  onDescargar: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] leading-5 text-[var(--text-muted)]">
        Elegí un color y tocá las piezas en el visor. Lo mandamos pintado y la impresora usa esos colores.
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {COLORES_PINTURA.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            title={opcion.nombre}
            aria-pressed={color === opcion.valor}
            onClick={() => {
              onColor(opcion.valor);
              onActivar(true);
            }}
            className={`flex h-10 items-center justify-center rounded-lg border transition ${
              color === opcion.valor && activo ? "border-red-600 ring-2 ring-red-600/30" : "border-[var(--border-color)] hover:border-red-600"
            }`}
          >
            <span className="h-5 w-5 rounded-full border border-black/15 shadow-sm" style={{ background: opcion.valor }} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onActivar(!activo)}
        className={`mt-3 w-full rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] transition ${
          activo ? "bg-red-600 text-white" : "border border-[var(--border-color)] hover:border-red-600"
        }`}
      >
        {activo ? "🪣 Pintando: tocá las piezas (tocá acá para terminar)" : "🪣 Pintar piezas"}
      </button>
      {pintado && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onDescargar}
            className="rounded-lg bg-emerald-600 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-700"
          >
            Descargar pintado
          </button>
          <button
            type="button"
            onClick={onBorrar}
            className="rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition hover:border-red-600"
          >
            Borrar colores
          </button>
        </div>
      )}
    </div>
  );
}
