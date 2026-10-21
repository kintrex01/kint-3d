import Link from "next/link";

type Pregunta = { pregunta: string; respuesta: string };

/* Agrupadas por tema: así se encuentra rápido lo que se busca. */
const TEMAS: { titulo: string; emoji: string; preguntas: Pregunta[] }[] = [
  {
    titulo: "Archivos y maquetas",
    emoji: "📐",
    preguntas: [
      {
        pregunta: "¿Qué archivos puedo enviar?",
        respuesta:
          "Podés enviar archivos STL o SKP. Si el archivo pesa más de 50 MB, completá igualmente la solicitud y luego envialo por WhatsApp indicando tu número de pedido.",
      },
      {
        pregunta: "¿Necesito saber sobre impresión 3D?",
        respuesta:
          "No. Si es tu primera vez, en /cotizar tocá «Sí, es mi primera vez» y te explicamos cómo preparar el modelo. Igual revisamos cada archivo antes de imprimir y te orientamos con la escala, el material y la configuración.",
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
        pregunta: "¿Qué tamaño máximo puede tener mi modelo?",
        respuesta:
          "Contamos con impresoras con volúmenes de impresión de aproximadamente 18 × 18 × 18 cm y 30 × 30 × 30 cm. Si tu modelo supera estas dimensiones, podemos evaluar dividirlo en varias partes para imprimirlas por separado y unirlas posteriormente.",
      },
      {
        pregunta: "¿Cuál es el espesor mínimo que puede imprimirse?",
        respuesta:
          "Como referencia técnica, una boquilla de 0,2 mm permite trabajar con detalles más pequeños que una boquilla de 0,4 mm. Sin embargo, el espesor mínimo recomendable depende de la geometría, la escala y la resistencia que necesite cada pieza. Revisaremos el modelo antes de imprimirlo.",
      },
      {
        pregunta: "¿Qué materiales y colores utilizan?",
        respuesta:
          "Trabajamos principalmente con PLA y PLA+, en más de 15 colores. Podés elegir uno o varios e indicar en los comentarios qué piezas van con cada uno. En el inicio, en «Paleta Kint», está la foto real de todos los carretes.",
      },
      {
        pregunta: "¿Puedo reemplazar el archivo después de enviarlo?",
        respuesta:
          "Sí, mientras el pedido todavía esté en estado Recibido. Desde el seguimiento podés reemplazar o eliminar archivos antes de que preparemos el presupuesto. Una vez presupuestado, los archivos quedan bloqueados y cualquier cambio se coordina con Kint 3D.",
      },
    ],
  },
  {
    titulo: "Presupuesto, pagos y tiempos",
    emoji: "💳",
    preguntas: [
      {
        pregunta: "¿La cotización tiene costo?",
        respuesta: "No. Revisamos el archivo y preparamos el presupuesto sin costo y sin compromiso.",
      },
      {
        pregunta: "¿Qué incluye el presupuesto?",
        respuesta:
          "Incluye el material, el tiempo de impresión, la preparación del archivo, correcciones menores, los reintentos de impresión que puedan ser necesarios y los servicios adicionales seleccionados.",
      },
      {
        pregunta: "¿Cómo funciona el pago?",
        respuesta:
          "Después de elegir un presupuesto podés pagar una seña (un porcentaje del total) o el importe total. La impresión comienza únicamente cuando confirmamos el pago.",
      },
      {
        pregunta: "¿Cuánto demora un pedido?",
        respuesta:
          "Depende del tamaño, la cantidad de piezas, el nivel de detalle, la configuración elegida y la demanda del momento. Si tenés una fecha límite, indicala en la solicitud para tenerla en cuenta al presupuestar.",
      },
      {
        pregunta: "¿Puedo pedirlo urgente?",
        respuesta:
          "Sí, cuando hay cupos: al cotizar marcá «Pedido prioritario». Tiene un recargo que se muestra ahí mismo antes de enviar, y pasa adelante en la fila de impresión.",
      },
      {
        pregunta: "¿Cómo sé en qué etapa está mi pedido?",
        respuesta:
          "Te avisamos por correo cada vez que cambia de etapa (Recibido, Presupuestado, En impresión, Terminado y Entregado). También lo podés ver en «Consultar pedido» con tu número de pedido y tu correo, o en «Mi cuenta».",
      },
    ],
  },
  {
    titulo: "Entregas",
    emoji: "📦",
    preguntas: [
      {
        pregunta: "¿Cómo funcionan las entregas y los envíos?",
        respuesta:
          "La entrega es gratuita únicamente en FADU, de lunes a viernes y en horario de la mañana. Los envíos fuera de FADU, fuera de ese horario, o coordinados para sábados, domingos o días sin clases tienen un costo adicional. El importe se informa antes de coordinar.",
      },
      {
        pregunta: "¿Puedo elegir el día de entrega?",
        respuesta:
          "Sí. Al cotizar elegís los días que te sirven; los días en que no entregamos aparecen bloqueados en el calendario. Después lo coordinamos por WhatsApp.",
      },
    ],
  },
  {
    titulo: "Tienda, llaveros y chapitas",
    emoji: "🛍️",
    preguntas: [
      {
        pregunta: "¿Qué hay en la tienda?",
        respuesta:
          "Productos impresos por nosotros, listos para pedir: algunos vienen en colores fijos y otros los armás a tu gusto. Comprando varias unidades del mismo producto el precio baja (por mayor y gran por mayor): lo ves en cada producto.",
      },
      {
        pregunta: "¿Cómo funciona el llavero con nombre?",
        respuesta:
          "Escribís el nombre (y una segunda línea si querés), elegís la letra, el tamaño, el fondo (Contorno, Placa o Solo letras), el borde, la separación y los colores de cada parte, incluso el del anillo. Lo ves en 3D y lo podés girar antes de agregarlo al carrito.",
      },
      {
        pregunta: "¿Y la chapita para mascotas?",
        respuesta:
          "Es plana, con el nombre y un borde de color adelante, y la huellita si la querés. Atrás va el teléfono, grabado o relleno de otro color, para que quien la encuentre te pueda llamar. Viene en hueso, círculo o corazón.",
      },
      {
        pregunta: "¿Los colores de la vista 3D son exactos?",
        respuesta:
          "Son aproximados: cada pantalla los muestra un poco distinto. En el personalizador tocá «Ver los colores en la vida real» y vas a ver la foto de todos los carretes.",
      },
      {
        pregunta: "¿Cómo pago y sigo una compra de la tienda?",
        respuesta:
          "Al confirmar la compra te mostramos cómo pagar (una seña o el total). Después la seguís en «Consultar pedido» con el número de compra y tu correo, igual que una maqueta.",
      },
      {
        pregunta: "¿Lo envuelven para regalo?",
        respuesta:
          "Por ahora no: los productos se entregan sin envoltorio, moño ni caja de regalo.",
      },
    ],
  },
  {
    titulo: "Cuenta, puntos y premios",
    emoji: "🎁",
    preguntas: [
      {
        pregunta: "¿Necesito crear una cuenta?",
        respuesta:
          "No hace falta: se crea sola con tu primer pedido o compra. Para entrar a «Mi cuenta» te mandamos un código al correo, sin contraseñas. La sesión queda abierta un día.",
      },
      {
        pregunta: "¿Qué son los Puntos Kint?",
        respuesta:
          "Con cada pedido entregado te devolvemos un porcentaje de lo que pagaste en puntos. Los podés usar como descuento en un pedido desde el seguimiento, o canjearlos por premios en la Ruleta Kint cuando quieras.",
      },
      {
        pregunta: "¿Cómo funciona la Ruleta Kint?",
        respuesta:
          "Entrás con tu cuenta y la girás una vez cada 2 días. Los premios cambian todos los días: puntos, descuentos, regalos de la tienda y hasta tiradas extra. Los premios que ganás te llegan por correo y quedan en «Mis premios».",
      },
      {
        pregunta: "¿Cómo uso un premio o un código de descuento?",
        respuesta:
          "Escribilo en «Código de descuento o premio» al cotizar o desde el seguimiento del pedido. Los premios de la ruleta (VALE-…) se reclaman en cualquier etapa del pedido. Los códigos con % solo se aplican mientras el pedido está en Recibido. Todos vencen a los 30 días.",
      },
      {
        pregunta: "¿Qué es el Top Kint?",
        respuesta:
          "Es el ranking público de los clientes que más acumulan con Kint. Aparecés con tu nombre público; si preferís no aparecer, lo apagás desde «Mi cuenta».",
      },
      {
        pregunta: "¿Puedo cambiar mi nombre público?",
        respuesta:
          "Sí, desde «Mi cuenta». Lo podés cambiar una vez cada 7 días: es el que se ve en tus reseñas y en el Top Kint.",
      },
      {
        pregunta: "¿Puedo dejar una reseña?",
        respuesta:
          "Sí. Cuando recibís tu pedido te invitamos a contarnos qué te pareció, y la podés editar durante las 24 horas siguientes.",
      },
    ],
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
          Todo lo que tenés que saber
        </p>

        <h2 className="mt-5 text-3xl font-black sm:text-4xl">
          Preguntas frecuentes
        </h2>

        <p className="mx-auto mt-5 max-w-3xl leading-8 text-[var(--text-muted)]">
          Archivos, pagos, entregas, la tienda, los llaveros y chapitas,
          tu cuenta, los puntos y la Ruleta Kint.
        </p>

        {/* Atajos a cada tema */}
        <nav aria-label="Temas" className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2">
          {TEMAS.map((tema, indice) => (
            <a
              key={tema.titulo}
              href={`#preguntas-${indice}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3.5 py-2 text-xs font-bold text-[var(--text-main)] transition hover:border-blue-500/60"
            >
              <span aria-hidden>{tema.emoji}</span>
              {tema.titulo}
            </a>
          ))}
        </nav>
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

      {TEMAS.map((tema, indice) => (
        <div key={tema.titulo} id={`preguntas-${indice}`} className="mt-12 scroll-mt-28">
          <h3 className="mb-4 flex items-center gap-2.5 text-lg font-black">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
              {tema.emoji}
            </span>
            {tema.titulo}
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
          </h3>

          <div className="grid items-start gap-3 lg:grid-cols-2">
            {tema.preguntas.map((item) => (
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
        </div>
      ))}

      <div className="mt-14 text-center">
        <p className="text-sm leading-7 text-[var(--text-muted)]">
          ¿Todavía te quedó alguna duda? Podés enviarla
          junto con tu solicitud de cotización.
        </p>

        <Link
          href="/cotizar"
          className="mt-7 inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-red-600 bg-red-600 px-8 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-transparent hover:text-red-600"
        >
          Cotizar mi modelo →
        </Link>
      </div>
    </section>
  );
}
