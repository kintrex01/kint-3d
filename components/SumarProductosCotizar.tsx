"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import {
  esMonosAMedida,
  esTamanoPersonalizado,
  MONOS_MAXIMO,
  monoParaEscala,
  monosPrimero,
  numeroEscala,
  pideColor,
  PRECIOS_MONOS_DEFECTO,
  precioMonosEscala,
  tamanoDeEscala,
  type ColorMonos,
  type PreciosMonos,
} from "@/lib/extras-color";
import ElegirMonos from "@/components/ElegirMonos";

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
  variantes?: string[]; // en los monos: los tamaños (1:50, 1:100…)
  personalizable: boolean;
};

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

export default function SumarProductosCotizar({
  elegidos,
  onCambiar,
  colores = [],
  escala = "",
  coloresTono = [],
  preciosMonos = PRECIOS_MONOS_DEFECTO,
}: {
  elegidos: ExtraElegido[];
  onCambiar: (extras: ExtraElegido[]) => void;
  colores?: string[]; // los colores de filamento que se pueden elegir (para los monos)
  escala?: string; // la escala de la maqueta: el tamaño de los monos arranca elegido en esa
  coloresTono?: ColorMonos[]; // los mismos colores, con su tono y foto (botones pintados)
  preciosMonos?: PreciosMonos; // Configuración › Tienda › Monos precio…
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cadenas, setCadenas] = useState<Record<string, string>>({});
  const [tamanos, setTamanos] = useState<Record<string, string>>({});
  // Monos «Personalizado»: la escala que escribe (ej. 1:300). Se suma sin precio y se cotiza después.
  const [escalasPropias, setEscalasPropias] = useState<Record<string, string>>({});

  useEffect(() => {
    let activo = true;
    fetch("/api/tienda/productos")
      .then((respuesta) => respuesta.json())
      .then((data) => {
        if (!activo || !Array.isArray(data?.productos)) return;
        setProductos(
          monosPrimero((data.productos as Producto[]).filter((producto) => !producto.personalizable && producto.precio > 0))
        );
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  if (!productos.length) return null;

  const monos = productos.filter((producto) => pideColor(producto.nombre));
  const otros = productos.filter((producto) => !pideColor(producto.nombre));
  // Los monos que le van a la maqueta (por su escala) van primero, marcados y con la escala ya elegida.
  const sugerencia = monoParaEscala(monos, escala);
  const monoDeTuEscala = sugerencia?.nombre ?? "";
  if (monoDeTuEscala) monos.sort((a, b) => Number(b.nombre === monoDeTuEscala) - Number(a.nombre === monoDeTuEscala));
  const unidadesOtros = elegidos
    .filter((extra) => !pideColor(extra.producto))
    .reduce((suma, extra) => suma + extra.cantidad, 0);
  const totalOtros = elegidos
    .filter((extra) => !pideColor(extra.producto))
    .reduce((suma, extra) => suma + extra.cantidad * (productos.find((p) => p.nombre === extra.producto)?.precio || 0), 0);

  function cambiar(producto: string, cadena: string, cantidad: number) {
    const resto = elegidos.filter((extra) => !(extra.producto === producto && extra.cadena === cadena));
    onCambiar(cantidad > 0 ? [...resto, { producto, cadena, cantidad: Math.min(10, cantidad) }] : resto);
  }

  // Una tarjeta de producto (monos o llaveros). «tuEscala»: el mono de la escala de la maqueta.
  const tarjeta = (producto: Producto, tuEscala = false) => {
              // Los monos piden color (obligatorio); los llaveros, cadena.
              const conColor = !producto.cadenas.length && pideColor(producto.nombre) && colores.length > 0;
              const opciones = conColor ? colores : producto.cadenas;
              // Monos: tamaño (de la escala de la maqueta si hay uno igual) + color → «1:100 · Rojo».
              const listaTamanos = conColor ? producto.variantes ?? [] : [];
              const sugerido = sugerencia?.nombre === producto.nombre ? sugerencia : null;
              const tamano = listaTamanos.length
                ? tamanos[producto.nombre] ??
                  (sugerido ? sugerido.tamano : tamanoDeEscala(listaTamanos.filter((opcion) => !esTamanoPersonalizado(opcion)), escala))
                : "";
              // «Personalizado»: escribe la escala; va sin precio (se cotiza después).
              const propio = Boolean(tamano) && esTamanoPersonalizado(tamano);
              // Solo el número (el «1:» va fijo adelante).
              const escalaPropia = escalasPropias[producto.nombre] ?? (sugerido?.propia ? String(numeroEscala(sugerido.propia)) : "");
              const precioPropio = propio ? precioMonosEscala(productos, Number(escalaPropia)) : 0;
              const tamanoFinal = propio ? (Number(escalaPropia) > 0 ? `${tamano} 1:${Number(escalaPropia)}` : "") : tamano;
              const seleccion = opciones.length ? cadenas[producto.nombre] || "" : "";
              const cadena = listaTamanos.length ? (tamanoFinal && seleccion ? `${tamanoFinal} · ${seleccion}` : "") : seleccion;
              const cantidad =
                elegidos.find((extra) => extra.producto === producto.nombre && extra.cadena === cadena)?.cantidad || 0;
              const totalProducto = elegidos
                .filter((extra) => extra.producto === producto.nombre)
                .reduce((suma, extra) => suma + extra.cantidad, 0);
              const faltaCadena = opciones.length > 0 && !cadena;
              return (
                <div
                  key={producto.nombre}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-[var(--card-bg)] transition ${
                    totalProducto ? "border-emerald-500/60 ring-2 ring-emerald-500/20" : "border-[var(--border-color)]"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-white/5">
                    {tuEscala && (
                      <span className="absolute bottom-2 left-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
                        Tu escala
                      </span>
                    )}
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
                    <p className="text-sm font-black text-red-600">{propio ? (precioPropio ? pesos(precioPropio) : "Escribí la escala") : pesos(producto.precio)}</p>
                    {listaTamanos.length > 0 && (
                      <>
                        <p className={`mt-1 text-[10px] font-black uppercase tracking-wider ${tamano ? "text-[var(--text-muted)]" : "text-red-600"}`}>
                          {tamano ? `Tamaño: ${tamano}` : "Elegí el tamaño"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {listaTamanos.map((opcion) => (
                            <button
                              key={opcion}
                              type="button"
                              aria-pressed={tamano === opcion}
                              onClick={() => setTamanos((actual) => ({ ...actual, [producto.nombre]: opcion }))}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                                tamano === opcion
                                  ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
                                  : "border-[var(--border-color)] text-[var(--text-muted)]"
                              }`}
                            >
                              {opcion}
                            </button>
                          ))}
                        </div>
                        {propio && (
                          <>
                            <span
                              className={`mt-1.5 flex h-8 w-full items-center rounded-lg border bg-[var(--kint-input-bg)] px-2 text-xs font-bold focus-within:border-[var(--blue-main)] ${
                                Number(escalaPropia) > 0 ? "border-[var(--border-color)]" : "border-dashed border-red-500/70"
                              }`}
                            >
                              <span className="text-[var(--text-muted)]">1:</span>
                              <input
                                value={escalaPropia}
                                onChange={(evento) =>
                                  setEscalasPropias((actual) => ({ ...actual, [producto.nombre]: evento.target.value.replace(/\D/g, "").slice(0, 5) }))
                                }
                                inputMode="numeric"
                                placeholder="300"
                                aria-label="Escala"
                                className="h-full w-full min-w-0 bg-transparent pl-0.5 outline-none"
                              />
                            </span>
                            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                              30 monos a la escala que escribas; el precio se calcula solo según la escala.
                            </p>
                          </>
                        )}
                      </>
                    )}
                    {conColor && (
                      <p className={`mt-1 text-[10px] font-black uppercase tracking-wider ${seleccion ? "text-[var(--text-muted)]" : "text-red-600"}`}>
                        {seleccion ? `Color: ${seleccion}` : "Elegí el color"}
                      </p>
                    )}
                    {opciones.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {opciones.map((opcion) => (
                          <button
                            key={opcion}
                            type="button"
                            aria-pressed={seleccion === opcion}
                            onClick={() => setCadenas((actual) => ({ ...actual, [producto.nombre]: opcion }))}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                              seleccion === opcion
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
                          <span className="text-sm font-black">{conColor ? `${cantidad * 30} monos` : cantidad}</span>
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
                          {faltaCadena ? (conColor ? (listaTamanos.length && !tamanoFinal ? (propio ? "Escribí la escala" : "Elegí tamaño") : "Elegí color") : "Elegí cadena") : "Sumar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
  };

  return (
    <>
    {/* Monos: bloque propio, abierto y destacado (es el extra que más suma a una maqueta). */}
    {monos.length > 0 && (
      <div className="mb-4 overflow-hidden rounded-2xl border-2 border-red-600/40 bg-gradient-to-br from-red-600/[0.08] to-transparent p-4">
        <p className="text-lg font-black leading-tight text-[var(--text-main)]">¿Querés agregarle monos a tu maqueta?</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Las personas le dan escala y vida al proyecto. Elegí la escala y el color: los imprimimos con tu maqueta y te llegan juntos.
        </p>
        {/* Monos a medida: escala, color y cantidad, con el precio al momento */}
        <div className="mt-3 space-y-3">
          {monos.filter((producto) => esMonosAMedida(producto.nombre)).map((producto) => (
            <ElegirMonos
              key={producto.nombre}
              nombre={producto.nombre}
              foto={producto.foto}
              colores={coloresTono}
              precios={preciosMonos}
              escalaInicial={escala}
              elegidos={elegidos.filter((extra) => extra.producto === producto.nombre)}
              onSumar={(cadena, cantidad) => {
                const antes = elegidos.find((extra) => extra.producto === producto.nombre && extra.cadena === cadena)?.cantidad ?? 0;
                const resto = elegidos.filter((extra) => !(extra.producto === producto.nombre && extra.cadena === cadena));
                onCambiar([...resto, { producto: producto.nombre, cadena, cantidad: Math.min(MONOS_MAXIMO, antes + cantidad) }]);
              }}
              onQuitar={(cadena) => onCambiar(elegidos.filter((extra) => !(extra.producto === producto.nombre && extra.cadena === cadena)))}
            />
          ))}
        </div>
        {monos.some((producto) => !esMonosAMedida(producto.nombre)) && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {monos.filter((producto) => !esMonosAMedida(producto.nombre)).map((producto) => tarjeta(producto, producto.nombre === monoDeTuEscala))}
          </div>
        )}
      </div>
    )}

    {otros.length > 0 && (
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
            {unidadesOtros
              ? `${unidadesOtros} ${unidadesOtros === 1 ? "producto" : "productos"} · ${pesos(totalOtros)}, se cobran junto con la maqueta`
              : "Los imprimimos con tu maqueta y te llegan juntos. Opcional."}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-bold text-[var(--text-main)]">
          {abierto ? "Cerrar" : unidadesOtros ? "Cambiar" : "Ver"}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-[var(--border-color)] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {otros.map((producto) => tarjeta(producto))}
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
    )}
    </>
  );
}
