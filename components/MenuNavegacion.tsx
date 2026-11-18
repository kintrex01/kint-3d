"use client";

import Link from "next/link";
import SelectorFondo from "@/components/SelectorFondo";
import { usePathname } from "next/navigation";
import {
  Box,
  Calculator,
  CalendarClock,
  Images,
  FileText,
  HelpCircle,
    Home,
  MessageCircle,
  Package,
  Ruler,
  Send,
  Settings,
  Gift,
  ShoppingBag,
  ChevronDown,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
} from "react";

type IconoMenu = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

function IconoInstagram({
  size = 19,
  strokeWidth = 1.7,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        ry="5"
      />

      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <circle
        cx="17.5"
        cy="6.5"
        r="0.75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

type EnlaceMenu = {
  nombre: string;
  href: string;
  icono: IconoMenu;
  etiqueta?: string;
  externo?: boolean;
};

type GrupoMenuProps = {
  titulo: string;
  enlaces: EnlaceMenu[];
  pathname: string;
  cerrar: () => void;
  abierto: boolean;
  onAlternar: () => void;
};

/* Arriba de todo, en cuadrícula: lo que más se usa. */
const accesosRapidos: (EnlaceMenu & { destacado?: boolean })[] = [
  { nombre: "Cotizar", href: "/cotizar", icono: Send, destacado: true },
  { nombre: "Consultar pedido", href: "/seguimiento", icono: Package },
  { nombre: "Tienda", href: "/tienda", icono: ShoppingBag, etiqueta: "Nuevo" },
  { nombre: "Inicio", href: "/", icono: Home },
];

const enlacesTrabajos: EnlaceMenu[] = [
  {
    nombre: "Galería de lo impreso",
    href: "/galeria",
    icono: Images,
    etiqueta: "Nuevo",
  },
];

const enlacesAyuda: EnlaceMenu[] = [
  {
    nombre: "Agenda",
    href: "/agenda",
    icono: CalendarClock,
  },
];

const enlacesPreparacion: EnlaceMenu[] = [
  {
    nombre: "Guía para principiantes",
    href: "/tutorial",
    icono: FileText,
  },
  {
    nombre: "Guía avanzada STL",
    href: "/tutorial-avanzado",
    icono: Box,
    etiqueta: "Recomendado",
  },
  {
    nombre: "Escalador 3D",
    href: "/escalador",
    icono: Calculator,
  },
  {
  nombre: "Preparar mi modelo",
  href: "/preparador-3d",
  icono: Ruler,
  etiqueta: "Lo ordena y repara solo",
},
];

enlacesTrabajos.push(
  {
    nombre: "Reseñas verificadas",
    href: "/?ir=resenas",
    icono: MessageCircle,
  },
  {
    nombre: "Instagram",
    href: "https://www.instagram.com/kint.3d/",
    icono: IconoInstagram,
    externo: true,
  }
);

enlacesAyuda.push({
  nombre: "Preguntas frecuentes",
  href: "/tutorial?ir=preguntas",
  icono: HelpCircle,
});

/* Al final del menú: la cuenta del cliente (Ajustes). */
const enlacesCuenta: EnlaceMenu[] = [
  {
    nombre: "Ruleta y premios",
    href: "/ruleta",
    icono: Gift,
  },
  {
    nombre: "Ajustes de mi cuenta",
    href: "/cuenta",
    icono: Settings,
  },
];

function GrupoMenu({
  titulo,
  enlaces,
  pathname,
  cerrar,
  abierto,
  onAlternar,
}: GrupoMenuProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--glass-bg)]/40">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--blue-soft)]">{titulo}</span>
        <span className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)]">
          {!abierto && enlaces.length}
          <ChevronDown size={15} className={`transition ${abierto ? "rotate-180" : ""}`} />
        </span>
      </button>

      <div className={abierto ? "space-y-0.5 px-1.5 pb-1.5" : "hidden"}>
        {enlaces.map((enlace) => {
          const Icono = enlace.icono;

          const esEnlaceConSeccion =
            enlace.href.includes("#");

          const activo =
            !enlace.externo &&
            !esEnlaceConSeccion &&
            pathname === enlace.href;

          const clasesEnlace = [
            "group",
            "relative",
"overflow-hidden",
            "flex",
            "w-full",
            "items-center",
            "gap-3",
"rounded-xl",
"border",
"px-2.5",
"py-1.5",
            "text-left",
            "transition",
            "duration-200",
            activo
  ? "border-[var(--blue-soft)] bg-[var(--glass-bg)] shadow-[0_10px_30px_rgba(40,130,220,0.16)]"
  : "border-transparent hover:border-[var(--blue-border)] hover:bg-[var(--glass-bg)] hover:shadow-[0_8px_24px_rgba(40,130,220,0.10)]",
          ].join(" ");

          const contenido = (
  <>
    {activo && (
      <span className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-[var(--blue-soft)] shadow-[0_0_14px_rgba(90,190,255,0.9)]" />
    )}

    <span
                className={[
                  "flex",
                  "h-8",
"w-8",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-lg",
                  "border",
                  "transition",
                  activo
                    ? "border-[var(--blue-main)] bg-[var(--blue-main)] text-white"
                    : "border-[var(--border-color)] text-[var(--blue-soft)] group-hover:border-[var(--blue-soft)]",
                ].join(" ")}
              >
                <Icono
                  size={17}
                  strokeWidth={1.7}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-5 text-[var(--text-main)]">
                  {enlace.nombre}
                </span>

                {enlace.etiqueta && (
                  <span className="mt-0.5 inline-flex rounded-full border border-[var(--blue-main)] bg-[var(--glass-bg)] px-1.5 py-px text-[7.5px] font-black uppercase tracking-[0.12em] text-[var(--blue-soft)]">
                    {enlace.etiqueta}
                  </span>
                )}
              </span>
            </>
          );

if (esEnlaceConSeccion) {
  return (
    <a
      key={enlace.nombre}
      href={enlace.href}
      onClick={(evento) => {
        const [ruta, idSeccion] =
          enlace.href.split("#");

        const rutaObjetivo =
          ruta || "/";

        if (
          pathname === rutaObjetivo &&
          idSeccion
        ) {
          evento.preventDefault();

          cerrar();

          window.setTimeout(() => {
            document
              .getElementById(idSeccion)
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });

            window.history.replaceState(
              null,
              "",
              `${rutaObjetivo}#${idSeccion}`
            );
          }, 100);

          return;
        }

        cerrar();
      }}
      className={clasesEnlace}
    >
      {contenido}
    </a>
  );
}

if (enlace.href === "/?ir=resenas") {
  return (
    <a
      key={enlace.nombre}
      href={enlace.href}
      onClick={cerrar}
      className={clasesEnlace}
    >
      {contenido}
    </a>
  );
}

if (
  enlace.href === "/tutorial" ||
  enlace.href === "/tutorial?ir=preguntas"
) {
  return (
    <a
      key={enlace.nombre}
      href={enlace.href}
      onClick={cerrar}
      className={clasesEnlace}
    >
      {contenido}
    </a>
  );
}

          if (enlace.externo) {
            return (
              <a
                key={enlace.nombre}
                href={enlace.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={cerrar}
                className={clasesEnlace}
              >
                {contenido}
              </a>
            );
          }

          return (
            <Link
              key={enlace.nombre}
              href={enlace.href}
              onClick={cerrar}
              className={clasesEnlace}
            >
              {contenido}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function MenuNavegacion() {
  const pathnameActual = usePathname();
  const pathname = pathnameActual || "/";

  const [abierto, setAbierto] =
    useState(false);

  // Grupos plegables: abierto el de la página actual; recuerda los que abriste.
  const grupos = [
    { titulo: "Preparar tu archivo", enlaces: enlacesPreparacion },
    { titulo: "Ver trabajos", enlaces: enlacesTrabajos },
    { titulo: "Agenda y ayuda", enlaces: enlacesAyuda },
    { titulo: "Mi cuenta", enlaces: enlacesCuenta },
  ];
  const [abiertos, setAbiertos] = useState<string[]>([]);

  useEffect(() => {
    if (!abierto) return;
    let guardados: string[] = [];
    try {
      guardados = JSON.parse(localStorage.getItem("kint_menu_grupos") || "[]");
    } catch {
      guardados = [];
    }
    const actual = grupos.find((grupo) => grupo.enlaces.some((enlace) => enlace.href.split("?")[0] === pathname))?.titulo;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbiertos([...new Set([...guardados, ...(actual ? [actual] : [])])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, pathname]);

  function alternarGrupo(titulo: string) {
    setAbiertos((actuales) => {
      const nuevos = actuales.includes(titulo) ? actuales.filter((t) => t !== titulo) : [...actuales, titulo];
      try {
        localStorage.setItem("kint_menu_grupos", JSON.stringify(nuevos));
      } catch {
        /* sin almacenamiento: no se recuerda */
      }
      return nuevos;
    });
  }

  const ocultarMenu =
    pathname.startsWith("/editar-resena") ||
    pathname.startsWith("/resena") ||
    pathname.startsWith("/admin");

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const overflowAnterior =
      document.body.style.overflow;

    function cerrarConEscape(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        setAbierto(false);
      }
    }

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      cerrarConEscape
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        cerrarConEscape
      );
    };
  }, [abierto]);

  if (ocultarMenu) {
    return null;
  }

  function abrirMenu() {
    setAbierto(true);
  }

  function cerrarMenu() {
    setAbierto(false);
  }

  return (
  <>
    {pathname !== "/" && (
      <div
        className="h-28 shrink-0 sm:h-32"
        aria-hidden="true"
      />
    )}

    <div className="absolute left-6 top-6 z-[180] flex flex-col items-start gap-3 sm:fixed">
  <button
    type="button"
    onClick={abrirMenu}
    className="group relative isolate flex items-center gap-3 text-[var(--blue-main)] transition duration-300 hover:brightness-125 dark:text-[var(--blue-soft)]"
    aria-label="Abrir menú de navegación"
    aria-expanded={abierto}
    aria-controls="menu-navegacion-kint"
  >
    <span className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10 rounded-full bg-[rgba(20,110,220,0.18)] blur-xl transition duration-300 group-hover:bg-[rgba(70,175,255,0.28)] group-hover:blur-2xl" />

   <span className="flex h-8 w-8 flex-col justify-center gap-[5px]">
  <span
    style={{ backgroundColor: "#06152f" }}
    className="block h-[3px] w-7 rounded-full transition duration-300 group-hover:w-5 group-hover:translate-x-2 dark:!bg-[#8fc7e8]"
  />

  <span
    style={{ backgroundColor: "#06152f" }}
    className="block h-[3px] w-5 rounded-full transition duration-300 group-hover:w-7 dark:!bg-[#8fc7e8]"
  />

  <span
    style={{ backgroundColor: "#06152f" }}
    className="block h-[3px] w-7 rounded-full transition duration-300 group-hover:w-5 group-hover:translate-x-2 dark:!bg-[#8fc7e8]"
  />
</span>

    <span className="hidden text-[10px] font-black uppercase tracking-[0.32em] text-[var(--text-muted)] transition duration-300 group-hover:text-[var(--blue-soft)] sm:block">
      Menú
    </span>
  </button>

  {pathname !== "/" && (
  <Link
    href="/"
    className="mt-1 flex items-center gap-1 text-2xl font-bold text-[var(--text-main)] transition duration-300 hover:opacity-70"
    aria-label="Volver al inicio"
  >
    <span className="relative -top-1 text-6xl leading-none">
      ‹
    </span>

    <span>
      Inicio
    </span>
  </Link>
)}
</div>

      <div
        id="menu-navegacion-kint"
        className={[
          "fixed",
          "inset-0",
          "z-[200]",
          abierto
            ? "pointer-events-auto"
            : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!abierto}
      >
        <button
          type="button"
          onClick={cerrarMenu}
          className={[
            "absolute",
            "inset-0",
            "h-full",
            "w-full",
            "bg-black/65",
            "backdrop-blur-sm",
            "transition-opacity",
            "duration-300",
            abierto
              ? "opacity-100"
              : "opacity-0",
          ].join(" ")}
          aria-label="Cerrar menú de navegación"
          tabIndex={abierto ? 0 : -1}
        />

        <aside
          className={[
            "absolute",
            "left-0",
            "top-0",
"flex",
"h-full",
"w-[92vw]",
"overflow-hidden",
            "max-w-[360px]",
            "flex-col",
            "border-r",
            "border-[var(--blue-border)]",
            "bg-[var(--page-bg)]",
"transition-transform",
"duration-300",
abierto
  ? "translate-x-0 shadow-[25px_0_70px_rgba(0,0,0,0.45)]"
  : "-translate-x-[120%] shadow-none",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación principal"
        >
<div className="pointer-events-none absolute inset-0">
  <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

  <div className="absolute -bottom-32 -right-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

  <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-70" />

  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70" />
</div>

          <header className="relative z-10 border-b border-[var(--border-color)] px-5 py-4">
  <div className="flex items-center justify-between gap-4">
    <Link
      href="/"
      onClick={cerrarMenu}
      className="group flex items-end gap-2"
    >
      <span className="text-xl font-black uppercase tracking-[0.24em] text-[var(--text-main)] transition group-hover:text-[var(--blue-soft)]">
        Kint
      </span>

      <span className="text-lg font-black text-[var(--blue-main)]">
        3
      </span>

      <span className="text-lg font-black text-[var(--blue-soft)]">
        D
      </span>
    </Link>

    <button
      type="button"
      onClick={cerrarMenu}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--glass-bg)] text-[var(--text-muted)] transition hover:rotate-90 hover:border-[var(--blue-soft)] hover:text-[var(--blue-soft)]"
      aria-label="Cerrar menú"
    >
      <X size={21} strokeWidth={1.8} />
    </button>
  </div>
</header>

          <div className="relative z-10 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {/* Lo más usado, en grande */}
            <div className="grid grid-cols-2 gap-2">
              {accesosRapidos.map((acceso) => {
                const Icono = acceso.icono;
                const activo = pathname === acceso.href;
                return (
                  <Link
                    key={acceso.href}
                    href={acceso.href}
                    onClick={cerrarMenu}
                    className={`relative flex flex-col gap-2 rounded-2xl border p-3 transition ${
                      acceso.destacado
                        ? "border-transparent bg-[linear-gradient(135deg,#ef4444,#b91c1c)] text-white shadow-[0_12px_28px_-12px_rgba(220,38,38,0.8)]"
                        : activo
                        ? "border-[var(--blue-soft)] bg-[var(--glass-bg)] text-[var(--text-main)]"
                        : "border-[var(--border-color)] bg-[var(--glass-bg)]/60 text-[var(--text-main)] hover:border-[var(--blue-border)]"
                    }`}
                  >
                    <Icono size={19} strokeWidth={1.8} />
                    <span className="text-sm font-black leading-tight">{acceso.nombre}</span>
                    {acceso.etiqueta && (
                      <span className="absolute right-2 top-2 rounded-full bg-red-600 px-1.5 py-px text-[7.5px] font-black uppercase tracking-[0.1em] text-white">
                        {acceso.etiqueta}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {grupos.map((grupo) => (
              <GrupoMenu
                key={grupo.titulo}
                titulo={grupo.titulo}
                enlaces={grupo.enlaces}
                pathname={pathname}
                cerrar={cerrarMenu}
                abierto={abiertos.includes(grupo.titulo)}
                onAlternar={() => alternarGrupo(grupo.titulo)}
              />
            ))}

            <SelectorFondo />
          </div>
        </aside>
      </div>
    </>
  );
}

