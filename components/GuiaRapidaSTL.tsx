import Link from "next/link";

/*
 * Tutorial: el camino rápido (mandar solo el STL) y los errores comunes de
 * SketchUp, con lo que el visor arregla solo (lib/reparar-malla).
 */

const pasosRapidos = [
  {
    numero: "1",
    titulo: "Exportá un STL",
    texto: "En SketchUp: Archivo → Exportar → Modelo 3D → tipo STL. Ya escalado es lo ideal (el tutorial avanzado te muestra cómo); si no, exportalo en metros y lo escalamos con la escala que elijas.",
  },
  {
    numero: "2",
    titulo: "Revisalo en el visor 3D",
    texto: "Abrilo en el visor: si tiene errores, los arregla solo y te muestra en verde lo que tapó. También te dice qué conviene acostar o cortar.",
  },
  {
    numero: "3",
    titulo: "Envialo con la escala",
    texto: "En Cotizar subí el STL y elegí la escala de la maqueta (1:100, 1:200…). Si lo arreglamos, se envía la copia arreglada sin que hagas nada.",
  },
];

const errores = [
  {
    nombre: "Agujeros (caras que faltan)",
    como: "Un grupo que no es sólido: falta una cara o un pedazo.",
    kint: "Los tapamos siguiendo la forma del hueco, también en L o con patios.",
    sketchup: "En Información de la entidad tiene que decir «Volumen». Si no, repasá con Línea el borde que falta.",
  },
  {
    nombre: "Caras azules (al revés)",
    como: "Caras que miran para adentro del sólido.",
    kint: "Las damos vuelta para que todas miren para afuera.",
    sketchup: "Seleccioná las caras azules → clic derecho → Invertir caras.",
  },
  {
    nombre: "Paredes o techos de una sola cara",
    como: "Una superficie sin espesor: la impresora no puede imprimir algo de 0 mm.",
    kint: "Le damos 1 mm de espesor a la escala que elegiste.",
    sketchup: "Mejor darle espesor real con Empujar/Tirar (mirá el espesor mínimo según la escala).",
  },
  {
    nombre: "Caras de más dentro del sólido",
    como: "Restos de dibujo que quedaron adentro de un volumen.",
    kint: "Las sacamos.",
    sketchup: "Entrá al grupo y borrá las caras internas.",
  },
  {
    nombre: "Rajas y aristas partidas",
    como: "Caras que casi se tocan o que están divididas de un lado y enteras del otro.",
    kint: "Las cosemos para que quede un solo sólido cerrado.",
    sketchup: "Usá «Intersecar caras» con el modelo y borrá las líneas sueltas.",
  },
  {
    nombre: "Piezas finas paradas o voladizos",
    como: "No es un error, pero obliga a usar soportes y tarda más.",
    kint: "El visor te dice qué acostar y dónde cortar, y «Preparar para imprimir» lo hace solo.",
    sketchup: "Separá las plantas y las fachadas finas en grupos aparte.",
  },
];

export function CaminoRapidoSTL() {
  return (
    <section className="relative z-10 mx-auto mb-20 max-w-6xl">
      <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-7 sm:p-10">
        <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
          Lo más rápido
        </span>
        <h2 className="mt-4 text-3xl font-black">Mandá solo el STL: en 3 pasos</h2>
        <p className="mt-3 max-w-3xl leading-8 text-[var(--text-muted)]">
          Es la forma más rápida de que tu maqueta entre a la impresora. Aceptamos SKP, pero con el STL nos ahorramos un paso
          y lo podés revisar vos mismo antes de enviarlo.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pasosRapidos.map((paso) => (
            <article key={paso.numero} className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                {paso.numero}
              </span>
              <h3 className="mt-4 text-lg font-black">{paso.titulo}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{paso.texto}</p>
            </article>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/preparador-3d"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Abrir el visor 3D
          </Link>
          <Link
            href="/cotizar"
            className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
          >
            Ir a cotizar
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ErroresComunesSTL() {
  return (
    <section className="relative z-10 mx-auto mt-24 max-w-6xl">
      <div className="mb-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">Errores comunes</p>
        <h2 className="mt-4 text-3xl font-black">Lo que suele fallar en SketchUp (y lo que hacemos solos)</h2>
        <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">
          Cuando subís tu STL, el visor 3D y Cotizar arreglan solos estos errores. Igual, si los evitás desde SketchUp, tu
          maqueta sale más prolija.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {errores.map((error) => (
          <article
            key={error.nombre}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-soft)]"
          >
            <h3 className="text-lg font-black">{error.nombre}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{error.como}</p>
            <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
              <strong>Kint:</strong> {error.kint}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              <strong className="text-[var(--text-main)]">En SketchUp:</strong> {error.sketchup}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
