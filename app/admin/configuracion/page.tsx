"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  ClipboardList,
  Gift,
  HeartHandshake,
  MessageSquareText,
  Palette,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Store,
  Trash2,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type {
  CanjeRuletaConfig,
  ClienteAdmin,
  ConfigRuleta,
  FilaConfig,
  PremioRuletaConfig,
} from "@/lib/admin-tipos";
import { colorFilamento, fotoFilamento } from "@/lib/colores-filamento";
import {
  Boton,
  CajaError,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Interruptor,
  Tarjeta,
  Vacio,
  claseInput,
  useAvisos,
} from "@/components/admin/ui";
import { unidadConfig } from "@/components/admin/unidadesConfig";

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */

const DESCRIPCIONES: Record<string, string> = {
  aceptar_pedidos: "Si está apagado, /cotizar no recibe pedidos nuevos",
  estado_pagina: "Si está apagado, /cotizar muestra «Cotizaciones pausadas»",
  mostrar_aviso_emergente:
    "Muestra un aviso emergente en toda la web con el mensaje",
  fecha_reapertura: "Fecha que se anuncia en el aviso y en la pausa",
  pedido_urgente: "Ofrece la opción de pedido urgente en /cotizar",
  pedido_urgente_valor: "Recargo en % (escribí 20, no 0,2)",
  pedido_urgente_cupos:
    "Cupos urgentes que quedan; baja solo con cada pedido urgente",
  armado: "Ofrece el servicio de armado en /cotizar",
  alisado: "Ofrece el servicio de alisado en /cotizar",
  tienda_abierta: "Si está apagado, la tienda no acepta compras",
  tienda_sena_porcentaje: "Porcentaje de seña en la tienda",
  pedidos_por_mayor:
    "Desde cuántas unidades de un producto se cobra el precio por mayor",
  gran_pedido_por_mayor:
    "Desde cuántas unidades se cobra el precio gran por mayor (más que el por mayor)",
  auto_terminar_por_fotos:
    "Pasa el pedido a Terminado cuando subís las fotos finales",
  publicar_resenas_automatico:
    "Las reseñas nuevas se publican sin que las apruebes",
  promocion_global: "Activa la promoción para todos los pedidos nuevos",
  promocion_descuento: "Descuento de la promoción en % (escribí 15, no 0,15)",
  promocion_mensaje: "Texto del banner de la promoción",
  promocion_inicio: "Desde cuándo vale (vacío = sin límite)",
  promocion_fin: "Hasta cuándo vale, incluido ese día",
  puntos: "Activa los Puntos Kint: se ganan y se canjean",
  puntos_generacion: "Porcentaje de lo pagado que vuelve en puntos",
  puntos_valor: "Cuántos pesos vale cada punto",
  puntos_minimo_uso: "Mínimo de puntos para poder canjear",
  puntos_acreditacion:
    "Estado en el que se acreditan los puntos (dejá «Entregado»)",
  top_kint: "Muestra el ranking público Top Kint",
  top_kint_periodo: "Período del ranking: Histórico, Anual o Semestral",
  fidelidad:
    "Cupones por cantidad de pedidos (no corre si Puntos está prendido)",
  fidelidad_vencimiento: "Días que dura el cupón de fidelidad",
};

const DESCRIPCIONES_PREFIJO: [string, string][] = [
  ["filamento_", "Color disponible en /cotizar"],
  ["boquilla_", "Opción de boquilla en /cotizar"],
  ["fidelidad_hito_", "Descuento en % al llegar a esa cantidad de pedidos"],
  ["promocion_", "Parte de la promoción global"],
  ["puntos_", "Parte de los Puntos Kint"],
];

function descripcion(clave: string) {
  if (DESCRIPCIONES[clave]) return DESCRIPCIONES[clave];
  const prefijo = DESCRIPCIONES_PREFIJO.find(([inicio]) =>
    clave.startsWith(inicio)
  );
  return prefijo ? prefijo[1] : "";
}

/* Claves que cortan o cambian lo que ve el público: se confirman. */
const CRITICAS: Record<string, { prender: string; apagar: string }> = {
  aceptar_pedidos: {
    prender: "/cotizar vuelve a recibir pedidos nuevos.",
    apagar:
      "Nadie va a poder mandar pedidos nuevos desde /cotizar. Van a ver el mensaje de esta opción.",
  },
  estado_pagina: {
    prender: "/cotizar vuelve a funcionar normal.",
    apagar:
      "/cotizar va a mostrar «Cotizaciones pausadas» con el mensaje de esta opción.",
  },
  tienda_abierta: {
    prender: "La tienda vuelve a aceptar compras.",
    apagar:
      "La tienda deja de vender. Los clientes van a ver el mensaje de esta opción.",
  },
  mostrar_aviso_emergente: {
    prender:
      "Va a aparecer un aviso emergente en toda la web con el mensaje de esta opción.",
    apagar: "Se deja de mostrar el aviso emergente en la web.",
  },
};

/* Claves cuyo comentario (columna C) lee el cliente. */
const COMENTARIO_ES_MENSAJE = new Set(["pedido_urgente_cupos"]);

function tituloSeccion(texto: string) {
  const limpio = texto.trim().toLowerCase();
  if (!limpio) return "General";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function estaHabilitada(valor: string | number) {
  return /^(habilitad[ao]|s[ií])$/i.test(String(valor).trim());
}

/* ------------------------------------------------------------------ */
/* Validación de números                                                */
/* ------------------------------------------------------------------ */

const PORCENTAJES = new Set([
  "pedido_urgente_valor",
  "promocion_descuento",
  "puntos_generacion",
]);

function validarNumero(
  clave: string,
  texto: string,
  filas: FilaConfig[]
): { numero: number } | { error: string } {
  const numero = Number(texto.trim().replace(",", "."));
  if (!texto.trim() || !Number.isFinite(numero)) {
    return { error: "Escribí un número." };
  }
  if (numero < 0) return { error: "No puede ser negativo." };

  if (clave === "tienda_sena_porcentaje" && (numero <= 0 || numero >= 100)) {
    return { error: "La seña tiene que estar entre 1 y 99." };
  }
  if (clave === "pedidos_por_mayor" && (!Number.isInteger(numero) || numero < 2)) {
    return { error: "Tiene que ser un número entero de 2 o más." };
  }
  if (clave === "gran_pedido_por_mayor" && numero !== 0) {
    const porMayor = Number(
      filas.find((fila) => fila.clave === "pedidos_por_mayor")?.valor || 0
    );
    if (!Number.isInteger(numero) || numero <= porMayor) {
      return {
        error: `Tiene que ser un entero mayor que ${porMayor} (el por mayor).`,
      };
    }
  }
  if (clave === "pedido_urgente_cupos" && !Number.isInteger(numero)) {
    return { error: "Los cupos son un número entero." };
  }
  if (PORCENTAJES.has(clave) || clave.startsWith("fidelidad_hito_")) {
    if (numero > 100) return { error: "No puede pasar de 100." };
    if (numero > 0 && numero < 1) {
      return { error: "Escribí el porcentaje entero (20, no 0,2)." };
    }
  }
  return { numero };
}

/* ------------------------------------------------------------------ */
/* Secciones: ícono, color y para qué sirve cada una                    */
/* ------------------------------------------------------------------ */

type InfoSeccion = { icono: LucideIcon; color: string; detalle: string };

const INFO_SECCIONES: Record<string, InfoSeccion> = {
  "Control general": { icono: Power, color: "#ef4444", detalle: "Prender o pausar la web y los avisos" },
  Pedidos: { icono: ClipboardList, color: "#3b82f6", detalle: "Pedidos urgentes, recargo y cupos" },
  Tienda: { icono: Store, color: "#8b5cf6", detalle: "Precios por mayor de la tienda" },
  Servicios: { icono: Wrench, color: "#f59e0b", detalle: "Armado, alisado y boquillas en /cotizar" },
  Automatizaciones: { icono: Bot, color: "#06b6d4", detalle: "Cosas que se hacen solas" },
  Promociones: { icono: Percent, color: "#ec4899", detalle: "Descuento para todos por un tiempo" },
  Fidelidad: { icono: HeartHandshake, color: "#f43f5e", detalle: "Cupones según la cantidad de pedidos" },
  Puntos: { icono: Star, color: "#eab308", detalle: "Puntos Kint y el ranking Top Kint" },
  Filamentos: { icono: Palette, color: "#10b981", detalle: "Colores que se pueden elegir en /cotizar" },
  General: { icono: Settings2, color: "#64748b", detalle: "Otras opciones" },
};

const RULETA = "Ruleta";
const INFO_RULETA: InfoSeccion = { icono: Gift, color: "#d946ef", detalle: "Premios, chances, giros, canjes y giros de regalo" };

function infoSeccion(titulo: string): InfoSeccion {
  if (titulo === RULETA) return INFO_RULETA;
  return INFO_SECCIONES[titulo] ?? INFO_SECCIONES.General;
}

/* Lo más importante, arriba de todo y bien grande. */
const ESTADO_WEB: { clave: string; titulo: string; prendido: string; apagado: string }[] = [
  { clave: "estado_pagina", titulo: "Página /cotizar", prendido: "Funcionando", apagado: "Pausada" },
  { clave: "aceptar_pedidos", titulo: "Pedidos nuevos", prendido: "Se reciben", apagado: "Cerrados" },
  { clave: "tienda_abierta", titulo: "Tienda", prendido: "Vendiendo", apagado: "Cerrada" },
  { clave: "mostrar_aviso_emergente", titulo: "Aviso emergente", prendido: "Se muestra", apagado: "Apagado" },
];

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type Cambios = { valor?: string | number; comentario?: string };
type Guardar = (clave: string, cambios: Cambios) => Promise<boolean>;

export default function ConfiguracionAdmin() {
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_config_listar", {});
  const avisar = useAvisos();

  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState("");
  const [optimistas, setOptimistas] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<{
    fila: FilaConfig;
    activo: boolean;
  } | null>(null);

  const filas = useMemo(() => datos?.filas ?? [], [datos]);

  const guardar: Guardar = async (clave, cambios) => {
    try {
      const respuesta = await accionAdmin("admin_config_guardar", {
        clave,
        ...cambios,
      });
      setDatos({ filas: respuesta.filas });
      return true;
    } catch (errorGuardado) {
      avisar(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar.",
        "error"
      );
      return false;
    }
  };

  async function guardarToggle(fila: FilaConfig, activo: boolean) {
    const valor = activo ? "Habilitada" : "Deshabilitada";
    setOptimistas((actuales) => ({ ...actuales, [fila.clave]: valor }));
    const ok = await guardar(fila.clave, { valor });
    setOptimistas((actuales) => {
      const resto = { ...actuales };
      delete resto[fila.clave];
      return resto;
    });
    if (ok) {
      avisar(`${fila.etiqueta}: ${activo ? "prendido" : "apagado"}`);
    }
  }

  function alCambiarToggle(fila: FilaConfig, activo: boolean) {
    if (CRITICAS[fila.clave]) {
      setConfirmando({ fila, activo });
      return;
    }
    void guardarToggle(fila, activo);
  }

  // Todas las secciones (sin filtrar): para las pestañas.
  const todas = useMemo(() => {
    const lista: { titulo: string; filas: FilaConfig[] }[] = [];
    for (const fila of filas) {
      if (fila.esSeccion) continue;
      const titulo = tituloSeccion(fila.seccion);
      let seccion = lista.find((item) => item.titulo === titulo);
      if (!seccion) {
        seccion = { titulo, filas: [] };
        lista.push(seccion);
      }
      seccion.filas.push(fila);
    }
    return lista;
  }, [filas]);

  // Con búsqueda: lo que coincide, de todas las secciones.
  const encontradas = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    if (!termino) return [];
    return todas
      .map((seccion) => ({
        ...seccion,
        filas: seccion.filas.filter((fila) =>
          normalizar([fila.etiqueta, fila.clave, descripcion(fila.clave), seccion.titulo].join(" ")).includes(termino)
        ),
      }))
      .filter((seccion) => seccion.filas.length);
  }, [todas, busqueda]);

  const titulos = [...todas.map((seccion) => seccion.titulo), RULETA];
  const elegida = titulos.includes(pestana) ? pestana : titulos[0] || RULETA;
  const buscando = Boolean(busqueda.trim());
  const estadoWeb = ESTADO_WEB.map((item) => ({
    ...item,
    fila: filas.find((fila) => fila.clave === item.clave && fila.tipo === "toggle"),
  })).filter((item) => item.fila);

  return (
    <>
      <Encabezado
        titulo="Configuración"
        subtitulo={
          <span className="inline-flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" />
            Los cambios se aplican en la web en segundos.
          </span>
        }
        accion={
          datos && (
            <Boton
              variante="fantasma"
              tamano="chico"
              onClick={recargar}
              cargando={recargando}
              icono={<RefreshCw size={15} />}
              aria-label="Actualizar"
              className="h-11 w-11 px-0"
            />
          )
        }
      />

      {cargando && <Esqueleto filas={6} />}

      {!cargando && error && !datos && (
        <CajaError mensaje={error} onReintentar={recargar} />
      )}

      {datos && (
        <>
          {/* Estado de la web: lo que más se toca, de un vistazo. */}
          {estadoWeb.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {estadoWeb.map(({ clave, titulo, prendido, apagado, fila }) => {
                const activo = estaHabilitada(optimistas[clave] ?? fila!.valor);
                return (
                  <div
                    key={clave}
                    className={`relative overflow-hidden rounded-2xl border p-3.5 transition ${
                      activo
                        ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                        : "border-red-500/40 bg-red-500/[0.08]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl ${
                        activo ? "bg-emerald-400/30" : "bg-red-400/30"
                      }`}
                    />
                    <p className="relative text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {titulo}
                    </p>
                    <div className="relative mt-1 flex items-center justify-between gap-2">
                      <p
                        className={`flex items-center gap-1.5 text-base font-black ${
                          activo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${activo ? "animate-pulse bg-emerald-500" : "bg-red-500"}`}
                        />
                        {activo ? prendido : apagado}
                      </p>
                      <Interruptor
                        activo={activo}
                        onCambiar={(valor) => alCambiarToggle(fila!, valor)}
                        deshabilitado={optimistas[clave] !== undefined}
                        etiqueta={titulo}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sticky top-[calc(49px+max(0.5rem,env(safe-area-inset-top)))] z-20 -mx-4 bg-[var(--page-bg)]/90 px-4 pb-3 pt-1 backdrop-blur-xl sm:mx-0 sm:px-0 lg:top-0">
            <label className="relative block">
              <span className="sr-only">Buscar una opción</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar en todo (ej. urgente, puntos, rojo)"
                className={`${claseInput} h-11 pl-10 pr-11`}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={16} />
                </button>
              )}
            </label>

            {/* Pestañas por sección */}
            {!buscando && (
              <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {titulos.map((titulo) => {
                  const info = infoSeccion(titulo);
                  const Icono = info.icono;
                  const activa = titulo === elegida;
                  return (
                    <button
                      key={titulo}
                      type="button"
                      onClick={() => setPestana(titulo)}
                      aria-pressed={activa}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition ${
                        activa
                          ? "border-transparent text-white shadow-md"
                          : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                      style={activa ? { background: info.color } : undefined}
                    >
                      <Icono size={14} style={activa ? undefined : { color: info.color }} />
                      {titulo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {buscando ? (
            encontradas.length === 0 ? (
              <Vacio
                titulo="Nada coincide"
                texto={`No hay opciones que contengan «${busqueda.trim()}».`}
                icono={<Search size={30} strokeWidth={1.5} />}
              />
            ) : (
              encontradas.map((seccion) => (
                <SeccionConfig
                  key={seccion.titulo}
                  titulo={seccion.titulo}
                  filas={seccion.filas}
                  todasLasFilas={filas}
                  optimistas={optimistas}
                  onToggle={alCambiarToggle}
                  guardar={guardar}
                />
              ))
            )
          ) : elegida === RULETA ? (
            <>
              <CabeceraSeccion titulo={RULETA} />
              <EditorRuleta />
              <p className="mb-2 mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Giros de regalo</p>
              <GirosRuleta />
            </>
          ) : (
            <SeccionConfig
              titulo={elegida}
              filas={todas.find((seccion) => seccion.titulo === elegida)?.filas ?? []}
              todasLasFilas={filas}
              optimistas={optimistas}
              onToggle={alCambiarToggle}
              guardar={guardar}
            />
          )}
        </>
      )}

      <DialogoConfirmar
        abierto={Boolean(confirmando)}
        titulo={
          confirmando
            ? `${confirmando.activo ? "¿Prender" : "¿Apagar"} «${
                confirmando.fila.etiqueta
              }»?`
            : ""
        }
        mensaje={
          confirmando && (
            <>
              <p>
                {confirmando.activo
                  ? CRITICAS[confirmando.fila.clave]?.prender
                  : CRITICAS[confirmando.fila.clave]?.apagar}
              </p>
              {confirmando.fila.comentario && (
                <p className="mt-3 rounded-xl bg-[var(--kint-panel-soft)] px-3 py-2 text-[13px] italic">
                  {confirmando.fila.comentario}
                </p>
              )}
            </>
          )
        }
        textoConfirmar={confirmando?.activo ? "Prender" : "Apagar"}
        peligro={confirmando ? !confirmando.activo : false}
        onCancelar={() => setConfirmando(null)}
        onConfirmar={() => {
          if (!confirmando) return;
          const { fila, activo } = confirmando;
          setConfirmando(null);
          void guardarToggle(fila, activo);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Una sección                                                          */
/* ------------------------------------------------------------------ */

function CabeceraSeccion({ titulo, cantidad }: { titulo: string; cantidad?: number }) {
  const info = infoSeccion(titulo);
  const Icono = info.icono;
  return (
    <div
      className="mb-3 mt-2 flex items-center gap-3 rounded-2xl border p-3.5"
      style={{
        borderColor: `color-mix(in srgb, ${info.color} 35%, transparent)`,
        background: `linear-gradient(120deg, color-mix(in srgb, ${info.color} 16%, transparent), transparent 70%)`,
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
        style={{ background: info.color, boxShadow: `0 8px 20px color-mix(in srgb, ${info.color} 40%, transparent)` }}
      >
        <Icono size={21} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black leading-tight">{titulo}</p>
        <p className="text-xs text-[var(--text-muted)]">{info.detalle}</p>
      </div>
      {cantidad !== undefined && (
        <span className="rounded-full bg-[var(--kint-panel-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--text-muted)]">
          {cantidad} {cantidad === 1 ? "opción" : "opciones"}
        </span>
      )}
    </div>
  );
}

function SeccionConfig({
  titulo,
  filas,
  todasLasFilas,
  optimistas,
  onToggle,
  guardar,
}: {
  titulo: string;
  filas: FilaConfig[];
  todasLasFilas: FilaConfig[];
  optimistas: Record<string, string>;
  onToggle: (fila: FilaConfig, activo: boolean) => void;
  guardar: Guardar;
}) {
  // Filamentos: una grilla de colores. Fidelidad: los hitos en cuadritos.
  const colores = filas.filter((fila) => fila.clave.startsWith("filamento_") && fila.tipo === "toggle");
  const hitos = filas
    .filter((fila) => /^fidelidad_hito_\d+$/.test(fila.clave))
    .sort((a, b) => Number(a.clave.split("_").pop()) - Number(b.clave.split("_").pop()));
  const resto = filas.filter((fila) => !colores.includes(fila) && !hitos.includes(fila));
  const llaves = resto.filter((fila) => fila.tipo === "toggle");
  const valores = resto.filter((fila) => fila.tipo !== "toggle");

  return (
    <section className="mb-6">
      <CabeceraSeccion titulo={titulo} cantidad={filas.length} />

      {llaves.length > 0 && (
        <div className="grid gap-2.5 md:grid-cols-2">
          {llaves.map((fila) => (
            <Tarjeta key={fila.fila}>
              <FilaAjuste
                fila={fila}
                filas={todasLasFilas}
                valorOptimista={optimistas[fila.clave]}
                onToggle={(activo) => onToggle(fila, activo)}
                guardar={guardar}
              />
            </Tarjeta>
          ))}
        </div>
      )}

      {valores.length > 0 && (
        <div className={`grid gap-2.5 md:grid-cols-2 ${llaves.length ? "mt-2.5" : ""}`}>
          {valores.map((fila) => (
            <Tarjeta key={fila.fila}>
              <FilaAjuste
                fila={fila}
                filas={todasLasFilas}
                onToggle={() => undefined}
                guardar={guardar}
              />
            </Tarjeta>
          ))}
        </div>
      )}

      {hitos.length > 0 && (
        <Tarjeta className="mt-2.5 p-4">
          <p className="font-bold">Cupones por cantidad de pedidos</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Al llegar a esa cantidad de pedidos, el cliente recibe un cupón con ese descuento.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {hitos.map((fila) => (
              <div key={fila.fila} className="rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] p-2.5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Pedido n.º {fila.clave.split("_").pop()}
                </p>
                <EditorValor key={String(fila.valor)} fila={fila} filas={todasLasFilas} guardar={guardar} compacto />
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      {colores.length > 0 && (
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${resto.length ? "mt-2.5" : ""}`}>
          {colores.map((fila) => {
            const nombre = fila.etiqueta.replace(/^filamento\s+/i, "");
            const activo = estaHabilitada(optimistas[fila.clave] ?? fila.valor);
            const mini = fotoFilamento(nombre)?.mini;
            return (
              <div
                key={fila.fila}
                className={`flex items-center gap-2.5 rounded-2xl border p-2.5 transition ${
                  activo
                    ? "border-[var(--kint-panel-border)] bg-[var(--kint-panel)]"
                    : "border-dashed border-[var(--kint-panel-border)] bg-transparent opacity-60"
                }`}
              >
                <span
                  aria-hidden
                  className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center ring-1 ring-black/15 dark:ring-white/20"
                  style={mini ? { backgroundImage: `url("${mini}")` } : { background: colorFilamento(nombre) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{nombre}</span>
                <Interruptor
                  activo={activo}
                  onCambiar={(valor) => onToggle(fila, valor)}
                  deshabilitado={optimistas[fila.clave] !== undefined}
                  etiqueta={fila.etiqueta}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ruleta: giros de regalo                                              */
/* ------------------------------------------------------------------ */

const CANTIDADES_GIROS = [1, 3, 5, 10];

function GirosRuleta() {
  const { datos, setDatos, error, cargando, recargar } = useDatosAdmin("admin_ruleta_giros_listar", {});
  const avisar = useAvisos();
  const [email, setEmail] = useState("");
  const [giros, setGiros] = useState(3);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState("");
  const [sugerencias, setSugerencias] = useState<ClienteAdmin[]>([]);
  const lista = datos?.giros ?? [];

  async function buscar(texto: string) {
    setEmail(texto);
    if (texto.trim().length < 2) {
      setSugerencias([]);
      return;
    }
    try {
      const respuesta = await accionAdmin("admin_clientes_buscar", { q: texto.trim() });
      setSugerencias(respuesta.clientes.slice(0, 5));
    } catch {
      setSugerencias([]);
    }
  }

  async function guardarGiros(correo: string, cantidad: number, textoNota = "") {
    setGuardando(correo + cantidad);
    try {
      const respuesta = await accionAdmin("admin_ruleta_giros_guardar", {
        email: correo,
        giros: cantidad,
        nota: textoNota,
      });
      setDatos({ giros: respuesta.giros });
      avisar(
        cantidad === 0
          ? "Giros quitados"
          : cantidad === -1
          ? "Listo: giros ilimitados"
          : `Listo: ${cantidad} ${cantidad === 1 ? "giro" : "giros"} de regalo`
      );
      return true;
    } catch (errorGuardado) {
      avisar(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo guardar.", "error");
      return false;
    } finally {
      setGuardando("");
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <Tarjeta className="p-4">
        <p className="font-black">Regalar giros</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Se usan cuando no le toca la tirada normal y no le cambian la espera de 2 días. Le aparecen en /ruleta.
        </p>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Cliente (correo o nombre)</span>
          <input
            value={email}
            onChange={(evento) => void buscar(evento.target.value)}
            placeholder="amigo@gmail.com"
            autoComplete="off"
            className={`${claseInput} h-11`}
          />
        </label>
        {sugerencias.length > 0 && (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-[var(--kint-panel-border)]">
            {sugerencias.map((cliente) => (
              <button
                key={cliente.email}
                type="button"
                onClick={() => {
                  setEmail(cliente.email);
                  setSugerencias([]);
                }}
                className="flex w-full items-center justify-between gap-2 border-b border-[var(--kint-panel-border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--kint-panel-soft)]"
              >
                <span className="min-w-0 truncate font-bold">{cliente.alias || cliente.nombre}</span>
                <span className="truncate text-xs text-[var(--text-muted)]">{cliente.email}</span>
              </button>
            ))}
          </div>
        )}

        <p className="mb-1.5 mt-3 text-xs font-bold text-[var(--text-muted)]">Cuántos giros</p>
        <div className="flex flex-wrap gap-1.5">
          {[...CANTIDADES_GIROS, -1].map((cantidad) => (
            <button
              key={cantidad}
              type="button"
              onClick={() => setGiros(cantidad)}
              aria-pressed={giros === cantidad}
              className={`h-10 min-w-12 rounded-xl border px-3 text-sm font-black transition ${
                giros === cantidad
                  ? "border-transparent bg-fuchsia-500 text-white shadow-md"
                  : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {cantidad === -1 ? "∞ Ilimitados" : cantidad}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={999}
            value={giros > 0 && !CANTIDADES_GIROS.includes(giros) ? giros : ""}
            onChange={(evento) => setGiros(Math.max(1, Math.min(999, Math.floor(Number(evento.target.value) || 1))))}
            placeholder="Otro"
            aria-label="Otra cantidad"
            className={`${claseInput} h-10 w-20`}
          />
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Nota (opcional, solo la ves vos)</span>
          <input value={nota} onChange={(evento) => setNota(evento.target.value)} maxLength={80} placeholder="Ej.: mi amigo Juan" className={`${claseInput} h-11`} />
        </label>

        <Boton
          variante="principal"
          className="mt-4 w-full"
          cargando={Boolean(guardando) && guardando === email.trim().toLowerCase() + giros}
          disabled={!email.trim()}
          icono={<Gift size={16} />}
          onClick={async () => {
            const ok = await guardarGiros(email.trim().toLowerCase(), giros, nota.trim());
            if (ok) {
              setEmail("");
              setNota("");
            }
          }}
        >
          Regalar {giros === -1 ? "giros ilimitados" : `${giros} ${giros === 1 ? "giro" : "giros"}`}
        </Boton>
      </Tarjeta>

      <Tarjeta className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-black">Con giros de regalo</p>
          <Boton variante="fantasma" tamano="chico" onClick={recargar} icono={<RefreshCw size={14} />} aria-label="Actualizar" className="h-9 w-9 px-0" />
        </div>
        {cargando && !datos ? (
          <div className="mt-3">
            <Esqueleto filas={2} />
          </div>
        ) : error && !datos ? (
          <div className="mt-3">
            <CajaError mensaje={error} onReintentar={recargar} />
          </div>
        ) : lista.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">Nadie tiene giros de regalo todavía.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {lista.map((item) => (
              <div key={item.email} className="flex items-center gap-3 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] p-2.5">
                <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 px-2 text-sm font-black text-fuchsia-500">
                  {item.giros === -1 ? "∞" : item.giros}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.nombre || item.email}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {item.email}
                    {item.nota ? ` · ${item.nota}` : ""}
                  </p>
                </div>
                {item.giros !== -1 && (
                  <Boton
                    tamano="chico"
                    variante="secundario"
                    aria-label="Un giro más"
                    cargando={guardando === item.email + (item.giros + 1)}
                    onClick={() => void guardarGiros(item.email, item.giros + 1, item.nota)}
                    className="w-9 px-0"
                  >
                    +1
                  </Boton>
                )}
                <Boton
                  tamano="chico"
                  variante="peligro"
                  aria-label="Quitar giros"
                  cargando={guardando === item.email + 0}
                  onClick={() => void guardarGiros(item.email, 0)}
                  icono={<Trash2 size={14} />}
                  className="w-9 px-0"
                />
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Una opción                                                           */
/* ------------------------------------------------------------------ */

function FilaAjuste({
  fila,
  filas,
  valorOptimista,
  onToggle,
  guardar,
}: {
  fila: FilaConfig;
  filas: FilaConfig[];
  valorOptimista?: string;
  onToggle: (activo: boolean) => void;
  guardar: Guardar;
}) {
  const esToggle = fila.tipo === "toggle";
  const texto = descripcion(fila.clave);
  const guardandoToggle = valorOptimista !== undefined;
  const activo = estaHabilitada(valorOptimista ?? fila.valor);
  const idDescripcion = `config-${fila.fila}-desc`;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{fila.etiqueta}</p>
          {texto && (
            <p
              id={idDescripcion}
              className="mt-0.5 text-xs leading-4 text-[var(--text-muted)]"
            >
              {texto}
            </p>
          )}
        </div>
        {esToggle && (
          <div className="flex min-h-11 items-center">
            <Interruptor
              activo={activo}
              onCambiar={onToggle}
              deshabilitado={guardandoToggle}
              etiqueta={fila.etiqueta}
            />
          </div>
        )}
      </div>

      {!esToggle && (
        <EditorValor
          key={String(fila.valor)}
          fila={fila}
          filas={filas}
          guardar={guardar}
        />
      )}

      <EditorComentario
        key={fila.comentario}
        fila={fila}
        esMensaje={esToggle || COMENTARIO_ES_MENSAJE.has(fila.clave)}
        guardar={guardar}
      />
    </div>
  );
}

function EditorValor({
  fila,
  filas,
  guardar,
  compacto = false,
}: {
  fila: FilaConfig;
  filas: FilaConfig[];
  guardar: Guardar;
  compacto?: boolean;
}) {
  const avisar = useAvisos();
  const original = String(fila.valor ?? "");
  const [borrador, setBorrador] = useState(original);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cambiado = borrador !== original;

  async function enviar(valorTexto: string) {
    let valor: string | number = valorTexto;

    if (fila.tipo === "numero") {
      const resultado = validarNumero(fila.clave, valorTexto, filas);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      valor = resultado.numero;
    } else {
      valor = valorTexto.trim();
    }

    setError("");
    setGuardando(true);
    const ok = await guardar(fila.clave, { valor });
    setGuardando(false);
    if (ok) {
      /* Si la hoja queda con el mismo valor (ej. "020" → 20) no se remonta
         por key: se vuelve a mostrar el valor guardado. */
      setBorrador(original);
      avisar(`${fila.etiqueta} guardado`);
    } else if (fila.opciones.length > 0) {
      setBorrador(original);
    }
  }

  if (fila.opciones.length > 0) {
    const opciones = fila.opciones.includes(original)
      ? fila.opciones
      : [original, ...fila.opciones];

    return (
      <div className="mt-2.5">
        <select
          value={borrador}
          disabled={guardando}
          aria-label={fila.etiqueta}
          onChange={(evento) => {
            setBorrador(evento.target.value);
            void enviar(evento.target.value);
          }}
          className={`${claseInput} h-11 disabled:opacity-60`}
        >
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion || "Sin valor"}
            </option>
          ))}
        </select>
      </div>
    );
  }

  /* Unidad a la vista ("%" antes del número, "días" después). */
  const unidad = unidadConfig(fila, descripcion(fila.clave));
  const textoUnidad = [unidad.prefijo, unidad.sufijo].filter(Boolean).join(" ");

  const anchoInput = compacto
    ? "w-full"
    : fila.tipo === "numero"
      ? unidad.sufijo && unidad.sufijo.length > 4
        ? "w-40"
        : "w-32"
      : fila.tipo === "fecha"
      ? "w-44"
      : "min-w-0 flex-1";
  const espacioPrefijo = unidad.prefijo
    ? unidad.prefijo.length > 1
      ? "pl-11"
      : "pl-8"
    : "";
  const espacioSufijo = unidad.sufijo
    ? unidad.sufijo.length > 4
      ? "pr-20"
      : "pr-14"
    : "";
  const claseUnidad =
    "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-black text-[var(--text-muted)]";

  return (
    <form
      className={compacto ? "mt-1.5" : "mt-2.5"}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (cambiado) void enviar(borrador);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className={`relative ${anchoInput}`}>
          {unidad.prefijo && (
            <span aria-hidden="true" className={`${claseUnidad} left-3.5`}>
              {unidad.prefijo}
            </span>
          )}
          <input
            type={fila.tipo === "fecha" ? "date" : "text"}
            inputMode={fila.tipo === "numero" ? "decimal" : undefined}
            value={borrador}
            disabled={guardando}
            aria-label={
              textoUnidad ? `${fila.etiqueta} (${textoUnidad})` : fila.etiqueta
            }
            aria-invalid={Boolean(error)}
            onChange={(evento) => {
              setBorrador(evento.target.value);
              setError("");
            }}
            className={`${claseInput} h-11 ${espacioPrefijo} ${espacioSufijo} ${
              error ? "border-red-500" : ""
            }`}
          />
          {unidad.sufijo && (
            <span aria-hidden="true" className={`${claseUnidad} right-3.5`}>
              {unidad.sufijo}
            </span>
          )}
        </div>
        {cambiado && (
          <>
            <Boton type="submit" variante="principal" cargando={guardando}>
              Guardar
            </Boton>
            <Boton
              variante="fantasma"
              disabled={guardando}
              onClick={() => {
                setBorrador(original);
                setError("");
              }}
            >
              Deshacer
            </Boton>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}

function EditorComentario({
  fila,
  esMensaje,
  guardar,
}: {
  fila: FilaConfig;
  esMensaje: boolean;
  guardar: Guardar;
}) {
  const avisar = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(fila.comentario);
  const [guardando, setGuardando] = useState(false);
  const titulo = esMensaje ? "Mensaje para el cliente" : "Comentario";
  const idCampo = `config-${fila.fila}-comentario`;

  async function enviar() {
    setGuardando(true);
    const ok = await guardar(fila.clave, { comentario: borrador.trim() });
    setGuardando(false);
    if (ok) avisar(`${titulo} guardado`);
  }

  if (!abierto) {
    return (
      <div className="mt-1.5">
        {fila.comentario && (
          <p
            className={`mb-0.5 line-clamp-2 text-[13px] leading-5 text-[var(--text-muted)] ${
              esMensaje ? "italic" : ""
            }`}
          >
            {esMensaje ? `«${fila.comentario}»` : fila.comentario}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setBorrador(fila.comentario);
            setAbierto(true);
          }}
          className="-ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          <MessageSquareText size={14} />
          {fila.comentario
            ? esMensaje
              ? "Editar mensaje"
              : "Editar comentario"
            : esMensaje
            ? "Agregar mensaje"
            : "Agregar comentario"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-[var(--kint-panel-soft)] p-3">
      <label
        htmlFor={idCampo}
        className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]"
      >
        {titulo}
      </label>
      <textarea
        id={idCampo}
        value={borrador}
        onChange={(evento) => setBorrador(evento.target.value)}
        rows={4}
        maxLength={1000}
        disabled={guardando}
        className={`${claseInput} resize-y leading-5`}
      />
      {esMensaje && (
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
          Es lo que ve el cliente cuando esta opción está apagada o como
          descripción en la web.
        </p>
      )}
      <div className="mt-2.5 flex justify-end gap-2">
        <Boton
          variante="fantasma"
          disabled={guardando}
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </Boton>
        <Boton
          variante="principal"
          cargando={guardando}
          disabled={borrador.trim() === fila.comentario.trim()}
          onClick={() => void enviar()}
        >
          Guardar
        </Boton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ruleta: turnos, premios con su chance y canjes                       */
/* ------------------------------------------------------------------ */

const TIPOS_PREMIO: { valor: PremioRuletaConfig["tipo"]; nombre: string }[] = [
  { valor: "puntos", nombre: "Puntos" },
  { valor: "descuento", nombre: "Descuento %" },
  { valor: "regalo", nombre: "Regalo (vale)" },
  { valor: "regalo_tienda", nombre: "Producto de la tienda (sale uno al azar)" },
  { valor: "otra", nombre: "Otra tirada" },
];

function rarezaDe(chance: number) {
  if (chance >= 10) return "Común";
  if (chance >= 4) return "Raro";
  if (chance >= 1.5) return "Épico";
  return "Legendario";
}

function EditorRuleta() {
  const { datos, setDatos, error, cargando, recargar } = useDatosAdmin("admin_ruleta_config_listar", {});
  const avisar = useAvisos();
  const [borrador, setBorrador] = useState<ConfigRuleta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const config = borrador ?? datos?.config ?? null;
  const cambiado = Boolean(borrador);

  function cambiar(cambios: Partial<ConfigRuleta>) {
    if (!config) return;
    setBorrador({ ...config, ...cambios });
  }
  function cambiarPremio(indice: number, cambios: Partial<PremioRuletaConfig>) {
    if (!config) return;
    cambiar({ premios: config.premios.map((premio, i) => (i === indice ? { ...premio, ...cambios } : premio)) });
  }
  function cambiarCanje(indice: number, cambios: Partial<CanjeRuletaConfig>) {
    if (!config) return;
    cambiar({ canjes: config.canjes.map((canje, i) => (i === indice ? { ...canje, ...cambios } : canje)) });
  }

  async function guardar() {
    if (!config) return;
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_ruleta_config_guardar", { config });
      setDatos(respuesta);
      setBorrador(null);
      avisar("Ruleta guardada");
    } catch (errorGuardado) {
      avisar(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando && !datos) return <Esqueleto filas={4} />;
  if (error && !datos) return <CajaError mensaje={error} onReintentar={recargar} />;
  if (!config) return null;

  const activos = config.premios.filter((premio) => premio.activo);
  const promedio =
    activos.length && config.porciones
      ? (activos.reduce((suma, premio) => suma + premio.chance, 0) / activos.length) * Math.min(config.porciones, activos.length)
      : 0;
  const numero = (valor: string) => Number(valor.replace(",", ".")) || 0;
  const campoChico = `${claseInput} h-10`;

  return (
    <div className="space-y-3">
      {/* Turnos */}
      <Tarjeta className="p-4">
        <p className="font-black">Giros</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Un giro cada (horas)</span>
            <input type="number" min={1} max={720} value={config.horas} onChange={(e) => cambiar({ horas: numero(e.target.value) })} className={campoChico} />
            <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">48 = cada 2 días</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Se guardan hasta</span>
            <input type="number" min={1} max={20} value={config.acumulables} onChange={(e) => cambiar({ acumulables: numero(e.target.value) })} className={campoChico} />
            <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">giros sin usar</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Girar con puntos</span>
            <input type="number" min={0} value={config.costoPuntos} onChange={(e) => cambiar({ costoPuntos: numero(e.target.value) })} className={campoChico} />
            <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">✨ por giro (0 = no se puede)</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Premios por día</span>
            <input type="number" min={2} max={10} value={config.porciones} onChange={(e) => cambiar({ porciones: numero(e.target.value) })} className={campoChico} />
            <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">se sortean de la lista</span>
          </label>
        </div>
        <p className="mb-1.5 mt-4 text-xs font-bold text-[var(--text-muted)]">Qué ve el cliente de las chances</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["rareza", "Rareza (Común, Raro, Épico…)"],
              ["porcentaje", "Rareza y %"],
              ["nada", "Nada"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => cambiar({ mostrar: valor })}
              aria-pressed={config.mostrar === valor}
              className={`h-9 rounded-xl border px-3 text-xs font-black transition ${
                config.mostrar === valor
                  ? "border-transparent bg-fuchsia-500 text-white"
                  : "border-[var(--kint-panel-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </Tarjeta>

      {/* Premios */}
      <Tarjeta className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-black">Premios ({activos.length} activos)</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Chance = % de que salga ese premio el día que está en la rueda. Lo que falta hasta 100 es «Sin suerte».
            Cada día entra al menos un Legendario (menos de 1,5%), que es el misterio. En un día promedio se gana
            ~{Math.round(promedio)}% de las veces.
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {config.premios.map((premio, indice) => (
            <div
              key={premio.id + indice}
              className={`grid grid-cols-2 gap-2 rounded-xl border p-2.5 sm:grid-cols-[1.3fr_1.4fr_0.8fr_0.8fr_auto] sm:items-end ${
                premio.activo ? "border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)]" : "border-dashed border-[var(--kint-panel-border)] opacity-60"
              }`}
            >
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Tipo</span>
                <select
                  value={premio.tipo}
                  onChange={(e) => cambiarPremio(indice, { tipo: e.target.value as PremioRuletaConfig["tipo"] })}
                  className={campoChico}
                >
                  {TIPOS_PREMIO.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">
                  {premio.tipo === "regalo" ? "Nombre en la rueda" : "Nombre (vacío = automático)"}
                </span>
                <input
                  value={premio.nombre}
                  maxLength={28}
                  onChange={(e) => cambiarPremio(indice, { nombre: e.target.value })}
                  placeholder={premio.tipo === "puntos" ? `${premio.valor} puntos` : premio.tipo === "descuento" ? `${premio.valor}% OFF` : ""}
                  disabled={premio.tipo === "regalo_tienda" || premio.tipo === "otra"}
                  className={`${campoChico} disabled:opacity-50`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">
                  {premio.tipo === "puntos" ? "Puntos" : premio.tipo === "descuento" ? "% OFF" : "Valor"}
                </span>
                <input
                  value={String(premio.valor ?? "")}
                  onChange={(e) =>
                    cambiarPremio(indice, {
                      valor: premio.tipo === "puntos" || premio.tipo === "descuento" ? numero(e.target.value) : e.target.value,
                    })
                  }
                  disabled={premio.tipo === "regalo_tienda" || premio.tipo === "otra"}
                  className={`${campoChico} disabled:opacity-50`}
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                  Chance %<span className="text-fuchsia-500">{rarezaDe(premio.chance)}</span>
                </span>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={60}
                  value={premio.chance}
                  onChange={(e) => cambiarPremio(indice, { chance: numero(e.target.value) })}
                  className={campoChico}
                />
              </label>
              <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                <Interruptor activo={premio.activo} onCambiar={(activo) => cambiarPremio(indice, { activo })} etiqueta="Activo" />
                <Boton
                  tamano="chico"
                  variante="fantasma"
                  aria-label="Borrar premio"
                  onClick={() => cambiar({ premios: config.premios.filter((_, i) => i !== indice) })}
                  icono={<Trash2 size={14} />}
                  className="w-9 px-0"
                />
              </div>
            </div>
          ))}
        </div>
        <Boton
          variante="secundario"
          tamano="chico"
          className="mt-2.5"
          icono={<Plus size={14} />}
          onClick={() =>
            cambiar({
              premios: [
                ...config.premios,
                { id: `nuevo${Date.now().toString(36)}`, tipo: "puntos", nombre: "", valor: 50, chance: 5, color: "", activo: true },
              ],
            })
          }
        >
          Agregar premio
        </Boton>
      </Tarjeta>

      {/* Canjes */}
      <Tarjeta className="p-4">
        <p className="font-black">Canjes de puntos</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Lo que el cliente puede cambiar por puntos cuando quiera.</p>
        <div className="mt-3 space-y-2">
          {config.canjes.map((canje, indice) => (
            <div key={canje.id + indice} className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] p-2.5 sm:grid-cols-[2fr_1fr_0.8fr_0.7fr_auto] sm:items-end">
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Nombre</span>
                <input value={canje.nombre} maxLength={60} onChange={(e) => cambiarCanje(indice, { nombre: e.target.value })} className={campoChico} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Tipo</span>
                <select value={canje.tipo} onChange={(e) => cambiarCanje(indice, { tipo: e.target.value as CanjeRuletaConfig["tipo"] })} className={campoChico}>
                  <option value="descuento">Descuento %</option>
                  <option value="regalo">Regalo (vale)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">{canje.tipo === "descuento" ? "% OFF" : "Qué recibe"}</span>
                <input
                  value={String(canje.valor ?? "")}
                  onChange={(e) => cambiarCanje(indice, { valor: canje.tipo === "descuento" ? numero(e.target.value) : e.target.value })}
                  className={campoChico}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">Cuesta ✨</span>
                <input type="number" min={1} value={canje.puntos} onChange={(e) => cambiarCanje(indice, { puntos: numero(e.target.value) })} className={campoChico} />
              </label>
              <div className="flex items-center justify-end">
                <Boton
                  tamano="chico"
                  variante="fantasma"
                  aria-label="Borrar canje"
                  onClick={() => cambiar({ canjes: config.canjes.filter((_, i) => i !== indice) })}
                  icono={<Trash2 size={14} />}
                  className="w-9 px-0"
                />
              </div>
            </div>
          ))}
        </div>
        <Boton
          variante="secundario"
          tamano="chico"
          className="mt-2.5"
          icono={<Plus size={14} />}
          onClick={() =>
            cambiar({
              canjes: [...config.canjes, { id: `canje${Date.now().toString(36)}`, nombre: "", puntos: 200, tipo: "regalo", valor: "" }],
            })
          }
        >
          Agregar canje
        </Boton>
      </Tarjeta>

      {/* Vista previa de hoy */}
      {datos && (
        <Tarjeta className="p-4">
          <p className="font-black">Rueda de hoy {cambiado && <span className="text-xs font-bold text-amber-500">(guardá para ver los cambios)</span>}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {datos.hoy.map((premio, indice) => (
              <span
                key={`${premio.nombre}-${indice}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  premio.misterio ? "bg-amber-400/20 text-amber-500 ring-1 ring-inset ring-amber-400/50" : "bg-[var(--kint-panel-soft)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: premio.color }} />
                {premio.misterio && "❓ "}
                {premio.nombre} · {String(premio.chance).replace(".", ",")}%
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">❓ = el misterio del día (el más raro): el cliente no ve qué es hasta que lo gana.</p>
        </Tarjeta>
      )}

      {cambiado && (
        <div className="sticky bottom-3 z-20 flex justify-end gap-2 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)]/95 p-2.5 shadow-xl backdrop-blur">
          <Boton variante="fantasma" disabled={guardando} onClick={() => setBorrador(null)}>
            Deshacer
          </Boton>
          <Boton variante="principal" cargando={guardando} onClick={() => void guardar()}>
            Guardar ruleta
          </Boton>
        </div>
      )}
    </div>
  );
}
