"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type { ExtraPedido } from "@/lib/admin-tipos";
import { Boton, Tarjeta, claseInput, pesos, useAvisos } from "@/components/admin/ui";

/*
 * Productos de la tienda sumados a un pedido de maqueta. El dueño los
 * agrega o quita cuando quiera (ej. el cliente pidió algo por WhatsApp).
 * Se suman al precio en Pagos cuando el cliente ya eligió la opción.
 */

type ProductoTienda = { nombre: string; precio: number; cadenas: string[] };
type Linea = { producto: string; cadena: string; cantidad: number; precio: number };

export function ExtrasPedidoAdmin({
  pedido,
  extras,
  onGuardado,
}: {
  pedido: string;
  extras: ExtraPedido[];
  onGuardado: () => void;
}) {
  const avisar = useAvisos();
  const [productos, setProductos] = useState<ProductoTienda[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState({ producto: "", cadena: "", cantidad: "1", precio: "" });
  const [guardando, setGuardando] = useState(false);

  const actuales: Linea[] = extras.map((extra) => ({
    producto: extra.producto,
    cadena: extra.cadena,
    cantidad: extra.cantidad,
    precio: extra.precio,
  }));

  async function abrir() {
    setAbierto(true);
    if (productos) return;
    try {
      const respuesta = await accionAdmin("admin_extras_ver", { pedido });
      setProductos(respuesta.productos);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron cargar los productos.", "error");
    }
  }

  async function guardar(lineas: Linea[], mensaje: string) {
    setGuardando(true);
    try {
      await accionAdmin("admin_extras_guardar", { pedido, items: lineas });
      avisar(mensaje);
      onGuardado();
      return true;
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  const elegido = productos?.find((producto) => producto.nombre === nuevo.producto);

  return (
    <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
      {extras.length === 0 && (
        <p className="px-4 py-3 text-sm text-[var(--text-muted)]">Todavía no sumó productos de la tienda.</p>
      )}
      {extras.map((extra, indice) => (
        <div key={`${extra.producto}-${extra.cadena}-${indice}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="font-black">
              {extra.cantidad} × {extra.producto}
            </span>
            <span className="block text-xs text-[var(--text-muted)]">
              {[extra.cadena && `Cadena ${extra.cadena}`, extra.colores, `${pesos(extra.precio)} c/u`].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="font-black">{pesos(extra.subtotal)}</span>
            <Boton
              tamano="chico"
              variante="fantasma"
              aria-label={`Quitar ${extra.producto}`}
              disabled={guardando}
              icono={<Trash2 size={14} />}
              onClick={() => void guardar(actuales.filter((_, i) => i !== indice), `${extra.producto} quitado`)}
              className="w-9 px-0"
            />
          </span>
        </div>
      ))}

      <div className="px-4 py-3">
        {!abierto ? (
          <Boton tamano="chico" variante="secundario" icono={<Plus size={14} />} onClick={() => void abrir()}>
            Sumar un producto
          </Boton>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_0.6fr_0.8fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Producto</span>
              <select
                value={nuevo.producto}
                onChange={(e) => {
                  const producto = productos?.find((item) => item.nombre === e.target.value);
                  setNuevo({ ...nuevo, producto: e.target.value, cadena: producto?.cadenas[0] || "", precio: producto ? String(producto.precio) : "" });
                }}
                className={`${claseInput} h-10`}
              >
                <option value="">{productos ? "Elegí…" : "Cargando…"}</option>
                {productos?.map((producto) => (
                  <option key={producto.nombre} value={producto.nombre}>
                    {producto.nombre} · {pesos(producto.precio)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Cadena</span>
              <select
                value={nuevo.cadena}
                onChange={(e) => setNuevo({ ...nuevo, cadena: e.target.value })}
                disabled={!elegido?.cadenas.length}
                className={`${claseInput} h-10 disabled:opacity-50`}
              >
                {!elegido?.cadenas.length && <option value="">—</option>}
                {elegido?.cadenas.map((cadena) => (
                  <option key={cadena} value={cadena}>
                    {cadena}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Cantidad</span>
              <input value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={`${claseInput} h-10`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Precio c/u</span>
              <input value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value.replace(/[^\d.,]/g, "") })} inputMode="decimal" className={`${claseInput} h-10`} />
            </label>
            <div className="flex gap-1.5">
              <Boton tamano="chico" variante="fantasma" className="h-10" onClick={() => setAbierto(false)}>
                Cancelar
              </Boton>
              <Boton
                tamano="chico"
                variante="principal"
                className="h-10"
                cargando={guardando}
                disabled={!nuevo.producto || !Number(nuevo.cantidad)}
                onClick={async () => {
                  const ok = await guardar(
                    [
                      ...actuales,
                      {
                        producto: nuevo.producto,
                        cadena: nuevo.cadena,
                        cantidad: Number(nuevo.cantidad),
                        precio: Number(nuevo.precio.replace(",", ".")) || elegido?.precio || 0,
                      },
                    ],
                    `${nuevo.producto} sumado al pedido`
                  );
                  if (ok) {
                    setNuevo({ producto: "", cadena: "", cantidad: "1", precio: "" });
                    setAbierto(false);
                  }
                }}
              >
                Sumar
              </Boton>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Se suman al precio del pedido (cuando ya eligió la opción del presupuesto). Imprimilos junto con la maqueta.
        </p>
      </div>
    </Tarjeta>
  );
}
