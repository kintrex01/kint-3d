"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LoaderCircle, Package, ShoppingBag } from "lucide-react";

/*
 * Con la sesión de Mi cuenta abierta, el seguimiento muestra tus pedidos:
 * un toque y entrás, sin escribir número ni correo.
 */

const CLAVE_SESION = "kint-cuenta-sesion-v1";

type PedidoCuenta = {
  tipo: "maqueta" | "tienda";
  pedido: string;
  fecha: string;
  estado: string;
  link: string;
  detalle?: string;
};

function terminado(estado: string) {
  return /entregad|cancelad|❌/i.test(estado);
}

export default function MisPedidosSesion() {
  const [pedidos, setPedidos] = useState<PedidoCuenta[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    let sesion: { email?: string; token?: string } | null = null;
    try {
      sesion = JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
    } catch {
      sesion = null;
    }
    if (!sesion?.email || !sesion?.token) return;

    let activo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    fetch("/api/cuenta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "cuenta_datos", email: sesion.email, token: sesion.token }),
    })
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !data?.ok) return;
        setNombre(String(data.cuenta?.alias || data.cuenta?.nombre || "").split(" ")[0]);
        setPedidos(((data.cuenta?.pedidos || []) as PedidoCuenta[]).filter((pedido) => pedido.link));
      })
      .catch(() => undefined)
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <p className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)]">
        <LoaderCircle size={14} className="animate-spin" />
        Buscando tus pedidos…
      </p>
    );
  }
  if (!pedidos || pedidos.length === 0) return null;

  // Los que están en curso primero.
  const ordenados = [...pedidos].sort((a, b) => Number(terminado(a.estado)) - Number(terminado(b.estado)));
  const activos = ordenados.filter((pedido) => !terminado(pedido.estado));
  const lista = verTodos ? ordenados : activos.length ? activos : ordenados.slice(0, 3);

  return (
    <div className="mt-10 w-full max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 text-left shadow-[var(--shadow-soft)]">
      <p className="text-sm font-black">
        {nombre ? `Hola ${nombre}, ` : ""}
        {activos.length ? "estos son tus pedidos en curso" : "estos son tus últimos pedidos"}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">Tocá uno y entrás directo, sin escribir nada.</p>
      <ul className="mt-3 space-y-1.5">
        {lista.map((pedido) => {
          const Icono = pedido.tipo === "tienda" ? ShoppingBag : Package;
          return (
            <li key={pedido.pedido}>
              <Link
                href={pedido.link}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-red-600"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-600">
                  <Icono size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-black">{pedido.pedido}</span>
                  <span className="block truncate text-[11px] text-[var(--text-muted)]">
                    {pedido.estado || "Recibido"}
                    {pedido.detalle ? ` · ${pedido.detalle}` : ""}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />
              </Link>
            </li>
          );
        })}
      </ul>
      {ordenados.length > lista.length && (
        <button
          type="button"
          onClick={() => setVerTodos(true)}
          className="mt-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          Ver todos ({ordenados.length})
        </button>
      )}
    </div>
  );
}
