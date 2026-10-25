"use client";

/*
 * Seguimiento: los 7 pasos del pedido, cada uno con su color (los mismos del
 * panel y de los correos). Lo hecho queda pintado y unido con un degradé; el
 * paso actual se destaca con un halo.
 */

export const ETAPAS_PEDIDO = [
  { estado: "Recibido", corto: "Recibido", color: "#64748b" },
  { estado: "Presupuestado", corto: "Presupuesto", color: "#8b5cf6" },
  { estado: "Método de pago seleccionado", corto: "Elige pago", color: "#eab308" },
  { estado: "Pago confirmado", corto: "Pagado", color: "#0ea5e9" },
  { estado: "En impresión", corto: "Imprimiendo", color: "#f97316" },
  { estado: "Terminado", corto: "Terminado", color: "#84cc16" },
  { estado: "Entregado", corto: "Entregado", color: "#10b981" },
] as const;

export function colorEtapa(estado: string) {
  return ETAPAS_PEDIDO.find((etapa) => etapa.estado === estado)?.color || "#64748b";
}

export default function PasosPedido({ estado }: { estado: string }) {
  const actual = ETAPAS_PEDIDO.findIndex((etapa) => etapa.estado === estado);
  const color = colorEtapa(estado);

  return (
    <>
      {/* Escritorio: en fila */}
      <div className="hidden w-full pb-2 sm:block">
        <div className="grid grid-cols-7 items-start">
          {ETAPAS_PEDIDO.map((etapa, indice) => {
            const hecho = actual >= 0 && indice < actual;
            const esActual = indice === actual;
            const pintado = hecho || esActual;
            const anterior = ETAPAS_PEDIDO[indice - 1];
            return (
              <div key={etapa.estado} className="flex min-w-0 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className="h-[4px] flex-1 rounded-full"
                    style={{
                      background:
                        indice === 0
                          ? "transparent"
                          : pintado
                            ? `linear-gradient(90deg, ${anterior.color}, ${etapa.color})`
                            : "var(--border-color)",
                    }}
                  />
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${esActual ? "h-10 w-10" : "h-8 w-8"}`}
                    style={
                      pintado
                        ? {
                            background: etapa.color,
                            color: "#ffffff",
                            boxShadow: esActual ? `0 0 0 6px ${etapa.color}33, 0 6px 18px ${etapa.color}66` : undefined,
                          }
                        : { border: "1px solid var(--border-color)", color: "var(--text-muted)" }
                    }
                  >
                    {hecho || (esActual && indice === ETAPAS_PEDIDO.length - 1) ? "✓" : indice + 1}
                  </div>
                  <div
                    className="h-[4px] flex-1 rounded-full"
                    style={{
                      background:
                        indice === ETAPAS_PEDIDO.length - 1
                          ? "transparent"
                          : hecho
                            ? `linear-gradient(90deg, ${etapa.color}, ${ETAPAS_PEDIDO[indice + 1].color})`
                            : "var(--border-color)",
                    }}
                  />
                </div>
                <p
                  className={`mt-3 text-center text-[11px] leading-4 ${esActual ? "font-black" : "font-bold"}`}
                  style={{ color: esActual ? etapa.color : hecho ? "var(--text-main)" : "var(--text-muted)" }}
                >
                  {etapa.corto}
                </p>
                {esActual && (
                  <span className="mt-1 text-[8px] font-black uppercase tracking-[0.16em]" style={{ color: etapa.color }}>
                    Ahora
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: en lista */}
      <div className="space-y-2 sm:hidden">
        {ETAPAS_PEDIDO.map((etapa, indice) => {
          const hecho = actual >= 0 && indice < actual;
          const esActual = indice === actual;
          const pintado = hecho || esActual;
          return (
            <div
              key={etapa.estado}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition"
              style={{
                borderColor: esActual ? etapa.color : hecho ? `${etapa.color}55` : "var(--border-color)",
                background: esActual ? `${etapa.color}1a` : undefined,
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                style={pintado ? { background: etapa.color, color: "#ffffff" } : { border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
              >
                {hecho || (esActual && indice === ETAPAS_PEDIDO.length - 1) ? "✓" : indice + 1}
              </span>
              <span
                className="min-w-0 flex-1 text-xs font-bold"
                style={{ color: esActual ? etapa.color : hecho ? "var(--text-main)" : "var(--text-muted)" }}
              >
                {etapa.corto}
              </span>
              {esActual && (
                <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: etapa.color }}>
                  Ahora
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* El paso actual, destacado con su color */}
      {actual >= 0 && (
        <div className="mt-7 rounded-2xl border px-5 py-4" style={{ borderColor: `${color}66`, background: `${color}14` }}>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Paso {actual + 1} de {ETAPAS_PEDIDO.length}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            <p className="text-lg font-black" style={{ color }}>
              {estado}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
