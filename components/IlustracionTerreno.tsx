import type { ReactElement } from "react";
import { Escena, Persona, proyectar, redondear as rd, type Caja, type P3 } from "@/components/DibujosIso";

/*
 * Guía, paso 2: ilustración propia de una casa en un terreno (axonometría con
 * arena, pasto, árboles, personas y pájaros). «Así viene»: con todo lo que no
 * se imprime marcado; «Así lo mandás»: solo la arquitectura y el terreno.
 */

const NEGRO = { arriba: "#3f3f46", costado: "#18181b", frente: "#27272a" };
const BLANCO = { arriba: "#ecebe8", costado: "#c9c6c0", frente: "#f7f6f3" };

const CAJAS: Caja[] = [
  { x: 0, y: 0, z: -1.2, w: 24, d: 18, h: 1.2, colores: { arriba: "#e9cf96", costado: "#8c857a", frente: "#a8a196" } }, // terreno
  { x: 7, y: 0, z: 0, w: 17, d: 10, h: 0.04, colores: { arriba: "#f3f2ef", costado: "#d6d3d1", frente: "#e7e5e4" } }, // patio
  { x: 10.5, y: 10.2, z: 0, w: 9, d: 4, h: 0.06, colores: { arriba: "#fafaf9", costado: "#d6d3d1", frente: "#e7e5e4" } }, // borde piscina
  { x: 11, y: 10.7, z: 0.06, w: 8, d: 3, h: 0.001, colores: { arriba: "#7ea9b8", costado: "#5b8794", frente: "#6b97a5" }, borde: "#44403c", alFinal: true }, // agua
  { x: 9.5, y: 1.6, z: 0, w: 9.5, d: 3.8, h: 3, colores: { arriba: "#cfd8d6", costado: "#8fb0ad", frente: "#a9c6c2" } }, // planta baja vidriada
  { x: 19, y: 1, z: 0, w: 4, d: 6, h: 3, colores: NEGRO }, // muro negro
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

function poli(puntos: P3[]) {
  return puntos.map((p) => proyectar(p).map((v) => v.toFixed(1)).join(",")).join(" ");
}

/* Ventanas y vidrios (encima de las caras de la casa). */
function Aberturas() {
  return (
    <g stroke="#292524" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
      {[9.3, 12, 14.7].map((x) => (
        <polygon key={x} points={poli([[x, 6, 3.8], [x + 2, 6, 3.8], [x + 2, 6, 5.1], [x, 6, 5.1]])} fill="#9fbdb9" />
      ))}
      {[11, 12.6, 14.2, 15.8, 17.4].map((x) => (
        <line key={x} x1={proyectar([x, 5.4, 0])[0]} y1={proyectar([x, 5.4, 0])[1]} x2={proyectar([x, 5.4, 3])[0]} y2={proyectar([x, 5.4, 3])[1]} />
      ))}
      {/* Textura del muro negro: puntitos claros */}
      {(() => {
        const r = azar(7);
        return Array.from({ length: 46 }, (_, i) => {
          const [x, y] = proyectar([19.2 + r() * 3.6, 7, 0.2 + r() * 2.6]);
          return <circle key={i} cx={x} cy={y} r={0.9} fill="#d6d3d1" stroke="none" opacity={0.55} />;
        });
      })()}
    </g>
  );
}

/* Pasto: rayitas sobre la arena (fuera del patio y la piscina). */
function Pasto() {
  const r = azar(3);
  const matas: ReactElement[] = [];
  for (let i = 0; i < 90 && matas.length < 55; i++) {
    const x = r() * 23.5;
    const y = r() * 17.5;
    if (x > 6.8 && y < 10.2) continue;
    if (x > 10.3 && x < 19.7 && y > 10 && y < 14.4) continue;
    const [px, py] = proyectar([x, y, 0]);
    matas.push(
      <path key={i} d={`M${px - 2.5} ${py} l1.5 -4 M${px} ${py} l0 -5 M${px + 2.5} ${py} l-1.5 -4`} stroke="#a3884f" strokeWidth="0.9" fill="none" />
    );
  }
  return <g>{matas}</g>;
}

/* Árbol: tronco, ramas y copa de puntos (como en las láminas de arquitectura). */
function ArbolPuntos({ en, alto = 4.5, semilla = 1 }: { en: P3; alto?: number; semilla?: number }) {
  const r = azar(semilla);
  const [bx, by] = proyectar(en);
  const [tx, ty] = proyectar([en[0], en[1], en[2] + alto]);
  const radio = alto * 7;
  const ramas = Array.from({ length: 7 }, (_, i) => {
    const desde = 0.35 + i * 0.09;
    const sx = bx + (tx - bx) * desde;
    const sy = by + (ty - by) * desde;
    const angulo = (i % 2 ? -1 : 1) * (0.5 + r() * 0.7);
    const largo = radio * (0.55 + r() * 0.4);
    return <line key={i} x1={rd(sx)} y1={rd(sy)} x2={rd(sx + Math.sin(angulo) * largo)} y2={rd(sy - Math.cos(angulo) * largo)} stroke="#3f3a33" strokeWidth={1.1} />;
  });
  const puntos = Array.from({ length: 150 }, (_, i) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radio;
    return (
      <circle key={i} cx={rd(tx + Math.cos(a) * d * 1.15)} cy={rd(ty + 4 + Math.sin(a) * d * 0.8)} r={rd(0.9 + r() * 0.9)} fill={r() > 0.4 ? "#8a7a5c" : "#c2ad82"} />
    );
  });
  // Sombra del árbol sobre el terreno.
  const [sx, sy] = proyectar([en[0] + alto * 1.4, en[1] - alto * 0.3, en[2]]);
  return (
    <g>
      <line x1={bx} y1={by} x2={sx} y2={sy} stroke="#5b4f3c" strokeWidth={2.2} opacity={0.18} strokeLinecap="round" />
      <line x1={bx} y1={by} x2={tx} y2={ty} stroke="#2f2a24" strokeWidth={2.2} strokeLinecap="round" />
      {ramas}
      {puntos}
    </g>
  );
}

function Pajaros({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#292524" strokeWidth="1.3" fill="none" strokeLinecap="round">
      {[[0, 0], [14, -6], [26, 3], [8, 10]].map(([dx, dy], i) => (
        <path key={i} d={`M${x + dx - 4} ${y + dy} q2 -3 4 0 q2 -3 4 0`} />
      ))}
    </g>
  );
}

/* Marca sutil sobre lo que se borra: círculo fino y una palabra. */
function Marca({ x, y, r, texto }: { x: number; y: number; r: number; texto: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#dc2626" fillOpacity={0.05} stroke="#dc2626" strokeWidth={1.3} />
      <text x={x} y={y - r - 4} textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif" fill="#b91c1c" stroke="#fff" strokeWidth="3" paintOrder="stroke">
        ✗ {texto}
      </text>
    </g>
  );
}

const PERSONAS: P3[] = [[13.5, 8.6, 0], [5.4, 8.6, 0], [7.2, 8.9, 0], [15.5, 15.8, 0], [19, 16.4, 0]];

export default function IlustracionTerreno({ conTodo }: { conTodo: boolean }) {
  const arbol1: P3 = [3.5, 13, 0];
  const arbol2: P3 = [2.2, 3.5, 0];
  const [a1x, a1y] = proyectar([arbol1[0], arbol1[1], 5.4]);
  const [a2x, a2y] = proyectar([arbol2[0], arbol2[1], 4.6]);
  const [px, py] = proyectar(PERSONAS[0]);
  const [mx, my] = proyectar([6.3, 8.7, 0.8]);
  const [jx, jy] = proyectar([17.2, 16.1, 0.8]);
  const [bx, by] = proyectar([0.5, 9, 8.5]);
  return (
    <Escena
      titulo={conTodo ? "Casa en un terreno con personas, árboles y pájaros, marcados para borrar" : "La misma casa y el terreno, sin nada de lo que no se imprime"}
      cajas={CAJAS}
      incluir={[[0.5, 9, 10.5], [3.5, 13, 9], [2.2, 3.5, 8.5]]}
      margen={14}
      encima={
        <>
          <Aberturas />
          {conTodo && (
            <>
              <Pasto />
              <ArbolPuntos en={arbol1} alto={6.5} semilla={11} />
              <ArbolPuntos en={arbol2} alto={5.6} semilla={23} />
              {PERSONAS.map((punto, i) => {
                const [x, y] = proyectar(punto);
                return <Persona key={i} x={x} y={y} alto={22} />;
              })}
              <ellipse cx={proyectar([6.3, 9.3, 0])[0]} cy={proyectar([6.3, 9.3, 0])[1]} rx="9" ry="4" fill="#fafaf9" stroke="#292524" strokeWidth="0.8" />
              <circle cx={proyectar([17.2, 16.6, 0])[0]} cy={proyectar([17.2, 16.6, 0])[1] - 2} r="1.8" fill="#292524" />
              <Pajaros x={bx} y={by} />
              <Marca x={a1x} y={a1y} r={50} texto="árbol" />
              <Marca x={a2x} y={a2y} r={44} texto="árbol" />
              <Marca x={mx} y={my - 6} r={22} texto="personas" />
              <Marca x={px} y={py - 12} r={16} texto="persona" />
              <Marca x={jx} y={jy - 6} r={24} texto="personas" />
              <Marca x={bx + 11} y={by + 2} r={22} texto="pájaros" />
            </>
          )}
        </>
      }
      etiquetas={[
        conTodo
          ? { en: [21, 2.7, 9.2], texto: "✓ la casa y el terreno quedan", color: "#047857", ancla: "middle" }
          : { en: [21, 2.7, 9.2], texto: "✓ solo lo que se imprime", color: "#047857", ancla: "middle" },
      ]}
    />
  );
}
