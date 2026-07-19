const preguntas = [
  {
    pregunta: "¿Qué archivos puedo enviar?",
    respuesta:
      "Podés enviar archivos STL o SKP. Si el archivo pesa más de 50 MB, completá igualmente la solicitud y luego envialo por WhatsApp indicando tu número de pedido.",
  },
  {
    pregunta: "¿El modelo tiene que estar a escala?",
    respuesta:
      "No necesariamente. Podés indicar la escala deseada en la cotización. Si ya preparaste el archivo a escala, revisaremos igualmente sus medidas antes de presupuestar.",
  },
  {
    pregunta: "¿Pueden escalar mi modelo?",
    respuesta:
      "Sí. Para escalarlo correctamente necesitamos conocer la escala deseada o al menos una medida real de referencia del proyecto.",
  },
  {
    pregunta: "¿Puedo enviar varios archivos o piezas?",
    respuesta:
      "Sí. Podés subir varios archivos dentro de una misma solicitud. También podés enviar un STL que contenga varias piezas separadas y ordenadas.",
  },
  {
    pregunta: "¿Qué pasa si el archivo tiene errores?",
    respuesta:
      "Revisamos cada modelo antes de preparar el presupuesto. Si encontramos caras invertidas, piezas flotantes, espesores insuficientes, problemas de escala u otros errores, te avisaremos antes de imprimir.",
  },
  {
    pregunta: "¿Necesito saber sobre impresión 3D?",
    respuesta:
      "No. El tutorial explica cómo preparar el modelo y nosotros revisamos cada archivo antes de imprimir. También podemos orientarte con la escala, el material y la configuración.",
  },
  {
    pregunta: "¿Qué tamaño máximo puede tener mi modelo?",
    respuesta:
      "Trabajamos con volúmenes de impresión de referencia de 180 × 180 × 180 mm, 250 × 250 × 250 mm y 300 × 300 × 300 mm. La disponibilidad depende del equipo y de la configuración necesaria para tu pedido.",
  },
  {
    pregunta: "¿Cuál es el espesor mínimo que puede imprimirse?",
    respuesta:
      "Como referencia técnica, una boquilla de 0,2 mm permite líneas desde 0,2 mm y una boquilla de 0,4 mm desde 0,4 mm. Sin embargo, algunas paredes deben ser más gruesas para que la pieza tenga suficiente resistencia.",
  },
  {
    pregunta: "¿Cuánto demora un pedido?",
    respuesta:
      "Depende del tamaño, la cantidad de piezas, el nivel de detalle, la configuración elegida y la demanda del momento. Si tenés una fecha límite, indicala en la solicitud para tenerla en cuenta al presupuestar.",
  },
  {
    pregunta: "¿Cómo funciona el pago?",
    respuesta:
      "Después de elegir un presupuesto podés pagar una seña del 20% o el importe total. La impresión comienza únicamente cuando confirmamos el pago.",
  },
  {
    pregunta: "¿Qué incluye el presupuesto?",
    respuesta:
      "Incluye el material, el tiempo de impresión, la preparación del archivo, correcciones menores, posibles fallas de impresión y los servicios adicionales seleccionados.",
  },
  {
    pregunta: "¿Qué materiales y colores utilizan?",
    respuesta:
      "Trabajamos principalmente con PLA y PLA+. Podés seleccionar uno o varios colores e indicar en los comentarios qué piezas querés imprimir con cada uno.",
  },
  {
    pregunta: "¿Puedo reemplazar el archivo después de cotizar?",
    respuesta:
      "Sí, siempre que la impresión todavía no haya comenzado. Un cambio de archivo, tamaño, escala o cantidad de piezas puede requerir actualizar el presupuesto.",
  },
  {
    pregunta: "¿Cómo sé cuándo está terminado mi pedido?",
    respuesta:
      "Recibirás avisos por correo electrónico cuando el pedido cambie de estado. También podés consultar el avance desde la sección Consultar pedido utilizando tu número y código de seguimiento.",
  },
  {
    pregunta: "¿Cómo funcionan las entregas y los envíos?",
    respuesta:
      "La entrega es gratuita únicamente en FADU, de lunes a viernes y en horario de la mañana. Los envíos fuera de FADU, fuera de ese horario, o coordinados para sábados, domingos o días sin clases tienen un costo adicional. El importe se informa antes de coordinar.",
  },
  {
    pregunta: "¿La cotización tiene costo?",
    respuesta:
      "No. Revisamos el archivo y preparamos el presupuesto sin costo y sin compromiso.",
  },
];

export default function PreguntasFrecuentes() {
  return (
    <section
      id="preguntas"
      className="relative z-10 mx-auto max-w-6xl scroll-mt-28 border-t border-[var(--border-color)] py-24"
    >
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.38em] text-red-600">
          Antes de cotizar
        </p>

        <h2 className="mt-5 text-3xl font-black sm:text-4xl">
          Preguntas frecuentes
        </h2>

        <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">
          Información importante sobre archivos, escalas,
          impresión, pagos y entregas.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 text-center sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">
          Entrega sin costo
        </p>

        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-[var(--text-main)]">
          Únicamente en FADU, de lunes a viernes y durante
          el horario de la mañana.
        </p>

        <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-[var(--text-muted)]">
          Los demás envíos, incluyendo sábados, domingos,
          días sin clases y horarios diferentes, tienen
          un costo adicional.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-3 lg:grid-cols-2">
        {preguntas.map((item) => (
          <details
            key={item.pregunta}
            className="group overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--shadow-soft)] transition duration-300 open:border-blue-500/50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-blue-500/5 sm:px-6">
              <span className="text-sm font-black leading-6 text-[var(--text-main)]">
                {item.pregunta}
              </span>

              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-500/40 text-lg font-light leading-none text-blue-500 transition duration-300 group-open:rotate-45 group-open:bg-blue-500 group-open:text-white"
              >
                +
              </span>
            </summary>

            <div className="border-t border-[var(--border-color)] px-5 pb-6 pt-5 sm:px-6">
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                {item.respuesta}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm leading-7 text-[var(--text-muted)]">
          ¿Todavía te quedó alguna duda? Podés enviarla
          junto con tu solicitud de cotización.
        </p>
      </div>
    </section>
  );
}