import Link from "next/link";
import VideoTutorial from "@/components/VideoTutorial";

/*
 * Tutorial para principiantes (estudiantes que recién empiezan a modelar):
 * qué mandar, qué significa cada palabra, espesores mínimos, errores comunes
 * y cómo exportar. El visor solo marca los errores: no cambia el modelo.
 */

export const indiceTutorial = [
  { id: "que-mandar", titulo: "Qué mandar" },
  { id: "palabras", titulo: "Palabras clave" },
  { id: "como-armarlo", titulo: "Cómo armarlo" },
  { id: "espesores", titulo: "Espesores" },
  { id: "caras", titulo: "Caras al revés" },
  { id: "errores", titulo: "Errores comunes" },
  { id: "exportar", titulo: "Exportar y enviar" },
];

export function IndiceTutorial() {
  return (
    <nav aria-label="Pasos del tutorial" className="relative z-10 mx-auto mb-16 max-w-5xl">
      <ol className="flex flex-wrap justify-center gap-2">
        {indiceTutorial.map((paso, indice) => (
          <li key={paso.id}>
            <a
              href={`#${paso.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3.5 py-2 text-xs font-bold transition hover:border-red-600 hover:text-red-600"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                {indice + 1}
              </span>
              {paso.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// paso: queda por compatibilidad; la numeración ahora está en la receta (RecetaSKP).
function Encabezado({ id, titulo, children }: { id: string; paso?: number; titulo: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="mb-10 scroll-mt-24 text-center">
      <h2 className="text-2xl font-black sm:text-3xl">{titulo}</h2>
      {children && <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">{children}</p>}
    </div>
  );
}

export { Encabezado as EncabezadoTutorial };

/* ------------------------------------------------------------------ */

const queMandar = [
  {
    icono: "📦",
    titulo: "Un solo archivo",
    texto: "Todo el proyecto junto: todos los pisos, techos y piezas en el mismo archivo. No hace falta mandar un archivo por pieza.",
  },
  {
    icono: "🧊",
    titulo: "En STL (o SKP)",
    texto: "STL es el formato que entienden las impresoras 3D. Si no sabés exportarlo, mandá el SKP de SketchUp y lo pasamos nosotros.",
  },
  {
    icono: "📏",
    titulo: "A tamaño real",
    texto: "Modelá como siempre, en metros y a tamaño real (1:1). La escala de la maqueta (1:100, 1:200…) la elegís en el formulario.",
  },
  {
    icono: "↔️",
    titulo: "Piezas separadas",
    texto: "Cada piso o pieza como un grupo aparte, con un poco de espacio entre una y otra, sin tocarse.",
  },
];

export function QueMandar() {
  return (
    <section className="relative z-10 mx-auto mb-24 max-w-6xl">
      <Encabezado id="que-mandar" paso={1} titulo="Qué tenés que mandar">
        En resumen: <strong className="text-[var(--text-main)]">un archivo con todo tu proyecto adentro</strong>. Si
        cumplís estas 4 cosas, ya está casi listo.
      </Encabezado>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {queMandar.map((item, indice) => (
          <article
            key={item.titulo}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden className="text-3xl">
                {item.icono}
              </span>
              <span className="text-xs font-black text-[var(--text-muted)]">{indice + 1}/4</span>
            </div>
            <h3 className="mt-4 text-lg font-black">{item.titulo}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{item.texto}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm leading-7 text-[var(--text-muted)]">
          <strong className="text-emerald-600">✓ Así sí:</strong> un archivo «casa-final.stl» con la planta baja, la
          planta alta y el techo separados uno al lado del otro.
        </p>
        <p className="rounded-2xl border border-red-600/30 bg-red-600/5 p-5 text-sm leading-7 text-[var(--text-muted)]">
          <strong className="text-red-600">✗ Así no:</strong> tres archivos sueltos («planta-baja.stl», «techo.stl»…), o
          las piezas encimadas unas sobre otras.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const palabras = [
  { termino: "STL", texto: "El tipo de archivo que usan las impresoras 3D. Guarda solo la forma del modelo (sin colores ni materiales)." },
  { termino: "Sólido", texto: "Un volumen cerrado por todos lados, como una caja con tapa. La impresora solo puede imprimir sólidos." },
  { termino: "Cara", texto: "Cada superficie plana del modelo. Tiene un lado de afuera (blanco en SketchUp) y uno de adentro (gris o azul)." },
  { termino: "Arista", texto: "La línea donde se juntan dos caras. Si a una arista le falta una cara al lado, el sólido queda abierto." },
  { termino: "Grupo", texto: "Varias caras juntas que se mueven como una sola pieza. En SketchUp: seleccionás y apretás clic derecho → Crear grupo." },
  { termino: "Escala", texto: "Cuántas veces más chica es la maqueta. En 1:100, 1 metro real mide 1 cm en la maqueta." },
  { termino: "Espesor", texto: "Lo ancho que es un muro o una losa. Si es muy fino a la escala elegida, no se puede imprimir." },
  { termino: "Despiezar", texto: "Separar el modelo en partes (pisos, techo, fachadas) para imprimir cada una apoyada bien plana." },
  { termino: "Cama", texto: "La base de la impresora donde se apoya la pieza mientras se imprime. Tiene un tamaño máximo." },
  { termino: "Voladizo", texto: "Una parte que queda en el aire, sin nada abajo (un balcón, un alero). Necesita soportes para imprimirse." },
  { termino: "Soporte", texto: "Estructura de plástico que se imprime debajo de los voladizos y después se saca. Gasta material y tiempo." },
  { termino: "Caras invertidas", texto: "Caras que muestran su lado de adentro hacia afuera. En SketchUp se ven grises o azules desde afuera." },
];

export function Glosario() {
  return (
    <section className="relative z-10 mx-auto mb-24 max-w-6xl">
      <Encabezado id="palabras" paso={2} titulo="Palabras que vas a ver">
        Si es tu primera maqueta impresa, estas son las palabras que más aparecen en el tutorial y en el visor.
      </Encabezado>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {palabras.map((palabra) => (
          <div key={palabra.termino} className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
            <dt className="text-base font-black text-red-600">{palabra.termino}</dt>
            <dd className="mt-1.5 text-sm leading-7 text-[var(--text-muted)]">{palabra.texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const escalas = [
  { escala: "1:50", minimo: "4 cm" },
  { escala: "1:75", minimo: "6 cm" },
  { escala: "1:100", minimo: "8 cm" },
  { escala: "1:200", minimo: "16 cm" },
  { escala: "1:250", minimo: "20 cm" },
  { escala: "1:500", minimo: "40 cm" },
];

export function Espesores() {
  return (
    <section className="relative z-10 mx-auto mt-24 max-w-5xl">
      <Encabezado id="espesores" paso={4} titulo="¿Qué tan finos pueden ser los muros?">
        La impresora no puede hacer nada más fino que <strong className="text-[var(--text-main)]">0,8 mm</strong>. Como la
        maqueta se achica, un muro que en la realidad es grueso puede quedar demasiado fino. Mirá cuánto tiene que medir
        como mínimo en SketchUp (a tamaño real):
      </Encabezado>
      <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] dark:bg-white/5">
            <tr>
              <th className="px-5 py-3">Escala de la maqueta</th>
              <th className="px-5 py-3">Espesor mínimo en SketchUp</th>
              <th className="hidden px-5 py-3 sm:table-cell">Impreso queda de</th>
            </tr>
          </thead>
          <tbody>
            {escalas.map((fila) => (
              <tr key={fila.escala} className="border-t border-[var(--border-color)]">
                <td className="px-5 py-3 font-black">{fila.escala}</td>
                <td className="px-5 py-3 font-bold text-red-600">{fila.minimo}</td>
                <td className="hidden px-5 py-3 text-[var(--text-muted)] sm:table-cell">0,8 mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-5 border-l-2 border-red-600 pl-5 text-sm leading-7 text-[var(--text-muted)]">
        Ejemplo: un muro de 15 cm en una maqueta 1:200 queda de 0,75 mm, y no llega. Engrosalo a 16 cm, o elegí una escala
        más grande. Barandas, parteluces y marcos finos son los que más fallan.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const errores = [
  {
    nombre: "Sólido abierto (falta una cara)",
    queEs: "Un grupo al que le falta una cara: es como una caja sin tapa, y la impresora no sabe qué es adentro y qué es afuera.",
    comoVerlo: "En el visor 3D, «Ver problemas» te marca dónde está el borde abierto.",
    arreglo: "Repasá con la herramienta Línea (L) el borde donde falta la cara: SketchUp la crea sola.",
  },
  {
    nombre: "Caras al revés",
    queEs: "Caras que muestran el lado de adentro hacia afuera.",
    comoVerlo: "Desde afuera se ven grises o azules en vez de blancas.",
    arreglo: "Seleccioná la cara → clic derecho → Invertir caras. Abrí «Caras al revés», con fotos.",
  },
  {
    nombre: "Muros o techos de una sola cara",
    queEs: "Una superficie sin espesor (0 mm). Se ve como un muro, pero no tiene nada de material.",
    comoVerlo: "Al mirarlo de costado es solo una línea.",
    arreglo: "Dale espesor con Empujar/Tirar (P), respetando el mínimo de la tabla de espesores.",
  },
  {
    nombre: "Caras sueltas adentro",
    queEs: "Restos de dibujo que quedaron dentro de un volumen (una cara que divide el interior, líneas de construcción).",
    comoVerlo: "Con Vista → Estilo de cara → Rayos X se ven las caras que hay adentro.",
    arreglo: "Entrá al grupo (doble clic) y borrá las caras y líneas de adentro.",
  },
  {
    nombre: "Cosas que no se imprimen",
    queEs: "Personas 2D, árboles planos, textos, cotas, imágenes o líneas sueltas.",
    comoVerlo: "Suelen ser caras sin espesor o elementos de otra capa (etiqueta).",
    arreglo: "Borralos antes de exportar. Si querés árboles o personas, consultanos.",
  },
  {
    nombre: "Piezas paradas finas o en el aire",
    queEs: "No es un error, pero obliga a usar soportes: tarda más y sale más caro.",
    comoVerlo: "El visor 3D te dice qué piezas conviene acostar o cortar.",
    arreglo: "Separá en grupos aparte las plantas, el techo y las fachadas finas.",
  },
];

export function ErroresComunesSTL() {
  return (
    <section className="relative z-10 mx-auto mt-24 max-w-6xl">
      <Encabezado id="errores" paso={6} titulo="Errores comunes y cómo arreglarlos">
        Son los errores que más vemos en los archivos que nos llegan. El visor 3D te marca dónde están, pero se arreglan
        en SketchUp: así tu maqueta sale exactamente como la modelaste.
      </Encabezado>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {errores.map((error) => (
          <article
            key={error.nombre}
            className="flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-soft)]"
          >
            <h3 className="text-lg font-black">{error.nombre}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{error.queEs}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              <strong className="text-[var(--text-main)]">👀 Cómo te das cuenta:</strong> {error.comoVerlo}
            </p>
            <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
              <strong>🔧 Cómo se arregla:</strong> {error.arreglo}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const pasosExportar = [
  {
    titulo: "Exportá un STL",
    lista: [
      "En SketchUp: Archivo → Exportar → Modelo 3D.",
      "En «Tipo», elegí STL (*.stl).",
      "En Opciones: NO marques «Exportar solo la selección» (así va todo en un archivo) y elegí unidades en Metros.",
    ],
  },
  {
    titulo: "Miralo en el visor 3D",
    lista: [
      "Abrí el visor y subí tu STL.",
      "Elegí la escala: ves el tamaño real de la maqueta sobre la cama de la impresora.",
      "Si hay errores, te los marca para que los corrijas en SketchUp.",
    ],
  },
  {
    titulo: "Envialo para cotizar",
    lista: [
      "En Cotizar subí ese único archivo.",
      "Elegí la escala, el color y la fecha.",
      "Te mandamos el presupuesto. Si algo no está bien, te avisamos antes de imprimir.",
    ],
  },
];

export function ExportarYEnviar() {
  return (
    <section className="relative z-10 mx-auto mt-24 max-w-6xl">
      <Encabezado id="exportar" paso={7} titulo="Exportar y enviar, en 3 pasos">
        ¿No te sale exportarlo? Mandá el SKP y listo: lo pasamos nosotros.
      </Encabezado>
      <div className="grid gap-5 md:grid-cols-3">
        {pasosExportar.map((paso, indice) => (
          <article key={paso.titulo} className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-soft)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
              {indice + 1}
            </span>
            <h3 className="mt-4 text-lg font-black">{paso.titulo}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
              {paso.lista.map((linea) => (
                <li key={linea}>• {linea}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <VideoTutorial
          id="cySYVL3GgVs"
          titulo="Preparar un objeto en SketchUp para imprimirlo en 3D"
          canal="Plastik Electrik"
          descripcion="Cómo dejar el modelo listo en SketchUp antes de exportarlo."
        />
        <VideoTutorial
          id="IugBfYy_XzQ"
          titulo="Importar y exportar archivos STL en SketchUp"
          canal="17 Super Profes"
          descripcion="El paso de exportar el STL, explicado despacio."
        />
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/preparador-3d" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
          Abrir el visor 3D
        </Link>
        <Link
          href="/tutorial-avanzado"
          className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
        >
          Exportar paso a paso, con fotos
        </Link>
      </div>
    </section>
  );
}
