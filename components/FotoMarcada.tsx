import type { ReactNode } from "react";

/*
 * Foto del tutorial con marcas dibujadas encima (recuadros, flechas, textos).
 * Las marcas van en coordenadas de la foto original (ancho × alto en píxeles),
 * así quedan en su lugar a cualquier tamaño. Con «recorte» se muestra solo
 * una parte de la foto (x, y, ancho, alto, también en píxeles).
 */
export default function FotoMarcada({
  src,
  alt,
  ancho,
  alto,
  marcas,
  recorte,
  className = "",
}: {
  src: string;
  alt: string;
  ancho: number;
  alto: number;
  marcas?: ReactNode;
  recorte?: { x: number; y: number; w: number; h: number };
  className?: string;
}) {
  if (recorte) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full bg-no-repeat ${className}`}
        style={{
          aspectRatio: `${recorte.w} / ${recorte.h}`,
          backgroundImage: `url("${src}")`,
          backgroundSize: `${(ancho / recorte.w) * 100}% auto`,
          backgroundPosition: `${(recorte.x / Math.max(1, ancho - recorte.w)) * 100}% ${(recorte.y / Math.max(1, alto - recorte.h)) * 100}%`,
        }}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
      {marcas && (
        <svg viewBox={`0 0 ${ancho} ${alto}`} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          {marcas}
        </svg>
      )}
    </div>
  );
}

/* Cartel de texto con fondo, para escribir sobre una foto (coordenadas de la foto). */
export function Cartel({
  x,
  y,
  texto,
  color = "#dc2626",
  tamano = 34,
}: {
  x: number;
  y: number;
  texto: string;
  color?: string;
  tamano?: number;
}) {
  const ancho = texto.length * tamano * 0.56 + tamano;
  return (
    <g>
      <rect x={x} y={y - tamano * 1.05} width={ancho} height={tamano * 1.45} rx={tamano * 0.4} fill={color} />
      <text x={x + tamano / 2} y={y} fontSize={tamano} fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        {texto}
      </text>
    </g>
  );
}
