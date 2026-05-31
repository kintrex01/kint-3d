export default function Cotizar() {
  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-xl">
        <h1 className="mb-8 text-4xl font-bold text-black">
          Configurar impresión 3D
        </h1>

        {/* Nombre */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Nombre o Apodo
          </label>

          <input
            className="w-full rounded-xl border border-zinc-500 p-4 text-black"
            placeholder="Tu nombre"
          />
        </div>

        {/* Archivo 3D */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Archivo 3D
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Subí el modelo que deseas imprimir.
  Se aceptan archivos STL y SketchUp (.SKP).
</p>

          <input
            type="file"
            accept=".stl,.skp"
            className="w-full rounded-xl border border-zinc-500 p-4 text-black"
          />

          <p className="mt-2 text-sm text-zinc-600">
            Formatos aceptados: STL y SketchUp (.SKP).
          </p>
        </div>

        {/* Escala */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Escala de impresión
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Selecciona la escala deseada para tu maqueta o pieza.
  Si no encuentras la escala que necesitas,
  utiliza la opción "Otra escala".
</p>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>1:50</option>
            <option>1:75</option>
            <option>1:100</option>
            <option>1:200</option>
            <option>1:250</option>
            <option>1:500</option>
            <option>1:1000</option>
            <option>Otra escala</option>
          </select>

          <input
            className="mt-3 w-full rounded-xl border border-zinc-500 p-4 text-black"
            placeholder="Si elegiste otra escala, escribila acá. Ej: 1:125"
          />
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Color de impresión
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Selecciona el color principal para tus piezas impresas.
</p>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>Blanco</option>
            <option>Negro</option>
            <option>Rojo</option>
            <option>Amarillo</option>
            <option>Naranja</option>
            <option>Azul</option>
            <option>Verde</option>
            <option>Cristal</option>
          </select>
        </div>

       {/* Armado */}
<div className="mb-6">
  <label className="mb-2 block font-semibold text-black">
    Armado de piezas
  </label>

  <p className="mb-3 text-sm text-zinc-600">
    Incluye el pegado de piezas y la remoción de soportes.
    Nos encargamos de entregar el producto completamente
    terminado y ensamblado.
    Este servicio tiene un costo aproximado entre $150 y $250
    según el tamaño y la cantidad de piezas.
  </p>

  <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
    <option>Sí, quiero incluir este servicio</option>
    <option>No requiero este servicio</option>
  </select>
</div>

        {/* Alisado */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Alisado
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Este proceso suaviza las superficies superiores de la pieza
  para obtener un mejor acabado visual.
  Requiere más tiempo de impresión y postprocesado,
  por lo que incrementa el costo final.
  Si se utiliza boquilla de 0.2 mm la diferencia suele ser mínima.
</p>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>Sí, quiero incluir este servicio</option>
            <option>No requiero este servicio</option>
            <option>Quiero presupuesto con y sin este servicio</option>
          </select>
        </div>

        {/* Boquilla */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Boquilla
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Un mayor diámetro aumenta la velocidad de impresión,
  pero reduce el nivel de detalle.
  Un diámetro menor produce impresiones más lentas
  pero con mucha más precisión.
</p>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>0.2 mm — Máximo detalle</option>
            <option>0.4 mm — Mejor equilibrio</option>
          </select>
        </div>

        {/* Calidad */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Calidad / Económico
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Utiliza este control para indicar qué priorizas.
  Hacia "Calidad" obtendrás un mejor acabado.
  Hacia "Económico" se optimiza el presupuesto reduciendo
  la calidad final de la pieza.
</p>

          <div className="flex items-center justify-between text-sm font-medium text-zinc-700">
            <span>Económico</span>
            <span>Calidad</span>
          </div>

          <input type="range" min="1" max="5" className="w-full" />
        </div>

        {/* Fecha */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            ¿Para cuándo necesitas la pieza?
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Completa esta opción únicamente si necesitas la pieza
  para una fecha u hora específica.
</p>

          <input
            type="datetime-local"
            className="w-full rounded-xl border border-zinc-500 p-4 text-black"
          />
        </div>

        {/* Comentarios */}
        <div className="mb-8">
          <label className="mb-2 block font-semibold text-black">
            Comentarios
          </label>
          <p className="mb-3 text-sm text-zinc-600">
  Ejemplo: "Necesito que los pilares salgan unidos a las vigas"
  o "Quiero la pieza más pequeña roja y la más grande verde".
</p>

          <textarea
            className="w-full rounded-xl border border-zinc-500 p-4 text-black"
            rows={5}
            placeholder="Escribe detalles importantes..."
          />
        </div>

{/* Presupuesto */}
<div className="mb-8 rounded-2xl border border-zinc-300 bg-zinc-50 p-6">
  <h2 className="mb-4 text-lg font-bold text-black">
    Presupuesto
  </h2>

  <p className="mb-6 text-sm text-zinc-700">
    Para armar el precio final de tu pieza, sumamos todo lo que
    entra en juego antes, durante y después de que nos des el visto
    bueno para arrancar.
  </p>

  <h3 className="mb-4 text-base font-semibold text-black">
    ¿Qué estás pagando?
  </h3>

  <div className="space-y-3 text-sm text-zinc-700">
    <div>
      <strong className="text-black">
        • Hora de uso de la impresora:
      </strong>
      <p>Las horas dedicadas exclusivamente a imprimir la pieza.</p>
    </div>

    <div>
      <strong className="text-black">
        • Tipo de material:
      </strong>
      <p>Tipo de filamento utilizado (PLA, PLA+, PETG).</p>
    </div>

    <div>
      <strong className="text-black">
        • Cantidad de material:
      </strong>
      <p>Peso en gramos del filamento consumido.</p>
    </div>

    <div>
      <strong className="text-black">
        • Correcciones menores:
      </strong>
      <p>Ajuste de detalles mínimos en el modelo.</p>
    </div>

    <div>
      <strong className="text-black">
        • Fondo de emergencia:
      </strong>
      <p>Costo extra por fallas de impresión o diseño.</p>
    </div>

    <div>
      <strong className="text-black">
        • Mano de obra:
      </strong>
      <p>Solo aplica si aceptas el servicio de armado.</p>
    </div>

    <div>
      <strong className="text-black">
        • Alisado:
      </strong>
      <p>Solo aplica si aceptas el servicio de alisado.</p>
    </div>
  </div>
</div>

        <button className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white transition hover:opacity-90">
          Enviar Cotización
        </button>
      </div>
    </main>
  );
}