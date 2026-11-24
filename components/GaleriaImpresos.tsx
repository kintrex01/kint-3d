"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Camera, Heart, LoaderCircle, MessageCircle, Star } from "lucide-react";
import VisorMaqueta, { type MaquetaGaleria } from "./VisorMaqueta";
import { ordenarGaleria } from "@/lib/galeria-orden";

/*
 * Galería de lo impreso: las maquetas terminadas con foto final y, si el
 * cliente dejó reseña, lo que dijo, sus estrellas y sus fotos. Las que
 * tienen reseña van primero (dejar reseña luce). Filtra por escala, color
 * o «con reseña»; tocar una foto la abre grande.
 */

type Item = MaquetaGaleria & {
  fecha: string;
  conPermiso?: boolean; // el cliente aprobó mostrar la foto de su proyecto
  destacado?: number; // 1 = la primera de las destacadas por el dueño; 0 = no
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
  // La maqueta abierta, por su número (no por su lugar: al dar like la lista se reordena).
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [comentariosPrendidos, setComentariosPrendidos] = useState(true);
  const [puntosComentario, setPuntosComentario] = useState(0);
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
        setComentariosPrendidos(data.comentarios !== false);
        setPuntosComentario(Number(data.puntosComentario) || 0);
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

  // Orden: el que eligió el dueño arrastrando; después reseñas y el resto, por likes (lib/galeria-orden).
  const visibles = useMemo(
    () =>
      ordenarGaleria(
        (items ?? []).filter(
          (item) =>
            (!soloResenas || item.resena) &&
            (!escala || escalaCorta(item.escala) === escala) &&
            (!color || listaColores(item.colores).includes(color))
        )
      ),
    [items, soloResenas, escala, color]
  );
  const conResena = (items ?? []).filter((item) => item.resena).length;
  const columnas = useColumnas();

  function abrir(indice: number) {
    setAbiertaId(visibles[indice]?.id ?? null);
  }

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
  const abierta = abiertaId === null ? -1 : visibles.findIndex((item) => item.id === abiertaId);
  const actual = abierta === -1 ? null : visibles[abierta];

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

      {/* Fotos por filas: 1 a la izquierda, 2 a la derecha, 3 abajo a la izquierda…
          Cada columna con sus altos; las primeras de tu orden quedan arriba de todo. */}
      <div className="mt-3 flex items-start gap-3">
        {Array.from({ length: columnas }, (_, columna) => (
          <div key={columna} className="min-w-0 flex-1">
        {visibles.slice(0, cantidad).map((item, indice) => indice % columnas !== columna ? null : (
          <button
            key={item.pedido}
            type="button"
            onClick={() => abrir(indice)}
            className={`group mb-3 block w-full overflow-hidden rounded-2xl border bg-[var(--kint-panel)] text-left ${
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
              {/* Likes y comentarios, como en un posteo */}
              {(item.likes ?? 0) > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-red-500">
                  <Heart size={11} className="fill-red-500" />
                  {item.likes}
                </span>
              )}
              {(item.comentarios?.length ?? 0) > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <MessageCircle size={11} />
                  {item.comentarios!.length}
                </span>
              )}
            </span>
            {item.resena && (
              <span className="block px-2.5 pb-2 text-[10px] font-black uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">
                Ver reseña →
              </span>
            )}
          </button>
        ))}
          </div>
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

      {/* La maqueta abierta, como un posteo: foto, reseña, likes y comentarios */}
      {actual && (
        <VisorMaqueta
          maqueta={actual}
          comentariosPrendidos={comentariosPrendidos}
          puntosComentario={puntosComentario}
          onCerrar={() => setAbiertaId(null)}
          onAnterior={abierta > 0 ? () => abrir(abierta - 1) : undefined}
          onSiguiente={abierta < visibles.length - 1 ? () => abrir(abierta + 1) : undefined}
          onCambio={(cambios) =>
            setItems((actuales) => (actuales ?? []).map((item) => (item.id === actual.id ? { ...item, ...cambios } : item)))
          }
        />
      )}
    </div>
  );
}

/* Cuántas columnas entran: 2 en el celular, 3 en tablet, 4 en la compu (como antes). */
function useColumnas() {
  return useSyncExternalStore(
    (avisar) => {
      window.addEventListener("resize", avisar);
      return () => window.removeEventListener("resize", avisar);
    },
    () => (window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 3 : 2),
    () => 2
  );
}
