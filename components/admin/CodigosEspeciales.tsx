"use client";

import { useState } from "react";
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { CodigoEspecial, FilaConfig } from "@/lib/admin-tipos";
import { extrasFilamento } from "@/lib/colores-filamento";
import { Boton, claseInput, Hoja, Interruptor, Tarjeta, useAvisos } from "@/components/admin/ui";

/*
 * Códigos especiales (ej. P-BETO para un curso): un % de descuento con
 * nombre, cuántas veces se puede usar y qué colores van (uno solo o varios).
 * Cotizar los muestra al escribirlos y el servidor revisa las reglas.
 */

type Borrador = {
  original: string;
  codigo: string;
  nombre: string;
  descuento: string;
  usosMaximos: string; // "0" = sin límite
  colores: string[];
  bloqueados: string[];
  boquillaFija: CodigoEspecial["boquillaFija"];
  armadoFijo: CodigoEspecial["armadoFijo"];
  unSoloColor: boolean;
  activo: boolean;
  vence: string;
};

const BOQUILLAS: { valor: CodigoEspecial["boquillaFija"]; texto: string }[] = [
  { valor: "", texto: "La elige el cliente" },
  { valor: "0.2", texto: "0.2 mm" },
  { valor: "0.4", texto: "0.4 mm" },
  { valor: "kint", texto: "Que decida Kint" },
];
const ARMADOS: { valor: CodigoEspecial["armadoFijo"]; texto: string }[] = [
  { valor: "", texto: "Lo elige el cliente" },
  { valor: "si", texto: "Con armado" },
  { valor: "no", texto: "Sin armado" },
];

const NUEVO: Borrador = {
  original: "",
  codigo: "",
  nombre: "",
  descuento: "20",
  usosMaximos: "0",
  colores: [],
  bloqueados: [],
  boquillaFija: "",
  armadoFijo: "",
  unSoloColor: true,
  activo: true,
  vence: "",
};

/* Mismo nombre que usa Cotizar para cada filamento (sale de la clave). */
function nombreDesdeClave(clave: string) {
  return clave
    .replace(/^filamento_/, "")
    .split("_")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function resumenColores(codigo: Pick<CodigoEspecial, "colores" | "unSoloColor" | "bloqueados">) {
  const cuales = codigo.colores.length ? codigo.colores.join(", ") : "todos los colores";
  const fijos = codigo.bloqueados?.length ? `🔒 ${codigo.bloqueados.join(", ")} fijo · ` : "";
  return `${fijos}${codigo.unSoloColor ? "Un solo color" : "Uno o varios colores"} · ${cuales}`;
}

function resumenOpciones(codigo: Pick<CodigoEspecial, "boquillaFija" | "armadoFijo">) {
  return [
    codigo.boquillaFija && `🔒 Boquilla ${BOQUILLAS.find((b) => b.valor === codigo.boquillaFija)?.texto}`,
    codigo.armadoFijo && `🔒 ${ARMADOS.find((a) => a.valor === codigo.armadoFijo)?.texto}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function CodigosEspeciales({ filas }: { filas: FilaConfig[] }) {
  const { datos, setDatos, error, cargando } = useDatosAdmin("admin_codigos_especiales_listar", {});
  const avisar = useAvisos();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  const filamentos = filas
    .filter((fila) => fila.clave.startsWith("filamento_") && fila.tipo === "toggle")
    .map((fila) => ({ nombre: nombreDesdeClave(fila.clave), visible: extrasFilamento(fila.comentario).nombre }));
  const codigos = datos?.codigos ?? [];

  function editar(codigo: CodigoEspecial) {
    setBorrador({
      original: codigo.codigo,
      codigo: codigo.codigo,
      nombre: codigo.nombre,
      descuento: String(codigo.descuento),
      usosMaximos: String(codigo.usosMaximos),
      colores: codigo.colores,
      bloqueados: codigo.bloqueados ?? [],
      boquillaFija: codigo.boquillaFija ?? "",
      armadoFijo: codigo.armadoFijo ?? "",
      unSoloColor: codigo.unSoloColor,
      activo: codigo.activo,
      vence: codigo.vence,
    });
  }

  async function guardar() {
    if (!borrador) return;
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_codigo_especial_guardar", {
        original: borrador.original || undefined,
        codigo: borrador.codigo,
        nombre: borrador.nombre,
        descuento: Number(borrador.descuento),
        usosMaximos: Number(borrador.usosMaximos) || 0,
        colores: borrador.colores,
        bloqueados: borrador.bloqueados,
        boquillaFija: borrador.boquillaFija,
        armadoFijo: borrador.armadoFijo,
        unSoloColor: borrador.unSoloColor,
        activo: borrador.activo,
        vence: borrador.vence,
      });
      setDatos(respuesta);
      avisar(`Código ${borrador.codigo.toUpperCase()} guardado`);
      setBorrador(null);
    } catch (falla) {
      avisar(falla instanceof Error ? falla.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(codigo: string) {
    if (!window.confirm(`¿Borrar el código ${codigo}? Los pedidos que ya lo usaron no cambian.`)) return;
    try {
      setDatos(await accionAdmin("admin_codigo_especial_borrar", { codigo }));
      avisar(`Código ${codigo} borrado`);
      setBorrador(null);
    } catch (falla) {
      avisar(falla instanceof Error ? falla.message : "No se pudo borrar.", "error");
    }
  }

  const cambiar = (cambios: Partial<Borrador>) => setBorrador((actual) => (actual ? { ...actual, ...cambios } : actual));
  const usos = borrador ? (borrador.usosMaximos === "0" ? "sin-limite" : borrador.usosMaximos === "1" ? "una" : "varias") : "";

  return (
    <section className="mb-6">
      <div className="mb-3 mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-black">
            <TicketPercent size={18} className="text-pink-500" /> Códigos especiales
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Para un curso o un grupo (ej. P-BETO): descuento, cuántas veces se usa y qué colores pueden elegir.
          </p>
        </div>
        <Boton variante="secundario" tamano="chico" icono={<Plus size={14} />} onClick={() => setBorrador({ ...NUEVO })}>
          Nuevo código
        </Boton>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {cargando && !datos && <p className="text-sm text-[var(--text-muted)]">Cargando…</p>}
      {datos && codigos.length === 0 && (
        <Tarjeta className="p-4 text-sm text-[var(--text-muted)]">Todavía no hay códigos especiales.</Tarjeta>
      )}

      <div className="grid gap-2.5 md:grid-cols-2">
        {codigos.map((codigo) => (
          <Tarjeta key={codigo.codigo} className={`flex items-start gap-3 p-3.5 ${codigo.activo ? "" : "opacity-60"}`}>
            <span className="rounded-xl bg-pink-500/15 px-2.5 py-1.5 text-sm font-black text-pink-600 dark:text-pink-400">
              {codigo.descuento}%
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black">
                {codigo.codigo}
                {codigo.nombre && <span className="font-semibold text-[var(--text-muted)]"> · {codigo.nombre}</span>}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{resumenColores(codigo)}</p>
              {resumenOpciones(codigo) && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{resumenOpciones(codigo)}</p>}
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Usado {codigo.usados} {codigo.usados === 1 ? "vez" : "veces"}
                {codigo.usosMaximos ? ` de ${codigo.usosMaximos}` : " (sin límite)"}
                {codigo.vence && ` · vence ${codigo.vence.split("-").reverse().join("/")}`}
                {!codigo.activo && " · pausado"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => editar(codigo)}
              aria-label={`Editar ${codigo.codigo}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
            >
              <Pencil size={14} />
            </button>
          </Tarjeta>
        ))}
      </div>

      <Hoja
        abierta={Boolean(borrador)}
        onCerrar={() => !guardando && setBorrador(null)}
        titulo={borrador?.original ? `Editar ${borrador.original}` : "Nuevo código especial"}
        ancha
        pie={
          <div className="flex items-center justify-between gap-2">
            {borrador?.original ? (
              <button
                type="button"
                onClick={() => void borrar(borrador.original)}
                aria-label={`Borrar ${borrador.original}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Boton variante="fantasma" tamano="chico" disabled={guardando} onClick={() => setBorrador(null)}>
                Cancelar
              </Boton>
              <Boton
                variante="principal"
                tamano="chico"
                cargando={guardando}
                disabled={!borrador?.codigo.trim() || !Number(borrador?.descuento)}
                onClick={() => void guardar()}
              >
                Guardar
              </Boton>
            </div>
          </div>
        }
      >
        {borrador && (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_7rem]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Código</span>
                <input
                  value={borrador.codigo}
                  onChange={(e) => cambiar({ codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
                  maxLength={20}
                  placeholder="P-BETO"
                  className={`${claseInput} h-10 font-black tracking-wide`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Nombre (lo ve el cliente)</span>
                <input
                  value={borrador.nombre}
                  onChange={(e) => cambiar({ nombre: e.target.value })}
                  maxLength={60}
                  placeholder="Curso P de Betolaza"
                  className={`${claseInput} h-10`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Descuento</span>
                <span className="relative block">
                  <input
                    value={borrador.descuento}
                    onChange={(e) => cambiar({ descuento: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                    inputMode="numeric"
                    className={`${claseInput} h-10 pr-8`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--text-muted)]">%</span>
                </span>
              </label>
            </div>

            <div>
              <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-muted)]">¿Cuántas veces se puede usar?</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "sin-limite", texto: "Sin límite", valor: "0" },
                  { id: "una", texto: "Una sola vez", valor: "1" },
                  { id: "varias", texto: "Un número de veces", valor: "30" },
                ].map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    onClick={() => cambiar({ usosMaximos: opcion.valor })}
                    className={`h-9 rounded-xl border px-3 text-xs font-bold transition ${
                      usos === opcion.id ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400" : "border-[var(--kint-panel-border)]"
                    }`}
                  >
                    {opcion.texto}
                  </button>
                ))}
                {usos === "varias" && (
                  <input
                    value={borrador.usosMaximos}
                    onChange={(e) => cambiar({ usosMaximos: e.target.value.replace(/\D/g, "").slice(0, 4) || "2" })}
                    inputMode="numeric"
                    aria-label="Cantidad de usos"
                    className={`${claseInput} h-9 w-20`}
                  />
                )}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-muted)]">Colores por maqueta</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { valor: true, texto: "Un solo color" },
                  { valor: false, texto: "Uno o varios (para combinar)" },
                ].map((opcion) => (
                  <button
                    key={opcion.texto}
                    type="button"
                    onClick={() =>
                      cambiar({
                        unSoloColor: opcion.valor,
                        // Con un solo color, puede quedar un fijo como mucho.
                        bloqueados: opcion.valor ? borrador.bloqueados.slice(0, 1) : borrador.bloqueados,
                      })
                    }
                    className={`h-9 rounded-xl border px-3 text-xs font-bold transition ${
                      borrador.unSoloColor === opcion.valor
                        ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                        : "border-[var(--kint-panel-border)]"
                    }`}
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-muted)]">
                🔒 Colores fijos: ya vienen puestos y el cliente no los puede sacar (opcional)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filamentos.map((filamento) => {
                  const fijo = borrador.bloqueados.includes(filamento.nombre);
                  return (
                    <button
                      key={filamento.nombre}
                      type="button"
                      aria-pressed={fijo}
                      onClick={() =>
                        cambiar({
                          bloqueados: fijo
                            ? borrador.bloqueados.filter((c) => c !== filamento.nombre)
                            : borrador.unSoloColor
                            ? [filamento.nombre]
                            : [...borrador.bloqueados, filamento.nombre],
                        })
                      }
                      className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                        fijo ? "border-violet-600 bg-violet-600 text-white" : "border-[var(--kint-panel-border)] hover:border-violet-600"
                      }`}
                    >
                      {fijo && "🔒 "}
                      {filamento.visible || filamento.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                <span>
                  {borrador.bloqueados.length ? "Otros colores que pueden sumar" : "Colores que pueden elegir"}{" "}
                  {borrador.colores.length === 0 && "(ninguno marcado = todos)"}
                </span>
                {borrador.colores.length > 0 && (
                  <button type="button" onClick={() => cambiar({ colores: [] })} className="underline">
                    Permitir todos
                  </button>
                )}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filamentos.map((filamento) => {
                  const elegido = borrador.colores.includes(filamento.nombre);
                  return (
                    <button
                      key={filamento.nombre}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() =>
                        cambiar({
                          colores: elegido
                            ? borrador.colores.filter((c) => c !== filamento.nombre)
                            : [...borrador.colores, filamento.nombre],
                        })
                      }
                      className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                        elegido ? "border-pink-500 bg-pink-500 text-white" : "border-[var(--kint-panel-border)] hover:border-pink-500"
                      }`}
                    >
                      {filamento.visible || filamento.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { titulo: "🔒 Boquilla", opciones: BOQUILLAS, valor: borrador.boquillaFija, clave: "boquillaFija" as const },
                { titulo: "🔒 Armado de piezas", opciones: ARMADOS, valor: borrador.armadoFijo, clave: "armadoFijo" as const },
              ].map((grupo) => (
                <div key={grupo.clave}>
                  <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-muted)]">
                    {grupo.titulo}
                    {grupo.clave === "boquillaFija" && grupo.valor && grupo.valor !== "kint" && (
                      <span className="block font-semibold">Tiene que estar encendida en Configuración, si no el pedido no entra.</span>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.opciones.map((opcion) => (
                      <button
                        key={opcion.valor || "libre"}
                        type="button"
                        aria-pressed={grupo.valor === opcion.valor}
                        onClick={() => cambiar({ [grupo.clave]: opcion.valor } as Partial<Borrador>)}
                        className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                          grupo.valor === opcion.valor
                            ? opcion.valor
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                            : "border-[var(--kint-panel-border)] hover:border-violet-600"
                        }`}
                      >
                        {opcion.texto}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">Vence (opcional)</span>
                <input
                  type="date"
                  value={borrador.vence}
                  onChange={(e) => cambiar({ vence: e.target.value })}
                  className={`${claseInput} h-10 dark:[color-scheme:dark]`}
                />
              </label>
              <div className="flex items-center gap-1 pb-0.5 text-sm font-bold">
                <Interruptor activo={borrador.activo} onCambiar={(activo) => cambiar({ activo })} etiqueta="Código activo" />
                {borrador.activo ? "Activo" : "Pausado"}
              </div>
            </div>

            <p className="rounded-xl bg-[var(--kint-panel-soft)] p-3 text-xs leading-5 text-[var(--text-muted)]">
              El cliente lo escribe en Cotizar. Ve el descuento, y lo fijo (colores, boquilla, armado) ya viene puesto con
              un candado y no lo puede cambiar; si elige un color que no va, no lo deja enviar hasta corregirlo.
            </p>
          </div>
        )}
      </Hoja>
    </section>
  );
}
