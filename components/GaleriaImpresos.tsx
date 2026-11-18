"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Star, X } from "lucide-react";
import { createPortal } from "react-dom";

/*
 * Galería de lo impreso: las maquetas terminadas con foto final, para ver
 * cómo quedan las escalas, los colores y los detalles antes de pedir.
 * Filtra por escala y color; tocar una foto la abre grande.
 */

type Item = { pedido: string; fecha: string; escala: string; colores: string; fotos: string[]; estrellas: number };

/* Las fotos de Drive pasan por /api/imagen-drive (así cargan siempre). */
function srcFoto(link: string) {
  const id = /[-\w]{25,}/.exec(link)?.[0];
  return /drive\.google\.com/.test(link) && id ? `/api/imagen-drive?id=${encodeURIComponent(id)}` : link;
}

/* «1:125 / 1:1 (esta ya hecho)» → «1:125». */
function escalaCorta(escala: string) {
  return /1:\s?\d+/.exec(escala)?.[0].replace(/\s/g, "") || (escala.trim() ? "Otra" : "");
}

export default function GaleriaImpresos() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [apagada, setApagada] = useState(false);
  const [error, setError] = useState(false);
  const [escala, setEscala] = useState("");
  const [color, setColor] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(24);

  useEffect(() => {
    let activo = true;
    fetch("/api/galeria")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo) return;
        if (!data?.ok) return setError(true);
        if (data.habilitada === false) return setApagada(true);
        setItems(Array.isArray(data.items) ? data.items : []);
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
    (items ?? []).forEach((item) =>
      item.colores.split(/\s*,\s*/).filter(Boolean).forEach((nombre) => cuenta.set(nombre, (cuenta.get(nombre) || 0) + 1))
    );
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([nombre]) => nombre);
  }, [items]);

  const visibles = (items ?? []).filter(
    (item) =>
      (!escala || escalaCorta(item.escala) === escala) &&
      (!color || item.colores.split(/\s*,\s*/).includes(color))
  );

  // Teclado en la foto grande: flechas y Escape.
  useEffect(() => {
    if (abierta === null) return;
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierta(null);
      if (evento.key === "ArrowRight") setAbierta((actual) => (actual === null ? null : Math.min(visibles.length - 1, actual + 1)));
      if (evento.key === "ArrowLeft") setAbierta((actual) => (actual === null ? null : Math.max(0, actual - 1)));
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
      {/* Filtros */}
      <div className="space-y-2">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
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
            onClick={() => setAbierta(indice)}
            className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--kint-panel)] text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={srcFoto(item.fotos[0])}
              alt={`Maqueta ${item.pedido}${item.escala ? `, escala ${item.escala}` : ""}`}
              loading="lazy"
              className="w-full transition duration-300 group-hover:scale-[1.03]"
            />
            <span className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-[var(--text-muted)]">
              {escalaCorta(item.escala) && <span className="text-[var(--text-main)]">{escalaCorta(item.escala)}</span>}
              <span className="min-w-0 flex-1 truncate">{item.colores}</span>
              {item.estrellas > 0 && (
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

      {/* Foto grande */}
      {actual &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setAbierta(null)}>
            <figure className="relative max-h-full w-full max-w-4xl" onClick={(evento) => evento.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={srcFoto(actual.fotos[0])} alt={`Maqueta ${actual.pedido}`} className="mx-auto max-h-[78vh] rounded-2xl object-contain" />
              <figcaption className="mt-3 text-center text-sm text-white">
                <span className="font-black">{actual.pedido}</span>
                {actual.escala && ` · Escala ${actual.escala}`}
                {actual.colores && ` · ${actual.colores}`}
                {actual.estrellas > 0 && ` · ${"★".repeat(actual.estrellas)}`}
              </figcaption>
              <button type="button" aria-label="Cerrar" onClick={() => setAbierta(null)} className="absolute -top-2 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                <X size={18} />
              </button>
              {abierta! > 0 && (
                <button type="button" aria-label="Anterior" onClick={() => setAbierta(abierta! - 1)} className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white">
                  <ChevronLeft size={22} />
                </button>
              )}
              {abierta! < visibles.length - 1 && (
                <button type="button" aria-label="Siguiente" onClick={() => setAbierta(abierta! + 1)} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white">
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
