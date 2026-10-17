/*
 * Llamadas del panel (navegador) a /api/admin/accion, tipadas con
 * el contrato de lib/admin-tipos.ts.
 *
 * Para que el panel se sienta rápido (Apps Script tarda 2-6 s por
 * llamada), las LECTURAS pasan por una caché en el navegador:
 *
 * - Se muestra al instante lo último conocido (memoria + sessionStorage)
 *   y se vuelve a pedir en segundo plano ("Actualizando…").
 * - Dos pantallas que piden lo mismo a la vez comparten la llamada.
 * - Cualquier ESCRITURA deja vieja toda la caché: la próxima vez que
 *   se abre una pantalla se vuelve a pedir.
 * - Al cerrar sesión (o si la sesión vence) se borra todo.
 *
 * También lleva la cuenta de llamadas en curso para la barra de
 * progreso del panel (useActividadAdmin).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AccionesAdmin, TipoAccionAdmin } from "@/lib/admin-tipos";

type Pedido<T extends TipoAccionAdmin> = AccionesAdmin[T]["pedido"];
type Respuesta<T extends TipoAccionAdmin> = AccionesAdmin[T]["respuesta"];

/* ------------------------------------------------------------------ */
/* Lecturas y escrituras                                               */
/* ------------------------------------------------------------------ */

/* Acciones que solo leen. Todo lo demás cuenta como escritura. */
const LECTURAS = new Set<string>([
  "admin_resumen",
  "admin_pedidos_listar",
  "admin_pedido_detalle",
  "admin_tienda_listar",
  "admin_productos_listar",
  "admin_config_listar",
  "admin_dias_listar",
  "admin_resenas_listar",
  "admin_clientes_buscar",
  "admin_presupuesto_opciones",
  "admin_cliente_historial",
  "admin_puntos_historial",
  "admin_premios_listar",
  "admin_todos_listar",
  "admin_caja_listar",
  "admin_calc_listar",
]);

export function esLecturaAdmin(tipo: string) {
  return LECTURAS.has(tipo) || /_(listar|detalle|buscar)$/.test(tipo);
}

/* Lo que se precarga al entrar al panel (mismos datos que piden las páginas). */
const PRECARGAS: { tipo: TipoAccionAdmin; datos: object }[] = [
  { tipo: "admin_resumen", datos: {} },
  { tipo: "admin_pedidos_listar", datos: {} },
  { tipo: "admin_tienda_listar", datos: {} },
  { tipo: "admin_dias_listar", datos: {} },
];

/* Menos de esto: se usa la caché sin volver a pedir. */
const FRESCO_MS = 30_000;
/* Más de esto: ni se muestra. */
const MAXIMO_MS = 12 * 60 * 60 * 1000;
const MAXIMO_ENTRADAS = 60;
const CLAVE_SESION = "kint_admin_cache_v1";

/* ------------------------------------------------------------------ */
/* Estado compartido (caché + llamadas en curso)                       */
/* ------------------------------------------------------------------ */

type Entrada = {
  respuesta: unknown;
  en: number; // cuándo se trajo del servidor
  vencido: boolean; // hubo una escritura después
};

type EnVuelo = {
  promesa: Promise<unknown>;
  forzado: boolean;
  visible: boolean; // la espera una pantalla (no es solo precarga)
  conDatos: boolean; // ya había algo para mostrar
};

let entradas: Map<string, Entrada> | null = null;
const enVuelo = new Map<string, EnVuelo>();
const oyentes = new Set<() => void>();
let escriturasEnCurso = 0;
/* Sube con cada escritura: una lectura que empezó antes no pisa datos nuevos. */
let generacion = 0;

export type ActividadAdmin = {
  enCurso: number; // llamadas que espera una pantalla o una escritura
  actualizando: boolean; // se está refrescando algo que ya se ve
};

const SIN_ACTIVIDAD: ActividadAdmin = { enCurso: 0, actualizando: false };
let actividad = SIN_ACTIVIDAD;

function avisar() {
  let visibles = 0;
  let actualizando = false;
  enVuelo.forEach((item) => {
    if (!item.visible) return;
    visibles += 1;
    if (item.conDatos) actualizando = true;
  });
  const enCurso = visibles + escriturasEnCurso;
  if (enCurso !== actividad.enCurso || actualizando !== actividad.actualizando) {
    actividad = { enCurso, actualizando };
  }
  oyentes.forEach((oyente) => oyente());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function memoria() {
  if (entradas) return entradas;
  entradas = new Map();
  if (typeof window === "undefined") return entradas;

  try {
    const guardado = JSON.parse(
      window.sessionStorage.getItem(CLAVE_SESION) || "null"
    ) as [string, Entrada][] | null;
    const ahora = Date.now();
    for (const [llave, entrada] of guardado || []) {
      if (entrada && ahora - entrada.en < MAXIMO_MS) {
        entradas.set(llave, entrada);
      }
    }
  } catch {
    // Caché ilegible: se arranca de cero.
  }
  return entradas;
}

let temporizadorGuardado: number | undefined;

function persistir() {
  if (typeof window === "undefined") return;
  window.clearTimeout(temporizadorGuardado);
  temporizadorGuardado = window.setTimeout(() => {
    try {
      const lista = [...memoria().entries()]
        .sort((a, b) => b[1].en - a[1].en)
        .slice(0, MAXIMO_ENTRADAS);
      window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(lista));
    } catch {
      // Sin lugar o sin permiso: queda solo en memoria.
      try {
        window.sessionStorage.removeItem(CLAVE_SESION);
      } catch {
        // nada
      }
    }
  }, 400);
}

function llaveCache(tipo: string, datos: object) {
  const limpio: Record<string, unknown> = {};
  const valores = datos as Record<string, unknown>;
  for (const clave of Object.keys(valores).sort()) {
    const valor = valores[clave];
    // false y "" piden lo mismo que no mandar nada.
    if (valor === undefined || valor === null || valor === false || valor === "") {
      continue;
    }
    limpio[clave] = valor;
  }
  return `${tipo}:${JSON.stringify(limpio)}`;
}

function leerEntrada(llave: string) {
  return memoria().get(llave);
}

function estaFresca(entrada: Entrada) {
  return !entrada.vencido && Date.now() - entrada.en < FRESCO_MS;
}

function guardarRespuesta(llave: string, respuesta: unknown, generacionInicio: number) {
  const actual = leerEntrada(llave);
  if (generacionInicio !== generacion && actual) {
    // Hubo una escritura mientras se leía: lo que llegó puede ser viejo.
    return;
  }
  memoria().set(llave, {
    respuesta,
    en: Date.now(),
    vencido: generacionInicio !== generacion,
  });
  persistir();
}

/* Toda la caché queda vieja (se sigue mostrando, pero se vuelve a pedir). */
function vencerTodo() {
  generacion += 1;
  memoria().forEach((entrada, llave) => {
    if (!entrada.vencido) memoria().set(llave, { ...entrada, vencido: true });
  });
  persistir();
}

/* Al cerrar sesión. */
export function limpiarCacheAdmin() {
  generacion += 1;
  memoria().clear();
  enVuelo.clear();
  if (typeof window !== "undefined") {
    window.clearTimeout(temporizadorGuardado);
    try {
      window.sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      // nada
    }
  }
  avisar();
}

/* ------------------------------------------------------------------ */
/* Llamada al servidor                                                 */
/* ------------------------------------------------------------------ */

async function pedir(tipo: string, cuerpo: object): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch("/api/admin/accion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cuerpo, tipo }),
      cache: "no-store",
    });
  } catch {
    throw new Error("Sin conexión. Revisá internet e intentá de nuevo.");
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || data?.sesion === false) {
    limpiarCacheAdmin();
    const volver = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/admin/login?volver=${volver}`;
    throw new Error("Tu sesión venció. Volvé a entrar.");
  }

  if (!data?.ok) {
    throw new Error(
      String(data?.error || "No se pudo completar la acción.")
    );
  }

  return data;
}

/*
 * Lectura compartida: si ya hay una igual en camino, se reusa.
 * forzar = el dueño tocó actualizar (Apps Script tampoco usa su caché).
 */
function leerCompartido(
  tipo: string,
  datos: object,
  llave: string,
  opciones: { forzar: boolean; visible: boolean }
): Promise<unknown> {
  const existente = enVuelo.get(llave);

  if (existente && (existente.forzado || !opciones.forzar)) {
    if (opciones.visible && !existente.visible) {
      existente.visible = true;
      avisar();
    }
    return existente.promesa;
  }

  const generacionInicio = generacion;
  const promesa = pedir(
    tipo,
    opciones.forzar ? { ...datos, sinCache: true } : datos
  )
    .then((respuesta) => {
      guardarRespuesta(llave, respuesta, generacionInicio);
      return respuesta;
    })
    .finally(() => {
      if (enVuelo.get(llave)?.promesa === promesa) enVuelo.delete(llave);
      avisar();
    });

  enVuelo.set(llave, {
    promesa,
    forzado: opciones.forzar,
    visible: opciones.visible,
    conDatos: Boolean(leerEntrada(llave)),
  });
  avisar();
  return promesa;
}

export async function accionAdmin<T extends TipoAccionAdmin>(
  tipo: T,
  datos: Pedido<T>
): Promise<Respuesta<T>> {
  if (esLecturaAdmin(tipo)) {
    return (await leerCompartido(tipo, datos, llaveCache(tipo, datos), {
      forzar: false,
      visible: true,
    })) as Respuesta<T>;
  }

  escriturasEnCurso += 1;
  vencerTodo();
  avisar();

  try {
    return (await pedir(tipo, datos)) as Respuesta<T>;
  } finally {
    escriturasEnCurso -= 1;
    // Otra vez: lo que se leyó durante la escritura también es viejo.
    vencerTodo();
    avisar();
  }
}

/* Al entrar al panel: trae en segundo plano lo de las secciones principales. */
export function precargarAdmin() {
  for (const { tipo, datos } of PRECARGAS) {
    const llave = llaveCache(tipo, datos);
    const entrada = leerEntrada(llave);
    if ((entrada && estaFresca(entrada)) || enVuelo.has(llave)) continue;
    leerCompartido(tipo, datos, llave, { forzar: false, visible: false }).catch(
      () => null
    );
  }
}

/* Para la barra de progreso y el aviso "Actualizando…". */
export function useActividadAdmin() {
  return useSyncExternalStore(
    suscribir,
    () => actividad,
    () => SIN_ACTIVIDAD
  );
}

/* ------------------------------------------------------------------ */
/* Hook de las pantallas                                               */
/* ------------------------------------------------------------------ */

/*
 * Carga datos al montar y permite recargar.
 * `clave` cambia cuando cambian los datos pedidos (ej. el número de pedido):
 * en ese caso se deja de mostrar lo anterior.
 *
 * Muestra al instante lo que haya en caché y lo refresca en segundo plano
 * (recargando = true mientras tanto).
 */
export function useDatosAdmin<T extends TipoAccionAdmin>(
  tipo: T,
  datos: Pedido<T>,
  clave = ""
) {
  const llave = llaveCache(tipo, datos);

  /* Qué datos se están mostrando (puede ir un paso atrás de `llave`
     mientras se busca, ej. al escribir en el buscador de clientes). */
  const [vista, setVista] = useState({ clave, llave });
  let llaveVista = vista.llave;
  if (vista.clave !== clave) {
    llaveVista = llave;
    setVista({ clave, llave });
  }

  const resultado = useSyncExternalStore(
    suscribir,
    () => (leerEntrada(llaveVista)?.respuesta ?? null) as Respuesta<T> | null,
    () => null
  );
  const buscando = useSyncExternalStore(
    suscribir,
    () => enVuelo.get(llave)?.visible === true,
    () => false
  );

  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const versionHecha = useRef(0);

  useEffect(() => {
    let activo = true;
    const forzar = version !== versionHecha.current;
    versionHecha.current = version;

    const entrada = leerEntrada(llave);
    if (!forzar && entrada && estaFresca(entrada) && vista.llave === llave) {
      return;
    }

    leerCompartido(tipo, datos, llave, { forzar, visible: true })
      .then(() => {
        if (!activo) return;
        setError("");
        setVista((actual) =>
          actual.llave === llave ? actual : { ...actual, llave }
        );
      })
      .catch((errorCarga: unknown) => {
        if (!activo) return;
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se pudo cargar."
        );
      });

    return () => {
      activo = false;
    };
    // datos se representa con `llave` para no recargar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, llave, version, vista.llave]);

  const recargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  /* Cambios locales (ej. después de guardar): también quedan en la caché. */
  const setDatos: Dispatch<SetStateAction<Respuesta<T> | null>> = useCallback(
    (valor) => {
      const actual = (leerEntrada(llaveVista)?.respuesta ?? null) as Respuesta<T> | null;
      const nuevo =
        typeof valor === "function"
          ? (valor as (previo: Respuesta<T> | null) => Respuesta<T> | null)(actual)
          : valor;

      if (nuevo === null) {
        memoria().delete(llaveVista);
      } else {
        const anterior = leerEntrada(llaveVista);
        memoria().set(llaveVista, {
          respuesta: nuevo,
          en: anterior?.en ?? Date.now(),
          vencido: anterior?.vencido ?? true,
        });
      }
      persistir();
      avisar();
    },
    [llaveVista]
  );

  return {
    datos: resultado,
    setDatos,
    error,
    /* Sin nada para mostrar: primera carga (o reintento después de un error). */
    cargando: !resultado && (buscando || !error),
    /* Hay datos a la vista y se están refrescando. */
    recargando: buscando && Boolean(resultado),
    recargar,
  };
}
