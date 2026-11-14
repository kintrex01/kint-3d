"use client";

import { useId } from "react";

/*
 * Insignia Top Kint del podio (1 oro, 2 plata, 3 bronce).
 * Una gema facetada de metal con alas, el número grabado, un brillo que la
 * recorre y, en tamaño grande, rayos que giran y destellos. Las animaciones
 * se apagan si el sistema pide menos movimiento.
 */

type Puesto = 1 | 2 | 3;
type Tamano = "xs" | "sm" | "md" | "lg";

const METALES: Record<Puesto, { nombre: string; tonos: [string, string, string, string, string]; brillo: string; aura: string }> = {
  1: { nombre: "Oro", tonos: ["#fff7c2", "#ffd84a", "#e0a106", "#9a6400", "#4d3000"], brillo: "#fffbe0", aura: "#ffcf3a" },
  2: { nombre: "Plata", tonos: ["#ffffff", "#e6edf3", "#aebbc8", "#6c7a89", "#2d3742"], brillo: "#ffffff", aura: "#cfe3ff" },
  3: { nombre: "Bronce", tonos: ["#ffe1c4", "#f0a468", "#c46a2c", "#7d3d12", "#3d1b05"], brillo: "#fff0e2", aura: "#ff9a52" },
};

const MEDIDAS: Record<Tamano, number> = { xs: 18, sm: 28, md: 44, lg: 104 };

// Gema octogonal (centro 50,54).
const GEMA: [number, number][] = [
  [50, 10], [78, 21], [87, 50], [74, 82], [50, 98], [26, 82], [13, 50], [22, 21],
];
const CENTRO: [number, number] = [50, 54];

function escalar(puntos: [number, number][], factor: number) {
  return puntos.map(([x, y]) => [CENTRO[0] + (x - CENTRO[0]) * factor, CENTRO[1] + (y - CENTRO[1]) * factor] as [number, number]);
}

const camino = (puntos: [number, number][]) =>
  "M" + puntos.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L") + " Z";

export default function InsigniaTop({
  puesto,
  tamano = "sm",
  conTexto = false,
  className = "",
}: {
  puesto: number;
  tamano?: Tamano;
  conTexto?: boolean;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (puesto !== 1 && puesto !== 2 && puesto !== 3) return null;
  const metal = METALES[puesto as Puesto];
  const [c0, c1, c2, c3, c4] = metal.tonos;
  const lado = MEDIDAS[tamano];
  const grande = tamano === "lg";
  const conDestellos = tamano === "md" || grande;
  const interior = escalar(GEMA, 0.6);
  const etiqueta = `Top ${puesto} de Top Kint (${metal.nombre})`;

  const insignia = (
    <svg
      viewBox="0 0 100 112"
      width={lado}
      height={lado * 1.12}
      role="img"
      aria-label={etiqueta}
      className={`kint-insignia shrink-0 overflow-visible ${conTexto ? "" : className}`}
      style={{ filter: `drop-shadow(0 ${grande ? 6 : 1.5}px ${grande ? 14 : 3}px ${metal.aura}55)` }}
    >
      <title>{etiqueta}</title>
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="0.28" stopColor={c1} />
          <stop offset="0.55" stopColor={c2} />
          <stop offset="0.78" stopColor={c1} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
        <linearGradient id={`p${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.5" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={metal.brillo} stopOpacity="0" />
          <stop offset="0.5" stopColor={metal.brillo} stopOpacity="0.95" />
          <stop offset="1" stopColor={metal.brillo} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`a${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={metal.aura} stopOpacity="0.55" />
          <stop offset="1" stopColor={metal.aura} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <path d={camino(GEMA)} />
        </clipPath>
      </defs>

      {/* Aura y rayos que giran (solo grande) */}
      {grande && (
        <>
          <circle cx="50" cy="54" r="56" fill={`url(#a${id})`} />
          <g className="kint-insignia-giro" opacity="0.5">
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d="M50 54 L47.6 -4 L52.4 -4 Z" fill={metal.aura} opacity={i % 2 ? 0.35 : 0.7} transform={`rotate(${i * 22.5} 50 54)`} />
            ))}
          </g>
        </>
      )}

      {/* Alas: tres plumas filosas por lado */}
      {[1, -1].map((lado) => (
        <g key={lado} transform={lado === -1 ? "translate(100 0) scale(-1 1)" : undefined}>
          <path d="M18 40 C4 36 -2 26 -1 16 C6 24 13 28 22 30 Z" fill={`url(#p${id})`} stroke={c4} strokeWidth="0.8" strokeOpacity="0.5" />
          <path d="M15 54 C0 54 -6 46 -8 36 C2 42 10 44 18 44 Z" fill={`url(#p${id})`} stroke={c4} strokeWidth="0.8" strokeOpacity="0.5" />
          <path d="M18 68 C4 72 -4 66 -7 57 C3 60 11 60 19 58 Z" fill={`url(#p${id})`} stroke={c4} strokeWidth="0.8" strokeOpacity="0.5" />
        </g>
      ))}

      {/* Gema facetada */}
      <path d={camino(GEMA)} fill={`url(#m${id})`} stroke={c4} strokeWidth="1.6" strokeLinejoin="round" />
      <g clipPath={`url(#c${id})`}>
        {GEMA.map((punto, i) => {
          const siguiente = GEMA[(i + 1) % GEMA.length];
          const claro = [0, 1, 7].includes(i);
          const oscuro = [3, 4, 5].includes(i);
          return (
            <path
              key={i}
              d={camino([CENTRO, punto, siguiente])}
              fill={claro ? c0 : oscuro ? c4 : c2}
              opacity={claro ? 0.38 : oscuro ? 0.3 : 0.12}
            />
          );
        })}
        {/* Brillo que cruza la gema */}
        <g className="kint-insignia-brillo">
          <rect x="-40" y="-10" width="26" height="140" fill={`url(#b${id})`} transform="rotate(22 50 54)" />
        </g>
      </g>

      {/* Placa interior con bisel y el número grabado */}
      <path d={camino(interior)} fill={`url(#p${id})`} stroke={c0} strokeOpacity="0.85" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={camino(escalar(GEMA, 0.52))} fill="none" stroke={c4} strokeOpacity="0.45" strokeWidth="0.9" strokeLinejoin="round" />
      <text x="50" y="66.5" textAnchor="middle" fontSize="34" fontWeight="900" fontFamily="var(--font-montserrat), system-ui, sans-serif" fill={c0} opacity="0.85">
        {puesto}
      </text>
      <text x="50" y="65" textAnchor="middle" fontSize="34" fontWeight="900" fontFamily="var(--font-montserrat), system-ui, sans-serif" fill={c4}>
        {puesto}
      </text>

      {/* Remate de arriba: corona para el 1, estrella para 2 y 3 */}
      {puesto === 1 ? (
        <path d="M37 13 L40 1 L45.5 8 L50 -3 L54.5 8 L60 1 L63 13 Z" fill={`url(#m${id})`} stroke={c4} strokeWidth="1.1" strokeLinejoin="round" />
      ) : (
        <path d="M50 -1 L53 7 L61 8 L55 13 L57 21 L50 16.5 L43 21 L45 13 L39 8 L47 7 Z" fill={`url(#m${id})`} stroke={c4} strokeWidth="1" strokeLinejoin="round" transform="translate(0 -3) scale(1 0.9)" />
      )}

      {/* Destellos */}
      {conDestellos &&
        [
          [86, 14, 0],
          [12, 92, 1.1],
          [92, 78, 2.2],
        ].map(([x, y, retraso]) => (
          <path
            key={`${x}-${y}`}
            className="kint-insignia-destello"
            style={{ animationDelay: `${retraso}s` }}
            d={`M${x} ${y - 6} Q${x + 0.8} ${y - 0.8} ${x + 6} ${y} Q${x + 0.8} ${y + 0.8} ${x} ${y + 6} Q${x - 0.8} ${y + 0.8} ${x - 6} ${y} Q${x - 0.8} ${y - 0.8} ${x} ${y - 6} Z`}
            fill={metal.brillo}
          />
        ))}
    </svg>
  );

  if (!conTexto) return insignia;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {insignia}
      <span
        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
        style={{ background: `linear-gradient(135deg, ${c0}, ${c1} 45%, ${c2})`, color: c4 }}
      >
        Top {puesto} Kint
      </span>
    </span>
  );
}
