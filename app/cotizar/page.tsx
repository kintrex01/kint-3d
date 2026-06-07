"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Cotizar() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [escala, setEscala] = useState("");
  const [escalaPersonalizada, setEscalaPersonalizada] = useState("");
  const [color, setColor] = useState<string[]>([]);
  const [armado, setArmado] = useState("");
  const [alisado, setAlisado] = useState("");
  const [boquilla, setBoquilla] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [numeroPedido, setNumeroPedido] = useState("");

  async function enviarPedido() {
  if (!nombre.trim()) {
    alert("Por favor, escribí tu nombre o apodo.");
    return;
  }

  if (!email.trim()) {
    alert("Por favor, ingresá un correo electrónico.");
    return;
  }

  if (!escala || color.length === 0 || !armado || !alisado || !boquilla) {
    alert("Por favor completá todas las opciones que dicen 'Seleccionar...'.");
    return;
  }

  setEnviando(true);

  try {
    const escalaFinal =
      escala === "Otra escala" ? escalaPersonalizada : escala;

    const archivosOriginales = [];

if (archivos.length > 0) {
  const firmaResponse = await fetch("/api/archivos-firma", {
    method: "POST",
    body: JSON.stringify({
      pedido: "cotizacion-temp",
      archivos: archivos.map((archivo) => ({
        nombre: archivo.name,
        size: archivo.size,
      })),
    }),
  });

  const firmaData = await firmaResponse.json();

  if (!firmaData.ok) {
    throw new Error(firmaData.error || "No se pudo preparar el archivo.");
  }

  for (let i = 0; i < archivos.length; i++) {
    const archivo = archivos[i];
    const firmado = firmaData.archivos[i];

    const { error: uploadError } = await supabase.storage
      .from("kint-archivos")
      .uploadToSignedUrl(
        firmado.ruta,
        firmado.token,
        archivo
      );

    if (uploadError) {
      throw new Error(
        `No se pudo subir ${archivo.name}: ${uploadError.message}`
      );
    }

    archivosOriginales.push({
      nombreArchivo: firmado.nombreArchivo,
      link: firmado.link,
      idDrive: firmado.ruta,
    });
  }
}

    const response = await fetch("/api/pedidos", {
      method: "POST",
      body: JSON.stringify({
        nombre,
        email,
        telefono,
        fechaEntrega,
        escala: escalaFinal,
        color: color.join(", "),
        armado,
        alisado,
        boquilla,
        comentarios,
        codigoDescuento,
        archivosOriginales,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || "El servidor no devolvió una respuesta válida.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Error al enviar el pedido");
    }

    setNombre("");
    setEmail("");
    setTelefono("");
    setFechaEntrega("");
    setEscala("");
    setEscalaPersonalizada("");
    setColor([]);
    setArmado("");
    setAlisado("");
    setBoquilla("");
    setComentarios("");
    setCodigoDescuento("");
    setArchivos([]);

    setNumeroPedido(data.pedido || "");
    setEnviado(true);
  } catch (error) {
    console.error(error);
    alert(
      error instanceof Error
        ? error.message
        : "Hubo un error al enviar el pedido."
    );
  }

  setEnviando(false);
}

if (enviado) {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
      <div className="fixed left-6 right-6 top-6 z-50 flex items-center justify-between">
  <Link href="/">
    <button className="flex items-center gap-1 text-3xl font-bold text-[var(--text-main)] transition hover:text-red-600">
      <span className="text-5xl leading-none">‹</span>
      <span>Inicio</span>
    </button>
  </Link>
      </div>

      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border-color)] text-4xl font-bold">
          ✓
        </div>

        <h1 className="mb-4 text-4xl font-bold text-[var(--text-main)]">
          Tu pedido fue enviado
        </h1>
        <div className="mb-6">
  <p className="text-sm uppercase tracking-widest text-[var(--text-muted)]">
    Número de pedido
  </p>

  <p className="mt-2 text-3xl font-bold text-[var(--text-main)]">
    {numeroPedido}
  </p>
</div>

        <p className="mb-8 max-w-xl text-lg text-[var(--text-muted)]">
          Recibimos tu solicitud correctamente. Pronto recibirás
          actualizaciones sobre el estado de tu pedido.
        </p>

        <Link href="/">
          <button className="rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white transition hover:opacity-90">
            Volver al inicio
          </button>
        </Link>
      </section>
    </main>
  );
}

return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
      <div className="fixed left-8 top-8 z-50">
        <Link href="/">
          <button className="flex items-center gap-1 text-2xl font-bold text-[var(--text-main)] transition hover:opacity-70">
            <span className="relative -top-1 text-6xl leading-none">‹</span>
            <span>Inicio</span>
          </button>
        </Link>
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl bg-[var(--card-bg)] p-10 shadow-xl">
        <h1 className="mb-8 text-4xl font-bold text-[var(--text-main)]">
          Configurar impresión 3D
        </h1>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Nombre o Apodo
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
            placeholder="Tu nombre"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Archivo 3D
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Subí el modelo que deseas imprimir. Se aceptan archivos STL y
            SketchUp (.SKP).
          </p>
          <input
            type="file"
            multiple
            accept=".stl,.skp"
            onChange={(e) => {
  if (e.target.files) {
    setArchivos(Array.from(e.target.files));
  }
}}
            className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Formatos aceptados: STL y SketchUp (.SKP).
          </p>
        </div>

<div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    Correo electrónico *
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Lo utilizaremos para enviarte presupuestos y actualizaciones del pedido.
  </p>

  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
    placeholder="ejemplo@gmail.com"
  />
</div>

<div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    WhatsApp (opcional)
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Si preferís que te contactemos por WhatsApp.
  </p>

  <input
    type="tel"
    value={telefono}
    onChange={(e) => setTelefono(e.target.value)}
    className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
    placeholder="+598 99 123 456"
  />
</div>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Fecha de entrega
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Indicá para cuándo necesitás la pieza. Si no tenés una fecha exacta,
            podés dejar este campo vacío.
          </p>
          <input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Escala de impresión
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Selecciona la escala deseada para tu maqueta o pieza. Si no
            encuentras la escala que necesitas, utiliza la opción "Otra escala".
          </p>
         <select
  value={escala}
  onChange={(e) => setEscala(e.target.value)}
  className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
    escala === "" ? "text-red-600" : "text-black"
  }`}
>
   <option value="">
    Seleccionar escala
  </option>
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
            value={escalaPersonalizada}
            onChange={(e) => setEscalaPersonalizada(e.target.value)}
            className="mt-3 w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
            placeholder="Si elegiste otra escala, escribila acá. Ej: 1:125"
          />
        </div>

        <div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    Color de impresión <span className="text-red-600">*</span>
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Podés elegir uno o varios colores.
  </p>

  <div className="grid gap-3 sm:grid-cols-2">
    {["Blanco", "Negro", "Rojo", "Amarillo", "Naranja", "Azul", "Verde", "Cristal"].map((opcion) => (
      <label
        key={opcion}
        className={`cursor-pointer rounded-xl border p-4 font-semibold transition ${
          color.includes(opcion)
            ? "border-red-600 bg-[#ffe5e5] text-red-600"
            : "border-[var(--border-color)] bg-white text-black hover:border-red-600"
        }`}
      >
        <input
          type="checkbox"
          checked={color.includes(opcion)}
          onChange={() => {
            setColor((actual) =>
              actual.includes(opcion)
                ? actual.filter((item) => item !== opcion)
                : [...actual, opcion]
            );
          }}
          className="mr-3"
        />
        {opcion}
      </label>
    ))}
  </div>
</div>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Armado de piezas
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Incluye el pegado de piezas y la remoción de soportes. Nos
            encargamos de entregar el producto completamente terminado y
            ensamblado. Este servicio tiene un costo aproximado entre $150 a
            $300 según el tamaño y la cantidad de piezas.
          </p>
          <select
  value={armado}
  onChange={(e) => setArmado(e.target.value)}
  className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
    armado === "" ? "text-red-600" : "text-black"
  }`}
>
              <option value=""className="text-red-600">Seleccionar opción</option>
            <option>Sí, quiero incluir este servicio</option>
            <option>No requiero este servicio</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Boquilla
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Un mayor diámetro aumenta la velocidad de impresión, pero reduce el
            nivel de detalle. Un diámetro menor produce impresiones más lentas
            pero con mucha más precisión.
          </p>
          <select
  value={boquilla}
  onChange={(e) => setBoquilla(e.target.value)}
  className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
    boquilla === "" ? "text-red-600" : "text-black"
  }`}
>
              <option value="" className="text-red-600">
                Seleccionar boquilla
              </option>
            <option>0.2 mm — Máximo detalle</option>
            <option>0.4 mm — Mejor equilibrio</option>
          </select>
        </div>

<div className="mb-6">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Alisado
          </label>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Este proceso suaviza las superficies superiores de la pieza para
            obtener un mejor acabado visual. Requiere más tiempo de impresión y
            postprocesado, por lo que incrementa el costo final. Si se utiliza
            boquilla de 0.2 mm la diferencia suele ser mínima.
          </p>
          <select
  value={alisado}
  onChange={(e) => setAlisado(e.target.value)}
  className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
    alisado === "" ? "text-red-600" : "text-black"
  }`}
>
              <option value=""className="text-red-600">Seleccionar opción</option>
            <option>Sí, quiero incluir este servicio</option>
            <option>No requiero este servicio</option>
            <option>Quiero presupuesto con y sin este servicio</option>
          </select>
        </div>


<div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    Código de descuento
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Si tenés un código promocional, ingresalo aquí.
  </p>

  <input
    value={codigoDescuento}
    onChange={(e) => setCodigoDescuento(e.target.value.toUpperCase())}
    className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
    placeholder="Ej: KINT10"
  />
</div>

        <div className="mb-8">
          <label className="mb-2 block font-semibold text-[var(--text-main)]">
            Comentarios
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-white p-4 text-black"
            rows={5}
            placeholder="Escribe detalles importantes..."
          />
        </div>

<div className="mb-8 rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg)] p-6">
  <h2 className="mb-4 text-lg font-bold text-[var(--text-main)]">
    Presupuesto
  </h2>

  <p className="mb-6 text-sm text-[var(--text-muted)]">
    Para armar el precio final de tu pieza, sumamos todo lo que entra en
    juego antes, durante y después de que nos des el visto bueno para
    arrancar.
  </p>

  <h3 className="mb-4 text-base font-semibold text-[var(--text-main)]">
    ¿Qué estás pagando?
  </h3>

  <div className="space-y-3 text-sm text-[var(--text-muted)]">
    <div>
      <strong className="text-[var(--text-main)]">
        • Hora de uso de la impresora:
      </strong>
      <p>Las horas dedicadas exclusivamente a imprimir la pieza.</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Tipo de material:
      </strong>
      <p>Tipo de filamento utilizado (PLA, PLA+, PETG).</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Cantidad de material:
      </strong>
      <p>Peso en gramos del filamento consumido.</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Correcciones menores:
      </strong>
      <p>Ajuste de detalles mínimos en el modelo.</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Fondo de emergencia:
      </strong>
      <p>Costo extra por fallas de impresión o diseño.</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Mano de obra:
      </strong>
      <p>Solo aplica si aceptas el servicio de armado.</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Alisado:
      </strong>
      <p>Solo aplica si aceptas el servicio de alisado.</p>
    </div>
  </div>
</div>

<div className="mb-8 rounded-2xl border border-red-600 bg-[#ffe5e5] p-6 dark:bg-transparent">
  <h2 className="mb-3 text-lg font-bold text-red-600">
    ¿Tenés una consulta o pedido especial?
  </h2>

  <p className="mb-5 text-sm leading-6 text-[var(--text-muted)]">
    Si necesitás explicar algo antes de cotizar, podés escribirnos por WhatsApp.
  </p>

  <a
    href="https://wa.me/59892023382"
    target="_blank"
    className="inline-block rounded-2xl bg-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:opacity-90"
  >
    Escribir por WhatsApp
  </a>
</div>


        <button
          onClick={enviarPedido}
          disabled={enviando}
          className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar Cotización"}
        </button>
      </div>
    </main>
  );
}