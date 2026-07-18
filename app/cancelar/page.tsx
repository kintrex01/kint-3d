"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MOTIVOS = [
  "El precio no me sirve",
  "Solo estaba averiguando",
  "Ya no necesito el pedido",
  "El plazo de entrega no me sirve",
  "Necesito modificar el proyecto",
  "Otro",
];

type Verificacion = {
  ok: boolean;
  permitido: boolean;
  pedido?: string;
  nombre?: string;
  estado?: string;
  mensaje?: string;
  error?: string;
};

export default function CancelarPedidoPage() {
  const [pedido, setPedido] = useState("");
  const [codigo, setCodigo] = useState("");

  const [verificacion, setVerificacion] =
    useState<Verificacion | null>(null);

  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const parametros = new URLSearchParams(
      window.location.search
    );

    const pedidoURL =
      parametros.get("pedido")?.trim().toUpperCase() || "";

    const codigoURL =
      parametros.get("codigo")?.trim().toUpperCase() || "";

    setPedido(pedidoURL);
    setCodigo(codigoURL);

    if (!pedidoURL || !codigoURL) {
      setError(
        "El enlace de cancelación está incompleto."
      );
      setCargando(false);
      return;
    }

    verificarPedido(pedidoURL, codigoURL);
  }, []);

  async function verificarPedido(
    pedidoActual: string,
    codigoActual: string
  ) {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `/api/cancelar-pedido?tipo=verificar_cancelacion` +
          `&pedido=${encodeURIComponent(pedidoActual)}` +
          `&codigo=${encodeURIComponent(codigoActual)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const datos: Verificacion =
        await respuesta.json();

      if (!datos.ok) {
        throw new Error(
          datos.error ||
            "No pudimos verificar el pedido."
        );
      }

      setVerificacion(datos);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "Ocurrió un error al verificar el pedido."
      );
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCancelacion() {
    if (!motivo) {
      setError(
        "Seleccioná el motivo de la cancelación."
      );
      return;
    }

    if (
      motivo === "Otro" &&
      comentario.trim().length < 3
    ) {
      setError(
        "Contanos brevemente el motivo de la cancelación."
      );
      return;
    }

    const confirmado = window.confirm(
      `¿Confirmás que querés cancelar el pedido ${pedido}? Esta acción no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }

    try {
      setCancelando(true);
      setError("");

      const respuesta = await fetch(
        "/api/cancelar-pedido",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "cancelar_pedido",
            pedido,
            codigo,
            motivo,
            comentario: comentario.trim(),
          }),
        }
      );

      const datos = await respuesta.json();

      if (!datos.ok) {
        throw new Error(
          datos.error ||
            "No pudimos cancelar el pedido."
        );
      }

      setCancelado(true);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "Ocurrió un error al cancelar el pedido."
      );
    } finally {
      setCancelando(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-100px] h-80 w-80 rounded-full bg-red-600/15 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-100px] h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-xl">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm font-semibold text-zinc-400 transition hover:text-white"
        >
          ← Volver a Kint 3D
        </Link>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur md:p-9">
          {cargando && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-red-500" />

              <p className="text-zinc-300">
                Verificando el pedido…
              </p>
            </div>
          )}

          {!cargando && cancelado && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl text-green-400">
                ✓
              </div>

              <h1 className="text-3xl font-black">
                Pedido cancelado
              </h1>

              <p className="mt-4 text-zinc-300">
                El pedido{" "}
                <strong className="text-white">
                  {pedido}
                </strong>{" "}
                fue cancelado correctamente.
              </p>

              <Link
                href="/"
                className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200"
              >
                Volver al inicio
              </Link>
            </div>
          )}

          {!cargando &&
            !cancelado &&
            error &&
            !verificacion && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-3xl text-red-400">
                  !
                </div>

                <h1 className="text-2xl font-black">
                  No pudimos verificar el pedido
                </h1>

                <p className="mt-4 text-zinc-300">
                  {error}
                </p>

                <Link
                  href="/"
                  className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-black"
                >
                  Volver al inicio
                </Link>
              </div>
            )}

          {!cargando &&
            !cancelado &&
            verificacion &&
            !verificacion.permitido && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-3xl text-amber-400">
                  !
                </div>

                <h1 className="text-2xl font-black">
                  El pedido no puede cancelarse
                </h1>

                <p className="mt-4 text-zinc-300">
                  {verificacion.mensaje ||
                    "El pedido ya avanzó a una etapa que no permite la cancelación automática."}
                </p>

                <Link
                  href="/seguimiento"
                  className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-black"
                >
                  Ir al seguimiento
                </Link>
              </div>
            )}

          {!cargando &&
            !cancelado &&
            verificacion?.permitido && (
              <>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                  Cancelación
                </p>

                <h1 className="mt-3 text-3xl font-black">
                  Cancelar pedido
                </h1>

                <p className="mt-3 text-zinc-400">
  Esta acción cancela el pedido, elimina sus datos
  operativos y no puede deshacerse.
</p>

                <div className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">
                      Pedido
                    </span>

                    <strong>{pedido}</strong>
                  </div>

                  <div className="mt-3 flex justify-between gap-4">
                    <span className="text-zinc-400">
                      Cliente
                    </span>

                    <strong className="text-right">
                      {verificacion.nombre || "Cliente"}
                    </strong>
                  </div>

                  <div className="mt-3 flex justify-between gap-4">
                    <span className="text-zinc-400">
                      Estado
                    </span>

                    <strong className="text-right">
                      {verificacion.estado}
                    </strong>
                  </div>
                </div>

                <div className="mt-7">
                  <label
                    htmlFor="motivo"
                    className="block text-sm font-bold"
                  >
                    Motivo de la cancelación
                  </label>

                  <select
                    id="motivo"
                    value={motivo}
                    onChange={(evento) =>
                      setMotivo(evento.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option value="">
                      Seleccioná una opción
                    </option>

                    {MOTIVOS.map((opcion) => (
                      <option
                        key={opcion}
                        value={opcion}
                      >
                        {opcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="comentario"
                    className="block text-sm font-bold"
                  >
                    Comentario adicional{" "}
                    <span className="font-normal text-zinc-500">
                      opcional
                    </span>
                  </label>

                  <textarea
                    id="comentario"
                    value={comentario}
                    onChange={(evento) =>
                      setComentario(evento.target.value)
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Podés contarnos brevemente qué ocurrió."
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500"
                  />
                </div>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={confirmarCancelacion}
                  disabled={cancelando}
                  className="mt-7 w-full rounded-xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelando
                    ? "CANCELANDO…"
                    : "CANCELAR DEFINITIVAMENTE"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
  El motivo y el comentario se guardarán únicamente
  para analizar y mejorar el servicio.
</p>
              </>
            )}
        </section>
      </div>
    </main>
  );
}