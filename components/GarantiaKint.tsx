import { ShieldCheck } from "lucide-react";

/*
 * Garantía de reimpresión: solo defectos de impresión (no "no me gustó"),
 * para no tener que rehacer piezas por gusto personal.
 */
export const TEXTO_GARANTIA =
  "Si tu pieza sale con un defecto de impresión, la reimprimimos sin costo.";

export default function GarantiaKint({ className = "" }: { className?: string }) {
  return (
    <p
      className={`inline-flex items-start gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm leading-5 text-[var(--text-main)] ${className}`}
    >
      <ShieldCheck size={18} className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>
        <strong>Garantía Kint:</strong> {TEXTO_GARANTIA}
      </span>
    </p>
  );
}
