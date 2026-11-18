"use client";

import { useEffect, useState } from "react";

/*
 * En el formulario de reseña: cuántos Puntos Kint gana por dejarla y por
 * subir foto (Configuración › Puntos). No se muestra si no da puntos.
 */
export default function PuntosPorResena() {
  const [puntos, setPuntos] = useState<{ resena: number; foto: number } | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !data?.ok) return;
        const config = data.configuracion || {};
        if (!/^habilitad/i.test(String(config.puntos?.valor || ""))) return;
        const numero = (clave: string) => Math.max(0, Math.round(Number(config[clave]?.valor) || 0));
        setPuntos({ resena: numero("puntos_resena"), foto: numero("puntos_resena_foto") });
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  if (!puntos || (!puntos.resena && !puntos.foto)) return null;

  return (
    <div className="mx-auto mb-10 flex max-w-md items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-left">
      <span className="text-2xl" aria-hidden="true">🎁</span>
      <p className="text-sm leading-6 text-[var(--text-main)]">
        {puntos.resena > 0 && (
          <>
            Ganás <strong>{puntos.resena} Puntos Kint</strong> por tu reseña
          </>
        )}
        {puntos.resena > 0 && puntos.foto > 0 && " y "}
        {puntos.foto > 0 && (
          <>
            {puntos.resena > 0 ? "" : "Ganás "}
            <strong>{puntos.foto} más</strong> si subís una foto
          </>
        )}
        . Se suman solos a tu cuenta.
      </p>
    </div>
  );
}
