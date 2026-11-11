import type { ReactNode } from "react";

/*
 * Dibujos en axonometría (estilo SketchUp: caras blancas y grises, aristas
 * negras) para la guía. Cada escena es una lista de cajas en metros; se
 * dibujan de atrás para adelante. x va hacia abajo a la derecha, y hacia
 * abajo a la izquierda, z hacia arriba.
 */

type P3 = [number, number, number];

type Caja = {
  x: number;
  y: number;
  z: number;
  w: number; // largo en x
  d: number; // largo en y
  h: number; // alto
  color?: "rojo" | "verde" | "gris" | "oscuro";
  sinCara?: "arriba" | "frente" | "costado"; // la cara que falta (se ve el hueco)
  translucida?: boolean;
  alFinal?: boolean; // se dibuja encima de todo (ej. el piso que tapa una pieza enterrada)
  contorno?: boolean; // solo el borde punteado de la cara de arriba (ej. el nivel 0, que no es una pieza)
};

type Etiqueta = { en: P3; texto: string; color?: string; dx?: number; dy?: number; ancla?: "start" | "middle" | "end" };

const C = Math.cos(Math.PI / 6);
const S = 14; // píxeles por metro

export function proyectar([x, y, z]: P3): [number, number] {
  return [(x - y) * C * S, (x + y) * 0.5 * S - z * S];
}

const PALETAS = {
  normal: { arriba: "#f5f5f4", costado: "#a8a29e", frente: "#d6d3d1" },
  rojo: { arriba: "#fecaca", costado: "#dc2626", frente: "#f87171" },
  verde: { arriba: "#bbf7d0", costado: "#059669", frente: "#34d399" },
  gris: { arriba: "#e7e5e4", costado: "#78716c", frente: "#a8a29e" },
  oscuro: { arriba: "#57534e", costado: "#292524", frente: "#44403c" },
};

/* a se dibuja antes que b (b está más cerca del que mira). */
function antes(a: Caja, b: Caja) {
  const e = 1e-6;
  const bAdelante = b.x >= a.x + a.w - e || b.y >= a.y + a.d - e || b.z >= a.z + a.h - e;
  const aAdelante = a.x >= b.x + b.w - e || a.y >= b.y + b.d - e || a.z >= b.z + b.h - e;
  if (bAdelante && !aAdelante) return true;
  if (aAdelante && !bAdelante) return false;
  return a.x + a.w / 2 + a.y + a.d / 2 + a.z < b.x + b.w / 2 + b.y + b.d / 2 + b.z;
}

function ordenar(cajas: Caja[]) {
  const quedan = [...cajas];
  const orden: Caja[] = [];
  while (quedan.length) {
    const i = quedan.findIndex((a) => !quedan.some((b) => b !== a && antes(b, a) && !antes(a, b)));
    orden.push(...quedan.splice(i === -1 ? 0 : i, 1));
  }
  return orden;
}

function poligono(puntos: P3[]) {
  return puntos.map((p) => proyectar(p).map((v) => v.toFixed(1)).join(",")).join(" ");
}

function caras(caja: Caja, i: number) {
  const { x, y, z, w, d, h } = caja;
  if (caja.contorno) {
    const borde: P3[] = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
    return (
      <polygon key={i} points={poligono(borde)} fill="#ffffff" fillOpacity={0.35} stroke="#78716c" strokeWidth={1.2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
    );
  }
  const paleta = PALETAS[caja.color === "rojo" || caja.color === "verde" || caja.color === "gris" || caja.color === "oscuro" ? caja.color : "normal"];
  const borde = caja.color === "rojo" ? "#991b1b" : caja.color === "verde" ? "#065f46" : "#1c1917";
  const arriba: P3[] = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
  const costado: P3[] = [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]];
  const frente: P3[] = [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]];
  // Si falta una cara, se ve el interior (las caras de atrás, más oscuras).
  const fondo: P3[][] =
    caja.sinCara === "arriba"
      ? [
          [[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]],
          [[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]],
          [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]],
        ]
      : caja.sinCara === "frente"
      ? [
          [[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]],
          [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]],
        ]
      : [];
  const opacidad = caja.translucida ? 0.55 : 1;
  const props = { stroke: borde, strokeWidth: 1, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  return (
    <g key={i} opacity={opacidad}>
      {fondo.map((cara, j) => (
        <polygon key={`f${j}`} points={poligono(cara)} fill="#78716c" {...props} />
      ))}
      {caja.sinCara !== "arriba" && <polygon points={poligono(arriba)} fill={paleta.arriba} {...props} />}
      {caja.sinCara !== "costado" && <polygon points={poligono(costado)} fill={paleta.costado} {...props} />}
      {caja.sinCara !== "frente" && <polygon points={poligono(frente)} fill={paleta.frente} {...props} />}
      {caja.sinCara && (
        <polygon
          points={poligono(caja.sinCara === "arriba" ? arriba : caja.sinCara === "frente" ? frente : costado)}
          fill="none"
          stroke="#dc2626"
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}

/* Escena: cajas + etiquetas + lo que haga falta encima (en coordenadas de pantalla). */
export function Escena({
  cajas,
  etiquetas = [],
  encima,
  margen = 18,
  titulo,
  className = "",
}: {
  cajas: Caja[];
  etiquetas?: Etiqueta[];
  encima?: ReactNode;
  margen?: number;
  titulo: string;
  className?: string;
}) {
  const puntos = cajas.flatMap(({ x, y, z, w, d, h }) =>
    [x, x + w].flatMap((px) => [y, y + d].flatMap((py) => [z, z + h].map((pz) => proyectar([px, py, pz]))))
  );
  etiquetas.forEach((et) => {
    const [px, py] = proyectar(et.en);
    const ancho = et.texto.length * 6.2;
    const x0 = px + (et.dx ?? 0) - (et.ancla === "end" ? ancho : et.ancla === "middle" ? ancho / 2 : 0);
    puntos.push([x0, py + (et.dy ?? 0) - 12], [x0 + ancho, py + (et.dy ?? 0) + 4]);
  });
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs) - margen;
  const minY = Math.min(...ys) - margen;
  const ancho = Math.max(...xs) - minX + margen;
  const alto = Math.max(...ys) - minY + margen;
  return (
    <svg viewBox={`${minX.toFixed(1)} ${minY.toFixed(1)} ${ancho.toFixed(1)} ${alto.toFixed(1)}`} role="img" aria-label={titulo} className={`w-full ${className}`}>
      {[...ordenar(cajas.filter((c) => !c.alFinal)), ...cajas.filter((c) => c.alFinal)].map(caras)}
      {encima}
      {etiquetas.map((et, i) => {
        const [px, py] = proyectar(et.en);
        return (
          <text
            key={i}
            x={px + (et.dx ?? 0)}
            y={py + (et.dy ?? 0)}
            textAnchor={et.ancla ?? "start"}
            fontSize="11"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
            fill={et.color ?? "#1c1917"}
            stroke="#ffffff"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {et.texto}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                               */
/* ------------------------------------------------------------------ */

const E = 0.3; // espesor de muro

/* Vivienda simple: losa, muros exteriores (los de adelante cortados bajos para ver adentro) y un muro interior. */
function vivienda(opciones: { x?: number; y?: number; z?: number; alto?: number; interior?: Partial<Caja>; frenteBajo?: boolean } = {}): Caja[] {
  const { x = 0, y = 0, z = 0, alto = 2.7, frenteBajo = true } = opciones;
  const bajo = frenteBajo ? 1.1 : alto;
  const L = 10;
  const A = 7;
  return [
    { x, y, z, w: L, d: A, h: 0.3, color: "gris" }, // losa
    { x, y, z: z + 0.3, w: L, d: E, h: alto }, // muro de atrás
    { x, y: y + E, z: z + 0.3, w: E, d: A - E, h: alto }, // muro izquierdo
    { x: x + L - E, y: y + E, z: z + 0.3, w: E, d: A - E, h: bajo }, // muro derecho (cortado)
    { x: x + E, y: y + A - E, z: z + 0.3, w: 3.2, d: E, h: bajo }, // muro de adelante (con puerta)
    { x: x + 4.5, y: y + A - E, z: z + 0.3, w: L - E - 4.5, d: E, h: bajo },
    { x: x + 5.5, y: y + E, z: z + 0.3, w: 0.15, d: 4, h: alto, ...opciones.interior }, // muro interior
  ];
}

/* ------------------------------------------------------------------ */
/* Siluetas «pro» (persona y árbol 2D, como las de SketchUp)            */
/* ------------------------------------------------------------------ */

export function Persona({ x, y, alto = 52 }: { x: number; y: number; alto?: number }) {
  const k = alto / 100;
  return (
    <g transform={`translate(${x - 20 * k} ${y - 100 * k}) scale(${k})`}>
      <ellipse cx="21" cy="9" rx="7" ry="8" fill="#3f3f46" />
      <path
        d="M12 21 C16 17 26 17 30 21 L33 46 C33.5 50 30.5 51 29.5 47.5 L27.5 34 L27 58 L29 95 C29 98 23 98 23 95 L21 64 L19.5 95 C19.5 98 13.5 98 13.5 95 L15 58 L14.5 34 L12.5 47.5 C11.5 51 8.5 50 9 46 Z"
        fill="#3f3f46"
      />
      <path d="M14 22 L28 22 L27 34 L15 34 Z" fill="#52525b" />
    </g>
  );
}

export function Arbol({ x, y, alto = 70 }: { x: number; y: number; alto?: number }) {
  const k = alto / 100;
  return (
    <g transform={`translate(${x - 30 * k} ${y - 100 * k}) scale(${k})`}>
      <path d="M27 100 L28 62 L22 50 L26 49 L30 57 L33 44 L36 45 L33 62 L34 100 Z" fill="#57534e" />
      <circle cx="30" cy="36" r="22" fill="#4d7c0f" />
      <circle cx="16" cy="44" r="14" fill="#3f6212" />
      <circle cx="45" cy="42" r="15" fill="#3f6212" />
      <circle cx="30" cy="18" r="15" fill="#65a30d" />
      <circle cx="22" cy="30" r="9" fill="#84cc16" opacity="0.55" />
      <circle cx="40" cy="26" r="7" fill="#84cc16" opacity="0.45" />
    </g>
  );
}

/* Lupa: círculo sobre un punto de la escena. */
function Lupa({ en, r = 22, color = "#dc2626" }: { en: P3; r?: number; color?: string }) {
  const [x, y] = proyectar(en);
  return <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.06} stroke={color} strokeWidth="1.3" strokeOpacity={0.8} />;
}

/* ------------------------------------------------------------------ */
/* Escenas de la guía                                                   */
/* ------------------------------------------------------------------ */

/* Paso 4: vivienda con un muro interior de una sola cara (en rojo) y la lupa. */
export function IsoEspesor() {
  return (
    <div className="space-y-3">
      <Escena
        titulo="Vivienda con un muro interior de una sola cara, marcado en rojo"
        cajas={vivienda({ interior: { w: 0.02, color: "rojo" } })}
        encima={<Lupa en={[5.5, 2.3, 2]} r={28} />}
        etiquetas={[{ en: [5.5, 0.3, 3.3], texto: "este muro es una sola cara", color: "#dc2626", ancla: "middle", dy: -6 }]}
      />
    </div>
  );
}

/* Paso 4: zoom de un muro, antes y después, con el espesor de la escala elegida. */
export function ZoomMuro({ ideal, escala }: { ideal: string; escala: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="rounded-xl border-2 border-red-600/50 bg-white/70 p-2">
        <Escena
          className="mx-auto max-h-32"
          titulo="Así está: una sola cara, sin espesor"
          cajas={[
            { x: 0, y: 0, z: 0, w: 3, d: 2.4, h: 0.15, color: "gris" },
            { x: 1.4, y: 0, z: 0.15, w: 0.02, d: 2.4, h: 2.4, color: "rojo" },
          ]}
          etiquetas={[{ en: [1.4, 1.2, 2.9], texto: "0 mm", color: "#dc2626", ancla: "middle" }]}
        />
        <figcaption className="text-center text-[11px] font-black text-red-700">✗ Así está: una sola cara (0 mm), no se imprime</figcaption>
      </figure>
      <figure className="rounded-xl border-2 border-emerald-500/50 bg-white/70 p-2">
        <Escena
          className="mx-auto max-h-32"
          titulo="Así tiene que estar: muro con espesor"
          cajas={[
            { x: 0, y: 0, z: 0, w: 3, d: 2.4, h: 0.15, color: "gris" },
            { x: 1.25, y: 0, z: 0.15, w: 0.3, d: 2.4, h: 2.4, color: "verde" },
          ]}
          etiquetas={[{ en: [1.4, 1.2, 2.9], texto: `${ideal} cm`, color: "#047857", ancla: "middle" }]}
        />
        <figcaption className="text-center text-[11px] font-black text-emerald-700">✓ Así tiene que estar: {ideal} cm o más a 1:{escala}</figcaption>
      </figure>
    </div>
  );
}

/* Paso 5: a un muro le falta la cara de arriba: se ve el hueco. */
export function IsoCerrado() {
  return (
    <div className="space-y-3">
      <Escena
        titulo="Vivienda donde a un muro le falta la cara de arriba"
        cajas={vivienda({ frenteBajo: false }).map((caja, i) => (i === 1 ? { ...caja, sinCara: "arriba" as const } : caja))}
        encima={<Lupa en={[3, 0.15, 3]} r={24} />}
        etiquetas={[{ en: [3, 0, 3.4], texto: "falta la cara de arriba", color: "#b91c1c", ancla: "middle", dy: -16 }]}
      />
      <div className="grid grid-cols-2 gap-2">
        <figure className="rounded-xl border-2 border-red-600/50 bg-white/70 p-2">
          <Escena
            titulo="Muro abierto: le falta una cara"
            cajas={[{ x: 0, y: 0, z: 0, w: 3, d: 0.6, h: 2, sinCara: "arriba" }]}
          />
          <figcaption className="text-center text-[11px] font-black text-red-700">✗ Abierto: le falta una cara</figcaption>
        </figure>
        <figure className="rounded-xl border-2 border-emerald-500/50 bg-white/70 p-2">
          <Escena titulo="Muro cerrado por todos lados" cajas={[{ x: 0, y: 0, z: 0, w: 3, d: 0.6, h: 2 }]} />
          <figcaption className="text-center text-[11px] font-black text-emerald-700">✓ Cerrado por todos lados</figcaption>
        </figure>
      </div>
    </div>
  );
}

/* Paso 7: piezas en el piso (bien) contra una flotando y otra enterrada (mal). */
export function IsoAltura() {
  const piso: Caja = { x: -1, y: -1, z: -0.1, w: 26, d: 9, h: 0.1, contorno: true };
  const pieza = (x: number, z: number, color?: Caja["color"]): Caja[] => [
    { x, y: 0, z, w: 6, d: 5, h: 0.3, color },
    { x, y: 0, z: z + 0.3, w: 6, d: 0.3, h: 1.6, color },
    { x, y: 0.3, z: z + 0.3, w: 0.3, d: 4.7, h: 1.6, color },
  ];
  const sombra = proyectar([10.5, 2.5, 0]);
  return (
    <div className="space-y-2">
      <div className="rounded-xl border-2 border-red-600/50 bg-white/70 p-2">
        <p className="px-1 text-[11px] font-black text-red-700">✗ Así no</p>
        <Escena
          titulo="Así no: una pieza flotando y otra enterrada"
          cajas={[piso, ...pieza(0, 0), ...pieza(8, 2.2, "rojo"), ...pieza(16, -1.2, "rojo").map((c) => ({ ...c, translucida: true })), { ...piso, x: 15, w: 10, alFinal: true }]}
          encima={<ellipse cx={sombra[0]} cy={sombra[1]} rx="40" ry="14" fill="#000" opacity="0.15" />}
          etiquetas={[
            { en: [11, 0, 4.4], texto: "flota", color: "#dc2626", ancla: "middle" },
            { en: [19, 5, 0], texto: "enterrada", color: "#dc2626", ancla: "middle", dy: 22 },
          ]}
        />
      </div>
      <div className="rounded-xl border-2 border-emerald-500/50 bg-white/70 p-2">
        <p className="px-1 text-[11px] font-black text-emerald-700">✓ Así sí: todas a la misma altura (nivel 0)</p>
        <Escena
          titulo="Así sí: todas las piezas a la misma altura, en el nivel 0"
          cajas={[piso, ...pieza(0, 0), ...pieza(8, 0), ...pieza(16, 0)]}
          etiquetas={[{ en: [24.5, 7.5, 0], texto: "nivel 0 (no se dibuja)", color: "#57534e", ancla: "end", dy: 16 }]}
        />
      </div>
    </div>
  );
}
