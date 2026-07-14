"use client";

import { useEffect, useState } from "react";

type Estadisticas = {
  impresionesEnCurso: number;
  pedidosFinalizados: number;
};

export default function EstadisticasInicio() {
  const [estadisticas, setEstadisticas] =
    useState<Estadisticas>({
      impresionesEnCurso: 0,
      pedidosFinalizados: 0,
    });

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarEstadisticas() {
      try {
        const response = await fetch(
          "/api/estadisticas-inicio",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "No se pudieron cargar las estadísticas."
          );
        }

        setEstadisticas({
          impresionesEnCurso: Number(
            data.impresionesEnCurso || 0
          ),
          pedidosFinalizados: Number(
            data.pedidosFinalizados || 0
          ),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    }

    cargarEstadisticas();
  }, []);

return (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-3 rounded-full border border-[var(--blue-border)] bg-[var(--glass-bg)] px-5 py-3 text-[var(--text-main)] shadow-sm backdrop-blur transition">
      <span className="text-xl font-black leading-none text-red-600">
        {cargando
          ? "—"
          : estadisticas.impresionesEnCurso}
      </span>

      <span className="text-[9px] font-bold uppercase leading-[1.5] tracking-[0.17em]">
        Impresiones
        <br />
        en curso
      </span>

      <span className="relative ml-1 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
      </span>
    </div>

    <div className="flex items-center gap-3 rounded-full border border-[var(--blue-border)] bg-[var(--glass-bg)] px-5 py-3 text-[var(--text-main)] shadow-sm backdrop-blur transition">
      <span className="text-xl font-black leading-none text-red-600">
        {cargando
          ? "—"
          : estadisticas.pedidosFinalizados}
      </span>

      <span className="text-[9px] font-bold uppercase leading-[1.5] tracking-[0.17em]">
        Pedidos
        <br />
        finalizados
      </span>
    </div>
  </div>
);
}