"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function SeguimientoContent() {
  const [pedido, setPedido] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState("");
  const [archivosExtra, setArchivosExtra] = useState<File[]>([]);
const [subiendoArchivo, setSubiendoArchivo] = useState(false);
const [mensajeArchivo, setMensajeArchivo] = useState("");
  
  const searchParams = useSearchParams();

useEffect(() => {
  const pedidoUrl = searchParams.get("pedido") || "";
  const codigoUrl = searchParams.get("codigo") || "";

  if (pedidoUrl) setPedido(pedidoUrl.toUpperCase());
  if (codigoUrl) setCodigo(codigoUrl.toUpperCase());

}, [searchParams]);
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

  const formData = new FormData();
  formData.append("pedido", pedido);
  formData.append("codigo", codigo);
  archivosExtra.forEach((archivo) => {
  formData.append("archivos", archivo);
});

  setSubiendoArchivo(true);

  try {
    const response = await fetch("/api/archivos", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo subir el archivo.");
    }

    setMensajeArchivo("Archivo enviado correctamente.");
    setArchivosExtra([]);
  } catch (error: any) {
    setError(error.message || "Error al subir archivo.");
  }

  setSubiendoArchivo(false);
}
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)] transition">
      <div className="fixed left-8 top-8 z-50">
        <Link href="/">
          <button className="text-sm font-bold uppercase tracking-[0.3em] hover:text-red-600">
            ‹ Inicio
          </button>
        </Link>
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
          <div className="mt-12 w-full max-w-xl border border-[var(--border-color)] p-8 text-left">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Número de pedido
            </p>
            <p className="mb-6 text-3xl font-black">{resultado.pedido}</p>

            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Estado
            </p>
            <p className="mb-6 text-2xl font-bold text-red-600">
              {resultado.estado || "Sin estado"}
            </p>
            {resultado.estado && (
  <div className="mb-8 mt-4">
    {["Recibido", "Presupuestado", "En impresión", "Terminado", "Entregado"].map(
      (estado, index) => {
        const estados = ["Recibido", "Presupuestado", "En impresión", "Terminado", "Entregado"];
        const estadoActual = estados.indexOf(resultado.estado);
        const activo = index <= estadoActual;

        return (
          <div key={estado} className="mb-4 flex items-center gap-4">
            <div
              className={`h-4 w-4 rounded-full border ${
                activo
                  ? "border-red-600 bg-red-600"
                  : "border-[var(--border-color)]"
              }`}
            />

            <div
              className={`text-xs font-bold uppercase tracking-[0.25em] ${
                activo ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
              }`}
            >
              {estado}
            </div>
          </div>
        );
      }
    )}
  </div>
)}

            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Precio
            </p>
            <p className="text-2xl font-bold text-red-600">
              {resultado.precio && resultado.precio !== "Pendiente"
              ? `$${resultado.precio}`
              : "Pendiente"}
              </p>
              {resultado.historial && (
  <div className="mt-10">
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Historial
    </p>

    <div className="space-y-3">
      {String(resultado.historial)
        .split("\n")
        .map((item, index) => (
          <p key={index} className="text-sm font-semibold">
            {item}
          </p>
          
        ))}
    </div>
  </div>
)}

{["Recibido", "Presupuestado"].includes(resultado.estado) && (
  <div className="mt-10 border-t border-[var(--border-color)] pt-8">
    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
      Archivos adicionales  
    </p>
    
<p className="mb-5 text-xs leading-6 tracking-[0.12em] text-[var(--text-muted)]">
  Se aceptan archivos STL o SKP. Para evitar errores, enviá los archivos de a uno
  si son pesados. Tamaño máximo recomendado: 50 MB por archivo.
</p>

    <label
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    e.preventDefault();
    setArchivosExtra(Array.from(e.dataTransfer.files));
  }}
  className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border-color)] px-6 py-14 text-center transition hover:border-red-600"
>
  <input
    type="file"
    multiple
    onChange={(e) =>
      setArchivosExtra(Array.from(e.target.files || []))
    }
    className="hidden"
  />

  <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">
    Seleccionar archivos
  </span>

  <span className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
    o arrastralos acá
  </span>
</label>

{archivosExtra.length > 0 && (
  <div className="mt-4 space-y-2">
    {archivosExtra.map((archivo, index) => (
      <p key={index} className="text-xs text-[var(--text-muted)]">
        {archivo.name}
      </p>
    ))}
  </div>
)}

    <button
      onClick={subirArchivoAdicional}
      disabled={subiendoArchivo}
      className="mt-5 w-full border border-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
    >
      {subiendoArchivo ? "Enviando..." : "Enviar archivos"}
    </button>

    {mensajeArchivo && (
      <p className="mt-4 text-sm font-semibold text-red-600">
        {mensajeArchivo}
      </p>
    )}
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
