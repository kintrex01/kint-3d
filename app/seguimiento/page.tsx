"use client";

import { createClient } from "@supabase/supabase-js";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function SeguimientoContent() {
  const [pedido, setPedido] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState("");
  const [archivosExtra, setArchivosExtra] = useState<File[]>([]);
const [subiendoArchivo, setSubiendoArchivo] = useState(false);
const [mensajeArchivo, setMensajeArchivo] = useState("");
const [guardandoMetodo, setGuardandoMetodo] = useState(false);
const [modalidadPago, setModalidadPago] = useState("");
const [mostrarSaldo, setMostrarSaldo] = useState(false);
const [modoOscuro, setModoOscuro] = useState(false);
const [codigoDescuentoInput, setCodigoDescuentoInput] = useState("");
const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
const [presupuestoSeleccionando, setPresupuestoSeleccionando] =
  useState<number | null>(null);
const [puntosACanjear, setPuntosACanjear] =
  useState("");

const [procesandoPuntos, setProcesandoPuntos] =
  useState(false);

const [mensajePuntos, setMensajePuntos] =
  useState("");
const [archivoReemplazando, setArchivoReemplazando] =
  useState("");

const [archivoEliminando, setArchivoEliminando] =
  useState("");
  
  const searchParams = useSearchParams();

useEffect(() => {
  const pedidoUrl =
    (searchParams.get("pedido") || "")
      .trim()
      .toUpperCase();

  const codigoUrl =
    (searchParams.get("codigo") || "")
      .trim()
      .toUpperCase();

  if (pedidoUrl) {
    setPedido(pedidoUrl);
  }

  if (codigoUrl) {
    setCodigo(codigoUrl);
  }

  if (!pedidoUrl || !codigoUrl) {
    return;
  }

  const cargarPedidoDesdeUrl = async () => {
    setError("");
    setCargando(true);

    try {
      const response = await fetch(
        `/api/seguimiento?pedido=${encodeURIComponent(
          pedidoUrl
        )}&codigo=${encodeURIComponent(
          codigoUrl
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(
          data.error ||
            "No encontramos ese pedido."
        );
      }

      setResultado(data);
    } catch (error: any) {
      setResultado(null);

      setError(
        error?.message ||
          "Error al consultar el pedido."
      );
    } finally {
      setCargando(false);
    }
  };

  void cargarPedidoDesdeUrl();
}, [searchParams]);

useEffect(() => {
  const temaGuardado = localStorage.getItem("tema");

  const paginaYaEstaOscura =
    document.documentElement.classList.contains("dark");

  const usarModoOscuro =
    temaGuardado === "dark" ||
    (!temaGuardado && paginaYaEstaOscura);

  setModoOscuro(usarModoOscuro);

  if (usarModoOscuro) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}, []);

function cambiarTema() {
  const nuevoModo = !modoOscuro;
  setModoOscuro(nuevoModo);

  if (nuevoModo) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("tema", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("tema", "light");
  }
}

  async function consultarPedido() {
    setError("");
    setResultado(null);

    if (!pedido.trim()) {
      setError("Ingresá tu número de pedido.");
      return;
    }
    
    if (!codigo.trim()) {
  setError("Ingresá tu código de seguimiento.");
  return;
}

    setCargando(true);

    try {
      const response = await fetch(
  `/api/seguimiento?pedido=${encodeURIComponent(pedido)}&codigo=${encodeURIComponent(codigo)}`
);

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "No encontramos ese pedido.");
      }

      setResultado(data);
    } catch (error: any) {
      setError(error.message || "Error al consultar el pedido.");
    }

    setCargando(false);
  }

  async function actualizarPedidoSilenciosamente() {
  if (!pedido.trim() || !codigo.trim()) {
    return;
  }

  try {
    const response = await fetch(
      `/api/seguimiento?pedido=${encodeURIComponent(
        pedido
      )}&codigo=${encodeURIComponent(
        codigo
      )}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
          "No se pudo actualizar el pedido."
      );
    }

    setResultado(data);
  } catch (error) {
    console.error(
      "No se pudo actualizar silenciosamente:",
      error
    );
  }
}

  useEffect(() => {
  if (
    !resultado?.pedido ||
    !pedido.trim() ||
    !codigo.trim()
  ) {
    return;
  }

  const actualizarSilenciosamente =
    async () => {
      try {
        const response = await fetch(
          `/api/seguimiento?pedido=${encodeURIComponent(
            pedido
          )}&codigo=${encodeURIComponent(
            codigo
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          response.ok &&
          data.ok
        ) {
          setResultado(data);
        }
      } catch (error) {
        console.error(
          "No se pudo actualizar automáticamente el seguimiento:",
          error
        );
      }
    };

  const intervalo = window.setInterval(
    actualizarSilenciosamente,
    25000
  );

  return () => {
    window.clearInterval(intervalo);
  };
}, [
  resultado?.pedido,
  pedido,
  codigo,
]);

async function subirArchivoAdicional() {
  setMensajeArchivo("");
  setError("");

  if (!archivosExtra.length) {
    setError("Seleccioná al menos un archivo.");
    return;
  }

  setSubiendoArchivo(true);

  try {
    const firmaResponse = await fetch("/api/archivos-firma", {
      method: "POST",
      body: JSON.stringify({
        pedido,
        archivos: archivosExtra.map((archivo) => ({
          nombre: archivo.name,
          size: archivo.size,
        })),
      }),
    });

    const firmaData = await firmaResponse.json();

    if (!firmaData.ok) {
      throw new Error(firmaData.error || "No se pudo preparar la subida.");
    }

    for (let i = 0; i < archivosExtra.length; i++) {
      const archivo = archivosExtra[i];
      const firmado = firmaData.archivos[i];

      const { error: uploadError } = await supabase.storage
  .from("kint-archivos")
  .uploadToSignedUrl(firmado.ruta, firmado.token, archivo);

if (uploadError) {
  throw new Error(`No se pudo subir ${archivo.name}: ${uploadError.message}`);
}}

    const registroResponse = await fetch("/api/archivos", {
      method: "POST",
      body: JSON.stringify({
        pedido,
        codigo,
        archivos: firmaData.archivos.map((archivo: any) => ({
          nombreArchivo: archivo.nombreArchivo,
          link: archivo.link,
          idDrive: archivo.ruta,
        })),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const registroData = await registroResponse.json();

    if (!registroData.ok) {
      throw new Error(registroData.error || "No se pudieron registrar los archivos.");
    }

    setMensajeArchivo("Archivo enviado correctamente.");
    setArchivosExtra([]);
    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(error.message || "Error al subir archivo.");
  }

  setSubiendoArchivo(false);
}

async function eliminarArchivoPedido(
  archivo: any
) {
  const idArchivo = String(
    archivo.idArchivo || ""
  ).trim();

  const nombreArchivo =
    archivo.nombreArchivo ||
    "este archivo";

  if (!idArchivo) {
    setError(
      "No se pudo identificar el archivo."
    );
    return;
  }

  const confirmado = window.confirm(
    `¿Eliminar "${nombreArchivo}"?\n\nEsta acción no se puede deshacer.`
  );

  if (!confirmado) {
    return;
  }

  setError("");
  setMensajeArchivo("");
  setArchivoEliminando(idArchivo);

  try {
    const response = await fetch(
      "/api/archivos",
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          pedido,
          codigo,
          idArchivo,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(
        data.error ||
          "No se pudo eliminar el archivo."
      );
    }

    await actualizarPedidoSilenciosamente();

    setMensajeArchivo(
      data.advertencia ||
        "Archivo eliminado correctamente."
    );
  } catch (error: any) {
    setError(
      error?.message ||
        "Error al eliminar el archivo."
    );
  } finally {
    setArchivoEliminando("");
  }
}


async function reemplazarArchivoPedido(
  archivoAnterior: any,
  archivoNuevo: File
) {
  const idArchivoAnterior = String(
    archivoAnterior.idArchivo || ""
  ).trim();

  if (!idArchivoAnterior) {
    setError(
      "No se pudo identificar el archivo anterior."
    );
    return;
  }

  setError("");
  setMensajeArchivo("");
  setArchivoReemplazando(
    idArchivoAnterior
  );

  try {
    const firmaResponse = await fetch(
      "/api/archivos-firma",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          pedido,
          archivos: [
            {
              nombre: archivoNuevo.name,
              size: archivoNuevo.size,
            },
          ],
        }),
      }
    );

    const firmaData =
      await firmaResponse.json();

    if (!firmaData.ok) {
      throw new Error(
        firmaData.error ||
          "No se pudo preparar el archivo nuevo."
      );
    }

    const firmado =
      firmaData.archivos?.[0];

    if (!firmado) {
      throw new Error(
        "No se recibió la firma de subida."
      );
    }

    const { error: uploadError } =
      await supabase.storage
        .from("kint-archivos")
        .uploadToSignedUrl(
          firmado.ruta,
          firmado.token,
          archivoNuevo
        );

    if (uploadError) {
      throw new Error(
        `No se pudo subir ${archivoNuevo.name}: ${uploadError.message}`
      );
    }

    const response = await fetch(
      "/api/archivos",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          pedido,
          codigo,
          idArchivoAnterior,
          idArchivoNuevo:
            firmado.ruta,
          nombreArchivoNuevo:
            firmado.nombreArchivo,
          linkArchivoNuevo:
            firmado.link,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(
        data.error ||
          "No se pudo reemplazar el archivo."
      );
    }

    await actualizarPedidoSilenciosamente();

    setMensajeArchivo(
      data.advertencia ||
        "Archivo reemplazado correctamente."
    );
  } catch (error: any) {
    setError(
      error?.message ||
        "Error al reemplazar el archivo."
    );
  } finally {
    setArchivoReemplazando("");
  }
}

async function aplicarCodigoDescuento() {
  if (!codigoDescuentoInput.trim()) {
    setError("Ingresá un código de descuento.");
    return;
  }

  setAplicandoDescuento(true);
  setError("");

  try {
    const response = await fetch("/api/descuento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pedido,
        codigo,
        codigoDescuento: codigoDescuentoInput.trim().toUpperCase(),
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo aplicar el código.");
    }

    setCodigoDescuentoInput("");
    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(error.message || "Error al aplicar descuento.");
  }

  setAplicandoDescuento(false);
}

async function usarPuntosKint() {
  const cantidad = Math.floor(
    Number(
      puntosACanjear || 0
    )
  );

  const minimo = Number(
    resultado?.puntos
      ?.minimoUso || 50
  );

  const disponibles = Number(
    resultado?.puntos
      ?.disponibles || 0
  );

  const valorPunto = Number(
    resultado?.puntos
      ?.valor || 1
  );

  /*
   * resultado.precio YA contiene
   * la promoción/código aplicado.
   *
   * Ej:
   * Original $3.200
   * Promo 20% -> resultado.precio $2.560
   */
  const precioActual = Number(
    resultado?.precio || 0
  );

  const maximoPorPedido =
    valorPunto > 0
      ? Math.floor(
          precioActual /
          valorPunto
        )
      : 0;

  const maximo = Math.min(
    disponibles,
    maximoPorPedido
  );

  if (
    !Number.isInteger(cantidad) ||
    cantidad <= 0
  ) {
    setError(
      "Ingresá una cantidad válida de puntos."
    );
    return;
  }

  if (cantidad < minimo) {
    setError(
      `El mínimo para utilizar es de ${minimo} puntos.`
    );
    return;
  }

  if (
    cantidad >
    disponibles
  ) {
    setError(
      "No tenés suficientes puntos disponibles."
    );
    return;
  }

  if (cantidad > maximo) {
    setError(
      `Podés utilizar como máximo ${maximo} puntos en este pedido.`
    );
    return;
  }

  setProcesandoPuntos(true);
  setError("");
  setMensajePuntos("");

  try {
    const response =
      await fetch(
        "/api/puntos",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            accion: "usar",
            pedido,
            codigo,
            puntos: cantidad,
          }),
        }
      );

    const data =
      await response.json();

    if (!data.ok) {
      throw new Error(
        data.error ||
          "No se pudieron utilizar los puntos."
      );
    }

    setPuntosACanjear("");

    setMensajePuntos(
      data.cubiertoConPuntos
        ? "Los Puntos Kint cubrieron todo el importe restante."
        : `Aplicaste ${data.puntosUtilizados} puntos correctamente.`
    );

    await actualizarPedidoSilenciosamente();

  } catch (error: any) {
    setError(
      error?.message ||
        "Error al utilizar Puntos Kint."
    );
  } finally {
    setProcesandoPuntos(false);
  }
}

async function usarPuntosSaldoKint() {
  const cantidad =
    Math.floor(
      Number(
        puntosACanjear || 0
      )
    );

  const minimo =
    Number(
      resultado?.puntos
        ?.minimoUso || 50
    );

  const disponibles =
    Number(
      resultado?.puntos
        ?.disponibles || 0
    );

  const valorPunto =
    Number(
      resultado?.puntos
        ?.valor || 1
    );

  const saldoPendiente =
    Number(
      resultado
        ?.saldoPendiente || 0
    );

  const maximo =
    Math.min(
      disponibles,
      Math.floor(
        saldoPendiente /
        valorPunto
      )
    );

  if (
    !Number.isInteger(
      cantidad
    ) ||
    cantidad <= 0
  ) {
    setError(
      "Ingresá una cantidad válida de puntos."
    );
    return;
  }

  if (
    cantidad < minimo
  ) {
    setError(
      `El mínimo para utilizar es de ${minimo} puntos.`
    );
    return;
  }

  if (
    cantidad > maximo
  ) {
    setError(
      `Podés utilizar como máximo ${maximo} puntos sobre el saldo pendiente.`
    );
    return;
  }

  setProcesandoPuntos(true);
  setError("");
  setMensajePuntos("");

  try {
    const response =
      await fetch(
        "/api/puntos",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            accion:
              "usar_saldo",
            pedido,
            codigo,
            puntos:
              cantidad,
          }),
        }
      );

    const data =
      await response.json();

    if (!data.ok) {
      throw new Error(
        data.error ||
          "No se pudieron aplicar los puntos al saldo."
      );
    }

    setPuntosACanjear("");

    setMensajePuntos(
      data.saldoCubierto
        ? "Los puntos cubrieron todo el saldo pendiente."
        : `Aplicaste ${data.puntosUtilizados} puntos. Nuevo saldo: $${Number(
            data.saldoNuevo || 0
          ).toLocaleString(
            "es-UY"
          )}.`
    );

    await actualizarPedidoSilenciosamente();

  } catch (error: any) {
    setError(
      error?.message ||
        "Error al aplicar puntos al saldo."
    );
  } finally {
    setProcesandoPuntos(false);
  }
}

async function quitarPuntosKint() {
  const cantidad = Number(
    resultado?.puntosUtilizadosPedido || 0
  );

  if (cantidad <= 0) {
    return;
  }

  const confirmar = window.confirm(
    `¿Querés quitar los ${cantidad} puntos aplicados?\n\nLos puntos volverán a tu saldo disponible.`
  );

  if (!confirmar) {
    return;
  }

  setProcesandoPuntos(true);
  setError("");
  setMensajePuntos("");

  try {
    const response = await fetch(
      "/api/puntos",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          accion: "quitar",
          pedido,
          codigo,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(
        data.error ||
          "No se pudieron quitar los puntos."
      );
    }

    setMensajePuntos(
      `${data.reintegrados || cantidad} puntos volvieron a tu saldo.`
    );

    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(
      error?.message ||
        "Error al quitar los puntos."
    );
  } finally {
    setProcesandoPuntos(false);
  }
}

async function confirmarMetodoPago() {
  if (!modalidadPago) {
    setError("Seleccioná si querés pagar seña o total.");
    return;
  }

  setGuardandoMetodo(true);
  setError("");

  const precioFinal = Number(resultado.precio) || 0;
  const importe =
    modalidadPago === "Seña 20%"
      ? Math.round(precioFinal * 0.2)
      : precioFinal;

  const saldoPendiente = precioFinal - importe;

  try {
    const response = await fetch("/api/pago-metodo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pedido,
        codigo,
        metodo: "Transferencia",
        modalidad: modalidadPago,
        importe,
        saldoPendiente,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo guardar el pago.");
    }

    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(error.message || "Error al guardar pago.");
  }

  setGuardandoMetodo(false);
}

async function subirComprobante() {
  setMensajeArchivo("");
  setError("");

  if (!archivosExtra.length) {
    setError("Seleccioná un comprobante.");
    return;
  }

  const archivo = archivosExtra[0];
  setSubiendoArchivo(true);

  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });

    const response = await fetch("/api/comprobante", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pedido,
        codigo,
        archivoBase64: base64,
        archivoNombre: archivo.name,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo subir el comprobante.");
    }

    setMensajeArchivo("Comprobante enviado correctamente.");
    setArchivosExtra([]);
    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(error.message || "Error al subir comprobante.");
  }

  setSubiendoArchivo(false);
}

async function subirComprobanteSaldo() {
  setMensajeArchivo("");
  setError("");

  if (!archivosExtra.length) {
    setError("Seleccioná un comprobante del saldo.");
    return;
  }

  const archivo = archivosExtra[0];
  setSubiendoArchivo(true);

  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });

    const response = await fetch("/api/comprobante-saldo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pedido,
        codigo,
        archivoBase64: base64,
        archivoNombre: archivo.name,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo subir el comprobante del saldo.");
    }

    setMensajeArchivo("Comprobante del saldo enviado correctamente.");
    setArchivosExtra([]);
    await actualizarPedidoSilenciosamente();
  } catch (error: any) {
    setError(error.message || "Error al subir comprobante del saldo.");
  }

  setSubiendoArchivo(false);
}

function obtenerNombreBeneficio() {
  const origen = String(
    resultado?.origenDescuento || ""
  ).trim();

  if (origen === "promocion_global") {
    return "Promoción global";
  }

  if (origen === "fidelidad") {
    return "Recompensa Kint";
  }

  if (origen === "codigo_normal") {
    return "Código de descuento";
  }

  return "Descuento";
}

function obtenerPorcentajeDescuento() {
  const valor = Number(
    resultado?.descuento || 0
  );

  if (!valor) {
    return 0;
  }

  return valor < 1
    ? valor * 100
    : valor;
}

function obtenerAhorro() {
  const original = Number(
    resultado?.precioOriginal || 0
  );

  const porcentaje =
    obtenerPorcentajeDescuento();

  if (
    !original ||
    porcentaje <= 0
  ) {
    return 0;
  }

  return Math.round(
    original *
      (
        porcentaje /
        100
      )
  );
}

function datosTecnicosPresupuesto(
  presupuesto: any
) {
  const tiempo = String(
    presupuesto?.tiempoImpresion || ""
  ).trim();

  const filamento =
    presupuesto?.filamentoEstimado;

  const tieneFilamento =
    filamento !== "" &&
    filamento !== null &&
    filamento !== undefined;

  const partes: string[] = [];

  if (tiempo) {
    partes.push(tiempo);
  }

  if (tieneFilamento) {
    partes.push(
      `${Number(
        filamento
      ).toLocaleString("es-UY")} g`
    );
  }

  if (!partes.length) {
    return null;
  }

  return (
    <p className="mt-3 text-xs font-bold text-[var(--kint-info)]">
  {partes.join(" · ")}
</p>
  );
}

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
<div className="fixed right-6 top-6 z-50">
  <button
    type="button"
    onClick={cambiarTema}
    className="rounded-full border border-[var(--border-color)] bg-[var(--page-bg)] px-5 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
  >
    {modoOscuro ? "☀️ Modo claro" : "🌙 Modo noche"}
  </button>
</div>

      <section className="mx-auto flex max-w-3xl flex-col items-center text-center pt-24 pb-16">
        <h1 className="text-3xl font-black uppercase tracking-[0.18em] sm:text-6xl">
  Seguimiento
</h1>

        <div className="my-8 h-[2px] w-20 bg-red-600" />

        <p className="mb-8 max-w-xl text-xs uppercase leading-7 tracking-[0.18em] text-[var(--text-muted)]">
  Ingresá tu pedido y código de seguimiento.
</p>

        <div className="w-full max-w-xl">
          <input
            value={pedido}
            onChange={(e) => setPedido(e.target.value.toUpperCase())}
            placeholder="Ej: KNT-0026"
            className="w-full border border-[var(--border-color)] bg-transparent px-6 py-4 text-center text-base font-semibold uppercase tracking-[0.12em] outline-none transition focus:border-red-600"
          />

<input
  value={codigo}
  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
  placeholder="Código de seguimiento"
  className="mt-4 w-full border border-[var(--border-color)] bg-transparent px-6 py-4 text-center text-base font-semibold uppercase tracking-[0.12em] outline-none transition focus:border-red-600"
/>

          <button
            onClick={consultarPedido}
            disabled={cargando}
            className="mt-6 w-full border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600 disabled:opacity-50"
          >
            {cargando ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {error && (
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            {error}
          </p>
        )}

{resultado && (
  <div className="mt-12 w-full max-w-4xl px-6 py-10 text-left sm:px-10">
    <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Número de pedido
    </p>

    <p className="mb-10 text-3xl font-black tracking-[0.08em] sm:text-4xl">
      {resultado.pedido}
    </p>

    <div className="mb-12">
      <p className="mb-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
        Estado
      </p>

{(() => {
  const estados = [
    "Recibido",
    "Presupuestado",
    "Método de pago seleccionado",
    "Pago confirmado",
    "En impresión",
    "Terminado",
    "Entregado",
  ];

  const indiceActual =
    estados.indexOf(resultado.estado);

  return (
    <>
      {/* ESCRITORIO */}
      <div className="hidden w-full pb-2 sm:block">
        <div className="grid grid-cols-7 items-start">
          {estados.map(
            (estado, index) => {
              const completado =
                indiceActual >= 0 &&
                index < indiceActual;

              const actual =
                index === indiceActual;

              const entregadoActual =
                estado === "Entregado" &&
                actual;

              return (
                <div
                  key={estado}
                  className="flex min-w-0 flex-col items-center"
                >
                  <div className="flex w-full items-center">

                    {/* LÍNEA IZQUIERDA */}
                    <div
                      className={`h-[2px] flex-1 ${
                        index === 0
                          ? "bg-transparent"
                          : completado ||
                            actual
                          ? "bg-red-600"
                          : "bg-[var(--border-color)]"
                      }`}
                    />

                    {/* CÍRCULO */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-all ${
                        entregadoActual
                          ? "scale-110 border-green-600 bg-green-600 text-white ring-4 ring-green-600/15"
                          : actual
                          ? "scale-110 border-red-600 bg-red-600 text-white ring-4 ring-red-600/15"
                          : completado
                          ? "border-red-600 bg-transparent text-red-600"
                          : "border-[var(--border-color)] bg-transparent text-[var(--text-muted)]"
                      }`}
                    >
                      {completado ||
                      entregadoActual
                        ? "✓"
                        : index + 1}
                    </div>

                    {/* LÍNEA DERECHA */}
                    <div
                      className={`h-[2px] flex-1 ${
                        index ===
                        estados.length - 1
                          ? "bg-transparent"
                          : completado
                          ? "bg-red-600"
                          : "bg-[var(--border-color)]"
                      }`}
                    />
                  </div>

                  <p
                    className={`mt-3 max-w-[100px] text-center text-[9px] font-bold uppercase leading-4 tracking-[0.1em] ${
                      actual
                        ? entregadoActual
                          ? "text-green-600"
                          : "text-red-600"
                        : completado
                        ? "text-[var(--text-main)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {estado}
                  </p>

                  {actual && (
                    <span
                      className={`mt-1 text-[8px] font-black uppercase tracking-[0.16em] ${
                        entregadoActual
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Ahora
                    </span>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* MÓVIL */}
      <div className="space-y-2 sm:hidden">
        {estados.map(
          (estado, index) => {
            const completado =
              indiceActual >= 0 &&
              index < indiceActual;

            const actual =
              index === indiceActual;

            const entregadoActual =
              estado === "Entregado" &&
              actual;

            return (
              <div
                key={estado}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  entregadoActual
                    ? "border-green-600 bg-green-600/10"
                    : actual
                    ? "border-red-600 bg-red-600/10"
                    : completado
                    ? "border-red-600/30"
                    : "border-[var(--border-color)]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                    entregadoActual
                      ? "border-green-600 bg-green-600 text-white"
                      : actual
                      ? "border-red-600 bg-red-600 text-white"
                      : completado
                      ? "border-red-600 text-red-600"
                      : "border-[var(--border-color)] text-[var(--text-muted)]"
                  }`}
                >
                  {completado ||
                  entregadoActual
                    ? "✓"
                    : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-[0.12em] ${
                      entregadoActual
                        ? "text-green-600"
                        : actual
                        ? "text-red-600"
                        : completado
                        ? "text-[var(--text-main)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {estado}
                  </span>
                </div>

                {actual && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-[0.14em] ${
                      entregadoActual
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Ahora
                  </span>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* ESTADO ACTUAL DESTACADO */}
      {indiceActual >= 0 && (
        <div
          className={`mt-7 rounded-2xl border px-5 py-4 ${
            resultado.estado ===
            "Entregado"
              ? "border-green-600/50 bg-green-600/10"
              : "border-red-600/40 bg-red-600/5"
          }`}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Estado actual
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                resultado.estado ===
                "Entregado"
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
            />

            <p
              className={`text-lg font-black ${
                resultado.estado ===
                "Entregado"
                  ? "text-green-600"
                  : "text-[var(--text-main)]"
              }`}
            >
              {resultado.estado}
            </p>
          </div>
        </div>
      )}
    </>
  );
})()}

    </div>



{resultado.estado === "Recibido" &&
  Array.isArray(
    resultado.beneficios?.codigos
  ) &&
  resultado.beneficios.codigos.length > 0 && (
    <div className="mb-6 rounded-2xl border border-[var(--border-color)] p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
        Beneficios disponibles
      </p>

      <div className="mt-5 space-y-3">
        {resultado.beneficios.codigos.map(
          (
            beneficio: any,
            index: number
          ) => (
            <div
              key={`${beneficio.codigo}-${index}`}
              className="rounded-xl border border-[var(--border-color)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-red-600">
                    {beneficio.descuento}% OFF
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold uppercase">
                    {beneficio.codigo}
                  </p>

                  {beneficio.nombre && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {beneficio.nombre}
                    </p>
                  )}

                  {beneficio.vencimiento && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Vence {beneficio.vencimiento}
                    </p>
                  )}
                </div>

                {resultado.estado === "Recibido" &&
                  !resultado.codigoDescuento && (
                    <button
                      type="button"
                      onClick={() =>
                        setCodigoDescuentoInput(
                          beneficio.codigo
                        )
                      }
                      className="rounded-xl border border-red-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-red-600 transition hover:bg-red-600 hover:text-white"
                    >
                      Usar beneficio
                    </button>
                  )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )}

    {resultado.fidelidad?.habilitada &&
  !resultado.puntos?.habilitados && (
  <div className="mb-12 rounded-2xl border border-[var(--border-color)] p-6">

    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Tus beneficios Kint
        </p>

        <p className="mt-3 text-2xl font-black">
          {resultado.fidelidad.entregados}{" "}
          {resultado.fidelidad.entregados === 1
            ? "pedido entregado"
            : "pedidos entregados"}
        </p>
      </div>

      {resultado.fidelidad.proximoHito && (
        <p className="text-sm font-bold text-red-600">
          {Number(
  resultado.fidelidad.proximoHito
) === 1
  ? `Próximo: Bono de bienvenida · ${resultado.fidelidad.proximoDescuento}% OFF`
  : `Próximo: ${resultado.fidelidad.proximoDescuento}% OFF`}
        </p>
      )}
    </div>

    {resultado.fidelidad.proximoHito ? (
      <>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--border-color)]">
          <div
            className="h-full rounded-full bg-red-600 transition-all"
            style={{
              width: `${Math.min(
                100,
                (Number(resultado.fidelidad.entregados) /
                  Number(resultado.fidelidad.proximoHito)) *
                  100
              )}%`,
            }}
          />
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Te{" "}
          {resultado.fidelidad.faltan === 1
            ? "falta 1 pedido"
            : `faltan ${resultado.fidelidad.faltan} pedidos`}{" "}
          para desbloquear{" "}
          <strong className="text-[var(--text-main)]">
  {Number(
    resultado.fidelidad.proximoHito
  ) === 1
    ? `tu Bono de bienvenida de ${resultado.fidelidad.proximoDescuento}% OFF`
    : `${resultado.fidelidad.proximoDescuento}% OFF`}
</strong>
        </p>
      </>
    ) : (
      <p className="mt-5 text-sm text-[var(--text-muted)]">
        Alcanzaste todos los beneficios configurados actualmente.
      </p>
    )}

    {Array.isArray(resultado.fidelidad.recompensas) &&
      resultado.fidelidad.recompensas.some(
        (recompensa: any) =>
          recompensa.estado === "DISPONIBLE" ||
          recompensa.estado === "RESERVADO"
      ) && (
        <div className="mt-7 border-t border-[var(--border-color)] pt-6">

          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Recompensas
          </p>

          <div className="space-y-3">
            {resultado.fidelidad.recompensas
              .filter(
                (recompensa: any) =>
                  recompensa.estado === "DISPONIBLE" ||
                  recompensa.estado === "RESERVADO"
              )
              .map((recompensa: any, index: number) => (
                <div
                  key={`${recompensa.codigo}-${index}`}
                  className="rounded-xl border border-[var(--border-color)] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>
  {Number(recompensa.hito) === 1 && (
    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
      Bono de bienvenida
    </p>
  )}

  <p className="text-xl font-black text-red-600">
    {recompensa.descuento}% OFF
  </p>

                      <p className="mt-1 font-mono text-sm font-bold tracking-[0.12em]">
                        {recompensa.codigo}
                      </p>

                      {recompensa.vencimiento && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Vence {recompensa.vencimiento}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
                          recompensa.estado === "DISPONIBLE"
                            ? "bg-green-600/10 text-green-600"
                            : "bg-red-600/10 text-red-600"
                        }`}
                      >
                        {recompensa.estado === "DISPONIBLE"
                          ? "Disponible"
                          : recompensa.pedidoUsado === resultado.pedido
                          ? "Reservada para este pedido"
                          : "Reservada"}
                      </span>

                      {resultado.estado === "Recibido" &&
                        !resultado.codigoDescuento &&
                        recompensa.estado === "DISPONIBLE" && (
                          <button
                            type="button"
                            onClick={() =>
                              setCodigoDescuentoInput(
                                recompensa.codigo
                              )
                            }
                            className="text-[10px] font-black uppercase tracking-[0.15em] text-red-600 hover:underline"
                          >
                            Usar recompensa
                          </button>
                        )}
                    </div>

                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
  </div>
)}

{[
  "Presupuestado",
  "Método de pago seleccionado",
  "Pago confirmado",
  "En impresión",
  "Terminado",
  "Entregado",
].includes(resultado.estado) && (
  <div className="mb-12 rounded-2xl border border-[var(--border-color)] p-6">
    <p className="mb-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
  {resultado.estado === "Presupuestado"
    ? "Presupuesto"
    : "Pago"}
</p>

    <div className="mb-8">
      {resultado.precioOriginal &&
  resultado.precioOriginal !==
    resultado.precio &&
  (
    !resultado.presupuestos ||
    resultado.presupuestos.length === 0 ||
    resultado.presupuestos.some(
      (p: any) =>
        String(
          p.seleccionado
        ).toLowerCase() === "sí"
    )
  ) && (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="font-bold text-[var(--text-muted)] line-through">
        $
        {Number(
          resultado.precioOriginal
        ).toLocaleString("es-UY")}
      </span>

      {obtenerPorcentajeDescuento() >
        0 && (
        <span className="font-black text-[var(--kint-info)]">
          {obtenerNombreBeneficio()} ·{" "}
          {obtenerPorcentajeDescuento()}% OFF
        </span>
      )}

      {obtenerAhorro() > 0 && (
        <span className="font-bold text-green-600">
          Ahorrás $
          {obtenerAhorro().toLocaleString(
            "es-UY"
          )}
        </span>
      )}
    </div>
  )}

{resultado.estado === "Presupuestado" &&
  resultado.presupuestos?.length > 0 && (
    <div className="mb-8">
  <div className="mb-5">
    <p className="text-sm font-black uppercase tracking-[0.2em]">
      Tu presupuesto
    </p>

    {!resultado.presupuestos.some(
      (p: any) =>
        String(
          p.seleccionado
        ).toLowerCase() === "sí"
    ) && (
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Elegí la opción que preferís para continuar.
      </p>
    )}
  </div>

      {resultado.presupuestos.some((p: any) => String(p.seleccionado).toLowerCase() === "sí") ? (
        resultado.presupuestos
          .filter((p: any) => String(p.seleccionado).toLowerCase() === "sí")
          .map((presupuesto: any, index: number) => (
<div
  key={index}
  className="
    rounded-2xl
    border border-[#87A4B5]/55
    border-l-2 border-l-[#4C6C81]
    bg-[#eef4f8]
    p-6
    shadow-[0_14px_34px_rgba(37,67,93,0.10)]

    dark:border-[#4C6C81]/45
    dark:border-l-[#B9D3E2]
    dark:bg-[#010003]
    dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]
  "
>
  <p className="
    text-[10px]
    font-black
    uppercase
    tracking-[0.22em]
    text-[#4C6C81]

    dark:text-[#B9D3E2]
  ">
    Presupuesto elegido
  </p>

  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="
        text-xl
        font-black
        text-[#06152f]

        dark:text-white
      ">
        {presupuesto.opcion}
      </p>

      <p className="
        mt-2
        text-sm
        text-[#25435D]

        dark:text-[#B9D3E2]/85
      ">
        {presupuesto.descripcion}
      </p>

      {datosTecnicosPresupuesto(
        presupuesto
      )}
    </div>

    <p className="
      shrink-0
      text-3xl
      font-black
      text-[#25435D]

      dark:text-[#B9D3E2]
    ">
      $
      {Number(
        presupuesto.precio
      ).toLocaleString("es-UY")}
    </p>
  </div>
</div>
          ))
      ) : (
        <div className="space-y-4">
          {resultado.presupuestos.map((presupuesto: any, index: number) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--border-color)] p-4"
            >
              <p className="font-bold">
                {presupuesto.opcion}
              </p>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {presupuesto.descripcion}
              </p>

              {datosTecnicosPresupuesto(
  presupuesto
)}

              {Number(presupuesto.descuento || resultado.descuento || 0) > 0 ? (
  <div className="mt-3">
    <p className="text-sm font-bold line-through text-[var(--text-muted)]">
      ${presupuesto.precioOriginal || presupuesto.precio}
    </p>

    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
  {obtenerNombreBeneficio()} ·{" "}
  {Number(
    presupuesto.descuento ||
      obtenerPorcentajeDescuento()
  ) < 1
    ? Number(
        presupuesto.descuento ||
          obtenerPorcentajeDescuento()
      ) * 100
    : Number(
        presupuesto.descuento ||
          obtenerPorcentajeDescuento()
      )}
  % OFF
</p>

    <p className="mt-2 text-xl font-black text-red-600">
      ${presupuesto.precio}
    </p>
  </div>
) : (
  <p className="mt-3 text-xl font-black text-red-600">
    ${presupuesto.precio}
  </p>
)}

              <button
                type="button"
                onClick={async () => {
  if (
    presupuestoSeleccionando !== null
  ) {
    return;
  }

  setPresupuestoSeleccionando(index);
  setError("");

  try {
    const response = await fetch(
      "/api/seleccionar-presupuesto",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          pedido: resultado.pedido,
          codigo,
          index,
        }),
      }
    );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      throw new Error(
        data.error ||
          "Error al seleccionar presupuesto."
      );
    }

    await actualizarPedidoSilenciosamente();

  } catch (error: any) {
    setError(
      error?.message ||
        "No se pudo seleccionar el presupuesto."
    );
  } finally {
    setPresupuestoSeleccionando(null);
  }
}}
disabled={
  presupuestoSeleccionando !== null
}
                className="mt-4 rounded-xl border border-red-600 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                {presupuestoSeleccionando === index
  ? "Seleccionando..."
  : "Elegir presupuesto"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
)}

{(!resultado.presupuestos ||
  resultado.presupuestos.length === 0 ||
  resultado.presupuestos.some((p: any) => String(p.seleccionado).toLowerCase() === "sí")) && (
  <>
    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
      Total a pagar
    </p>

    <p className="text-4xl font-black text-red-600">
      {resultado.precio !== "" &&
resultado.precio !== null &&
resultado.precio !== undefined &&
resultado.precio !== "Pendiente"
  ? `$${Number(
      resultado.precio
    ).toLocaleString("es-UY")}`
  : "Pendiente"}
    </p>
  </>
)}
</div>

{(!resultado.metodoPago ||
  resultado.metodoPago === "Sin seleccionar") &&
  (!resultado.presupuestos ||
    resultado.presupuestos.length === 0 ||
    resultado.presupuestos.some(
      (p: any) =>
        String(
          p.seleccionado
        ).toLowerCase() === "sí"
    )) && (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
          Elegí cómo querés pagar
        </p>

        <p className="mb-5 text-sm leading-6 text-[var(--text-muted)]">
          Revisá cuánto tenés que transferir
          ahora y cuánto quedará pendiente.
        </p>

      <div className="grid gap-4 sm:grid-cols-2">
  {[
    "Seña 20%",
    "Pago total",
  ].map((opcion) => {
    const precioFinal =
      Number(
        resultado.precio
      ) || 0;

    const esSena =
      opcion === "Seña 20%";

    const importe =
      esSena
        ? Math.round(
            precioFinal * 0.2
          )
        : precioFinal;

    const saldo =
      precioFinal - importe;

    const seleccionada =
      modalidadPago === opcion;

    return (
      <button
        key={opcion}
        type="button"
        onClick={() =>
          setModalidadPago(
            opcion
          )
        }
       className={`
  relative
  overflow-hidden
  rounded-2xl
  border
  p-5
  text-left
  transition-all

  ${
    seleccionada
      ? `
        border-[#4C6C81]/70
        bg-[#e4edf2]
        ring-1 ring-[#4C6C81]/15
        shadow-[0_12px_28px_rgba(37,67,93,0.10)]
        hover:border-[#7D0018]/35
        hover:bg-[#f2e8eb]
        hover:shadow-[0_14px_32px_rgba(125,0,24,0.10)]

        dark:border-[#87A4B5]/65
        dark:bg-[#25435D]/20
        dark:ring-[#87A4B5]/20
        dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]
        dark:hover:border-[#C76D7C]/70
dark:hover:bg-[#C76D7C]/[0.10]
dark:hover:shadow-[0_18px_45px_rgba(199,109,124,0.16)]
      `
      : `
        border-[#87A4B5]/55
        bg-white
        hover:-translate-y-0.5
        hover:border-[#7D0018]/35
        hover:bg-[#f8eef1]
        hover:shadow-[0_14px_32px_rgba(125,0,24,0.08)]

        dark:border-[#4C6C81]/40
        dark:bg-white/[0.015]
        dark:hover:border-[#C76D7C]/70
dark:hover:bg-[#C76D7C]/[0.10]
dark:hover:shadow-[0_18px_45px_rgba(199,109,124,0.16)]
      `
  }
`}
      >
        {seleccionada && (
          <span className="
            absolute
            right-4
            top-4
            rounded-full
            border border-[#4C6C81]/35
            bg-[#dce8ef]
            px-3
            py-1
            text-[8px]
            font-black
            uppercase
            tracking-[0.14em]
            text-[#25435D]

            dark:border-[#87A4B5]/40
            dark:bg-[#25435D]/85
            dark:text-[#B9D3E2]
          ">
            Elegido
          </span>
        )}

        <p className="
          pr-20
          text-xs
          font-black
          uppercase
          tracking-[0.22em]
          text-[#06152f]

          dark:text-white
        ">
          {esSena
            ? "Pagar seña 20%"
            : "Pagar el total"}
        </p>

        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          {esSena
            ? "Pagás una parte ahora y completás el resto más adelante."
            : "Completás el pago del pedido en un solo paso."}
        </p>

        <div
          className={`
            mt-5
            rounded-xl
            border
            px-4
            py-4

            ${
              seleccionada
                ? `
                  border-[#4C6C81]/55
                  bg-[#dce7ee]

                  dark:border-[#7D0018]/50
                  dark:bg-[#340A13]
                `
                : `
                  border-[#87A4B5]/55
                  bg-[#e9f0f4]

                  dark:border-[#4C6C81]/35
                  dark:bg-[#25435D]/10
                `
            }
          `}
        >
          <p className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.18em]
            text-[#4C6C81]

            dark:text-[#87A4B5]
          ">
            Transferís ahora
          </p>

          <p className="
            mt-2
            text-3xl
            font-black
            text-[#25435D]

            dark:text-[#B9D3E2]
          ">
            $
            {importe.toLocaleString(
              "es-UY"
            )}
          </p>
        </div>

        <div className="mt-4 border-t border-[var(--border-color)] pt-4">
          <p className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.18em]
            text-[#4C6C81]

            dark:text-[#87A4B5]
          ">
            Saldo pendiente
          </p>

          <p className="mt-1 text-xl font-black">
            $
            {saldo.toLocaleString(
              "es-UY"
            )}
          </p>
        </div>

        {esSena && (
  <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
    Podés completar el saldo
    más adelante desde esta
    misma página.
  </p>
)}
      </button>
    );
  })}
</div>

        <button
          type="button"
          onClick={
            confirmarMetodoPago
          }
          disabled={
            !modalidadPago ||
            guardandoMetodo
          }
          className={`mt-6 w-full rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-[0.25em] transition-all ${
  modalidadPago
    ? "border-[#7D0018] bg-gradient-to-r from-[#340A13] to-[#7D0018] text-[#B9D3E2] shadow-[0_12px_35px_rgba(52,10,19,0.35)] hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(52,10,19,0.42)]"
    : "cursor-not-allowed border-[#87A4B5]/50 bg-[#eef4f8] text-[#4C6C81] opacity-70 dark:border-[#4C6C81]/35 dark:bg-white/[0.02] dark:text-[#87A4B5] dark:opacity-45"
}`}
        >
          {guardandoMetodo
            ? "Guardando..."
            : modalidadPago
            ? `Confirmar ${modalidadPago}`
            : "Seleccioná una opción para continuar"}
        </button>
      </div>
    </div>
  )}

    {resultado.metodoPago === "Transferencia" &&
      !resultado.comprobante &&
      resultado.estadoPago !== "Esperando validación" &&
      resultado.estadoPago !== "Seña realizada correctamente" &&
      resultado.estadoPago !== "Pago realizado correctamente" && (
        <div className="mt-6 rounded-2xl border border-[var(--border-color)] p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Datos bancarios
          </p>

          <p className="mb-6 text-sm leading-7">
            Banco: BBVA<br />
Tipo de cuenta: Cuenta corriente en pesos<br />
Titular: Alexander López<br />
Cuenta: 26557312<br />
            Concepto: {resultado.pedido}
          </p>

          <div className="mb-6 rounded-2xl border-2 border-red-600 bg-red-50 px-5 py-5 text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
    {resultado.modalidad === "Seña 20%"
  ? "Seña a transferir"
  : "Total a transferir"}
  </p>

  <p className="mt-2 text-4xl font-black text-red-600">
    $
    {Number(
      resultado.importe || 0
    ).toLocaleString("es-UY")}
  </p>

  {resultado.modalidad === "Seña 20%" && (
    <div className="mt-5 border-t border-red-200 pt-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em]">
        Saldo pendiente
      </p>

      <p className="mt-1 text-xl font-black">
        $
        {Number(
          resultado.saldoPendiente || 0
        ).toLocaleString("es-UY")}
      </p>

      <p className="mt-3 text-sm leading-6">
        Podés completar ese saldo más adelante
        desde esta misma página.
      </p>
    </div>
  )}
</div>

        {resultado.puntos?.habilitados &&
  Number(
    resultado.precioOriginal || 0
  ) > 0 && (
    <div className="
      mt-6
      rounded-2xl
      border border-[#87A4B5]/55
      bg-[#eef4f8]
      p-5
      shadow-[0_10px_26px_rgba(37,67,93,0.08)]

      dark:border-[#4C6C81]/40
      dark:bg-[#010003]
      dark:shadow-none
    ">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="
            text-xs
            font-black
            uppercase
            tracking-[0.2em]
            text-[#06152f]

            dark:text-white
          ">
            Puntos Kint
          </p>

          <div className="mt-2 flex items-end gap-2">
            <p className="
              text-3xl
              font-black
              leading-none
              text-[#25435D]

              dark:text-[#B9D3E2]
            ">
              {Number(
                resultado.puntos
                  .disponibles || 0
              ).toLocaleString(
                "es-UY"
              )}
            </p>

            <p className="pb-0.5 text-xs font-semibold text-[var(--text-muted)]">
              puntos disponibles
            </p>
          </div>
        </div>

        <p className="
          text-xs
          font-black
          text-[#4C6C81]

          dark:text-[#87A4B5]
        ">
          1 punto = $
          {Number(
            resultado.puntos
              .valor || 1
          ).toLocaleString(
            "es-UY"
          )}
        </p>
      </div>

      {Number(
        resultado
          .puntosUtilizadosPedido ||
          0
      ) > 0 ? (
        <div className="mt-5">
          <p className="text-sm">
            Usaste{" "}
            <strong className="text-[#7D0018] dark:text-red-500">
              {Number(
                resultado
                  .puntosUtilizadosPedido
              ).toLocaleString(
                "es-UY"
              )}{" "}
              puntos
            </strong>
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Descuento aplicado: $
            {(
              Number(
                resultado
                  .puntosUtilizadosPedido
              ) *
              Number(
                resultado.puntos
                  .valor || 1
              )
            ).toLocaleString(
              "es-UY"
            )}
          </p>

          <button
            type="button"
            onClick={
              quitarPuntosKint
            }
            disabled={
              procesandoPuntos
            }
            className="
              mt-4
              text-xs
              font-black
              uppercase
              tracking-[0.15em]
              text-[#7D0018]
              transition
              hover:underline
              disabled:opacity-50

              dark:text-red-500
            "
          >
            {procesandoPuntos
              ? "Procesando..."
              : "Quitar puntos"}
          </button>
        </div>
      ) : Number(
          resultado.puntos
            .disponibles || 0
        ) >=
        Number(
          resultado.puntos
            .minimoUso || 50
        ) ? (
        <>
          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            Podés usar tus puntos además
del descuento o promoción
aplicada al pedido.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={
                puntosACanjear
              }
              onChange={(e) =>
                setPuntosACanjear(
                  e.target.value.replace(
                    /[^0-9]/g,
                    ""
                  )
                )
              }
              inputMode="numeric"
              placeholder={`Mínimo ${
                resultado.puntos
                  .minimoUso || 50
              } puntos`}
              className="
                min-w-0
                flex-1
                rounded-xl
                border border-[#87A4B5]/60
                bg-white
                px-4
                py-3
                text-sm
                font-bold
                text-[#06152f]
                outline-none
                transition
                placeholder:text-[#4C6C81]/70
                focus:border-[#4C6C81]

                dark:border-[#4C6C81]/40
                dark:bg-[#010003]/70
                dark:text-[#B9D3E2]
                dark:placeholder:text-[#87A4B5]/55
                dark:focus:border-[#87A4B5]
              "
            />

            <button
              type="button"
              onClick={() =>
                void usarPuntosKint()
              }
              disabled={
                procesandoPuntos ||
                !puntosACanjear
              }
              className="
                rounded-xl
                border border-[#7D0018]
                bg-[#7D0018]
                px-6
                py-3
                text-xs
                font-black
                uppercase
                tracking-[0.15em]
                text-white
                transition
                hover:bg-[#340A13]

                disabled:cursor-not-allowed
                disabled:border-[#87A4B5]/60
                disabled:bg-[#dfe8ed]
                disabled:text-[#4C6C81]
                disabled:opacity-100

                dark:bg-[#340A13]
                dark:text-[#B9D3E2]
                dark:hover:bg-[#7D0018]

                dark:disabled:border-[#4C6C81]/40
                dark:disabled:bg-[#340A13]
                dark:disabled:text-[#87A4B5]
                dark:disabled:opacity-40
              "
            >
              {procesandoPuntos
                ? "Aplicando..."
                : "Aplicar puntos"}
            </button>
          </div>

          {puntosACanjear && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <p>
                Ahorro{" "}
                <strong className="text-green-600">
                  $
                  {(
                    Number(
                      puntosACanjear
                    ) *
                    Number(
                      resultado.puntos
                        .valor || 1
                    )
                  ).toLocaleString(
                    "es-UY"
                  )}
                </strong>
              </p>

              <p>
  {resultado.modalidad === "Seña 20%"
    ? "Nueva seña "
    : "Nuevo total "}

  <strong className="text-green-600">
    $
    {(() => {
      const nuevoTotal = Math.max(
        0,
        Number(
  resultado.precio || 0
) -
          Number(
            puntosACanjear || 0
          ) *
            Number(
              resultado.puntos?.valor || 1
            )
      );

      const nuevoImporte =
        resultado.modalidad === "Seña 20%"
          ? Math.round(
              nuevoTotal * 0.2
            )
          : nuevoTotal;

      return nuevoImporte.toLocaleString(
        "es-UY"
      );
    })()}
  </strong>
</p>

              <p className="text-[var(--text-muted)]">
                Máximo{" "}
                <strong>
                  {Math.min(
                    Number(
                      resultado.puntos
                        .disponibles || 0
                    ),
                    Math.floor(
                     Number(
  resultado.precio || 0
) /
                        Number(
                          resultado.puntos
                            .valor || 1
                        )
                    )
                  ).toLocaleString(
                    "es-UY"
                  )}
                </strong>{" "}
                puntos
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Te faltan{" "}
          <strong>
            {Math.max(
              0,
              Number(
                resultado.puntos
                  .minimoUso || 50
              ) -
                Number(
                  resultado.puntos
                    .disponibles || 0
                )
            )}
          </strong>{" "}
          puntos para poder
          utilizarlos.
        </p>
      )}

      {mensajePuntos && (
        <p className="mt-4 text-sm font-bold text-green-600">
          {mensajePuntos}
        </p>
      )}
    </div>
  )}




          <div className="seguimiento-presupuesto-elegido rounded-2xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">
              Subir comprobante
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              JPG, PNG o PDF
            </p>

            <label className="mt-6 inline-block cursor-pointer rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white">
              Seleccionar archivo

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) {
                    setArchivosExtra([archivo]);
                  }
                }}
              />
            </label>

            {archivosExtra.length > 0 && (
              <button
                type="button"
                onClick={subirComprobante}
                disabled={subiendoArchivo}
                className="seguimiento-puntos mt-6 rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                {subiendoArchivo ? "Enviando..." : "Enviar comprobante"}
              </button>
            )}

            {mensajeArchivo && (
              <p className="mt-4 text-sm font-semibold text-green-600">
                {mensajeArchivo}
              </p>
            )}
          </div>
        </div>
      )}

{resultado.metodoPago === "Transferencia" && (
  <div className="mt-8 rounded-2xl border border-[var(--border-color)] p-6">

    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
          Resumen de pago
        </p>

        <p className="mt-2 text-xl font-black">
          {resultado.modalidad || "Pago"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Método
        </p>

        <p className="mt-1 text-sm font-bold text-red-600">
          Transferencia
        </p>
      </div>
    </div>

    <div className="border-t border-[var(--border-color)] pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {resultado.modalidad === "Seña 20%"
          ? "Seña transferida"
          : "Total a transferir"}
      </p>

      <p className="mt-2 text-2xl font-black">
        $
        {Number(
          resultado.importe || 0
        ).toLocaleString("es-UY")}
      </p>

      {resultado.modalidad === "Seña 20%" && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Saldo pendiente
          </p>

          <p className="mt-2 text-xl font-black text-red-600">
            $
            {Number(
              resultado.saldoPendiente || 0
            ).toLocaleString("es-UY")}
          </p>
        </div>
      )}
    </div>

    {resultado.modalidad === "Seña 20%" &&
      Number(resultado.saldoPendiente) > 0 &&
      resultado.estado !== "Entregado" &&
      resultado.pagoConfirmado === "Sí" &&
      resultado.saldoConfirmado !== "Sí" &&
      !resultado.comprobanteSaldo && (
        <div className="mt-6 border-t border-[var(--border-color)] pt-6">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Resta pagar
          </p>

          <p className="mb-5 text-3xl font-black text-red-600">
            $
            {Number(
              resultado.saldoPendiente || 0
            ).toLocaleString("es-UY")}
          </p>

          {resultado.puntos?.habilitados &&
  Number(
    resultado.puntos
      .disponibles || 0
  ) >=
    Number(
      resultado.puntos
        .minimoUso || 50
    ) && (
    <div className="
      mb-6
      rounded-2xl
      border border-[#87A4B5]/55
      bg-[#eef4f8]
      p-5

      dark:border-[#4C6C81]/40
      dark:bg-[#010003]
    ">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="
            text-xs
            font-black
            uppercase
            tracking-[0.2em]
          ">
            Usar Puntos Kint
          </p>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Tenés{" "}
            <strong className="
              text-[#25435D]
              dark:text-[#B9D3E2]
            ">
              {Number(
                resultado.puntos
                  .disponibles || 0
              ).toLocaleString(
                "es-UY"
              )}
            </strong>{" "}
            puntos disponibles
          </p>
        </div>

        <p className="
          text-xs
          font-black
          text-[#4C6C81]
          dark:text-[#87A4B5]
        ">
          1 punto = $
          {Number(
            resultado.puntos
              .valor || 1
          ).toLocaleString(
            "es-UY"
          )}
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
  Podés usar tus puntos además
  del descuento o promoción
  aplicada al pedido.
</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={
            puntosACanjear
          }
          onChange={(e) =>
            setPuntosACanjear(
              e.target.value.replace(
                /[^0-9]/g,
                ""
              )
            )
          }
          inputMode="numeric"
          placeholder={`Hasta ${Math.min(
            Number(
              resultado.puntos
                .disponibles || 0
            ),
            Math.floor(
              Number(
                resultado
                  .saldoPendiente ||
                  0
              ) /
                Number(
                  resultado.puntos
                    .valor || 1
                )
            )
          ).toLocaleString(
            "es-UY"
          )} puntos`}
          className="
            min-w-0
            flex-1
            rounded-xl
            border border-[#87A4B5]/60
            bg-white
            px-4
            py-3
            text-sm
            font-bold
            text-[#06152f]
            outline-none

            dark:border-[#4C6C81]/40
            dark:bg-[#010003]
            dark:text-[#B9D3E2]
          "
        />

        <button
          type="button"
          onClick={() =>
            void usarPuntosSaldoKint()
          }
          disabled={
            procesandoPuntos ||
            !puntosACanjear
          }
          className="
            rounded-xl
            border border-[#7D0018]
            bg-[#7D0018]
            px-6
            py-3
            text-xs
            font-black
            uppercase
            tracking-[0.15em]
            text-white
            transition

            hover:bg-[#340A13]

            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          {procesandoPuntos
            ? "Aplicando..."
            : "Usar puntos"}
        </button>
      </div>

      {puntosACanjear && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <p>
            Usás{" "}
            <strong>
              {Number(
                puntosACanjear
              ).toLocaleString(
                "es-UY"
              )}{" "}
              puntos
            </strong>
          </p>

          <p>
            Nuevo saldo{" "}
            <strong className="text-green-600">
              $
              {Math.max(
                0,
                Number(
                  resultado
                    .saldoPendiente ||
                    0
                ) -
                  Number(
                    puntosACanjear
                  ) *
                    Number(
                      resultado
                        .puntos
                        .valor || 1
                    )
              ).toLocaleString(
                "es-UY"
              )}
            </strong>
          </p>
        </div>
      )}

      {mensajePuntos && (
        <p className="mt-4 text-sm font-bold text-green-600">
          {mensajePuntos}
        </p>
      )}
    </div>
  )}

          <p className="mb-6 text-sm leading-7 text-[var(--text-muted)]">
            Podés completar este saldo cuando quieras desde esta misma página.
            Cuando el pedido figure como Terminado, podés volver acá,
            revisar que esté listo y pagar el saldo.
          </p>

          {!mostrarSaldo ? (
            <button
              type="button"
              onClick={() => setMostrarSaldo(true)}
              className="w-full rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white"
            >
              Pagar presupuesto restante
            </button>
          ) : (
            <div className="space-y-6">
              <p className="text-sm leading-7">
                Banco: BBVA
                <br />
                Tipo de cuenta: Cuenta corriente en pesos
                <br />
                Titular: Alexander López
                <br />
                Cuenta: 26557312
                <br />
                Concepto: {resultado.pedido} - Saldo
              </p>

              <label className="inline-block cursor-pointer rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white">
                Seleccionar comprobante

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];

                    if (archivo) {
                      setArchivosExtra([archivo]);
                    }
                  }}
                />
              </label>

              {archivosExtra.length > 0 && (
                <button
                  type="button"
                  onClick={subirComprobanteSaldo}
                  disabled={subiendoArchivo}
                  className="w-full rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  {subiendoArchivo
                    ? "Enviando..."
                    : "Enviar comprobante del saldo"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

    <div className="mt-6 border-t border-[var(--border-color)] pt-6">
      <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
        Estado del pago
      </p>

      {resultado.saldoConfirmado === "Sí" ? (
        <div className="rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
          <p className="text-3xl font-black text-green-600">
            ✓
          </p>

          <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
            Pago completado correctamente
          </p>

          <div className="mt-4 space-y-1 text-sm font-semibold">
  <p>
    Transferido: $
    {Number(
      resultado.importe || 0
    ).toLocaleString("es-UY")}
  </p>

  {Number(
    resultado.puntosUtilizadosPedido || 0
  ) > 0 && (
    <p>
      Cubierto con Puntos Kint: $
      {(
        Number(
          resultado.puntosUtilizadosPedido || 0
        ) *
        Number(
          resultado.puntos?.valor || 1
        )
      ).toLocaleString("es-UY")}
    </p>
  )}

  <p className="pt-2 font-black">
    Total cubierto: $
    {(
      Number(
        resultado.importe || 0
      ) +
      Number(
        resultado.puntosUtilizadosPedido || 0
      ) *
        Number(
          resultado.puntos?.valor || 1
        )
    ).toLocaleString("es-UY")}
  </p>
</div>
        </div>
      ) : resultado.comprobanteSaldo ? (
        <div className="rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
          <p className="text-3xl font-black text-green-600">
            ✓
          </p>

          <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
            Comprobante enviado correctamente
          </p>

          <p className="mt-3 text-sm font-semibold">
            Esperando confirmación.
          </p>
        </div>
      ) : resultado.estadoPago ===
          "Pago realizado correctamente" ||
        resultado.estadoPago ===
          "Seña realizada correctamente" ? (
        <div className="rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
          <p className="text-3xl font-black text-green-600">
            ✓
          </p>

          <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
            {resultado.estadoPago}
          </p>
        </div>
      ) : (
        <p className="text-lg font-bold text-red-600">
          {resultado.estadoPago || "Pendiente"}
        </p>
      )}
    </div>
  </div>
)}

  </div>
)}

{resultado.estado === "Recibido" && !resultado.codigoDescuento && (
  <div className="mb-12 rounded-2xl border border-[var(--border-color)] p-6">
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Código de descuento
    </p>

    <p className="mb-5 text-sm leading-6 text-[var(--text-muted)]">
      Si tenés un código de descuento, podés aplicarlo mientras el pedido esté en estado Recibido.
    </p>

    <input
      value={codigoDescuentoInput}
      onChange={(e) => setCodigoDescuentoInput(e.target.value.toUpperCase())}
      placeholder="Ej: KINT10"
      className="mb-4 w-full rounded-2xl border border-[var(--border-color)] bg-transparent px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] outline-none transition focus:border-red-600"
    />

    <button
      type="button"
      onClick={aplicarCodigoDescuento}
      disabled={aplicandoDescuento}
      className="w-full rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
    >
      {aplicandoDescuento ? "Aplicando..." : "Aplicar código"}
    </button>
  </div>
)}

{Array.isArray(resultado.archivos) &&
  resultado.archivos.length > 0 && (
    <div className="mb-6 rounded-xl border border-[var(--border-color)] p-3 sm:p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Archivos del pedido
      </p>

      <p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">
        Estos son los archivos vinculados actualmente a tu pedido.
      </p>

      <div className="space-y-1.5">
        {resultado.archivos.map(
          (archivo: any, index: number) => (
            <div
              key={`${archivo.idArchivo || "archivo"}-${index}`}
              className="flex flex-col gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="break-all text-[11px] font-semibold leading-4">
                  {archivo.nombreArchivo ||
                    `Archivo ${index + 1}`}
                </p>

                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {archivo.tipo || "Archivo"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
  {archivo.link ? (
    <a
      href={archivo.link}
      target="_blank"
      rel="noopener noreferrer"
      className="px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-red-600 transition hover:underline"
    >
      Abrir
    </a>
  ) : (
    <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">
      Sin enlace
    </span>
  )}

  {resultado.estado === "Recibido" && (
    <>
      <label
        title="Reemplazar archivo"
        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--border-color)] text-sm font-bold transition hover:border-red-600 hover:text-red-600 ${
          archivoReemplazando ||
          archivoEliminando
            ? "pointer-events-none opacity-50"
            : ""
        }`}
      >
        {archivoReemplazando ===
        archivo.idArchivo
          ? "…"
          : "↻"}

        <input
          type="file"
          accept=".stl,.skp"
          className="hidden"
          disabled={Boolean(
            archivoReemplazando ||
              archivoEliminando
          )}
          onChange={(e) => {
            const archivoNuevo =
              e.target.files?.[0];

            if (archivoNuevo) {
              void reemplazarArchivoPedido(
                archivo,
                archivoNuevo
              );
            }

            e.currentTarget.value = "";
          }}
        />
      </label>

      <button
        type="button"
        disabled={Boolean(
          archivoReemplazando ||
            archivoEliminando
        )}
        onClick={() =>
          eliminarArchivoPedido(archivo)
        }
        className="rounded-md border border-red-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.06em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
      >
        {archivoEliminando ===
        archivo.idArchivo
          ? "Eliminando..."
          : "Eliminar"}
      </button>
    </>
  )}
</div>
            </div>
          )
        )}
      </div>
    </div>
  )}

    {resultado.estado === "Recibido" ? (
  <div className="mb-8 rounded-2xl border border-[var(--border-color)] p-4 sm:p-5">
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Archivos adicionales
    </p>

    <p className="mb-6 text-sm leading-6 text-[var(--text-muted)]">
      Si olvidaste adjuntar algún archivo o necesitás enviar una versión corregida, podés subirla acá.
    </p>

    <label className="mb-5 block cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 text-center transition hover:border-red-600">
  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">
    Subir archivos
  </p>

  <p className="mt-3 text-sm text-[var(--text-muted)]">
    Arrastrá tus archivos acá o tocá para seleccionarlos.
  </p>

  {archivosExtra.length > 0 && (
    <p className="mt-4 text-sm font-semibold">
      {archivosExtra.length} archivo(s) seleccionado(s)
    </p>
  )}

  <input
    type="file"
    multiple
    className="hidden"
    onChange={(e) => setArchivosExtra(Array.from(e.target.files || []))}
  />
</label>

    <button
      onClick={subirArchivoAdicional}
      disabled={subiendoArchivo}
      className="w-full rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
    >
      {subiendoArchivo ? "Enviando..." : "Enviar archivos"}
    </button>

    {mensajeArchivo && (
  <div className="mt-6 rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center">
    <p className="text-3xl font-black text-green-600">✓</p>
    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
      {mensajeArchivo}
    </p>
  </div>
)}
  </div>
) : (
  <div className="mb-12 border-t border-[var(--border-color)] pt-8">
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Archivos
    </p>

    <p className="text-sm font-semibold text-[var(--text-muted)]">
      Los archivos ya no pueden modificarse porque el pedido se encuentra en una etapa avanzada.
    </p>
  </div>
)}

{resultado.historial && (
  <div className="border-t border-[var(--border-color)] pt-8">
    <p className="mb-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Historial
    </p>

    <div className="relative">
      {String(resultado.historial)
        .split("\n")
        .filter(Boolean)
        .reverse()
        .map((item, index, items) => {
          const partes = item.match(
            /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s*-\s*(.+)$/
          );

          const fecha = partes?.[1] || "";
          const hora = partes?.[2] || "";
          const evento = partes?.[3] || item;

          const esUltimo =
            index === items.length - 1;

          const esEntregado =
            evento.trim() === "Entregado";

          return (
            <div
              key={`${item}-${index}`}
              className="relative flex gap-4"
            >
              {/* MARCADOR */}
              <div className="flex w-5 shrink-0 flex-col items-center">
                <div
                  className={`relative z-10 mt-1 h-3 w-3 rounded-full ${
                    index === 0
                      ? esEntregado
                        ? "bg-green-600 ring-4 ring-green-600/15"
                        : "bg-red-600 ring-4 ring-red-600/15"
                      : "border-2 border-[var(--border-color)] bg-[var(--page-bg)]"
                  }`}
                />

                {!esUltimo && (
                  <div className="min-h-12 w-px flex-1 bg-[var(--border-color)]" />
                )}
              </div>

              {/* INFORMACIÓN */}
              <div className="pb-7">
                <p
                  className={`text-xs font-black uppercase tracking-[0.16em] ${
                    index === 0
                      ? esEntregado
                        ? "text-green-600"
                        : "text-red-600"
                      : "text-[var(--text-main)]"
                  }`}
                >
                  {evento}
                </p>

                {(fecha || hora) && (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {fecha}
                    {fecha && hora ? " · " : ""}
                    {hora}
                  </p>
                )}

                {index === 0 && (
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Última actualización
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}

  </div>
)}

      </section>
    </main>
  );
}
export default function Seguimiento() {

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SeguimientoContent />
    </Suspense>
  );
}
