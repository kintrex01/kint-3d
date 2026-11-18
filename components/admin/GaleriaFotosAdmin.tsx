"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Eye, EyeOff, GripVertical, ImagePlus, Images, Plus, RotateCcw, Search, X } from "lucide-react";
import { ordenarGaleria } from "@/lib/galeria-orden";
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

type ItemGaleria = { id: string; pedido: string; fotos: string[]; editada?: boolean; likes?: number; tieneResena?: boolean; destacado?: number };
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
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [ordenLocal, setOrdenLocal] = useState<string[] | null>(null);
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
  const claveDestacadas = destacadas.join(",");
  const claveOcultas = ocultas.join(",");
  // El orden que ve la gente (el tuyo y después el automático), sin las ocultas.
  const ordenBase = useMemo(() => {
    const manual = claveDestacadas ? claveDestacadas.split(",") : [];
    const fuera = new Set(claveOcultas ? claveOcultas.split(",") : []);
    return ordenarGaleria(items.filter((item) => !fuera.has(item.id)).map((item) => ({ ...item, destacado: manual.indexOf(item.id) + 1 }))).map((item) => item.id);
  }, [items, claveDestacadas, claveOcultas]);
  const orden = ordenLocal ?? ordenBase;
  const posicion = useMemo(() => new Map(orden.map((id, indice) => [id, indice + 1])), [orden]);
  const visibles = useMemo(() => {
    const termino = busqueda.replace(/\D/g, "").replace(/^0+/, "");
    return orden
      .map((id) => porId.get(id))
      .filter((item): item is ItemGaleria => Boolean(item))
      .filter((item) => !termino || item.id.replace(/\D/g, "").replace(/^0+/, "").includes(termino));
  }, [orden, porId, busqueda]);

  /* Arrastrar: la manija captura el puntero (mouse o dedo); al pasar sobre otra maqueta, toma su lugar. */
  function empezarArrastre(evento: React.PointerEvent<HTMLElement>, id: string) {
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    setArrastrando(id);
    setOrdenLocal(orden);
  }

  function moverArrastre(evento: React.PointerEvent<HTMLElement>) {
    if (!arrastrando) return;
    // Cerca del borde de la pantalla, la página se desplaza sola.
    if (evento.clientY < 70) window.scrollBy(0, -14);
    else if (evento.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
    const destino = document.elementFromPoint(evento.clientX, evento.clientY)?.closest<HTMLElement>("[data-pedido]")?.dataset.pedido;
    if (!destino || destino === arrastrando) return;
    setOrdenLocal((actual) => {
      const lista = [...(actual ?? orden)];
      const desde = lista.indexOf(arrastrando);
      const hasta = lista.indexOf(destino);
      if (desde < 0 || hasta < 0) return actual;
      lista.splice(desde, 1);
      lista.splice(hasta, 0, arrastrando);
      return lista;
    });
  }

  async function terminarArrastre() {
    if (!arrastrando) return;
    const nuevo = ordenLocal;
    setArrastrando(null);
    if (!nuevo || nuevo.join(",") === ordenBase.join(",")) {
      setOrdenLocal(null);
      return;
    }
    await guardarLista("galeria_destacadas", nuevo, "Orden guardado: la galería se ve así en unos minutos");
    setOrdenLocal(null);
  }

  /* Mandar una maqueta al principio o al final de la galería (para moverla lejos sin arrastrar). */
  function mandarA(id: string, lugar: "principio" | "final") {
    const sin = ordenBase.filter((otro) => otro !== id);
    void guardarLista(
      "galeria_destacadas",
      lugar === "principio" ? [id, ...sin] : [...sin, id],
      lugar === "principio" ? `${id} va primera en la galería` : `${id} va última en la galería`
    );
  }

  async function guardarLista(clave: string, pedidos: string[], aviso: string) {
    try {
      const respuesta = await accionAdmin("admin_config_guardar", { clave, valor: pedidos.join(", ") });
      onFilas(respuesta.filas);
      avisar(aviso);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    }
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
  const estaOculta = ocultas.includes(elegido);
  const sinUsar = (urls: string[]) => urls.filter((url) => !fotos.includes(url));

  const miniatura = (url: string, etiqueta: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={srcFoto(url)} alt={etiqueta} loading="lazy" className="aspect-square w-full object-cover" />
  );

  return (
    <>
      {/* Todas las maquetas en el orden en que las ve la gente: arrastrá para ordenar */}
      <Tarjeta className="mt-6 p-4">
        <p className="flex items-center gap-2 text-lg font-black">
          <Images size={18} />
          Orden de la galería y fotos
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Así las ve la gente, de arriba a la izquierda hacia abajo. Arrastrá desde <GripVertical size={12} className="inline" /> para moverlas, tocá
          una para elegir sus fotos, o <EyeOff size={12} className="inline" /> para ocultarla.
        </p>

        {!elegido ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-40 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar por número (ej. 39)"
                  inputMode="numeric"
                  className={`${claseInput} h-10 pl-9`}
                />
              </div>
              {destacadas.length > 0 && (
                <Boton
                  tamano="chico"
                  icono={<RotateCcw size={14} />}
                  onClick={() => {
                    if (window.confirm("¿Volver al orden automático? (reseñas primero y después por likes)"))
                      void guardarLista("galeria_destacadas", [], "Volvió al orden automático");
                  }}
                >
                  Orden automático
                </Boton>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              {destacadas.length
                ? "Orden tuyo. Las maquetas nuevas aparecen después de las que ordenaste (reseñas primero)."
                : "Orden automático: reseñas primero (más likes arriba) y después el resto por likes. Al mover una, queda tu orden."}
            </p>

            <ul className="mt-2 grid select-none grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {visibles.map((otro) => (
                <li
                  key={otro.id}
                  data-pedido={otro.id}
                  className={`relative overflow-hidden rounded-xl border transition ${
                    arrastrando === otro.id ? "scale-95 border-red-500 opacity-60 ring-2 ring-red-500" : "border-[var(--kint-panel-border)]"
                  }`}
                >
                  <button type="button" onClick={() => void elegir(otro.id)} className="block w-full text-left">
                    {miniatura(otro.fotos[0], otro.pedido)}
                    <span className="block truncate px-1.5 py-1 text-[11px] font-black">
                      {otro.pedido}
                      {otro.editada && <span className="ml-1 text-amber-600">· editada</span>}
                    </span>
                  </button>
                  <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-black/65 px-1.5 text-[10px] font-black text-white">
                    {posicion.get(otro.id)}
                    {otro.tieneResena ? " · ★" : ""}
                    {(otro.likes ?? 0) > 0 ? ` · ♥${otro.likes}` : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ocultar ${otro.pedido}`}
                    onClick={() => void guardarLista("galeria_ocultos", [...ocultas, otro.id], `${otro.pedido} oculta de la galería`)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white hover:bg-red-600"
                  >
                    <EyeOff size={12} />
                  </button>
                  {!busqueda && (
                    <span
                      role="button"
                      aria-label={`Arrastrar ${otro.pedido}`}
                      onPointerDown={(evento) => empezarArrastre(evento, otro.id)}
                      onPointerMove={moverArrastre}
                      onPointerUp={() => void terminarArrastre()}
                      onPointerCancel={() => void terminarArrastre()}
                      className="absolute bottom-7 right-1 flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-full bg-white/90 text-slate-900 shadow active:cursor-grabbing"
                    >
                      <GripVertical size={16} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {busqueda.replace(/\D/g, "") && (
              <Boton className="mt-2" onClick={() => void elegir(normalizarPedido(busqueda))}>
                Abrir {normalizarPedido(busqueda)}
              </Boton>
            )}

            {ocultas.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Ocultas · tocá para que vuelvan</p>
                <div className="flex flex-wrap gap-1.5">
                  {ocultas.map((pedido) => (
                    <button
                      key={pedido}
                      type="button"
                      onClick={() => void guardarLista("galeria_ocultos", ocultas.filter((otro) => otro !== pedido), `${pedido} vuelve a la galería`)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--kint-panel-border)] px-2.5 py-1 text-xs font-black hover:border-emerald-500"
                    >
                      <Eye size={12} />
                      {pedido.replace(/^KNT-0*/, "KNT-")}
                    </button>
                  ))}
                </div>
              </div>
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
              {!estaOculta && (
                <>
                  <Boton tamano="chico" icono={<ArrowUp size={14} />} onClick={() => mandarA(elegido, "principio")}>
                    Mandar al principio
                  </Boton>
                  <Boton tamano="chico" icono={<ArrowDown size={14} />} onClick={() => mandarA(elegido, "final")}>
                    Mandar al final
                  </Boton>
                </>
              )}
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
