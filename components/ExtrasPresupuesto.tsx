"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, KeyRound, LoaderCircle, Minus, Plus, ShoppingBag, X } from "lucide-react";

/*
 * "¿Sumás un llavero?": productos de la tienda a precio de oferta para
 * quien encarga una maqueta. Aparece después de elegir la opción del
 * presupuesto y antes de pagar. Los precios los calcula Apps Script
 * (ExtrasPresupuesto_Kint3D.js) y se suman al total del pedido.
 */

type ProductoOferta = {
  nombre: string;
  precio: number;
  precioOferta: number;
  foto: string;
  cadenas: string[];
  coloresDefecto: string[];
};

type Extra = {
  producto: string;
  cadena: string;
  colores: string;
  cantidad: number;
  precio: number;
  subtotal: number;
};

type Respuesta = {
  ok: boolean;
  error?: string;
  editable: boolean;
  motivo?: string;
  productos: ProductoOferta[];
  extras: Extra[];
  total: number;
};

const MAX_CANTIDAD = 10;
const MAX_LINEAS = 10;

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

async function pedir(cuerpo: object): Promise<Respuesta> {
  const response = await fetch("/api/extras-presupuesto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = await response.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error || "No pudimos cargar los extras.");
  return data as Respuesta;
}

export default function ExtrasPresupuesto({
  pedido,
  codigo,
  onCambio,
}: {
  pedido: string;
  codigo: string;
  /* Se llama después de guardar (el total del pedido cambió). */
  onCambio: () => void;
}) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const [cadenas, setCadenas] = useState<Record<string, string>>({});

  useEffect(() => {
    let activo = true;
    pedir({ pedido, codigo })
      .then((respuesta) => {
        if (activo) setDatos(respuesta);
      })
      .catch(() => {
        // Sin extras disponibles: la sección simplemente no aparece.
        if (activo) setDatos(null);
      });
    return () => {
      activo = false;
    };
  }, [pedido, codigo]);

  // Nada que ofrecer ni nada elegido: no se muestra.
  if (!datos || (!datos.productos.length && !datos.extras.length)) return null;

  async function guardar(extras: { producto: string; cadena: string; cantidad: number }[], clave: string) {
    setGuardando(clave);
    setError("");
    try {
      const respuesta = await pedir({ pedido, codigo, items: extras });
      setDatos(respuesta);
      onCambio();
    } catch (errorGuardado: unknown) {
      setError(
        errorGuardado instanceof Error ? errorGuardado.message : "No se pudo guardar."
      );
    } finally {
      setGuardando("");
    }
  }

  const actuales = datos.extras.map((extra) => ({
    producto: extra.producto,
    cadena: extra.cadena,
    cantidad: extra.cantidad,
  }));

  function cambiarCantidad(producto: string, cadena: string, cantidad: number) {
    const resto = actuales.filter(
      (extra) => !(extra.producto === producto && extra.cadena === cadena)
    );
    const nuevos =
      cantidad > 0 ? [...resto, { producto, cadena, cantidad }] : resto;
    void guardar(nuevos, `${producto}::${cadena}`);
  }

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-red-600">
            <ShoppingBag size={15} />
            Sumalo a tu pedido
          </p>
          <p className="mt-2 text-xl font-black text-[var(--text-main)]">¿Le agregás algo más?</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Llaveros y regalos que imprimimos junto con tu maqueta. Se suman al mismo pago y te llegan juntos.
          </p>
        </div>
        <Link
          href="/tienda"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
        >
          Ver más en la tienda
          <ArrowRight size={14} />
        </Link>
      </div>

      {datos.motivo && (
        <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          {datos.motivo}
        </p>
      )}

      {datos.extras.length > 0 && (
        <ul className="mt-4 space-y-2">
          {datos.extras.map((extra) => {
            const clave = `${extra.producto}::${extra.cadena}`;
            return (
              <li
                key={clave}
                className="flex items-center gap-3 rounded-xl border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm"
              >
                <Check size={16} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1">
                  <strong>
                    {extra.cantidad} × {extra.producto}
                  </strong>
                  {extra.cadena && (
                    <span className="block text-xs text-[var(--text-muted)]">
                      Cadena {extra.cadena}
                      {extra.colores ? ` · ${extra.colores}` : ""}
                    </span>
                  )}
                </span>
                <span className="font-black">{pesos(extra.subtotal)}</span>
                {datos.editable && (
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(extra.producto, extra.cadena, 0)}
                    disabled={Boolean(guardando)}
                    aria-label={`Quitar ${extra.producto}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:text-red-600 disabled:opacity-40"
                  >
                    {guardando === clave ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <X size={15} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {datos.editable && datos.productos.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {datos.productos.map((producto) => {
            const cadena = producto.cadenas.length
              ? cadenas[producto.nombre] || ""
              : "";
            const clave = `${producto.nombre}::${cadena}`;
            const elegido = actuales.find(
              (extra) => extra.producto === producto.nombre && extra.cadena === cadena
            );
            const cantidad = elegido?.cantidad || 0;
            const faltaCadena = producto.cadenas.length > 0 && !cadena;
            const lleno =
              !elegido && actuales.length >= MAX_LINEAS;

            return (
              <div
                key={producto.nombre}
                className={`flex flex-col overflow-hidden rounded-2xl border transition ${
                  cantidad > 0
                    ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
                    : "border-[var(--border-color)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                }`}
              >
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5">
                  {cantidad > 0 && (
                    <span className="absolute left-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-black text-white shadow">
                      {cantidad}
                    </span>
                  )}
                  {producto.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={producto.foto}
                      alt={producto.nombre}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <KeyRound size={26} className="text-[var(--text-muted)]" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <p className="truncate text-sm font-black">{producto.nombre}</p>
                  <p className="text-sm">
                    {producto.precioOferta < producto.precio && (
                      <span className="mr-1.5 text-xs text-[var(--text-muted)] line-through">
                        {pesos(producto.precio)}
                      </span>
                    )}
                    <span className="font-black text-red-600">
                      {pesos(producto.precioOferta)}
                    </span>
                  </p>

                  {producto.cadenas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {producto.cadenas.map((opcion) => (
                        <button
                          key={opcion}
                          type="button"
                          aria-pressed={cadena === opcion}
                          onClick={() =>
                            setCadenas((actual) => ({ ...actual, [producto.nombre]: opcion }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                            cadena === opcion
                              ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
                              : "border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--blue-main)]"
                          }`}
                        >
                          {opcion}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-2">
                    {cantidad > 0 ? (
                      <div className="flex items-center rounded-lg border border-[var(--border-color)]">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(producto.nombre, cadena, cantidad - 1)}
                          disabled={Boolean(guardando)}
                          aria-label="Uno menos"
                          className="flex h-8 w-8 items-center justify-center disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-black">
                          {guardando === clave ? (
                            <LoaderCircle size={14} className="mx-auto animate-spin" />
                          ) : (
                            cantidad
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(producto.nombre, cadena, cantidad + 1)}
                          disabled={Boolean(guardando) || cantidad >= MAX_CANTIDAD}
                          aria-label="Uno más"
                          className="flex h-8 w-8 items-center justify-center disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(producto.nombre, cadena, 1)}
                        disabled={Boolean(guardando) || faltaCadena || lleno}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {guardando === clave ? (
                          <LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Plus size={13} />
                        )}
                        {faltaCadena ? "Elegí la cadena" : "Agregar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {datos.total > 0 && (
        <p className="mt-4 text-sm font-bold text-[var(--text-main)]">
          Productos sumados: {pesos(datos.total)}. Ya están incluidos en el total a pagar.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
