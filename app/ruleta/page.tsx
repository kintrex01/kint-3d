"use client";

/*
 * Ruleta Kint: se gana un giro cada X horas y se guardan hasta N; también se
 * gira con puntos. Los premios cambian cada día a las 00 y el más raro va
 * tapado (Premios_Kint3D.js). Se canjean puntos y se ve el Top Kint.
 * Se entra con la misma sesión de Mi cuenta (código por correo).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Gift, KeyRound, LoaderCircle, Mail, Sparkles, Ticket, Trophy } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import FondoKintAnimado from "@/components/FondoKintAnimado";

const CLAVE_SESION = "kint-cuenta-sesion-v1";

type Sesion = { email: string; token: string };
type PremioRueda = {
  nombre: string;
  color: string;
  tipo: string; // "misterio" = el premio más raro, tapado
  tamano?: number;
  rareza?: string;
  chance?: number | null; // solo si se muestran los %
};
type Giros = {
  puede: boolean;
  proxima: string;
  normales: number;
  acumulables: number;
  extras: number;
  regalo: number; // -1 = ilimitados
};
type PuestoTop = { puesto: number; alias: string; puntos: number };
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
  regalo?: number; // giros de regalo de Kint (-1 = ilimitados)
  giros: Giros;
  costoPuntos: number; // 0 = no se gira con puntos
  horas: number;
  mostrar: "rareza" | "porcentaje" | "nada";
  cambiaEn: string;
  puntos: number;
  alias: string;
  canjes: { id: string; nombre: string; puntos: number }[];
  top?: { habilitado: boolean; ranking: PuestoTop[]; miPuesto: { puesto: number; puntos: number } | null };
  misPremios: MiPremio[];
};
type Ganado = { nombre: string; tipo: string; codigo: string; vence: string; misterio?: boolean };

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
      const guardada = JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
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
        localStorage.removeItem(CLAVE_SESION);
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
    <main className="relative -mt-28 min-h-screen overflow-hidden px-4 pb-24 text-[var(--text-main)] sm:-mt-32 sm:px-6">
      <div className="fixed right-6 top-6 z-[1000]">
        <ThemeToggle />
      </div>

      {/* El fondo sube hasta el borde de arriba (el menú deja h-28 / sm:h-32 libres). */}
      <section className="relative isolate -mx-4 mb-[-7rem] overflow-hidden px-4 pb-32 pt-32 sm:-mx-6 sm:px-6 sm:pt-24">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_50%,transparent)]">
          <FondoKintAnimado />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-red-500">Premios Kint</p>
          <h1 className="mt-2 bg-[linear-gradient(90deg,#f87171,#facc15_45%,#60a5fa)] bg-clip-text text-5xl font-black leading-none text-transparent sm:text-7xl">
            Ruleta Kint
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Juntá giros, giralos cuando quieras y competí en el Top Kint. Los premios cambian todos los días a las
            00:00 y el más grande siempre es un misterio.
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
        localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
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
        Te mandamos un código de 5 caracteres para que la ruleta sea tuya. Usá el mismo correo de tus pedidos.
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
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase().slice(0, 5))}
            autoFocus
            placeholder="AB12C"
            className="mt-1.5 h-14 w-full rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-input-bg)] px-4 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
          />
        </label>
      )}

      {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}

      <button
        type="button"
        disabled={cargando || (!enviado ? !email.includes("@") : codigo.length < 5)}
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
/* Rueda, premios del día, Top Kint y canjes                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Sonidos cortitos (sin archivos): tic de cada porción y fanfarria     */
/* ------------------------------------------------------------------ */

let audio: AudioContext | null = null;

function sonar(frecuencia: number, duracion: number, volumen = 0.08, tipo: OscillatorType = "square", demora = 0) {
  try {
    audio ??= new AudioContext();
    const inicio = audio.currentTime + demora;
    const oscilador = audio.createOscillator();
    const ganancia = audio.createGain();
    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frecuencia, inicio);
    ganancia.gain.setValueAtTime(volumen, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    oscilador.connect(ganancia).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion);
  } catch {
    // Sin sonido: no pasa nada.
  }
}

const tic = () => sonar(1900, 0.035, 0.05);
const fanfarria = () => [523, 659, 784, 1047].forEach((nota, indice) => sonar(nota, 0.22, 0.07, "triangle", indice * 0.11));
const pena = () => [392, 330].forEach((nota, indice) => sonar(nota, 0.25, 0.06, "sine", indice * 0.18));

/* Frenado largo: arranca rápido y los últimos segundos va porción por porción. */
function frenado(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

const DURACION_GIRO = 9000;
const VUELTAS = 8;
const BOMBITAS = 36;

/* Texto de cada porción: a lo largo del radio, con la letra que entra. */
const RADIO_TEXTO = 94; // centro del texto
const LARGO_TEXTO = 82; // del botón del centro hasta el borde

function textoPorcion(porcion: { nombre: string; tipo: string; ancho: number }) {
  if (porcion.tipo === "misterio") return { texto: "❓ ???", tamano: Math.min(14, porcion.ancho * 0.9) };
  const anchoArco = ((2 * Math.PI * RADIO_TEXTO) / 360) * porcion.ancho;
  const nombre = porcion.nombre;
  const porAlto = anchoArco * 0.62;
  const porLargo = LARGO_TEXTO / (Math.max(nombre.length, 4) * 0.6);
  const tamano = Math.min(13, porAlto, porLargo);
  if (tamano >= 7) return { texto: nombre, tamano };
  // No entra: un dibujito.
  const icono =
    porcion.tipo === "regalo" ? "🎁" : porcion.tipo === "puntos" ? "✨" : porcion.tipo === "descuento" ? "%" : porcion.tipo === "otra" ? "🔄" : "😬";
  return { texto: icono, tamano: Math.max(8, Math.min(13, porAlto)) };
}

const COLOR_RAREZA: Record<string, string> = {
  Común: "bg-slate-400/15 text-slate-400 ring-slate-400/30",
  Raro: "bg-sky-400/15 text-sky-400 ring-sky-400/40",
  Épico: "bg-violet-400/15 text-violet-400 ring-violet-400/40",
  Legendario: "bg-amber-400/15 text-amber-400 ring-amber-400/50",
  "???": "bg-[linear-gradient(90deg,#f59e0b33,#ec489933)] text-amber-300 ring-amber-300/60",
};

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
  const [girando, setGirando] = useState(false);
  const [ganado, setGanado] = useState<Ganado | null>(null);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [canjeando, setCanjeando] = useState("");
  const [sonido, setSonido] = useState(() => {
    try {
      return localStorage.getItem("kint-ruleta-sonido") !== "no";
    } catch {
      return true;
    }
  });
  const rueda = useRef<SVGSVGElement>(null);
  const flecha = useRef<HTMLDivElement>(null);
  const angulo = useRef(0);

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(reloj);
  }, []);

  // Porciones de distinto tamaño (las manda el servidor).
  const porciones = useMemo(() => {
    const tamanos = estado.premios.map((premio) => Math.max(0.2, premio.tamano || 1));
    const total = tamanos.reduce((suma, tamano) => suma + tamano, 0);
    return estado.premios.map((premio, indice) => {
      const ancho = (tamanos[indice] / total) * 360;
      const inicio = (tamanos.slice(0, indice).reduce((suma, tamano) => suma + tamano, 0) / total) * 360;
      return { ...premio, inicio, ancho };
    });
  }, [estado.premios]);

  const giros = estado.giros;
  const totalGiros =
    giros.regalo === -1 ? Infinity : giros.normales + giros.extras + Math.max(0, giros.regalo);
  const espera = giros.proxima ? faltaPara(giros.proxima, ahora) : "";
  const cambian = faltaPara(estado.cambiaEn, ahora);
  const puedeComprar = estado.costoPuntos > 0 && !estado.puede;
  const alcanzaComprar = estado.puntos >= estado.costoPuntos;
  // Premios de hoy: del más raro al más común (el misterio primero).
  const premiosHoy = estado.premios
    .filter((premio) => premio.tipo !== "nada")
    .sort((a, b) => (a.tipo === "misterio" ? -1 : b.tipo === "misterio" ? 1 : (a.tamano ?? 0) - (b.tamano ?? 0)));

  function porcionEn(rotacion: number) {
    const bajoFlecha = (((360 - (rotacion % 360)) % 360) + 360) % 360;
    return porciones.findIndex((porcion) => bajoFlecha >= porcion.inicio && bajoFlecha < porcion.inicio + porcion.ancho);
  }

  function animar(destino: number, alTerminar: () => void) {
    const desde = angulo.current;
    const comienzo = performance.now();
    let anterior = porcionEn(desde);
    const paso = (momento: number) => {
      const t = Math.min(1, (momento - comienzo) / DURACION_GIRO);
      const actual = desde + (destino - desde) * frenado(t);
      angulo.current = actual;
      if (rueda.current) rueda.current.style.transform = `rotate(${actual}deg)`;
      const debajo = porcionEn(actual);
      if (debajo !== anterior) {
        anterior = debajo;
        if (sonido) tic();
        flecha.current?.animate(
          [{ transform: "translateX(-50%) rotate(-22deg)" }, { transform: "translateX(-50%) rotate(0deg)" }],
          { duration: 140, easing: "ease-out" }
        );
      }
      if (t < 1) requestAnimationFrame(paso);
      else alTerminar();
    };
    requestAnimationFrame(paso);
  }

  async function girar(conPuntos = false) {
    if (girando || (!estado.puede && !conPuntos)) return;
    setError("");
    setGirando(true);
    if (sonido) tic(); // habilita el audio con el toque
    try {
      const data = await llamar({
        tipo: "ruleta_girar",
        email: sesion.email,
        token: sesion.token,
        ...(conPuntos ? { conPuntos: "si" } : {}),
      });
      const porcion = porciones[data.indice];
      // Cae en un lugar al azar de la porción ganadora (no siempre en el medio).
      const dentro = porcion ? porcion.inicio + porcion.ancho * (0.2 + Math.random() * 0.6) : 0;
      const actual = angulo.current;
      const destino = actual - (actual % 360) + 360 * VUELTAS + (360 - dentro);
      // Los puntos gastados se ven al toque.
      if (conPuntos) onEstado({ ...estado, puntos: estado.puntos - estado.costoPuntos });
      animar(destino, () => {
        setGirando(false);
        setGanado(data.premio);
        const gano = ["puntos", "descuento", "regalo"].includes(data.premio.tipo);
        if (sonido) (gano || data.premio.tipo === "otra" ? fanfarria : pena)();
        onEstado({
          ...estado,
          giros: data.giros,
          puede: data.puede,
          proxima: data.proxima,
          regalo: data.regalo,
          puntos: data.puntos,
        });
        if (gano) onRecargar();
      });
    } catch (errorGiro) {
      setError(errorGiro instanceof Error ? errorGiro.message : "No se pudo girar.");
      setGirando(false);
    }
  }

  async function canjear(id: string) {
    setCanjeando(id);
    setError("");
    try {
      const data = await llamar({ tipo: "puntos_canjear", email: sesion.email, token: sesion.token, opcion: id });
      setGanado(data.premio);
      if (sonido) fanfarria();
      onEstado({ ...estado, puntos: data.puntos });
      onRecargar();
    } catch (errorCanje) {
      setError(errorCanje instanceof Error ? errorCanje.message : "No se pudo canjear.");
    } finally {
      setCanjeando("");
    }
  }

  function alternarSonido() {
    const nuevo = !sonido;
    setSonido(nuevo);
    try {
      localStorage.setItem("kint-ruleta-sonido", nuevo ? "si" : "no");
    } catch {
      // Sin almacenamiento.
    }
  }

  const tarjeta =
    "rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_80%,transparent)] p-5 backdrop-blur-xl";

  return (
    <>
      <style>{`
        @keyframes kint-bombita { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes kint-brillo { 0%, 100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.04); } }
        @keyframes kint-chispa { 0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(90deg); } }
        @keyframes kint-misterio { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.35); } }
      `}</style>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Rueda */}
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--kint-panel-border)] bg-[color-mix(in_srgb,var(--kint-panel)_80%,transparent)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-black">¡Hola, {estado.alias || "Kint"}!</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={alternarSonido}
                aria-label={sonido ? "Silenciar" : "Activar sonido"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kint-panel-border)] text-base transition hover:bg-[var(--kint-panel-soft)]"
              >
                {sonido ? "🔊" : "🔇"}
              </button>
              <span
                title="Giros que tenés para usar"
                className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-3 py-1.5 text-sm font-black text-fuchsia-500 ring-1 ring-inset ring-fuchsia-400/40"
              >
                🎟️ {totalGiros === Infinity ? "∞" : totalGiros}
              </span>
              <span
                title="Tus puntos"
                className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-500 ring-1 ring-inset ring-amber-400/40"
              >
                {estado.puntos.toLocaleString("es-UY")} ✨
              </span>
            </div>
          </div>

          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[460px]">
            {/* Brillo de colores detrás */}
            <div
              className="absolute inset-4 rounded-full bg-[conic-gradient(from_0deg,#ef4444,#facc15,#10b981,#38bdf8,#8b5cf6,#ef4444)] blur-2xl"
              style={{ animation: `kint-brillo ${girando ? "0.8s" : "3s"} ease-in-out infinite` }}
            />
            {/* Chispitas alrededor */}
            {[12, 30, 58, 77, 88].map((lugar, indice) => (
              <span
                key={lugar}
                aria-hidden
                className="absolute text-xl"
                style={{
                  left: `${lugar}%`,
                  top: `${[4, 90, 2, 86, 40][indice]}%`,
                  animation: `kint-chispa ${1.6 + indice * 0.3}s ease-in-out ${indice * 0.4}s infinite`,
                }}
              >
                ✦
              </span>
            ))}

            {/* Flecha (rebota en cada porción) */}
            <div
              ref={flecha}
              className="absolute left-1/2 top-[-6px] z-30 origin-[50%_20%]"
              style={{ transform: "translateX(-50%)" }}
            >
              <svg width="44" height="56" viewBox="0 0 44 56" aria-hidden>
                <defs>
                  <linearGradient id="kint-flecha" x1="0" x2="1">
                    <stop offset="0" stopColor="#fde68a" />
                    <stop offset="1" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <path d="M22 54 L5 16 A18 18 0 1 1 39 16 Z" fill="url(#kint-flecha)" stroke="#78350f" strokeWidth="2" />
                <circle cx="22" cy="18" r="7" fill="#dc2626" stroke="#fff" strokeWidth="2" />
              </svg>
            </div>

            <svg
              ref={rueda}
              viewBox="0 0 320 320"
              className="relative z-10 h-full w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
              aria-label="Ruleta de premios"
              role="img"
            >
              <defs>
                <linearGradient id="kint-aro" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fef3c7" />
                  <stop offset="0.5" stopColor="#d97706" />
                  <stop offset="1" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="kint-misterio" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fde047" />
                  <stop offset="0.5" stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#db2777" />
                </linearGradient>
                <radialGradient id="kint-sombra" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0.7" stopColor="rgba(0,0,0,0)" />
                  <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
                </radialGradient>
              </defs>
              {/* Aro dorado */}
              <circle cx="160" cy="160" r="158" fill="url(#kint-aro)" />
              <circle cx="160" cy="160" r="146" fill="#0b1530" />
              {porciones.map((porcion, indice) => {
                const inicio = (porcion.inicio - 90) * (Math.PI / 180);
                const fin = (porcion.inicio + porcion.ancho - 90) * (Math.PI / 180);
                const grande = porcion.ancho > 180 ? 1 : 0;
                const x1 = 160 + 142 * Math.cos(inicio);
                const y1 = 160 + 142 * Math.sin(inicio);
                const x2 = 160 + 142 * Math.cos(fin);
                const y2 = 160 + 142 * Math.sin(fin);
                const medio = porcion.inicio + porcion.ancho / 2;
                const misterio = porcion.tipo === "misterio";
                const { texto, tamano } = textoPorcion(porcion);
                return (
                  <g key={`${porcion.nombre}-${indice}`}>
                    <path
                      d={`M160,160 L${x1},${y1} A142,142 0 ${grande},1 ${x2},${y2} Z`}
                      fill={misterio ? "url(#kint-misterio)" : porcion.color}
                      stroke="#fde68a"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                      style={misterio ? { animation: "kint-misterio 1.6s ease-in-out infinite" } : undefined}
                    />
                    <text
                      x={160 + RADIO_TEXTO}
                      y="160"
                      transform={`rotate(${medio - 90} 160 160)`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ffffff"
                      fontSize={tamano}
                      fontWeight="900"
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 2.5 }}
                    >
                      {texto}
                    </text>
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="146" fill="url(#kint-sombra)" pointerEvents="none" />
              {/* Bombitas del borde: titilan (más rápido mientras gira) */}
              {Array.from({ length: BOMBITAS }, (_, indice) => {
                const angulo = (indice / BOMBITAS) * Math.PI * 2;
                return (
                  <circle
                    key={indice}
                    cx={160 + 152 * Math.cos(angulo)}
                    cy={160 + 152 * Math.sin(angulo)}
                    r="3.2"
                    fill={indice % 2 ? "#ffffff" : "#fde047"}
                    style={{
                      animation: `kint-bombita ${girando ? "0.35s" : "1.4s"} ease-in-out ${(indice % 2) * (girando ? 0.17 : 0.7)}s infinite`,
                      filter: "drop-shadow(0 0 3px #fde047)",
                    }}
                  />
                );
              })}
            </svg>

            {/* Botón del centro */}
            <button
              type="button"
              onClick={() => void girar()}
              disabled={girando || !estado.puede}
              className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[5px] border-amber-200 bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#dc2626_45%,#7f1d1d)] text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(220,38,38,0.6),inset_0_-6px_12px_rgba(0,0,0,0.35)] transition enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed"
            >
              {girando ? <LoaderCircle size={24} className="animate-spin" /> : estado.puede ? "Girar" : "🔒"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm font-bold text-[var(--text-muted)]">
            {girando
              ? "¡Girando…!"
              : estado.puede
              ? totalGiros === Infinity
                ? "Tenés giros ilimitados. ¡Dale!"
                : `¡Tenés ${totalGiros} ${totalGiros === 1 ? "giro" : "giros"}! Tocá «Girar».`
              : espera
              ? `Tu próximo giro en ${espera}.`
              : "Volvé pronto para girar de nuevo."}
          </p>
          <p className="mt-1 text-center text-[11px] text-[var(--text-muted)]">
            Ganás un giro cada {estado.horas >= 24 && estado.horas % 24 === 0 ? `${estado.horas / 24} ${estado.horas === 24 ? "día" : "días"}` : `${estado.horas} h`} y
            guardás hasta {giros.acumulables}
            {giros.proxima && giros.normales > 0 ? ` (el próximo llega en ${espera})` : ""}.
          </p>

          {puedeComprar && (
            <button
              type="button"
              onClick={() => void girar(true)}
              disabled={girando || !alcanzaComprar}
              className="mx-auto mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-5 text-sm font-black text-amber-500 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-amber-400/20 disabled:opacity-50"
            >
              Girar ahora por {estado.costoPuntos} ✨
              {!alcanzaComprar && (
                <span className="text-[11px] font-bold opacity-80">· te faltan {estado.costoPuntos - estado.puntos}</span>
              )}
            </button>
          )}

          <p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">
            Los premios se reclaman con el código en «Código de descuento o premio» al cotizar o en el seguimiento.
          </p>
          {error && <p className="mt-2 text-center text-sm font-bold text-red-500">{error}</p>}
        </div>

        {/* Costado */}
        <div className="space-y-6">
          {/* Premios de hoy */}
          <div className={tarjeta}>
            <p className="flex items-center justify-between gap-2 text-base font-black">
              <span className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                Premios de hoy
              </span>
              {cambian && (
                <span className="rounded-full bg-[var(--kint-panel-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--text-muted)]">
                  Cambian en {cambian}
                </span>
              )}
            </p>
            <ul className="mt-3 space-y-1.5">
              {premiosHoy.map((premio, indice) => (
                <li
                  key={`${premio.nombre}-${indice}`}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                    premio.tipo === "misterio"
                      ? "bg-[linear-gradient(90deg,rgba(245,158,11,0.18),rgba(219,39,119,0.14))] ring-1 ring-inset ring-amber-400/40"
                      : "bg-[var(--kint-panel-soft)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: premio.color }} />
                    <span className="truncate">{premio.tipo === "misterio" ? "❓ Premio misterioso" : premio.nombre}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {premio.chance !== null && premio.chance !== undefined && premio.tipo !== "misterio" && (
                      <span className="text-[11px] font-black tabular-nums text-[var(--text-muted)]">
                        {String(premio.chance).replace(".", ",")}%
                      </span>
                    )}
                    {estado.mostrar !== "nada" && premio.rareza && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${COLOR_RAREZA[premio.rareza] ?? COLOR_RAREZA.Común}`}>
                        {premio.rareza}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] leading-4 text-[var(--text-muted)]">
              Todos los días a las 00:00 salen premios nuevos. El más grande va tapado: solo lo descubre quien lo gana.
            </p>
          </div>

          {/* Top Kint */}
          {estado.top?.habilitado && estado.top.ranking.length > 0 && (
            <div className={tarjeta}>
              <p className="flex items-center justify-between gap-2 text-base font-black">
                <span className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  Top Kint
                </span>
                {estado.top.miPuesto && (
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-500">
                    Vos: #{estado.top.miPuesto.puesto}
                  </span>
                )}
              </p>
              <ol className="mt-3 space-y-1">
                {estado.top.ranking.map((item) => {
                  const soyYo = item.alias === estado.alias;
                  return (
                    <li
                      key={item.puesto}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm ${
                        soyYo ? "bg-amber-400/15 ring-1 ring-inset ring-amber-400/40" : ""
                      }`}
                    >
                      <span className="w-6 text-center font-black">
                        {item.puesto === 1 ? "🥇" : item.puesto === 2 ? "🥈" : item.puesto === 3 ? "🥉" : item.puesto}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-bold">{item.alias || "Anónimo"}</span>
                      <span className="font-black tabular-nums text-amber-500">{item.puntos.toLocaleString("es-UY")} ✨</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Sumá puntos con tus pedidos y con la ruleta para subir.</p>
            </div>
          )}

          {/* Canjes */}
          {estado.canjes.length > 0 && (
            <div className={tarjeta}>
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
                        {canjeando === canje.id && <LoaderCircle size={12} className="animate-spin" />}
                        {canje.puntos} ✨
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mis premios */}
          <div className={tarjeta}>
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
                    {/^Reclamado/i.test(premio.estado) && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-500">✓ {premio.estado}</p>
                    )}
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
  const titulo = ganado.misterio
    ? "¡Descubriste el premio misterioso!"
    : ganado.tipo === "otra"
    ? "¡Otra tirada!"
    : ganado.tipo === "nada"
    ? "Esta vez no hubo suerte"
    : "¡Ganaste!";
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
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,var(--acento-claro),var(--acento-oscuro)_50%,var(--acento-fondo))] p-7 text-center text-white shadow-2xl"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">
          {ganado.misterio ? "🏆" : gano ? "🎉" : ganado.tipo === "otra" ? "🔄" : "🍀"}
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
            ? "Juntá giros y probá de nuevo."
            : "Te lo mandamos también por correo."}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[var(--acento-oscuro)] transition hover:brightness-95"
        >
          <Sparkles size={16} />
          {ganado.tipo === "otra" ? "¡Vamos!" : "Genial"}
        </button>
      </div>
    </div>
  );
}
