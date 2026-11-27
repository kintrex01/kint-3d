"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Download, Share, SquarePlus } from "lucide-react";
import { Boton, Tarjeta } from "@/components/admin/ui";

/*
 * Más › «Instalar como app»: el panel se agrega a la pantalla de inicio y
 * abre a pantalla completa (manifiesto en app/panel-app). En Android/Chrome
 * se instala con un toque; en iPhone hay que hacerlo desde Compartir.
 */

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia("(display-mode: standalone)");
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function comoApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function esIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstalarPanel() {
  const instalada = useSyncExternalStore(suscribir, comoApp, () => false);
  const iphone = useSyncExternalStore(() => () => {}, esIphone, () => false);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalo = () => setLista(true);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalo);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalo);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setLista(true);
    setEvento(null);
  }

  if (instalada || lista) {
    return (
      <Tarjeta className="mt-4 flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <Check size={18} />
        </span>
        <span className="text-sm">
          <span className="block font-bold">{lista && !instalada ? "App instalada" : "Estás usando la app del panel"}</span>
          <span className="block text-xs text-[var(--text-muted)]">Abrila desde «Kint Panel» en la pantalla de inicio.</span>
        </span>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="mt-4 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#2449a6,#0b1738)] text-lg font-black text-white">
          K
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Instalar como app</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
            El panel queda en la pantalla de inicio como «Kint Panel» y abre a pantalla completa, sin la barra del navegador.
          </p>
        </div>
      </div>

      {evento ? (
        <Boton variante="principal" className="mt-3 w-full" icono={<Download size={16} />} onClick={() => void instalar()}>
          Instalar Kint Panel
        </Boton>
      ) : iphone ? (
        <ol className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kint-panel-soft)] text-xs font-black">1</span>
            Abrí esta página en <b>Safari</b> y tocá <Share size={15} className="inline" aria-label="Compartir" /> <b>Compartir</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kint-panel-soft)] text-xs font-black">2</span>
            Elegí <SquarePlus size={15} className="inline" aria-hidden /> <b>Agregar a inicio</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kint-panel-soft)] text-xs font-black">3</span>
            La primera vez entrá con tu clave (la app guarda su propia sesión)
          </li>
        </ol>
      ) : (
        <p className="mt-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--text-muted)]">
          En Chrome: menú <b>⋮</b> › <b>Instalar app</b> (o «Agregar a la pantalla de inicio»). Si no aparece, recargá la página.
        </p>
      )}
    </Tarjeta>
  );
}
