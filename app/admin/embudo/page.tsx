"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Boton, CajaError, Encabezado, Esqueleto, Segmentos, Tarjeta } from "@/components/admin/ui";

/*
 * Embudo de Cotizar: de cada 100 que entran, cuántos llegan a cada paso.
 * Datos anónimos (lib/embudo.ts → /api/embudo → Supabase).
 */

type Paso = { paso: string; visitas: number };

const NOMBRES: Record<string, { titulo: string; detalle: string }> = {
  entro: { titulo: "Entraron a Cotizar", detalle: "Abrieron el formulario" },
  correo: { titulo: "Pusieron el correo", detalle: "Empezaron a completar" },
  archivo: { titulo: "Subieron el archivo", detalle: "O marcaron que lo mandan por WhatsApp" },
  completo: { titulo: "Completaron todo", detalle: "El botón Enviar quedó habilitado" },
  envio: { titulo: "Enviaron el pedido", detalle: "Te llegó el pedido" },
};

type Periodo = "7" | "30" | "90";

export default function EmbudoAdmin() {
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [pasos, setPasos] = useState<Paso[] | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/embudo?dias=${periodo}`, { cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        if (cancelado) return;
        if (!datos.ok) throw new Error(datos.error || "No se pudo leer el embudo.");
        setPasos(datos.pasos);
        setError("");
      })
      .catch((problema) => {
        if (!cancelado) setError(problema instanceof Error ? problema.message : "No se pudo leer el embudo.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [periodo, version]);

  function recargar() {
    setCargando(true);
    setVersion((actual) => actual + 1);
  }

  const base = pasos?.[0]?.visitas || 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Embudo de Cotizar"
        subtitulo="Hasta dónde llega la gente que entra a cotizar (anónimo)"
        accion={
          <Boton variante="fantasma" onClick={recargar} cargando={cargando} icono={<RefreshCw size={16} />} aria-label="Actualizar" className="w-11 px-0" />
        }
      />

      <Segmentos<Periodo>
        valor={periodo}
        onCambiar={(valor) => {
          setCargando(true);
          setPeriodo(valor);
        }}
        opciones={[
          { valor: "7", texto: "7 días" },
          { valor: "30", texto: "30 días" },
          { valor: "90", texto: "90 días" },
        ]}
      />

      {cargando && !pasos ? (
        <Esqueleto filas={5} />
      ) : error && !pasos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : !base ? (
        <Tarjeta className="p-5 text-sm text-[var(--text-muted)]">
          Todavía no hay visitas registradas en este período. Se empieza a contar desde hoy.
        </Tarjeta>
      ) : (
        <Tarjeta className="space-y-4 p-5">
          {pasos!.map((paso, indice) => {
            const nombre = NOMBRES[paso.paso] || { titulo: paso.paso, detalle: "" };
            const porcentaje = Math.round((paso.visitas / base) * 100);
            const anterior = indice > 0 ? pasos![indice - 1].visitas : 0;
            const seVan = anterior > 0 ? Math.max(0, Math.round(((anterior - paso.visitas) / anterior) * 100)) : 0;
            return (
              <div key={paso.paso}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-black">{nombre.titulo}</p>
                  <p className="shrink-0 text-sm font-black tabular-nums">
                    {paso.visitas} <span className="text-xs font-bold text-[var(--text-muted)]">· {porcentaje}%</span>
                  </p>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--kint-panel-soft)]">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(2, porcentaje)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {nombre.detalle}
                  {indice > 0 && seVan > 0 && (
                    <span className={seVan >= 40 ? "font-bold text-red-600 dark:text-red-400" : ""}>
                      {" "}· se van {seVan}% en este paso
                    </span>
                  )}
                </p>
              </div>
            );
          })}
          <p className="border-t border-[var(--kint-panel-border)] pt-3 text-[11px] leading-5 text-[var(--text-muted)]">
            En rojo, los pasos donde se va mucha gente: ahí conviene simplificar. Cada visita se cuenta una vez por
            paso; no se guarda ni el correo ni el nombre.
          </p>
        </Tarjeta>
      )}
    </div>
  );
}
