"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useMemo,
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

type VistaPreviaNueva = {
  archivo: File;
  url: string;
};

type ResenaEditable = {
  pedido: string;
  nombre: string;
  estrellas: number;
  comentario: string;
  mostrarProyecto: boolean;
  fotos: string[];
  fechaLimiteEdicion: string;
  horasRestantes: number;
};

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAXIMO_FOTOS = 3;
const MAXIMO_PESO = 8 * 1024 * 1024;

function obtenerIdDrive(enlace?: string) {
  const texto = String(enlace || "").trim();

  if (!texto) return "";

  const porArchivo = texto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (porArchivo?.[1]) return porArchivo[1];

  const porParametro = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (porParametro?.[1]) return porParametro[1];

  const porDirecto = texto.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return porDirecto?.[1] || "";
}

function obtenerSrcFoto(enlace?: string) {
  const texto = String(enlace || "").trim();

  if (!texto) return "";

  const idDrive = obtenerIdDrive(texto);

  if (idDrive) {
    return `/api/imagen-drive?id=${encodeURIComponent(idDrive)}`;
  }

  if (texto.startsWith("https://") || texto.startsWith("http://")) {
    return texto;
  }

  return "";
}

function EditarResenaContent() {
  const searchParams = useSearchParams();

  const pedido = String(searchParams.get("pedido") || "")
    .trim()
    .toUpperCase();

  const codigo = String(searchParams.get("codigo") || "")
    .trim()
    .toUpperCase();

  const [nombre, setNombre] = useState("");
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [mostrarProyecto, setMostrarProyecto] = useState(false);

  const [fotosExistentes, setFotosExistentes] = useState<string[]>([]);
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [vistasPreviasNuevas, setVistasPreviasNuevas] =
    useState<VistaPreviaNueva[]>([]);

  const [horasRestantes, setHorasRestantes] = useState(0);
  const [fechaLimite, setFechaLimite] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [etapaGuardado, setEtapaGuardado] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  const totalFotos = fotosExistentes.length + archivosNuevos.length;

  const fechaLimiteFormateada = useMemo(() => {
    if (!fechaLimite) return "";

    const fecha = new Date(fechaLimite);

    if (Number.isNaN(fecha.getTime())) return "";

    return new Intl.DateTimeFormat("es-UY", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(fecha);
  }, [fechaLimite]);

  useEffect(() => {
    const nuevasVistas = archivosNuevos.map((archivo) => ({
      archivo,
      url: URL.createObjectURL(archivo),
    }));

    setVistasPreviasNuevas(nuevasVistas);

    return () => {
      nuevasVistas.forEach((vista) => {
        URL.revokeObjectURL(vista.url);
      });
    };
  }, [archivosNuevos]);

  useEffect(() => {
    async function cargarResena() {
      setError("");

      if (!pedido || !codigo) {
        setError("El enlace para editar la reseña no es válido.");
        setCargando(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/editar-resena?pedido=${encodeURIComponent(
            pedido
          )}&codigo=${encodeURIComponent(codigo)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error || "No se pudo cargar la reseña."
          );
        }

        const resena = data as ResenaEditable;

        setNombre(resena.nombre || "");
        setEstrellas(Number(resena.estrellas || 5));
        setComentario(String(resena.comentario || ""));
        setMostrarProyecto(Boolean(resena.mostrarProyecto));
        setFotosExistentes(
          Array.isArray(resena.fotos)
            ? resena.fotos.filter(Boolean)
            : []
        );
        setHorasRestantes(Number(resena.horasRestantes || 0));
        setFechaLimite(String(resena.fechaLimiteEdicion || ""));
      } catch (error: unknown) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la reseña."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarResena();
  }, [pedido, codigo]);

  function seleccionarImagenes(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const seleccionadas = Array.from(
      evento.target.files || []
    );

    evento.target.value = "";

    if (!seleccionadas.length) return;

    if (totalFotos + seleccionadas.length > MAXIMO_FOTOS) {
      setError(
        `Podés guardar un máximo de ${MAXIMO_FOTOS} imágenes en total.`
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

    setArchivosNuevos((actuales) => [
      ...actuales,
      ...seleccionadas,
    ]);
  }

  function quitarFotoExistente(indice: number) {
    setFotosExistentes((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    );
  }

  function quitarFotoNueva(indice: number) {
    setArchivosNuevos((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    );
  }

  async function subirImagenesNuevas() {
    if (!archivosNuevos.length) {
      return [];
    }

    setEtapaGuardado("Preparando imágenes...");

    const respuestaFirma = await fetch(
      "/api/resenas-firma",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido,
          archivos: archivosNuevos.map((archivo) => ({
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

    if (firmados.length !== archivosNuevos.length) {
      throw new Error(
        "No se pudieron preparar todas las imágenes."
      );
    }

    setEtapaGuardado("Subiendo imágenes...");

    const enlaces: string[] = [];

    for (
      let indice = 0;
      indice < archivosNuevos.length;
      indice++
    ) {
      const archivo = archivosNuevos[indice];
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

  async function guardarCambios() {
    setError("");
    setEtapaGuardado("");

    if (!pedido || !codigo) {
      setError("El enlace para editar la reseña no es válido.");
      return;
    }

    if (!comentario.trim()) {
      setError("Escribí un comentario.");
      return;
    }

    if (totalFotos > 0 && !mostrarProyecto) {
      setError(
        "Para mantener o publicar imágenes, autorizá que el proyecto pueda mostrarse."
      );
      return;
    }

    setGuardando(true);

    try {
      const nuevasFotos = await subirImagenesNuevas();
      const fotosFinales = [
        ...fotosExistentes,
        ...nuevasFotos,
      ];

      setEtapaGuardado("Guardando cambios...");

      const response = await fetch("/api/editar-resena", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido,
          codigoEdicion: codigo,
          estrellas,
          comentario: comentario.trim(),
          mostrarProyecto,
          fotos: fotosFinales,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo actualizar la reseña."
        );
      }

      setFotosExistentes(fotosFinales);
      setArchivosNuevos([]);
      setGuardado(true);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la reseña."
      );
    } finally {
      setGuardando(false);
      setEtapaGuardado("");
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
          Cargando reseña...
        </p>
      </main>
    );
  }

  if (guardado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
        <section className="max-w-xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.45em] text-red-600">
            Kint 3D
          </p>

          <h1 className="text-4xl font-black uppercase tracking-[0.2em]">
            Cambios guardados
          </h1>

          <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

          <p className="text-sm leading-8 text-[var(--text-muted)]">
            Tu reseña fue actualizada correctamente.
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

          <button
            type="button"
            onClick={() => setGuardado(false)}
            className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] transition hover:text-red-600"
          >
            Seguir editando
          </button>
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

        <h1 className="text-4xl font-black uppercase tracking-[0.2em] sm:text-5xl">
          Editar reseña
        </h1>

        <div className="mx-auto my-8 h-[2px] w-20 bg-red-600" />

        <p className="mb-3 text-sm uppercase leading-8 tracking-[0.25em] text-[var(--text-muted)]">
          Pedido {pedido}
        </p>

        {nombre && (
          <p className="mb-8 text-sm text-[var(--text-muted)]">
            Reseña de {nombre}
          </p>
        )}

        {!error && (
          <div className="mb-10 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-4 text-left">
            <p className="text-sm font-bold text-[var(--text-main)]">
              Tiempo disponible para editar
            </p>

            <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
              Te quedan aproximadamente {horasRestantes} horas.
              {fechaLimiteFormateada
                ? ` El plazo finaliza el ${fechaLimiteFormateada}.`
                : ""}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-xl border border-red-600/30 bg-red-600/5 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {!error && (
          <>
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

            <div className="mt-10 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-left">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-main)]">
                    Fotos del proyecto
                  </p>

                  <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                    Conservá, eliminá o agregá fotos. Máximo 3 imágenes.
                  </p>
                </div>

                <label
                  className={[
                    "inline-flex cursor-pointer items-center justify-center border px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition",
                    totalFotos >= MAXIMO_FOTOS
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
                    disabled={totalFotos >= MAXIMO_FOTOS}
                  />
                </label>
              </div>

              {(fotosExistentes.length > 0 ||
                vistasPreviasNuevas.length > 0) && (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {fotosExistentes.map((foto, indice) => (
                    <div
                      key={`${foto}-${indice}`}
                      className="relative overflow-hidden rounded-xl border border-[var(--border-color)]"
                    >
                      <img
                        src={obtenerSrcFoto(foto)}
                        alt={`Foto actual ${indice + 1}`}
                        className="aspect-square w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          quitarFotoExistente(indice)
                        }
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg text-white transition hover:bg-red-600"
                        aria-label={`Quitar foto actual ${
                          indice + 1
                        }`}
                      >
                        ×
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
                        <p className="truncate text-[10px] text-white">
                          Foto actual
                        </p>
                      </div>
                    </div>
                  ))}

                  {vistasPreviasNuevas.map(
                    (vista, indice) => (
                      <div
                        key={`${vista.archivo.name}-${indice}`}
                        className="relative overflow-hidden rounded-xl border border-[var(--border-color)]"
                      >
                        <img
                          src={vista.url}
                          alt={`Nueva foto ${indice + 1}`}
                          className="aspect-square w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            quitarFotoNueva(indice)
                          }
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg text-white transition hover:bg-red-600"
                          aria-label={`Quitar ${vista.archivo.name}`}
                        >
                          ×
                        </button>

                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
                          <p className="truncate text-[10px] text-white">
                            Nueva · {vista.archivo.name}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                {totalFotos} de {MAXIMO_FOTOS} imágenes
              </p>
            </div>

            <div className="mt-8 text-left">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={mostrarProyecto}
                  onChange={(evento) =>
                    setMostrarProyecto(
                      evento.target.checked
                    )
                  }
                  className="mt-1"
                />

                <span>
                  Autorizo que mi proyecto y las imágenes puedan
                  aparecer junto a la reseña.
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
              onClick={guardarCambios}
              disabled={guardando}
              className="mt-10 w-full border border-red-600 bg-red-600 px-10 py-5 text-sm font-bold uppercase tracking-[0.35em] text-white transition hover:bg-transparent hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? etapaGuardado || "Guardando..."
                : "Guardar cambios"}
            </button>

            <Link
              href={`/?resena=${encodeURIComponent(
                pedido
              )}#resenas`}
              className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] transition hover:text-red-600"
            >
              Cancelar y volver
            </Link>
          </>
        )}

        {error && (
          <Link
            href="/"
            className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] transition hover:text-red-600"
          >
            Volver al inicio
          </Link>
        )}
      </section>
    </main>
  );
}

export default function EditarResenaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditarResenaContent />
    </Suspense>
  );
}