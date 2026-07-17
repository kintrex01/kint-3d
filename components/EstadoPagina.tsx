"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AvisoKint from "./AvisoKint";

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
    <AvisoKint
      tamano="grande"
      titulo="Cotizaciones pausadas"
      mensaje={`${mensajeEstado}\n\nEl seguimiento de pedidos existentes continúa disponible.`}
      fecha={fechaReapertura}
      etiquetaFecha="Reapertura estimada"
      textoBoton="Ver seguimiento"
      hrefBoton="/seguimiento"
      textoBotonSecundario="Volver al inicio"
      hrefBotonSecundario="/"
    />
  );
}

if (!avisoVisible) {
  return null;
}

return (
  <AvisoKint
    tamano="compacto"
    titulo="Aviso importante"
    mensaje={mensajeAviso}
    fecha={fechaReapertura}
    etiquetaFecha="Reapertura"
    textoBoton="Entendido"
    onCerrar={cerrarAviso}
  />
);
}