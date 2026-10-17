"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";

/*
 * Cotizar: "¿Le sumás algo?" — productos de la tienda que se imprimen
 * junto con la maqueta y se cobran en el mismo pago (ExtrasPresupuesto
 * en Apps Script). Los personalizables se arman en la tienda.
 */

export type ExtraElegido = { producto: string; cadena: string; cantidad: number };

type Producto = {
  nombre: string;
  precio: number;
  foto: string;
  cadenas: string[];
  personalizable: boolean;
};

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

export default function SumarProductosCotizar({
  elegidos,
  onCambiar,
}: {
  elegidos: ExtraElegido[];
  onCambiar: (extras: ExtraElegido[]) => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cadenas, setCadenas] = useState<Record<string, string>>({});

  useEffect(() => {
    let activo = true;
    fetch("/api/tienda/productos")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !Array.isArray(data?.productos)) return;
        setProductos(
          (data.productos as Producto[]).filter((producto) => !producto.personalizable && producto.precio > 0)
        );
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  if (!productos.length) return null;

  const total = elegidos.reduce(
    (suma, extra) => suma + extra.cantidad * (productos.find((p) => p.nombre === extra.producto)?.precio || 0),
    0
  );
  const unidades = elegidos.reduce((suma, extra) => suma + extra.cantidad, 0);

  function cambiar(producto: string, cadena: string, cantidad: number) {
    const resto = elegidos.filter((extra) => !(extra.producto === producto && extra.cadena === cadena));
    onCambiar(cantidad > 0 ? [...resto, { producto, cadena, cantidad: Math.min(10, cantidad) }] : resto);
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--kint-input-bg)]">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-600">
          <ShoppingBag size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[var(--text-main)]">¿Le sumás llaveros o regalos?</span>
          <span className="block text-sm text-[var(--text-muted)]">
            {unidades
              ? `${unidades} ${unidades === 1 ? "producto" : "productos"} · ${pesos(total)}, se cobran junto con la maqueta`
              : "Los imprimimos con tu maqueta y te llegan juntos. Opcional."}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-bold text-[var(--text-main)]">
          {abierto ? "Cerrar" : unidades ? "Cambiar" : "Ver"}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-[var(--border-color)] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {productos.map((producto) => {
              const cadena = producto.cadenas.length ? cadenas[producto.nombre] || "" : "";
              const cantidad =
                elegidos.find((extra) => extra.producto === producto.nombre && extra.cadena === cadena)?.cantidad || 0;
              const totalProducto = elegidos
                .filter((extra) => extra.producto === producto.nombre)
                .reduce((suma, extra) => suma + extra.cantidad, 0);
              const faltaCadena = producto.cadenas.length > 0 && !cadena;
              return (
                <div
                  key={producto.nombre}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-[var(--card-bg)] transition ${
                    totalProducto ? "border-emerald-500/60 ring-2 ring-emerald-500/20" : "border-[var(--border-color)]"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-white/5">
                    {totalProducto > 0 && (
                      <span className="absolute left-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-black text-white">
                        <Check size={12} className="mr-0.5" />
                        {totalProducto}
                      </span>
                    )}
                    {producto.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={producto.foto} alt={producto.nombre} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="truncate text-sm font-bold text-[var(--text-main)]">{producto.nombre}</p>
                    <p className="text-sm font-black text-red-600">{pesos(producto.precio)}</p>
                    {producto.cadenas.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {producto.cadenas.map((opcion) => (
                          <button
                            key={opcion}
                            type="button"
                            aria-pressed={cadena === opcion}
                            onClick={() => setCadenas((actual) => ({ ...actual, [producto.nombre]: opcion }))}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                              cadena === opcion
                                ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
                                : "border-[var(--border-color)] text-[var(--text-muted)]"
                            }`}
                          >
                            {opcion}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-2">
                      {cantidad > 0 ? (
                        <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)]">
                          <button type="button" onClick={() => cambiar(producto.nombre, cadena, cantidad - 1)} aria-label="Uno menos" className="flex h-8 w-8 items-center justify-center">
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-black">{cantidad}</span>
                          <button type="button" onClick={() => cambiar(producto.nombre, cadena, cantidad + 1)} aria-label="Uno más" disabled={cantidad >= 10} className="flex h-8 w-8 items-center justify-center disabled:opacity-40">
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={faltaCadena || (elegidos.length >= 10 && !cantidad)}
                          onClick={() => cambiar(producto.nombre, cadena, 1)}
                          className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-red-600 text-[11px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={13} />
                          {faltaCadena ? "Elegí cadena" : "Sumar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/tienda"
            target="_blank"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
          >
            Ver fotos y detalles en la tienda
            <ArrowRight size={13} />
          </Link>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Los llaveros con nombre se arman en la tienda. Podés cambiar esto después, desde el seguimiento, hasta que pagues.
          </p>
        </div>
      )}
    </div>
  );
}
