"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

/*
 * Tutorial: la receta corta para dejar el SKP listo para imprimir.
 * Siete pasos en orden, cada uno con qué hacer en SketchUp y cómo saber
 * que quedó bien. Se van tildando (solo en pantalla).
 */

type Paso = {
  titulo: string;
  porque: string;
  hacer: ReactNode[];
  bien: string;
  dibujo?: ReactNode;
};

/* Esquema: dónde cortar las plantas (justo debajo de cada losa: la losa va con su planta). */
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
      <line x1="20" y1="97" x2="210" y2="97" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="7 5" />
      <line x1="20" y1="37" x2="210" y2="37" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="7 5" />
      <text x="222" y="101" fontSize="12" fontWeight="700" fill="#dc2626">corte</text>
      <text x="222" y="41" fontSize="12" fontWeight="700" fill="#dc2626">corte</text>
      <text x="222" y="126" fontSize="11" fill="currentColor" opacity="0.8">planta baja</text>
      <text x="222" y="72" fontSize="11" fill="currentColor" opacity="0.8">planta alta</text>
      <text x="222" y="20" fontSize="11" fill="currentColor" opacity="0.8">techo</text>
    </svg>
  );
}

/* Esquema: las piezas una al lado de la otra, sin tocarse. */
function DibujoSeparadas() {
  return (
    <svg viewBox="0 0 320 120" role="img" aria-label="Planta baja, planta alta y techo separados en el piso" className="w-full">
      <line x1="10" y1="96" x2="310" y2="96" stroke="currentColor" opacity="0.3" />
      {[20, 120, 220].map((x, i) => (
        <g key={x}>
          <rect x={x} y={i === 2 ? 82 : 46} width="80" height={i === 2 ? 14 : 50} rx="2" fill="currentColor" opacity={i === 2 ? 0.85 : 0.6} />
          <text x={x + 40} y="114" fontSize="11" textAnchor="middle" fill="currentColor" opacity="0.8">
            {["planta baja", "planta alta", "techo"][i]}
          </text>
        </g>
      ))}
      <text x="110" y="36" fontSize="11" fontWeight="700" textAnchor="middle" fill="#059669">↔ espacio</text>
      <text x="210" y="36" fontSize="11" fontWeight="700" textAnchor="middle" fill="#059669">↔ espacio</text>
    </svg>
  );
}

const pasos: Paso[] = [
  {
    titulo: "Guardá una copia para imprimir",
    porque: "Vas a borrar y cortar cosas: así tu archivo original queda intacto.",
    hacer: [
      <>Archivo → <b>Guardar como…</b> → «mi-proyecto-imprimir.skp».</>,
      <>Trabajá siempre sobre esa copia.</>,
    ],
    bien: "Tenés dos archivos: el original y el de imprimir.",
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
  },
  {
    titulo: "Dale espesor a todo",
    porque: "Una cara sola mide 0 mm: la impresora no la puede hacer. Y lo muy fino se rompe.",
    hacer: [
      <>Entrá a cada grupo (doble clic) y a cada muro, losa o baranda que sea una sola cara dale espesor con <b>Empujar/Tirar (P)</b>.</>,
      <>Mínimo según la escala: <b>1:50 → 4 cm · 1:100 → 8 cm · 1:200 → 16 cm · 1:500 → 40 cm</b>.</>,
    ],
    bien: "Mirando de costado, ningún muro ni losa es solo una línea.",
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
  },
  {
    titulo: "Revisá que las caras miren para afuera",
    porque: "Las caras al revés confunden a la impresora.",
    hacer: [
      <><b>Ver → Estilo de cara → Monocromo</b>: desde afuera todo tiene que verse blanco.</>,
      <>Si ves caras grises o azules: seleccionalas → clic derecho → <b>Invertir caras</b>.</>,
    ],
    bien: "Girando alrededor del modelo, todo se ve blanco.",
  },
  {
    titulo: "Separá las piezas y mandá un solo archivo",
    porque: "Así vemos cada pieza clara y no se mezclan.",
    hacer: [
      <>Con <b>Mover (M)</b> poné las plantas y el techo uno al lado del otro, en el piso, sin tocarse (dejá 1 m entre piezas).</>,
      <>Dejalo a tamaño real, en metros. <b>No lo escales:</b> la escala la elegís en Cotizar.</>,
      <>Guardá y subí <b>ese único SKP</b> en Cotizar.</>,
    ],
    bien: "Un archivo, con todas las piezas separadas en el piso.",
    dibujo: <DibujoSeparadas />,
  },
];

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
