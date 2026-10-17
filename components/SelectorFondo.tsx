"use client";

/*
 * Fondo de pantalla de la web: cada uno con su color y su dibujo
 * (los estilos están en globals.css, "FONDOS DE PANTALLA").
 * Se guarda en este navegador ("kint-fondo") y se aplica antes de
 * mostrar la página (script en app/layout.tsx).
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export const FONDOS_WEB = [
  { id: "humo", nombre: "Humo azul", muestra: "radial-gradient(circle at 30% 30%, #3b82c4, #0b1d3a 70%)" },
  { id: "fuego", nombre: "Fuego", muestra: "radial-gradient(circle at 30% 80%, #f97316, #b91c1c 45%, #2a0608 85%)" },
  { id: "aurora", nombre: "Aurora", muestra: "linear-gradient(135deg, #064e3b, #10b981 45%, #38bdf8 75%, #082f49)" },
  { id: "neon", nombre: "Neón", muestra: "radial-gradient(circle at 70% 30%, #ec4899, #7c3aed 50%, #12051f 90%)" },
  { id: "grafito", nombre: "Grafito", muestra: "radial-gradient(circle at 30% 30%, #9ca3af, #3f3f46 55%, #111214 90%)" },
] as const;

const CLAVE = "kint-fondo";

export default function SelectorFondo() {
  const [actual, setActual] = useState("humo");

  // Lo que ya aplicó el script del layout.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActual(document.documentElement.getAttribute("data-fondo") || "humo");
  }, []);

  function elegir(id: string) {
    setActual(id);
    document.documentElement.setAttribute("data-fondo", id);
    try {
      localStorage.setItem(CLAVE, id);
    } catch {
      // Sin almacenamiento: dura esta visita.
    }
  }

  return (
    <section>
      <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[0.28em] text-[var(--blue-soft)]">
        Fondo de pantalla
      </p>
      <div className="grid grid-cols-5 gap-2 px-1">
        {FONDOS_WEB.map((fondo) => {
          const elegido = fondo.id === actual;
          return (
            <button
              key={fondo.id}
              type="button"
              onClick={() => elegir(fondo.id)}
              aria-pressed={elegido}
              title={fondo.nombre}
              className="group flex flex-col items-center gap-1"
            >
              <span
                className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
                  elegido
                    ? "ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--kint-panel)]"
                    : "ring-1 ring-[var(--kint-panel-border)] group-hover:scale-105"
                }`}
                style={{ background: fondo.muestra }}
              >
                {elegido && <Check size={16} strokeWidth={3} className="text-white drop-shadow" />}
              </span>
              <span className={`text-[9px] font-bold leading-tight ${elegido ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}`}>
                {fondo.nombre}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
