"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ResenasInicio from "../components/ResenasInicio";
import ThemeToggle from "../components/ThemeToggle";
import EstadisticasInicio from "../components/EstadisticasInicio";
import FondoKintAnimado from "../components/FondoKintAnimado";
import {
  Box,
  ChevronDown,
  Layers3,
  TimerReset,
  SlidersHorizontal,
} from "lucide-react";

export default function Home() {
  const [mostrarAccesoResenas, setMostrarAccesoResenas] =
    useState(true);

  useEffect(() => {
    const seccionResenas =
      document.getElementById("resenas");

    if (!seccionResenas) {
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        setMostrarAccesoResenas(
          !entrada.isIntersecting
        );
      },
      {
        threshold: 0.15,
      }
    );

    observador.observe(seccionResenas);

    return () => {
      observador.disconnect();
    };
  }, []);


  return (
    <main className="relative min-h-screen overflow-hidden text-[var(--text-main)] transition">

 <header className="fixed right-5 top-5 z-50 md:right-8 md:top-6">
  <Link href="/" className="sr-only">
    Kint 3D
  </Link>

  <ThemeToggle />
</header>

<section className="relative isolate overflow-hidden px-8 pt-12">
  <FondoKintAnimado />

  <div className="absolute right-8 top-24 z-30 hidden 2xl:block">
  <EstadisticasInicio />
</div>

  <div className="relative z-20 mx-auto grid min-h-[650px] w-full max-w-[1180px] grid-cols-1 items-start md:grid-cols-[760px_1fr]">
    <div className="pt-0 origin-top-left md:scale-[1.08]">

      <h1 className="kint-logo-font text-[74px] uppercase leading-none text-[var(--text-main)]">
  KINT
</h1>

<div className="mt-5 flex items-center gap-6">
  <span className="kint-logo-font text-[60px] leading-none text-[var(--blue-main)]">
    3
  </span>

  <span className="kint-logo-font text-[60px] leading-none text-[var(--blue-soft)]">
    D
  </span>
</div>

      <div className="mt-5 flex w-[380px] items-center">
        <div className="h-[4px] w-[170px] rounded-full bg-[var(--blue-main)]" />
        <div className="h-[4px] w-[180px] rounded-full bg-[var(--blue-soft)]" />
        <div className="h-4 w-4 rounded-full bg-[var(--blue-soft)]" />
      </div>

      <p className="mt-12 max-w-[285px] text-[18px] font-light uppercase leading-[2] tracking-[0.24em] text-[var(--text-main)]">
        Impresión <span className="text-[var(--blue-main)]">3D</span> para arquitectura, diseño y piezas a medida.
      </p>

      <div className="mt-8 grid w-full grid-cols-2 gap-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-main)] md:flex md:w-[680px] md:items-center md:gap-8">
  <div className="flex items-center gap-3">
    <Layers3 size={28} strokeWidth={1.5} className="text-[var(--blue-main)]" />
    Arquitectura
  </div>

  <div className="hidden h-10 w-px bg-[var(--border-color)] md:block" />

  <div className="flex items-center gap-3">
    <Box size={28} strokeWidth={1.5} className="text-[var(--blue-main)]" />
    Prototipos
  </div>

  <div className="hidden h-10 w-px bg-[var(--border-color)] md:block" />

  <div className="flex items-center gap-3">
    <SlidersHorizontal size={28} strokeWidth={1.5} className="text-[var(--blue-main)]" />
    Piezas funcionales
  </div>

  <div className="hidden h-10 w-px bg-[var(--border-color)] md:block" />

  <div className="flex items-center gap-3">
    <TimerReset size={28} strokeWidth={1.5} className="text-[var(--blue-main)]" />
    Diseño personalizado
  </div>
</div>

<div className="mt-9 grid w-full grid-cols-1 gap-5 md:w-[680px] md:grid-cols-2">
  <Link href="/cotizar">
    <button className="kint-main-btn">
      Cotizar ahora <span>→</span>
    </button>
  </Link>

  <Link href="/seguimiento">
    <button className="kint-outline-btn">
      Consultar pedido <span>→</span>
    </button>
  </Link>



  <Link
  href="/escalador"
  className="kint-soft-btn"
>
  Escalador 3D <span>→</span>
</Link>

  <a href="#preguntas" className="kint-soft-btn">
    Preguntas frecuentes <span>→</span>
  </a>

  <Link
  href="/tutorial"
  className="kint-soft-btn md:col-span-2"
>
  GUÍA PARA PREPARAR MI MODELO <span>→</span>
</Link>
</div>

      <section className="kint-services-section">
  <div className="w-full md:w-[600px]">
    <div className="kint-services-card px-0 py-0">
      <div className="grid grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x divide-[var(--border-color)]">
        {[
          ["printer", "Tecnología", "Impresión 3D de alta precisión."],
          ["cube", "Diseño", "Transformamos ideas en piezas reales."],
          ["layers", "Personalizado", "Soluciones a medida para cada proyecto."],
          ["clock", "Rápido", "Tiempos de entrega optimizados."],
        ].map(([icono, titulo, texto]) => (
          <div key={titulo} className="px-3 text-center md:px-4">
            <div className="kint-service-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center text-[var(--blue-main)]">
             {icono === "printer" && (
  <Layers3 size={50} strokeWidth={1.5} />
)}

{icono === "cube" && (
  <Box size={50} strokeWidth={1.5} />
)}

{icono === "layers" && (
  <SlidersHorizontal size={50} strokeWidth={1.5} />
)}

{icono === "clock" && (
  <TimerReset size={50} strokeWidth={1.5} />
)}
</div>

            <h3 className="kint-service-title mb-5">
              {titulo}
            </h3>

            <p className="kint-service-text">
              {texto}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

    </div>
  </div>

  <div className="relative z-20 mb-10 mt-10 flex w-full justify-center px-6 2xl:hidden">
  <EstadisticasInicio />
</div>

      <section className="relative z-20 px-6 pt-40 pb-24 bg-transparent">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Cómo trabajamos
          </p>

          <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

          <div className="grid gap-12 md:grid-cols-4">
            {[
              ["01", "Enviás tu archivo", "Subí tu archivo 3D y contanos tu idea."],
              ["02", "Revisamos tu modelo", "Analizamos el archivo, detectamos posibles problemas y preparamos el presupuesto."],
              [
  "03",
  "Imprimimos",
  "Una vez elegido el presupuesto y confirmado el pago de la seña mínima del 20% o el pago total, comenzamos la impresión.",
],
              ["04", "Entregamos", "Te entregamos el modelo donde lo necesites."],
            ].map(([numero, titulo, texto]) => (
              <div key={numero}>
                <p className="mb-3 text-4xl font-black text-red-600">
                  {numero}
                </p>
                <div className="mx-auto mb-5 h-[2px] w-10 bg-red-600" />
                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.3em]">
                  {titulo}
                </h3>
                <p className="text-sm leading-7 text-[var(--text-muted)]">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <Link href="/cotizar">
              <button className="border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600">
                Iniciar cotización
              </button>
            </Link>
                    </div>
        </div>
      </section>

      {/* El fondo animado termina aquí, junto con toda la portada. */}
</section>

      <section
  id="resenas"
  className="border-t border-[var(--border-color)] px-6 py-24"
>
  <div className="mx-auto max-w-6xl text-center">
    <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
      Reseñas verificadas
    </p>

    <div className="mx-auto mb-16 h-[2px] w-12 bg-red-600" />

    <ResenasInicio />
  </div>
</section>

{mostrarAccesoResenas && (
  <button
    type="button"
    onClick={() => {
      document
        .getElementById("resenas")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }}
    className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--text-main)] shadow-[var(--shadow-main)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-red-600 hover:text-red-600"
    aria-label="Ir a la sección de reseñas"
  >
    Reseñas
    <ChevronDown
      size={15}
      strokeWidth={2}
    />
  </button>
)}

<a
  href="https://wa.me/59892023382"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--blue-soft)] bg-[var(--blue-main)] text-white shadow-[0_18px_45px_rgba(47,127,208,0.45)] transition hover:scale-110"
  aria-label="WhatsApp"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className="h-7 w-7"
  >
    <path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L0 32l8.3-2.2c2.3 1.2 4.9 1.8 7.7 1.8 8.6 0 15.6-7 15.6-15.6S24.6.4 16 .4zm0 28.3c-2.4 0-4.8-.6-6.9-1.9l-.5-.3-4.9 1.3 1.3-4.8-.3-.5C3.4 20.6 2.8 18.3 2.8 16 2.8 8.8 8.8 2.8 16 2.8S29.2 8.8 29.2 16 23.2 28.7 16 28.7zm7.2-9.8c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.9.2-.2.4-1 1.2-1.2 1.4-.2.2-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.3-.6.1-.2 0-.5 0-.7-.1-.2-.9-2.2-1.2-3-.3-.8-.6-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.3.4-1.3 1.3-1.3 3.2 0 1.9 1.4 3.7 1.6 4 .2.3 2.8 4.3 6.9 6 .9.4 1.7.7 2.3.9 1 .3 1.9.3 2.6.2.8-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z"/>
  </svg>
</a>

    </main>
  );
}