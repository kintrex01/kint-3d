"use client";

import { useEffect, useState } from "react";

/*
 * Seguimiento: cobros extra del pedido (algo que se sumó después, ej. una
 * pieza que faltaba). Transferís y subís el comprobante; Kint 3D lo valida.
 * Si no hay cobros, no muestra nada.
 */

type Cobro = {
  id: string;
  concepto: string;
  monto: number;
  estado: "Pendiente" | "Por validar" | "Pagado";
};

function pesos(monto: number) {
  return `$${Math.round(monto).toLocaleString("es-UY")}`;
}

async function leerArchivo(archivo: File) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

export default function CobrosExtraCliente({ pedido, codigo }: { pedido: string; codigo: string }) {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [abierto, setAbierto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pedido || !codigo) return;
    let activo = true;
    fetch("/api/cobro-extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "ver", pedido, codigo }),
    })
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !data?.ok) return;
        setCobros(data.cobros || []);
        // Viene del correo (…#cobros-extra): lo lleva directo al cobro.
        if (window.location.hash === "#cobros-extra" && (data.cobros || []).length) {
          window.setTimeout(() => document.getElementById("cobros-extra")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [pedido, codigo]);

  if (!cobros.length) return null;

  const pendientes = cobros.filter((cobro) => cobro.estado === "Pendiente");
  const totalPendiente = pendientes.reduce((suma, cobro) => suma + cobro.monto, 0);

  async function enviar(cobro: Cobro) {
    if (!archivo) {
      setError("Seleccioná el comprobante.");
      return;
    }
    if (archivo.size > 3.5 * 1024 * 1024) {
      setError("El archivo es muy pesado (máximo 3,5 MB). Probá con una captura de pantalla.");
      return;
    }
    setEnviando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch("/api/cobro-extra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "comprobante",
          pedido,
          codigo,
          id: cobro.id,
          archivoBase64: await leerArchivo(archivo),
          archivoNombre: archivo.name,
        }),
      });
      const data = await respuesta.json().catch(() => null);
      if (!data?.ok) throw new Error(data?.error || "No se pudo enviar el comprobante. Probá de nuevo.");
      setCobros(data.cobros || []);
      setMensaje(data.mensaje || "Comprobante enviado.");
      setArchivo(null);
      setAbierto("");
    } catch (motivo) {
      setError(motivo instanceof Error ? motivo.message : "No se pudo enviar el comprobante.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="cobros-extra" className={`mb-6 scroll-mt-24 rounded-2xl border p-4 sm:p-6 ${totalPendiente > 0 ? "border-red-600/50" : "border-[var(--border-color)]"}`}>
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Cobros extra</p>
      {totalPendiente > 0 ? (
        <>
          <p className="text-xl font-black leading-snug">Tenés un pago extra de {pesos(totalPendiente)}</p>
          <p className="mb-4 mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Se sumó algo a tu pedido. Tocá «Pagar», transferí y subí el comprobante acá mismo.
          </p>
        </>
      ) : (
        <p className="mb-4 text-sm leading-6 text-[var(--text-muted)]">Lo que se sumó a tu pedido después del presupuesto.</p>
      )}

      <ul className="space-y-3">
        {cobros.map((cobro) => (
          <li key={cobro.id} className="rounded-2xl border border-[var(--border-color)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{cobro.concepto}</p>
              <p className={`shrink-0 text-base font-black tabular-nums ${cobro.estado === "Pagado" ? "text-green-600" : "text-red-600"}`}>{pesos(cobro.monto)}</p>
            </div>

            {cobro.estado === "Pagado" && <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-green-600">✓ Pagado</p>}
            {cobro.estado === "Por validar" && (
              <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                Comprobante enviado. Lo estamos verificando: no tenés que hacer nada más.
              </p>
            )}

            {cobro.estado === "Pendiente" &&
              (abierto !== cobro.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(cobro.id);
                    setArchivo(null);
                    setError("");
                  }}
                  className="mt-3 w-full rounded-2xl border border-red-600 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-600 hover:text-white"
                >
                  Pagar {pesos(cobro.monto)}
                </button>
              ) : (
                <div className="mt-3 space-y-4">
                  <p className="text-sm leading-7">
                    Banco: BBVA
                    <br />
                    Tipo de cuenta: Cuenta corriente en pesos
                    <br />
                    Titular: Alexander López
                    <br />
                    Cuenta: 26557312
                    <br />
                    Monto: <b>{pesos(cobro.monto)}</b>
                    <br />
                    Concepto: {pedido} - Extra
                  </p>

                  <label className="inline-block cursor-pointer rounded-2xl border border-red-600 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-600 hover:text-white">
                    {archivo ? "Cambiar comprobante" : "Seleccionar comprobante"}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(evento) => {
                        setArchivo(evento.target.files?.[0] || null);
                        setError("");
                      }}
                    />
                  </label>
                  {archivo && <p className="truncate text-xs text-[var(--text-muted)]">{archivo.name}</p>}

                  {archivo && (
                    <button
                      type="button"
                      onClick={() => void enviar(cobro)}
                      disabled={enviando}
                      className="w-full rounded-2xl bg-red-600 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {enviando ? "Enviando..." : "Enviar comprobante"}
                    </button>
                  )}
                </div>
              ))}
          </li>
        ))}
      </ul>

      {mensaje && <p className="mt-3 text-sm font-bold text-green-600">{mensaje}</p>}
      {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
    </div>
  );
}
