import type { ReactElement } from "react";
import { Escena, Persona, proyectar, redondear as rd, type Caja, type P3 } from "@/components/DibujosIso";

/*
 * Guía, paso 2: ilustración propia (axonometría con estilo de lámina de
 * arquitectura) de una casa en un terreno. «Así viene»: con terreno, árboles,
 * personas, pájaros y pasto marcados para borrar. «Así tiene que quedar»:
 * solo la casa, que es lo que se imprime.
 */

const NEGRO = { arriba: "#34343a", costado: "#141417", frente: "#202024" };
const BLANCO = { arriba: "#ecebe7", costado: "#c7c3bc", frente: "#f8f7f4" };
const ARENA = { arriba: "#e7c98b", costado: "#8a8277", frente: "#a49d91" };
const PATIO = { arriba: "#f4f3f0", costado: "#cfcbc5", frente: "#e4e1dc" };

const TERRENO: Caja[] = [
  { x: 0, y: 0, z: -1.2, w: 24, d: 18, h: 1.2, colores: ARENA },
  { x: 7, y: 0, z: 0, w: 17, d: 10.5, h: 0.05, colores: PATIO },
];

const CASA: Caja[] = [
  { x: 9.5, y: 1.6, z: 0.05, w: 9.5, d: 3.8, h: 2.95, colores: { arriba: "#cfd8d6", costado: "#7fa29f", frente: "#a3c2bd" } }, // vidriado
  { x: 19, y: 1, z: 0.05, w: 4, d: 6, h: 2.95, colores: NEGRO }, // muro negro
  { x: 8, y: 1, z: 3, w: 15, d: 5, h: 2.8, colores: BLANCO }, // volumen alto
  { x: 19.2, y: 1.2, z: 5.8, w: 3.4, d: 3, h: 1.5, colores: NEGRO }, // caja de la azotea
  { x: 9, y: 1.5, z: 5.8, w: 0.5, d: 0.5, h: 0.9, colores: BLANCO }, // chimeneas
  { x: 9.8, y: 1.5, z: 5.8, w: 0.5, d: 0.5, h: 0.9, colores: BLANCO },
];

/* Números al azar pero siempre iguales (el dibujo no cambia entre recargas). */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const pt = (p: P3) => proyectar(p);
const poli = (puntos: P3[]) => puntos.map((p) => pt(p).join(",")).join(" ");
function linea(a: P3, b: P3, props: Record<string, string | number>, key?: string | number) {
  const [x1, y1] = pt(a);
  const [x2, y2] = pt(b);
  return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...props} />;
}

/* ---------------------------- Arquitectura ---------------------------- */

function Detalles({ id, conTerreno }: { id: string; conTerreno: boolean }) {
  const r = azar(7);
  const borde = { stroke: "#1c1917", strokeWidth: 0.8, vectorEffect: "non-scaling-stroke" };
  return (
    <g>
      <defs>
        <clipPath id={`losa-${id}`}>
          <polygon points={poli([[8, 1, 5.8], [19.1, 1, 5.8], [19.1, 6, 5.8], [8, 6, 5.8]])} />
        </clipPath>
        <filter id={`difuso-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Losa de hormigón: manchas suaves y juntas */}
      <g clipPath={`url(#losa-${id})`}>
        {Array.from({ length: 26 }, (_, i) => {
          const [x, y] = pt([8.3 + r() * 10.6, 1.2 + r() * 4.6, 5.8]);
          return <ellipse key={i} cx={x} cy={y} rx={rd(6 + r() * 14)} ry={rd(3 + r() * 6)} fill="#6b6964" opacity={rd(0.06 + r() * 0.12)} filter={`url(#difuso-${id})`} />;
        })}
      </g>
      {[11.5, 15].map((x) => linea([x, 1, 5.8], [x, 6, 5.8], { stroke: "#a8a49c", strokeWidth: 0.6 }, `j${x}`))}
      {linea([8, 3.5, 5.8], [19.1, 3.5, 5.8], { stroke: "#a8a49c", strokeWidth: 0.6 })}

      {/* Sombra del volumen sobre el vidrio (y sobre el patio, si está) */}
      <polygon points={poli([[9.5, 5.4, 2.4], [19, 5.4, 2.4], [19, 5.4, 3], [9.5, 5.4, 3]])} fill="#1c1917" opacity="0.28" />
      {conTerreno && (
        <>
          <polygon points={poli([[9.5, 5.4, 0.05], [19, 5.4, 0.05], [19.6, 7.4, 0.05], [10.1, 7.4, 0.05]])} fill="#1c1917" opacity="0.07" />
          <polygon points={poli([[23, 1, 0.05], [23, 7, 0.05], [24, 8.2, 0.05], [24, 1.6, 0.05]])} fill="#1c1917" opacity="0.08" />
        </>
      )}

      {/* Ventanas del volumen alto (frente y costado) */}
      {[9.2, 11.6, 14, 16.4].map((x) => (
        <g key={x}>
          <polygon points={poli([[x, 6, 3.7], [x + 1.9, 6, 3.7], [x + 1.9, 6, 5.05], [x, 6, 5.05]])} fill="#93b4b0" {...borde} />
          {linea([x + 0.3, 6, 3.85], [x + 0.9, 6, 4.9], { stroke: "#ffffff", strokeWidth: 0.9, opacity: 0.7 })}
          {linea([x + 0.95, 6, 3.7], [x + 0.95, 6, 5.05], { stroke: "#1c1917", strokeWidth: 0.5 })}
        </g>
      ))}
      <polygon points={poli([[23, 2, 3.6], [23, 2.6, 3.6], [23, 2.6, 5.2], [23, 2, 5.2]])} fill="#7c9995" {...borde} />

      {/* Vidrios de planta baja: parantes, cortinas y reflejos */}
      {[10.9, 12.4, 13.9, 15.4, 16.9, 18.3].map((x, i) => (
        <g key={x}>
          {i % 2 === 0 && <polygon points={poli([[x - 1.3, 5.4, 0.1], [x - 0.6, 5.4, 0.1], [x - 0.6, 5.4, 2.3], [x - 1.3, 5.4, 2.3]])} fill="#d7e6e1" opacity="0.8" />}
          {linea([x, 5.4, 0.05], [x, 5.4, 3], { stroke: "#1c1917", strokeWidth: 0.7 })}
          {linea([x - 1.1, 5.4, 0.4], [x - 0.4, 5.4, 1.9], { stroke: "#ffffff", strokeWidth: 0.9, opacity: 0.55 })}
        </g>
      ))}

      {/* Muros negros perforados: puntitos y rayitas claras */}
      {Array.from({ length: 70 }, (_, i) => {
        const frente = i < 44;
        const [x, y] = frente ? pt([19.2 + r() * 3.6, 7, 0.3 + r() * 2.5]) : pt([23, 1.2 + r() * 5.6, 0.3 + r() * 2.5]);
        return <circle key={`p${i}`} cx={x} cy={y} r={rd(0.6 + r() * 0.6)} fill="#e7e5e4" opacity={rd(0.35 + r() * 0.4)} />;
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const x = 19.6 + r() * 2.4;
        const z = 6.3 + r() * 0.9;
        return linea([x, 4.2, z], [x + 0.5, 4.2, z], { stroke: "#e7e5e4", strokeWidth: 1, opacity: 0.6 }, `r${i}`);
      })}
    </g>
  );
}

/* ------------------------------ Terreno ------------------------------- */

function Baldosas() {
  const lineas: ReactElement[] = [];
  for (let x = 8.5; x < 24; x += 1.5) lineas.push(linea([x, 7.2, 0.05], [x, 10.5, 0.05], { stroke: "#d6d2cb", strokeWidth: 0.6 }, `bx${x}`));
  for (let y = 7.5; y < 10.5; y += 1.5) lineas.push(linea([7, y, 0.05], [24, y, 0.05], { stroke: "#d6d2cb", strokeWidth: 0.6 }, `by${y}`));
  return <g>{lineas}</g>;
}

const enArena = (x: number, y: number) => !(x > 6.8 && y < 10.6);

function TexturaArena() {
  const r = azar(5);
  const puntos: ReactElement[] = [];
  for (let i = 0; i < 700 && puntos.length < 380; i++) {
    const x = r() * 23.8;
    const y = r() * 17.8;
    if (!enArena(x, y)) continue;
    const [px, py] = pt([x, y, 0]);
    puntos.push(<circle key={i} cx={px} cy={py} r={0.55} fill="#9c7f45" opacity={rd(0.25 + r() * 0.3)} />);
  }
  return <g>{puntos}</g>;
}

function Pasto() {
  const r = azar(3);
  const matas: ReactElement[] = [];
  for (let i = 0; i < 160 && matas.length < 70; i++) {
    const x = r() * 23.5;
    const y = r() * 17.5;
    if (!enArena(x, y)) continue;
    const [px, py] = pt([x, y, 0]);
    const alto = 3 + r() * 4;
    matas.push(
      <path
        key={i}
        d={`M${rd(px - 3)} ${py} q1 ${rd(-alto * 0.6)} 2 ${rd(-alto)} M${px} ${py} q0.5 ${rd(-alto * 0.7)} 0 ${rd(-alto * 1.2)} M${rd(px + 3)} ${py} q-1 ${rd(-alto * 0.6)} -2 ${rd(-alto)}`}
        stroke="#8b7442"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  return <g>{matas}</g>;
}

/* Árbol: tronco, ramas que se abren (recursivas), copa de puntos y sombra. */
function ArbolLamina({ en, alto, semilla }: { en: P3; alto: number; semilla: number }) {
  const r = azar(semilla);
  const [bx, by] = pt(en);
  const largo = alto * 14;
  const ramas: ReactElement[] = [];
  const puntas: [number, number][] = [];
  function rama(x: number, y: number, angulo: number, l: number, grosor: number, nivel: number) {
    const x2 = rd(x + Math.sin(angulo) * l);
    const y2 = rd(y - Math.cos(angulo) * l);
    ramas.push(<line key={ramas.length} x1={rd(x)} y1={rd(y)} x2={x2} y2={y2} stroke="#2b2620" strokeWidth={rd(grosor)} strokeLinecap="round" />);
    if (nivel === 0) {
      puntas.push([x2, y2]);
      return;
    }
    const hijos = nivel > 2 ? 2 : 3;
    for (let i = 0; i < hijos; i++) {
      const desvio = (i - (hijos - 1) / 2) * (0.45 + r() * 0.35);
      rama(x2, y2, angulo + desvio, l * (0.62 + r() * 0.15), grosor * 0.65, nivel - 1);
    }
  }
  rama(bx, by, 0, largo * 0.42, 2.6, 4);
  const puntos = puntas.flatMap(([px, py], i) =>
    Array.from({ length: 9 }, (_, j) => {
      const a = r() * Math.PI * 2;
      const d = r() * 9;
      return (
        <circle
          key={`${i}-${j}`}
          cx={rd(px + Math.cos(a) * d)}
          cy={rd(py + Math.sin(a) * d)}
          r={rd(0.8 + r() * 1)}
          fill={["#8a7550", "#b39c6e", "#6f6a5e", "#c9b58a"][Math.floor(r() * 4)]}
          opacity={0.9}
        />
      );
    })
  );
  // Sombra: el tronco y algunas ramas acostados sobre el terreno.
  const sombra = [0, -0.35, 0.3, -0.7, 0.6].map((desvio, i) => {
    const [sx, sy] = pt([en[0] + alto * (1.3 - Math.abs(desvio) * 0.4), en[1] - alto * 0.25 + desvio * alto * 0.5, en[2]]);
    return <line key={i} x1={bx} y1={by} x2={sx} y2={sy} stroke="#5b4a33" strokeWidth={i === 0 ? 2.4 : 1} opacity={0.22} strokeLinecap="round" />;
  });
  return (
    <g>
      {sombra}
      {ramas}
      {puntos}
    </g>
  );
}

/* Siluetas: corriendo y sentada (la parada viene de DibujosIso). */
function Corriendo({ x, y, alto = 22, espejo = false }: { x: number; y: number; alto?: number; espejo?: boolean }) {
  const k = alto / 100;
  const s = espejo ? -1 : 1;
  return (
    <g transform={`translate(${rd(x - 20 * k * s)} ${rd(y - 100 * k)}) scale(${rd(k * s)} ${rd(k)})`}>
      <circle cx="25" cy="10" r="8" fill="#2b2b30" />
      <path d="M19 21 L30 23 L33 45 L41 52 L37 57 L29 49 L28 60 L37 79 L42 95 L35 97 L29 82 L20 67 L13 82 L6 94 L0 90 L8 77 L14 60 L16 45 L8 53 L4 48 L15 35 Z" fill="#2b2b30" />
    </g>
  );
}

function Sentada({ x, y, alto = 16 }: { x: number; y: number; alto?: number }) {
  const k = alto / 70;
  return (
    <g transform={`translate(${rd(x - 15 * k)} ${rd(y - 70 * k)}) scale(${rd(k)})`}>
      <circle cx="16" cy="9" r="7" fill="#2b2b30" />
      <path d="M10 18 L22 18 L24 42 L40 44 L40 70 L34 70 L33 51 L14 50 L9 40 Z" fill="#2b2b30" />
      <path d="M2 46 L30 46 L30 49 L5 49 L5 70 L2 70 Z" fill="#57534e" />
    </g>
  );
}

function Pajaros({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#292524" strokeWidth="1.2" fill="none" strokeLinecap="round">
      {[[0, 0, 1], [13, -7, 0.8], [25, 2, 1.1], [7, 10, 0.7], [34, -4, 0.9], [20, 12, 0.8]].map(([dx, dy, k], i) => (
        <path key={i} d={`M${rd(x + dx - 5 * k)} ${rd(y + dy)} q${rd(2.5 * k)} ${rd(-3.5 * k)} ${rd(5 * k)} 0 q${rd(2.5 * k)} ${rd(-3.5 * k)} ${rd(5 * k)} 0`} />
      ))}
    </g>
  );
}

/* Marca sutil sobre lo que se borra: círculo fino punteado y una palabra. */
function Marca({ x, y, r, texto }: { x: number; y: number; r: number; texto: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#dc2626" strokeWidth={1.1} strokeDasharray="4 3" />
      <text x={x} y={y - r - 4} textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif" fill="#b91c1c" stroke="#fff" strokeWidth="3" paintOrder="stroke">
        {texto}
      </text>
    </g>
  );
}

function Etiqueta({ x, y, texto }: { x: number; y: number; texto: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial, sans-serif" fill="#b91c1c" stroke="#fff" strokeWidth="3" paintOrder="stroke">
      {texto}
    </text>
  );
}

export default function IlustracionTerreno({ conTodo }: { conTodo: boolean }) {
  const id = conTodo ? "viene" : "queda";
  const arbol1: P3 = [3.4, 13.2, 0];
  const arbol2: P3 = [2.4, 4, 0];
  const caminante: P3 = [14, 8.8, 0.05];
  const mesa: P3 = [5.6, 9, 0];
  const juego: P3[] = [[14.5, 15.6, 0], [18.5, 16.4, 0]];
  const [a1x, a1y] = pt([arbol1[0], arbol1[1], 6.2]);
  const [a2x, a2y] = pt([arbol2[0], arbol2[1], 5.4]);
  const [cx, cy] = pt(caminante);
  const [mx, my] = pt(mesa);
  const [jx, jy] = pt([16.5, 16, 0]);
  const [px, py] = pt([1, 9.5, 9.5]);
  const [tx, ty] = pt([24, 18, -1.2]);
  return (
    <Escena
      titulo={conTodo ? "Casa en un terreno con árboles, personas, pájaros y pasto, marcados para borrar" : "Solo la casa: lo que se imprime"}
      cajas={conTodo ? [...TERRENO, ...CASA] : CASA}
      incluir={conTodo ? [[1, 9.5, 11], [3.4, 13.2, 9.5], [2.4, 4, 9], [25.5, 19.5, -3]] : [[7, 0, 8], [24, 8, -0.5]]}
      margen={conTodo ? 12 : 26}
      className={conTodo ? "" : "mx-auto max-w-[78%]"}
      encima={
        <>
          {conTodo && (
            <>
              <TexturaArena />
              <Baldosas />
            </>
          )}
          <Detalles id={id} conTerreno={conTodo} />
          {conTodo && (
            <>
              <Pasto />
              <ArbolLamina en={arbol2} alto={5.4} semilla={23} />
              <ArbolLamina en={arbol1} alto={6.2} semilla={11} />
              <Persona x={cx} y={cy} alto={24} />
              <ellipse cx={mx} cy={my} rx="11" ry="5" fill="#fafaf9" stroke="#292524" strokeWidth="0.8" />
              <Sentada x={mx - 16} y={my + 2} />
              <Sentada x={mx + 14} y={my - 3} />
              <Persona x={pt([4.6, 10.6, 0])[0]} y={pt([4.6, 10.6, 0])[1]} alto={23} />
              <Corriendo x={pt(juego[0])[0]} y={pt(juego[0])[1]} />
              <Corriendo x={pt(juego[1])[0]} y={pt(juego[1])[1]} espejo />
              <circle cx={pt([16.6, 16.2, 0])[0]} cy={pt([16.6, 16.2, 0])[1] - 2} r="2" fill="#1c1917" />
              <Pajaros x={px} y={py} />

              <Marca x={a1x} y={a1y} r={46} texto="árbol" />
              <Marca x={a2x} y={a2y} r={40} texto="árbol" />
              <Marca x={mx} y={my - 8} r={28} texto="personas" />
              <Marca x={cx} y={cy - 12} r={17} texto="persona" />
              <Marca x={jx} y={jy - 10} r={30} texto="personas" />
              <Marca x={px + 15} y={py + 2} r={24} texto="pájaros" />
              <Etiqueta x={tx} y={ty + 18} texto="terreno y patio" />
            </>
          )}
        </>
      }
    />
  );
}
