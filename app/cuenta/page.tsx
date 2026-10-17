"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Coins,
  Crown,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  Package,
  ShoppingBag,
  Star,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

/*
 * Ajustes de la cuenta del cliente (Apps Script: Cuenta_Kint3D.js).
 * 1. Correo → le llega un código de 4 caracteres.
 * 2. Código → sesión de 1 hora (token en sessionStorage).
 * 3. Ve sus pedidos y puntos, y cambia nombre, alias y celular.
 *    El correo no se cambia.
 */

type PedidoCuenta = {
  tipo: "maqueta" | "tienda";
  pedido: string;
  fecha: string;
  estado: string;
  monto: number;
  pagado: boolean;
  detalle: string;
  link: string;
};

type ResenaCuenta = {
  pedido: string;
  fecha: string;
  estrellas: number;
  comentario: string;
  publicada: boolean;
  likes: number;
};

type Cuenta = {
  email: string;
  nombre: string;
  alias: string;
  telefono: string;
  registro: string;
  topKint: boolean;
  puntos: number;
  puntosAcumulados: number;
  valorPunto: number;
  gastado: number;
  resenas?: ResenaCuenta[];
  cantidadPedidos: number;
  cantidadCompras: number;
  pedidos: PedidoCuenta[];
};

type Paso = "correo" | "codigo" | "cuenta";

const CLAVE_SESION = "kint-cuenta-sesion-v1";

const CLASE_PANEL =
  "rounded-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] shadow-[var(--shadow-soft)]";
const CLASE_INPUT =
  "w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 py-3 text-base text-[var(--text-main)] outline-none transition focus:border-[var(--kint-selected-border)] focus:ring-2 focus:ring-[var(--acento)]/20";
const CLASE_BOTON =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--acento)] px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#183372] disabled:cursor-not-allowed disabled:opacity-50";

function pesos(valor: number) {
  return `$${Number(valor || 0).toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

function fecha(iso: string) {
  if (!iso) return "";
  const dia = new Date(iso);
  return Number.isNaN(dia.getTime())
    ? ""
    : dia.toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" });
}

async function llamar(cuerpo: Record<string, string | boolean>) {
  const response = await fetch("/api/cuenta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = await response.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error || "No pudimos completar la acción.");
  return data;
}

export default function CuentaPage() {
  const [paso, setPaso] = useState<Paso>("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const restaurado = useRef(false);

  // Sesión guardada (1 hora): vuelve directo a la cuenta.
  useEffect(() => {
    if (restaurado.current) return;
    restaurado.current = true;

    let guardada: { email: string; token: string } | null = null;
    try {
      guardada = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
    } catch {
      guardada = null;
    }
    if (!guardada?.email || !guardada?.token) return;

    const sesion = guardada;
    void Promise.resolve().then(async () => {
      setCargando(true);
      try {
        const data = await llamar({ tipo: "cuenta_datos", email: sesion.email, token: sesion.token });
        setEmail(sesion.email);
        setToken(sesion.token);
        setCuenta(data.cuenta);
        setPaso("cuenta");
      } catch {
        sessionStorage.removeItem(CLAVE_SESION);
      } finally {
        setCargando(false);
      }
    });
  }, []);

  async function pedirCodigo() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Revisá tu correo.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      await llamar({ tipo: "cuenta_codigo", email: email.trim() });
      setCodigo("");
      setPaso("codigo");
    } catch (errorCodigo: unknown) {
      setError(errorCodigo instanceof Error ? errorCodigo.message : "No pudimos mandar el código.");
    } finally {
      setCargando(false);
    }
  }

  async function verificar(valor = codigo) {
    if (valor.trim().length !== 4) return;
    setCargando(true);
    setError("");
    try {
      const data = await llamar({ tipo: "cuenta_verificar", email: email.trim(), codigo: valor.trim() });
      setToken(data.token);
      setCuenta(data.cuenta);
      setPaso("cuenta");
      try {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ email: email.trim(), token: data.token }));
      } catch {
        // Sin sessionStorage: la sesión dura lo que la pestaña.
      }
    } catch (errorVerificar: unknown) {
      setError(errorVerificar instanceof Error ? errorVerificar.message : "El código no es correcto.");
    } finally {
      setCargando(false);
    }
  }

  function salir() {
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      // nada
    }
    setCuenta(null);
    setToken("");
    setCodigo("");
    setPaso("correo");
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-4 pb-20 pt-8 text-[var(--text-main)] sm:px-6">
      {/* "‹ Inicio" ya lo pone la web arriba a la izquierda. */}
      <div className="mx-auto flex max-w-2xl justify-end">
        <ThemeToggle />
      </div>

      <section className="mx-auto mt-10 max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--blue-main)]">
          Kint 3D
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Mi cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Tus pedidos, tus Puntos Kint y tus datos de contacto, en un solo lugar.
        </p>

        {cargando && paso === "correo" && !error && cuenta === null && email === "" ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <LoaderCircle size={16} className="animate-spin" />
            Cargando…
          </div>
        ) : paso === "correo" ? (
          <div className={`${CLASE_PANEL} mt-8 p-6`}>
            <label className="block">
              <span className="mb-1 block text-sm font-black">Tu correo</span>
              <span className="mb-3 block text-xs leading-5 text-[var(--text-muted)]">
                El mismo con el que hiciste tus pedidos. Te mandamos un código de
                4 caracteres para entrar.
              </span>
              <input
                type="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") void pedirCodigo();
                }}
                autoComplete="email"
                autoCapitalize="none"
                placeholder="tu@correo.com"
                className={CLASE_INPUT}
              />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <button type="button" onClick={() => void pedirCodigo()} disabled={cargando} className={`${CLASE_BOTON} mt-4`}>
              {cargando ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
              Mandarme el código
            </button>
          </div>
        ) : paso === "codigo" ? (
          <div className={`${CLASE_PANEL} mt-8 p-6`}>
            <p className="flex items-center gap-2 text-sm font-black">
              <KeyRound size={17} className="text-[var(--blue-main)]" />
              Revisá tu correo
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Te mandamos un código a <strong className="text-[var(--text-main)]">{email}</strong>.
              Vence en 10 minutos (mirá también en Spam o Promociones).
            </p>
            <input
              value={codigo}
              onChange={(evento) => {
                const limpio = evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
                setCodigo(limpio);
                if (limpio.length === 4) void verificar(limpio);
              }}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              inputMode="text"
              aria-label="Código de 4 caracteres"
              placeholder="····"
              className={`${CLASE_INPUT} mt-4 text-center text-3xl font-black tracking-[0.6em]`}
              autoFocus
            />
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => void verificar()}
              disabled={cargando || codigo.length !== 4}
              className={`${CLASE_BOTON} mt-4`}
            >
              {cargando ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              Entrar
            </button>
            <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs font-bold">
              <button type="button" onClick={() => { setPaso("correo"); setError(""); }} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                Cambiar correo
              </button>
              <button type="button" onClick={() => void pedirCodigo()} disabled={cargando} className="text-[var(--blue-main)] hover:underline">
                Mandarme otro código
              </button>
            </div>
          </div>
        ) : cuenta ? (
          <PanelCuenta
            cuenta={cuenta}
            email={email.trim()}
            token={token}
            onGuardada={setCuenta}
            onSalir={salir}
          />
        ) : null}
      </section>
    </main>
  );
}

function PanelCuenta({
  cuenta,
  email,
  token,
  onGuardada,
  onSalir,
}: {
  cuenta: Cuenta;
  email: string;
  token: string;
  onGuardada: (cuenta: Cuenta) => void;
  onSalir: () => void;
}) {
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [alias, setAlias] = useState(cuenta.alias);
  const [telefono, setTelefono] = useState(cuenta.telefono);
  const [topKint, setTopKint] = useState(cuenta.topKint);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cambios =
    nombre.trim() !== cuenta.nombre ||
    alias.trim() !== cuenta.alias ||
    telefono.trim() !== cuenta.telefono ||
    topKint !== cuenta.topKint;

  async function guardar() {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const data = await llamar({
        tipo: "cuenta_guardar",
        email,
        token,
        nombre: nombre.trim(),
        alias: alias.trim(),
        telefono: telefono.trim(),
        topKint,
      });
      onGuardada(data.cuenta);
      setNombre(data.cuenta.nombre);
      setAlias(data.cuenta.alias);
      setTelefono(data.cuenta.telefono);
      setTopKint(data.cuenta.topKint);
      setMensaje("¡Listo! Guardamos tus cambios.");
    } catch (errorGuardar: unknown) {
      setError(errorGuardar instanceof Error ? errorGuardar.message : "No pudimos guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const puntos = Number(cuenta.puntos) || 0;
  const valorPuntos = puntos * (Number(cuenta.valorPunto) || 1);

  return (
    <div className="mt-8 space-y-5">
      {/* Ruleta y canje de puntos */}
      <Link
        href="/ruleta"
        className="group flex items-center gap-4 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#b91c1c,#7c3aed_60%,var(--acento))] p-5 text-white shadow-[0_18px_50px_rgba(124,58,237,0.3)] transition hover:-translate-y-0.5"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl transition group-hover:rotate-45">🎡</span>
        <span className="min-w-0">
          <span className="block text-lg font-black">Ruleta Kint</span>
          <span className="block text-sm text-white/80">Girá cada 2 días y canjeá tus puntos por premios.</span>
        </span>
      </Link>

      {/* Resumen */}
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--acento)_0%,var(--acento-oscuro)_60%,var(--acento-fondo)_100%)] p-6 text-white shadow-[0_18px_50px_rgba(15,35,80,0.3)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-sky-100/80">Hola,</p>
            <p className="truncate text-2xl font-black">{cuenta.nombre || cuenta.alias}</p>
            <p className="mt-0.5 truncate text-sm text-sky-100/80">
              @{cuenta.alias}
              {cuenta.registro ? ` · cliente desde ${fecha(cuenta.registro)}` : ""}
            </p>
          </div>
          {cuenta.topKint && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
              <Crown size={12} />
              Top Kint
            </span>
          )}
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/10">
            <Coins size={16} className="text-amber-300" />
            <p className="mt-1 text-xl font-black tabular-nums">{puntos}</p>
            <p className="text-[11px] leading-tight text-sky-100/80">
              Puntos Kint{valorPuntos > 0 ? ` · ${pesos(valorPuntos)}` : ""}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/10">
            <Package size={16} className="text-sky-200" />
            <p className="mt-1 text-xl font-black tabular-nums">{cuenta.cantidadPedidos}</p>
            <p className="text-[11px] leading-tight text-sky-100/80">Maquetas</p>
          </div>
          <div className="rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/10">
            <ShoppingBag size={16} className="text-red-300" />
            <p className="mt-1 text-xl font-black tabular-nums">{cuenta.cantidadCompras}</p>
            <p className="text-[11px] leading-tight text-sky-100/80">Compras</p>
          </div>
        </div>

        {puntos > 0 && (
          <p className="relative mt-4 text-xs leading-5 text-sky-100/90">
            Usá tus puntos en tu próximo pedido de maqueta: se descuentan del precio.
          </p>
        )}
      </div>

      {/* Datos */}
      <div className={`${CLASE_PANEL} p-6`}>
        <p className="flex items-center gap-2 text-sm font-black">
          <UserRound size={17} className="text-[var(--blue-main)]" />
          Tus datos
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Nombre</span>
            <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} autoComplete="name" maxLength={80} className={CLASE_INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
              Nombre público
            </span>
            <span className="mb-1.5 block text-[11px] leading-4 text-[var(--text-muted)]">
              Es el que se ve en tus reseñas y en el ranking Top Kint (3 a 20 caracteres).
            </span>
            <input value={alias} onChange={(evento) => setAlias(evento.target.value)} autoComplete="username" autoCapitalize="none" maxLength={20} className={CLASE_INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
              Celular (WhatsApp)
            </span>
            <input value={telefono} onChange={(evento) => setTelefono(evento.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="099 123 456" maxLength={24} className={CLASE_INPUT} />
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={topKint}
            onClick={() => setTopKint((actual) => !actual)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--kint-panel-border)] px-4 py-3 text-left transition hover:border-[var(--kint-selected-border)]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Crown size={15} className="text-amber-500" />
                Aparecer en el ranking Top Kint
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                Con tu nombre público, junto a los clientes que más imprimen.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${topKint ? "bg-emerald-600" : "bg-[#87A4B5]/45"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${topKint ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>

          <div>
            <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">Correo</span>
            <p className="rounded-xl bg-[var(--kint-panel-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
              {cuenta.email} · el correo no se puede cambiar
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {mensaje && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{mensaje}</p>}

        <button type="button" onClick={() => void guardar()} disabled={!cambios || guardando} className={`${CLASE_BOTON} mt-5`}>
          {guardando ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
          Guardar cambios
        </button>
      </div>

      {/* Historial */}
      <div className={`${CLASE_PANEL} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black">Tus pedidos</p>
          {cuenta.gastado > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Total: <strong className="text-[var(--text-main)]">{pesos(cuenta.gastado)}</strong>
            </p>
          )}
        </div>

        {cuenta.pedidos.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Todavía no hiciste pedidos.{" "}
            <Link href="/cotizar" className="font-bold text-[var(--blue-main)] hover:underline">Cotizá tu maqueta</Link>{" "}
            o mirá la{" "}
            <Link href="/tienda" className="font-bold text-[var(--blue-main)] hover:underline">tienda</Link>.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cuenta.pedidos.map((pedido) => {
              const Icono = pedido.tipo === "maqueta" ? Package : ShoppingBag;
              const contenido = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--kint-panel-soft)] text-[var(--text-muted)]">
                    <Icono size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{pedido.pedido} · {pedido.estado}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {[fecha(pedido.fecha), pedido.detalle].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-black">
                    {pedido.monto > 0 ? pesos(pedido.monto) : "—"}
                  </span>
                  {pedido.link && <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />}
                </>
              );
              const clase = "flex items-center gap-3 rounded-2xl border border-[var(--kint-panel-border)] p-3 transition";
              return (
                <li key={pedido.pedido}>
                  {pedido.link ? (
                    <Link href={pedido.link} className={`${clase} hover:border-[var(--kint-selected-border)]`}>
                      {contenido}
                    </Link>
                  ) : (
                    <div className={clase}>{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(cuenta.resenas || []).length > 0 && (
        <div className={`${CLASE_PANEL} p-6`}>
          <p className="text-sm font-black">Tus reseñas</p>
          <ul className="mt-3 space-y-3">
            {(cuenta.resenas || []).map((resena) => (
              <li key={`${resena.pedido}-${resena.fecha}`} className="rounded-2xl border border-[var(--kint-panel-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${resena.estrellas} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} className={n <= resena.estrellas ? "fill-current" : "opacity-30"} />
                    ))}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1 font-bold text-[var(--text-main)]">
                      <ThumbsUp size={13} />
                      {resena.likes} me gusta
                    </span>
                    {resena.publicada ? "Publicada" : "En revisión"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6">{resena.comentario}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {[resena.pedido, fecha(resena.fecha)].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onSalir} className="mx-auto flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-red-600">
        <LogOut size={15} />
        Salir de mi cuenta
      </button>
    </div>
  );
}
