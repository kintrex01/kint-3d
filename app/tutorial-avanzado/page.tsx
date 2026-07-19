"use client";

import Link from "next/link";
import ImagenAmpliable from "../../components/ImagenAmpliable";
import ThemeToggle from "../../components/ThemeToggle";

const pasos = [
  {
    numero: "01",
    titulo: "Medir una referencia real",
    descripcion:
      "Antes de cambiar la escala, identificá una medida real conocida del proyecto.",
    imagen:
      "/tutorial-avanzado/01-medida-real-44m.png",
    alt: "Modelo de SketchUp con una longitud real de 44 metros",
    instrucciones: [
      "Abrí el modelo en SketchUp.",
      "Activá la Cinta métrica presionando la tecla T.",
      "Hacé clic en el punto inicial y en el punto final de una medida conocida.",
      "En este ejemplo, una de las piezas mide 44 metros.",
      "Recordá esta medida porque será la referencia para escalar todo el modelo.",
    ],
  },
  {
    numero: "02",
    titulo: "Calcular la medida a escala",
    descripcion:
      "Usá el Escalador 3D para conocer cuánto debe medir esa referencia en el modelo de impresión.",
    imagen:
      "/tutorial-avanzado/02-calculo-escalador.png",
    alt: "Escalador 3D calculando 44 metros a escala 1 a 250",
    instrucciones: [
      "Abrí el Escalador 3D de Kint.",
      "Ingresá la escala de tu proyecto, en este caso 1:250.",
      "Ingresá 44 metros como longitud real.",
      "El resultado indica que la pieza debe medir 176 milímetros.",
      "La operación es 44.000 mm dividido entre 250: 176 mm.",
    ],
    advertencia:
      "Los 176 mm serán la nueva medida de referencia que deberás escribir en SketchUp.",
  },
  {
    numero: "03",
    titulo: "Abrir Información del modelo",
    descripcion:
      "Antes de escalar, cambiá la forma en que SketchUp muestra las unidades.",
    imagen:
      "/tutorial-avanzado/03-abrir-informacion-modelo.png",
    alt: "Menú Ventana e Información del modelo en SketchUp",
    instrucciones: [
      "Abrí el menú Ventana.",
      "Seleccioná Información del modelo.",
      "En la ventana lateral, ingresá en la sección Unidades.",
    ],
  },
  {
    numero: "04",
    titulo: "Revisar las unidades actuales",
    descripcion:
      "El modelo original todavía está expresado en metros porque fue diseñado en tamaño real.",
    imagen:
      "/tutorial-avanzado/04-unidades-en-metros.png",
    alt: "Información del modelo de SketchUp configurada en metros",
    instrucciones: [
      "Comprobá que la longitud esté configurada en Metros.",
      "La referencia medida debe continuar indicando 44 m.",
      "Cambiar la unidad no modifica todavía el tamaño del modelo.",
    ],
  },
  {
    numero: "05",
    titulo: "Cambiar las unidades a milímetros",
    descripcion:
      "Para preparar un archivo destinado a impresión 3D, trabajaremos en milímetros.",
    imagen:
      "/tutorial-avanzado/05-cambiar-a-milimetros.png",
    alt: "Cambio de unidades de SketchUp a milímetros",
    instrucciones: [
      "Abrí la lista de unidades de Longitud.",
      "Seleccioná Milímetros.",
      "Cerrá la ventana Información del modelo.",
      "La misma referencia de 44 metros ahora aparecerá como 44.000 mm.",
    ],
    advertencia:
      "Este cambio solamente modifica cómo se muestran las medidas. El modelo todavía conserva su tamaño real.",
  },
  {
    numero: "06",
    titulo: "Escalar el modelo con la Cinta métrica",
    descripcion:
      "Usá la medida calculada por el Escalador 3D para reducir proporcionalmente todo el proyecto.",
    imagen:
      "/tutorial-avanzado/06-escalar-con-cinta.png",
    alt: "Modelo seleccionado para cambiar su tamaño con la Cinta métrica",
    instrucciones: [
      "Seleccioná todas las piezas que deben escalarse juntas.",
      "Cuando sea necesario, agrupá las piezas o entrá dentro del grupo.",
      "Presioná T para activar la Cinta métrica.",
      "Hacé clic en el inicio y en el final de la referencia de 44.000 mm.",
      "Sin hacer otro clic, escribí 176mm.",
      "Presioná Enter.",
      "Aceptá el aviso de SketchUp para cambiar el tamaño del modelo.",
      "Volvé a medir la misma referencia y comprobá que ahora indique 176 mm.",
    ],
    advertencia:
      "No escribas el factor 250 en este procedimiento. Escribí directamente la nueva medida: 176mm.",
  },
  {
    numero: "07",
    titulo: "Ordenar y verificar las piezas",
    descripcion:
      "Con el modelo ya escalado, acomodá todas las piezas que formarán parte del archivo STL.",
    imagen:
      "/tutorial-avanzado/avanzado01-modelo-sketchup.png",
    alt: "Piezas escaladas, ordenadas y medidas en SketchUp",
    instrucciones: [
      "Acomodá todas las piezas que querés imprimir.",
      "Dejá espacio entre los diferentes cuerpos.",
      "Comprobá nuevamente la medida de referencia.",
      "En este ejemplo, la pieza debe medir 176 mm.",
      "Eliminá objetos que no quieras exportar.",
    ],
  },
  {
    numero: "08",
    titulo: "Abrir la exportación 3D",
    descripcion:
      "Con el tamaño correcto, comenzá la exportación del modelo.",
    imagen:
      "/tutorial-avanzado/02-exportar-modelo.png",
    alt: "Menú Archivo, Exportar, Modelo 3D",
    instrucciones: [
      "Abrí el menú Archivo.",
      "Ingresá en Exportar.",
      "Seleccioná Modelo 3D.",
    ],
  },
  {
    numero: "09",
    titulo: "Elegir el formato STL",
    descripcion:
      "Seleccioná el formato utilizado para preparar archivos de impresión 3D.",
    imagen:
      "/tutorial-avanzado/avanzado03-elegir-stl.png",
    alt: "Selección del formato Archivo Stereolithography STL",
    instrucciones: [
      "Abrí la lista Tipo.",
      "Seleccioná Archivo Stereolithography (*.stl).",
      "Escribí un nombre claro para el archivo.",
    ],
  },
  {
    numero: "10",
    titulo: "Abrir las opciones del STL",
    descripcion:
      "Antes de exportar, revisá las opciones y unidades del archivo.",
    imagen:
      "/tutorial-avanzado/avanzado04-opciones-stl.png",
    alt: "Ventana de exportación con el botón Opciones",
    instrucciones: [
      "Confirmá que el tipo de archivo sea STL.",
      "Revisá el nombre del archivo.",
      "Presioná el botón Opciones.",
    ],
  },
  {
    numero: "11",
    titulo: "Configurar la exportación",
    descripcion:
      "Estas opciones permiten conservar correctamente el tamaño del modelo.",
    imagen:
      "/tutorial-avanzado/05-opciones-stl.png",
    alt: "Opciones de exportación STL en milímetros",
    instrucciones: [
      "Elegí Binario como formato de archivo.",
      "Elegí Milímetros en Unidades STL.",
      "Dejá desmarcada la opción Cambiar coordenadas YZ.",
      "Presioná Aceptar.",
    ],
    advertencia:
      "Marcá “Exportar solo la selección actual” cuando hayas seleccionado únicamente las piezas que querés imprimir.",
  },
  {
    numero: "12",
    titulo: "Exportar el archivo",
    descripcion:
      "Después de aceptar las opciones, regresá a la ventana anterior para terminar.",
    imagen:
      "/tutorial-avanzado/avanzado04-opciones-stl.png",
    alt: "Ventana final para exportar el archivo STL",
    instrucciones: [
      "Confirmá nuevamente el nombre.",
      "Confirmá que el formato sea STL.",
      "Presioná Exportar.",
      "Guardá el archivo en una carpeta fácil de encontrar.",
    ],
  },
  {
    numero: "13",
    titulo: "Comprobar el archivo STL",
    descripcion:
      "Cargá el archivo exportado en el Preparador 3D para comprobar sus medidas y distribución.",
    imagen:
      "/tutorial-avanzado/06-comprobar-preparador.png",
    alt: "Diez piezas verificadas dentro de la cama de impresión",
    instrucciones: [
      "Seleccioná el archivo STL que acabás de exportar.",
      "Elegí el tamaño de cama correspondiente.",
      "Comprobá el ancho, la profundidad y la altura.",
      "Revisá la cantidad de piezas separadas detectadas.",
      "Confirmá que aparezca el mensaje El modelo entra.",
      "Usá Centrar o Vista superior para revisar mejor la distribución.",
    ],
    advertencia:
      "Que el archivo contenga varias piezas no significa que haya un error. Es correcto cuando fueron acomodadas intencionalmente para imprimirlas juntas.",
  },
];

export default function TutorialAvanzadoPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-5 py-10 text-[var(--text-main)] transition-colors duration-300">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
  <Link
    href="/preparador-3d"
    className="inline-flex text-sm font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] transition hover:text-red-600"
  >
    ← Volver al Preparador 3D
  </Link>

  <div className="fixed right-4 top-4 z-50 sm:right-8 sm:top-8">
    <ThemeToggle />
  </div>
</div>

        <header className="mb-12">
          <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-red-600">
            Guía paso a paso
          </p>

          <h1 className="text-3xl font-black uppercase tracking-[0.1em] sm:text-5xl">
            Tutorial avanzado
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
            Prepará tus piezas en SketchUp, exportalas
            correctamente como STL y comprobá sus
            medidas antes de imprimir.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
  <span className="text-sm text-[var(--text-muted)]">
    ¿Todavía no preparaste o dividiste tu modelo?
  </span>

  <Link
    href="/tutorial"
    className="text-sm font-bold text-blue-500 transition hover:text-blue-400 hover:underline"
  >
    Empezá por el tutorial básico →
  </Link>
</div>
        </header>

<div className="space-y-10">
          {pasos.map((paso) => (
            <article
  id={`paso-${paso.numero}`}
  key={paso.numero}
  className="scroll-mt-24 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--glass-bg)] shadow-xl backdrop-blur transition-colors duration-300"
>
              <div className="grid lg:grid-cols-[380px_minmax(0,1fr)]">
                <div className="p-6 sm:p-8">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-red-600">
                    Paso {paso.numero}
                  </p>

                  <h2 className="text-xl font-black uppercase tracking-[0.08em]">
                    {paso.titulo}
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                    {paso.descripcion}
                  </p>

                  <ol className="mt-6 space-y-3">
                    {paso.instrucciones.map(
                      (instruccion, indice) => (
                        <li
                          key={instruccion}
                          className="flex gap-3 text-sm leading-6"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-600 text-[10px] font-black text-red-600">
                            {indice + 1}
                          </span>

                          <span>{instruccion}</span>
                        </li>
                      )
                    )}
                                   </ol>

{paso.numero === "02" && (
  <Link
    href="/escalador"
    className="mt-6 inline-flex rounded-xl border border-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 transition hover:bg-emerald-600 hover:text-white"
  >
    Abrir Escalador 3D →
  </Link>
)}

                  {paso.numero === "06" && (
                    <a
                      href="https://www.youtube.com/shorts/Ps7YqsrKUlM"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex rounded-xl border border-blue-500 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-blue-500 transition hover:bg-blue-500 hover:text-white"
                    >
                      Ver Video →
                    </a>
                  )}

                  {paso.advertencia && (
                    <div className="mt-6 rounded-xl border border-amber-500 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-5">
                      {paso.advertencia}
                    </div>
                  )}
                </div>

                <div className="flex min-h-[300px] items-center justify-center border-t border-[var(--border-color)] bg-black/5 p-4 dark:bg-black/30 lg:border-l lg:border-t-0">
                  <ImagenAmpliable
  src={paso.imagen}
  alt={paso.alt}
/>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-red-600 bg-[var(--glass-bg)] p-7 text-center shadow-xl backdrop-blur transition-colors duration-300 sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-600">
            Archivo exportado
          </p>

          <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em]">
            Comprobá el STL
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
            Cargá el archivo para revisar sus medidas,
            la cantidad de piezas y su ubicación dentro
            de la cama de impresión.
          </p>

          <Link
            href="/preparador-3d"
            className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-red-700"
          >
            Abrir Preparador 3D
          </Link>
        </section>
      </div>
    </main>
  );
}