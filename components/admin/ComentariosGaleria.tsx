"use client";

import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { useState } from "react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import { Chip, Esqueleto, Tarjeta, fechaHora, useAvisos } from "@/components/admin/ui";

/*
 * Comentarios que deja la gente en la galería (/galeria): se publican al
 * toque; acá se ocultan (o se vuelven a mostrar). Panel › Reseñas.
 */
export default function ComentariosGaleria() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_galeria_comentarios_listar", {});
  const avisar = useAvisos();
  const [guardando, setGuardando] = useState(0);
  const comentarios = datos?.comentarios ?? [];

  async function cambiar(id: number, visible: boolean) {
    setGuardando(id);
    try {
      setDatos(await accionAdmin("admin_galeria_comentario_ocultar", { id, visible }));
      avisar(visible ? "Comentario visible otra vez" : "Comentario oculto");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(0);
    }
  }

  return (
    <Tarjeta className="mt-6 p-4">
      <p className="flex items-center gap-2 text-lg font-black">
        <MessageCircle size={18} />
        Comentarios de la galería
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        Se publican solos (sin links, hasta 5 por hora por persona). Ocultá los que no van.
      </p>
      {cargando && !datos ? (
        <div className="mt-3">
          <Esqueleto filas={2} />
        </div>
      ) : comentarios.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Todavía nadie comentó.</p>
      ) : (
        <ul className="mt-3 max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
          {comentarios.map((comentario) => (
            <li key={comentario.id} className={`flex items-start gap-2 rounded-xl border border-[var(--kint-panel-border)] px-3 py-2 ${comentario.visible ? "" : "opacity-55"}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-black">{comentario.nombre}</span>
                  <Chip tono="azul">{comentario.pedido}</Chip>
                  {!comentario.visible && <Chip tono="gris">Oculto</Chip>}
                  <span className="text-[var(--text-muted)]">{fechaHora(comentario.fecha)}</span>
                </p>
                <p className="mt-0.5 text-sm">{comentario.texto}</p>
              </div>
              <button
                type="button"
                disabled={guardando === comentario.id}
                onClick={() => void cambiar(comentario.id, !comentario.visible)}
                aria-label={comentario.visible ? "Ocultar" : "Mostrar"}
                title={comentario.visible ? "Ocultar" : "Mostrar"}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40"
              >
                {comentario.visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
