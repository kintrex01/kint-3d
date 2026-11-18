"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, Maximize2, MessageCircle, Send, Star, X } from "lucide-react";

/*
 * Una maqueta de la galería, como un posteo: la foto (tocala y se ve en
 * pantalla completa) y al costado la reseña de la clienta, los likes y los
 * comentarios. En el celular va todo uno abajo del otro.
 * - Like: con reseña suma a la reseña (el mismo de las reseñas del inicio);
 *   sin reseña, a la galería. Se recuerda en el navegador.
 * - Comentarios: con un nombre opcional; se publican al toque.
 */

export type ComentarioGaleria = { id: number; nombre: string; texto: string; fecha: string };
export type MaquetaGaleria = {
  id: string; // KNT-0063
  pedido: string; // KNT-63
  escala: string;
  colores: string;
  fotos: string[];
  estrellas: number;
  likes?: number;
  tieneResena?: boolean;
  comentarios?: ComentarioGaleria[];
  resena: { comentario: string; nombre: string; fotosCliente: number } | null;
};

const CLAVE_DISPOSITIVO = "kint3d_dispositivo_resenas";
const CLAVE_LIKES_RESENAS = "kint3d_resenas_con_like";
const CLAVE_LIKES_GALERIA = "kint3d_galeria_con_like";
const CLAVE_NOMBRE = "kint3d_nombre_comentario";

function leerLista(clave: string): string[] {
  try {
    const lista = JSON.parse(localStorage.getItem(clave) || "[]");
    return Array.isArray(lista) ? lista.map((item) => String(item).toUpperCase()) : [];
  } catch {
    return [];
  }
}

function guardarLista(clave: string, lista: string[]) {
  try {
    localStorage.setItem(clave, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento */
  }
}

function dispositivo() {
  try {
    const existente = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (existente) return existente;
    const nuevo = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `kint-${Date.now()}`;
    localStorage.setItem(CLAVE_DISPOSITIVO, nuevo);
    return nuevo;
  } catch {
    return "sin-almacenamiento";
  }
}

/* «hace 3 h», «hace 2 días», «12 nov». */
function hace(fecha: string) {
  const ms = Date.now() - Date.parse(fecha);
  if (!Number.isFinite(ms)) return "";
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return minutos <= 1 ? "recién" : `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(new Date(fecha));
}

function srcFoto(link: string) {
  const id = /[-\w]{25,}/.exec(link)?.[0];
  return /drive\.google\.com/.test(link) && id ? `/api/imagen-drive?id=${encodeURIComponent(id)}` : link;
}

export default function VisorMaqueta({
  maqueta,
  comentariosPrendidos,
  onCerrar,
  onAnterior,
  onSiguiente,
  onCambio,
}: {
  maqueta: MaquetaGaleria;
  comentariosPrendidos: boolean;
  onCerrar: () => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onCambio: (cambios: Partial<MaquetaGaleria>) => void;
}) {
  const [foto, setFoto] = useState(0);
  const [completa, setCompleta] = useState(false);
  const [conLike, setConLike] = useState(false);
  const [enviandoLike, setEnviandoLike] = useState(false);
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const claveLikes = maqueta.tieneResena ? CLAVE_LIKES_RESENAS : CLAVE_LIKES_GALERIA;

  // Al cambiar de maqueta: primera foto, su like y el nombre guardado.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setFoto(0);
    setError("");
    setConLike(leerLista(claveLikes).includes(maqueta.id.toUpperCase()));
    try {
      setNombre(localStorage.getItem(CLAVE_NOMBRE) || "");
    } catch {
      setNombre("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [maqueta.id, claveLikes]);

  // Teclado: Escape cierra (primero la pantalla completa), flechas pasan.
  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if ((evento.target as HTMLElement)?.tagName === "INPUT" || (evento.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (evento.key === "Escape") {
        if (completa) setCompleta(false);
        else onCerrar();
      }
      if (evento.key === "ArrowRight") onSiguiente?.();
      if (evento.key === "ArrowLeft") onAnterior?.();
    };
    window.addEventListener("keydown", tecla);
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = desborde;
    };
  }, [completa, onCerrar, onAnterior, onSiguiente]);

  async function darLike() {
    if (enviandoLike) return;
    setEnviandoLike(true);
    const antes = conLike;
    const likesAntes = maqueta.likes ?? 0;
    // Al toque en pantalla; se confirma con la respuesta.
    setConLike(!antes);
    onCambio({ likes: Math.max(0, likesAntes + (antes ? -1 : 1)) });
    try {
      const respuesta = await fetch(maqueta.tieneResena ? "/api/resenas" : "/api/galeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          maqueta.tieneResena
            ? { tipo: "like_resena", pedido: maqueta.id, dispositivo: dispositivo() }
            : { tipo: "like", pedido: maqueta.id, dispositivo: dispositivo() }
        ),
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) throw new Error(data.error || "No se pudo dar el like.");
      setConLike(Boolean(data.tieneLike));
      onCambio({ likes: Number(data.likes) || 0 });
      const lista = leerLista(claveLikes).filter((item) => item !== maqueta.id.toUpperCase());
      guardarLista(claveLikes, data.tieneLike ? [...lista, maqueta.id.toUpperCase()] : lista);
    } catch (errorLike) {
      setConLike(antes);
      onCambio({ likes: likesAntes });
      setError(errorLike instanceof Error ? errorLike.message : "No se pudo dar el like.");
    } finally {
      setEnviandoLike(false);
    }
  }

  async function comentar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/galeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "comentario", pedido: maqueta.id, dispositivo: dispositivo(), nombre: nombre.trim(), texto: texto.trim() }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) throw new Error(data.error || "No se pudo publicar el comentario.");
      onCambio({ comentarios: [...(maqueta.comentarios ?? []), data.comentario] });
      setTexto("");
      try {
        localStorage.setItem(CLAVE_NOMBRE, nombre.trim());
      } catch {
        /* sin almacenamiento */
      }
    } catch (errorComentario) {
      setError(errorComentario instanceof Error ? errorComentario.message : "No se pudo publicar el comentario.");
    } finally {
      setEnviando(false);
    }
  }

  const fotoActual = maqueta.fotos[foto] || maqueta.fotos[0];
  const comentarios = maqueta.comentarios ?? [];
  const likes = maqueta.likes ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-stretch justify-center bg-black/85 backdrop-blur-sm lg:items-center lg:p-6" onClick={onCerrar}>
      {/* Pasar de maqueta (compu) */}
      {onAnterior && (
        <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); onAnterior(); }} className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 lg:flex">
          <ChevronLeft size={24} />
        </button>
      )}
      {onSiguiente && (
        <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); onSiguiente(); }} className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 lg:flex">
          <ChevronRight size={24} />
        </button>
      )}

      <article
        onClick={(evento) => evento.stopPropagation()}
        className="kint-aviso-tarjeta flex w-full max-w-6xl flex-col overflow-y-auto bg-[var(--page-bg)] lg:grid lg:h-[86vh] lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden lg:rounded-3xl"
      >
        {/* La foto */}
        <div className="relative flex min-h-[48vh] shrink-0 items-center justify-center bg-black lg:h-full lg:min-h-0">
          <button type="button" onClick={() => setCompleta(true)} className="group relative flex h-full w-full items-center justify-center" aria-label="Ver en pantalla completa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={srcFoto(fotoActual)} alt={`Maqueta ${maqueta.pedido}`} className="max-h-[60vh] w-full object-contain lg:max-h-full" />
            <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-80 transition group-hover:opacity-100">
              <Maximize2 size={16} />
            </span>
          </button>
          {maqueta.fotos.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {maqueta.fotos.map((link, indice) => (
                <button
                  key={link}
                  type="button"
                  onClick={() => setFoto(indice)}
                  aria-label={`Foto ${indice + 1} de ${maqueta.fotos.length}`}
                  className={`h-12 w-12 overflow-hidden rounded-xl ring-2 transition ${indice === foto ? "ring-white" : "ring-white/25 opacity-70 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={srcFoto(link)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {/* Pasar de maqueta (celular) */}
          <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between lg:hidden">
            {onAnterior ? (
              <button type="button" aria-label="Anterior" onClick={onAnterior} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                <ChevronLeft size={20} />
              </button>
            ) : <span />}
            {onSiguiente && (
              <button type="button" aria-label="Siguiente" onClick={onSiguiente} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Al costado: reseña, likes y comentarios */}
        <div className="flex min-h-0 flex-col border-l border-[var(--border-color)]">
          <header className="flex items-start gap-3 border-b border-[var(--border-color)] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-black text-[var(--text-main)]">{maqueta.pedido}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {[maqueta.escala && `Escala ${maqueta.escala}`, maqueta.colores].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={onCerrar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--border-color)]">
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {maqueta.resena ? (
              <div className="rounded-2xl bg-amber-400/10 p-3.5 ring-1 ring-amber-400/30">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-sm font-black text-white">
                    {(maqueta.resena.nombre || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-black text-[var(--text-main)]">
                      {maqueta.resena.nombre || "Cliente"}
                      <BadgeCheck size={14} className="text-emerald-500" />
                    </p>
                    <span className="inline-flex items-center gap-0.5" aria-label={`${maqueta.estrellas} de 5 estrellas`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={12} className={i < maqueta.estrellas ? "fill-amber-400 text-amber-400" : "text-slate-400/40"} />
                      ))}
                    </span>
                  </div>
                  <span className="ml-auto text-[9px] font-black uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400">Compra verificada</span>
                </div>
                {maqueta.resena.comentario && (
                  <p className="mt-2.5 whitespace-pre-line text-sm leading-6 text-[var(--text-main)]">{maqueta.resena.comentario}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Esta maqueta todavía no tiene reseña.</p>
            )}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <MessageCircle size={13} />
                {comentarios.length ? `${comentarios.length} ${comentarios.length === 1 ? "comentario" : "comentarios"}` : "Comentarios"}
              </p>
              {comentarios.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{comentariosPrendidos ? "Sé el primero en comentar." : "Los comentarios están apagados."}</p>
              ) : (
                <ul className="space-y-3">
                  {comentarios.map((comentario) => (
                    <li key={comentario.id} className="flex gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--border-color)] text-xs font-black text-[var(--text-main)]">
                        {comentario.nombre.charAt(0).toUpperCase()}
                      </span>
                      <p className="min-w-0 text-sm leading-5 text-[var(--text-main)]">
                        <span className="font-black">{comentario.nombre}</span> {comentario.texto}
                        <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{hace(comentario.fecha)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <footer className="border-t border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void darLike()}
                aria-pressed={conLike}
                aria-label={conLike ? "Sacar me gusta" : "Me gusta"}
                className="transition active:scale-90"
              >
                <Heart size={26} className={conLike ? "fill-red-500 text-red-500" : "text-[var(--text-main)]"} />
              </button>
              <p className="text-sm font-black text-[var(--text-main)]">
                {likes} {likes === 1 ? "me gusta" : "me gusta"}
              </p>
            </div>
            {comentariosPrendidos && (
              <form onSubmit={(evento) => void comentar(evento)} className="mt-3 space-y-2">
                <input
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  maxLength={40}
                  placeholder="Tu nombre (opcional)"
                  className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-transparent px-3 text-sm outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <input
                    value={texto}
                    onChange={(evento) => setTexto(evento.target.value)}
                    maxLength={300}
                    placeholder="Agregá un comentario…"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border-color)] bg-transparent px-3 text-sm outline-none focus:border-red-500"
                  />
                  <button type="submit" disabled={!texto.trim() || enviando} aria-label="Publicar comentario" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white disabled:opacity-40">
                    <Send size={16} />
                  </button>
                </div>
              </form>
            )}
            {error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
          </footer>
        </div>
      </article>

      {/* Pantalla completa */}
      {completa && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black" onClick={(evento) => { evento.stopPropagation(); setCompleta(false); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={srcFoto(fotoActual)} alt={`Maqueta ${maqueta.pedido}`} className="max-h-screen max-w-full object-contain" />
          <button type="button" aria-label="Salir de pantalla completa" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
            <X size={20} />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
