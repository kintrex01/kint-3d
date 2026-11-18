"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/*
 * Claro / oscuro, dentro del menú (al lado de los fondos de pantalla).
 * Guarda la elección como lo hacía el botón de arriba («theme» en el navegador).
 */
export default function SelectorTema() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function elegir(nuevoOscuro: boolean) {
    setOscuro(nuevoOscuro);
    document.documentElement.classList.toggle("dark", nuevoOscuro);
    try {
      localStorage.setItem("theme", nuevoOscuro ? "dark" : "light");
    } catch {
      /* sin almacenamiento: dura lo que la página */
    }
  }

  return (
    <section>
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--blue-soft)]">Tema</p>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border-color)] p-1">
        {[
          { valor: false, texto: "Claro", Icono: Sun },
          { valor: true, texto: "Oscuro", Icono: Moon },
        ].map(({ valor, texto, Icono }) => {
          const activo = oscuro === valor;
          return (
            <button
              key={texto}
              type="button"
              onClick={() => elegir(valor)}
              aria-pressed={activo}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                activo ? "bg-[var(--blue-main)] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Icono size={16} />
              {texto}
            </button>
          );
        })}
      </div>
    </section>
  );
}
