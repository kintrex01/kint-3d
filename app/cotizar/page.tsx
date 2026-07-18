"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type OpcionConfiguracion = {
  valor: string | number;
  comentario: string;
};

type Configuracion = Record<
  string,
  OpcionConfiguracion
>;

const COLORES_FILAMENTO = [
  {
    nombre: "Amarillo",
    img: "/colores/Amarillo.png",
    clave: "filamento_amarillo",
  },
  {
    nombre: "Blanco",
    img: "/colores/Blanco.png",
    clave: "filamento_blanco",
  },
  {
  nombre: "Celeste",
  img: null,
  clave: "filamento_celeste",
},
  {
    nombre: "Cristal",
    img: "/colores/Cristal.png",
    clave: "filamento_cristal",
  },
  {
    nombre: "Negro",
    img: "/colores/Negro.png",
    clave: "filamento_negro",
  },
  {
    nombre: "Oro",
    img: "/colores/Oro.png",
    clave: "filamento_oro",
  },
  {
    nombre: "Rojo",
    img: "/colores/Rojo.png",
    clave: "filamento_rojo",
  },
  {
    nombre: "Verde Bosque",
    img: "/colores/Verde Bosque.png",
    clave: "filamento_verde_bosque",
  },
  {
    nombre: "Verde",
    img: "/colores/Verde.png",
    clave: "filamento_verde",
  },
  {
    nombre: "Violeta",
    img: "/colores/Violeta.png",
    clave: "filamento_violeta",
  },
] as const;

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
  const [pedidoPrioritario, setPedidoPrioritario] =
  useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [archivoPesadoWhatsapp, setArchivoPesadoWhatsapp] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [numeroPedido, setNumeroPedido] = useState("");
  const [aceptaUsoImagenes, setAceptaUsoImagenes] =
  useState(false);

  const [configuracion, setConfiguracion] =
  useState<Configuracion>({});

const [cargandoConfiguracion, setCargandoConfiguracion] =
  useState(true);

const [errorConfiguracion, setErrorConfiguracion] =
  useState("");

useEffect(() => {
  async function cargarConfiguracion() {
    try {
      const response = await fetch("/api/configuracion", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "No se pudo cargar la configuración."
        );
      }

      setConfiguracion(data.configuracion || {});
    } catch (error) {
      console.error(error);

      setErrorConfiguracion(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración."
      );
    } finally {
      setCargandoConfiguracion(false);
    }
  }

  cargarConfiguracion();
}, []);


const estadoAceptarPedidos = String(
  configuracion.aceptar_pedidos?.valor || ""
)
  .trim()
  .toLowerCase();

const pedidosDeshabilitados =
  estadoAceptarPedidos !== "habilitada" &&
  estadoAceptarPedidos !== "habilitado";

const pedidoUrgenteHabilitado =
  String(
    configuracion.pedido_urgente?.valor || ""
  ).toLowerCase() === "habilitada";

const pedidoUrgenteValor = Number(
  configuracion.pedido_urgente_valor?.valor || 0
);

const pedidoUrgenteCupos = Number(
  configuracion.pedido_urgente_cupos?.valor || 0
);

const pedidoUrgenteComentario =
  configuracion.pedido_urgente?.comentario ||
  "Tu pedido tendrá prioridad en la cola de producción. El recargo se aplicará al presupuesto final y está sujeto a disponibilidad.";

const pedidoUrgenteDisponible =
  pedidoUrgenteHabilitado &&
  pedidoUrgenteCupos > 0;

  const armadoHabilitado =
  String(configuracion.armado?.valor || "")
    .trim()
    .toLowerCase() === "habilitada";

    const alisadoHabilitado =
  String(configuracion.alisado?.valor || "")
    .trim()
    .toLowerCase() === "habilitada";

const boquilla02Habilitada =
  String(configuracion.boquilla_0_2?.valor || "")
    .trim()
    .toLowerCase() === "habilitada";

const boquilla04Habilitada =
  String(configuracion.boquilla_0_4?.valor || "")
    .trim()
    .toLowerCase() === "habilitada";

    const filamentosConfigurados = COLORES_FILAMENTO.map(
  (item) => {
    const opcion = configuracion[item.clave];

    const estado = String(opcion?.valor || "")
      .trim()
      .toLowerCase();

    return {
      ...item,

      habilitado:
        Boolean(opcion) &&
        [
          "habilitada",
          "habilitado",
          "sí",
          "si",
        ].includes(estado),

      comentario: String(
        opcion?.comentario || ""
      ).trim(),
    };
  }
).sort((a, b) => {
  if (a.habilitado === b.habilitado) {
    return 0;
  }

  return a.habilitado ? -1 : 1;
});

  const mensajePedidosDeshabilitados =
  configuracion.aceptar_pedidos?.comentario ||
  `Cotizaciones no disponibles

En este momento no estamos aceptando nuevos pedidos.`;

const lineasMensajePedidos =
  mensajePedidosDeshabilitados.split(/\r?\n/);

const tituloPedidosDeshabilitados =
  lineasMensajePedidos[0] ||
  "Cotizaciones no disponibles";

const detallePedidosDeshabilitados =
  lineasMensajePedidos.slice(1).join("\n").trim();

  useEffect(() => {
  if (!pedidoUrgenteDisponible) {
    setPedidoPrioritario(false);
  }
}, [pedidoUrgenteDisponible]);

useEffect(() => {
  if (!armadoHabilitado) {
    setArmado("No requiero este servicio");
  }
}, [armadoHabilitado]);

useEffect(() => {
  if (!alisadoHabilitado) {
    setAlisado("No requiero este servicio");
  }
}, [alisadoHabilitado]);

useEffect(() => {
  if (
    boquilla.includes("0.2") &&
    !boquilla02Habilitada
  ) {
    setBoquilla("");
  }

  if (
    boquilla.includes("0.4") &&
    !boquilla04Habilitada
  ) {
    setBoquilla("");
  }
}, [
  boquilla,
  boquilla02Habilitada,
  boquilla04Habilitada,
]);

useEffect(() => {
  setColor((actual) => {
    const coloresValidos = actual.filter(
      (nombreSeleccionado) => {
        const item = COLORES_FILAMENTO.find(
          (filamento) =>
            filamento.nombre === nombreSeleccionado
        );

        if (!item) {
          return false;
        }

        const opcion = configuracion[item.clave];

        if (!opcion) {
          return false;
        }

        const estado = String(opcion.valor || "")
          .trim()
          .toLowerCase();

        return [
          "habilitada",
          "habilitado",
          "sí",
          "si",
        ].includes(estado);
      }
    );

    return coloresValidos.length === actual.length
      ? actual
      : coloresValidos;
  });
}, [configuracion]);

  async function enviarPedido() {

if (cargandoConfiguracion) {
  alert(
    "Esperá un momento mientras cargamos la configuración."
  );
  return;
}

if (errorConfiguracion) {
  alert(
    "No pudimos verificar si estamos aceptando pedidos. Recargá la página."
  );
  return;
}

if (pedidosDeshabilitados) {
  alert(
    configuracion.aceptar_pedidos?.comentario ||
      "En este momento no estamos aceptando nuevos pedidos."
  );
  return;
}


  if (!nombre.trim()) {
    alert("Por favor, escribí tu nombre o apodo.");
    return;
  }

  if (!email.trim()) {
    alert("Por favor, ingresá un correo electrónico.");
    return;
  }
  if (!aceptaUsoImagenes) {
  alert(
    "Para enviar la cotización tenés que aceptar las condiciones del servicio y el uso de imágenes del proyecto."
  );
  return;
}

const coloresNoDisponibles = color.filter(
  (nombreSeleccionado) => {
    const item = filamentosConfigurados.find(
      (filamento) =>
        filamento.nombre === nombreSeleccionado
    );

    return !item?.habilitado;
  }
);

if (coloresNoDisponibles.length > 0) {
  alert(
    `Estos colores ya no están disponibles: ${coloresNoDisponibles.join(
      ", "
    )}. Seleccioná otra opción.`
  );
  return;
}

  const armadoValido =
  !armadoHabilitado || Boolean(armado);

const alisadoValido =
  !alisadoHabilitado || Boolean(alisado);

if (
  !escala ||
  color.length === 0 ||
  !armadoValido ||
  !alisadoValido ||
  !boquilla
) {
  alert(
    "Por favor completá todas las opciones que dicen 'Seleccionar...'."
  );
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
        armado: armadoHabilitado
  ? armado
  : "No requiero este servicio",

alisado: alisadoHabilitado
  ? alisado
  : "No requiero este servicio",
        boquilla,
        comentarios,
        codigoDescuento,
        pedidoPrioritario,
archivosOriginales,
archivoPesadoWhatsapp,
usoImagenesAutorizado: aceptaUsoImagenes,
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
    setPedidoPrioritario(false);
    setArchivos([]);
    setArchivoPesadoWhatsapp(false);
    setAceptaUsoImagenes(false);

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

if (cargandoConfiguracion) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
      <p className="text-lg font-semibold">
        Cargando...
      </p>
    </main>
  );
}

if (errorConfiguracion) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
      <div className="max-w-xl rounded-3xl border border-red-600 bg-red-600/10 p-8 text-center">
        <h1 className="mb-3 text-2xl font-bold text-red-600">
          No pudimos cargar la página
        </h1>

        <p className="text-[var(--text-muted)]">
          Recargá la página dentro de unos momentos.
        </p>
      </div>
    </main>
  );
}

if (pedidosDeshabilitados) {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)]">
      <div className="fixed left-8 top-8">
        <Link href="/">
          <button className="flex items-center gap-1 text-2xl font-bold transition hover:opacity-70">
            <span className="relative -top-1 text-6xl leading-none">
              ‹
            </span>

            <span>Inicio</span>
          </button>
        </Link>
      </div>

      <section className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-600 bg-[var(--card-bg)] p-10 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10 text-3xl">
            !
          </div>

          <h1 className="mb-4 text-3xl font-bold text-red-600">
  {tituloPedidosDeshabilitados}
</h1>

          {detallePedidosDeshabilitados && (
  <p className="whitespace-pre-wrap text-lg leading-8 text-[var(--text-muted)]">
    {detallePedidosDeshabilitados}
  </p>
)}

          <Link href="/">
            <button className="mt-8 rounded-2xl bg-red-600 px-8 py-4 font-bold text-white transition hover:bg-black">
              Volver al inicio
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
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

      <div className="fixed right-6 top-6 z-[1000]">
  <ThemeToggle />
</div>



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

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg)] p-5 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm leading-6 text-[var(--text-muted)]">
    ¿Tenés dudas sobre formatos, escalas o tiempos de entrega?
  </p>

  <Link
    href="/#preguntas"
    className="inline-flex justify-center rounded-xl border border-[var(--border-color)] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] transition hover:border-red-600 hover:text-red-600"
  >
    Ver preguntas frecuentes
  </Link>
</div>

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
            Subí tu modelo STL o SKP. El límite máximo por archivo es de 50 MB.
            Si tu archivo pesa más, marcá la opción de abajo, llena el formulario y pon un comentario al respecto, o envialo por WhatsApp luego de llenar el formulario. 
          
          </p>

          <div
  onClick={() => document.getElementById("archivo-3d-input")?.click()}
  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-color)] p-8 text-center transition hover:border-red-600"
>
  <span className="mb-2 text-3xl">📁</span>

  <span className="font-semibold text-[var(--text-main)]">
    Arrastrá tus archivos STL o SKP
  </span>

  <span className="mt-2 text-sm text-[var(--text-muted)]">
    o hacé clic aquí para seleccionarlos
  </span>
</div>

<input
  id="archivo-3d-input"
  type="file"
  multiple
  accept=".stl,.skp"
  disabled={archivoPesadoWhatsapp}
  onChange={(e) => {
    if (e.target.files) {
      setArchivos(Array.from(e.target.files));
    }
  }}
  className="hidden"
/>

{archivos.length > 0 && (
  <div className="mt-3 rounded-xl border border-[var(--border-color)] p-4">
    <p className="mb-2 font-semibold">
      Archivos seleccionados:
    </p>

    {archivos.map((archivo, index) => (
      <p key={index} className="text-sm text-[var(--text-muted)]">
        • {archivo.name}
      </p>
    ))}
  </div>
)}

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-color)] p-4 text-sm text-[var(--text-main)]">
  <input
    type="checkbox"
    checked={archivoPesadoWhatsapp}
    onChange={(e) => {
      setArchivoPesadoWhatsapp(e.target.checked);
      if (e.target.checked) {
        setArchivos([]);
      }
    }}
    className="mt-1"
  />

  <span>
    Mi archivo supera los 50 MB. Enviaré el archivo por WhatsApp luego de completar la solicitud.
  </span>
</label>

<details className="mb-4 rounded-xl border border-[var(--border-color)] p-4">
  <summary className="cursor-pointer font-semibold text-[var(--text-main)]">
    📏 Consejos para una impresión exitosa
  </summary>

  <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
    <p>✓ Mínimo imprimible: 0,2 mm</p>

    <p>✓ Escala 1:500</p>

    <div>
      <strong className="text-[var(--text-main)]">
        • Muros finos, vallas y barandas:
      </strong>
      <p>- Espesor mínimo: 10 cm</p>
      <p>- Espesor recomendado: 12–13 cm</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        • Pilares:
      </strong>
      <p>- Espesor mínimo: 13 cm</p>
      <p>- Espesor recomendado: 20 cm o más</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        📦 Volumen máximo de impresión:
      </strong>
      <p>18 × 18 × 18 cm</p>
    </div>

    <div>
      <strong className="text-[var(--text-main)]">
        📏 Espesor mínimo imprimible:
      </strong>
      <p>• Boquilla 0,2 mm → 0,2 mm</p>
      <p>• Boquilla 0,4 mm → 0,4 mm</p>
    </div>

    <p className="font-semibold text-red-500">
      ⚠️ Los elementos más finos pueden resultar frágiles o no imprimirse correctamente.
    </p>
  </div>
</details>

          <div className="mt-3 rounded-xl border border-red-600 bg-red-600/10 p-4">
  <p className="text-sm font-bold text-red-500">
    📩 IMPORTANTE: Toda la comunicación de tu pedido se realizará a través de este correo electrónico.
  </p>

  <p className="mt-2 text-sm text-[var(--text-muted)]">
    Aquí recibirás el presupuesto, actualizaciones del pedido y la notificación cuando tu impresión esté terminada.
  </p>
</div>
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

{pedidoUrgenteHabilitado && (
  <div
    className={`mb-6 rounded-2xl border p-5 transition ${
      pedidoPrioritario
        ? "border-red-600 bg-red-600/10"
        : "border-[var(--border-color)] bg-[var(--page-bg)]"
    } ${
      !pedidoUrgenteDisponible
        ? "opacity-60"
        : ""
    }`}
  >
    <label
      className={`flex items-start gap-4 ${
        pedidoUrgenteDisponible
          ? "cursor-pointer"
          : "cursor-not-allowed"
      }`}
    >
      <input
        type="checkbox"
        checked={pedidoPrioritario}
        disabled={!pedidoUrgenteDisponible}
        onChange={(e) =>
          setPedidoPrioritario(e.target.checked)
        }
        className="mt-1 h-5 w-5 accent-red-600"
      />

      <span>
        <span className="block font-bold text-[var(--text-main)]">
  Pedido urgente

  {pedidoUrgenteValor > 0 && (
    <span className="ml-2 text-red-600">
      · +{pedidoUrgenteValor}% en el precio
    </span>
  )}
</span>

<span className="mt-2 block text-sm leading-6 text-[var(--text-muted)]">
  {pedidoUrgenteComentario}
</span>

        {pedidoUrgenteDisponible ? (
          <span className="mt-3 block text-xs font-semibold text-[var(--text-muted)]">
            Cupos disponibles: {pedidoUrgenteCupos}
          </span>
        ) : (
          <span className="mt-3 block text-sm font-bold text-red-600">
            No hay cupos urgentes disponibles en este momento.
          </span>
        )}

        {pedidoPrioritario && (
          <span className="mt-3 block text-sm font-bold text-red-600">
            ✓ Pedido urgente seleccionado
          </span>
        )}
      </span>
    </label>
  </div>
)}

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

<div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
  {filamentosConfigurados.map((item) => (
    <button
      key={item.nombre}
      type="button"
      disabled={!item.habilitado}
      onClick={() => {
        if (!item.habilitado) return;

        setColor((actual) =>
          actual.includes(item.nombre)
            ? actual.filter(
                (c) => c !== item.nombre
              )
            : [...actual, item.nombre]
        );
      }}
      className={`rounded-2xl border p-3 transition ${
        !item.habilitado
          ? "cursor-not-allowed border-[var(--border-color)] bg-[var(--page-bg)] opacity-[0.72]"
          : color.includes(item.nombre)
          ? "border-red-600 ring-2 ring-red-600"
          : "border-[var(--border-color)] hover:border-red-600"
      }`}
    >
      {item.img ? (
        <img
          src={item.img}
          alt={item.nombre}
          className={`mx-auto h-24 w-24 object-contain ${
            !item.habilitado
              ? "grayscale-[35%] brightness-90"
              : ""
          }`}
        />
      ) : (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 text-center text-[11px] font-medium text-[var(--text-muted)] opacity-70">
          Próximamente
        </div>
      )}

      <p className="mt-2 text-center text-sm font-semibold">
        {item.nombre}
      </p>

      {!item.habilitado && (
        <p className="mt-2 text-center text-[11px] leading-4 text-[var(--text-muted)] opacity-70">
          {item.comentario ||
            "Color no disponible"}
        </p>
      )}
    </button>
  ))}
</div>

</div>

<div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    Armado de piezas
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Incluye el pegado de piezas y la remoción de soportes.
    Nos encargamos de entregar el producto completamente terminado
    y ensamblado.
  </p>

  {armadoHabilitado ? (
    <select
      value={armado}
      onChange={(e) => setArmado(e.target.value)}
      className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
        armado === "" ? "text-red-600" : "text-black"
      }`}
    >
      <option value="" className="text-red-600">
        Seleccionar opción
      </option>

      <option>Sí, quiero incluir este servicio</option>
      <option>No requiero este servicio</option>
    </select>
  ) : (
    <div className="w-full rounded-xl border border-gray-300 bg-gray-100 p-4 text-gray-400">
      {configuracion.armado?.comentario ||
        "Servicio de armado no disponible"}
    </div>
  )}
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
            <option
  disabled={!boquilla02Habilitada}
  className={
    boquilla02Habilitada
      ? "text-black"
      : "text-gray-400"
  }
>
  0.2 mm — Máximo detalle
  {!boquilla02Habilitada &&
  configuracion.boquilla_0_2?.comentario
    ? ` — ${configuracion.boquilla_0_2.comentario}`
    : ""}
</option>

<option
  disabled={!boquilla04Habilitada}
  className={
    boquilla04Habilitada
      ? "text-black"
      : "text-gray-400"
  }
>
  0.4 mm — Mejor equilibrio
  {!boquilla04Habilitada &&
  configuracion.boquilla_0_4?.comentario
    ? ` — ${configuracion.boquilla_0_4.comentario}`
    : ""}
</option>

<option>Que Kint 3D decida</option>
          </select>
        </div>

<div className="mb-6">
  <label className="mb-2 block font-semibold text-[var(--text-main)]">
    Alisado
  </label>

  <p className="mb-3 text-sm text-[var(--text-muted)]">
    Este proceso suaviza las superficies superiores de la pieza para
    obtener un mejor acabado visual. Requiere más tiempo de impresión
    y postprocesado, por lo que incrementa el costo final.
  </p>

  {alisadoHabilitado ? (
    <select
      value={alisado}
      onChange={(e) => setAlisado(e.target.value)}
      className={`w-full rounded-xl border border-[var(--border-color)] bg-white p-4 ${
        alisado === "" ? "text-red-600" : "text-black"
      }`}
    >
      <option value="" className="text-red-600">
        Seleccionar opción
      </option>

      <option>Sí, quiero incluir este servicio</option>
      <option>No requiero este servicio</option>
      <option>Quiero presupuesto con y sin este servicio</option>
      <option>Que Kint 3D decida</option>
    </select>
  ) : (
    <div className="w-full rounded-xl border border-gray-300 bg-gray-100 p-4 text-gray-400">
      {configuracion.alisado?.comentario ||
        "Servicio de alisado no disponible"}
    </div>
  )}
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

<div className="mb-6 rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] p-4">
  <label className="flex cursor-pointer items-start gap-3">
    <input
      type="checkbox"
      checked={aceptaUsoImagenes}
      onChange={(e) =>
        setAceptaUsoImagenes(e.target.checked)
      }
      className="mt-1 h-4 w-4 shrink-0 accent-red-600"
    />

    <span className="text-sm font-semibold leading-6 text-[var(--text-main)]">
      Autorizo el uso de imágenes del proyecto.
    </span>
  </label>

  <details className="ml-7 mt-2">
    <summary className="cursor-pointer text-xs font-semibold text-red-600">
      Ver alcance de la autorización
    </summary>

    <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
      Autorizo a Kint 3D a fotografiar, registrar y
      utilizar imágenes de la impresión, del proceso
      de trabajo y capturas o representaciones del
      modelo enviado con fines de portfolio, redes
      sociales, publicidad y contenido educativo.
      No se publicarán mis datos personales.
    </p>
  </details>

  <div className="ml-7 mt-4 border-t border-[var(--border-color)] pt-4">
    <p className="text-xs leading-6 text-[var(--text-muted)]">
      Si el proyecto es confidencial o tiene
      restricciones de publicación, informalo por
      WhatsApp antes de aprobar el presupuesto.
    </p>

    <a
      href="https://wa.me/59892023382?text=Hola%2C%20quiero%20informar%20que%20mi%20proyecto%20es%20confidencial%20y%20tiene%20restricciones%20para%20el%20uso%20o%20publicaci%C3%B3n%20de%20im%C3%A1genes."
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex text-xs font-bold text-red-600 underline underline-offset-4"
    >
      Avisar proyecto confidencial por WhatsApp
    </a>
  </div>
</div>


        <button
          onClick={enviarPedido}
          disabled={enviando}
          className="w-full rounded-2xl bg-red-600 px-8 py-5 text-sm font-bold uppercase tracking-[0.3em] text-white transition hover:bg-black disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar Cotización"}
        </button>

        <details className="group mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg)] p-6">
  <summary className="flex cursor-pointer list-none items-center justify-between gap-5">
    <div>
      <p className="font-bold text-[var(--text-main)]">
        ¿Cómo se calcula el presupuesto?
      </p>

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Consultá qué elementos se tienen en cuenta para calcular el precio.
      </p>
    </div>

    <span className="text-2xl font-light text-red-600 transition group-open:rotate-45">
      +
    </span>
  </summary>

  <div className="mt-6 border-t border-[var(--border-color)] pt-6">
    <p className="mb-6 text-sm leading-7 text-[var(--text-muted)]">
      Para calcular el precio final de tu pieza tenemos en cuenta
      todo lo necesario antes, durante y después de la impresión.
    </p>

    <div className="space-y-5 text-sm text-[var(--text-muted)]">
      <div>
        <strong className="text-[var(--text-main)]">
          • Hora de uso de la impresora
        </strong>

        <p className="mt-1">
          Las horas dedicadas exclusivamente a imprimir la pieza.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Tipo de material
        </strong>

        <p className="mt-1">
          Tipo de filamento utilizado, como PLA, PLA+ o PETG.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Cantidad de material
        </strong>

        <p className="mt-1">
          Peso en gramos del filamento utilizado.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Preparación y correcciones menores
        </strong>

        <p className="mt-1">
          Ajustes mínimos necesarios para preparar correctamente el modelo.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Posibles fallas de impresión
        </strong>

        <p className="mt-1">
          Margen destinado a cubrir posibles fallas durante el proceso.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Armado de piezas
        </strong>

        <p className="mt-1">
          Se incluye únicamente cuando seleccionás el servicio de armado.
        </p>
      </div>

      <div>
        <strong className="text-[var(--text-main)]">
          • Alisado
        </strong>

        <p className="mt-1">
          Se incluye únicamente cuando seleccionás este servicio.
        </p>
      </div>

      {pedidoPrioritario && pedidoUrgenteValor > 0 && (
        <div>
          <strong className="text-red-600">
            • Recargo por pedido urgente
          </strong>

          <p className="mt-1">
            Se agrega un {pedidoUrgenteValor}% por prioridad
            en la cola de producción.
          </p>
        </div>
      )}
    </div>
  </div>
</details>
      </div>

<div className="mt-10 text-center">
  <h3 className="mb-3 text-lg font-bold text-red-600">
    ¿Tenés una consulta o pedido especial?
  </h3>

  <p className="mb-5 text-sm leading-6 text-[var(--text-muted)]">
    Si necesitás explicar algo antes de cotizar, podés escribirnos por WhatsApp.
  </p>

  <a
    href="https://wa.me/59892023382"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex rounded-2xl bg-zinc-800 px-8 py-5 text-sm font-bold uppercase tracking-[0.3em] text-white transition hover:bg-black"
  >
    Escribir por WhatsApp
  </a>
</div>

    </main>
  );
}