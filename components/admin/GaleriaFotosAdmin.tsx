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
  const [destino, setDestino] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState<string | null>(null);
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

  // Las ocultas no vienen en la galería pública: se pide su portada para verlas acá.
  const [portadasOcultas, setPortadasOcultas] = useState<Record<string, string>>({});
  useEffect(() => {
    let activo = true;
    const faltan = (claveOcultas ? claveOcultas.split(",") : []).filter((pedido) => !porId.get(pedido)?.fotos[0]);
    faltan.forEach((pedido) => {
      accionAdmin("admin_galeria_fotos_disponibles", { pedido })
        .then((respuesta) => {
          const portada = respuesta.elegidas?.[0] ?? respuesta.cliente[0] ?? respuesta.tuyas[0];
          if (activo && portada) setPortadasOcultas((antes) => ({ ...antes, [pedido]: portada }));
        })
        .catch(() => {});
    });
    return () => {
      activo = false;
    };
  }, [claveOcultas, porId]);
  // El orden que ve la gente (el tuyo y después el automático), sin las ocultas.
  const ordenBase = (() => {
    const manual = claveDestacadas ? claveDestacadas.split(",") : [];
    const fuera = new Set(claveOcultas ? claveOcultas.split(",") : []);
    return ordenarGaleria(items.filter((item) => !fuera.has(item.id)).map((item) => ({ ...item, destacado: manual.indexOf(item.id) + 1 }))).map((item) => item.id);
  })();
  const orden = ordenLocal ?? ordenBase;
  const posicion = new Map(orden.map((id, indice) => [id, indice + 1]));
  const visibles = (() => {
    const termino = busqueda.replace(/\D/g, "").replace(/^0+/, "");
    return orden
      .map((id) => porId.get(id))
      .filter((item): item is ItemGaleria => Boolean(item))
      .filter((item) => !termino || item.id.replace(/\D/g, "").replace(/^0+/, "").includes(termino));
  })();

  /*
   * Mover maquetas, dos formas:
   * - Arrastrar la manija: la foto te sigue flotando; las demás quedan quietas y
   *   la de destino se marca «va acá». Recién al soltar se reacomoda y se guarda.
   * - Tocar la manija (sin arrastrar) y después tocar el lugar donde va.
   */
  const arrastre = useRef<{ id: string; x0: number; y0: number; x: number; y: number; movido: boolean; destino: string | null; reloj: number } | null>(null);
  const fantasma = useRef<HTMLDivElement>(null);

  function moverA(id: string, destinoId: string) {
    const hasta = orden.indexOf(destinoId);
    const lista = orden.filter((otro) => otro !== id);
    lista.splice(hasta, 0, id);
    return lista;
  }

  async function guardarOrden(nuevo: string[]) {
    if (nuevo.join(",") === ordenBase.join(",")) return;
    setOrdenLocal(nuevo);
    await guardarLista("galeria_destacadas", nuevo, "Orden guardado: la galería se ve así en unos minutos");
    setOrdenLocal(null);
  }

  function empezarArrastre(evento: React.PointerEvent<HTMLElement>, id: string) {
    evento.preventDefault();
    evento.stopPropagation();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastre.current = { id, x0: evento.clientX, y0: evento.clientY, x: evento.clientX, y: evento.clientY, movido: false, destino: null, reloj: 0 };
  }

  function moverArrastre(evento: React.PointerEvent<HTMLElement>) {
    const actual = arrastre.current;
    if (!actual) return;
    actual.x = evento.clientX;
    actual.y = evento.clientY;
    if (!actual.movido) {
      if (Math.hypot(actual.x - actual.x0, actual.y - actual.y0) < 8) return;
      actual.movido = true;
      if (fantasma.current) fantasma.current.style.transform = `translate(${actual.x - 40}px, ${actual.y - 40}px)`;
      setMoviendo(null);
      setArrastrando(actual.id);
      // Cerca del borde de la pantalla, la página se desplaza sola (aunque no muevas el dedo).
      actual.reloj = window.setInterval(() => {
        const ahora = arrastre.current;
        if (!ahora) return;
        if (ahora.y < 90) window.scrollBy(0, -16);
        else if (ahora.y > window.innerHeight - 90) window.scrollBy(0, 16);
      }, 16);
    }
    if (fantasma.current) fantasma.current.style.transform = `translate(${actual.x - 40}px, ${actual.y - 40}px)`;
    const destinoId = document.elementFromPoint(actual.x, actual.y)?.closest<HTMLElement>("[data-pedido]")?.dataset.pedido ?? null;
    if (destinoId !== actual.destino) {
      actual.destino = destinoId;
      setDestino(destinoId && destinoId !== actual.id ? destinoId : null);
    }
  }

  function terminarArrastre(cancelado = false) {
    const actual = arrastre.current;
    if (!actual) return;
    arrastre.current = null;
    window.clearInterval(actual.reloj);
    setArrastrando(null);
    setDestino(null);
    if (cancelado) return;
    if (!actual.movido) {
      // Un toque: queda elegida y la próxima maqueta que toques es su lugar.
      setMoviendo((antes) => (antes === actual.id ? null : actual.id));
      return;
    }
    if (actual.destino && actual.destino !== actual.id) void guardarOrden(moverA(actual.id, actual.destino));
  }

  function tocarMaqueta(id: string) {
    if (moviendo) {
      if (moviendo !== id) void guardarOrden(moverA(moviendo, id));
      setMoviendo(null);
      return;
    }
    void elegir(id);
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
          Así las ve la gente, de arriba a la izquierda hacia abajo. Arrastrá desde <GripVertical size={12} className="inline" /> para moverlas (o tocala y después tocá dónde va), tocá
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

            {moviendo && (
              <div className="sticky top-2 z-30 mt-2 flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white shadow-lg">
                <GripVertical size={16} />
                <span className="flex-1">Tocá la maqueta donde va {moviendo.replace(/^KNT-0*/, "KNT-")} (toma su lugar)</span>
                <button type="button" onClick={() => setMoviendo(null)} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                  Cancelar
                </button>
              </div>
            )}

            <ul className="mt-2 grid select-none grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {visibles.map((otro) => (
                <li
                  key={otro.id}
                  data-pedido={otro.id}
                  className={`relative overflow-hidden rounded-xl border ${
                    arrastrando === otro.id || moviendo === otro.id
                      ? "border-red-500 opacity-40 ring-2 ring-red-500"
                      : destino === otro.id
                        ? "border-red-500 ring-4 ring-red-500"
                        : "border-[var(--kint-panel-border)]"
                  }`}
                >
                  {destino === otro.id && (
                    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-red-600/35 text-xs font-black uppercase tracking-wider text-white">
                      Va acá
                    </span>
                  )}
                  <button type="button" onClick={() => tocarMaqueta(otro.id)} className="block w-full text-left">
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
                      onPointerUp={() => terminarArrastre()}
                      onPointerCancel={() => terminarArrastre(true)}
                      className={`absolute bottom-7 right-1 z-20 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-full shadow active:cursor-grabbing ${
                        moviendo === otro.id ? "bg-red-600 text-white" : "bg-white/90 text-slate-900"
                      }`}
                    >
                      <GripVertical size={18} />
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* La foto que estás arrastrando, flotando bajo el dedo */}
            <div
              ref={fantasma}
              aria-hidden
              className={`pointer-events-none fixed left-0 top-0 z-50 h-20 w-20 overflow-hidden rounded-xl border-2 border-red-500 shadow-2xl ${arrastrando ? "" : "hidden"}`}
            >
              {arrastrando && porId.get(arrastrando)?.fotos[0] && miniatura(porId.get(arrastrando)!.fotos[0], arrastrando)}
            </div>
            {busqueda.replace(/\D/g, "") && (
              <Boton className="mt-2" onClick={() => void elegir(normalizarPedido(busqueda))}>
                Abrir {normalizarPedido(busqueda)}
              </Boton>
            )}

            {ocultas.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Ocultas ({ocultas.length}) · la gente no las ve
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {ocultas.map((pedido) => {
                    const portada = porId.get(pedido)?.fotos[0] ?? portadasOcultas[pedido];
                    return (
                      <li key={pedido} className="relative overflow-hidden rounded-xl border border-dashed border-[var(--kint-panel-border)]">
                        <button type="button" onClick={() => void elegir(pedido)} className="block w-full text-left">
                          {portada ? (
                            <span className="block opacity-60 grayscale-[40%]">{miniatura(portada, pedido)}</span>
                          ) : (
                            <span className="flex aspect-square w-full items-center justify-center bg-[var(--kint-panel-soft)] text-[10px] text-[var(--text-muted)]">
                              Cargando…
                            </span>
                          )}
                          <span className="block truncate px-1.5 py-1 text-[11px] font-black">{pedido.replace(/^KNT-0*/, "KNT-")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void guardarLista("galeria_ocultos", ocultas.filter((otro) => otro !== pedido), `${pedido} vuelve a la galería`)}
                          className="absolute inset-x-1 bottom-7 inline-flex items-center justify-center gap-1 rounded-full bg-emerald-600 py-1 text-[11px] font-black text-white shadow hover:bg-emerald-700"
                        >
                          <Eye size={12} />
                          Volver a mostrar
                        </button>
                      </li>
                    );
                  })}
                </ul>
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
