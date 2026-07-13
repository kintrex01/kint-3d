"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useState,
} from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ArchivoFirmado = {
  nombreArchivo: string;
  ruta: string;
  token: string;
  signedUrl: string;
  link: string;
};

type VistaPrevia = {
  archivo: File;
  url: string;
};

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAXIMO_FOTOS = 3;
const MAXIMO_PESO = 8 * 1024 * 1024;

function ResenaContent() {
  const searchParams = useSearchParams();

  const pedido = searchParams.get("pedido") || "";
  const codigo = searchParams.get("codigo") || "";

  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");

  const [autorizarPublicacion, setAutorizarPublicacion] =
    useState(false);

  const [mostrarProyecto, setMostrarProyecto] =
    useState(false);

  const [archivos, setArchivos] = useState<File[]>([]);
  const [vistasPrevias, setVistasPrevias] =
    useState<VistaPrevia[]>([]);

  const [enviando, setEnviando] = useState(false);
  const [etapaEnvio, setEtapaEnvio] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nuevasVistas = archivos.map((archivo) => ({
      archivo,
      url: URL.createObjectURL(archivo),
    }));

    setVistasPrevias(nuevasVistas);

    return () => {
      nuevasVistas.forEach((vista) => {
        URL.revokeObjectURL(vista.url);
      });
    };
  }, [archivos]);

  function seleccionarImagenes(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const seleccionadas = Array.from(
      evento.target.files || []
    );

    evento.target.value = "";

    if (!seleccionadas.length) {
      return;
    }

    const total = archivos.length + seleccionadas.length;

    if (total > MAXIMO_FOTOS) {
      setError(
        `Podés subir un máximo de ${MAXIMO_FOTOS} imágenes.`
      );
      return;
    }

    for (const archivo of seleccionadas) {
      if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
        setError(
          `${archivo.name} no tiene un formato permitido.`
        );
        return;
      }

      if (archivo.size > MAXIMO_PESO) {
        setError(`${archivo.name} supera los 8 MB.`);
        return;
      }

      if (archivo.size <= 0) {
        setError(`${archivo.name} está vacío.`);
        return;
      }
    }

    setArchivos((actuales) => [
      ...actuales,
      ...seleccionadas,
    ]);
  }

  function quitarImagen(indice: number) {
    setArchivos((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    );
  }

  async function subirImagenes() {
    if (!archivos.length) {
      return [];
    }

    setEtapaEnvio("Preparando imágenes...");

    const respuestaFirma = await fetch(
      "/api/resenas-firma",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido,
          archivos: archivos.map((archivo) => ({
            nombre: archivo.name,
            tipo: archivo.type,
            size: archivo.size,
          })),
        }),
      }
    );

    const datosFirma = await respuestaFirma.json();

    if (!respuestaFirma.ok || !datosFirma.ok) {
      throw new Error(
        datosFirma.error ||
          "No se pudieron preparar las imágenes."
      );
    }

    const firmados: ArchivoFirmado[] =
      datosFirma.archivos || [];

    if (firmados.length !== archivos.length) {
      throw new Error(
        "No se pudieron preparar todas las imágenes."
      );
    }

    setEtapaEnvio("Subiendo imágenes...");

    const enlaces: string[] = [];

    for (let indice = 0; indice < archivos.length; indice++) {
      const archivo = archivos[indice];
      const firmado = firmados[indice];

      const { error: errorSubida } = await supabase.storage
        .from("kint-archivos")
        .uploadToSignedUrl(
          firmado.ruta,
          firmado.token,
          archivo,
          {
            contentType: archivo.type,
          }
        );

      if (errorSubida) {
        throw new Error(
          `No se pudo subir ${archivo.name}: ${errorSubida.message}`
        );
      }

      enlaces.push(firmado.link);
    }

    return enlaces;
  }

  async function enviarResena() {
    setError("");
    setEtapaEnvio("");

    if (!pedido) {
      setError("Falta el número de pedido.");
      return;
    }

    if (!codigo) {
      setError("El enlace de la reseña no es válido.");
      return;
    }

    if (!comentario.trim()) {
      setError("Escribí un comentario.");
      return;
    }

    if (!autorizarPublicacion) {
      setError(
        "Tenés que autorizar la publicación de la reseña."
      );
      return;
    }

    if (archivos.length > 0 && !mostrarProyecto) {
      setError(
        "Para publicar las imágenes, autorizá que el proyecto pueda mostrarse."
      );
      return;
    }

    setEnviando(true);

    try {
      const fotos = await subirImagenes();

      setEtapaEnvio("Publicando reseña...");

      const response = await fetch("/api/resenas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido,
          codigo,
          estrellas,
          comentario: comentario.trim(),
          autorizarPublicacion,
          mostrarProyecto,
          fotos,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo enviar la reseña."
        );
      }

      setEnviado(true);
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error al enviar la reseña.";

      setError(mensaje);
    } finally {
      setEnviando(false);
      setEtapaEnvio("");
    }
  }

  if (enviado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
        <section className="max-w-xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Kint 3D
          </p>

          <h1 className="text-4xl font-black uppercase tracking-[0.25em]">
            Gracias
          </h1>

          <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

          <p className="text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
            Tu reseña fue publicada correctamente.
          </p>

          <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">
  Podrás editarla durante las próximas 48 horas.
</p>

          <Link
            href={`/?resena=${encodeURIComponent(
              pedido
            )}#resenas`}
            className="mt-10 inline-block border border-red-600 bg-red-600 px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:bg-transparent hover:text-red-600"
          >
            Ver mi reseña
          </Link>

          <br />

          <Link
            href="/"
            className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] transition hover:text-red-600"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-20 text-[var(--text-main)]">
      <section className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
          Kint 3D
        </p>

        <h1 className="text-4xl font-black uppercase tracking-[0.25em] sm:text-5xl">
          Tu experiencia
        </h1>

        <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

        <p className="mb-10 text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
          Reseña para el pedido
        </p>

        <p className="mb-12 text-3xl font-black text-red-600">
          {pedido || "Sin pedido"}
        </p>

        <div className="mb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Calificación
          </p>

          <div className="flex justify-center gap-2 text-4xl">
            {[1, 2, 3, 4, 5].map((numero) => (
              <button
                key={numero}
                type="button"
                onClick={() => setEstrellas(numero)}
                aria-label={`Calificar con ${numero} estrellas`}
                className={
                  numero <= estrellas
                    ? "text-red-600"
                    : "text-[var(--border-color)]"
                }
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={comentario}
          onChange={(evento) =>
            setComentario(evento.target.value)
          }
          placeholder="Escribí tu reseña..."
          maxLength={1000}
          className="min-h-40 w-full resize-y rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 text-sm outline-none transition focus:border-red-600"
        />

        <p className="mt-3 text-right text-xs text-[var(--text-muted)]">
          {comentario.length}/1000
        </p>

        <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-4 text-left">
  <p className="text-sm font-bold text-[var(--text-main)]">
    Podrás editar tu reseña durante 2 días
  </p>

  <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
    Después de publicarla tendrás 48 horas para cambiar la
    calificación, el comentario, las fotos o las autorizaciones.
  </p>
</div>

        <div className="mt-10 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-left">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-main)]">
                Fotos del proyecto
              </p>

              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                Opcional. Podés subir hasta 3 imágenes en formato
                JPG, PNG o WebP.
              </p>
            </div>

            <label
              className={[
                "inline-flex cursor-pointer items-center justify-center border px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition",
                archivos.length >= MAXIMO_FOTOS
                  ? "pointer-events-none border-[var(--border-color)] opacity-40"
                  : "border-red-600 text-red-600 hover:bg-red-600 hover:text-white",
              ].join(" ")}
            >
              Agregar fotos

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={seleccionarImagenes}
                className="hidden"
                disabled={archivos.length >= MAXIMO_FOTOS}
              />
            </label>
          </div>

          {vistasPrevias.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {vistasPrevias.map((vista, indice) => (
                <div
                  key={`${vista.archivo.name}-${indice}`}
                  className="relative overflow-hidden rounded-xl border border-[var(--border-color)]"
                >
                  <img
                    src={vista.url}
                    alt={`Vista previa ${indice + 1}`}
                    className="aspect-square w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => quitarImagen(indice)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg text-white transition hover:bg-red-600"
                    aria-label={`Quitar ${vista.archivo.name}`}
                  >
                    ×
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
                    <p className="truncate text-[10px] text-white">
                      {vista.archivo.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-[var(--text-muted)]">
            {archivos.length} de {MAXIMO_FOTOS} imágenes seleccionadas
          </p>
        </div>

        <div className="mt-8 space-y-5 text-left">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={autorizarPublicacion}
              onChange={(evento) =>
                setAutorizarPublicacion(evento.target.checked)
              }
              className="mt-1"
            />

            <span>
              Autorizo que mi reseña sea publicada en la web de
              Kint 3D y pueda ser vista por otros clientes.
              <strong className="text-red-600"> Obligatorio.</strong>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={mostrarProyecto}
              onChange={(evento) =>
                setMostrarProyecto(evento.target.checked)
              }
              className="mt-1"
            />

            <span>
              Autorizo que mi proyecto y las imágenes seleccionadas
              puedan aparecer junto a la reseña.
            </span>
          </label>
        </div>

        {error && (
          <p className="mt-7 rounded-xl border border-red-600/30 bg-red-600/5 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={enviarResena}
          disabled={
            enviando ||
            !pedido ||
            !codigo ||
            !autorizarPublicacion
          }
          className="mt-10 w-full border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando
            ? etapaEnvio || "Enviando..."
            : "Enviar reseña"}
        </button>
      </section>
    </main>
  );
}

export default function ResenaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResenaContent />
    </Suspense>
  );
}