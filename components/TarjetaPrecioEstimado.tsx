"use client";

import { useEffect, useState } from "react";
import { estimarPrecio, rangoPorDatos } from "@/lib/precio-estimado";

/*
 * Cotizar: precio aproximado con horas, minutos y gramos (los que da el
 * laminador) y si es urgente. Sin escala elegida no se calcula nada: el
 * modelo viene en tamaño real y primero se lleva a la escala de la maqueta.
 * Si el cliente subió un STL, los campos arrancan con lo medido del archivo
 * ya escalado y los puede corregir. Los insumos van de $30 a $100.
 */

type Medidas = { mm3: number; mm2: number; medidas: number[] };

function prellenado(medidas: Medidas[] | null, escala: number) {
  if (!medidas) return { horas: "", minutos: "", gramos: "" };
  const estimacion = estimarPrecio(medidas, escala);
  if (estimacion.tipo !== "precio") return { horas: "", minutos: "", gramos: "" };
  const totalMinutos = Math.max(15, Math.round((estimacion.horas * 60) / 5) * 5);
  return {
    horas: String(Math.floor(totalMinutos / 60)),
    minutos: String(totalMinutos % 60),
    gramos: String(estimacion.gramos),
  };
}

function centimetros(mm: number) {
  const cm = mm / 10;
  return cm.toLocaleString("es-UY", { maximumFractionDigits: cm < 10 ? 1 : 0 });
}

const claseCampo =
  "w-full rounded-xl border border-sky-400/40 bg-[var(--card-bg)] px-3 py-2.5 text-lg font-black tabular-nums text-[var(--text-main)] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-400/30";

const claseCaja =
  "mt-3 overflow-hidden rounded-2xl border border-sky-400/40 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(37,99,235,0.06))] p-4";

export default function TarjetaPrecioEstimado({
  medidas,
  midiendo,
  escala,
  recargoUrgente,
  onRango,
}: {
  medidas: Medidas[] | null;
  midiendo: boolean;
  // N de "1:N"; 1 = sin escala (pieza que no es maqueta); 0 = todavía no eligió.
  escala: number;
  // % de recargo urgente (0 si no hay pedidos urgentes).
  recargoUrgente: number;
  // Lo que vio el cliente, para el correo al dueño.
  onRango?: (texto: string) => void;
}) {
  const [valores, setValores] = useState(() => prellenado(medidas, escala));
  const [urgente, setUrgente] = useState(false);
  const [base, setBase] = useState({ medidas, escala });

  // Archivo o escala nuevos: los campos vuelven a lo medido.
  if (base.medidas !== medidas || base.escala !== escala) {
    setBase({ medidas, escala });
    setValores(prellenado(medidas, escala));
  }

  const sinEscala = !(escala >= 1);
  const estimacion = medidas && !sinEscala ? estimarPrecio(medidas, escala) : null;
  const muyGrande = estimacion?.tipo === "muyGrande";

  const numero = (texto: string) => Math.max(0, Number(texto.replace(",", ".")) || 0);
  const rango =
    sinEscala || muyGrande
      ? null
      : rangoPorDatos({
          horas: numero(valores.horas),
          minutos: numero(valores.minutos),
          gramos: numero(valores.gramos),
          recargoUrgente: urgente ? recargoUrgente : 0,
        });

  const textoRango = rango
    ? `$${rango.desde} a $${rango.hasta} (${valores.horas || 0} h ${valores.minutos || 0} min, ${valores.gramos} g${urgente ? ", urgente" : ""}${escala > 1 ? `, escala 1:${escala}` : ""})`
    : "";

  useEffect(() => {
    onRango?.(textoRango);
  }, [textoRango, onRango]);

  if (sinEscala) {
    return (
      <p className={`${claseCaja} text-sm leading-6 text-[var(--text-main)]`}>
        <strong>📏 Elegí la escala acá arriba.</strong> Tu modelo está en tamaño real: lo llevamos a esa escala y te
        mostramos el precio aproximado.
      </p>
    );
  }

  if (estimacion?.tipo === "muyGrande") {
    const [ancho, largo, alto] = estimacion.medidas;
    return (
      <p className={`${claseCaja} text-sm leading-6 text-[var(--text-main)]`}>
        <strong>
          A 1:{escala} tu maqueta mediría {centimetros(ancho)} × {centimetros(largo)} × {centimetros(alto)} cm
        </strong>
        , más grande que la impresora. La imprimimos en partes: te mandamos el precio en el presupuesto. Si esperabas
        otro tamaño, revisá la escala.
      </p>
    );
  }

  const campos = [
    { clave: "horas", etiqueta: "Horas", unidad: "h" },
    { clave: "minutos", etiqueta: "Minutos", unidad: "min" },
    { clave: "gramos", etiqueta: "Gramos", unidad: "g" },
  ] as const;

  return (
    <div className={claseCaja}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
        ¿Cuánto saldría?
      </p>

      {estimacion?.tipo === "precio" && (
        <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">
          📏 Tu maqueta{escala > 1 ? ` a 1:${escala}` : ""}: {centimetros(estimacion.medidas[0])} ×{" "}
          {centimetros(estimacion.medidas[1])} × {centimetros(estimacion.medidas[2])} cm
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {campos.map((campo) => (
          <label key={campo.clave} className="block">
            <span className="mb-1 block text-[11px] font-bold text-[var(--text-muted)]">{campo.etiqueta}</span>
            <span className="relative block">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={campo.clave === "minutos" ? 59 : undefined}
                value={valores[campo.clave]}
                placeholder={midiendo ? "…" : "0"}
                onChange={(evento) => setValores({ ...valores, [campo.clave]: evento.target.value })}
                className={`${claseCampo} ${campo.unidad === "min" ? "pr-12" : "pr-9"}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                {campo.unidad}
              </span>
            </span>
          </label>
        ))}
      </div>

      {recargoUrgente > 0 && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          <input type="checkbox" checked={urgente} onChange={(evento) => setUrgente(evento.target.checked)} />
          Es urgente
        </label>
      )}

      <p className="mt-4 text-3xl font-black tabular-nums text-[var(--text-main)]">
        {rango
          ? `$${rango.desde.toLocaleString("es-UY")} a $${rango.hasta.toLocaleString("es-UY")}`
          : midiendo
          ? "Calculando…"
          : "Completá horas y gramos"}
      </p>

      <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">
        Aproximado. El precio final te lo mandamos en el presupuesto.
      </p>
    </div>
  );
}
