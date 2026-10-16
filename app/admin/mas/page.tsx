"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { ENLACES_ADMIN, cerrarSesionAdmin } from "@/components/admin/ShellAdmin";
import { Encabezado, Tarjeta } from "@/components/admin/ui";

const DESCRIPCIONES: Record<string, string> = {
  "/admin/todos": "Maquetas y tienda juntos; borrar pedidos de prueba",
  "/admin/caja": "Ingresos, gastos y cuánta plata hay",
  "/admin/calculadora": "Costo real de una impresión y presupuesto a un pedido",
  "/admin/productos": "Precios, por mayor, cadenas, fotos y activos",
  "/admin/resenas": "Aprobar y ocultar reseñas",
  "/admin/clientes": "Buscar clientes, puntos y bloqueos",
  "/admin/configuracion": "Pedidos, servicios, tienda y promociones",
};

export default function MasAdmin() {
  const extra = ENLACES_ADMIN.filter((enlace) => !enlace.enBarra);

  return (
    <>
      <Encabezado titulo="Más" />

      <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
        {extra.map((enlace) => {
          const Icono = enlace.icono;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="flex items-center gap-4 px-4 py-4 transition hover:bg-[var(--kint-panel-soft)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--blue-main)] dark:text-[var(--blue-soft)]">
                <Icono size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{enlace.texto}</span>
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {DESCRIPCIONES[enlace.href]}
                </span>
              </span>
              <ChevronRight size={18} className="text-[var(--text-muted)]" />
            </Link>
          );
        })}
      </Tarjeta>

      <Tarjeta className="mt-4 divide-y divide-[var(--kint-panel-border)]">
        <Link
          href="/"
          className="flex items-center gap-4 px-4 py-4 transition hover:bg-[var(--kint-panel-soft)]"
        >
          <ExternalLink size={18} className="text-[var(--text-muted)]" />
          <span className="flex-1 font-bold">Ver la web</span>
        </Link>
        <button
          type="button"
          onClick={cerrarSesionAdmin}
          className="flex w-full items-center gap-4 px-4 py-4 text-left text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
        >
          <LogOut size={18} />
          <span className="flex-1 font-bold">Cerrar sesión</span>
        </button>
      </Tarjeta>
    </>
  );
}
