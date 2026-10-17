/*
 * Llavero personalizado: opciones y formato compartidos por la tienda,
 * el panel y Apps Script (kintTiendaPersonalizacion_ usa las mismas listas).
 *
 * La personalización viaja en el comentario de la línea, así:
 *   "Texto: Antonio | Texto 2: Arquitecto | Fuente: Pacifico | Tamaño: Mediano | Borde: Normal
 *    | Fondo: Contorno | Separación: 0"
 * ("Texto 2", "Borde", "Fondo" y "Separación" son opcionales: los pedidos viejos no los traen)
 * y los colores en la lista de colores: [borde, letras].
 */

export const FUENTES_LLAVERO = [
  { nombre: "Rubik", archivo: "/fuentes-llavero/rubik.woff", estilo: "Redonda gruesa" },
  { nombre: "Fredoka", archivo: "/fuentes-llavero/fredoka.woff", estilo: "Redonda" },
  { nombre: "Baloo", archivo: "/fuentes-llavero/baloo.woff", estilo: "Redonda" },
  { nombre: "Titan One", archivo: "/fuentes-llavero/titan-one.woff", estilo: "Gordita" },
  { nombre: "Luckiest Guy", archivo: "/fuentes-llavero/luckiest-guy.woff", estilo: "Comic" },
  { nombre: "Bangers", archivo: "/fuentes-llavero/bangers.woff", estilo: "Comic" },
  { nombre: "Chewy", archivo: "/fuentes-llavero/chewy.woff", estilo: "Divertida" },
  { nombre: "Righteous", archivo: "/fuentes-llavero/righteous.woff", estilo: "Retro" },
  { nombre: "Bebas Neue", archivo: "/fuentes-llavero/bebas-neue.woff", estilo: "Alta" },
  { nombre: "Pacifico", archivo: "/fuentes-llavero/pacifico.woff", estilo: "Cursiva" },
  { nombre: "Lobster", archivo: "/fuentes-llavero/lobster.woff", estilo: "Cursiva" },
  { nombre: "Dancing Script", archivo: "/fuentes-llavero/dancing-script.woff", estilo: "Cursiva fina" },
  { nombre: "Kaushan Script", archivo: "/fuentes-llavero/kaushan-script.woff", estilo: "Pincel" },
  { nombre: "Permanent Marker", archivo: "/fuentes-llavero/permanent-marker.woff", estilo: "Marcador" },
] as const;

/* Alto de las mayúsculas en mm (la pieza termina ~5 mm más alta por el borde). */
export const TAMANOS_LLAVERO = [
  { nombre: "Chico", alto: 8 },
  { nombre: "Mediano", alto: 11 },
  { nombre: "Grande", alto: 14 },
] as const;

/*
 * Cuánto sobresale el borde alrededor de las letras, en mm (una barrita).
 * Los pedidos viejos traen un nombre (Fino, Normal...): se pasa a mm.
 */
export const BORDES_LLAVERO = [
  { nombre: "Fino", mm: 1.6 },
  { nombre: "Normal", mm: 2.3 },
  { nombre: "Grueso", mm: 3.1 },
  { nombre: "Extra", mm: 4 },
] as const;
export const BORDE_MIN = 0.5;
export const BORDE_MAX = 6;
export const BORDE_PASO = 0.1;
export const BORDE_NORMAL = 2.3;

export function limpiarBorde(valor: unknown) {
  const nombrado = BORDES_LLAVERO.find((borde) => borde.nombre === valor);
  if (nombrado) return nombrado.mm;
  const numero = Number(String(valor ?? "").replace(",", "."));
  if (valor === undefined || valor === null || valor === "" || !Number.isFinite(numero)) return BORDE_NORMAL;
  const redondeado = Math.round(numero * 10) / 10;
  return Math.min(BORDE_MAX, Math.max(BORDE_MIN, redondeado));
}

/* Qué hay detrás de las letras. */
export const FONDOS_LLAVERO = [
  { nombre: "Contorno", detalle: "Sigue la forma de las letras" },
  { nombre: "Placa", detalle: "Un rectángulo lleno" },
  { nombre: "Solo letras", detalle: "Sin fondo, de un solo color" },
] as const;

/* Separación extra entre letras, en mm (negativa = más pegadas). */
export const SEPARACION_MIN = -1.5;
export const SEPARACION_MAX = 4;
export const SEPARACION_PASO = 0.5;

export function limpiarSeparacion(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const redondeado = Math.round(numero / SEPARACION_PASO) * SEPARACION_PASO;
  return Math.min(SEPARACION_MAX, Math.max(SEPARACION_MIN, redondeado));
}

/*
 * Espacio extra entre los dos renglones, en mm (negativo = más pegados).
 * 0 = renglones juntitos (1,1 veces el alto de la letra). Los pedidos viejos
 * lo traen como "Renglones" (medido desde 1,6 veces): se convierte al leer.
 */
export const RENGLONES_MIN = -12;
export const RENGLONES_MAX = 8;
export const INTERLINEADO = 1.1;

export function limpiarRenglones(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const redondeado = Math.round(numero * 2) / 2;
  return Math.min(RENGLONES_MAX, Math.max(RENGLONES_MIN, redondeado));
}

export const MAX_LETRAS_LLAVERO = 12;

/* Sin "|" ni ":" (separan los campos del comentario). */
export const TEXTO_LLAVERO_VALIDO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'!?&-]+$/;

export type PersonalizacionLlavero = {
  texto: string;
  texto2?: string; // segunda línea, opcional
  fuente: string;
  tamano: string;
  borde?: string | number; // mm (o un nombre viejo: "Normal"...)
  fondo?: string; // "Contorno" si no viene
  separacion?: number; // mm extra entre letras (0 si no viene)
  renglones?: number; // mm extra entre los dos renglones (0 = juntitos)
  esquinas?: number; // placa: radio de las esquinas en mm (0 = en punta; sin dato = automático)
};

/* Placa: radio de las esquinas. */
export const ESQUINAS_MAX = 6;
export function limpiarEsquinas(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const numero = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(numero)) return undefined;
  return Math.min(ESQUINAS_MAX, Math.max(0, Math.round(numero * 2) / 2));
}

export function limpiarTextoLlavero(texto: string) {
  return texto.replace(/\s+/g, " ").trimStart().slice(0, MAX_LETRAS_LLAVERO);
}

/* "" si está bien; si no, qué corregir. La segunda línea puede ir vacía. */
export function errorTextoLlavero(texto: string, opcional = false) {
  const limpio = texto.trim();
  if (!limpio) return opcional ? "" : "Escribí el nombre.";
  if (limpio.length > MAX_LETRAS_LLAVERO) return `Hasta ${MAX_LETRAS_LLAVERO} letras.`;
  if (!TEXTO_LLAVERO_VALIDO.test(limpio)) {
    return "Usá letras, números, espacios y . ' ! ? & -";
  }
  return "";
}

export function bordeMm(borde?: string | number) {
  return limpiarBorde(borde);
}

export function formatearPersonalizacion(personalizacion: PersonalizacionLlavero) {
  return [
    `Texto: ${personalizacion.texto.trim()}`,
    personalizacion.texto2?.trim() ? `Texto 2: ${personalizacion.texto2.trim()}` : "",
    `Fuente: ${personalizacion.fuente}`,
    `Tamaño: ${personalizacion.tamano}`,
    `Borde: ${limpiarBorde(personalizacion.borde)}`,
    `Fondo: ${personalizacion.fondo || "Contorno"}`,
    `Separación: ${limpiarSeparacion(personalizacion.separacion)}`,
    personalizacion.texto2?.trim() ? `Entre renglones: ${limpiarRenglones(personalizacion.renglones)}` : "",
    personalizacion.fondo === "Placa" && limpiarEsquinas(personalizacion.esquinas) !== undefined
      ? `Esquinas: ${limpiarEsquinas(personalizacion.esquinas)}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

/* Lee el comentario de una línea; null si no es un llavero personalizado. */
export function leerPersonalizacion(comentario: string): PersonalizacionLlavero | null {
  const campos: Record<string, string> = {};
  for (const parte of String(comentario || "").split("|")) {
    const indice = parte.indexOf(":");
    if (indice < 0) continue;
    campos[parte.slice(0, indice).trim().toLocaleLowerCase("es")] = parte.slice(indice + 1).trim();
  }

  const texto = campos["texto"] || "";
  const fuente = FUENTES_LLAVERO.find((opcion) => opcion.nombre === campos["fuente"])?.nombre;
  const tamano = TAMANOS_LLAVERO.find((opcion) => opcion.nombre === campos["tamaño"])?.nombre;
  if (!texto || !fuente || !tamano) return null;

  const borde = limpiarBorde(campos["borde"]);
  const fondo = FONDOS_LLAVERO.find((opcion) => opcion.nombre === campos["fondo"])?.nombre ?? "Contorno";
  const separacion = limpiarSeparacion(campos["separación"] ?? 0);
  // Pedidos viejos: "Renglones" medía desde 1,6 veces el alto de la letra.
  const altoLetra = TAMANOS_LLAVERO.find((opcion) => opcion.nombre === tamano)?.alto ?? 11;
  const renglones =
    campos["entre renglones"] !== undefined
      ? limpiarRenglones(campos["entre renglones"])
      : limpiarRenglones(Number(campos["renglones"] ?? 0) + altoLetra * (1.6 - INTERLINEADO));
  const esquinas = limpiarEsquinas(campos["esquinas"]);
  return { texto, texto2: campos["texto 2"] || "", fuente, tamano, borde, fondo, separacion, renglones, esquinas };
}

/* "“Antonio / Arquitecto”" para mostrar. */
export function textoVisible(personalizacion: PersonalizacionLlavero) {
  return [personalizacion.texto, personalizacion.texto2].filter((linea) => linea?.trim()).join(" / ");
}

/* ------------------------------------------------------------------ */
/* Chapita para mascota: nombre adelante, teléfono grabado atrás.      */
/* Comentario: "Tipo: Mascota | Texto: Koni | Teléfono: 099 123 456 |  */
/*   Forma: Hueso | Huella: Sí | Fuente: Rubik | Tamaño: Mediano"      */
/* ------------------------------------------------------------------ */

export const FORMAS_CHAPITA = [
  { nombre: "Hueso", detalle: "El clásico" },
  { nombre: "Círculo", detalle: "Redonda con argolla" },
  { nombre: "Corazón", detalle: "Para los mimosos" },
] as const;

export const MAX_LETRAS_MASCOTA = 10;
export const TELEFONO_VALIDO = /^[0-9+() -]{6,18}$/;

export function errorTelefonoMascota(telefono: string) {
  const limpio = telefono.trim();
  if (!limpio) return "Poné un teléfono para que te puedan avisar.";
  if (!TELEFONO_VALIDO.test(limpio) || limpio.replace(/\D/g, "").length < 6) {
    return "Solo números, espacios y + ( ) -";
  }
  return "";
}

export type PersonalizacionMascota = {
  tipo: "Mascota";
  texto: string;
  telefono: string;
  forma: string;
  huella: boolean; // = hay adorno (pedidos viejos: solo la huellita)
  adorno?: string; // ADORNOS_CHAPITA ("Ninguno" = sin adorno)
  atras?: "Grabado" | "Color"; // teléfono hueco o relleno de otro color
  relieve?: boolean; // borde y nombre sobresalen (si no, todo al ras)
  escalaNombre?: number; // % del tamaño del nombre (100 = normal)
  fuente: string;
  tamano: string;
};

export const ADORNOS_CHAPITA = [
  { nombre: "Huellita", emoji: "🐾" },
  { nombre: "Corazón", emoji: "❤️" },
  { nombre: "Estrella", emoji: "⭐" },
  { nombre: "Hueso", emoji: "🦴" },
  { nombre: "Corona", emoji: "👑" },
  { nombre: "Ninguno", emoji: "—" },
] as const;

export const ESCALA_NOMBRE_MIN = 60;
export const ESCALA_NOMBRE_MAX = 130;
export function limpiarEscalaNombre(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || valor === "" || valor === undefined || valor === null) return 100;
  return Math.min(ESCALA_NOMBRE_MAX, Math.max(ESCALA_NOMBRE_MIN, Math.round(numero / 5) * 5));
}

/* Adorno elegido (los pedidos viejos solo tienen "Huella: Sí/No"). */
export function adornoDe(datos: Pick<PersonalizacionMascota, "huella" | "adorno">) {
  if (datos.adorno && ADORNOS_CHAPITA.some((opcion) => opcion.nombre === datos.adorno)) return datos.adorno;
  return datos.huella ? "Huellita" : "Ninguno";
}

export function formatearMascota(datos: Omit<PersonalizacionMascota, "tipo">) {
  return [
    "Tipo: Mascota",
    `Texto: ${datos.texto.trim()}`,
    `Teléfono: ${datos.telefono.trim()}`,
    `Forma: ${datos.forma}`,
    `Huella: ${adornoDe(datos) !== "Ninguno" ? "Sí" : "No"}`,
    `Adorno: ${adornoDe(datos)}`,
    `Atrás: ${datos.atras === "Color" ? "Color" : "Grabado"}`,
    `Relieve: ${datos.relieve ? "Sí" : "No"}`,
    `Nombre: ${limpiarEscalaNombre(datos.escalaNombre)}`,
    `Fuente: ${datos.fuente}`,
    `Tamaño: ${datos.tamano}`,
  ].join(" | ");
}

export function leerMascota(comentario: string): PersonalizacionMascota | null {
  const campos: Record<string, string> = {};
  for (const parte of String(comentario || "").split("|")) {
    const indice = parte.indexOf(":");
    if (indice < 0) continue;
    campos[parte.slice(0, indice).trim().toLocaleLowerCase("es")] = parte.slice(indice + 1).trim();
  }
  if (campos["tipo"] !== "Mascota") return null;

  const texto = campos["texto"] || "";
  const telefono = campos["teléfono"] || "";
  const forma = FORMAS_CHAPITA.find((opcion) => opcion.nombre === campos["forma"])?.nombre;
  const fuente = FUENTES_LLAVERO.find((opcion) => opcion.nombre === campos["fuente"])?.nombre;
  const tamano = TAMANOS_LLAVERO.find((opcion) => opcion.nombre === campos["tamaño"])?.nombre;
  if (!texto || !forma || !fuente || !tamano) return null;
  return {
    tipo: "Mascota",
    texto,
    telefono,
    forma,
    huella: campos["huella"] !== "No",
    adorno: adornoDe({ huella: campos["huella"] !== "No", adorno: campos["adorno"] }),
    atras: campos["atrás"] === "Color" ? "Color" : "Grabado",
    relieve: campos["relieve"] === "Sí",
    escalaNombre: limpiarEscalaNombre(campos["nombre"]),
    fuente,
    tamano,
  };
}

/*
 * Colores de cada parte, desde la lista de colores de la línea.
 *   Llavero: [base, letras, anillo]    (pedidos viejos: [base, letras])
 *   Chapita: [chapita, borde y nombre, anillo, teléfono?]
 *            (pedidos viejos: [chapita, nombre] o [chapita, nombre, teléfono])
 * Sin anillo elegido, el anillo va del color de la base (o de las letras, en "Solo letras").
 */
export function coloresPieza(personalizacion: PersonalizacionLlavero | PersonalizacionMascota, colores: string[]) {
  const [base = "", letras = ""] = colores;
  if ("tipo" in personalizacion && personalizacion.tipo === "Mascota") {
    const conTelefono = personalizacion.atras === "Color";
    const viejo = conTelefono ? colores.length < 4 : colores.length < 3;
    return {
      base,
      letras,
      anillo: viejo ? base : colores[2] || base,
      telefono: conTelefono ? (viejo ? colores[2] : colores[3]) || "" : "",
    };
  }
  const soloLetras = (personalizacion as PersonalizacionLlavero).fondo === "Solo letras";
  return {
    base: soloLetras ? letras : base,
    letras,
    anillo: colores[2] || (soloLetras ? letras : base),
    telefono: "",
  };
}
