import Link from "next/link";
import ImagenAmpliable from "@/components/ImagenAmpliable";

/*
 * Cotizar: ejemplos reales de archivos bien armados, arriba de la subida.
 * La gente copia lo que ve que funciona.
 */

const EJEMPLOS = [
  { src: "/tutorial/despiezado-unido.png", pie: "Cada piso separado, junto al modelo completo" },
  { src: "/tutorial/ejemplo5.png", pie: "Todo desplegado y apoyado en el piso" },
  { src: "/tutorial/ejemplo1.png", pie: "Piezas repetidas, ordenadas sin tocarse" },
  { src: "/tutorial/ejemplo3.png", pie: "Visto de arriba: todo separado y plano" },
];

export default function EjemplosBienArmados() {
  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.07] p-4 sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
        ✓ Así llegan los modelos que salen perfectos
      </p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Archivos reales que nos mandaron: piezas separadas, todas en el piso y en un solo archivo.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {EJEMPLOS.map((ejemplo) => (
          <figure key={ejemplo.src} className="overflow-hidden rounded-xl border border-emerald-500/30 bg-[var(--card-bg)]">
            <div className="[&_img]:aspect-[4/3] [&_img]:w-full [&_img]:object-contain">
              <ImagenAmpliable src={ejemplo.src} alt={ejemplo.pie} />
            </div>
            <figcaption className="px-2 py-1.5 text-[11px] font-semibold leading-4 text-[var(--text-muted)]">{ejemplo.pie}</figcaption>
          </figure>
        ))}
      </div>
      <Link href="/tutorial" target="_blank" className="mt-3 inline-block text-xs font-black text-emerald-700 underline underline-offset-4 dark:text-emerald-400">
        ¿Cómo dejo el mío así? Guía en 7 pasos ↗
      </Link>
    </section>
  );
}
