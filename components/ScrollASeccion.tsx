"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TIEMPOS_REINTENTO = [
  0,
  80,
  200,
  450,
  800,
  1300,
  2000,
  3000,
];

export default function ScrollASeccion() {
  const pathname = usePathname();

  useEffect(() => {
    let temporizadores: number[] = [];

    function limpiarTemporizadores() {
      temporizadores.forEach((temporizador) => {
        window.clearTimeout(temporizador);
      });

      temporizadores = [];
    }

    function posicionarSeccion() {
      const hash = window.location.hash;

      if (!hash) {
        return;
      }

      const id = decodeURIComponent(
        hash.replace("#", "")
      );

      const seccion = document.getElementById(id);

      if (!seccion) {
        return;
      }

      const margenSuperior = 115;

      const posicion =
        seccion.getBoundingClientRect().top +
        window.scrollY -
        margenSuperior;

      window.scrollTo({
        top: Math.max(0, posicion),
        behavior: "auto",
      });
    }

    function programarPosicionamiento() {
      limpiarTemporizadores();

      temporizadores = TIEMPOS_REINTENTO.map(
        (tiempo) =>
          window.setTimeout(() => {
            posicionarSeccion();
          }, tiempo)
      );
    }

    function manejarCargaDeContenido(
      evento: Event
    ) {
      const elemento = evento.target;

      if (
        elemento instanceof HTMLImageElement ||
        elemento instanceof HTMLVideoElement
      ) {
        programarPosicionamiento();
      }
    }

    function manejarClick(evento: MouseEvent) {
      const objetivo = evento.target;

      if (!(objetivo instanceof Element)) {
        return;
      }

      const enlace = objetivo.closest(
        'a[href*="#"]'
      );

      if (!enlace) {
        return;
      }

      window.setTimeout(() => {
        programarPosicionamiento();
      }, 0);
    }

    programarPosicionamiento();

    window.addEventListener(
      "hashchange",
      programarPosicionamiento
    );

    window.addEventListener(
      "popstate",
      programarPosicionamiento
    );

    document.addEventListener(
      "load",
      manejarCargaDeContenido,
      true
    );

    document.addEventListener(
      "click",
      manejarClick,
      true
    );

    return () => {
      limpiarTemporizadores();

      window.removeEventListener(
        "hashchange",
        programarPosicionamiento
      );

      window.removeEventListener(
        "popstate",
        programarPosicionamiento
      );

      document.removeEventListener(
        "load",
        manejarCargaDeContenido,
        true
      );

      document.removeEventListener(
        "click",
        manejarClick,
        true
      );
    };
  }, [pathname]);

  return null;
}