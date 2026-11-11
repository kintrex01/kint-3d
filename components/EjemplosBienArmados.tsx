import Link from "next/link";
import ImagenAmpliable from "@/components/ImagenAmpliable";

/*
 * Ejemplos reales de archivos bien armados: la meta de la guía y de Cotizar.
 * La gente copia lo que ve que funciona, por eso van grandes y arriba.
 */

const EJEMPLOS = [
  { src: "/tutorial/despiezado-unido.png", pie: "Cada planta separada y el modelo completo al lado, como referencia." },
  { src: "/tutorial/ejemplo5.png", pie: "Un edificio entero desplegado: plantas, muros y base, todo en el piso." },
  { src: "/tutorial/ejemplo1.png", pie: "Piezas repetidas ordenadas en filas, sin tocarse." },
  { src: "/tutorial/ejemplo3.png", pie: "Visto desde arriba: todo plano y separado." },
];

export default function EjemplosBienArmados({ enGuia = false }: { enGuia?: boolean }) {
  const [principal, ...resto] = EJEMPLOS;
  return (
    <section
      className={`rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.03] p-4 sm:p-6 ${
        enGuia ? "relative z-10 mx-auto mb-14 max-w-5xl" : "mb-8"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
        🎯 {enGuia ? "La meta" : "Así llegan los modelos que salen perfectos"}
      </p>
      <h2 className={`mt-1 font-black leading-tight ${enGuia ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"}`}>
        A esto tenés que llegar
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Archivos reales que nos mandaron y salieron perfectos: <b className="text-[var(--text-main)]">un solo archivo</b>, cada
        pieza <b className="text-[var(--text-main)]">separada</b> y <b className="text-[var(--text-main)]">todas apoyadas en el piso</b>.
        Tocá una foto para verla grande.
      </p>

      <figure className="mt-4 overflow-hidden rounded-2xl border border-emerald-500/40 bg-[var(--card-bg)]">
        <ImagenAmpliable src={principal.src} alt={principal.pie} />
        <figcaption className="px-3 py-2 text-sm font-bold leading-5">{principal.pie}</figcaption>
      </figure>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {resto.map((ejemplo) => (
          <figure key={ejemplo.src} className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-[var(--card-bg)]">
            <div className="[&_img]:aspect-[4/3] [&_img]:w-full [&_img]:object-contain">
              <ImagenAmpliable src={ejemplo.src} alt={ejemplo.pie} />
            </div>
            <figcaption className="px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">{ejemplo.pie}</figcaption>
          </figure>
        ))}
      </div>

      {enGuia ? (
        <p className="mt-4 text-sm font-bold text-emerald-800 dark:text-emerald-300">↓ Los 7 pasos de abajo te llevan a esto.</p>
      ) : (
        <Link href="/tutorial" target="_blank" className="mt-4 inline-block text-sm font-black text-emerald-700 underline underline-offset-4 dark:text-emerald-400">
          ¿Cómo dejo el mío así? Guía en 7 pasos ↗
        </Link>
      )}
    </section>
  );
}
