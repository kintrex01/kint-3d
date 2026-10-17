"use client";

/*
 * Ruleta Kint: una tirada cada 2 días por cuenta, con premios que cambian
 * cada día (Premios_Kint3D.js). También se canjean puntos por premios.
 * Se entra con la misma sesión de Ajustes (código por correo).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Gift, KeyRound, LoaderCircle, Mail, Sparkles, Star, Ticket } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import FondoKintAnimado from "@/components/FondoKintAnimado";

const CLAVE_SESION = "kint-cuenta-sesion-v1";

type Sesion = { email: string; token: string };
type PremioRueda = { nombre: string; color: string; tipo: string };
type MiPremio = {
  fecha: string;
  origen: string;
  tipo: string;
  premio: string;
  codigo: string;
  vence: string;
  estado: string;
};
type Estado = {
  premios: PremioRueda[];
  puede: boolean;
  proxima: string;
  puntos: number;
  alias: string;
  canjes: { id: string; nombre: string; puntos: number }[];
  misPremios: MiPremio[];
};
type Ganado = { nombre: string; tipo: string; codigo: string; vence: string };

async function llamar(cuerpo: Record<string, string>) {
  const response = await fetch("/api/cuenta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = await response.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error || "No pudimos completar la acción.");
  return data;
}

function fechaCorta(iso: string) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? ""
    : fecha.toLocaleDateString("es-UY", { day: "numeric", month: "short" });
}

function faltaPara(iso: string, ahora: number) {
  const resto = new Date(iso).getTime() - ahora;
  if (!(resto > 0)) return "";
  const horas = Math.floor(resto / 3_600_000);
  const minutos = Math.floor((resto % 3_600_000) / 60_000);
  if (horas >= 24) return `${Math.floor(horas / 24)} d ${horas % 24} h`;
  return horas ? `${horas} h ${minutos} min` : `${minutos} min`;
}

export default function RuletaPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [listo, setListo] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Sesión guardada por Ajustes (o por esta página).
  useEffect(() => {
    try {
      const guardada = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardada?.email && guardada?.token) setSesion(guardada);
    } catch {
      // Sin sesión.
    }
    setListo(true);
  }, []);

  const cargar = useCallback(async (actual: Sesion) => {
    setCargando(true);
    setError("");
    try {
      const data = await llamar({ tipo: "ruleta_estado", email: actual.email, token: actual.token });
      setEstado(data);
    } catch (errorCarga) {
      const mensaje = errorCarga instanceof Error ? errorCarga.message : "No pudimos cargar la ruleta.";
      if (/sesi[oó]n/i.test(mensaje)) {
        sessionStorage.removeItem(CLAVE_SESION);
        setSesion(null);
      }
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sesion) void cargar(sesion);
  }, [sesion, cargar]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 text-[var(--text-main)] sm:px-6">
      <div className="fixed right-6 top-6 z-[1000]">
        <ThemeToggle />
      </div>

      <section className="relative isolate -mx-4 mb-[-6rem] overflow-hidden px-4 pb-36 pt-28 sm:-mx-6 sm:px-6">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_50%,transparent)]">
          <FondoKintAnimado />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <ArrowLeft size={16} />
            Inicio
          </Link>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-500">Premios Kint</p>
          <h1 className="mt-2 bg-[linear-gradient(90deg,#f87171,#facc15_45%,#60a5fa)] bg-clip-text text-5xl font-black leading-none text-transparent sm:text-7xl">
            Ruleta Kint
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Girala una vez cada 2 días. Los premios cambian todos los días: puntos, descuentos, regalos de la
            tienda y hasta tiradas extra.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl">
        {!listo ? null : !sesion ? (
          <Ingreso onListo={setSesion} />
        ) : !estado ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm font-bold text-[var(--text-muted)]">
            {cargando ? <LoaderCircle size={18} className="animate-spin" /> : null}
            {cargando ? "Cargando la ruleta…" : error}
          </div>
        ) : (
          <Juego
            sesion={sesion}
            estado={estado}
            onEstado={setEstado}
            onRecargar={() => void cargar(sesion)}
          />
        )}
        {error && estado && <p className="mt-4 text-center text-sm font-bold text-red-500">{error}</p>}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Entrar con el código por correo (misma sesión que Ajustes)          */
/* ------------------------------------------------------------------ */

function Ingreso({ onListo }: { onListo: (sesion: Sesion) => void }) {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function pedirCodigo() {
    setCargando(true);
    setError("");
    try {
      await llamar({ tipo: "cuenta_codigo", email: email.trim() });
      setEnviado(true);
    } catch (errorEnvio) {
      setError(errorEnvio instanceof Error ? errorEnvio.message : "No pudimos mandar el código.");
    } finally {
      setCargando(false);
    }
  }

  async function verificar() {
    setCargando(true);
    setError("");
    try {
      const data = await llamar({ tipo: "cuenta_verificar", email: email.trim(), codigo: codigo.trim() });
      const sesion = { email: email.trim(), token: data.token };
      try {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
      } catch {
        // Dura lo que la pestaña.
      }
      onListo(sesion);
    } catch (errorCodigo) {
      setError(errorCodigo instanceof Error ? errorCodigo.message : "El código no es correcto.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_85%,transparent)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg">
        <KeyRound size={22} />
      </span>
      <h2 className="mt-4 text-2xl font-black">Entrá con tu correo</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Te mandamos un código de 4 caracteres para que la ruleta sea tuya. Usá el mismo correo de tus pedidos.
      </p>

      <label className="mt-5 block text-xs font-bold text-[var(--text-muted)]">
        Correo
        <span className="relative mt-1.5 block">
          <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            disabled={enviado}
            autoComplete="email"
            placeholder="tu@correo.com"
            className="h-12 w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] pl-10 pr-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15 disabled:opacity-60"
          />
        </span>
      </label>

      {enviado && (
        <label className="mt-4 block text-xs font-bold text-[var(--text-muted)]">
          Código que te llegó
          <input
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase().slice(0, 4))}
            autoFocus
            placeholder="AB12"
            className="mt-1.5 h-14 w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
          />
        </label>
      )}

      {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}

      <button
        type="button"
        disabled={cargando || (!enviado ? !email.includes("@") : codigo.length < 4)}
        onClick={() => void (enviado ? verificar() : pedirCodigo())}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ef4444,#b91c1c)] text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_12px_30px_rgba(220,38,38,0.35)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        {cargando && <LoaderCircle size={16} className="animate-spin" />}
        {enviado ? "Entrar" : "Mandame el código"}
      </button>
      {enviado && (
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setCodigo("");
          }}
          className="mt-2 w-full text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          Cambiar correo
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rueda, premios y canjes                                             */
/* ------------------------------------------------------------------ */

function Juego({
  sesion,
  estado,
  onEstado,
  onRecargar,
}: {
  sesion: Sesion;
  estado: Estado;
  onEstado: (estado: Estado) => void;
  onRecargar: () => void;
}) {
  const [giro, setGiro] = useState(0);
  const [girando, setGirando] = useState(false);
  const [ganado, setGanado] = useState<Ganado | null>(null);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [canjeando, setCanjeando] = useState("");
  const pendiente = useRef<{ ganado: Ganado; puede: boolean; proxima: string; puntos: number } | null>(null);

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(reloj);
  }, []);

  const cantidad = estado.premios.length || 8;
  const porcion = 360 / cantidad;
  const espera = !estado.puede && estado.proxima ? faltaPara(estado.proxima, ahora) : "";

  async function girar() {
    if (girando || !estado.puede) return;
    setError("");
    setGirando(true);
    try {
      const data = await llamar({ tipo: "ruleta_girar", email: sesion.email, token: sesion.token });
      // La porción ganadora queda abajo de la flecha (arriba de la rueda).
      const centro = data.indice * porcion + porcion / 2;
      const azar = (Math.random() - 0.5) * porcion * 0.6;
      const vueltas = 360 * 6;
      setGiro((anterior) => anterior - (anterior % 360) + vueltas + (360 - centro) + azar);
      pendiente.current = { ganado: data.premio, puede: data.puede, proxima: data.proxima, puntos: data.puntos };
    } catch (errorGiro) {
      setError(errorGiro instanceof Error ? errorGiro.message : "No se pudo girar.");
      setGirando(false);
    }
  }

  function alTerminar() {
    if (!pendiente.current) return;
    const resultado = pendiente.current;
    pendiente.current = null;
    setGirando(false);
    setGanado(resultado.ganado);
    onEstado({ ...estado, puede: resultado.puede, proxima: resultado.proxima, puntos: resultado.puntos });
    if (["puntos", "descuento", "regalo"].includes(resultado.ganado.tipo)) onRecargar();
  }

  async function canjear(id: string) {
    setCanjeando(id);
    setError("");
    try {
      const data = await llamar({ tipo: "puntos_canjear", email: sesion.email, token: sesion.token, opcion: id });
      setGanado(data.premio);
      onEstado({ ...estado, puntos: data.puntos });
      onRecargar();
    } catch (errorCanje) {
      setError(errorCanje instanceof Error ? errorCanje.message : "No se pudo canjear.");
    } finally {
      setCanjeando("");
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Rueda */}
        <div className="rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_80%,transparent)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-black">¡Hola, {estado.alias || "Kint"}!</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-500 ring-1 ring-inset ring-amber-400/40">
              <Star size={15} fill="currentColor" />
              {estado.puntos.toLocaleString("es-UY")} puntos
            </span>
          </div>

          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[420px]">
            {/* Brillo detrás */}
            <div className="absolute inset-6 rounded-full bg-[conic-gradient(from_0deg,#ef4444,#facc15,#10b981,#38bdf8,#8b5cf6,#ef4444)] opacity-40 blur-2xl" />
            {/* Flecha */}
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
              <div className="h-0 w-0 border-x-[16px] border-t-[28px] border-x-transparent border-t-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
            </div>
            <svg
              viewBox="0 0 300 300"
              className="relative z-10 h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
              style={{
                transform: `rotate(${giro}deg)`,
                transition: girando ? "transform 5.2s cubic-bezier(0.12, 0.7, 0.08, 1)" : "none",
              }}
              onTransitionEnd={alTerminar}
              aria-label="Ruleta de premios"
              role="img"
            >
              <circle cx="150" cy="150" r="148" fill="#0b1530" stroke="#facc15" strokeWidth="4" />
              {estado.premios.map((premio, indice) => {
                const inicio = (indice * porcion - 90) * (Math.PI / 180);
                const fin = ((indice + 1) * porcion - 90) * (Math.PI / 180);
                const x1 = 150 + 140 * Math.cos(inicio);
                const y1 = 150 + 140 * Math.sin(inicio);
                const x2 = 150 + 140 * Math.cos(fin);
                const y2 = 150 + 140 * Math.sin(fin);
                const medio = indice * porcion + porcion / 2;
                return (
                  <g key={`${premio.nombre}-${indice}`}>
                    <path d={`M150,150 L${x1},${y1} A140,140 0 0,1 ${x2},${y2} Z`} fill={premio.color} stroke="#0b1530" strokeWidth="2" />
                    <text
                      x="150"
                      y="42"
                      transform={`rotate(${medio} 150 150)`}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={premio.nombre.length > 14 ? 9 : 11}
                      fontWeight="900"
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 2 }}
                    >
                      {premio.nombre.length > 18 ? `${premio.nombre.slice(0, 17)}…` : premio.nombre}
                    </text>
                  </g>
                );
              })}
              {/* Lucecitas del borde */}
              {Array.from({ length: 24 }, (_, indice) => {
                const angulo = (indice / 24) * Math.PI * 2;
                return (
                  <circle
                    key={indice}
                    cx={150 + 146 * Math.cos(angulo)}
                    cy={150 + 146 * Math.sin(angulo)}
                    r="2.6"
                    fill={indice % 2 ? "#ffffff" : "#facc15"}
                  />
                );
              })}
            </svg>
            {/* Botón del centro */}
            <button
              type="button"
              onClick={() => void girar()}
              disabled={girando || !estado.puede}
              className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white bg-[radial-gradient(circle_at_30%_30%,#f87171,#b91c1c)] text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(220,38,38,0.55)] transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {girando ? <LoaderCircle size={22} className="animate-spin" /> : estado.puede ? "Girar" : "🔒"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm font-bold text-[var(--text-muted)]">
            {estado.puede
              ? "¡Tenés una tirada! Tocá «Girar»."
              : espera
              ? `Tu próxima tirada en ${espera}.`
              : "Volvé pronto para girar de nuevo."}
          </p>
          {error && <p className="mt-2 text-center text-sm font-bold text-red-500">{error}</p>}
        </div>

        {/* Costado: canjes y premios */}
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_80%,transparent)] p-5 backdrop-blur-xl">
            <p className="flex items-center gap-2 text-base font-black">
              <Gift size={18} className="text-red-500" />
              Canjeá tus puntos
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Cuando quieras, sin necesidad de comprar.</p>
            <div className="mt-4 space-y-2">
              {estado.canjes.map((canje) => {
                const alcanza = estado.puntos >= canje.puntos;
                return (
                  <button
                    key={canje.id}
                    type="button"
                    disabled={!alcanza || Boolean(canjeando)}
                    onClick={() => void canjear(canje.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-4 py-3 text-left transition enabled:hover:border-amber-400/60 enabled:hover:bg-amber-400/10 disabled:opacity-50"
                  >
                    <span className="text-sm font-bold">{canje.nombre}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-500">
                      {canjeando === canje.id ? <LoaderCircle size={12} className="animate-spin" /> : <Star size={12} fill="currentColor" />}
                      {canje.puntos}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_80%,transparent)] p-5 backdrop-blur-xl">
            <p className="flex items-center gap-2 text-base font-black">
              <Ticket size={18} className="text-sky-400" />
              Mis premios
            </p>
            {estado.misPremios.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">Todavía no ganaste nada. ¡Girá la ruleta!</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {estado.misPremios.map((premio, indice) => (
                  <li key={`${premio.fecha}-${indice}`} className="rounded-2xl bg-[var(--kint-panel-soft)] px-3.5 py-3">
                    <p className="flex items-center justify-between gap-2 text-sm font-black">
                      {premio.premio}
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{fechaCorta(premio.fecha)}</span>
                    </p>
                    {premio.codigo && <CodigoCopiable codigo={premio.codigo} vence={premio.vence} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {ganado && <Resultado ganado={ganado} onCerrar={() => setGanado(null)} />}
    </>
  );
}

function CodigoCopiable({ codigo, vence }: { codigo: string; vence: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <span className="mt-1.5 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(codigo);
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 1500);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-sky-400/60 px-2.5 py-1 font-mono text-sm font-black tracking-wider text-sky-400"
      >
        {codigo}
        {copiado ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {vence && <span className="text-[10px] font-bold text-[var(--text-muted)]">vence {fechaCorta(vence)}</span>}
    </span>
  );
}

/* Cartel del premio, con papelitos de colores. */
function Resultado({ ganado, onCerrar }: { ganado: Ganado; onCerrar: () => void }) {
  const gano = ["puntos", "descuento", "regalo"].includes(ganado.tipo);
  const titulo =
    ganado.tipo === "otra" ? "¡Otra tirada!" : ganado.tipo === "nada" ? "Esta vez no hubo suerte" : "¡Ganaste!";
  const [papelitos] = useState(() =>
    Array.from({ length: 40 }, (_, indice) => ({
      izquierda: Math.random() * 100,
      demora: Math.random() * 0.6,
      color: ["#ef4444", "#facc15", "#10b981", "#38bdf8", "#8b5cf6", "#f472b6"][indice % 6],
      giro: Math.random() * 360,
    }))
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      {gano && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {papelitos.map((papel, indice) => (
            <span
              key={indice}
              className="absolute top-[-20px] h-3 w-2 animate-[caer_2.4s_ease-in_forwards] rounded-sm"
              style={{
                left: `${papel.izquierda}%`,
                background: papel.color,
                animationDelay: `${papel.demora}s`,
                transform: `rotate(${papel.giro}deg)`,
              }}
            />
          ))}
          <style>{`@keyframes caer{to{transform:translateY(110vh) rotate(720deg);opacity:.9}}`}</style>
        </div>
      )}
      <div
        onClick={(evento) => evento.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,#2a4fa8,#16295c_50%,#0b1530)] p-7 text-center text-white shadow-2xl"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">
          {gano ? "🎉" : ganado.tipo === "otra" ? "🔄" : "🍀"}
        </span>
        <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-white/60">{titulo}</p>
        <p className="mt-1 text-3xl font-black">{ganado.nombre}</p>
        {ganado.codigo && (
          <div className="mt-5 rounded-2xl bg-black/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Tu código</p>
            <p className="mt-1 font-mono text-2xl font-black tracking-[0.15em]">{ganado.codigo}</p>
            {ganado.vence && <p className="mt-1 text-xs text-white/60">Vence el {fechaCorta(ganado.vence)}</p>}
          </div>
        )}
        <p className="mt-4 text-sm text-white/70">
          {ganado.tipo === "puntos"
            ? "Ya están en tu cuenta."
            : ganado.tipo === "otra"
            ? "Tocá «Girar» de nuevo."
            : ganado.tipo === "nada"
            ? "En 2 días tenés otra oportunidad."
            : "Te lo mandamos también por correo."}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[#16295c] transition hover:brightness-95"
        >
          <Sparkles size={16} />
          {ganado.tipo === "otra" ? "¡Vamos!" : "Genial"}
        </button>
      </div>
    </div>
  );
}
