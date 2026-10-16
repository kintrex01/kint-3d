"use client";

/*
 * Estructura del panel: barra superior, navegación inferior en el
 * celular y lateral en la compu. La pantalla de login va sin estructura.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Home,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Sun,
  Users,
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
  enBarra?: boolean; // aparece en la barra inferior del celular
};

export const ENLACES_ADMIN: Enlace[] = [
  { href: "/admin", texto: "Inicio", icono: Home, enBarra: true },
  { href: "/admin/pedidos", texto: "Maquetas", icono: Package, enBarra: true },
  { href: "/admin/tienda", texto: "Tienda", icono: ShoppingBag, enBarra: true },
  { href: "/admin/calendario", texto: "Calendario", icono: CalendarDays, enBarra: true },
  { href: "/admin/todos", texto: "Todos los pedidos", icono: ListOrdered },
  { href: "/admin/productos", texto: "Productos", icono: Wrench },
  { href: "/admin/resenas", texto: "Reseñas", icono: Star },
  { href: "/admin/clientes", texto: "Clientes", icono: Users },
  { href: "/admin/configuracion", texto: "Configuración", icono: Settings },
];

function activo(pathname: string, href: string) {
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
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-main)] lg:pl-64">
        {/* Lateral (compu) */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-4 py-6 lg:flex">
          <Link href="/admin" className="mb-8 px-3">
            <span className="kint-logo-font block text-xl text-[var(--text-main)]">
              KINT <span className="text-[var(--blue-main)]">3D</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Panel de gestión
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1" aria-label="Panel">
            {ENLACES_ADMIN.map((enlace) => {
              const Icono = enlace.icono;
              const esActivo = activo(pathname, enlace.href);
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  aria-current={esActivo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    esActivo
                      ? "bg-[#1f3f85] text-white"
                      : "text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Icono size={18} />
                  {enlace.texto}
                </Link>
              );
            })}
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
            <span className="kint-logo-font block text-base leading-tight">
              KINT <span className="text-[var(--blue-main)]">3D</span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Panel
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
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--kint-panel-border)] bg-[var(--kint-panel)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          {ENLACES_ADMIN.filter((enlace) => enlace.enBarra).map((enlace) => {
            const Icono = enlace.icono;
            const esActivo = activo(pathname, enlace.href);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={esActivo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                  esActivo
                    ? "text-[#1f3f85] dark:text-[var(--blue-soft)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <Icono size={21} strokeWidth={esActivo ? 2.4 : 1.9} />
                {enlace.texto}
              </Link>
            );
          })}
          <Link
            href="/admin/mas"
            aria-current={enMas ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
              enMas
                ? "text-[#1f3f85] dark:text-[var(--blue-soft)]"
                : "text-[var(--text-muted)]"
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
