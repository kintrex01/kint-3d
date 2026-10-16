"use client";

import { useState } from "react";
import { ImageIcon, MessageSquareHeart, RefreshCw, Star, Trash2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ResenaAdmin } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Chip,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Interruptor,
  Segmentos,
  Tarjeta,
  Vacio,
  fechaHora,
  useAvisos,
} from "@/components/admin/ui";

type Filtro = "pendientes" | "publicadas" | "todas";
type Cambios = { aprobada?: boolean; mostrarProyecto?: boolean };

function cumpleFiltro(resena: ResenaAdmin, filtro: Filtro) {
  if (filtro === "pendientes") return !resena.aprobada;
  if (filtro === "publicadas") return resena.aprobada;
  return true;
}

/*
 * Las fotos que suben los clientes están en Supabase (link directo);
 * las viejas, en Drive (pasan por /api/imagen-drive).
 */
function srcFoto(link: string) {
  if (/drive\.google\.com|docs\.google\.com/.test(link)) {
    const id = /[-\w]{25,}/.exec(link)?.[0];
    return id ? `/api/imagen-drive?id=${encodeURIComponent(id)}` : "";
  }
  return /^https?:\/\//.test(link) ? link : "";
}

export default function ResenasAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_resenas_listar", {});
  const avisar = useAvisos();

  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [optimistas, setOptimistas] = useState<Record<string, Cambios>>({});
  /* Reseñas que se movieron de filtro: quedan a la vista hasta cambiar de pestaña. */
  const [fijadas, setFijadas] = useState<Set<string>>(() => new Set());
  const [porBorrar, setPorBorrar] = useState<ResenaAdmin | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    if (!porBorrar) return;
    setBorrando(true);
    try {
      await accionAdmin("admin_resena_borrar", { id: porBorrar.id });
      setDatos((actual) =>
        actual
          ? { resenas: actual.resenas.filter((item) => item.id !== porBorrar.id) }
          : actual
      );
      avisar("Reseña borrada");
      setPorBorrar(null);
    } catch (errorBorrado) {
      avisar(
        errorBorrado instanceof Error ? errorBorrado.message : "No se pudo borrar.",
        "error"
      );
    } finally {
      setBorrando(false);
    }
  }

  const resenas = (datos?.resenas ?? []).map((resena) => ({
    ...resena,
    ...optimistas[resena.id],
  }));

  const visibles = resenas.filter(
    (resena) => cumpleFiltro(resena, filtro) || fijadas.has(resena.id)
  );

  const cantidades = {
    pendientes: resenas.filter((resena) => !resena.aprobada).length,
    publicadas: resenas.filter((resena) => resena.aprobada).length,
    todas: resenas.length,
  };

  async function moderar(resena: ResenaAdmin, cambios: Cambios) {
    setFijadas((actuales) => new Set(actuales).add(resena.id));
    setOptimistas((actuales) => ({
      ...actuales,
      [resena.id]: { ...actuales[resena.id], ...cambios },
    }));

    try {
      const respuesta = await accionAdmin("admin_resena_moderar", {
        id: resena.id,
        ...cambios,
      });
      setDatos((actual) =>
        actual
          ? {
              resenas: actual.resenas.map((item) =>
                item.id === resena.id ? respuesta.resena : item
              ),
            }
          : actual
      );
      if (cambios.aprobada !== undefined) {
        avisar(cambios.aprobada ? "Reseña publicada" : "Reseña oculta");
      } else {
        avisar(
          cambios.mostrarProyecto
            ? "Fotos del proyecto visibles"
            : "Fotos del proyecto ocultas"
        );
      }
    } catch (errorGuardado) {
      avisar(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar.",
        "error"
      );
    } finally {
      setOptimistas((actuales) => {
        const resto = { ...actuales };
        delete resto[resena.id];
        return resto;
      });
    }
  }

  return (
    <>
      <Encabezado
        titulo="Reseñas"
        subtitulo="Elegí qué opiniones se ven en la web."
        accion={
          datos && (
            <Boton
              variante="fantasma"
              tamano="chico"
              onClick={recargar}
              cargando={recargando}
              icono={<RefreshCw size={15} />}
              aria-label="Actualizar"
              className="h-11 w-11 px-0"
            />
          )
        }
      />

      {cargando && <Esqueleto filas={4} />}

      {!cargando && error && !datos && (
        <CajaError mensaje={error} onReintentar={recargar} />
      )}

      {datos && (
        <>
          <Segmentos<Filtro>
            valor={filtro}
            onCambiar={(valor) => {
              setFiltro(valor);
              setFijadas(new Set());
            }}
            opciones={[
              {
                valor: "pendientes",
                texto: "Pendientes",
                cantidad: cantidades.pendientes,
              },
              {
                valor: "publicadas",
                texto: "Publicadas",
                cantidad: cantidades.publicadas,
              },
              { valor: "todas", texto: "Todas", cantidad: cantidades.todas },
            ]}
          />

          {visibles.length === 0 ? (
            <Vacio
              icono={<MessageSquareHeart size={30} strokeWidth={1.5} />}
              titulo={
                filtro === "pendientes"
                  ? "Estás al día"
                  : filtro === "publicadas"
                  ? "Todavía no publicaste reseñas"
                  : "Todavía no hay reseñas"
              }
              texto={
                filtro === "pendientes"
                  ? "No hay reseñas esperando tu aprobación."
                  : filtro === "publicadas" && cantidades.todas > 0
                  ? "Prendé «Publicada» en una reseña pendiente para mostrarla en la web."
                  : "Cuando los clientes opinen sobre sus pedidos, van a aparecer acá."
              }
            />
          ) : (
            <div className="space-y-3">
              {visibles.map((resena) => (
                <TarjetaResena
                  key={resena.id}
                  resena={resena}
                  guardando={Boolean(optimistas[resena.id])}
                  onModerar={(cambios) => void moderar(resena, cambios)}
                  onBorrar={() => setPorBorrar(resena)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <DialogoConfirmar
        abierto={Boolean(porBorrar)}
        titulo="Borrar reseña"
        peligro
        cargando={borrando}
        textoConfirmar="Sí, borrar"
        mensaje={
          <p>
            Se borra la reseña de <strong>{porBorrar?.nombre || "este cliente"}</strong>
            {porBorrar?.pedido ? ` (${porBorrar.pedido})` : ""} de la hoja y de la
            web. El cliente va a poder dejar otra con el mismo link. No se puede
            deshacer.
          </p>
        }
        onConfirmar={() => void borrar()}
        onCancelar={() => setPorBorrar(null)}
      />
    </>
  );
}

function TarjetaResena({
  resena,
  guardando,
  onModerar,
  onBorrar,
}: {
  resena: ResenaAdmin;
  guardando: boolean;
  onModerar: (cambios: Cambios) => void;
  onBorrar: () => void;
}) {
  const estrellas = Math.max(0, Math.min(5, Math.round(resena.estrellas)));
  const fotos = (resena.fotos ?? [])
    .map((link) => ({ link, src: srcFoto(link) }))
    .filter((foto) => foto.src);

  return (
    <Tarjeta className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="flex items-center gap-0.5"
              role="img"
              aria-label={`${estrellas} de 5 estrellas`}
            >
              {Array.from({ length: 5 }, (_, indice) => (
                <Star
                  key={indice}
                  size={16}
                  className={
                    indice < estrellas
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-400/50"
                  }
                />
              ))}
            </div>
            <p className="mt-1.5 truncate font-black">
              {resena.nombre || "Sin nombre"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {fechaHora(resena.fecha)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {resena.pedido && <Chip tono="azul">{resena.pedido}</Chip>}
            {resena.aprobada ? (
              <Chip tono="verde">Publicada</Chip>
            ) : (
              <Chip tono="ambar">Pendiente</Chip>
            )}
          </div>
        </div>

        {resena.comentario ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6">
            {resena.comentario}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-[var(--text-muted)]">
            Sin comentario.
          </p>
        )}

        {fotos.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
              <ImageIcon size={13} />
              {fotos.length === 1 ? "Subió 1 foto" : `Subió ${fotos.length} fotos`} · tocá para verla
            </p>
            <div className="flex flex-wrap gap-2">
              {fotos.map((foto) => (
                <Miniatura key={foto.link} link={foto.link} src={foto.src} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-[var(--kint-panel-border)] border-t border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)]/50">
        <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <span className="text-sm font-bold">Publicada</span>
          <Interruptor
            etiqueta="Publicada"
            activo={resena.aprobada}
            deshabilitado={guardando}
            onCambiar={(activo) => onModerar({ aprobada: activo })}
          />
        </label>
        <label className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <span className="min-w-0">
            <span className="block text-sm font-bold">
              Mostrar fotos del proyecto
            </span>
            <span className="block text-xs text-[var(--text-muted)]">
              Las fotos del pedido aparecen junto a la reseña
            </span>
          </span>
          <Interruptor
            etiqueta="Mostrar fotos del proyecto"
            activo={resena.mostrarProyecto}
            deshabilitado={guardando}
            onCambiar={(activo) => onModerar({ mostrarProyecto: activo })}
          />
        </label>
        <button
          type="button"
          onClick={onBorrar}
          disabled={guardando}
          className="flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm font-bold text-red-600 transition hover:bg-red-600/10 disabled:opacity-50 dark:text-red-400"
        >
          <Trash2 size={15} />
          Borrar reseña
        </button>
      </div>
    </Tarjeta>
  );
}

function Miniatura({ link, src }: { link: string; src: string }) {
  const [fallo, setFallo] = useState(false);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver foto completa"
      className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
    >
      {fallo ? (
        // No se pudo mostrar: el link igual abre la foto.
        <ImageIcon size={22} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Foto de la reseña"
          loading="lazy"
          onError={() => setFallo(true)}
          className="h-full w-full object-cover"
        />
      )}
    </a>
  );
}
