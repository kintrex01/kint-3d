"use client";

import { useEffect, useState } from "react";

/*
 * Seguimiento (pedido «Recibido»): en qué puesto de la fila para cotizar está.
 * Los pedidos se cotizan por orden de llegada. Se actualiza cada 2 minutos.
 */
export default function FilaCotizar({ pedido, codigo }: { pedido: string; codigo: string }) {
  const [fila, setFila] = useState<{ puesto: number; total: number } | null>(null);

  useEffect(() => {
    if (!pedido || !codigo) return;
    let activo = true;
    const consultar = () =>
      fetch("/api/fila-cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido, codigo }),
      })
        .then((respuesta) => respuesta.json())
        .then((data) => {
          if (activo && data?.ok) setFila({ puesto: Number(data.puesto) || 0, total: Number(data.total) || 0 });
        })
        .catch(() => {});
    consultar();
    const reloj = window.setInterval(consultar, 120000);
    return () => {
      activo = false;
      window.clearInterval(reloj);
    };
  }, [pedido, codigo]);

  if (!fila || fila.puesto < 1) return null;
  const antes = fila.puesto - 1;
  // Hasta 12 puntitos: los de antes, el suyo (resaltado) y los de después.
  const puntos = Math.min(fila.total, 12);
  const suyo = Math.min(fila.puesto, puntos);

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border-color)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Fila para cotizar</p>
          <p className="mt-1 text-base font-bold leading-snug">
            {antes === 0 ? "Tu pedido es el próximo en cotizarse" : `Hay ${antes} ${antes === 1 ? "pedido" : "pedidos"} antes que el tuyo`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black leading-none tabular-nums">{fila.puesto}.º</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">de {fila.total}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: puntos }, (_, indice) => (
          <span
            key={indice}
            className={`h-2 flex-1 rounded-full ${
              indice + 1 === suyo ? "bg-red-600" : indice + 1 < suyo ? "bg-[var(--text-muted)]/45" : "bg-[var(--border-color)]"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        Cotizamos por orden de llegada. Cuando esté tu presupuesto te avisamos por correo y lo ves acá.
      </p>
    </div>
  );
}
