"use client";

import Link from "next/link";
import {
  Check,
  CircleDollarSign,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

/*
 * Seguimiento de una compra de la tienda (TND) para el cliente.
 * Llega desde el correo de confirmación con ?n=TND-0001&e=email.
 */

type Linea = {
  producto: string;
  cantidad: number;
  cadena: string;
  color?: string;
  subtotal: number;
};

type Compra = {
  pedido: string;
  nombre: string;
  fechaEntrega: string;
  estado: string;
  pagoConfirmado: boolean;
  modalidad: "Seña" | "Completo";
  total: number;
  montoSena: number;
  saldo: number;
  lineas: Linea[];
};

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

const CLASE_INPUT =
  "w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] placeholder:opacity-60 focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[#1f3f85]/20";

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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const fecha = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]}`;
}

/* Paso actual (0 a 3) según estado y pago. */
function pasoActual(compra: Compra) {
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

export default function SeguimientoTienda() {
  const [pedido, setPedido] = useState("");
  const [email, setEmail] = useState("");
  const [compra, setCompra] = useState<Compra | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(numero: string, correo: string) {
    if (!numero.trim() || !correo.trim()) {
      setError("Completá el número de pedido y tu email.");
      return;
    }

    setBuscando(true);
    setError("");

    try {
      const response = await fetch("/api/tienda/seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: numero.trim(), email: correo.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (!data?.ok) {
        throw new Error(data?.error || "No pudimos buscar tu compra.");
      }

      setCompra(data.compra as Compra);
    } catch (errorBusqueda: unknown) {
      setCompra(null);
      setError(
        errorBusqueda instanceof Error
          ? errorBusqueda.message
          : "No pudimos buscar tu compra."
      );
    } finally {
      setBuscando(false);
    }
  }

  // Link del correo: completa los datos y busca solo.
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const numero = parametros.get("n") || "";
    const correo = parametros.get("e") || "";

    if (!numero && !correo) return;

    void Promise.resolve().then(() => {
      setPedido(numero);
      setEmail(correo);
      if (numero && correo) void buscar(numero, correo);
    });
  }, []);

  const paso = compra ? pasoActual(compra) : 0;

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-4 pb-20 pt-10 text-[var(--text-main)] sm:px-6">
      <div className="fixed right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--blue-main)]">
            Tienda Kint 3D
          </p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] sm:text-5xl">
            Seguí tu compra
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--text-muted)]">
            Ingresá tu número de pedido (empieza con TND) y el email con el
            que compraste.
          </p>
        </header>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            void buscar(pedido, email);
          }}
          className={`${CLASE_PANEL} grid gap-3 p-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end sm:p-6`}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
              Número de pedido
            </span>
            <input
              value={pedido}
              onChange={(evento) => setPedido(evento.target.value)}
              placeholder="TND-0001"
              autoCapitalize="characters"
              className={`${CLASE_INPUT} uppercase`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              autoComplete="email"
              placeholder="tu@email.com"
              className={CLASE_INPUT}
            />
          </label>

          <button
            type="submit"
            disabled={buscando}
            className="flex h-[46px] items-center justify-center gap-2 rounded-xl border border-[rgba(90,145,235,0.35)] bg-[#1f3f85] px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {buscando ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Buscar
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-600/50 bg-red-600/10 p-3 text-sm font-semibold text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {compra && (
          <section className="mt-8 space-y-5" aria-live="polite">
            <div className={`${CLASE_PANEL} p-6 sm:p-8`}>
              <p className="text-sm text-[var(--text-muted)]">
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
                {compra.lineas.map((linea, indice) => (
                  <li
                    key={`${linea.producto}-${linea.cadena}-${indice}`}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
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
                    </span>
                    <span className="font-bold">{pesos(linea.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 space-y-1.5 border-t border-[var(--kint-panel-border)] pt-4 text-sm">
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
                  Mandanos el comprobante respondiendo el correo de tu compra o
                  por WhatsApp.
                </p>
              </div>
            )}

            <div className={`${CLASE_PANEL} p-6`}>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Entrega
              </h2>
              {compra.fechaEntrega && (
                <p className="mt-3 text-sm">
                  Pediste para el{" "}
                  <strong>{fechaLarga(compra.fechaEntrega)}</strong>.
                </p>
              )}
              <p className="mt-3 flex gap-2 text-sm leading-6 text-[var(--text-muted)]">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[var(--blue-main)]" />
                La entrega es gratis en FADU, de lunes a viernes de mañana. Si
                necesitás envío, lo coordinamos por WhatsApp y te avisamos el
                costo antes.
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
        )}
      </div>
    </main>
  );
}
