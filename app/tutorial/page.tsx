import Link from "next/link";
import ThemeToggle from "../../components/ThemeToggle";
import TutorialGallery from "../../components/TutorialGallery";

const revisionFinal = [
  "Eliminá caras y líneas duplicadas.",
  "Eliminá piezas flotantes o alejadas del modelo.",
  "Quitá muebles, vegetación y elementos que no deban imprimirse.",
  "Revisá puertas, ventanas y demás aberturas.",
  "Comprobá que los muros tengan un espesor real.",
  "Indicá la escala correcta en la solicitud.",
  "Separá los pisos cuando el proyecto tenga interiores.",
  "Verificá que las caras exteriores se vean blancas.",
];

const organizacionPiezas = [
  "Separadas, sin tocarse ni superponerse.",
  "Ordenadas para reconocer cada parte.",
  "Todas en la misma escala.",
  "Sin copias duplicadas.",
  "Sin elementos que no deban imprimirse.",
  "Con espacio suficiente entre cada pieza.",
];

export default function TutorialPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 text-[var(--text-main)] sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-32 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-40 top-[650px] h-96 w-96 rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute left-1/2 top-[1500px] h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold text-[var(--text-muted)] transition hover:text-red-600"
        >
          ← Volver a Kint 3D
        </Link>

        <ThemeToggle />
      </header>

      <section className="relative z-10 mx-auto max-w-4xl pb-16 pt-20 text-center sm:pt-24">
        <p className="mb-5 text-xs font-black uppercase tracking-[0.4em] text-red-600">
          Tutorial para principiantes
        </p>

        <h1 className="text-4xl font-black leading-tight sm:text-5xl">
          Cómo preparar tu modelo para imprimir
        </h1>

        <p className="mx-auto mt-7 max-w-3xl text-base leading-8 text-[var(--text-muted)]">
          Antes de solicitar una cotización, prepará el archivo de una
          de estas dos maneras. La opción correcta depende de si el
          proyecto tiene elementos interiores o si funciona como una
          única envolvente exterior.
        </p>

        <div className="mx-auto mt-9 flex max-w-2xl flex-wrap justify-center gap-3 text-[10px] font-black uppercase tracking-[0.17em]">
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-blue-500">
            Con interiores: despiezado
          </span>

          <span className="rounded-full border border-red-600/40 bg-red-600/10 px-4 py-2 text-red-600">
            Sin interiores: unido
          </span>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-7 lg:grid-cols-2">
        <article className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
          <div className="flex min-h-[310px] items-center justify-center bg-black/5 p-3">
            <TutorialGallery
              images={[{
                src: "/tutorial/modelo-despiezado-pisos.png",
                alt: "Modelo arquitectónico separado por pisos",
              }]}
              imageClassName="max-h-[420px] w-full rounded-2xl object-contain"
            />
          </div>

          <div className="p-7 sm:p-9">
            <span className="inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
              Opción 1 · Con interiores
            </span>

            <h2 className="mt-5 text-2xl font-black">
              Modelo despiezado por niveles
            </h2>

            <p className="mt-5 leading-8 text-[var(--text-muted)]">
              Esta opción se utiliza cuando el proyecto contiene
              muros interiores, losas, entrepisos, escaleras,
              divisiones u otros elementos internos.
            </p>

            <p className="mt-4 leading-8 text-[var(--text-muted)]">
              Cada piso o sección debe quedar separado, ordenado y
              correctamente alineado. Esto nos permite revisar el
              interior y preparar cada pieza de forma independiente.
            </p>

            <div className="mt-6 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 text-sm leading-7 text-[var(--text-muted)]">
              Recomendado para edificios con varios niveles, losas,
              muros interiores o piezas que necesiten imprimirse por
              separado.
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
          <div className="flex min-h-[310px] items-center justify-center bg-black/5 p-3">
            <TutorialGallery
              images={[{
                src: "/tutorial/modelo-unido.jpeg",
                alt: "Modelo arquitectónico unido en una sola pieza",
              }]}
              imageClassName="max-h-[420px] w-full rounded-2xl object-contain"
            />
          </div>

          <div className="p-7 sm:p-9">
            <span className="inline-flex rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
              Opción 2 · Sin interiores
            </span>

            <h2 className="mt-5 text-2xl font-black">
              Modelo unido
            </h2>

            <p className="mt-5 leading-8 text-[var(--text-muted)]">
              Esta opción se utiliza cuando el modelo es una sola
              envolvente exterior y no contiene muros, losas ni
              elementos internos que deban imprimirse por separado.
            </p>

            <p className="mt-4 leading-8 text-[var(--text-muted)]">
              Debe funcionar como una pieza continua, similar a una
              caja con huecos para puertas, ventanas y otras
              aberturas.
            </p>

            <div className="mt-6 rounded-2xl border border-red-600/25 bg-red-600/5 p-5 text-sm leading-7 text-[var(--text-muted)]">
              Recomendado para volúmenes simples, huecos y sin
              divisiones interiores.
            </div>
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto mt-24 max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
            Modelos complejos
          </p>

          <h2 className="mt-4 text-3xl font-black">
            Cómo organizar un modelo despiezado
          </h2>

          <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">
            No siempre alcanza con separar los pisos. También pueden
            separarse muros, fachadas, escaleras, bases y piezas
            especiales cuando conviene imprimirlas individualmente.
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow-soft)]">
            <TutorialGallery
              images={[{
                src: "/tutorial/despiezado-piezas.png",
                alt: "Piezas arquitectónicas organizadas por tipo",
              }]}
              imageClassName="min-h-[280px] w-full rounded-2xl object-contain"
            />

            <figcaption className="px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
              Piezas arquitectónicas separadas por tipo: fachadas,
              bases, escaleras y elementos especiales.
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow-soft)]">
            <TutorialGallery
              images={[{
                src: "/tutorial/despiezado-unido.png",
                alt: "Niveles y componentes interiores separados junto al modelo completo",
              }]}
              imageClassName="min-h-[280px] w-full rounded-2xl object-contain"
            />

            <figcaption className="px-5 py-5 text-sm leading-7 text-[var(--text-muted)]">
              Niveles, muros y componentes interiores organizados como
              piezas independientes, junto al modelo completo de
              referencia.
            </figcaption>
          </figure>
        </div>

        <div className="mt-8 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-soft)] sm:p-9">
          <h3 className="text-xl font-black">
            Las piezas deben quedar:
          </h3>

          <div className="mt-6 grid gap-4 text-sm leading-7 text-[var(--text-muted)] md:grid-cols-2">
            {organizacionPiezas.map((item) => (
              <p key={item}>✓ {item}</p>
            ))}
          </div>

          <p className="mt-7 border-l-2 border-red-600 pl-5 text-sm leading-7 text-[var(--text-muted)]">
            No es necesario acomodar las piezas exactamente sobre la
            cama de impresión. Lo importante es que estén limpias,
            separadas y sean fáciles de identificar.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-24 max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
            SketchUp
          </p>

          <h2 className="mt-4 text-3xl font-black">
            Revisá la orientación de las caras
          </h2>

          <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">
            Cada cara tiene un lado exterior y otro interior. Desde
            afuera del modelo deberían verse las caras blancas. Las
            caras grises o azuladas deben quedar orientadas hacia el
            interior.
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <article className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
            <TutorialGallery
              images={[{
                src: "/tutorial/material.png",
                alt: "Ejemplo del color exterior blanco y el color interior gris azulado en SketchUp",
              }]}
              imageClassName="w-full object-contain"
            />

            <div className="p-7 sm:p-8">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                Paso 1
              </span>

              <h3 className="mt-3 text-xl font-black">
                Cómo reconocerlas
              </h3>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/20 bg-white px-4 py-2 text-xs font-black text-black">
                  Blanco → cara exterior
                </span>

                <span className="rounded-full border border-slate-400/40 bg-slate-500/20 px-4 py-2 text-xs font-black text-[var(--text-main)]">
                  Gris o azul → cara interior
                </span>
              </div>

              <p className="mt-6 leading-8 text-[var(--text-muted)]">
                Desde afuera del modelo deberías ver todas las
                superficies blancas. Si una zona exterior se ve gris o
                azulada, esa cara está invertida.
              </p>
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
            <TutorialGallery
              images={[{
                src: "/tutorial/invertir-caras.png",
                alt: "Opción Invertir caras dentro del menú de SketchUp",
              }]}
              imageClassName="w-full object-contain"
            />

            <div className="p-7 sm:p-8">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                Paso 2
              </span>

              <h3 className="mt-3 text-xl font-black">
                Cómo corregirlas
              </h3>

              <ol className="mt-5 space-y-3 leading-8 text-[var(--text-muted)]">
                <li>1. Seleccioná la cara incorrecta.</li>
                <li>2. Hacé clic derecho sobre la selección.</li>
                <li>
                  3. Elegí <strong>Invertir caras</strong>.
                </li>
                <li>
                  4. Repetí el proceso en las demás superficies
                  exteriores que se vean grises o azuladas.
                </li>
              </ol>

              <p className="mt-6 border-l-2 border-red-600 pl-5 text-sm leading-7 text-[var(--text-muted)]">
                Este paso ayuda al laminador a interpretar dónde debe
                colocar material y qué zonas deben permanecer vacías.
              </p>
            </div>
          </article>
        </div>

        <div className="mt-8 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="mb-7 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
              Paso 3
            </span>

            <h3 className="mt-3 text-2xl font-black">
              Compará el resultado
            </h3>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              Revisá todas las paredes exteriores. El resultado final
              debe verse completamente blanco desde afuera.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <figure className="overflow-hidden rounded-2xl border border-red-600/30 bg-red-600/5 p-3">
              <TutorialGallery
                images={[{
                  src: "/tutorial/asi-no.png",
                  alt: "Ejemplo incorrecto con una cara interior visible",
                }]}
                imageClassName="aspect-square w-full rounded-xl object-contain"
              />

              <figcaption className="px-2 pb-2 pt-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                  Así no
                </p>

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  La cara interior azulada está orientada hacia afuera.
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-red-600/30 bg-red-600/5 p-3">
              <TutorialGallery
                images={[{
                  src: "/tutorial/asi-no2.png",
                  alt: "Ejemplo incorrecto con varias caras exteriores invertidas",
                }]}
                imageClassName="aspect-square w-full rounded-xl object-contain"
              />

              <figcaption className="px-2 pb-2 pt-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                  Así no
                </p>

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Algunas superficies exteriores todavía aparecen
                  azuladas.
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <TutorialGallery
                images={[{
                  src: "/tutorial/asi-si.png",
                  alt: "Ejemplo correcto con todas las caras exteriores blancas",
                }]}
                imageClassName="aspect-square w-full rounded-xl object-contain"
              />

              <figcaption className="px-2 pb-2 pt-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-500">
                  Así sí
                </p>

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Todas las caras exteriores están orientadas
                  correctamente.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-blue-500/30 bg-blue-500/5 p-7 sm:p-9">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">
                Paso 4
              </span>

              <h3 className="mt-3 text-xl font-black">
                Comprobación con un corte
              </h3>

              <p className="mt-4 leading-8 text-[var(--text-muted)]">
                Usá un plano de sección con el relleno activado. El
                interior de la pieza debería verse relleno de forma
                continua, sin huecos inesperados ni superficies
                abiertas.
              </p>

              <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                Pasá las imágenes con las flechas, como en una
                publicación, o tocá la foto para verla en pantalla
                completa.
              </p>
            </div>

            <TutorialGallery
              images={[
                {
                  src: "/tutorial/modelo.png",
                  alt: "Modelo arquitectónico antes de realizar el corte",
                  caption: "Modelo completo antes de revisar el interior.",
                },
                {
                  src: "/tutorial/modelo-corte.png",
                  alt: "Modelo arquitectónico con plano de corte y relleno visible",
                  caption: "El corte permite comprobar si el volumen está correctamente cerrado.",
                },
                {
                  src: "/tutorial/corte.png",
                  alt: "Ejemplo frontal de un corte del modelo",
                  caption: "El interior debe verse continuo y sin zonas abiertas.",
                },
                {
                  src: "/tutorial/corte2.png",
                  alt: "Segundo ejemplo lateral de un corte del modelo",
                  caption: "Revisá el modelo desde distintos puntos para detectar errores.",
                },
              ]}
              imageClassName="aspect-[4/3] w-full rounded-2xl bg-black/10 object-contain"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-24 max-w-5xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-soft)] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
          Revisión final
        </p>

        <h2 className="mt-4 text-3xl font-black">
          Antes de subir el archivo
        </h2>

        <div className="mt-8 grid gap-4 text-sm leading-7 text-[var(--text-muted)] md:grid-cols-2">
          {revisionFinal.map((item) => (
            <p key={item}>✓ {item}</p>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
          <p className="font-black text-[var(--text-main)]">
            Formatos aceptados: STL y SKP
          </p>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            ¿No estás seguro de cómo prepararlo? Enviá el archivo
            igualmente. Revisaremos el modelo antes de preparar el
            presupuesto y te avisaremos si necesita algún ajuste.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-16 max-w-5xl rounded-3xl border border-red-600/30 bg-red-600/5 p-7 sm:p-10">
        <h2 className="text-2xl font-black">
          Orden de trabajo y tiempos
        </h2>

        <p className="mt-5 leading-8 text-[var(--text-muted)]">
          Trabajamos por orden de llegada. El pedido queda listo para
          entrar a la cola de producción cuando elegís una opción de
          presupuesto y confirmamos el pago de la seña mínima del 20%
          o el pago total.
        </p>

        <p className="mt-4 leading-8 text-[var(--text-muted)]">
          Elegir un presupuesto por sí solo no inicia la impresión. Si
          tenés una fecha límite, enviá el modelo lo antes posible e
          indicá la fecha en la solicitud. Recomendamos dejar uno o dos
          días adicionales para revisión y posibles ajustes.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl py-24 text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
          Siguiente paso
        </p>

        <h2 className="mt-5 text-3xl font-black sm:text-4xl">
          ¿Tu modelo ya está preparado?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl leading-8 text-[var(--text-muted)]">
          Subilo, contanos cómo querés imprimirlo y recibirás una o
          más opciones de presupuesto.
        </p>

        <Link
          href="/cotizar"
          className="mt-9 inline-flex items-center justify-center rounded-2xl border border-red-600 bg-red-600 px-10 py-5 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-transparent hover:text-red-600"
        >
          Subir mi modelo →
        </Link>
      </section>
    </main>
  );
}