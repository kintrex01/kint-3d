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

/*
 * «Fecha reapertura» puede ser una fecha o un interruptor: prendido, se
 * muestra lo que diga su mensaje; apagado, no se muestra ninguna fecha.
 */
function fechaDeReapertura(opcion?: OpcionConfiguracion) {
  const valor = obtenerTexto(opcion?.valor).toLowerCase();
  if (/^(des)?habilitad[ao]$/.test(valor)) {
    return opcionHabilitada(opcion) ? formatearFecha(opcion?.comentario) : "";
  }
  return formatearFecha(opcion?.valor);
}

/* Lo que ya cerró en esta visita (si cambia el aviso, vuelve a salir). */
const CLAVE_AVISO_CERRADO = "kint_aviso_cerrado";

function avisoYaCerrado(firma: string) {
  try {
    return sessionStorage.getItem(CLAVE_AVISO_CERRADO) === firma;
  } catch {
    return false;
  }
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

        const firma = [
          obtenerTexto(configuracionRecibida.aviso_titulo?.valor),
          obtenerTexto(configuracionRecibida.mostrar_aviso_emergente?.comentario),
        ].join("|");

        if (mostrarAviso && !avisoYaCerrado(firma)) {
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

  // El panel de admin no muestra avisos públicos.
  if (pathname.startsWith("/admin")) {
    return null;
  }

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
    fechaDeReapertura(
      configuracion?.fecha_reapertura
    );

  // Título del aviso: el que escribiste en Configuración (vacío = sin título).
  const tituloAviso = obtenerTexto(configuracion?.aviso_titulo?.valor);

  function cerrarAviso() {
  setAvisoVisible(false);
  try {
    sessionStorage.setItem(
      CLAVE_AVISO_CERRADO,
      [tituloAviso, obtenerTexto(configuracion?.mostrar_aviso_emergente?.comentario)].join("|")
    );
  } catch {
    /* sin almacenamiento: vuelve a salir al recargar */
  }
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
    titulo={tituloAviso}
    mensaje={mensajeAviso}
    fecha={fechaReapertura}
    etiquetaFecha="Reapertura"
    textoBoton="Entendido"
    onCerrar={cerrarAviso}
  />
);
}