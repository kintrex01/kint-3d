"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, EyeOff, ImagePlus, Images, Plus, RotateCcw, Search, Star, X } from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type { FilaConfig } from "@/lib/admin-tipos";
import { subirFoto } from "@/components/admin/AgregarConfig";
import { Boton, Chip, Tarjeta, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Configuración › Galeria:
 * - Destacadas: las que van primero en la galería, en el orden que elijas.
 * - Ocultar una maqueta de la galería.
 * - Las fotos de cada maqueta: las tuyas (foto final y segunda) y las del
 *   cliente. Por defecto, si el cliente subió fotos se ven solo las suyas;
 *   acá elegís cuáles van y en qué orden (las tuyas primero, las del cliente
 *   primero, solo unas…), o sumás una nueva. Si sacás una foto de la reseña,
 *   también sale de la reseña.
 */

type ItemGaleria = { id: string; pedido: string; fotos: string[]; editada?: boolean };
type Disponibles = { tuyas: string[]; cliente: string[] };

function srcFoto(link: string) {
  const id = /[-\w]{25,}/.exec(link)?.[0];
  return /drive\.google\.com/.test(link) && id ? `/api/imagen-drive?id=${encodeURIComponent(id)}` : link;
}

/* «39», «knt-39», «KNT-0039» → «KNT-0039». */
function normalizarPedido(texto: string) {
  const numero = /(\d+)/.exec(texto)?.[1];
  return numero ? `KNT-${numero.padStart(4, "0")}` : "";
}

const lista = (valor: unknown) =>
  String(valor ?? "")
    .split(/[\s,;]+/)
    .map(normalizarPedido)
    .filter(Boolean);

export default function GaleriaFotosAdmin({ filas, onFilas }: { filas: FilaConfig[]; onFilas: (filas: FilaConfig[]) => void }) {
  const avisar = useAvisos();
  const [items, setItems] = useState<ItemGaleria[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [originales, setOriginales] = useState<string[]>([]);
  const [disponibles, setDisponibles] = useState<Disponibles>({ tuyas: [], cliente: [] });
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const destacadas = lista(filas.find((fila) => fila.clave === "galeria_destacadas")?.valor);
  const ocultas = lista(filas.find((fila) => fila.clave === "galeria_ocultos")?.valor);

  useEffect(() => {
    let activo = true;
    fetch("/api/galeria", { cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((data) => activo && data?.ok && setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const porId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const visibles = useMemo(() => {
    const termino = busqueda.replace(/\D/g, "").replace(/^0+/, "");
    return items.filter((item) => !termino || item.id.replace(/\D/g, "").replace(/^0+/, "").includes(termino)).slice(0, 40);
  }, [items, busqueda]);

  async function guardarLista(clave: string, pedidos: string[], aviso: string) {
    try {
      const respuesta = await accionAdmin("admin_config_guardar", { clave, valor: pedidos.join(", ") });
      onFilas(respuesta.filas);
      avisar(aviso);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    }
  }

  function moverDestacada(indice: number, paso: number) {
    const nuevas = [...destacadas];
    const destino = indice + paso;
    if (destino < 0 || destino >= nuevas.length) return;
    [nuevas[indice], nuevas[destino]] = [nuevas[destino], nuevas[indice]];
    void guardarLista("galeria_destacadas", nuevas, "Orden de destacadas guardado");
  }

  async function elegir(pedido: string) {
    const item = porId.get(pedido);
    setElegido(pedido);
    setFotos(item?.fotos ?? []);
    setOriginales(item?.fotos ?? []);
    setDisponibles({ tuyas: [], cliente: [] });
    try {
      const respuesta = await accionAdmin("admin_galeria_fotos_disponibles", { pedido });
      setDisponibles({ tuyas: respuesta.tuyas, cliente: respuesta.cliente });
      if (!item) {
        const iniciales = respuesta.elegidas ?? (respuesta.cliente.length ? respuesta.cliente : respuesta.tuyas);
        setFotos(iniciales);
        setOriginales(iniciales);
      }
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron leer las fotos.", "error");
    }
  }

  async function agregarArchivos(archivos: FileList | null) {
    if (!archivos?.length) return;
    setSubiendo(true);
    try {
      const nuevas: string[] = [];
      for (const archivo of Array.from(archivos).slice(0, 10 - fotos.length)) nuevas.push(await subirFoto(archivo));
      setFotos((actuales) => [...actuales, ...nuevas]);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo subir la foto.", "error");
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function mover(indice: number, paso: number) {
    setFotos((actuales) => {
      const nuevas = [...actuales];
      const destino = indice + paso;
      if (destino < 0 || destino >= nuevas.length) return nuevas;
      [nuevas[indice], nuevas[destino]] = [nuevas[destino], nuevas[indice]];
      return nuevas;
    });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const quitar = originales.filter((url) => !fotos.includes(url) && disponibles.cliente.includes(url));
      const respuesta = await accionAdmin("admin_galeria_fotos_guardar", { pedido: elegido, fotos, quitar });
      setItems((actuales) =>
        actuales.some((item) => item.id === elegido)
          ? actuales.map((item) => (item.id === elegido ? { ...item, fotos, editada: true } : item))
          : [{ id: elegido, pedido: elegido.replace(/^KNT-0*/, "KNT-"), fotos, editada: true }, ...actuales]
      );
      setOriginales(fotos);
      if (quitar.length) setDisponibles((actuales) => ({ ...actuales, cliente: actuales.cliente.filter((url) => !quitar.includes(url)) }));
      avisar(respuesta.aviso || "Fotos guardadas");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron guardar las fotos.", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function restablecer() {
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_galeria_fotos_restablecer", { pedido: elegido });
      avisar(`${respuesta.aviso} Se ve en la galería en unos minutos.`);
      setItems((actuales) => actuales.map((item) => (item.id === elegido ? { ...item, editada: false } : item)));
      setElegido("");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo deshacer.", "error");
    } finally {
      setGuardando(false);
    }
  }

  const cambiado = JSON.stringify(fotos) !== JSON.stringify(originales);
  const item = porId.get(elegido);
  const esDestacada = destacadas.includes(elegido);
  const estaOculta = ocultas.includes(elegido);
  const sinUsar = (urls: string[]) => urls.filter((url) => !fotos.includes(url));

  const miniatura = (url: string, etiqueta: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={srcFoto(url)} alt={etiqueta} loading="lazy" className="aspect-square w-full object-cover" />
  );

  return (
    <>
      {/* Destacadas: van primero, en este orden */}
      <Tarjeta className="mt-6 p-4">
        <p className="flex items-center gap-2 text-lg font-black">
          <Star size={18} className="text-amber-500" />
          Destacadas (van primero)
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Tus mejores proyectos arriba de todo, en el orden que elijas. Las demás siguen el orden automático (más likes primero).
        </p>
        {destacadas.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[var(--kint-selected-bg)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
            Todavía no destacaste ninguna. Abrí una maqueta abajo y tocá «Destacar».
          </p>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {destacadas.map((pedido, indice) => {
              const destacada = porId.get(pedido);
              return (
                <li key={pedido} className="flex items-center gap-2 rounded-xl border border-[var(--kint-panel-border)] p-1.5">
                  <span className="w-5 text-center text-xs font-black text-amber-600">{indice + 1}</span>
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--kint-panel-soft)]">
                    {destacada?.fotos[0] && miniatura(destacada.fotos[0], pedido)}
                  </span>
                  <button type="button" onClick={() => void elegir(pedido)} className="min-w-0 flex-1 truncate text-left text-sm font-black hover:underline">
                    {pedido.replace(/^KNT-0*/, "KNT-")}
                  </button>
                  <button type="button" aria-label="Subir" disabled={indice === 0} onClick={() => moverDestacada(indice, -1)} className="rounded p-1 text-[var(--text-muted)] disabled:opacity-25">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" aria-label="Bajar" disabled={indice === destacadas.length - 1} onClick={() => moverDestacada(indice, 1)} className="rounded p-1 text-[var(--text-muted)] disabled:opacity-25">
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Quitar de destacadas"
                    onClick={() => void guardarLista("galeria_destacadas", destacadas.filter((otro) => otro !== pedido), `${pedido} ya no está destacada`)}
                    className="rounded p-1 text-[var(--text-muted)] hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Tarjeta>

      {/* Cada maqueta: fotos, destacar, ocultar */}
      <Tarjeta className="mt-4 p-4">
        <p className="flex items-center gap-2 text-lg font-black">
          <Images size={18} />
          Las maquetas y sus fotos
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Tocá una para elegir qué fotos se ven (las tuyas, las del cliente o las dos, y en qué orden), destacarla u ocultarla.
        </p>

        {!elegido ? (
          <>
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Número de pedido (ej. 39)"
                inputMode="numeric"
                className={`${claseInput} h-10 pl-9`}
              />
            </div>
            <ul className="mt-2 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
              {visibles.map((otro) => (
                <li key={otro.id}>
                  <button type="button" onClick={() => void elegir(otro.id)} className="relative block w-full overflow-hidden rounded-xl border border-[var(--kint-panel-border)] text-left">
                    {miniatura(otro.fotos[0], otro.pedido)}
                    {destacadas.includes(otro.id) && (
                      <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">★ {destacadas.indexOf(otro.id) + 1}</span>
                    )}
                    <span className="block truncate px-1.5 py-1 text-[11px] font-black">
                      {otro.pedido}
                      {otro.editada && <span className="ml-1 text-amber-600">· editada</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {busqueda.replace(/\D/g, "") && (
              <Boton className="mt-2" onClick={() => void elegir(normalizarPedido(busqueda))}>
                Abrir {normalizarPedido(busqueda)}
              </Boton>
            )}
          </>
        ) : (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setElegido("")} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">
                ← Otra maqueta
              </button>
              <span className="text-sm font-black">{elegido}</span>
              {item?.editada && <Chip tono="ambar">Fotos elegidas por vos</Chip>}
              {estaOculta && <Chip tono="gris">Oculta</Chip>}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Boton
                tamano="chico"
                icono={<Star size={14} className={esDestacada ? "fill-amber-400 text-amber-400" : ""} />}
                onClick={() =>
                  void guardarLista(
                    "galeria_destacadas",
                    esDestacada ? destacadas.filter((otro) => otro !== elegido) : [...destacadas, elegido],
                    esDestacada ? `${elegido} ya no está destacada` : `${elegido} destacada: va en el lugar ${destacadas.length + 1}`
                  )
                }
              >
                {esDestacada ? "Quitar de destacadas" : "Destacar"}
              </Boton>
              <Boton
                tamano="chico"
                icono={<EyeOff size={14} />}
                onClick={() =>
                  void guardarLista(
                    "galeria_ocultos",
                    estaOculta ? ocultas.filter((otro) => otro !== elegido) : [...ocultas, elegido],
                    estaOculta ? `${elegido} vuelve a la galería` : `${elegido} oculta de la galería`
                  )
                }
              >
                {estaOculta ? "Mostrar en la galería" : "Ocultar de la galería"}
              </Boton>
            </div>

            {/* Las que se ven, en orden */}
            <p className="mb-1.5 mt-4 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Se ven así (la primera es la portada)</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {fotos.map((url, indice) => (
                <li key={url} className="relative overflow-hidden rounded-xl border-2 border-emerald-500/60">
                  {miniatura(url, `Foto ${indice + 1}`)}
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-black text-white">
                    {indice === 0 ? "Portada" : indice + 1}
                    {disponibles.cliente.includes(url) ? " · cliente" : disponibles.tuyas.includes(url) ? " · tuya" : ""}
                  </span>
                  <button type="button" aria-label="Sacar esta foto" onClick={() => setFotos((actuales) => actuales.filter((otra) => otra !== url))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                    <X size={12} />
                  </button>
                  <div className="absolute inset-x-1 bottom-1 flex justify-between">
                    <button type="button" aria-label="Antes" disabled={indice === 0} onClick={() => mover(indice, -1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-900 disabled:opacity-0">
                      <ArrowLeft size={12} />
                    </button>
                    <button type="button" aria-label="Después" disabled={indice === fotos.length - 1} onClick={() => mover(indice, 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-900 disabled:opacity-0">
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </li>
              ))}
              {fotos.length < 10 && (
                <li>
                  <button type="button" disabled={subiendo} onClick={() => entrada.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--kint-panel-border)] text-[11px] font-bold text-[var(--text-muted)] hover:border-red-500 disabled:opacity-50">
                    <ImagePlus size={18} />
                    {subiendo ? "Subiendo…" : "Subir una nueva"}
                  </button>
                  <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={(evento) => void agregarArchivos(evento.target.files)} />
                </li>
              )}
            </ul>

            {/* Las que no se están usando: tocá para sumarlas */}
            {[
              { titulo: "Tus fotos del pedido", urls: sinUsar(disponibles.tuyas) },
              { titulo: "Fotos del cliente (de su reseña)", urls: sinUsar(disponibles.cliente) },
            ].map(
              (grupo) =>
                grupo.urls.length > 0 && (
                  <div key={grupo.titulo} className="mt-4">
                    <p className="mb-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{grupo.titulo} · tocá para sumarla</p>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {grupo.urls.map((url) => (
                        <li key={url}>
                          <button type="button" onClick={() => setFotos((actuales) => [...actuales, url])} className="relative block w-full overflow-hidden rounded-xl border border-[var(--kint-panel-border)] opacity-80 hover:opacity-100">
                            {miniatura(url, grupo.titulo)}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                              <Plus size={22} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Boton variante="principal" icono={<Check size={15} />} onClick={guardar} cargando={guardando} disabled={!cambiado}>
                Guardar fotos
              </Boton>
              {item?.editada && (
                <Boton icono={<RotateCcw size={14} />} onClick={restablecer} disabled={guardando}>
                  Volver a lo automático
                </Boton>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Automático: si el cliente subió fotos se ven solo las suyas; si no, tu foto final. Si sacás una foto del cliente, también sale de su reseña.
            </p>
            {fotos.length === 0 && <p className="mt-1 text-xs font-semibold text-amber-600">Sin fotos, esta maqueta no se muestra.</p>}
          </div>
        )}
      </Tarjeta>
    </>
  );
}
