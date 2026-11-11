"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import ImagenAmpliable from "@/components/ImagenAmpliable";
import FotoMarcada, { Cartel } from "@/components/FotoMarcada";

/*
 * Tutorial: la receta corta para dejar el SKP listo para imprimir.
 * Siete pasos en orden, cada uno con qué hacer en SketchUp, un dibujo o una
 * foto marcada, y cómo saber que quedó bien. Se van tildando (solo en pantalla).
 */

type Foto = {
  src: string;
  pie: string;
  // Solo una parte de la foto (en píxeles de la original).
  recorte?: { ancho: number; alto: number; x: number; y: number; w: number; h: number };
};

type Paso = {
  titulo: string;
  porque: string;
  hacer: ReactNode[];
  bien: string;
  dibujo?: ReactNode;
  // Debajo del texto, a todo el ancho (fotos marcadas, herramientas).
  extra?: ReactNode;
  // Botón que despliega el paso a paso para arreglarlo (con fotos si hay).
  solucion?: { boton: string; fotos?: Foto[]; pasos: ReactNode[] };
};

const VERDE = "#059669";
const ROJO = "#dc2626";

/* ------------------------------------------------------------------ */
/* Dibujos                                                              */
/* ------------------------------------------------------------------ */

/* Paso 1: el original queda guardado y se trabaja en la copia. */
function DibujoCopia() {
  const archivo = (x: number, nombre: string, nota: string, color: string) => (
    <g>
      <path d={`M${x} 20 h62 l18 18 v82 h-80 z`} fill="none" stroke={color} strokeWidth="3" />
      <path d={`M${x + 62} 20 v18 h18`} fill="none" stroke={color} strokeWidth="3" />
      <text x={x + 40} y="84" fontSize="15" fontWeight="800" textAnchor="middle" fill={color}>SKP</text>
      <text x={x + 40} y="140" fontSize="11" fontWeight="700" textAnchor="middle" fill="currentColor">{nombre}</text>
      <text x={x + 40} y="156" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.7">{nota}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 320 165" role="img" aria-label="El archivo original queda guardado y se trabaja en una copia" className="w-full">
      {archivo(30, "mi-proyecto.skp", "original: no se toca", "currentColor")}
      <path d="M125 72 h58" stroke={VERDE} strokeWidth="3" markerEnd="url(#flechaCopia)" />
      <text x="154" y="62" fontSize="11" fontWeight="700" textAnchor="middle" fill={VERDE}>Guardar como</text>
      {archivo(210, "...-imprimir.skp", "acá trabajás", VERDE)}
      <defs>
        <marker id="flechaCopia" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={VERDE} />
        </marker>
      </defs>
    </svg>
  );
}

/* Paso 2: la arquitectura queda; personas, árboles 2D, textos y cotas, no. */
function DibujoBorrar() {
  const tachar = (x: number, y: number) => (
    <g stroke={ROJO} strokeWidth="3.5" strokeLinecap="round">
      <line x1={x - 14} y1={y - 14} x2={x + 14} y2={y + 14} />
      <line x1={x + 14} y1={y - 14} x2={x - 14} y2={y + 14} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="Se borran personas, árboles 2D, textos y cotas; queda la arquitectura" className="w-full">
      <line x1="10" y1="132" x2="310" y2="132" stroke="currentColor" opacity="0.3" />
      {/* Edificio: queda */}
      <rect x="20" y="62" width="90" height="70" fill="currentColor" opacity="0.6" />
      <rect x="14" y="56" width="102" height="8" fill="currentColor" opacity="0.85" />
      <text x="65" y="155" fontSize="11" fontWeight="800" textAnchor="middle" fill={VERDE}>✓ queda</text>
      {/* Persona 2D */}
      <g stroke="currentColor" strokeWidth="3" fill="none" opacity="0.7">
        <circle cx="150" cy="92" r="7" />
        <line x1="150" y1="99" x2="150" y2="118" />
        <line x1="150" y1="118" x2="142" y2="132" />
        <line x1="150" y1="118" x2="158" y2="132" />
        <line x1="140" y1="106" x2="160" y2="106" />
      </g>
      {tachar(150, 108)}
      {/* Árbol plano */}
      <g opacity="0.7">
        <circle cx="200" cy="92" r="18" fill="currentColor" opacity="0.5" />
        <rect x="197" y="108" width="6" height="24" fill="currentColor" />
      </g>
      {tachar(200, 105)}
      {/* Texto y cota */}
      <text x="240" y="100" fontSize="22" fontWeight="800" fill="currentColor" opacity="0.7">Aa</text>
      <g stroke="currentColor" strokeWidth="2" opacity="0.7">
        <line x1="236" y1="120" x2="300" y2="120" />
        <line x1="236" y1="114" x2="236" y2="126" />
        <line x1="300" y1="114" x2="300" y2="126" />
      </g>
      {tachar(268, 105)}
      <text x="225" y="155" fontSize="11" fontWeight="800" textAnchor="middle" fill={ROJO}>✗ se borra</text>
    </svg>
  );
}

/* Paso 3: dónde cortar las plantas (justo debajo de cada losa: la losa va con su planta). */
function DibujoCortes() {
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="Edificio de dos plantas cortado justo debajo de cada losa" className="w-full">
      <rect x="40" y="148" width="150" height="8" fill="currentColor" opacity="0.85" />
      <rect x="44" y="96" width="8" height="52" fill="currentColor" opacity="0.55" />
      <rect x="178" y="96" width="8" height="52" fill="currentColor" opacity="0.55" />
      <rect x="40" y="88" width="150" height="8" fill="currentColor" opacity="0.85" />
      <rect x="44" y="36" width="8" height="52" fill="currentColor" opacity="0.55" />
      <rect x="178" y="36" width="8" height="52" fill="currentColor" opacity="0.55" />
      <rect x="36" y="28" width="158" height="8" fill="currentColor" opacity="0.85" />
      <line x1="20" y1="97" x2="210" y2="97" stroke={ROJO} strokeWidth="2.5" strokeDasharray="7 5" />
      <line x1="20" y1="37" x2="210" y2="37" stroke={ROJO} strokeWidth="2.5" strokeDasharray="7 5" />
      <text x="222" y="101" fontSize="12" fontWeight="700" fill={ROJO}>corte</text>
      <text x="222" y="41" fontSize="12" fontWeight="700" fill={ROJO}>corte</text>
      <text x="222" y="126" fontSize="11" fill="currentColor" opacity="0.8">planta baja</text>
      <text x="222" y="72" fontSize="11" fill="currentColor" opacity="0.8">planta alta</text>
      <text x="222" y="20" fontSize="11" fill="currentColor" opacity="0.8">techo</text>
    </svg>
  );
}

/* Paso 4: un muro visto de arriba, con su espesor. */
function DibujoEspesor() {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Un muro de una sola cara no tiene espesor; uno con espesor sí se imprime" className="w-full">
      {/* Una sola cara */}
      <line x1="30" y1="40" x2="140" y2="40" stroke={ROJO} strokeWidth="2" />
      <text x="85" y="28" fontSize="11" fontWeight="800" textAnchor="middle" fill={ROJO}>✗ una sola cara: 0 mm</text>
      <text x="85" y="62" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.7">la impresora no la ve</text>
      {/* Con espesor */}
      <rect x="180" y="26" width="110" height="26" fill="currentColor" opacity="0.6" />
      <text x="235" y="16" fontSize="11" fontWeight="800" textAnchor="middle" fill={VERDE}>✓ con espesor</text>
      <g stroke={VERDE} strokeWidth="2">
        <line x1="298" y1="26" x2="298" y2="52" />
        <line x1="293" y1="26" x2="303" y2="26" />
        <line x1="293" y1="52" x2="303" y2="52" />
      </g>
      {/* Empujar/Tirar */}
      <rect x="110" y="96" width="100" height="10" fill="currentColor" opacity="0.6" />
      <rect x="110" y="106" width="100" height="22" fill={VERDE} opacity="0.25" stroke={VERDE} strokeDasharray="5 4" />
      <path d="M160 100 v18" stroke={VERDE} strokeWidth="3" markerEnd="url(#flechaEspesor)" />
      <text x="160" y="146" fontSize="11" fontWeight="700" textAnchor="middle" fill="currentColor">Empujar/Tirar (P) le da espesor</text>
      <defs>
        <marker id="flechaEspesor" markerWidth="8" markerHeight="8" refX="4" refY="6" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" fill={VERDE} />
        </marker>
      </defs>
    </svg>
  );
}

/* Paso 5: una caja cerrada (sólido) contra una a la que le falta la tapa. */
function DibujoCerrado() {
  const caja = (dx: number, abierta: boolean) => {
    const color = abierta ? ROJO : VERDE;
    return (
      <g transform={`translate(${dx} 0)`}>
        {/* frente y costado */}
        <path d="M20 60 L70 85 L70 140 L20 115 Z" fill="currentColor" opacity="0.45" stroke="currentColor" strokeWidth="1.5" />
        <path d="M70 85 L120 60 L120 115 L70 140 Z" fill="currentColor" opacity="0.6" stroke="currentColor" strokeWidth="1.5" />
        {/* tapa */}
        {abierta ? (
          <path d="M20 60 L70 35 L120 60 L70 85 Z" fill="none" stroke={ROJO} strokeWidth="2.5" strokeDasharray="6 5" />
        ) : (
          <path d="M20 60 L70 35 L120 60 L70 85 Z" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1.5" />
        )}
        <text x="70" y="162" fontSize="11" fontWeight="800" textAnchor="middle" fill={color}>
          {abierta ? "✗ le falta la tapa" : "✓ cerrada por todos lados"}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 300 170" role="img" aria-label="Una caja a la que le falta una cara y otra cerrada" className="w-full">
      {caja(0, true)}
      {caja(160, false)}
    </svg>
  );
}

/* Paso 7: todas las piezas a la misma altura, apoyadas en el piso. */
function DibujoAltura() {
  const piso = (y: number) => <line x1="12" y1={y} x2="308" y2={y} stroke="currentColor" strokeWidth="2" opacity="0.5" />;
  return (
    <svg viewBox="0 0 320 250" role="img" aria-label="Así no: piezas flotando o enterradas. Así sí: todas apoyadas en el piso" className="w-full">
      <text x="14" y="18" fontSize="12" fontWeight="800" fill={ROJO}>✗ Así no</text>
      {piso(98)}
      <rect x="24" y="66" width="70" height="32" fill="currentColor" opacity="0.6" />
      <rect x="120" y="30" width="70" height="28" fill={ROJO} opacity="0.55" />
      <text x="155" y="76" fontSize="10" fontWeight="700" textAnchor="middle" fill={ROJO}>flota</text>
      <path d="M155 60 v26" stroke={ROJO} strokeWidth="2" strokeDasharray="3 3" />
      <rect x="216" y="80" width="70" height="34" fill={ROJO} opacity="0.55" />
      <text x="251" y="128" fontSize="10" fontWeight="700" textAnchor="middle" fill={ROJO}>enterrada</text>

      <text x="14" y="160" fontSize="12" fontWeight="800" fill={VERDE}>✓ Así sí</text>
      {piso(222)}
      {[24, 120, 216].map((x) => (
        <rect key={x} x={x} y={190} width="70" height="32" fill={VERDE} opacity="0.55" />
      ))}
      <text x="160" y="242" fontSize="10" fontWeight="700" textAnchor="middle" fill={VERDE}>todas apoyadas en el piso, con espacio entre ellas</text>
    </svg>
  );
}

/* Paso 6: foto marcada: dónde están las caras al revés, y cómo queda corregido. */
function FotosCaras() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <figure className="overflow-hidden rounded-2xl border-2 border-red-600/50 bg-[var(--card-bg)]">
        <FotoMarcada
          src="/tutorial/asi-no2.png"
          alt="Caja con caras al revés marcadas en rojo"
          ancho={1563}
          alto={1231}
          marcas={
            <>
              {/* Solo el contorno: así se sigue viendo el gris azulado de la cara al revés. */}
              <path d="M258 455 L857 925 L857 1100 L258 620 Z" fill="none" stroke={ROJO} strokeWidth="10" />
              <path d="M897 292 L1285 600 L862 872 L475 565 Z" fill="none" stroke={ROJO} strokeWidth="10" />
              <path d="M1315 425 L1425 515 L1315 585 Z" fill="none" stroke={ROJO} strokeWidth="10" />
              <path d="M325 790 L475 910 L475 955 L325 835 Z" fill="none" stroke={ROJO} strokeWidth="10" />
              <Cartel x={40} y={90} texto="En rojo: caras al revés (gris azulado)" tamano={46} />
            </>
          }
        />
        <figcaption className="px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
          El problema: desde afuera se ve la cara de adentro (gris azulado).
        </figcaption>
      </figure>
      <figure className="overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-[var(--card-bg)]">
        <FotoMarcada
          src="/tutorial/asi-si.png"
          alt="La misma caja corregida, toda blanca"
          ancho={1590}
          alto={1247}
          marcas={<Cartel x={40} y={90} texto="Corregido: todo blanco" color={VERDE} tamano={46} />}
        />
        <figcaption className="px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
          La solución: clic derecho → Invertir caras, hasta que todo se vea blanco.
        </figcaption>
      </figure>
    </div>
  );
}

/* Paso 7: foto real marcada: el modelo completo y sus piezas separadas, todas en el piso. */
function FotoSeparadas() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
      <FotoMarcada
        src="/tutorial/despiezado-unido.png"
        alt="Piezas de un edificio separadas en el piso, junto al modelo completo"
        ancho={1872}
        alto={833}
        marcas={
          <>
            <rect x="95" y="140" width="1135" height="450" rx="30" fill="none" stroke="#2563eb" strokeWidth="7" strokeDasharray="26 16" />
            <Cartel x={110} y={118} texto="Piezas separadas: cada una es un grupo" color="#2563eb" tamano={36} />
            <rect x="1265" y="225" width="580" height="400" rx="30" fill="none" stroke={VERDE} strokeWidth="7" strokeDasharray="26 16" />
            <Cartel x={1275} y={205} texto="Modelo completo (referencia)" color={VERDE} tamano={32} />
            <line x1="120" y1="650" x2="1180" y2="650" stroke={ROJO} strokeWidth="6" />
            <Cartel x={250} y={720} texto="Todas apoyadas en el piso, a la misma altura" color={ROJO} tamano={36} />
          </>
        }
      />
      <figcaption className="px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
        Así se ve un archivo listo: las piezas una al lado de la otra, en el piso y sin tocarse.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Medidor de espesor (paso 4)                                          */
/* ------------------------------------------------------------------ */

const ESCALAS = [50, 75, 100, 125, 200, 250, 500];
// Misma regla que el Escalador: menos que la boquilla no sale; una pasada (hasta 2× la boquilla) sale frágil;
// dos pasadas o más, firme.
const BOQUILLAS = [0.4, 0.2];

function cm(valor: number) {
  return valor.toLocaleString("es-UY", { maximumFractionDigits: 1 });
}

function mm(valor: number) {
  return valor.toLocaleString("es-UY", { maximumFractionDigits: 2 });
}

function MedidorEspesor() {
  const [escala, setEscala] = useState(100);
  const [otra, setOtra] = useState("");
  const [muro, setMuro] = useState("");
  const [boquilla, setBoquilla] = useState(0.4);
  const minimo = (boquilla * escala) / 10; // cm en SketchUp (tamaño real)
  const ideal = (boquilla * 2 * escala) / 10;
  const medido = Number(muro.replace(",", "."));
  const estado = !muro || !(medido > 0) ? null : medido < minimo ? "no" : medido < ideal ? "justo" : "si";

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-black/[0.02] p-4 dark:bg-white/[0.03] sm:p-5">
      <p className="text-sm font-black">📏 ¿Qué tan grueso tiene que ser el muro? Elegí tu escala:</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ESCALAS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => {
              setEscala(valor);
              setOtra("");
            }}
            aria-pressed={escala === valor && !otra}
            className={`h-9 rounded-xl border px-3 text-sm font-black transition ${
              escala === valor && !otra ? "border-red-600 bg-red-600 text-white" : "border-[var(--border-color)] hover:border-red-600"
            }`}
          >
            1:{valor}
          </button>
        ))}
        <label className="flex h-9 items-center gap-1 rounded-xl border border-[var(--border-color)] px-2 text-sm font-black">
          1:
          <input
            value={otra}
            inputMode="numeric"
            placeholder="otra"
            aria-label="Otra escala"
            onChange={(evento) => {
              const limpio = evento.target.value.replace(/\D/g, "").slice(0, 4);
              setOtra(limpio);
              if (Number(limpio) > 0) setEscala(Number(limpio));
            }}
            className="w-14 bg-transparent outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm font-bold">
        Boquilla:
        {BOQUILLAS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setBoquilla(valor)}
            aria-pressed={boquilla === valor}
            className={`h-8 rounded-xl border px-3 text-xs font-black transition ${
              boquilla === valor ? "border-red-600 bg-red-600 text-white" : "border-[var(--border-color)] hover:border-red-600"
            }`}
          >
            {mm(valor)} mm{valor === 0.4 ? " (la común)" : " (más detalle)"}
          </button>
        ))}
      </div>

      {/* Escala de colores: rojo no se imprime, amarillo una sola pasada (frágil), verde dos pasadas o más. */}
      <div className="mt-4 overflow-hidden rounded-xl text-center text-xs font-black text-white">
        <div className="grid grid-cols-3">
          <div className="bg-red-600 px-2 py-3">
            Menos de {cm(minimo)} cm
            <span className="block text-[11px] font-semibold opacity-90">✗ no se imprime</span>
          </div>
          <div className="bg-amber-500 px-2 py-3">
            {cm(minimo)} a {cm(ideal)} cm
            <span className="block text-[11px] font-semibold opacity-90">⚠ sale, pero frágil</span>
          </div>
          <div className="bg-emerald-600 px-2 py-3">
            {cm(ideal)} cm o más
            <span className="block text-[11px] font-semibold opacity-90">✓ ideal</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Medidas en SketchUp, a tamaño real. En la maqueta 1:{escala}, {cm(minimo)} cm quedan en {mm(boquilla)} mm: una sola pasada de la
        boquilla, sale pero se puede quebrar. Con {cm(ideal)} cm son dos pasadas ({mm(boquilla * 2)} mm): firme.
      </p>

      <label className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        ¿Cuánto mide tu muro más fino?
        <span className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3">
          <input
            value={muro}
            inputMode="decimal"
            placeholder="15"
            onChange={(evento) => setMuro(evento.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
            className="h-9 w-16 bg-transparent outline-none"
          />
          cm
        </span>
      </label>
      {estado && (
        <p
          className={`mt-2 rounded-xl px-3 py-2 text-sm font-black text-white ${
            estado === "no" ? "bg-red-600" : estado === "justo" ? "bg-amber-500" : "bg-emerald-600"
          }`}
        >
          {estado === "no"
            ? `✗ No sale: a 1:${escala} queda de ${mm((medido * 10) / escala)} mm, más fino que la boquilla. Engrosalo a ${cm(ideal)} cm.`
            : estado === "justo"
            ? `⚠ Sale, pero muy fino: a 1:${escala} queda de ${mm((medido * 10) / escala)} mm (una sola pasada) y se puede quebrar. Si podés, llevalo a ${cm(ideal)} cm.`
            : `✓ Bien: a 1:${escala} queda de ${mm((medido * 10) / escala)} mm, firme.`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pasos                                                                */
/* ------------------------------------------------------------------ */

const pasos: Paso[] = [
  {
    titulo: "Guardá una copia para imprimir",
    porque: "Vas a borrar y cortar cosas: así tu archivo original queda intacto.",
    hacer: [
      <>Archivo → <b>Guardar como…</b> → «mi-proyecto-imprimir.skp».</>,
      <>Trabajá siempre sobre esa copia.</>,
    ],
    bien: "Tenés dos archivos: el original y el de imprimir.",
    dibujo: <DibujoCopia />,
  },
  {
    titulo: "Borrá lo que no se imprime",
    porque: "La impresora no puede hacer personas planas, árboles 2D, textos ni cotas, y ensucian el archivo.",
    hacer: [
      <>Borrá personas, árboles y autos 2D, textos, cotas, imágenes y líneas sueltas.</>,
      <>Muebles: solo si los querés en la maqueta (y con espesor real).</>,
      <>Tip: en <b>Ventana → Etiquetas</b> ocultá todo menos la arquitectura, así ves qué sobra.</>,
      <>Al final: <b>Ventana → Información del modelo → Estadísticas → Purgar elementos no utilizados</b>.</>,
    ],
    bien: "Solo queda la arquitectura: muros, losas, techo, escaleras, terreno.",
    dibujo: <DibujoBorrar />,
  },
  {
    titulo: "Cortá por plantas y hacé un grupo con cada una",
    porque: "Cada planta se imprime apoyada sobre su losa: sin soportes, más limpia y más barata. Así también se ve el interior.",
    hacer: [
      <>Cortá <b>justo debajo de cada losa</b>: cada planta lleva su losa de piso con los muros de arriba, y el techo va aparte (mirá el dibujo).</>,
      <>Si los muros pasan de un piso a otro: dibujá un rectángulo grande a la altura del corte, seleccioná todo → clic derecho → <b>Intersecar caras → Con el modelo</b>, y borrá el rectángulo.</>,
      <>Para seleccionar una planta: poné la vista de frente y arrastrá un recuadro <b>de izquierda a derecha</b> (solo agarra lo que queda adentro).</>,
      <>Con la planta seleccionada: clic derecho → <b>Crear grupo</b>. Lo mismo con el techo.</>,
      <>¿Tu modelo no tiene nada adentro (solo la cáscara)? Puede ir entero en un solo grupo.</>,
    ],
    bien: "Al hacer clic en una planta se selecciona entera, como una sola pieza.",
    dibujo: <DibujoCortes />,
    solucion: {
      boton: "Ver cómo cortarlo, paso a paso",
      pasos: [
        <>Poné la vista de frente: <b>Cámara → Vistas estándar → Frontal</b>.</>,
        <>Dibujá con <b>Rectángulo (R)</b> un plano más grande que el edificio, justo debajo de la losa del primer piso.</>,
        <>Seleccioná todo (<b>Ctrl + A</b>) → clic derecho → <b>Intersecar caras → Con el modelo</b>. Borrá el rectángulo.</>,
        <>Arrastrá un recuadro <b>de izquierda a derecha</b> sobre la planta baja → clic derecho → <b>Crear grupo</b>.</>,
        <>Repetí con cada planta y con el techo.</>,
      ],
    },
  },
  {
    titulo: "Dale espesor a todo",
    porque: "Una cara sola mide 0 mm: la impresora no la puede hacer. Y lo muy fino se rompe.",
    hacer: [
      <>Entrá a cada grupo (doble clic) y a cada muro, losa o baranda que sea una sola cara dale espesor con <b>Empujar/Tirar (P)</b>.</>,
      <>Usá el medidor de abajo para saber el espesor mínimo de tu escala.</>,
    ],
    bien: "Mirando de costado, ningún muro ni losa es solo una línea, y el más fino está en verde en el medidor.",
    dibujo: <DibujoEspesor />,
    extra: <MedidorEspesor />,
  },
  {
    titulo: "Revisá que cada grupo esté cerrado",
    porque: "Si a un grupo le falta una cara, la impresora no sabe qué es adentro y qué es afuera.",
    hacer: [
      <>Instalá la extensión gratis <b>Solid Inspector²</b>: Extensiones → Extension Warehouse → buscala → Instalar.</>,
      <>Seleccioná un grupo y abrila (<b>Herramientas → Solid Inspector²</b>): te marca en rojo dónde está abierto.</>,
      <>Para cerrarlo: repasá con <b>Línea (L)</b> el borde abierto y SketchUp crea la cara.</>,
      <>¿Sin extensión? Exportá un STL (Archivo → Exportar → Modelo 3D → STL) y abrilo en el <Link href="/preparador-3d" className="font-bold underline">visor 3D</Link>: «Ver problemas» te lo marca.</>,
    ],
    bien: "Solid Inspector no marca nada en ningún grupo (o el visor dice que no hay problemas).",
    dibujo: <DibujoCerrado />,
  },
  {
    titulo: "Revisá que las caras miren para afuera",
    porque: "Las caras al revés confunden a la impresora.",
    hacer: [
      <><b>Ver → Estilo de cara → Monocromo</b>: desde afuera todo tiene que verse blanco.</>,
      <>Si ves caras grises o azules (como las marcadas en rojo abajo): seleccionalas → clic derecho → <b>Invertir caras</b>.</>,
    ],
    bien: "Girando alrededor del modelo, todo se ve blanco.",
    extra: <FotosCaras />,
    solucion: {
      boton: "Ver cómo solucionarlo, paso a paso",
      fotos: [
        { src: "/tutorial/material.png", pie: "Así se ven en SketchUp: blanco es la cara de afuera; gris azulado, la de adentro." },
        { src: "/tutorial/invertir-caras.png", pie: "Clic derecho sobre la cara → Invertir caras." },
      ],
      pasos: [
        <>Activá <b>Ver → Estilo de cara → Monocromo</b> para ver los colores de las caras.</>,
        <>Girá alrededor del modelo con la rueda del mouse apretada y buscá caras grises o azules.</>,
        <>Si están dentro de un grupo, entrá con <b>doble clic</b>.</>,
        <>Seleccioná la cara azul (con <b>Ctrl</b> sumás varias) → clic derecho → <b>Invertir caras</b>.</>,
        <>¿Muchas? Clic derecho en una cara bien → <b>Orientar caras</b>: las de al lado se dan vuelta igual.</>,
      ],
    },
  },
  {
    titulo: "Separá las piezas, todas en el piso, y mandá un solo archivo",
    porque: "Así vemos cada pieza clara, no se mezclan y sabemos cómo apoyarla en la impresora.",
    hacer: [
      <>Con <b>Mover (M)</b> poné las plantas y el techo uno al lado del otro, sin tocarse (dejá 1 m entre piezas).</>,
      <><b>Todas a la misma altura, apoyadas en el piso</b> (el plano de los ejes rojo y verde): ninguna flotando ni enterrada.</>,
      <>Dejalo a tamaño real, en metros. <b>No lo escales:</b> la escala la elegís en Cotizar.</>,
      <>Guardá y subí <b>ese único SKP</b> en Cotizar.</>,
    ],
    bien: "Un archivo, con todas las piezas separadas y apoyadas en el piso, a la misma altura.",
    dibujo: <DibujoAltura />,
    extra: <FotoSeparadas />,
    solucion: {
      boton: "Ver cómo desplegar las piezas, paso a paso",
      fotos: [
        {
          src: "/tutorial/despiezado-unido.png",
          pie: "Antes: el modelo completo, entero.",
          recorte: { ancho: 1872, alto: 833, x: 1250, y: 200, w: 622, h: 440 },
        },
        {
          src: "/tutorial/despiezado-unido.png",
          pie: "Después: el mismo modelo en piezas, todas en el piso.",
          recorte: { ancho: 1872, alto: 833, x: 100, y: 130, w: 1130, h: 470 },
        },
        { src: "/tutorial/ejemplo0.png", pie: "Así no: piezas una arriba de la otra, cada una a otra altura." },
        { src: "/tutorial/ejemplo5.png", pie: "Así sí: todo desplegado y apoyado en el piso." },
      ],
      pasos: [
        <>Hacé clic en el grupo de la planta alta (se selecciona entero).</>,
        <>Tocá <b>M</b> (Mover), hacé clic en una esquina y llevalo al costado.</>,
        <>Mientras movés, tocá la flecha <b>→</b> del teclado para que vaya recto.</>,
        <>Bajalo hasta el piso: <b>M</b> + flecha <b>↑</b> (eje azul) y hacé clic sobre el piso. Tiene que quedar apoyado, ni arriba ni abajo.</>,
        <>Repetí con el techo y el resto, dejando 1 m entre cada pieza.</>,
      ],
    },
  },
];

/* Botón que despliega abajo el paso a paso (con fotos si hay). */
function Solucion({ boton, fotos = [], pasos }: NonNullable<Paso["solucion"]>) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setAbierta((actual) => !actual)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-left text-sm font-black text-sky-800 transition hover:bg-sky-500/15 dark:text-sky-300"
      >
        <span aria-hidden className="text-lg">{fotos.length ? "📸" : "🧭"}</span>
        <span className="flex-1">{boton}</span>
        <span aria-hidden className={`transition ${abierta ? "rotate-180" : ""}`}>▾</span>
      </button>

      {abierta && (
        <div className="mt-3 space-y-4 rounded-2xl border border-[var(--border-color)] bg-black/[0.02] p-4 dark:bg-white/[0.03] sm:p-5">
          <ol className="space-y-2.5 text-[15px] leading-7">
            {pasos.map((linea, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white">
                  {i + 1}
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ol>
          {fotos.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {fotos.map((foto) => (
                  <figure key={foto.pie} className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                    {foto.recorte ? (
                      <FotoMarcada
                        src={foto.src}
                        alt={foto.pie}
                        ancho={foto.recorte.ancho}
                        alto={foto.recorte.alto}
                        recorte={foto.recorte}
                      />
                    ) : (
                      <ImagenAmpliable src={foto.src} alt={foto.pie} />
                    )}
                    <figcaption className="px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">{foto.pie}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Tocá una foto para verla grande.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecetaSKP() {
  const [listos, setListos] = useState<number[]>([]);
  const cantidad = listos.length;

  function alternar(indice: number) {
    setListos((actual) => (actual.includes(indice) ? actual.filter((i) => i !== indice) : [...actual, indice]));
  }

  return (
    <section id="receta" className="relative z-10 mx-auto max-w-4xl scroll-mt-24">
      <div className="sticky top-3 z-20 mx-auto mb-6 max-w-md rounded-full border border-[var(--border-color)] bg-[var(--card-bg)]/90 px-4 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center justify-between text-xs font-black">
          <span>Tu SKP listo</span>
          <span className={cantidad === pasos.length ? "text-emerald-600" : "text-[var(--text-muted)]"}>
            {cantidad} de {pasos.length} pasos
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(cantidad / pasos.length) * 100}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {pasos.map((paso, indice) => {
          const listo = listos.includes(indice);
          return (
            <li
              key={paso.titulo}
              className={`rounded-3xl border p-5 shadow-[var(--shadow-soft)] transition sm:p-7 ${
                listo ? "border-emerald-500/50 bg-emerald-500/5" : "border-[var(--border-color)] bg-[var(--card-bg)]"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${
                    listo ? "bg-emerald-600" : "bg-red-600"
                  }`}
                >
                  {listo ? "✓" : indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black leading-tight">{paso.titulo}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{paso.porque}</p>
                </div>
              </div>

              <div className={`mt-4 grid gap-5 ${paso.dibujo ? "md:grid-cols-[1.4fr_1fr] md:items-center" : ""}`}>
                <ul className="space-y-2.5 text-[15px] leading-7">
                  {paso.hacer.map((linea, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                      <span>{linea}</span>
                    </li>
                  ))}
                </ul>
                {paso.dibujo && (
                  <div className="rounded-2xl bg-black/[0.03] p-4 text-[var(--text-main)] dark:bg-white/[0.04]">{paso.dibujo}</div>
                )}
              </div>

              {paso.extra && <div className="mt-5">{paso.extra}</div>}

              {paso.solucion && <Solucion {...paso.solucion} />}

              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={listo}
                  onChange={() => alternar(indice)}
                  className="h-5 w-5 shrink-0 accent-emerald-600"
                />
                <span>
                  <b className="text-emerald-700 dark:text-emerald-400">Está bien si:</b> {paso.bien}
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-3xl border border-red-600/30 bg-red-600/5 p-6 text-center sm:p-8">
        <p className="text-2xl font-black">{cantidad === pasos.length ? "¡Listo! Ya podés mandarlo" : "¿Terminaste los 7 pasos?"}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
          Subí tu SKP en Cotizar y elegí la escala. Si algo no quedó perfecto, lo revisamos y te avisamos antes de imprimir.
        </p>
        <Link
          href="/cotizar"
          className="mt-5 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-red-600 px-7 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-red-700"
        >
          Subir mi modelo →
        </Link>
      </div>
    </section>
  );
}
