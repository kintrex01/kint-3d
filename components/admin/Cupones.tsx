"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Ticket, Trash2 } from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import { Boton, Chip, Esqueleto, Tarjeta, claseInput, useAvisos } from "@/components/admin/ui";

/*
 * Códigos de descuento de un solo uso (planilla de códigos): se ven todos,
 * se crean (escritos a mano o generados, uno o varios) y se borran los
 * que nadie usó. Configuración › Promociones.
 */

type Filtro = "disponibles" | "todos" | "usados";

export default function Cupones() {
  const { datos, setDatos, cargando } = useDatosAdmin("admin_cupones_listar", {});
  const avisar = useAvisos();
  const [filtro, setFiltro] = useState<Filtro>("disponibles");
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [descuento, setDescuento] = useState("10");
  const [cantidad, setCantidad] = useState("1");
  const [correo, setCorreo] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [guardando, setGuardando] = useState("");

  const cupones = useMemo(() => datos?.cupones ?? [], [datos]);
  const visibles = cupones.filter((cupon) =>
    filtro === "todos" ? true : filtro === "disponibles" ? cupon.estado === "Disponible" : cupon.estado !== "Disponible"
  );
  const disponibles = cupones.filter((cupon) => cupon.estado === "Disponible").length;

  async function crear() {
    setGuardando("crear");
    try {
      const respuesta = await accionAdmin("admin_cupon_crear", {
        codigo: codigo.trim(),
        descuento: Number(descuento),
        cantidad: codigo.trim() ? 1 : Number(cantidad) || 1,
        correo: correo.trim(),
        vencimiento,
      });
      setDatos(respuesta);
      const creados = respuesta.creados ?? [];
      avisar(creados.length === 1 ? `Código ${creados[0]} creado` : `${creados.length} códigos creados`);
      if (creados.length) void navigator.clipboard?.writeText(creados.join("\n")).catch(() => {});
      setCodigo("");
      setCorreo("");
      setAbierto(false);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo crear el código.", "error");
    } finally {
      setGuardando("");
    }
  }

  async function borrar(codigoBorrar: string) {
    setGuardando(codigoBorrar);
    try {
      setDatos(await accionAdmin("admin_cupon_borrar", { codigo: codigoBorrar }));
      avisar(`Código ${codigoBorrar} borrado`);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo borrar.", "error");
    } finally {
      setGuardando("");
    }
  }

  return (
    <Tarjeta className="mb-4 mt-6 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400">
          <Ticket size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black">Códigos de descuento</p>
          <p className="text-xs text-[var(--text-muted)]">
            De un solo uso: el cliente lo escribe en su pedido. {disponibles} disponibles.
          </p>
        </div>
        <Boton tamano="chico" icono={<Plus size={14} />} onClick={() => setAbierto(!abierto)}>
          Crear
        </Boton>
      </div>

      {abierto && (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--kint-panel-border)] p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="col-span-2 text-xs font-bold text-[var(--text-muted)]">
              Código (vacío = se genera)
              <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="KINT-XXXXX" className={`${claseInput} mt-1 h-10 uppercase`} />
            </label>
            <label className="text-xs font-bold text-[var(--text-muted)]">
              Descuento %
              <input value={descuento} inputMode="numeric" onChange={(e) => setDescuento(e.target.value.replace(/\D/g, ""))} className={`${claseInput} mt-1 h-10`} />
            </label>
            <label className="text-xs font-bold text-[var(--text-muted)]">
              Cuántos
              <input value={codigo.trim() ? "1" : cantidad} disabled={Boolean(codigo.trim())} inputMode="numeric" onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))} className={`${claseInput} mt-1 h-10`} />
            </label>
            <label className="col-span-2 text-xs font-bold text-[var(--text-muted)]">
              Solo para este correo (opcional)
              <input value={correo} type="email" onChange={(e) => setCorreo(e.target.value)} className={`${claseInput} mt-1 h-10`} />
            </label>
            <label className="col-span-2 text-xs font-bold text-[var(--text-muted)]">
              Vence (opcional)
              <input value={vencimiento} type="date" onChange={(e) => setVencimiento(e.target.value)} className={`${claseInput} mt-1 h-10`} />
            </label>
          </div>
          <Boton variante="principal" className="w-full" cargando={guardando === "crear"} onClick={crear}>
            Crear {codigo.trim() || Number(cantidad) <= 1 ? "código" : `${cantidad} códigos`} del {descuento || 0}%
          </Boton>
          <p className="text-[11px] text-[var(--text-muted)]">Al crearlos se copian solos, listos para pegar.</p>
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {(["disponibles", "usados", "todos"] as Filtro[]).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setFiltro(opcion)}
            className={`h-8 rounded-full px-3 text-xs font-black capitalize ${
              filtro === opcion ? "bg-[var(--text-main)] text-[var(--kint-panel)]" : "border border-[var(--kint-panel-border)] text-[var(--text-muted)]"
            }`}
          >
            {opcion}
          </button>
        ))}
      </div>

      {cargando && !datos ? (
        <div className="mt-3">
          <Esqueleto filas={3} />
        </div>
      ) : visibles.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">No hay códigos {filtro === "todos" ? "" : filtro}.</p>
      ) : (
        <ul className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {visibles.map((cupon) => (
            <li key={cupon.codigo} className="flex items-center gap-2 rounded-xl border border-[var(--kint-panel-border)] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-sm font-black">{cupon.codigo}</span>
                  <Chip tono={cupon.estado === "Disponible" ? "verde" : cupon.estado === "Reservado" ? "ambar" : "gris"}>
                    {cupon.estado}
                  </Chip>
                  <span className="text-xs font-black text-pink-600 dark:text-pink-400">{cupon.descuento}%</span>
                </p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  {[
                    cupon.pedido && `${cupon.pedido}${cupon.cliente ? ` · ${cupon.cliente}` : ""}`,
                    cupon.correo && `solo ${cupon.correo}`,
                    cupon.vencimiento && `vence ${cupon.vencimiento}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin restricciones"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Copiar código"
                onClick={() => {
                  void navigator.clipboard?.writeText(cupon.codigo);
                  avisar(`${cupon.codigo} copiado`);
                }}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <Copy size={15} />
              </button>
              {(cupon.estado === "Disponible" || cupon.estado === "Vencido") && (
                <button
                  type="button"
                  aria-label="Borrar código"
                  disabled={Boolean(guardando)}
                  onClick={() => void borrar(cupon.codigo)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
