"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/*
 * Botón flotante de WhatsApp: la forma más rápida de que un curioso
 * se vuelva cliente. El mensaje ya viene escrito según la página.
 * No se muestra en el panel ni donde hay otra barra abajo (tienda).
 */

const NUMERO = "59892023382";

const MENSAJES: [string, string][] = [
  ["/cotizar", "Hola Kint 3D, tengo una duda antes de cotizar mi maqueta."],
  ["/seguimiento", "Hola Kint 3D, te escribo por mi pedido."],
  ["/ruleta", "Hola Kint 3D, tengo una consulta sobre la Ruleta Kint."],
  ["/escalador", "Hola Kint 3D, estoy usando el escalador y tengo una duda."],
  ["/tutorial", "Hola Kint 3D, estoy preparando mi modelo y tengo una duda."],
];

const OCULTO_EN = ["/admin", "/tienda"];

export default function BotonWhatsapp() {
  const ruta = usePathname() || "/";
  const [abierto, setAbierto] = useState(false);

  // El cartelito aparece solo un rato, una vez por visita.
  useEffect(() => {
    let mostrado = false;
    try {
      mostrado = sessionStorage.getItem("kint-wa-cartel") === "1";
    } catch {
      // Sin almacenamiento: se muestra igual.
    }
    if (mostrado) return;
    const mostrar = window.setTimeout(() => {
      setAbierto(true);
      try {
        sessionStorage.setItem("kint-wa-cartel", "1");
      } catch {
        // Nada.
      }
    }, 9000);
    const ocultar = window.setTimeout(() => setAbierto(false), 17000);
    return () => {
      window.clearTimeout(mostrar);
      window.clearTimeout(ocultar);
    };
  }, []);

  if (OCULTO_EN.some((prefijo) => ruta.startsWith(prefijo))) return null;

  const mensaje =
    MENSAJES.find(([prefijo]) => ruta.startsWith(prefijo))?.[1] ?? "Hola Kint 3D, quiero hacer una consulta.";

  return (
    <div className="fixed bottom-5 right-5 z-[300] flex items-center gap-2 print:hidden">
      {abierto && (
        <span className="hidden rounded-2xl bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-xl ring-1 ring-black/5 sm:block">
          ¿Dudas? Escribinos 👋
        </span>
      )}
      <a
        href={`https://wa.me/${NUMERO}?text=${encodeURIComponent(mensaje)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
        title="Escribinos por WhatsApp"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition hover:-translate-y-0.5 hover:scale-105"
      >
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#25d366] opacity-25 [animation-duration:2.6s]" />
        <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden className="relative">
          <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.8C5.1 9.9 10 5.2 16 5.2s10.9 4.7 10.9 10.6S22 26.4 16 26.4Zm6-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 2.1.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.4Z" />
        </svg>
      </a>
    </div>
  );
}
