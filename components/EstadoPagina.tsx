"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type OpcionConfiguracion = {
  valor?: unknown;
  comentario?: unknown;
};

type Configuracion = Record<
  string,
  OpcionConfiguracion
>;

function opcionHabilitada(
  opcion?: OpcionConfiguracion
) {
  const valor = String(opcion?.valor || "")
    .trim()
    .toLowerCase();

  return (
    valor === "habilitada" ||
    valor === "habilitado" ||
    valor === "sí" ||
    valor === "si"
  );
}

function obtenerTexto(valor: unknown) {
  return String(valor || "").trim();
}

function formatearFecha(valor: unknown) {
  const texto = obtenerTexto(valor);

  if (!texto) {
    return "";
  }

  const fecha = new Date(texto);

  if (Number.isNaN(fecha.getTime())) {
    return texto;
  }

  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Montevideo",
  }).format(fecha);
}

export default function EstadoPagina() {
  const pathname = usePathname();

  const [configuracion, setConfiguracion] =
    useState<Configuracion | null>(null);

  const [avisoVisible, setAvisoVisible] =
    useState(false);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarConfiguracion() {
      try {
        const response = await fetch(
          "/api/configuracion",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.ok ||
          !componenteActivo
        ) {
          return;
        }

        const configuracionRecibida =
          (data.configuracion || {}) as Configuracion;

        setConfiguracion(
          configuracionRecibida
        );

        const mostrarAviso =
          opcionHabilitada(
            configuracionRecibida
              .mostrar_aviso_emergente
          );

        if (mostrarAviso) {
  setAvisoVisible(true);
}
      } catch {
        /*
         * Si falla la configuración,
         * la web continúa funcionando.
         */
      }
    }

    cargarConfiguracion();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const estadoPaginaExiste =
    Boolean(configuracion?.estado_pagina);

  const paginaHabilitada =
    !estadoPaginaExiste ||
    opcionHabilitada(
      configuracion?.estado_pagina
    );

  const cotizacionBloqueada =
    Boolean(configuracion) &&
    !paginaHabilitada &&
    pathname.startsWith("/cotizar");

  const mensajeEstado =
    obtenerTexto(
      configuracion?.estado_pagina
        ?.comentario
    ) ||
    "Las cotizaciones están temporalmente pausadas.";

  const mensajeAviso =
    obtenerTexto(
      configuracion
        ?.mostrar_aviso_emergente
        ?.comentario
    ) ||
    mensajeEstado;

  const fechaReapertura =
    formatearFecha(
      configuracion?.fecha_reapertura
        ?.valor
    );

  function cerrarAviso() {
  setAvisoVisible(false);
}

  if (cotizacionBloqueada) {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-2xl rounded-3xl border border-white/15 bg-slate-900 p-8 text-center shadow-2xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-red-500">
            Kint 3D
          </p>

          <h1 className="mt-6 text-3xl font-black uppercase tracking-[0.12em] sm:text-5xl">
            Cotizaciones pausadas
          </h1>

          <div className="mx-auto my-7 h-[2px] w-20 bg-red-600" />

          <p className="text-base leading-8 text-slate-300">
            {mensajeEstado}
          </p>

          {fechaReapertura && (
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white">
              Reapertura estimada:{" "}
              {fechaReapertura}
            </p>
          )}

          <p className="mt-8 text-sm leading-7 text-slate-400">
            El seguimiento de pedidos existentes
            continúa disponible.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/seguimiento"
              className="border border-red-600 bg-red-600 px-7 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-transparent"
            >
              Ver seguimiento
            </Link>

            <Link
              href="/"
              className="border border-white/30 px-7 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!avisoVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
      <section className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950 p-8 text-center text-white shadow-2xl">
        <button
          type="button"
          onClick={cerrarAviso}
          className="absolute right-5 top-4 text-3xl leading-none text-slate-400 transition hover:text-white"
          aria-label="Cerrar aviso"
        >
          ×
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
          Kint 3D
        </p>

        <h2 className="mt-5 text-2xl font-black uppercase tracking-[0.14em]">
          Aviso importante
        </h2>

        <p className="mt-7 leading-8 text-slate-300">
          {mensajeAviso}
        </p>

        {fechaReapertura && (
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em]">
            Reapertura: {fechaReapertura}
          </p>
        )}

        <button
  type="button"
  onClick={cerrarAviso}
  className="mt-9 w-full rounded-xl border border-red-600 bg-red-600 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-transparent"
>
  Entendido
</button>
      </section>
    </div>
  );
}