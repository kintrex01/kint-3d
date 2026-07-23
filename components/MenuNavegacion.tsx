"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Calculator,
  FileText,
  HelpCircle,
    Home,
  MessageCircle,
  Package,
  Ruler,
  Send,
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
};

const enlacesPrincipales: EnlaceMenu[] = [
  {
    nombre: "Inicio",
    href: "/",
    icono: Home,
  },
  {
    nombre: "Cotizar impresión",
    href: "/cotizar",
    icono: Send,
  },
  {
    nombre: "Consultar pedido",
    href: "/seguimiento",
    icono: Package,
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
  nombre: "Ver mi modelo en 3D",
  href: "/preparador-3d",
  icono: Ruler,
  etiqueta: "Vista previa 3D",
},
];

const enlacesKint: EnlaceMenu[] = [
  {
  nombre: "Reseñas verificadas",
  href: "/?ir=resenas",
  icono: MessageCircle,
},
 {
  nombre: "Preguntas frecuentes",
  href: "/tutorial?ir=preguntas",
  icono: HelpCircle,
},
  {
  nombre: "Ver trabajos en Instagram",
  href: "https://www.instagram.com/kint.3d/",
  icono: IconoInstagram,
  externo: true,
},
];

function GrupoMenu({
  titulo,
  enlaces,
  pathname,
  cerrar,
}: GrupoMenuProps) {
  return (
    <section>
      <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[0.28em] text-[var(--blue-soft)]">
        {titulo}
      </p>

      <div className="space-y-1">
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
"px-3",
"py-2",
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
                  "h-9",
"w-9",
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
                  size={19}
                  strokeWidth={1.7}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-5 text-[var(--text-main)]">
                  {enlace.nombre}
                </span>

                {enlace.etiqueta && (
                  <span className="mt-1 inline-flex rounded-full border border-[var(--blue-main)] bg-[var(--glass-bg)] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--blue-soft)]">
                    {enlace.etiqueta}
                  </span>
                )}
              </span>

              <span className="text-sm text-[var(--blue-soft)] transition group-hover:translate-x-1">
                →
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

  const ocultarMenu =
    pathname.startsWith("/editar-resena") ||
    pathname.startsWith("/resena");

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

    <div className="fixed left-6 top-6 z-[180] flex flex-col items-start gap-3">
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
            <GrupoMenu
              titulo="Principal"
              enlaces={enlacesPrincipales}
              pathname={pathname}
              cerrar={cerrarMenu}
            />

            <GrupoMenu
              titulo="Preparar un archivo"
              enlaces={enlacesPreparacion}
              pathname={pathname}
              cerrar={cerrarMenu}
            />

            <GrupoMenu
              titulo="Conocer Kint 3D"
              enlaces={enlacesKint}
              pathname={pathname}
              cerrar={cerrarMenu}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

