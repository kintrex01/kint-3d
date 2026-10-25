"use client";

/*
 * Estructura del panel: barra superior, navegación inferior en el
 * celular y lateral en la compu. La pantalla de login va sin estructura.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calculator,
  Filter,
  Ruler,
  CalendarDays,
  Home,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Settings,
  Star,
  Sun,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ProveedorAvisos } from "@/components/admin/ui";
import { BarraProgreso } from "@/components/admin/ProgresoAdmin";
import { limpiarCacheAdmin, precargarAdmin } from "@/lib/admin-cliente";

type Enlace = {
  href: string;
  texto: string;
  icono: typeof Home;
  grupo: "Pedidos" | "Negocio" | "Catálogo" | "Ajustes";
  color: string; // color del ícono (sección)
  enBarra?: boolean; // aparece en la barra inferior del celular
};

export const ENLACES_ADMIN: Enlace[] = [
  { href: "/admin", texto: "Inicio", icono: Home, grupo: "Pedidos", color: "#60a5fa", enBarra: true },
  // Maquetas y tienda están juntas en "Todos los pedidos" (se filtran ahí).
  { href: "/admin/todos", texto: "Todos los pedidos", icono: ListOrdered, grupo: "Pedidos", color: "#38bdf8", enBarra: true },
  { href: "/admin/calendario", texto: "Calendario", icono: CalendarDays, grupo: "Pedidos", color: "#fbbf24", enBarra: true },
  { href: "/admin/caja", texto: "Caja", icono: Wallet, grupo: "Negocio", color: "#34d399" },
  { href: "/admin/calculadora", texto: "Calculadora", icono: Calculator, grupo: "Negocio", color: "#a78bfa" },
  { href: "/admin/escalador", texto: "Escalador", icono: Ruler, grupo: "Negocio", color: "#38bdf8" },
  { href: "/admin/embudo", texto: "Embudo de Cotizar", icono: Filter, grupo: "Negocio", color: "#22d3ee" },
  { href: "/admin/productos", texto: "Productos", icono: Wrench, grupo: "Catálogo", color: "#fb923c" },
  { href: "/admin/resenas", texto: "Reseñas", icono: Star, grupo: "Catálogo", color: "#facc15" },
  { href: "/admin/clientes", texto: "Clientes", icono: Users, grupo: "Catálogo", color: "#f472b6" },
  { href: "/admin/configuracion", texto: "Configuración", icono: Settings, grupo: "Ajustes", color: "#cbd5e1" },
];

const GRUPOS = ["Pedidos", "Negocio", "Catálogo", "Ajustes"] as const;

function activo(pathname: string, href: string) {
  // El detalle de una maqueta o de una compra de la tienda es parte de "Todos los pedidos".
  if (href === "/admin/todos" && /^\/admin\/(pedidos|tienda)(\/|$)/.test(pathname)) return true;
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/* Mismo criterio que ThemeToggle de la web: localStorage "theme". */
function BotonTema() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", guardado);
    // Sincroniza el ícono con el tema guardado al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOscuro(guardado);
  }, []);

  function cambiar() {
    const siguiente = !oscuro;
    setOscuro(siguiente);
    localStorage.setItem("theme", siguiente ? "dark" : "light");
    document.documentElement.classList.toggle("dark", siguiente);
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={oscuro ? "Usar modo claro" : "Usar modo oscuro"}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
    >
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export async function cerrarSesionAdmin() {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
  limpiarCacheAdmin();
  window.location.href = "/admin/login";
}

export default function ShellAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const esLogin = pathname === "/admin/login";

  /* Página desde la que se tocó un enlace: hasta que cambie, se muestra la barra. */
  const [navegandoDesde, setNavegandoDesde] = useState<string | null>(null);
  const navegando = navegandoDesde !== null && navegandoDesde === pathname;

  useEffect(() => {
    /* En captura: Link de Next cancela el clic antes de que llegue al documento. */
    function alClic(evento: MouseEvent) {
      if (
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      ) {
        return;
      }
      const enlace = (evento.target as Element | null)?.closest?.("a");
      if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download")) {
        return;
      }
      const destino = new URL(enlace.href, window.location.href);
      if (
        destino.origin !== window.location.origin ||
        !destino.pathname.startsWith("/admin") ||
        destino.pathname === window.location.pathname
      ) {
        return;
      }
      setNavegandoDesde(window.location.pathname);
    }

    document.addEventListener("click", alClic, true);
    return () => document.removeEventListener("click", alClic, true);
  }, []);

  /* Por si la navegación no llega a ocurrir. */
  useEffect(() => {
    if (!navegandoDesde) return;
    const temporizador = window.setTimeout(() => setNavegandoDesde(null), 8000);
    return () => window.clearTimeout(temporizador);
  }, [navegandoDesde]);

  /* Al entrar: trae en segundo plano inicio, maquetas, tienda y calendario. */
  useEffect(() => {
    if (esLogin) return;
    const temporizador = window.setTimeout(precargarAdmin, 600);
    return () => window.clearTimeout(temporizador);
  }, [esLogin]);

  if (esLogin) {
    return <ProveedorAvisos>{children}</ProveedorAvisos>;
  }

  const enMas =
    pathname === "/admin/mas" ||
    ENLACES_ADMIN.some(
      (enlace) => !enlace.enBarra && activo(pathname, enlace.href)
    );

  return (
    <ProveedorAvisos>
      <BarraProgreso navegando={navegando} />
      <div className="min-h-screen text-[var(--text-main)] lg:pl-64">
        {/* Lateral (compu) */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-[var(--kint-panel-border)] bg-[linear-gradient(180deg,var(--kint-panel)_0%,color-mix(in_srgb,var(--kint-panel)_88%,var(--acento))_100%)] px-3 py-6 [scrollbar-width:thin] lg:flex">
          <Link href="/admin" className="group mb-7 flex items-center gap-3 px-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--acento-claro),var(--acento-oscuro))] text-sm font-black text-white shadow-[0_8px_24px_rgba(42,79,168,0.45)] transition group-hover:scale-105">
              K
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--kint-panel)] bg-emerald-400" />
            </span>
            <span>
              <span className="kint-logo-font block text-lg leading-none text-[var(--text-main)]">
                KINT <span className="text-[var(--blue-main)] dark:text-sky-300">3D</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
                Panel de gestión
              </span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-4" aria-label="Panel">
            {GRUPOS.map((grupo) => (
              <div key={grupo}>
                <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.26em] text-[var(--text-muted)] opacity-70">
                  {grupo}
                </p>
                <div className="flex flex-col gap-0.5">
                  {ENLACES_ADMIN.filter((enlace) => enlace.grupo === grupo).map((enlace) => {
                    const Icono = enlace.icono;
                    const esActivo = activo(pathname, enlace.href);
                    return (
                      <Link
                        key={enlace.href}
                        href={enlace.href}
                        aria-current={esActivo ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-bold transition ${
                          esActivo
                            ? "bg-[linear-gradient(90deg,rgba(42,79,168,0.55),rgba(42,79,168,0.12))] text-white shadow-[0_6px_20px_rgba(31,63,133,0.25)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        {esActivo && (
                          <span
                            aria-hidden
                            className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                            style={{ background: enlace.color, boxShadow: `0 0 12px ${enlace.color}` }}
                          />
                        )}
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-105"
                          style={{
                            color: enlace.color,
                            background: `color-mix(in srgb, ${enlace.color} ${esActivo ? 26 : 14}%, transparent)`,
                          }}
                        >
                          <Icono size={16} strokeWidth={2.2} />
                        </span>
                        {enlace.texto}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--kint-panel-border)] pt-4">
            <Link
              href="/"
              className="px-3 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              Ver la web ↗
            </Link>
            <div className="flex items-center">
              <BotonTema />
              <button
                type="button"
                onClick={cerrarSesionAdmin}
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--kint-panel-border)] bg-[var(--page-bg)]/90 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (pathname !== "/admin") setNavegandoDesde(pathname);
              router.push("/admin");
            }}
            className="text-left"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--acento-claro),var(--acento-oscuro))] text-xs font-black text-white shadow-[0_6px_18px_rgba(42,79,168,0.4)]">
                K
              </span>
              <span>
                <span className="kint-logo-font block text-base leading-tight">
                  KINT <span className="text-[var(--blue-main)] dark:text-sky-300">3D</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  Panel
                </span>
              </span>
            </span>
          </button>
          <BotonTema />
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          {children}
        </main>

        {/* Barra inferior (celular) */}
        <nav
          aria-label="Panel"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-3xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)]/90 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden"
        >
          {ENLACES_ADMIN.filter((enlace) => enlace.enBarra).map((enlace) => {
            const Icono = enlace.icono;
            const esActivo = activo(pathname, enlace.href);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={esActivo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold transition ${
                  esActivo ? "bg-[var(--kint-panel-soft)] text-[var(--text-main)]" : "text-[var(--text-muted)]"
                }`}
              >
                <Icono
                  size={20}
                  strokeWidth={esActivo ? 2.4 : 1.9}
                  style={esActivo ? { color: enlace.color, filter: `drop-shadow(0 0 6px ${enlace.color})` } : undefined}
                />
                {enlace.texto}
              </Link>
            );
          })}
          <Link
            href="/admin/mas"
            aria-current={enMas ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold transition ${
              enMas ? "bg-[var(--kint-panel-soft)] text-[var(--text-main)]" : "text-[var(--text-muted)]"
            }`}
          >
            <Menu size={21} strokeWidth={enMas ? 2.4 : 1.9} />
            Más
          </Link>
        </nav>
      </div>
    </ProveedorAvisos>
  );
}
