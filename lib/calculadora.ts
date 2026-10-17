/*
 * Calculadora de costos de impresión (panel › Calculadora).
 *
 * Misma cuenta que la calculadora que usaba el dueño:
 *   material  = $/kg ÷ 1000 × gramos
 *   luz       = W ÷ 1000 × horas × $/kWh
 *   desgaste  = repuestos ÷ vida útil (h) × horas
 *   error     = (material + luz + desgaste) × margen %
 *   costo     = material + luz + desgaste + error
 *   insumos   = insumos extra × (1 + recargo %)
 *   total     = costo × multiplicador + insumos
 * Ej.: 4 g, 25 min, A1 mini, ×1 y $10 de insumos → $19,64.
 */

export type PerfilCalculadora = {
  id: string;
  nombre: string;
  impresora: string;
  precioFilamento: number; // $ por kg
  precioKwh: number;
  consumoW: number;
  vidaUtilHoras: number;
  costoRepuestos: number;
  margenError: number; // %
  recargoInsumos: number; // %
  comisionML: number; // % que se queda MercadoLibre
  multiplicador: number;
};

export type PiezaCalculadora = {
  horas: number;
  minutos: number;
  gramos: number;
  insumos: number; // $ extra (argollas, cadenas, imanes...)
  piezas: number; // cuántas salen en esa impresión
};

/*
 * Consumo promedio imprimiendo PLA (W), de la tabla de Bambu Lab
 * (wiki "power consumption"): A1 mini 80 W, A1 95 W, H2D 197 W.
 * El resto, aproximado. Se puede cambiar en el perfil.
 */
export const IMPRESORAS = [
  { nombre: "Bambu Lab A1 Mini", consumoW: 80 },
  { nombre: "Bambu Lab A1", consumoW: 95 },
  { nombre: "Bambu Lab P1S", consumoW: 110 },
  { nombre: "Bambu Lab P1P", consumoW: 100 },
  { nombre: "Bambu Lab X1 Carbon", consumoW: 120 },
  { nombre: "Bambu Lab H2D", consumoW: 197 },
  { nombre: "Prusa MK4", consumoW: 80 },
  { nombre: "Creality Ender 3 V3", consumoW: 110 },
  { nombre: "Otra", consumoW: 0 },
] as const;

export const MULTIPLICADORES = [
  { valor: 2, texto: "Alto volumen / descuento" },
  { valor: 2.5, texto: "Volumen medio" },
  { valor: 3, texto: "Mayorista" },
  { valor: 3.5, texto: "Intermedio" },
  { valor: 4, texto: "Minorista" },
  { valor: 5, texto: "Llaveros / piezas chicas" },
];

export function perfilNuevo(nombre = "Mi perfil"): PerfilCalculadora {
  return {
    id: Math.random().toString(36).slice(2, 10),
    nombre,
    impresora: "Bambu Lab A1 Mini",
    // PLA Basic de Bambu en Uruguay (Cover Company, 2026).
    precioFilamento: 1025,
    // UTE Residencial Simple 2026, escalón 101-600 kWh: $8,452 + IVA 22%.
    precioKwh: 10.31,
    consumoW: 80,
    vidaUtilHoras: 4320,
    costoRepuestos: 7000,
    margenError: 15,
    recargoInsumos: 30,
    comisionML: 15,
    multiplicador: 3,
  };
}

export const PIEZA_VACIA: PiezaCalculadora = { horas: 0, minutos: 0, gramos: 0, insumos: 0, piezas: 1 };

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function calcular(perfil: PerfilCalculadora, pieza: PiezaCalculadora) {
  const horas = Math.max(0, pieza.horas) + Math.max(0, pieza.minutos) / 60;
  const material = (perfil.precioFilamento / 1000) * Math.max(0, pieza.gramos);
  const luz = (perfil.consumoW / 1000) * horas * perfil.precioKwh;
  const desgaste = perfil.vidaUtilHoras > 0 ? (perfil.costoRepuestos / perfil.vidaUtilHoras) * horas : 0;
  const error = (material + luz + desgaste) * (perfil.margenError / 100);
  const costo = material + luz + desgaste + error;
  const insumos = Math.max(0, pieza.insumos) * (1 + perfil.recargoInsumos / 100);
  const total = costo * Math.max(0, perfil.multiplicador) + insumos;
  const comision = Math.min(95, Math.max(0, perfil.comisionML)) / 100;
  const piezas = Math.max(1, Math.floor(pieza.piezas) || 1);

  return {
    horas,
    material: redondear(material),
    luz: redondear(luz),
    desgaste: redondear(desgaste),
    error: redondear(error),
    costo: redondear(costo),
    insumos: redondear(insumos),
    total: redondear(total),
    ganancia: redondear(total - costo - Math.max(0, pieza.insumos)),
    mercadoLibre: redondear(total / (1 - comision)),
    piezas,
    porPieza: redondear(total / piezas),
    // Precio "lindo" para pasarle al cliente: múltiplo de 5 hacia arriba.
    redondeado: Math.ceil(total / 5) * 5,
  };
}

export type ResultadoCalculadora = ReturnType<typeof calcular>;

/* "2 h 10 min" / "25 min" para el presupuesto. */
export function textoTiempo(pieza: PiezaCalculadora) {
  const total = Math.round(Math.max(0, pieza.horas) * 60 + Math.max(0, pieza.minutos));
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  if (!horas) return `${minutos} min`;
  return minutos ? `${horas} h ${minutos} min` : `${horas} h`;
}

/*
 * Al revés: "si lo vendo a $X, ¿cuánto gano?". El precio es por pieza
 * (si salen varias en la placa, los costos se reparten entre todas).
 * Insumos: lo que cuestan de verdad (sin el recargo).
 */
export function analizarVenta(perfil: PerfilCalculadora, pieza: PiezaCalculadora, precioVenta: number) {
  const base = calcular({ ...perfil, multiplicador: 1 }, { ...pieza, insumos: 0 });
  const piezas = base.piezas;
  const porPieza = (valor: number) => redondear(valor / piezas);

  const material = porPieza(base.material);
  const luz = porPieza(base.luz);
  const desgaste = porPieza(base.desgaste);
  const error = porPieza(base.error);
  const insumos = porPieza(Math.max(0, pieza.insumos));
  const costo = redondear(material + luz + desgaste + error + insumos);
  const precio = Math.max(0, precioVenta);
  const ganancia = redondear(precio - costo);
  const comision = Math.min(95, Math.max(0, perfil.comisionML)) / 100;
  const gananciaML = redondear(precio * (1 - comision) - costo);

  return {
    precio,
    piezas,
    material,
    luz,
    desgaste,
    error,
    insumos,
    costo,
    ganancia,
    // Qué parte del precio es ganancia, y cuántas veces el costo es el precio.
    margen: precio > 0 ? Math.round((ganancia / precio) * 100) : 0,
    veces: costo > 0 ? Math.round((precio / costo) * 10) / 10 : 0,
    gananciaTotal: redondear(ganancia * piezas),
    gananciaML,
    // Precio mínimo para no perder plata.
    minimo: Math.ceil(costo),
  };
}

export type AnalisisVenta = ReturnType<typeof analizarVenta>;
