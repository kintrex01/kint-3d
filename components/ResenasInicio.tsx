"use client";

import { useEffect, useState } from "react";

type Resena = {
  pedido: string;
  nombre: string;
  estrellas: number;
  comentario: string;
  insignia: string;
  fotoProyecto?: string;
  likes: number;
};

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

export default function ResenasInicio() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [resenaDestacada, setResenaDestacada] = useState<string | null>(null);
  const [likesPropios, setLikesPropios] = useState<Set<string>>(new Set());
  const [procesandoLike, setProcesandoLike] = useState<string | null>(null);
  const [errorLike, setErrorLike] = useState<string | null>(null);

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
    }, 300);
  }, [loading, resenas]);

  async function cambiarLike(pedido: string) {
    if (!pedido || procesandoLike) {
      return;
    }

    const pedidoNormalizado = pedido.trim().toUpperCase();

    setErrorLike(null);
    setProcesandoLike(pedidoNormalizado);

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
      const mensaje =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el Me gusta.";

      setErrorLike(mensaje);
    } finally {
      setProcesandoLike(null);
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
      {errorLike && (
        <p className="mb-6 text-center text-sm font-bold text-red-600">
          {errorLike}
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {resenas.map((resena, index) => {
          const pedido =
            String(resena.pedido || "").trim().toUpperCase() ||
            `pedido-${index}`;

          const idProyecto = `${pedido}-proyecto`;
          const tieneFoto = Boolean(resena.fotoProyecto);
          const estaAbierta = abierta === idProyecto;
          const estaDestacada = resenaDestacada === pedido;
          const tieneLike = likesPropios.has(pedido);
          const estaProcesando = procesandoLike === pedido;

          const estrellas = Math.max(
            0,
            Math.min(5, Number(resena.estrellas || 0))
          );

          return (
            <article
              id={`resena-${pedido}`}
              key={pedido}
              className={[
                "scroll-mt-28 rounded-2xl border p-8 transition duration-500",
                estaDestacada
                  ? "border-red-600 bg-red-600/5 shadow-[0_0_0_3px_rgba(220,38,38,0.15)]"
                  : "border-[var(--border-color)]",
              ].join(" ")}
            >
              {estaDestacada && (
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-red-600">
                  Tu reseña
                </p>
              )}

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-[var(--text-main)]">
                    {resena.nombre || "Cliente de Kint 3D"}
                  </p>

                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    ✓ Cliente verificado
                    {resena.insignia ? ` · ${resena.insignia}` : ""}
                  </p>
                </div>

                <p className="shrink-0 text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {pedido}
                </p>
              </div>

              <p
                className="mb-4 text-2xl text-red-600"
                aria-label={`${estrellas} de 5 estrellas`}
              >
                {"★".repeat(estrellas)}

                <span className="text-[var(--border-color)]">
                  {"★".repeat(5 - estrellas)}
                </span>
              </p>

              <p className="mb-6 whitespace-pre-line text-sm italic leading-7 text-[var(--text-muted)]">
                “{resena.comentario}”
              </p>

              <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-5">
                <p className="text-xs text-[var(--text-muted)]">
                  Pedido: {pedido}
                </p>

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
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    tieneLike
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-[var(--border-color)] text-[var(--text-muted)] hover:border-red-600 hover:text-red-600",
                    estaProcesando
                      ? "cursor-wait opacity-50"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  <span aria-hidden="true">
                    {tieneLike ? "♥" : "♡"}
                  </span>

                  <span>{Number(resena.likes || 0)}</span>
                </button>
              </div>

              {tieneFoto && (
                <div className="mt-6 border-t border-[var(--border-color)] pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setAbierta(estaAbierta ? null : idProyecto)
                    }
                    className="text-xs font-bold uppercase tracking-[0.25em] text-red-600 transition hover:opacity-70"
                  >
                    {estaAbierta
                      ? "Ocultar proyecto ▲"
                      : "Ver proyecto ▼"}
                  </button>

                  {estaAbierta && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                      <img
                        src={resena.fotoProyecto}
                        alt={`Proyecto correspondiente al pedido ${pedido}`}
                        loading="lazy"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}