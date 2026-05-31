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

        {/* Escala */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Escala de impresión
          </label>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>1:50</option>
            <option>1:75</option>
            <option>1:100</option>
            <option>1:200</option>
            <option>1:250</option>
            <option>1:500</option>
            <option>1:1000</option>
          </select>
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Color de impresión
          </label>

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

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>Sí, quiero incluir este servicio</option>
            <option>No requiero este servicio</option>
            <option>
              Quiero presupuesto con y sin este servicio
            </option>
          </select>
        </div>

        {/* Boquilla */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Boquilla
          </label>

          <select className="w-full rounded-xl border border-zinc-500 p-4 text-black">
            <option>
              0.2 mm — Máximo detalle
            </option>

            <option>
              0.4 mm — Mejor equilibrio
            </option>
          </select>
        </div>

        {/* Calidad */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            Calidad / Económico
          </label>

          <input
            type="range"
            min="1"
            max="5"
            className="w-full"
          />
        </div>

        {/* Fecha */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold text-black">
            ¿Para cuándo necesitas la pieza?
          </label>

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

          <textarea
            className="w-full rounded-xl border border-zinc-500 p-4 text-black"
            rows={5}
            placeholder="Escribe detalles importantes..."
          />
        </div>

        <button className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white transition hover:opacity-90">
          Enviar Cotización
        </button>
      </div>
    </main>
  );
}