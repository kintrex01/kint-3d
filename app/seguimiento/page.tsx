"use client";

import Link from "next/link";
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
const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
const [guardandoMetodo, setGuardandoMetodo] = useState(false);
const [modalidadPago, setModalidadPago] = useState("");
const [mostrarSaldo, setMostrarSaldo] = useState(false);
const [modoOscuro, setModoOscuro] = useState(false);
const [codigoDescuentoInput, setCodigoDescuentoInput] = useState("");
const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  
  const searchParams = useSearchParams();

useEffect(() => {
  const pedidoUrl = searchParams.get("pedido") || "";
  const codigoUrl = searchParams.get("codigo") || "";

  if (pedidoUrl) setPedido(pedidoUrl.toUpperCase());
  if (codigoUrl) setCodigo(codigoUrl.toUpperCase());

}, [searchParams]);

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
  } catch (error: any) {
    setError(error.message || "Error al subir archivo.");
  }

  setSubiendoArchivo(false);
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
    await consultarPedido();
  } catch (error: any) {
    setError(error.message || "Error al aplicar descuento.");
  }

  setAplicandoDescuento(false);
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

    await consultarPedido();
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
    await consultarPedido();
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
    await consultarPedido();
  } catch (error: any) {
    setError(error.message || "Error al subir comprobante del saldo.");
  }

  setSubiendoArchivo(false);
}

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
      <div className="fixed left-6 right-6 top-6 z-50 flex items-center justify-between">
  <Link href="/">
    <button className="flex items-center gap-1 text-2xl font-bold text-[var(--text-main)] transition hover:opacity-70">
  <span className="relative -top-1 text-6xl leading-none">‹</span>
  <span>Inicio</span>
</button>
  </Link>

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
  <div className="mt-12 w-full max-w-4xl rounded-3xl border border-[var(--border-color)] px-6 py-10 text-left sm:px-10">
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

  const nombresMobile = [
    "Recibido",
    "Presupuestado",
    "Pago",
    "Confirmado",
    "Impresión",
    "Terminado",
    "Entregado",
  ];

  const estadoActual = estados.indexOf(resultado.estado);

  return (
    <>
      <div className="hidden w-full pb-2 sm:block">
        <div className="grid grid-cols-7 items-start">
          {estados.map((estado, index) => {
            const activo = index <= estadoActual;
            const esEntregado = estado === "Entregado" && activo;

            return (
              <div key={estado} className="flex min-w-0 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={`h-[2px] flex-1 ${
                      index === 0
                        ? "bg-transparent"
                        : activo
                        ? "bg-red-600"
                        : "bg-[var(--border-color)]"
                    }`}
                  />

                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
                      esEntregado
                        ? "border-green-600 bg-green-600 text-white"
                        : activo
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-[var(--border-color)] text-[var(--text-muted)]"
                    }`}
                  >
                    {esEntregado ? "✓" : index + 1}
                  </div>

                  <div
                    className={`h-[2px] flex-1 ${
                      index === estados.length - 1
                        ? "bg-transparent"
                        : index < estadoActual
                        ? "bg-red-600"
                        : "bg-[var(--border-color)]"
                    }`}
                  />
                </div>

                <p
                  className={`mt-3 max-w-[90px] text-center text-[9px] font-bold uppercase leading-4 tracking-[0.12em] ${
                    activo
                      ? "text-[var(--text-main)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {estado}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {estados.map((estado, index) => {
          const activo = index <= estadoActual;

          return (
            <div
              key={estado}
              className={`flex items-center gap-3 border px-4 py-3 ${
                activo
                  ? "border-red-600 bg-red-50"
                  : "border-[var(--border-color)]"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                  activo
                    ? "bg-red-600 text-white"
                    : "bg-transparent text-[var(--text-muted)]"
                }`}
              >
                {estado === "Entregado" && activo ? "✓" : index + 1}
              </span>

              <span
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  activo
                    ? "text-[var(--text-main)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {nombresMobile[index]}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
})()}

    </div>

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
      Pago
    </p>

    <div className="mb-8">
      {resultado.precioOriginal &&
  resultado.precioOriginal !== resultado.precio &&
  (!resultado.presupuestos ||
    resultado.presupuestos.length === 0 ||
    resultado.presupuestos.some((p: any) => String(p.seleccionado).toLowerCase() === "sí")) && (
        <div className="mb-6 space-y-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Precio original
            </p>
            <p className="text-xl font-bold line-through text-[var(--text-muted)]">
              ${resultado.precioOriginal}
            </p>
          </div>

          {resultado.codigoDescuento && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                Código aplicado
              </p>
              <p className="text-lg font-bold italic text-red-600">
                {resultado.codigoDescuento}
              </p>
            </div>
          )}

          {resultado.descuento && (
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Descuento aplicado:{" "}
              {Number(resultado.descuento) < 1
                ? `${Number(resultado.descuento) * 100}%`
                : `${resultado.descuento}%`}
            </p>
          )}

          <div className="h-px w-full bg-[var(--border-color)]" />
        </div>
      )}

{resultado.estado === "Presupuestado" &&
  resultado.presupuestos?.length > 0 && (
    <div className="mb-8 rounded-2xl border border-[var(--border-color)] p-5">
      <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
        Opciones de presupuesto
      </p>

      {resultado.presupuestos.some((p: any) => String(p.seleccionado).toLowerCase() === "sí") ? (
        resultado.presupuestos
          .filter((p: any) => String(p.seleccionado).toLowerCase() === "sí")
          .map((presupuesto: any, index: number) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--border-color)] p-4"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Presupuesto elegido
              </p>

              <p className="mt-3 font-bold">
                {presupuesto.opcion}
              </p>

              <p className="mt-2 text-sm">
                {presupuesto.descripcion}
              </p>

              <p className="mt-3 text-lg font-bold text-[var(--text-muted)]">
                ${presupuesto.precio}
              </p>
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

              {Number(presupuesto.descuento || resultado.descuento || 0) > 0 ? (
  <div className="mt-3">
    <p className="text-sm font-bold line-through text-[var(--text-muted)]">
      ${presupuesto.precioOriginal || presupuesto.precio}
    </p>

    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
      {resultado.codigoDescuento} aplicado · {presupuesto.descuento || resultado.descuento}% OFF
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

console.log("PRESUPUESTO ENVIADO:");
console.log({
  pedido: resultado.pedido,
  codigo,
  index,
  opcion: presupuesto.opcion,
  descripcion: presupuesto.descripcion,
  precioOriginal: presupuesto.precioOriginal,
  precio: presupuesto.precio,
});

                  const response = await fetch("/api/seleccionar-presupuesto", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
  pedido: resultado.pedido,
  codigo,
  index,
}),
                  });

                  const data = await response.json();

                  if (data.ok) {
                    window.location.reload();
                  } else {
                    alert(data.error || "Error al seleccionar presupuesto.");
                  }
                }}
                className="mt-4 rounded-xl border border-red-600 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-600 hover:text-white"
              >
                Elegir presupuesto
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
      {resultado.precio && resultado.precio !== "Pendiente"
        ? `$${resultado.precio}`
        : "Pendiente"}
    </p>
  </>
)}
</div>

{(!resultado.metodoPago || resultado.metodoPago === "Sin seleccionar") &&
  (!resultado.presupuestos ||
    resultado.presupuestos.length === 0 ||
    resultado.presupuestos.some((p: any) => String(p.seleccionado).toLowerCase() === "sí")) && (
    <div className="space-y-6">
      <div>
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
          ¿Cómo querés continuar?
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {["Seña 20%", "Pago total"].map((opcion) => {
            const precioFinal = Number(resultado.precio) || 0;
            const importe =
              opcion === "Seña 20%" ? Math.round(precioFinal * 0.2) : precioFinal;
            const saldo = precioFinal - importe;

            return (
              <button
                key={opcion}
                type="button"
                onClick={() => setModalidadPago(opcion)}
                className={`rounded-2xl border px-5 py-5 text-left transition ${
                  modalidadPago === opcion
                    ? "border-red-600 bg-[#ffe5e5] text-black"
                    : "border-[var(--border-color)] hover:border-red-600"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">
                  {opcion}
                </p>

                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  Transferir ahora: ${importe}<br />
                  Resta pagar: ${saldo}
                </p>
              </button>
            );
          })}
        </div>
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
            Banco: ITAU<br />
            Titular: Alexander López<br />
            Cuenta: 9454754<br />
            Concepto: {resultado.pedido}
          </p>

          <div className="rounded-2xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 text-center">
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
                className="mt-6 rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
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

    <div className="mt-8 rounded-2xl border border-[var(--border-color)] p-6">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
        Método seleccionado
      </p>

      <p className="mb-6 text-xl font-bold">
        {metodoSeleccionado || resultado.metodoPago || "Sin seleccionar"}
      </p>

      {resultado.modalidad && (
        <div className="mb-6 border-t border-[var(--border-color)] pt-6">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Modalidad
          </p>

          <p className="mb-4 text-lg font-bold">
            {resultado.modalidad}
          </p>

          <p className="text-sm leading-7 text-[var(--text-muted)]">
  Importe transferido: ${resultado.importe || 0}<br />
  Resta pagar: ${resultado.saldoPendiente || 0}
</p>
        </div>
      )}

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

      <p className="mb-6 text-3xl font-black text-red-600">
        ${resultado.saldoPendiente}
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
            Banco: ITAU<br />
            Titular: Alexander López<br />
            Cuenta: 9454754<br />
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
              {subiendoArchivo ? "Enviando..." : "Enviar comprobante del saldo"}
            </button>
          )}
        </div>
      )}
    </div>
  )}

      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
        Estado
      </p>

      {resultado.saldoConfirmado === "Sí" ? (
  <div className="mb-6 rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black">
    <p className="text-3xl font-black text-green-600">✓</p>
    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
      Pago completado correctamente
    </p>
    <p className="mt-3 text-sm font-semibold">
      Total pagado: ${resultado.precio}
    </p>
  </div>
) : resultado.comprobanteSaldo ? (
  <div className="mb-6 rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black">
    <p className="text-3xl font-black text-green-600">✓</p>
    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
      Comprobante enviado correctamente
    </p>
    <p className="mt-3 text-sm font-semibold">
      Esperando confirmación.
    </p>
  </div>
) : resultado.estadoPago === "Pago realizado correctamente" ||
  resultado.estadoPago === "Seña realizada correctamente" ? (
  <div className="mb-6 rounded-2xl border border-green-600 bg-green-50 px-6 py-5 text-center text-black">
    <p className="text-3xl font-black text-green-600">✓</p>
    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-green-700">
      {resultado.estadoPago}
    </p>
  </div>
) : (
  <p className="mb-6 text-lg font-bold text-red-600">
    {resultado.estadoPago || "Pendiente"}
  </p>
)}

      {(!resultado.metodoPago || resultado.metodoPago === "Sin seleccionar") && (
        <button
          type="button"
          onClick={confirmarMetodoPago}
          disabled={guardandoMetodo}
          className="w-full rounded-2xl border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
        >
          {guardandoMetodo ? "Guardando..." : "Confirmar método de pago"}
        </button>
      )}
    </div>
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

    {["Recibido", "Presupuestado", "Método de pago seleccionado"].includes(resultado.estado) ? (
  <div className="mb-12 rounded-2xl border border-[var(--border-color)] p-6">
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
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Historial
    </p>

    <div className="space-y-4">
      {String(resultado.historial)
        .split("\n")
        .filter(Boolean)
        .reverse()
        .map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-[var(--border-color)] px-4 py-3"
          >
            <p className="text-sm font-semibold">
              {item}
            </p>
          </div>
        ))}
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
