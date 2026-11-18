"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ChevronLeft, ChevronRight, LoaderCircle, MessageSquareQuote, Star, X } from "lucide-react";

/*
 * Galería de lo impreso: las maquetas terminadas con foto final y, si el
 * cliente dejó reseña, lo que dijo, sus estrellas y sus fotos. Las que
 * tienen reseña van primero (dejar reseña luce). Filtra por escala, color
 * o «con reseña»; tocar una foto la abre grande.
 */

type Resena = { comentario: string; nombre: string; fotosCliente: number };
type Item = {
  pedido: string;
  fecha: string;
  escala: string;
  colores: string;
  fotos: string[];
  estrellas: number;
  resena: Resena | null;
};

/* Las fotos de Drive pasan por /api/imagen-drive (así cargan siempre). */
function srcFoto(link: string) {
  const id = /[-\w]{25,}/.exec(link)?.[0];
  return /drive\.google\.com/.test(link) && id ? `/api/imagen-drive?id=${encodeURIComponent(id)}` : link;
}

/* «1:125 / 1:1 (esta ya hecho)» → «1:125». */
function escalaCorta(escala: string) {
  return /1:\s?\d+/.exec(escala)?.[0].replace(/\s/g, "") || (escala.trim() ? "Otra" : "");
}

const listaColores = (texto: string) => texto.split(",").map((parte) => parte.trim()).filter(Boolean);

function Estrellas({ cuantas, chicas = false }: { cuantas: number; chicas?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${cuantas} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, indice) => (
        <Star key={indice} size={chicas ? 11 : 14} className={indice < cuantas ? "fill-amber-400 text-amber-400" : "text-slate-400/40"} />
      ))}
    </span>
  );
}

export default function GaleriaImpresos() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [apagada, setApagada] = useState(false);
  const [error, setError] = useState(false);
  const [escala, setEscala] = useState("");
  const [color, setColor] = useState("");
  const [soloResenas, setSoloResenas] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [foto, setFoto] = useState(0);
  const [cantidad, setCantidad] = useState(24);
  const [puntos, setPuntos] = useState({ resena: 0, foto: 0 });

  useEffect(() => {
    let activo = true;
    fetch("/api/galeria")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo) return;
        if (!data?.ok) return setError(true);
        if (data.habilitada === false) return setApagada(true);
        setItems(Array.isArray(data.items) ? data.items.map((item: Item) => ({ ...item, resena: item.resena ?? null })) : []);
        setPuntos({ resena: Number(data.puntosResena) || 0, foto: Number(data.puntosFoto) || 0 });
      })
      .catch(() => activo && setError(true));
    return () => {
      activo = false;
    };
  }, []);

  const escalas = useMemo(() => {
    const cuenta = new Map<string, number>();
    (items ?? []).forEach((item) => {
      const corta = escalaCorta(item.escala);
      if (corta) cuenta.set(corta, (cuenta.get(corta) || 0) + 1);
    });
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([nombre]) => nombre);
  }, [items]);

  const colores = useMemo(() => {
    const cuenta = new Map<string, number>();
    (items ?? []).forEach((item) => listaColores(item.colores).forEach((nombre) => cuenta.set(nombre, (cuenta.get(nombre) || 0) + 1)));
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([nombre]) => nombre);
  }, [items]);

  // Primero las que tienen reseña (con fotos del cliente, arriba de todo).
  const visibles = useMemo(() => {
    const peso = (item: Item) => (item.resena ? (item.resena.fotosCliente ? 3 : 2) : 0) + (item.estrellas >= 5 ? 1 : 0);
    return (items ?? [])
      .filter(
        (item) =>
          (!soloResenas || item.resena) &&
          (!escala || escalaCorta(item.escala) === escala) &&
          (!color || listaColores(item.colores).includes(color))
      )
      .map((item, orden) => ({ item, orden }))
      .sort((a, b) => peso(b.item) - peso(a.item) || a.orden - b.orden)
      .map(({ item }) => item);
  }, [items, soloResenas, escala, color]);
  const conResena = (items ?? []).filter((item) => item.resena).length;

  function abrir(indice: number) {
    setAbierta(indice);
    setFoto(0);
  }

  // Teclado en la foto grande: flechas y Escape.
  useEffect(() => {
    if (abierta === null) return;
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierta(null);
      if (evento.key === "ArrowRight") {
        setAbierta((actual) => (actual === null ? null : Math.min(visibles.length - 1, actual + 1)));
        setFoto(0);
      }
      if (evento.key === "ArrowLeft") {
        setAbierta((actual) => (actual === null ? null : Math.max(0, actual - 1)));
        setFoto(0);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, visibles.length]);

  if (error) return <p className="text-center text-sm text-[var(--text-muted)]">No pudimos cargar la galería. Probá en un rato.</p>;
  if (apagada) return <p className="text-center text-sm text-[var(--text-muted)]">La galería no está disponible ahora.</p>;
  if (!items) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
        <LoaderCircle size={16} className="animate-spin" />
        Cargando las maquetas…
      </p>
    );
  }

  const chip = (activo: boolean) =>
    `h-8 shrink-0 rounded-full px-3 text-xs font-black transition ${
      activo ? "bg-red-600 text-white" : "border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
    }`;
  const actual = abierta === null ? null : visibles[abierta];

  return (
    <div>
      {/* Invitación: tu reseña también aparece acá */}
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-amber-400/40 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(239,68,68,0.06)_60%,transparent)] p-4 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-white shadow-[0_10px_24px_-10px_rgba(245,158,11,0.8)]">
          <Camera size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[var(--text-main)]">¿Ya tenés tu maqueta? Que aparezca acá con tu reseña</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
            Las maquetas con reseña y foto van primero en la galería
            {puntos.resena || puntos.foto
              ? `, y sumás ${[puntos.resena && `${puntos.resena} Puntos Kint por la reseña`, puntos.foto && `${puntos.foto} más por la foto`].filter(Boolean).join(" y ")}`
              : ""}
            . Entrá a tu pedido y tocá «Dejar mi reseña».
          </p>
        </div>
        <Link href="/seguimiento" className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--text-main)] px-4 text-xs font-black text-[var(--page-bg)]">
          Ir a mi pedido
        </Link>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {conResena > 0 && (
            <button type="button" className={chip(soloResenas)} onClick={() => setSoloResenas(!soloResenas)}>
              ★ Con reseña ({conResena})
            </button>
          )}
          <button type="button" className={chip(!escala)} onClick={() => setEscala("")}>Todas las escalas</button>
          {escalas.map((nombre) => (
            <button key={nombre} type="button" className={chip(escala === nombre)} onClick={() => setEscala(escala === nombre ? "" : nombre)}>
              {nombre}
            </button>
          ))}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <button type="button" className={chip(!color)} onClick={() => setColor("")}>Todos los colores</button>
          {colores.map((nombre) => (
            <button key={nombre} type="button" className={chip(color === nombre)} onClick={() => setColor(color === nombre ? "" : nombre)}>
              {nombre}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs font-bold text-[var(--text-muted)]">
        {visibles.length} {visibles.length === 1 ? "maqueta" : "maquetas"}
      </p>

      {/* Fotos (en columnas, cada una con su alto) */}
      <div className="mt-3 columns-2 gap-3 sm:columns-3 lg:columns-4">
        {visibles.slice(0, cantidad).map((item, indice) => (
          <button
            key={item.pedido}
            type="button"
            onClick={() => abrir(indice)}
            className={`group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border bg-[var(--kint-panel)] text-left ${
              item.resena ? "border-amber-400/50 shadow-[0_10px_30px_-16px_rgba(245,158,11,0.7)]" : "border-[var(--border-color)]"
            }`}
          >
            <span className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={srcFoto(item.fotos[0])}
                alt={`Maqueta ${item.pedido}${item.escala ? `, escala ${item.escala}` : ""}`}
                loading="lazy"
                className="w-full transition duration-300 group-hover:scale-[1.03]"
              />
              {item.fotos.length > 1 && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                  <Camera size={11} />
                  {item.fotos.length}
                </span>
              )}
            </span>
            {item.resena && (
              <span className="block border-b border-[var(--border-color)] px-2.5 pb-2 pt-2">
                <span className="flex items-center gap-1.5">
                  <Estrellas cuantas={item.estrellas} chicas />
                  {item.resena.fotosCliente > 0 && <span className="text-[9px] font-black uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400">Foto del cliente</span>}
                </span>
                {item.resena.comentario && (
                  <span className="mt-1 line-clamp-3 text-[11px] italic leading-4 text-[var(--text-main)]">«{item.resena.comentario}»</span>
                )}
                {item.resena.nombre && <span className="mt-0.5 block text-[10px] font-black text-[var(--text-muted)]">— {item.resena.nombre}</span>}
              </span>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-[var(--text-muted)]">
              {escalaCorta(item.escala) && <span className="text-[var(--text-main)]">{escalaCorta(item.escala)}</span>}
              <span className="min-w-0 flex-1 truncate">{item.colores}</span>
              {!item.resena && item.estrellas > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-amber-500">
                  <Star size={11} className="fill-amber-400" />
                  {item.estrellas}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {visibles.length > cantidad && (
        <button
          type="button"
          onClick={() => setCantidad((actual) => actual + 24)}
          className="mx-auto mt-4 flex h-11 items-center rounded-2xl border border-[var(--border-color)] px-6 text-sm font-black hover:border-red-600"
        >
          Ver más ({visibles.length - cantidad})
        </button>
      )}

      {/* Foto grande, con sus otras fotos y la reseña */}
      {actual &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm" onClick={() => setAbierta(null)}>
            <figure className="relative my-auto w-full max-w-4xl" onClick={(evento) => evento.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={srcFoto(actual.fotos[foto] || actual.fotos[0])} alt={`Maqueta ${actual.pedido}`} className="mx-auto max-h-[64vh] rounded-2xl object-contain" />
              {actual.fotos.length > 1 && (
                <div className="mt-3 flex justify-center gap-2">
                  {actual.fotos.map((link, indice) => (
                    <button
                      key={link}
                      type="button"
                      onClick={() => setFoto(indice)}
                      aria-label={indice === 0 ? "Foto final" : `Foto del cliente ${indice}`}
                      className={`h-14 w-14 overflow-hidden rounded-xl ring-2 ${indice === foto ? "ring-white" : "ring-white/20 opacity-70"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={srcFoto(link)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <figcaption className="mx-auto mt-3 max-w-2xl text-center text-sm text-white">
                <span className="font-black">{actual.pedido}</span>
                {actual.escala && ` · Escala ${actual.escala}`}
                {actual.colores && ` · ${actual.colores}`}
                {actual.resena && (
                  <span className="mt-3 block rounded-2xl bg-white/10 px-4 py-3 text-left">
                    <span className="flex items-center gap-2">
                      <MessageSquareQuote size={16} className="text-amber-300" />
                      <Estrellas cuantas={actual.estrellas} />
                    </span>
                    {actual.resena.comentario && <span className="mt-1.5 block italic leading-6">«{actual.resena.comentario}»</span>}
                    {actual.resena.nombre && <span className="mt-1 block text-xs font-black text-white/70">— {actual.resena.nombre}</span>}
                  </span>
                )}
              </figcaption>
              <button type="button" aria-label="Cerrar" onClick={() => setAbierta(null)} className="absolute -top-2 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                <X size={18} />
              </button>
              {abierta! > 0 && (
                <button type="button" aria-label="Anterior" onClick={() => abrir(abierta! - 1)} className="absolute left-0 top-[30vh] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                  <ChevronLeft size={22} />
                </button>
              )}
              {abierta! < visibles.length - 1 && (
                <button type="button" aria-label="Siguiente" onClick={() => abrir(abierta! + 1)} className="absolute right-0 top-[30vh] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                  <ChevronRight size={22} />
                </button>
              )}
            </figure>
          </div>,
          document.body
        )}
    </div>
  );
}
