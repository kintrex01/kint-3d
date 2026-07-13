"use client";

import { useEffect, useMemo, useState } from "react";

type Resena = {
  fecha?: string;
  pedido: string;
  nombre: string;
  estrellas: number;
  comentario: string;
  insignia: string;
  fotoProyecto?: string;
  fotos?: string[];
  likes: number;
};

type OrdenResenas =
  | "recientes"
  | "antiguas"
  | "mas-likes"
  | "menos-likes"
  | "con-foto"
  | "sin-foto";

const CLAVE_DISPOSITIVO = "kint3d_dispositivo_resenas";
const CLAVE_LIKES = "kint3d_resenas_con_like";

function generarIdentificadorDispositivo() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `kint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function obtenerDispositivo() {
  const existente = localStorage.getItem(CLAVE_DISPOSITIVO);

  if (existente) {
    return existente;
  }

  const nuevo = generarIdentificadorDispositivo();

  localStorage.setItem(CLAVE_DISPOSITIVO, nuevo);

  return nuevo;
}

function obtenerLikesGuardados() {
  try {
    const guardados = localStorage.getItem(CLAVE_LIKES);

    if (!guardados) {
      return new Set<string>();
    }

    const lista = JSON.parse(guardados);

    if (!Array.isArray(lista)) {
      return new Set<string>();
    }

    return new Set(
      lista
        .map((pedido) => String(pedido).trim().toUpperCase())
        .filter(Boolean)
    );
  } catch {
    return new Set<string>();
  }
}

function obtenerTiempo(fecha?: string) {
  if (!fecha) {
    return 0;
  }

  const tiempo = new Date(fecha).getTime();

  return Number.isNaN(tiempo) ? 0 : tiempo;
}

function obtenerIdDrive(enlace?: string) {
  const texto = String(enlace || "").trim();

  if (!texto) {
    return "";
  }

  const porArchivo = texto.match(
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  );

  if (porArchivo?.[1]) {
    return porArchivo[1];
  }

  const porParametro = texto.match(
    /[?&]id=([a-zA-Z0-9_-]+)/
  );

  if (porParametro?.[1]) {
    return porParametro[1];
  }

  const porDirecto = texto.match(
    /\/d\/([a-zA-Z0-9_-]+)/
  );

  return porDirecto?.[1] || "";
}


function obtenerSrcFoto(enlace?: string) {
  const texto = String(enlace || "").trim();

  if (!texto) {
    return "";
  }

  const idDrive = obtenerIdDrive(texto);

  if (idDrive) {
    return `/api/imagen-drive?id=${encodeURIComponent(idDrive)}`;
  }

  if (texto.startsWith("https://") || texto.startsWith("http://")) {
    return texto;
  }

  return "";
}

export default function ResenasInicio() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [resenaDestacada, setResenaDestacada] = useState<string | null>(null);
  const [likesPropios, setLikesPropios] = useState<Set<string>>(new Set());
  const [procesandoLike, setProcesandoLike] = useState<Set<string>>(new Set());
  const [errorLike, setErrorLike] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenResenas>("recientes");
  const [galeriaAbierta, setGaleriaAbierta] = useState<{
    pedido: string;
    fotos: string[];
    indice: number;
  } | null>(null);

  useEffect(() => {
    setLikesPropios(obtenerLikesGuardados());

    async function cargarResenas() {
      try {
        const response = await fetch("/api/resenas", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.ok) {
          setResenas(data.resenas || []);
        }
      } catch (error) {
        console.error("Error al cargar reseñas:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarResenas();
  }, []);

  useEffect(() => {
    if (loading || !resenas.length) {
      return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const pedidoBuscado = parametros.get("resena");

    if (!pedidoBuscado) {
      return;
    }

    const pedidoNormalizado = pedidoBuscado.trim().toUpperCase();

    const existe = resenas.some(
      (resena) =>
        String(resena.pedido || "").trim().toUpperCase() === pedidoNormalizado
    );

    if (!existe) {
      return;
    }

    setResenaDestacada(pedidoNormalizado);

    window.setTimeout(() => {
      const elemento = document.getElementById(
        `resena-${pedidoNormalizado}`
      );

      elemento?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);

    const temporizador = window.setTimeout(() => {
      setResenaDestacada(null);
    }, 4000);

    return () => window.clearTimeout(temporizador);
  }, [loading, resenas]);

  useEffect(() => {
    if (!galeriaAbierta) {
      return;
    }

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setGaleriaAbierta(null);
      }

      if (evento.key === "ArrowRight") {
        setGaleriaAbierta((actual) => {
          if (!actual || actual.fotos.length <= 1) {
            return actual;
          }

          return {
            ...actual,
            indice: (actual.indice + 1) % actual.fotos.length,
          };
        });
      }

      if (evento.key === "ArrowLeft") {
        setGaleriaAbierta((actual) => {
          if (!actual || actual.fotos.length <= 1) {
            return actual;
          }

          return {
            ...actual,
            indice:
              (actual.indice - 1 + actual.fotos.length) %
              actual.fotos.length,
          };
        });
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", manejarTeclado);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", manejarTeclado);
    };
  }, [galeriaAbierta]);

  const resenasOrdenadas = useMemo(() => {
    const copia = [...resenas];

    switch (orden) {
      case "antiguas":
        return copia.sort(
          (a, b) => obtenerTiempo(a.fecha) - obtenerTiempo(b.fecha)
        );

      case "mas-likes":
        return copia.sort(
          (a, b) => Number(b.likes || 0) - Number(a.likes || 0)
        );

      case "menos-likes":
        return copia.sort(
          (a, b) => Number(a.likes || 0) - Number(b.likes || 0)
        );

      case "con-foto":
        return copia.sort(
          (a, b) =>
            Number(Boolean(b.fotoProyecto)) -
            Number(Boolean(a.fotoProyecto))
        );

      case "sin-foto":
        return copia.sort(
          (a, b) =>
            Number(Boolean(a.fotoProyecto)) -
            Number(Boolean(b.fotoProyecto))
        );

      case "recientes":
      default:
        return copia.sort(
          (a, b) => obtenerTiempo(b.fecha) - obtenerTiempo(a.fecha)
        );
    }
  }, [resenas, orden]);

  async function cambiarLike(pedido: string) {
    const pedidoNormalizado = pedido.trim().toUpperCase();

    if (!pedidoNormalizado || procesandoLike.has(pedidoNormalizado)) {
      return;
    }

    setErrorLike(null);

    const yaTeniaLike = likesPropios.has(pedidoNormalizado);
    const cambioLikes = yaTeniaLike ? -1 : 1;

    setProcesandoLike((actuales) => {
      const nuevos = new Set(actuales);
      nuevos.add(pedidoNormalizado);
      return nuevos;
    });

    // Cambio visual inmediato
    setResenas((actuales) =>
      actuales.map((resena) => {
        const pedidoActual = String(resena.pedido || "")
          .trim()
          .toUpperCase();

        if (pedidoActual !== pedidoNormalizado) {
          return resena;
        }

        return {
          ...resena,
          likes: Math.max(0, Number(resena.likes || 0) + cambioLikes),
        };
      })
    );

    setLikesPropios((actuales) => {
      const nuevos = new Set(actuales);

      if (yaTeniaLike) {
        nuevos.delete(pedidoNormalizado);
      } else {
        nuevos.add(pedidoNormalizado);
      }

      localStorage.setItem(
        CLAVE_LIKES,
        JSON.stringify(Array.from(nuevos))
      );

      return nuevos;
    });

    try {
      const dispositivo = obtenerDispositivo();

      const response = await fetch("/api/resenas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo: "like_resena",
          pedido: pedidoNormalizado,
          dispositivo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el Me gusta."
        );
      }

      // Confirmamos el valor verdadero de Sheets
      setResenas((actuales) =>
        actuales.map((resena) => {
          const pedidoActual = String(resena.pedido || "")
            .trim()
            .toUpperCase();

          if (pedidoActual !== pedidoNormalizado) {
            return resena;
          }

          return {
            ...resena,
            likes: Number(data.likes || 0),
          };
        })
      );

      setLikesPropios((actuales) => {
        const nuevos = new Set(actuales);

        if (data.tieneLike) {
          nuevos.add(pedidoNormalizado);
        } else {
          nuevos.delete(pedidoNormalizado);
        }

        localStorage.setItem(
          CLAVE_LIKES,
          JSON.stringify(Array.from(nuevos))
        );

        return nuevos;
      });
    } catch (error) {
      // Si falla, deshacemos el cambio visual
      setResenas((actuales) =>
        actuales.map((resena) => {
          const pedidoActual = String(resena.pedido || "")
            .trim()
            .toUpperCase();

          if (pedidoActual !== pedidoNormalizado) {
            return resena;
          }

          return {
            ...resena,
            likes: Math.max(0, Number(resena.likes || 0) - cambioLikes),
          };
        })
      );

      setLikesPropios((actuales) => {
        const nuevos = new Set(actuales);

        if (yaTeniaLike) {
          nuevos.add(pedidoNormalizado);
        } else {
          nuevos.delete(pedidoNormalizado);
        }

        localStorage.setItem(
          CLAVE_LIKES,
          JSON.stringify(Array.from(nuevos))
        );

        return nuevos;
      });

      const mensaje =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el Me gusta.";

      setErrorLike(mensaje);
    } finally {
      setProcesandoLike((actuales) => {
        const nuevos = new Set(actuales);
        nuevos.delete(pedidoNormalizado);
        return nuevos;
      });
    }
  }

  if (loading) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)]">
        Cargando reseñas...
      </p>
    );
  }

  if (!resenas.length) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)]">
        No hay reseñas disponibles.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {resenas.length} experiencias verificadas
        </p>

        <label className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Ordenar
          </span>

          <select
            value={orden}
            onChange={(evento) =>
              setOrden(evento.target.value as OrdenResenas)
            }
            className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-main)] outline-none transition focus:border-red-600"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguas">Más antiguas</option>
            <option value="mas-likes">Más likes</option>
            <option value="menos-likes">Menos likes</option>
            <option value="con-foto">Con foto primero</option>
            <option value="sin-foto">Sin foto primero</option>
          </select>
        </label>
      </div>

      {errorLike && (
        <p className="mb-6 text-center text-sm font-bold text-red-600">
          {errorLike}
        </p>
      )}

      <div className="grid items-start gap-6 md:grid-cols-2">
        {resenasOrdenadas.map((resena, index) => {
          const pedido =
            String(resena.pedido || "").trim().toUpperCase() ||
            `pedido-${index}`;

          const idProyecto = `${pedido}-proyecto`;

          const enlacesFotos = Array.isArray(resena.fotos)
  ? resena.fotos.filter(Boolean)
  : resena.fotoProyecto
    ? [resena.fotoProyecto]
    : [];

const fotosProyecto = enlacesFotos
  .map((enlace) => obtenerSrcFoto(enlace))
  .filter(Boolean);

          const tieneFoto = fotosProyecto.length > 0;
          const estaAbierta = abierta === idProyecto;
          const estaDestacada = resenaDestacada === pedido;
          const tieneLike = likesPropios.has(pedido);
          const estaProcesando = procesandoLike.has(pedido);

          const estrellas = Math.max(
            0,
            Math.min(5, Number(resena.estrellas || 0))
          );

          return (
            <article
              id={`resena-${pedido}`}
              key={pedido}
              className={[
                "scroll-mt-28 overflow-hidden rounded-3xl border bg-[var(--card-bg)] text-left shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-500",
                estaDestacada
                  ? "border-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.15)]"
                  : "border-[var(--border-color)] hover:-translate-y-1 hover:border-red-600/50",
              ].join(" ")}
            >
              <div className="p-6 sm:p-7">
                {estaDestacada && (
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-red-600">
                    Tu reseña
                  </p>
                )}

                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-main)]">
                      {resena.nombre || "Cliente de Kint 3D"}
                    </h3>

                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      ✓ Cliente verificado
                      {resena.insignia ? ` · ${resena.insignia}` : ""}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-[var(--border-color)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    {pedido}
                  </span>
                </div>

                <div
                  className="mt-6 flex gap-1 text-2xl"
                  aria-label={`${estrellas} de 5 estrellas`}
                >
                  {Array.from({ length: 5 }).map((_, indice) => (
                    <span
                      key={indice}
                      className={
                        indice < estrellas
                          ? "text-red-600"
                          : "text-[var(--border-color)]"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>

                <blockquote className="mt-5 text-base italic leading-7 text-[var(--text-muted)]">
                  “{resena.comentario}”
                </blockquote>

                <div className="mt-7 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => cambiarLike(pedido)}
                    disabled={estaProcesando}
                    aria-label={
                      tieneLike
                        ? "Quitar Me gusta"
                        : "Dar Me gusta a esta reseña"
                    }
                    className={[
                      "flex min-w-16 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
                      tieneLike
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-[var(--border-color)] text-[var(--text-muted)] hover:border-red-600 hover:text-red-600",
                      estaProcesando ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">
                      {tieneLike ? "♥" : "♡"}
                    </span>

                    <span>{Number(resena.likes || 0)}</span>
                  </button>
                </div>
              </div>

              {tieneFoto && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAbierta(estaAbierta ? null : idProyecto)
                    }
                    className="flex w-full items-center justify-between px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-red-600 transition hover:bg-red-600/5 sm:px-7"
                  >
                    <span>
                      {estaAbierta
                        ? "Ocultar proyecto"
                        : "Ver proyecto"}
                    </span>

                    <span
                      className={[
                        "transition-transform duration-300",
                        estaAbierta ? "rotate-180" : "",
                      ].join(" ")}
                    >
                      ▼
                    </span>
                  </button>

                  {estaAbierta && (
                    <div className="p-4 pt-2">
                      <div
                        className={[
                          "grid gap-3",
                          fotosProyecto.length === 1
                            ? "grid-cols-1"
                            : "grid-cols-2 sm:grid-cols-3",
                        ].join(" ")}
                      >
                        {fotosProyecto.map((foto, indiceFoto) => (
                          <button
                            key={`${foto}-${indiceFoto}`}
                            type="button"
                            onClick={() =>
                              setGaleriaAbierta({
                                pedido,
                                fotos: fotosProyecto,
                                indice: indiceFoto,
                              })
                            }
                            className="group relative overflow-hidden rounded-2xl bg-black/10"
                            aria-label={`Abrir foto ${indiceFoto + 1} del proyecto ${pedido}`}
                          >
                            <img
                              src={foto}
                              alt={`Foto ${indiceFoto + 1} del proyecto ${pedido}`}
                              loading="lazy"
                              className={[
                                "w-full transition duration-300 group-hover:scale-[1.03]",
                                fotosProyecto.length === 1
                                  ? "max-h-[380px] object-contain"
                                  : "aspect-square object-cover",
                              ].join(" ")}
                            />

                            <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                              {indiceFoto + 1} / {fotosProyecto.length}
                            </span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setGaleriaAbierta({
                            pedido,
                            fotos: fotosProyecto,
                            indice: 0,
                          })
                        }
                        className="mt-4 w-full rounded-xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:border-red-600 hover:text-red-600"
                      >
                        Ver galería completa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {galeriaAbierta && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería del pedido ${galeriaAbierta.pedido}`}
          onClick={() => setGaleriaAbierta(null)}
        >
          <button
            type="button"
            onClick={() => setGaleriaAbierta(null)}
            className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/60 text-2xl text-white transition hover:bg-white hover:text-black"
            aria-label="Cerrar imagen"
          >
            ×
          </button>

          {galeriaAbierta.fotos.length > 1 && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();

                setGaleriaAbierta((actual) => {
                  if (!actual) {
                    return actual;
                  }

                  return {
                    ...actual,
                    indice:
                      (actual.indice - 1 + actual.fotos.length) %
                      actual.fotos.length,
                  };
                });
              }}
              className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-3xl text-white transition hover:bg-white hover:text-black sm:left-6"
              aria-label="Foto anterior"
            >
              ‹
            </button>
          )}

          <div
            className="flex max-h-[92vh] max-w-[92vw] flex-col items-center"
            onClick={(evento) => evento.stopPropagation()}
          >
            <img
              src={galeriaAbierta.fotos[galeriaAbierta.indice]}
              alt={`Foto ${galeriaAbierta.indice + 1} del pedido ${
                galeriaAbierta.pedido
              }`}
              className="max-h-[84vh] max-w-[92vw] object-contain"
            />

            <div className="mt-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
              <span>{galeriaAbierta.pedido}</span>

              {galeriaAbierta.fotos.length > 1 && (
                <span>
                  {galeriaAbierta.indice + 1} / {galeriaAbierta.fotos.length}
                </span>
              )}
            </div>
          </div>

          {galeriaAbierta.fotos.length > 1 && (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();

                setGaleriaAbierta((actual) => {
                  if (!actual) {
                    return actual;
                  }

                  return {
                    ...actual,
                    indice: (actual.indice + 1) % actual.fotos.length,
                  };
                });
              }}
              className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-3xl text-white transition hover:bg-white hover:text-black sm:right-6"
              aria-label="Foto siguiente"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}