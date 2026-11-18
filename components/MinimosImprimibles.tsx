"use client";

import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";

/*
 * Escalador: «¿cuánto tiene que medir como mínimo?». Para cada escala, lo
 * más fino que sale (una pasada de la boquilla, frágil) y lo recomendado
 * (dos pasadas), en medida REAL (como se dibuja en SketchUp). Vale para
 * pilares, muros, barandas, parteluces: el lado más finito.
 * Usa la boquilla prendida en Configuración (si están las dos, se elige).
 */

const ESCALAS = [50, 75, 100, 125, 200, 250, 500];

/* 4 → «4 cm», 2.5 → «2,5 cm», 0.8 → «8 mm». */
function medida(cm: number) {
  if (cm < 1) return `${Math.round(cm * 10)} mm`;
  const redondo = Math.round(cm * 10) / 10;
  return `${String(redondo).replace(".", ",")} cm`;
}

export default function MinimosImprimibles() {
  const [boquillas, setBoquillas] = useState<number[]>([0.4]);
  const [boquilla, setBoquilla] = useState(0.4);

  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !data?.ok) return;
        const config = data.configuracion || {};
        const prendida = (clave: string) => /^habilitad/i.test(String(config[clave]?.valor || ""));
        const lista = [prendida("boquilla_0_2") && 0.2, prendida("boquilla_0_4") && 0.4].filter(Boolean) as number[];
        if (lista.length) {
          setBoquillas(lista);
          setBoquilla(lista.includes(0.4) ? 0.4 : lista[0]);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-600">
          <Ruler size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-[var(--text-main)]">¿Cuánto tiene que medir como mínimo?</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Pilares, muros, barandas, parteluces: mirá su <strong className="text-[var(--text-main)]">lado más finito</strong>, en
            medida real (como lo dibujás en SketchUp).
          </p>
        </div>
        {boquillas.length > 1 && (
          <div className="flex gap-1 rounded-xl border border-[var(--border-color)] p-1">
            {boquillas.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setBoquilla(opcion)}
                className={`h-8 rounded-lg px-3 text-xs font-black ${boquilla === opcion ? "bg-red-600 text-white" : "text-[var(--text-muted)]"}`}
              >
                Boquilla {String(opcion).replace(".", ",")}
              </button>
            ))}
          </div>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-black/5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)] dark:bg-white/5">
          <tr>
            <th className="px-5 py-2.5">Escala</th>
            <th className="px-3 py-2.5 text-amber-600">Mínimo (frágil)</th>
            <th className="px-3 py-2.5 text-emerald-600">Recomendado</th>
          </tr>
        </thead>
        <tbody>
          {ESCALAS.map((escala) => {
            // En la maqueta: 1 pasada = boquilla; 2 pasadas = recomendado. En la realidad: × escala.
            const minimoCm = (boquilla * escala) / 10;
            return (
              <tr key={escala} className="border-t border-[var(--border-color)]">
                <td className="px-5 py-2.5 font-black">1:{escala}</td>
                <td className="px-3 py-2.5 font-bold text-amber-600">{medida(minimoCm)}</td>
                <td className="px-3 py-2.5 font-bold text-emerald-600">{medida(minimoCm * 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="border-t border-[var(--border-color)] px-5 py-3 text-xs leading-5 text-[var(--text-muted)]">
        Ejemplo a 1:100: un pilar de <strong className="text-[var(--text-main)]">{medida((boquilla * 100) / 10)}</strong> sale, pero se
        puede quebrar; con <strong className="text-[var(--text-main)]">{medida((boquilla * 200) / 10)}</strong> queda firme. Más fino que
        el mínimo, no se imprime. Para revisar una medida tuya, usá la calculadora de abajo.
      </p>
    </section>
  );
}
