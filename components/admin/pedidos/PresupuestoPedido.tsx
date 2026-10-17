"use client";

/*
 * Sección "Presupuesto" del detalle de un pedido de maqueta.
 *
 * Carga, edita y borra las opciones de la hoja Presupuestos
 * (admin_presupuesto_*), y ofrece "Enviar presupuesto al cliente",
 * que es el mismo cambio de estado a Presupuestado del panel.
 */

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  Clock,
  Flame,
  Info,
  Pencil,
  Plus,
  Send,
  Trash2,
  Weight,
} from "lucide-react";
import { accionAdmin } from "@/lib/admin-cliente";
import type {
  OpcionPresupuesto,
  OpcionPresupuestoEntrada,
  PedidoDetalle,
} from "@/lib/admin-tipos";
import {
  Boton,
  Campo,
  Chip,
  DialogoConfirmar,
  Hoja,
  Tarjeta,
  claseInput,
  pesos,
  useAvisos,
} from "@/components/admin/ui";
import { estaCancelado } from "@/components/admin/pedidos/utilidades";
import Calculadora from "@/components/admin/calculadora/Calculadora";

const OPCIONES_RAPIDAS = ["Recomendada", "Premium", "Barata"];
const ESTADOS_LIBRES = ["Recibido", "Presupuestado"];

type FilaPresupuesto = OpcionPresupuesto & { index: number; vacia: boolean };

type Formulario = {
  index: number | null; // null = opción nueva
  original: OpcionPresupuesto | null;
  opcion: string;
  descripcion: string;
  tiempo: string;
  filamento: string;
  precio: string;
};

type Errores = Partial<Record<"opcion" | "filamento" | "precio", string>>;

/* Fila sin nada cargado (la que crea la hoja cuando entra el pedido). */
function esVacia(opcion: OpcionPresupuesto) {
  return (
    !opcion.opcion.trim() &&
    !opcion.descripcion.trim() &&
    !opcion.tiempo.trim() &&
    !opcion.filamento.trim() &&
    !(opcion.precioBase > 0) &&
    !(opcion.precioTotal > 0) &&
    !opcion.seleccionado
  );
}

function filasPresupuesto(pedido: PedidoDetalle) {
  const filas: FilaPresupuesto[] = pedido.presupuestos.map((opcion, index) => ({
    ...opcion,
    index,
    vacia: esVacia(opcion),
  }));
  const cargadas = filas.filter((fila) => !fila.vacia);
  // Si todas están vacías es solo la fila que se crea al entrar el pedido.
  const vacias = cargadas.length ? filas.filter((fila) => fila.vacia) : [];
  return { cargadas, vacias };
}

/* ¿Se puede mandar el presupuesto? (lo usa también "Próximo paso"). */
export function estadoPresupuesto(pedido: PedidoDetalle) {
  const { cargadas, vacias } = filasPresupuesto(pedido);
  let motivo = "";

  if (!cargadas.length) {
    motivo = "Agregá al menos una opción con precio.";
  } else if (cargadas.some((opcion) => !opcion.opcion.trim())) {
    motivo = "Hay una opción sin nombre. Editala antes de enviar.";
  } else if (
    cargadas.some((opcion) => !(opcion.precioBase > 0 || opcion.precioTotal > 0))
  ) {
    motivo = "Hay una opción sin precio. Editala antes de enviar.";
  } else if (vacias.length) {
    motivo =
      "Hay filas vacías de este pedido en la hoja Presupuestos (le llegarían al cliente). Borralas antes de enviar.";
  }

  return { listo: !motivo, motivo, cantidad: cargadas.length };
}

/* "1.500" o "1500,50" → número (vacío = NaN). */
function numeroPesos(texto: string) {
  let limpio = texto.replace(/[$\s]/g, "");
  if (!limpio) return Number.NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) limpio = limpio.replace(/\./g, "");
  return Number(limpio.replace(",", "."));
}

function numeroGramos(texto: string) {
  const limpio = texto.trim().replace(",", ".");
  return limpio ? Number(limpio) : Number.NaN;
}

function validar(formulario: Formulario): Errores {
  const errores: Errores = {};
  const opcion = formulario.opcion.trim();
  const precio = numeroPesos(formulario.precio);

  if (!opcion) errores.opcion = "Poné un nombre (por ejemplo, Recomendada).";
  else if (opcion.length > 60) errores.opcion = "Máximo 60 letras.";

  if (formulario.filamento.trim()) {
    const gramos = numeroGramos(formulario.filamento);
    if (!Number.isFinite(gramos) || gramos < 0 || gramos > 100000) {
      errores.filamento = "Poné solo el número de gramos (por ejemplo, 120).";
    }
  }

  if (!formulario.precio.trim()) errores.precio = "Poné el precio.";
  else if (!Number.isFinite(precio) || precio <= 0) {
    errores.precio = "El precio tiene que ser un número mayor a 0.";
  } else if (precio > 10000000) errores.precio = "Revisá el precio: es demasiado alto.";

  return errores;
}

function formularioVacio(): Formulario {
  return {
    index: null,
    original: null,
    opcion: "Recomendada",
    descripcion: "",
    tiempo: "",
    filamento: "",
    precio: "",
  };
}

function formularioDesde(fila: FilaPresupuesto): Formulario {
  return {
    index: fila.index,
    original: fila,
    opcion: fila.opcion,
    descripcion: fila.descripcion,
    tiempo: fila.tiempo,
    filamento: fila.filamento,
    precio: fila.precioBase > 0 ? String(fila.precioBase) : "",
  };
}

function MensajeError({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <span className="font-semibold text-red-600 dark:text-red-400">{texto}</span>
  );
}

function Advertencia({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-amber-500/12 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function SeccionPresupuesto({
  pedido,
  onActualizado,
  onEnviar,
}: {
  pedido: PedidoDetalle;
  onActualizado: (pedido: PedidoDetalle) => void;
  onEnviar: () => void;
}) {
  const avisar = useAvisos();
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<FilaPresupuesto | null>(null);
  const [listaHoja, setListaHoja] = useState<{
    opciones: string[];
    soloLista: boolean;
  } | null>(null);
  const [listaPedida, setListaPedida] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [ordenando, setOrdenando] = useState(false);

  const cancelado = estaCancelado(pedido.estado);
  const { cargadas, vacias } = filasPresupuesto(pedido);
  const envio = estadoPresupuesto(pedido);
  const elegida = pedido.presupuestos.find((opcion) => opcion.seleccionado);
  const avanzado = !ESTADOS_LIBRES.includes(pedido.estado);
  const requiereConfirmar = avanzado || Boolean(elegida);
  const urgente = pedido.presupuestos.find((opcion) => opcion.urgente);

  const motivoConfirmar = elegida
    ? `El cliente ya eligió «${elegida.opcion || "una opción"}». Si cambiás el presupuesto ahora, lo que ya pasó a Pagos no se actualiza solo.`
    : avanzado
    ? `El pedido ya está en «${pedido.estado}». Normalmente el presupuesto no se toca a esta altura.`
    : "";

  const opcionesRapidas = listaHoja?.opciones.length
    ? listaHoja.opciones
    : OPCIONES_RAPIDAS;

  // Mover una opción (arrastrando o con las flechas): el cliente las ve en ese orden.
  async function mover(desde: number, hasta: number) {
    if (desde === hasta || hasta < 0 || hasta >= cargadas.length || ordenando) return;
    const nuevas = [...cargadas];
    const [movida] = nuevas.splice(desde, 1);
    nuevas.splice(hasta, 0, movida);
    setOrdenando(true);
    try {
      const respuesta = await accionAdmin("admin_presupuesto_ordenar", {
        pedido: pedido.pedido,
        orden: [...nuevas.map((fila) => fila.index), ...vacias.map((fila) => fila.index)],
      });
      onActualizado(respuesta.pedido);
      avisar("Orden guardado");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo ordenar.", "error");
    } finally {
      setOrdenando(false);
    }
  }

  function cargarListaHoja() {
    if (listaPedida) return;
    setListaPedida(true);
    // Si falla (o la acción no está publicada) quedan las opciones rápidas.
    accionAdmin("admin_presupuesto_opciones", {})
      .then((respuesta) => setListaHoja(respuesta))
      .catch(() => {});
  }

  function abrir(nuevo: Formulario) {
    setFormulario(nuevo);
    setIntentado(false);
    setConfirmando(false);
    cargarListaHoja();
  }

  function cambiar(cambios: Partial<Formulario>) {
    setFormulario((actual) => (actual ? { ...actual, ...cambios } : actual));
    setConfirmando(false);
  }

  function cerrar() {
    if (guardando) return;
    setFormulario(null);
  }

  async function guardar() {
    if (!formulario) return;
    setIntentado(true);
    const errores = validar(formulario);
    if (Object.keys(errores).length) return;

    if (requiereConfirmar && !confirmando) {
      setConfirmando(true);
      return;
    }

    const opcion: OpcionPresupuestoEntrada = {
      opcion: formulario.opcion.trim(),
      descripcion: formulario.descripcion.trim(),
      tiempo: formulario.tiempo.trim(),
      filamento: formulario.filamento.trim()
        ? String(numeroGramos(formulario.filamento))
        : "",
      precioBase: Math.round(numeroPesos(formulario.precio)),
    };

    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_presupuesto_guardar", {
        pedido: pedido.pedido,
        index: formulario.index,
        opcion,
        esperado: formulario.original
          ? {
              opcion: formulario.original.opcion,
              precioBase: formulario.original.precioBase,
            }
          : undefined,
        confirmar: requiereConfirmar ? true : undefined,
      });
      onActualizado(respuesta.pedido);
      avisar(respuesta.aviso || "Presupuesto guardado");
      setFormulario(null);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!aBorrar) return;
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_presupuesto_borrar", {
        pedido: pedido.pedido,
        index: aBorrar.index,
        esperado: { opcion: aBorrar.opcion, precioBase: aBorrar.precioBase },
        confirmar: true,
      });
      onActualizado(respuesta.pedido);
      avisar(respuesta.aviso || "Opción borrada");
      setABorrar(null);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo borrar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  const errores = formulario && intentado ? validar(formulario) : {};
  const precioVista = formulario ? numeroPesos(formulario.precio) : Number.NaN;
  const totalVista =
    urgente && Number.isFinite(precioVista) && precioVista > 0
      ? Math.round(precioVista) +
        Math.round(Math.round(precioVista) * (urgente.recargo / 100))
      : 0;

  return (
    <>
      {cargadas.length === 0 ? (
        <Tarjeta className="px-4 py-4 text-sm text-[var(--text-muted)]">
          Sin opciones todavía.
        </Tarjeta>
      ) : (
        <ul className={`space-y-2.5 transition-opacity ${ordenando ? "opacity-60" : ""}`}>
          {cargadas.length > 1 && !cancelado && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Arrastrá las opciones (o usá las flechas) para elegir en qué orden las ve el cliente, en la web y en el correo.
            </p>
          )}
          {cargadas.map((fila, posicion) => (
            <li
              key={`${fila.index}-${fila.opcion}`}
              draggable={!cancelado && cargadas.length > 1}
              onDragStart={() => setArrastrando(posicion)}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={() => {
                if (arrastrando !== null) void mover(arrastrando, posicion);
                setArrastrando(null);
              }}
              onDragEnd={() => setArrastrando(null)}
              className={`flex items-center gap-1.5 ${cargadas.length > 1 && !cancelado ? "cursor-grab active:cursor-grabbing" : ""} ${
                arrastrando === posicion ? "opacity-50" : ""
              }`}
            >
              {cargadas.length > 1 && !cancelado && (
                <span className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    aria-label="Subir opción"
                    disabled={posicion === 0 || ordenando}
                    onClick={() => void mover(posicion, posicion - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)] disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar opción"
                    disabled={posicion === cargadas.length - 1 || ordenando}
                    onClick={() => void mover(posicion, posicion + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--kint-panel-soft)] disabled:opacity-25"
                  >
                    ▼
                  </button>
                </span>
              )}
              <TarjetaOpcion
                fila={fila}
                editable={!cancelado}
                onEditar={() => abrir(formularioDesde(fila))}
                onBorrar={() => setABorrar(fila)}
              />
            </li>
          ))}
        </ul>
      )}

      {vacias.length > 0 && (
        <Tarjeta className="mt-2.5 space-y-2 px-4 py-3.5">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {vacias.length === 1
              ? "Hay una fila vacía de este pedido en la hoja Presupuestos."
              : `Hay ${vacias.length} filas vacías de este pedido en la hoja Presupuestos.`}{" "}
            Si no las completás o borrás, al cliente le llegan como opciones sin precio.
          </p>
          <div className="flex flex-wrap gap-2">
            {vacias.map((fila) => (
              <span key={fila.index} className="flex gap-2">
                <Boton
                  tamano="chico"
                  icono={<Pencil size={14} />}
                  onClick={() => abrir(formularioDesde(fila))}
                  disabled={cancelado}
                >
                  Completar fila {fila.index + 1}
                </Boton>
                <Boton
                  tamano="chico"
                  variante="peligro"
                  icono={<Trash2 size={14} />}
                  onClick={() => setABorrar(fila)}
                  disabled={cancelado}
                >
                  Borrar
                </Boton>
              </span>
            ))}
          </div>
        </Tarjeta>
      )}

      {!cancelado && (
        <div className="mt-3 space-y-3">
          <Boton
            className="w-full"
            icono={<Plus size={16} />}
            onClick={() => abrir(formularioVacio())}
          >
            Agregar opción
          </Boton>

          {pedido.estado === "Recibido" && (
            <Tarjeta className="space-y-2.5 px-4 py-4">
              <Boton
                variante="principal"
                tamano="grande"
                className="w-full"
                icono={<Send size={17} />}
                disabled={!envio.listo}
                onClick={onEnviar}
              >
                Enviar presupuesto al cliente
              </Boton>
              {!envio.listo && (
                <p className="flex gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {envio.motivo}
                </p>
              )}
            </Tarjeta>
          )}

        </div>
      )}

      {/* Agregar / editar opción */}
      <Hoja
        abierta={Boolean(formulario)}
        onCerrar={cerrar}
        titulo={formulario?.index === null ? "Nueva opción" : "Editar opción"}
        pie={
          <div className="space-y-3">
            {confirmando && <Advertencia>{motivoConfirmar} ¿Guardar igual?</Advertencia>}
            <div className="grid grid-cols-2 gap-3">
              <Boton onClick={cerrar} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton
                variante="principal"
                onClick={guardar}
                cargando={guardando}
                icono={<Check size={16} />}
              >
                {confirmando ? "Sí, guardar" : "Guardar"}
              </Boton>
            </div>
          </div>
        }
      >
        {formulario && (
          <div className="space-y-4">
            {requiereConfirmar && !confirmando && <Advertencia>{motivoConfirmar}</Advertencia>}

            {/* Sin <label> alrededor: los chips son botones. */}
            <div>
              <span className="mb-1.5 block text-xs font-bold text-[var(--text-muted)]">
                Opción
              </span>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {opcionesRapidas.map((valor) => {
                  const activa =
                    formulario.opcion.trim().toLocaleLowerCase("es") ===
                    valor.toLocaleLowerCase("es");
                  return (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => cambiar({ opcion: valor })}
                      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-bold transition ${
                        activa
                          ? "border-[var(--acento)] bg-[var(--acento)] text-white"
                          : "border-[var(--kint-panel-border)] bg-[var(--kint-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      {valor}
                    </button>
                  );
                })}
              </div>
              <input
                className={claseInput}
                value={formulario.opcion}
                onChange={(evento) => cambiar({ opcion: evento.target.value })}
                maxLength={60}
                placeholder="O escribí otra"
                aria-label="Nombre de la opción"
                aria-invalid={Boolean(errores.opcion)}
              />
              {(errores.opcion || listaHoja?.soloLista) && (
                <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                  {errores.opcion ? (
                    <MensajeError texto={errores.opcion} />
                  ) : (
                    `El desplegable de la hoja solo acepta: ${listaHoja?.opciones.join(", ")}.`
                  )}
                </span>
              )}
            </div>

            <Campo etiqueta="Descripción">
              <textarea
                className={`${claseInput} resize-y leading-5`}
                value={formulario.descripcion}
                onChange={(evento) => cambiar({ descripcion: evento.target.value })}
                rows={4}
                maxLength={1500}
                placeholder="Ej.: más detalle en techos y aberturas, capa de 0,12 mm"
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Tiempo de impresión">
                <input
                  className={claseInput}
                  value={formulario.tiempo}
                  onChange={(evento) => cambiar({ tiempo: evento.target.value })}
                  maxLength={60}
                  placeholder="7 hs 45 minutos"
                />
              </Campo>
              <Campo
                etiqueta="Filamento estimado"
                ayuda={
                  errores.filamento ? <MensajeError texto={errores.filamento} /> : undefined
                }
              >
                <div className="relative">
                  <input
                    className={`${claseInput} pr-9`}
                    value={formulario.filamento}
                    onChange={(evento) => cambiar({ filamento: evento.target.value })}
                    inputMode="decimal"
                    placeholder="120"
                    aria-invalid={Boolean(errores.filamento)}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                    g
                  </span>
                </div>
              </Campo>
            </div>

            <button
              type="button"
              onClick={() => setCalculando(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--blue-main)]/50 bg-[var(--kint-selected-bg)] px-3.5 py-3 text-left transition hover:border-[var(--blue-main)]"
            >
              <Calculator size={18} className="shrink-0 text-[var(--blue-main)] dark:text-sky-300" />
              <span className="text-sm font-black">Calcular precio</span>
            </button>

            <Campo
              etiqueta="Precio base"
              ayuda={
                errores.precio ? (
                  <MensajeError texto={errores.precio} />
                ) : urgente ? (
                  totalVista > 0
                    ? `Pedido urgente: +${urgente.recargo}% → el cliente ve ${pesos(totalVista)}.`
                    : `Pedido urgente: al precio se le suma ${urgente.recargo}%.`
                ) : undefined
              }
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                  $
                </span>
                <input
                  className={`${claseInput} pl-8`}
                  value={formulario.precio}
                  onChange={(evento) => cambiar({ precio: evento.target.value })}
                  inputMode="numeric"
                  placeholder="1500"
                  aria-invalid={Boolean(errores.precio)}
                />
              </div>
            </Campo>
          </div>
        )}
      </Hoja>

      <DialogoConfirmar
        abierto={Boolean(aBorrar)}
        titulo="Borrar opción"
        peligro
        cargando={guardando}
        textoConfirmar="Borrar"
        onConfirmar={borrar}
        onCancelar={() => {
          if (!guardando) setABorrar(null);
        }}
        mensaje={
          <div className="space-y-3">
            <p>
              Se borra{" "}
              <span className="font-bold text-[var(--text-main)]">
                {aBorrar?.vacia
                  ? `la fila vacía ${aBorrar.index + 1}`
                  : `«${aBorrar?.opcion || "esta opción"}»`}
              </span>{" "}
              de la hoja Presupuestos.
            </p>
            {requiereConfirmar && <Advertencia>{motivoConfirmar}</Advertencia>}
          </div>
        }
      />
      <Hoja
        abierta={calculando}
        onCerrar={() => setCalculando(false)}
        titulo="Calcular precio"
        ancha
      >
        <Calculadora
          compacta
          extra={(calculo) => (
            <Boton
              variante="principal"
              tamano="grande"
              className="w-full"
              icono={<Check size={16} />}
              disabled={!(calculo.resultado.redondeado > 0)}
              onClick={() => {
                cambiar({
                  precio: String(calculo.resultado.redondeado),
                  ...(calculo.tiempo !== "0 min" ? { tiempo: calculo.tiempo } : {}),
                  ...(calculo.pieza.gramos > 0 ? { filamento: String(Math.round(calculo.pieza.gramos)) } : {}),
                });
                setCalculando(false);
              }}
            >
              Usar {pesos(calculo.resultado.redondeado)} en el presupuesto
            </Boton>
          )}
        />
      </Hoja>
    </>
  );
}

function TarjetaOpcion({
  fila,
  editable,
  onEditar,
  onBorrar,
}: {
  fila: FilaPresupuesto;
  editable: boolean;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const sinPrecio = !(fila.precioBase > 0 || fila.precioTotal > 0);

  return (
    <Tarjeta
      className={`min-w-0 flex-1 px-4 py-3.5 ${
        fila.seleccionado
          ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-black">
            {fila.opcion || `Opción ${fila.index + 1} (sin nombre)`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {fila.seleccionado && (
              <Chip tono="verde">
                <Check size={11} aria-hidden />
                Elegida por el cliente
              </Chip>
            )}
            {fila.urgente && (
              <Chip tono="rojo">
                <Flame size={11} aria-hidden />
                Urgente +{fila.recargo}%
              </Chip>
            )}
            {sinPrecio && <Chip tono="ambar">Sin precio</Chip>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black leading-tight">
            {pesos(fila.precioTotal || fila.precioBase)}
          </p>
          {fila.precioTotal > 0 && fila.precioTotal !== fila.precioBase && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Base {pesos(fila.precioBase)}
            </p>
          )}
        </div>
      </div>

      {fila.descripcion && (
        <p className="mt-2 whitespace-pre-line break-words text-sm text-[var(--text-muted)]">
          {fila.descripcion}
        </p>
      )}

      {(fila.tiempo || fila.filamento) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--text-muted)]">
          {fila.tiempo && (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} aria-hidden />
              {fila.tiempo}
            </span>
          )}
          {fila.filamento && (
            <span className="inline-flex items-center gap-1">
              <Weight size={13} aria-hidden />
              {fila.filamento} g de filamento
            </span>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Boton tamano="chico" icono={<Pencil size={14} />} onClick={onEditar}>
            Editar
          </Boton>
          <Boton
            tamano="chico"
            variante="peligro"
            icono={<Trash2 size={14} />}
            onClick={onBorrar}
            disabled={fila.seleccionado}
            title={fila.seleccionado ? "El cliente eligió esta opción" : undefined}
          >
            Borrar
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}
