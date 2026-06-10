import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import ResenasInicio from "../components/ResenasInicio";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text-main)] transition">
      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          

          <h1 className="translate-x-3 text-6xl font-black uppercase tracking-[0.25em]">
            KINT
            </h1>

          <p className="mt-2 ml-3 text-4xl font-light tracking-[0.35em] text-[var(--text-muted)]">
            3D
            </p>
        </div>

        <div className="mb-8 h-[2px] w-20 bg-red-600" />

        <p className="max-w-2xl text-sm font-medium uppercase leading-8 tracking-[0.35em] text-[var(--text-main)] sm:text-base">
          Impresión 3D para arquitectura, prototipado y diseño.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link href="/cotizar">
            <button className="min-w-64 border border-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-red-600 transition hover:bg-red-600 hover:text-white">
              Cotizar ahora
            </button>
          </Link>

          <Link href="/seguimiento">
  <button className="min-w-64 border border-[var(--border-color)] px-10 py-5 text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-main)] transition hover:border-red-600 hover:text-red-600">
    Consultar pedido
  </button>
</Link>

<a
  href="#preguntas"
  className="border border-[var(--border-color)] px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] transition hover:border-red-600 hover:text-red-600"
>
  Preguntas frecuentes
</a>

          <a
            href="https://www.instagram.com/kint.3d/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="min-w-64 border border-[var(--border-color)] px-10 py-5 text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-main)] transition hover:border-red-600 hover:text-red-600">
              Ver trabajos
            </button>
          </a>
        </div>

        <div className="mt-20 flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <div className="h-9 w-5 rounded-full border border-[var(--border-color)]" />
          <span className="text-xl leading-none">⌄</span>
        </div>
      </section>

      <section className="border-t border-[var(--border-color)] px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Nuestros servicios
          </p>

          <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

          <div className="grid gap-12 md:grid-cols-3">
            <div className="px-8">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Arquitectura
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Maquetas y modelos arquitectónicos con máximo detalle.
              </p>
            </div>

            <div className="px-8 md:border-x md:border-[var(--border-color)]">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Prototipado
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Prototipos funcionales para validar ideas y proyectos.
              </p>
            </div>

            <div className="px-8">
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.35em]">
                Personalizados
              </h2>
              <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Piezas y proyectos a medida según tus necesidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Cómo trabajamos
          </p>

          <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

          <div className="grid gap-12 md:grid-cols-4">
            {[
              ["01", "Enviás tu archivo", "Subí tu archivo 3D y contanos tu idea."],
              ["02", "Revisamos tu modelo", "Analizamos el archivo, detectamos posibles problemas y preparamos el presupuesto."],
              ["03", "Imprimimos", "Una vez aprobado, comenzamos la impresión."],
              ["04", "Entregamos", "Te entregamos el modelo donde lo necesites."],
            ].map(([numero, titulo, texto]) => (
              <div key={numero}>
                <p className="mb-3 text-4xl font-black text-red-600">
                  {numero}
                </p>
                <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.3em]">
                  {titulo}
                </h3>
                <p className="text-sm leading-7 text-[var(--text-muted)]">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <Link href="/cotizar">
              <button className="border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600">
                Iniciar cotización
              </button>
            </Link>
          </div>

<section id="preguntas" className="border-t border-[var(--border-color)] px-6 py-24">
  <div className="mx-auto max-w-5xl">
    <div className="mb-16 text-center">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
        Preguntas frecuentes
      </p>

      <div className="mx-auto mb-6 h-[2px] w-12 bg-red-600" />

      <p className="text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Información útil antes de cotizar.
      </p>

      <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
  ¿Primera vez imprimiendo en 3D? No te preocupes. Revisamos cada archivo antes de imprimir y podemos ayudarte a elegir la mejor escala, configuración y materiales para tu proyecto.
</p>
    </div>

    <div className="grid gap-5">
      {[
        {
          pregunta: "¿Qué archivos puedo enviar?",
          respuesta:
            "Podés enviar archivos STL o SKP. Si tu archivo pesa más de 50 MB, podés enviar la solicitud igualmente y luego enviarnos el archivo por WhatsApp.",
        },
        {
          pregunta: "¿Tengo que mandar el modelo a escala?",
          respuesta:
            "No necesariamente. Si ya conocés la escala, podés indicarla en el formulario. Si no estás seguro, podemos ayudarte a definirla.",
        },
        {
          pregunta: "¿Ustedes escalan el modelo?",
          respuesta:
            "Sí. Podemos adaptar el modelo a la escala que necesites antes de imprimir.",
        },
        {
          pregunta: "¿Puedo enviar varios archivos?",
          respuesta:
            "Sí. Podés subir varios archivos en una misma cotización.",
        },
        {
          pregunta: "¿Qué pasa si mi archivo tiene errores?",
          respuesta:
            "Todos los modelos son revisados antes de presupuestar. Si encontramos errores o problemas de impresión, te lo informaremos antes de comenzar el trabajo.",
        },
        {
          pregunta: "¿Cómo me avisan si mi impresión terminó?",
          respuesta:
            "Recibirás una notificación automática por correo electrónico cuando tu pedido cambie de estado. También podés consultar el avance en cualquier momento desde la sección Consultar pedido.",
        },
        {
          pregunta: "¿Puedo modificar o reemplazar archivos después de enviar el pedido?",
          respuesta:
            "Sí, mientras el pedido no haya avanzado demasiado en el proceso. Si necesitás reemplazar un archivo, podés comunicarte con nosotros y te indicaremos cómo hacerlo.",
        },
        {
          pregunta: "¿Qué pasa si no tengo experiencia con impresión 3D?",
          respuesta:
            "No es necesario tener conocimientos técnicos. Podemos ayudarte a elegir la escala, materiales y configuración más adecuada para tu proyecto.",
        },
        {
          pregunta: "¿Cuánto demora un pedido?",
          respuesta:
            "Depende del tamaño, nivel de detalle y cantidad de piezas. Si tenés una fecha límite, podés indicarla en el formulario y la tendremos en cuenta al presupuestar.",
        },
        {
          pregunta: "¿Cómo funciona el pago?",
          respuesta:
            "Una vez aprobado el presupuesto, podés pagar una seña del 20% o el importe total. El resto puede abonarse más adelante si elegiste la opción de seña.",
        },
        {
          pregunta: "¿Qué incluye el presupuesto?",
          respuesta:
            "Incluye material, tiempo de impresión, preparación del archivo, correcciones menores, posibles fallas de impresión y servicios adicionales seleccionados.",
        },
        {
          pregunta: "¿Puedo pedir varios colores en una misma impresión?",
          respuesta:
            "Sí. Podés seleccionar varios colores e indicar en los comentarios qué partes querés imprimir en cada color.",
        },
        {
          pregunta: "¿Puedo seguir el estado de mi pedido?",
          respuesta:
            "Sí. Al enviar tu solicitud recibirás un número de pedido que podrás utilizar en la sección Consultar pedido para seguir el avance de tu trabajo.",
        },
        {
  pregunta: "¿Qué materiales utilizan?",
  respuesta:
    "Trabajamos principalmente con PLA y PLA+, materiales ideales para maquetas, prototipos y piezas decorativas. Si tu proyecto requiere otro material, consultanos antes de cotizar.",
},
{
  pregunta: "¿Hacen envíos?",
  respuesta:
    "Sí. Podemos coordinar retiro o envío según tu ubicación. El costo de envío no está incluido en el presupuesto salvo que se indique lo contrario.",
},
{
  pregunta: "¿La cotización tiene costo?",
  respuesta:
    "No. Revisamos tu archivo y te enviamos un presupuesto sin costo y sin compromiso.",
},
      ].map((item) => (
        <div
          key={item.pregunta}
          className="rounded-2xl border border-[var(--border-color)] p-6"
        >
          <h3 className="mb-3 text-lg font-bold text-red-600">
            {item.pregunta}
          </h3>

          <p className="text-sm leading-7 text-[var(--text-muted)]">
            {item.respuesta}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

        </div>
      </section>
      <section className="border-t border-[var(--border-color)] px-6 py-24">
  <div className="mx-auto max-w-6xl text-center">
    <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
      Reseñas verificadas
    </p>

    <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

    <ResenasInicio />
  </div>
</section>
<a
  href="https://wa.me/59892023382"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-110"
  aria-label="WhatsApp"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className="h-7 w-7"
  >
    <path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L0 32l8.3-2.2c2.3 1.2 4.9 1.8 7.7 1.8 8.6 0 15.6-7 15.6-15.6S24.6.4 16 .4zm0 28.3c-2.4 0-4.8-.6-6.9-1.9l-.5-.3-4.9 1.3 1.3-4.8-.3-.5C3.4 20.6 2.8 18.3 2.8 16 2.8 8.8 8.8 2.8 16 2.8S29.2 8.8 29.2 16 23.2 28.7 16 28.7zm7.2-9.8c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.9.2-.2.4-1 1.2-1.2 1.4-.2.2-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.3-.6.1-.2 0-.5 0-.7-.1-.2-.9-2.2-1.2-3-.3-.8-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.3.4-1.3 1.3-1.3 3.2 0 1.9 1.4 3.7 1.6 4 .2.3 2.8 4.3 6.9 6 .9.4 1.7.7 2.3.9 1 .3 1.9.3 2.6.2.8-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z"/>
  </svg>
</a>

    </main>
  );
}