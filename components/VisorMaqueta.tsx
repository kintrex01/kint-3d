"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import InsigniaTop from "./InsigniaTop";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, Maximize2, MessageCircle, Send, Star, X } from "lucide-react";

/*
 * Una maqueta de la galería, como un posteo: la foto (tocala y se ve en
 * pantalla completa) y al costado la reseña de la clienta, los likes y los
 * comentarios. En el celular va todo uno abajo del otro.
 * - Like: con reseña suma a la reseña (el mismo de las reseñas del inicio);
 *   sin reseña, a la galería. Se recuerda en el navegador.
 * - Comentarios: con un nombre opcional; se publican al toque.
 */

// top: 1, 2 o 3 si quien comenta está en el podio del Top Kint.
export type ComentarioGaleria = { id: number; nombre: string; texto: string; fecha: string; top?: number };
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
  resena: { comentario: string; nombre: string; fotosCliente: number; top?: number } | null;
};

const CLAVE_DISPOSITIVO = "kint3d_dispositivo_resenas";
const CLAVE_LIKES_RESENAS = "kint3d_resenas_con_like";
const CLAVE_LIKES_GALERIA = "kint3d_galeria_con_like";
// La misma sesión que Mi cuenta (app/cuenta): entrar acá también deja entrado allá.
const CLAVE_SESION = "kint-cuenta-sesion-v1";
type Sesion = { email: string; token: string };

function leerSesion(): Sesion | null {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
    return guardada?.email && guardada?.token ? { email: String(guardada.email), token: String(guardada.token) } : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin almacenamiento: dura lo que la página */
  }
}

async function llamarCuenta(cuerpo: Record<string, unknown>) {
  const respuesta = await fetch("/api/cuenta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = await respuesta.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error || "No pudimos completar la acción.");
  return data;
}

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
  puntosComentario = 0,
  onCerrar,
  onAnterior,
  onSiguiente,
  onCambio,
}: {
  maqueta: MaquetaGaleria;
  comentariosPrendidos: boolean;
  /* Puntos por el primer comentario en cada maqueta (Configuración › Puntos). */
  puntosComentario?: number;
  onCerrar: () => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onCambio: (cambios: Partial<MaquetaGaleria>) => void;
}) {
  const [foto, setFoto] = useState(0);
  const [completa, setCompleta] = useState(false);
  const [conLike, setConLike] = useState(false);
  const [enviandoLike, setEnviandoLike] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  // Para comentar hace falta la cuenta: la sesión de Mi cuenta o entrar acá con el correo.
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [paso, setPaso] = useState<"" | "correo" | "codigo">("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");

  const claveLikes = maqueta.tieneResena ? CLAVE_LIKES_RESENAS : CLAVE_LIKES_GALERIA;

  // Al cambiar de maqueta: primera foto, su like y la sesión guardada.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setFoto(0);
    setError("");
    setAviso("");
    setConLike(leerLista(claveLikes).includes(maqueta.id.toUpperCase()));
    setSesion(leerSesion());
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

  /* Publica el comentario con la sesión (si no hay, pide el correo). */
  async function publicar(conSesion: Sesion | null = sesion) {
    if (!texto.trim() || enviando) return;
    if (!conSesion) {
      setPaso("correo");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/galeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "comentario",
          pedido: maqueta.id,
          dispositivo: dispositivo(),
          email: conSesion.email,
          token: conSesion.token,
          texto: texto.trim(),
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        // Sesión vencida: se vuelve a pedir el correo.
        if (/sesi[oó]n/i.test(String(data.error))) {
          guardarSesion(null);
          setSesion(null);
          setPaso("correo");
        }
        throw new Error(data.error || "No se pudo publicar el comentario.");
      }
      onCambio({ comentarios: [...(maqueta.comentarios ?? []), data.comentario] });
      setTexto("");
      setAviso(data.puntos ? `¡Sumaste ${data.puntos} Puntos Kint por tu primer comentario acá!` : "");
    } catch (errorComentario) {
      setError(errorComentario instanceof Error ? errorComentario.message : "No se pudo publicar el comentario.");
    } finally {
      setEnviando(false);
    }
  }

  function comentar(evento: React.FormEvent) {
    evento.preventDefault();
    void publicar();
  }

  /* Paso 1: el correo (y el nombre si es nueva): le llega un código. */
  async function pedirCodigo(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return setError("Revisá tu correo.");
    setEnviando(true);
    setError("");
    try {
      await llamarCuenta({ tipo: "cuenta_codigo", email: correo.trim(), nombre: nombre.trim(), crear: Boolean(nombre.trim()) });
      setCodigo("");
      setPaso("codigo");
    } catch (errorCodigo) {
      const mensaje = errorCodigo instanceof Error ? errorCodigo.message : "No pudimos mandar el código.";
      setError(/No encontramos una cuenta/.test(mensaje) && !nombre.trim() ? "Es tu primera vez: poné tu nombre y te creamos la cuenta." : mensaje);
    } finally {
      setEnviando(false);
    }
  }

  /* Paso 2: el código. Queda la sesión (también para Mi cuenta) y se publica. */
  async function verificar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando || codigo.trim().length !== 5) return;
    setEnviando(true);
    setError("");
    try {
      const data = await llamarCuenta({ tipo: "cuenta_verificar", email: correo.trim(), codigo: codigo.trim() });
      const nueva = { email: correo.trim(), token: String(data.token) };
      guardarSesion(nueva);
      setSesion(nueva);
      setPaso("");
      setEnviando(false);
      await publicar(nueva);
    } catch (errorVerificar) {
      setError(errorVerificar instanceof Error ? errorVerificar.message : "El código no es correcto.");
      setEnviando(false);
    }
  }

  const fotoActual = maqueta.fotos[foto] || maqueta.fotos[0];
  const comentarios = maqueta.comentarios ?? [];
  const likes = maqueta.likes ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-stretch justify-center bg-black/85 backdrop-blur-sm lg:items-center lg:p-6" onClick={onCerrar}>
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
          {/* Pasar de maqueta sin cerrar (también con las flechas del teclado) */}
          {onAnterior && (
            <button
              type="button"
              aria-label="Maqueta anterior"
              onClick={onAnterior}
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white"
            >
              <ChevronLeft size={26} />
            </button>
          )}
          {onSiguiente && (
            <button
              type="button"
              aria-label="Maqueta siguiente"
              onClick={onSiguiente}
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white"
            >
              <ChevronRight size={26} />
            </button>
          )}
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
                      {maqueta.resena.top ? <InsigniaTop puesto={maqueta.resena.top} tamano="xs" /> : null}
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
                        <span className="font-black">{comentario.nombre}</span>
                        {comentario.top ? <InsigniaTop puesto={comentario.top} tamano="xs" className="mx-0.5 inline-block align-[-3px]" /> : null}{" "}
                        {comentario.texto}
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
              <form onSubmit={comentar} className="mt-3 space-y-2">
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
                {sesion && !paso && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Comentás como <span className="font-bold">{sesion.email}</span>
                    {puntosComentario > 0 && ` · tu primer comentario acá suma ${puntosComentario} Puntos Kint`}
                  </p>
                )}
                {!sesion && !paso && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Para comentar entrás con tu correo{puntosComentario > 0 ? ` y sumás ${puntosComentario} Puntos Kint por tu primer comentario en cada maqueta` : ""}.
                  </p>
                )}
              </form>
            )}

            {/* Entrar (o crear la cuenta) sin salir de la galería */}
            {paso === "correo" && (
              <form onSubmit={(evento) => void pedirCodigo(evento)} className="mt-3 space-y-2 rounded-2xl bg-[var(--border-color)]/40 p-3">
                <p className="text-xs font-black text-[var(--text-main)]">Entrá con tu correo para publicar</p>
                <input
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  maxLength={40}
                  autoComplete="name"
                  placeholder="Tu nombre (si es tu primera vez)"
                  className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 text-sm outline-none focus:border-red-500"
                />
                <input
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 text-sm outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={enviando} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-black text-white disabled:opacity-50">
                    {enviando ? "Mandando…" : "Mandame el código"}
                  </button>
                  <button type="button" onClick={() => setPaso("")} className="h-10 rounded-xl px-3 text-sm font-bold text-[var(--text-muted)]">
                    Cancelar
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">Te llega un código de 5 letras. Si no tenés cuenta, se crea con tu nombre.</p>
              </form>
            )}
            {paso === "codigo" && (
              <form onSubmit={(evento) => void verificar(evento)} className="mt-3 space-y-2 rounded-2xl bg-[var(--border-color)]/40 p-3">
                <p className="text-xs font-black text-[var(--text-main)]">Escribí el código que te mandamos a {correo}</p>
                <input
                  value={codigo}
                  onChange={(evento) => setCodigo(evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                  autoComplete="one-time-code"
                  placeholder="ABCDE"
                  className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={enviando || codigo.length !== 5} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-black text-white disabled:opacity-50">
                    {enviando ? "Publicando…" : "Entrar y publicar"}
                  </button>
                  <button type="button" onClick={() => setPaso("correo")} className="h-10 rounded-xl px-3 text-sm font-bold text-[var(--text-muted)]">
                    Cambiar correo
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">Si no lo ves, fijate en Spam o Promociones.</p>
              </form>
            )}
            {aviso && <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">🎁 {aviso}</p>}
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
