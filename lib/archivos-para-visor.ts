/*
 * Pasa archivos de Cotizar al visor 3D (/preparador-3d) en otra pestaña,
 * sin subirlos a ningún lado: quedan un rato en el navegador (IndexedDB) y el
 * visor los abre con ?archivos=<id>. Lo viejo (más de un día) se borra solo.
 */

const BASE = "kint-visor";
const TABLA = "archivos";
const UN_DIA = 24 * 60 * 60 * 1000;

type Guardado = { id: string; fecha: number; archivos: { nombre: string; datos: ArrayBuffer }[] };

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA, { keyPath: "id" });
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

function terminar(transaccion: IDBTransaction) {
  return new Promise<void>((resolver, rechazar) => {
    transaccion.oncomplete = () => resolver();
    transaccion.onerror = () => rechazar(transaccion.error);
  });
}

export async function guardarParaVisor(archivos: File[]) {
  const id = crypto.randomUUID();
  const datos = await Promise.all(archivos.map(async (archivo) => ({ nombre: archivo.name, datos: await archivo.arrayBuffer() })));
  const base = await abrir();
  const transaccion = base.transaction(TABLA, "readwrite");
  const tabla = transaccion.objectStore(TABLA);
  tabla.put({ id, fecha: Date.now(), archivos: datos } satisfies Guardado);
  // Limpieza: lo de más de un día.
  const todos = tabla.getAll();
  todos.onsuccess = () => {
    for (const viejo of todos.result as Guardado[]) {
      if (Date.now() - viejo.fecha > UN_DIA) tabla.delete(viejo.id);
    }
  };
  await terminar(transaccion);
  base.close();
  return id;
}

export async function leerParaVisor(id: string): Promise<File[]> {
  const base = await abrir();
  const transaccion = base.transaction(TABLA, "readonly");
  const pedido = transaccion.objectStore(TABLA).get(id);
  const guardado = await new Promise<Guardado | undefined>((resolver, rechazar) => {
    pedido.onsuccess = () => resolver(pedido.result as Guardado | undefined);
    pedido.onerror = () => rechazar(pedido.error);
  });
  base.close();
  return (guardado?.archivos || []).map((archivo) => new File([archivo.datos], archivo.nombre));
}
