"use client";

import {
  AlertTriangle,
  Check,
  FolderOpen,
  ImageIcon,
  Pencil,
  Plus,
  Wrench,
} from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import type { ProductoAdmin, ProductoEntrada } from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Campo,
  Chip,
  Encabezado,
  Esqueleto,
  Hoja,
  Interruptor,
  Segmentos,
  Tarjeta,
  Vacio,
  claseInput,
  pesos,
  useAvisos,
} from "@/components/admin/ui";

const SIN_DATOS = {};

type Filtro = "todos" | "activos" | "pausados";

type Formulario = {
  nombreOriginal: string;
  nombre: string;
  precio: string;
  precioMayor: string;
  precioGranMayor: string;
  foto: string;
  cadenas: string[];
  colores: string[];
  minColores: string;
  maxColores: string;
  activo: boolean;
};

type Errores = Partial<
  Record<
    "nombre" | "precio" | "precioMayor" | "precioGranMayor" | "limitesColores",
    string
  >
>;

const FORMULARIO_NUEVO: Formulario = {
  nombreOriginal: "",
  nombre: "",
  precio: "",
  precioMayor: "",
  precioGranMayor: "",
  foto: "",
  cadenas: [],
  colores: [],
  minColores: "",
  maxColores: "",
  activo: true,
};

function aFormulario(producto: ProductoAdmin): Formulario {
  return {
    nombreOriginal: producto.nombre,
    nombre: producto.nombre,
    precio: producto.precio ? String(producto.precio) : "",
    precioMayor: producto.precioMayor ? String(producto.precioMayor) : "",
    precioGranMayor: producto.precioGranMayor
      ? String(producto.precioGranMayor)
      : "",
    foto: producto.foto || "",
    cadenas: [...(producto.cadenas || [])],
    colores: [...(producto.colores || [])],
    minColores: producto.minColores ? String(producto.minColores) : "",
    maxColores: producto.maxColores ? String(producto.maxColores) : "",
    activo: producto.activo,
  };
}

function aEntrada(producto: ProductoAdmin): ProductoEntrada {
  return {
    nombre: producto.nombre,
    precio: producto.precio,
    precioMayor: producto.precioMayor,
    precioGranMayor: producto.precioGranMayor,
    foto: producto.foto,
    cadenas: producto.cadenas,
    colores: producto.colores || [],
    minColores: producto.minColores || 0,
    maxColores: producto.maxColores || 0,
    activo: producto.activo,
  };
}

/* "" → 0; acepta coma decimal. NaN si no es un número. */
function numero(texto: string) {
  const limpio = texto.trim().replace(",", ".");
  return limpio ? Number(limpio) : 0;
}

function mismoNombre(a: string, b: string) {
  return a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
}

function validar(formulario: Formulario, productos: ProductoAdmin[]) {
  const errores: Errores = {};
  const nombre = formulario.nombre.trim();
  const precio = numero(formulario.precio);
  const mayor = numero(formulario.precioMayor);
  const gran = numero(formulario.precioGranMayor);

  if (!nombre) {
    errores.nombre = "Poné un nombre.";
  } else if (
    productos.some(
      (producto) =>
        mismoNombre(producto.nombre, nombre) &&
        !mismoNombre(producto.nombre, formulario.nombreOriginal)
    )
  ) {
    errores.nombre = "Ya hay un producto con ese nombre.";
  }

  if (!Number.isFinite(precio) || precio <= 0) {
    errores.precio = "El precio tiene que ser mayor a 0.";
  }

  if (!Number.isFinite(mayor) || mayor < 0) {
    errores.precioMayor = "Revisá este precio.";
  } else if (mayor > 0 && Number.isFinite(precio) && mayor > precio) {
    errores.precioMayor = "No puede ser más caro que el precio normal.";
  }

  if (!Number.isFinite(gran) || gran < 0) {
    errores.precioGranMayor = "Revisá este precio.";
  } else if (gran > 0) {
    const tope = mayor > 0 ? mayor : precio;
    if (Number.isFinite(tope) && gran > tope) {
      errores.precioGranMayor =
        mayor > 0
          ? "No puede ser más caro que el precio por mayor."
          : "No puede ser más caro que el precio normal.";
    }
  }

  const minimo = numero(formulario.minColores);
  const maximo = numero(formulario.maxColores);

  if (
    ![minimo, maximo].every(
      (valor) => Number.isInteger(valor) && valor >= 0 && valor <= 20
    )
  ) {
    errores.limitesColores = "Usá números enteros (vacío = 1 a 2 colores).";
  } else if (minimo && maximo && minimo > maximo) {
    errores.limitesColores = "El mínimo no puede ser mayor que el máximo.";
  }

  return errores;
}

function lineaMayor(producto: ProductoAdmin) {
  const partes = [];
  if (producto.precioMayor > 0) {
    partes.push(`Por mayor ${pesos(producto.precioMayor)}`);
  }
  if (producto.precioGranMayor > 0) {
    partes.push(`Gran por mayor ${pesos(producto.precioGranMayor)}`);
  }
  return partes.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Tarjeta de producto                                                 */
/* ------------------------------------------------------------------ */

function TarjetaProducto({
  producto,
  cambiando,
  onEditar,
  onActivo,
}: {
  producto: ProductoAdmin;
  cambiando: boolean;
  onEditar: () => void;
  onActivo: (activo: boolean) => void;
}) {
  const mayor = lineaMayor(producto);

  return (
    <Tarjeta
      className={`flex flex-col overflow-hidden transition ${
        producto.activo ? "" : "opacity-75"
      }`}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black leading-tight">
            {producto.nombre}
          </h3>
          <div className="mt-1.5">
            <Chip tono={producto.activo ? "verde" : "gris"}>
              {producto.activo ? "Activo" : "Pausado"}
            </Chip>
          </div>
        </div>
        <div className="-mr-1 -mt-1 flex h-11 items-center px-1">
          <Interruptor
            activo={producto.activo}
            deshabilitado={cambiando}
            etiqueta={
              producto.activo
                ? `Pausar ${producto.nombre}`
                : `Activar ${producto.nombre}`
            }
            onCambiar={onActivo}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onEditar}
        aria-label={`Editar ${producto.nombre}`}
        className="flex flex-1 flex-col items-stretch gap-2.5 px-4 pb-4 pt-3 text-left transition hover:bg-[var(--kint-panel-soft)]"
      >
        <div>
          <p className="text-2xl font-black tabular-nums leading-none">
            {pesos(producto.precio)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {mayor || "Sin precio por mayor"}
          </p>
        </div>

        {(producto.cadenas.length > 0 || (producto.colores || []).length > 0) && (
          <div className="flex flex-wrap gap-1">
            {(producto.colores || []).map((color) => (
              <Chip key={`color-${color}`} tono="violeta">
                {color}
              </Chip>
            ))}
            {producto.cadenas.map((cadena) => (
              <Chip key={cadena} tono="azul">
                {cadena}
              </Chip>
            ))}
          </div>
        )}

        {producto.fotos > 0 ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <ImageIcon size={14} />
            {producto.fotos === 1 ? "1 foto" : `${producto.fotos} fotos`}
          </p>
        ) : (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold leading-4 text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span className="min-w-0 break-words">
              Sin fotos — subilas a Drive › Tienda - Fotos › {producto.nombre}
            </span>
          </p>
        )}

        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-bold text-[#1f3f85] dark:text-[var(--blue-soft)]">
          <Pencil size={13} />
          Editar
        </span>
      </button>
    </Tarjeta>
  );
}

/* Chips para elegir opciones (cadenas o colores) + campo para agregar otra. */
function EditorOpciones({
  titulo,
  opciones,
  elegidas,
  onCambiar,
}: {
  titulo: string;
  opciones: string[];
  elegidas: string[];
  onCambiar: (elegidas: string[]) => void;
}) {
  const [nueva, setNueva] = useState("");
  const todas = [
    ...opciones,
    ...elegidas.filter((opcion) => !opciones.includes(opcion)),
  ];

  function alternar(opcion: string) {
    onCambiar(
      elegidas.includes(opcion)
        ? elegidas.filter((actual) => actual !== opcion)
        : [...elegidas, opcion]
    );
  }

  function agregar() {
    const limpia = nueva.trim().replace(/[,;]/g, " ").replace(/\s+/g, " ");
    if (!limpia) return;
    const existente =
      todas.find((opcion) => mismoNombre(opcion, limpia)) || limpia;
    if (!elegidas.includes(existente)) onCambiar([...elegidas, existente]);
    setNueva("");
  }

  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
        {titulo}
      </legend>
      {todas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {todas.map((opcion) => {
            const elegida = elegidas.includes(opcion);
            return (
              <button
                key={opcion}
                type="button"
                onClick={() => alternar(opcion)}
                aria-pressed={elegida}
                className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition ${
                  elegida
                    ? "border-[#1f3f85] bg-[#1f3f85] text-white"
                    : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                {elegida && <Check size={12} strokeWidth={3} />}
                {opcion}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={claseInput}
          value={nueva}
          onChange={(evento) => setNueva(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
          placeholder="Agregar otra"
          aria-label={`Agregar ${titulo.toLowerCase()}`}
          maxLength={40}
          enterKeyHint="done"
        />
        <Boton
          onClick={agregar}
          disabled={!nueva.trim()}
          icono={<Plus size={16} />}
          aria-label={`Agregar ${titulo.toLowerCase()}`}
          className="w-11 shrink-0 px-0"
        />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function ProductosAdmin() {
  const avisar = useAvisos();
  const { datos, setDatos, error, cargando, recargar } = useDatosAdmin(
    "admin_productos_listar",
    SIN_DATOS
  );
  const productos = datos?.productos || [];
  const cadenasOpciones = datos?.cadenasOpciones || [];
  const coloresOpciones = datos?.coloresOpciones || [];
  const hayColores = Boolean(datos?.hayColores);
  const hayLimitesColores = Boolean(datos?.hayLimitesColores);

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cambiando, setCambiando] = useState<string[]>([]);
  const pendientes = useRef(new Map<string, boolean>());
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const activos = productos.filter((producto) => producto.activo).length;
  const visibles = productos.filter((producto) =>
    filtro === "activos"
      ? producto.activo
      : filtro === "pausados"
      ? !producto.activo
      : true
  );

  /* Reemplaza un producto en la lista sin tocar el resto. */
  function cambiarEnLista(nombre: string, cambio: Partial<ProductoAdmin>) {
    setDatos((actual) =>
      actual
        ? {
            ...actual,
            productos: actual.productos.map((producto) =>
              producto.nombre === nombre ? { ...producto, ...cambio } : producto
            ),
          }
        : actual
    );
  }

  async function alternarActivo(producto: ProductoAdmin, activo: boolean) {
    setCambiando((actual) => [...actual, producto.nombre]);
    pendientes.current.set(producto.nombre, activo);
    cambiarEnLista(producto.nombre, { activo });

    try {
      const respuesta = await accionAdmin("admin_producto_guardar", {
        nombreOriginal: producto.nombre,
        producto: { ...aEntrada(producto), activo },
      });
      pendientes.current.delete(producto.nombre);
      /* Respeta otros interruptores que todavía se están guardando. */
      setDatos((actual) => ({
        productos: respuesta.productos.map((item) =>
          pendientes.current.has(item.nombre)
            ? { ...item, activo: pendientes.current.get(item.nombre)! }
            : item
        ),
        cadenasOpciones: actual?.cadenasOpciones || [],
        coloresOpciones: actual?.coloresOpciones || [],
        hayColores: Boolean(actual?.hayColores),
        hayLimitesColores: Boolean(actual?.hayLimitesColores),
      }));
      avisar(
        activo
          ? `${producto.nombre} ya se ve en la tienda.`
          : `${producto.nombre} quedó pausado.`
      );
    } catch (errorGuardar) {
      pendientes.current.delete(producto.nombre);
      cambiarEnLista(producto.nombre, { activo: producto.activo });
      avisar(
        errorGuardar instanceof Error
          ? errorGuardar.message
          : "No se pudo cambiar el producto.",
        "error"
      );
    } finally {
      setCambiando((actual) =>
        actual.filter((nombre) => nombre !== producto.nombre)
      );
    }
  }

  function abrir(producto?: ProductoAdmin) {
    setFormulario(producto ? aFormulario(producto) : { ...FORMULARIO_NUEVO });
    setIntentado(false);
  }

  const cerrar = useCallback(() => {
    if (!guardando) setFormulario(null);
  }, [guardando]);

  function cambiar(cambio: Partial<Formulario>) {
    setFormulario((actual) => (actual ? { ...actual, ...cambio } : actual));
  }

  const errores = formulario ? validar(formulario, productos) : {};
  const hayErrores = Object.keys(errores).length > 0;
  const renombrado = Boolean(
    formulario?.nombreOriginal &&
      formulario.nombre.trim() &&
      formulario.nombre.trim() !== formulario.nombreOriginal
  );

  async function guardar(evento?: FormEvent) {
    evento?.preventDefault();
    if (!formulario || guardando) return;
    setIntentado(true);
    if (hayErrores) return;

    const esNuevo = !formulario.nombreOriginal;
    const producto: ProductoEntrada = {
      nombre: formulario.nombre.trim(),
      precio: numero(formulario.precio),
      precioMayor: numero(formulario.precioMayor),
      precioGranMayor: numero(formulario.precioGranMayor),
      foto: formulario.foto.trim(),
      cadenas: formulario.cadenas,
      colores: formulario.colores,
      minColores: numero(formulario.minColores),
      maxColores: numero(formulario.maxColores),
      activo: formulario.activo,
    };

    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_producto_guardar", {
        nombreOriginal: formulario.nombreOriginal,
        producto,
      });
      setDatos((actual) => {
        const sumar = (base: string[], nuevas: string[]) => [
          ...base,
          ...nuevas.filter((opcion) => !base.includes(opcion)),
        ];
        return {
          productos: respuesta.productos,
          cadenasOpciones: sumar(actual?.cadenasOpciones || [], producto.cadenas),
          coloresOpciones: sumar(actual?.coloresOpciones || [], producto.colores),
          hayColores: Boolean(actual?.hayColores),
          hayLimitesColores: Boolean(actual?.hayLimitesColores),
        };
      });
      avisar(esNuevo ? "Producto creado." : "Cambios guardados.");
      setFormulario(null);
    } catch (errorGuardar) {
      avisar(
        errorGuardar instanceof Error
          ? errorGuardar.message
          : "No se pudo guardar el producto.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Productos"
        subtitulo={
          datos
            ? `${activos} ${activos === 1 ? "activo" : "activos"} · ${
                productos.length - activos
              } ${productos.length - activos === 1 ? "pausado" : "pausados"}`
            : "Lo que se vende en la tienda"
        }
        accion={
          <Boton
            variante="principal"
            icono={<Plus size={17} />}
            onClick={() => abrir()}
            disabled={!datos}
          >
            Nuevo
          </Boton>
        }
      />

      {cargando ? (
        <Esqueleto filas={4} />
      ) : error && !datos ? (
        <CajaError mensaje={error} onReintentar={recargar} />
      ) : !productos.length ? (
        <Vacio
          titulo="Todavía no hay productos"
          texto="Tocá Nuevo para cargar el primero."
          icono={<Wrench size={30} strokeWidth={1.5} />}
        />
      ) : (
        <>
          <Segmentos
            valor={filtro}
            onCambiar={setFiltro}
            opciones={[
              { valor: "todos", texto: "Todos", cantidad: productos.length },
              { valor: "activos", texto: "Activos", cantidad: activos },
              {
                valor: "pausados",
                texto: "Pausados",
                cantidad: productos.length - activos,
              },
            ]}
          />
          {visibles.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((producto) => (
                <TarjetaProducto
                  key={producto.nombre}
                  producto={producto}
                  cambiando={cambiando.includes(producto.nombre)}
                  onEditar={() => abrir(producto)}
                  onActivo={(activo) => alternarActivo(producto, activo)}
                />
              ))}
            </div>
          ) : (
            <Vacio
              titulo={
                filtro === "activos"
                  ? "No hay productos activos"
                  : "No hay productos pausados"
              }
            />
          )}
        </>
      )}

      <Hoja
        abierta={Boolean(formulario)}
        onCerrar={cerrar}
        titulo={formulario?.nombreOriginal ? "Editar producto" : "Nuevo producto"}
        pie={
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={cerrar} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton
              variante="principal"
              onClick={() => guardar()}
              cargando={guardando}
              disabled={intentado && hayErrores}
              icono={<Check size={16} />}
            >
              Guardar
            </Boton>
          </div>
        }
      >
        {formulario && (
          <form className="space-y-4" onSubmit={guardar} noValidate>
            <Campo
              etiqueta="Nombre"
              ayuda={
                intentado && errores.nombre ? (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {errores.nombre}
                  </span>
                ) : undefined
              }
            >
              <input
                className={claseInput}
                value={formulario.nombre}
                onChange={(evento) => cambiar({ nombre: evento.target.value })}
                placeholder="Llavero casita"
                maxLength={80}
                aria-invalid={Boolean(intentado && errores.nombre)}
                autoFocus={!formulario.nombreOriginal}
              />
            </Campo>

            {renombrado && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300">
                <FolderOpen size={15} className="mt-0.5 shrink-0" />
                <span>
                  Si le cambiás el nombre, renombrá también la carpeta de fotos
                  en Drive › Tienda - Fotos (de “{formulario.nombreOriginal}” a
                  “{formulario.nombre.trim()}”). Si no, la tienda no encuentra
                  las fotos.
                </span>
              </div>
            )}

            <Campo
              etiqueta="Precio"
              ayuda={
                intentado && errores.precio ? (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {errores.precio}
                  </span>
                ) : undefined
              }
            >
              <input
                className={claseInput}
                value={formulario.precio}
                onChange={(evento) => cambiar({ precio: evento.target.value })}
                inputMode="decimal"
                placeholder="60"
                aria-invalid={Boolean(intentado && errores.precio)}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta="Por mayor"
                ayuda={
                  intentado && errores.precioMayor ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {errores.precioMayor}
                    </span>
                  ) : undefined
                }
              >
                <input
                  className={claseInput}
                  value={formulario.precioMayor}
                  onChange={(evento) =>
                    cambiar({ precioMayor: evento.target.value })
                  }
                  inputMode="decimal"
                  placeholder="Opcional"
                  aria-invalid={Boolean(intentado && errores.precioMayor)}
                />
              </Campo>
              <Campo
                etiqueta="Gran por mayor"
                ayuda={
                  intentado && errores.precioGranMayor ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {errores.precioGranMayor}
                    </span>
                  ) : undefined
                }
              >
                <input
                  className={claseInput}
                  value={formulario.precioGranMayor}
                  onChange={(evento) =>
                    cambiar({ precioGranMayor: evento.target.value })
                  }
                  inputMode="decimal"
                  placeholder="Opcional"
                  aria-invalid={Boolean(intentado && errores.precioGranMayor)}
                />
              </Campo>
            </div>
            <p className="-mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
              Precio por unidad. Desde cuántas unidades se aplica cada uno se
              cambia en Configuración › Tienda. Vacío = no tiene ese precio.
            </p>

            {hayColores && (
              <EditorOpciones
                titulo="Colores de la foto"
                opciones={coloresOpciones}
                elegidas={formulario.colores}
                onCambiar={(colores) => cambiar({ colores })}
              />
            )}

            {hayLimitesColores && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Mín. de colores">
                    <input
                      className={claseInput}
                      value={formulario.minColores}
                      onChange={(evento) =>
                        cambiar({ minColores: evento.target.value })
                      }
                      inputMode="numeric"
                      placeholder="1"
                      aria-invalid={Boolean(intentado && errores.limitesColores)}
                    />
                  </Campo>
                  <Campo etiqueta="Máx. de colores">
                    <input
                      className={claseInput}
                      value={formulario.maxColores}
                      onChange={(evento) =>
                        cambiar({ maxColores: evento.target.value })
                      }
                      inputMode="numeric"
                      placeholder="2"
                      aria-invalid={Boolean(intentado && errores.limitesColores)}
                    />
                  </Campo>
                </div>
                <p
                  className={`mt-1.5 text-[11px] leading-4 ${
                    intentado && errores.limitesColores
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {intentado && errores.limitesColores
                    ? errores.limitesColores
                    : "Cuántos colores puede elegir el cliente si cambia los de la foto. Vacío = 1 a 2."}
                </p>
              </div>
            )}

            <EditorOpciones
              titulo="Cadenas"
              opciones={cadenasOpciones}
              elegidas={formulario.cadenas}
              onCambiar={(cadenas) => cambiar({ cadenas })}
            />


            <Campo
              etiqueta="Foto (opcional)"
              ayuda="Dejalo vacío y la tienda toma las fotos de la carpeta con el nombre del producto."
            >
              <input
                className={claseInput}
                value={formulario.foto}
                onChange={(evento) => cambiar({ foto: evento.target.value })}
                placeholder="https://drive.google.com/…"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Campo>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--kint-panel-border)] px-3.5 py-3">
              <span>
                <span className="block text-sm font-bold">
                  {formulario.activo ? "Activo" : "Pausado"}
                </span>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  {formulario.activo
                    ? "Se ve y se puede comprar en la tienda."
                    : "No aparece en la tienda."}
                </span>
              </span>
              <Interruptor
                activo={formulario.activo}
                etiqueta="Producto activo"
                onCambiar={(activo) => cambiar({ activo })}
              />
            </div>

            {/* Enter en un campo guarda. */}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        )}
      </Hoja>
    </>
  );
}
