"use client";

import Link from "next/link";
import {
  Check,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

/*
 * Resultado del seguimiento de una compra de la tienda (TND).
 * Se muestra dentro de /seguimiento (Consultar pedido), que consulta
 * tanto pedidos de maquetas (KNT) como compras de la tienda (TND).
 */

export type LineaCompraTienda = {
  producto: string;
  cantidad: number;
  cadena: string;
  color?: string;
  comentario?: string;
  subtotal: number;
};

export type CompraTienda = {
  pedido: string;
  nombre: string;
  fechaEntrega: string;
  estado: string;
  pagoConfirmado: boolean;
  modalidad: "Seña" | "Completo";
  total: number;
  montoSena: number;
  saldo: number;
  comentario?: string;
  lineas: LineaCompraTienda[];
};

/* Los números de la tienda empiezan con TND (TND-0001, tnd 1, etc.). */
export function esPedidoTienda(numero: string) {
  return /^\s*tnd/i.test(numero || "");
}

/* Consulta una compra de la tienda con número + email. */
export async function buscarCompraTienda(
  numero: string,
  correo: string
): Promise<CompraTienda> {
  const response = await fetch("/api/tienda/seguimiento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedido: numero.trim(), email: correo.trim() }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!data?.ok || !data.compra) {
    throw new Error(data?.error || "No pudimos buscar tu compra.");
  }

  return data.compra as CompraTienda;
}

const WHATSAPP = "https://wa.me/59892023382";

const DATOS_BANCARIOS = [
  ["Banco", "BBVA"],
  ["Tipo de cuenta", "Cuenta corriente en pesos"],
  ["Titular", "Alexander López"],
  ["Cuenta", "26557312"],
];

const PASOS = [
  { titulo: "Compra recibida", icono: ShoppingBag },
  { titulo: "Pago confirmado", icono: CircleDollarSign },
  { titulo: "Listo para entregar", icono: Sparkles },
  { titulo: "Entregado", icono: PackageCheck },
];

const CLASE_PANEL =
  "rounded-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] shadow-[var(--shadow-soft)]";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", {
    maximumFractionDigits: 2,
  })}`;
}

function fechaLarga(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return "";
  const fecha = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]}`;
}

/* Paso actual (0 a 3) según estado y pago. */
function pasoActual(compra: CompraTienda) {
  if (compra.estado === "Entregado") return 3;
  if (compra.estado === "Listo") return 2;
  if (compra.pagoConfirmado) return 1;
  return 0;
}

const MENSAJES = [
  "Recibimos tu compra y tu comprobante. Lo estamos revisando: te avisamos por correo cuando confirmemos el pago.",
  "Tu pago está confirmado. Estamos imprimiendo tus llaveros.",
  "¡Tus llaveros están listos! Coordinamos la entrega por WhatsApp o en FADU.",
  "Tu pedido fue entregado. ¡Gracias por comprar en Kint 3D!",
];

export default function SeguimientoTienda({
  compra,
}: {
  compra: CompraTienda;
}) {
  const paso = pasoActual(compra);
  const lineas = Array.isArray(compra.lineas) ? compra.lineas : [];
  const fechaEntrega = fechaLarga(compra.fechaEntrega);

  return (
    <section className="mt-12 w-full max-w-2xl space-y-5 text-left" aria-live="polite">
      <div className={`${CLASE_PANEL} p-6 sm:p-8`}>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--blue-main)]">
          Compra en la tienda
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {compra.nombre ? `¡Hola, ${compra.nombre}! ` : ""}Tu pedido
        </p>
        <p className="mt-1 text-3xl font-black tracking-[0.06em] text-red-600">
          {compra.pedido}
        </p>

        <ol className="mt-7 grid grid-cols-4 gap-2" aria-label="Estado de la compra">
          {PASOS.map((item, indice) => {
            const Icono = item.icono;
            const hecho = indice <= paso;
            return (
              <li
                key={item.titulo}
                aria-current={indice === paso ? "step" : undefined}
                className="flex flex-col items-center text-center"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                    hecho
                      ? "bg-[#1f3f85] text-white shadow-md"
                      : "bg-[var(--kint-panel-soft)] text-[var(--text-muted)]"
                  } ${indice === paso ? "ring-4 ring-[#1f3f85]/20" : ""}`}
                >
                  {hecho && indice < paso ? (
                    <Check size={18} strokeWidth={2.6} />
                  ) : (
                    <Icono size={18} />
                  )}
                </span>
                <span
                  className={`mt-2 text-[10px] font-black uppercase leading-3 tracking-[0.08em] sm:text-[11px] ${
                    hecho ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.titulo}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 rounded-2xl bg-[var(--kint-selected-bg)] px-4 py-3 text-sm leading-6">
          {MENSAJES[paso]}
        </p>
      </div>

      <div className={`${CLASE_PANEL} p-6`}>
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Tu compra
        </h2>

        <ul className="mt-3 divide-y divide-[var(--kint-panel-border)]">
          {lineas.map((linea, indice) => (
            <li
              key={`${linea.producto}-${linea.cadena}-${indice}`}
              className="flex items-start justify-between gap-4 py-3 text-sm"
            >
              <span>
                <strong>
                  {linea.cantidad} × {linea.producto}
                </strong>
                {(linea.color || linea.cadena) && (
                  <span className="block text-xs text-[var(--text-muted)]">
                    {[
                      linea.color ? `Color ${linea.color}` : "",
                      linea.cadena ? `Cadena ${linea.cadena}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {linea.comentario && (
                  <span className="mt-1 block text-xs italic text-[var(--text-muted)]">
                    “{linea.comentario}”
                  </span>
                )}
              </span>
              <span className="shrink-0 font-bold">{pesos(linea.subtotal)}</span>
            </li>
          ))}
        </ul>

        {compra.comentario && (
          <p className="mt-2 rounded-2xl bg-[var(--kint-panel-soft)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
            <strong className="text-[var(--text-main)]">Tu comentario:</strong>{" "}
            {compra.comentario}
          </p>
        )}

        <div className="mt-2 space-y-1.5 border-t border-[var(--kint-panel-border)] pt-4 text-sm">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Forma de pago</span>
            <span>{compra.modalidad === "Seña" ? "Seña" : "Pago completo"}</span>
          </div>
          <div className="flex justify-between font-black">
            <span>Total</span>
            <span className="text-lg text-red-600">{pesos(compra.total)}</span>
          </div>
          {compra.modalidad === "Seña" && (
            <>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Seña</span>
                <span>{pesos(compra.montoSena)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo pendiente</span>
                <span>{pesos(compra.saldo)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {compra.saldo > 0 && compra.estado !== "Entregado" && (
        <div className="rounded-3xl border-2 border-red-600 bg-red-50 p-6 text-black dark:bg-[#010003] dark:text-[var(--text-main)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
            Saldo a transferir antes de la entrega
          </p>
          <p className="mt-2 text-4xl font-black text-red-600">
            {pesos(compra.saldo)}
          </p>
          <p className="mt-4 text-sm leading-7">
            {DATOS_BANCARIOS.map(([etiqueta, valor]) => (
              <span key={etiqueta} className="block">
                {etiqueta}: {valor}
              </span>
            ))}
            <span className="block">Concepto: {compra.pedido}</span>
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            Mandanos el comprobante respondiendo el correo de tu compra o por
            WhatsApp.
          </p>
        </div>
      )}

      <div className={`${CLASE_PANEL} p-6`}>
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Entrega
        </h2>
        {fechaEntrega && (
          <p className="mt-3 text-sm">
            Pediste para el <strong>{fechaEntrega}</strong>.
          </p>
        )}
        <p className="mt-3 flex gap-2 text-sm leading-6 text-[var(--text-muted)]">
          <MapPin size={17} className="mt-0.5 shrink-0 text-[var(--blue-main)]" />
          La entrega es gratis en FADU, de lunes a viernes de mañana. Si
          necesitás envío, lo coordinamos por WhatsApp y te avisamos el costo
          antes.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={`${WHATSAPP}?text=${encodeURIComponent(`Hola, te escribo por mi compra ${compra.pedido} de la tienda.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 transition hover:bg-emerald-600 hover:text-white dark:text-emerald-400"
          >
            <MessageCircle size={16} />
            Escribinos
          </a>
          <Link
            href="/tienda"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--kint-panel-border)] px-5 text-xs font-black uppercase tracking-[0.18em] transition hover:border-[var(--kint-selected-border)]"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </section>
  );
}
