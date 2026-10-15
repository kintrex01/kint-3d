/*
 * Llamadas del panel (navegador) a /api/admin/accion, tipadas con
 * el contrato de lib/admin-tipos.ts.
 */

import { useCallback, useEffect, useState } from "react";
import type { AccionesAdmin, TipoAccionAdmin } from "@/lib/admin-tipos";

type Pedido<T extends TipoAccionAdmin> = AccionesAdmin[T]["pedido"];
type Respuesta<T extends TipoAccionAdmin> = AccionesAdmin[T]["respuesta"];

export async function accionAdmin<T extends TipoAccionAdmin>(
  tipo: T,
  datos: Pedido<T>
): Promise<Respuesta<T>> {
  let response: Response;

  try {
    response = await fetch("/api/admin/accion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datos, tipo }),
      cache: "no-store",
    });
  } catch {
    throw new Error("Sin conexión. Revisá internet e intentá de nuevo.");
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || data?.sesion === false) {
    const volver = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/admin/login?volver=${volver}`;
    throw new Error("Tu sesión venció. Volvé a entrar.");
  }

  if (!data?.ok) {
    throw new Error(
      String(data?.error || "No se pudo completar la acción.")
    );
  }

  return data as Respuesta<T>;
}

/*
 * Carga datos al montar y permite recargar.
 * `clave` cambia cuando cambian los datos pedidos (ej. el número de pedido).
 */
export function useDatosAdmin<T extends TipoAccionAdmin>(
  tipo: T,
  datos: Pedido<T>,
  clave = ""
) {
  const [resultado, setResultado] = useState<Respuesta<T> | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  useEffect(() => {
    let activo = true;

    accionAdmin(tipo, datos)
      .then((respuesta) => {
        if (!activo) return;
        setResultado(respuesta);
        setError("");
      })
      .catch((errorCarga: unknown) => {
        if (!activo) return;
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se pudo cargar."
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
    // datos se representa con `clave` para no recargar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, clave, version]);

  return {
    datos: resultado,
    setDatos: setResultado,
    error,
    cargando: cargando && !resultado,
    recargando: cargando && Boolean(resultado),
    recargar: () => {
      setCargando(true);
      recargar();
    },
  };
}
