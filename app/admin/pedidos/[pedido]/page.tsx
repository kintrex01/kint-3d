"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  CircleDot,
  Images,
  History,
  Paperclip,
  Palette,
  Percent,
  Puzzle,
  Quote,
  Ruler,
  ShoppingBag,
  Sparkles,
  Wallet,
  Zap,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Info,
  Mail,
  MessageCircle,
  Pencil,
  ReceiptText,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { accionAdmin, useDatosAdmin } from "@/lib/admin-cliente";
import {
  ESTADOS_PEDIDO_EDITABLES,
  type EstadoPedidoEditable,
  type PedidoDetalle,
} from "@/lib/admin-tipos";
import {
  Boton,
  CajaError,
  Campo,
  Chip,
  DialogoConfirmar,
  Encabezado,
  Esqueleto,
  Hoja,
  COLOR_FASE,
  Tarjeta,
  TituloSeccion,
  faseEstado,
  claseInput,
  fechaDia,
  fechaHora,
  linkWhatsapp,
  pesos,
  textoDiasHasta,
  textoEstado,
  tonoEstado,
  useAvisos,
} from "@/components/admin/ui";
import {
  FilaDato,
  entregaVencida,
  estaCancelado,
} from "@/components/admin/pedidos/utilidades";
import {
  FotoFinal,
  Historial,
  ProgresoEstados,
} from "@/components/admin/pedidos/partes";
import { SeccionArchivos } from "@/components/admin/pedidos/ArchivosPedido";
import { colorFilamento } from "@/lib/colores-filamento";
import { Calculator, Inbox, FileText, CreditCard, BadgeCheck, Printer, PackageCheck, Truck, XCircle } from "lucide-react";
import {
  SeccionPresupuesto,
  estadoPresupuesto,
} from "@/components/admin/pedidos/PresupuestoPedido";

type Confirmacion = {
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar: string;
  exito: string;
  ejecutar: () => Promise<{ pedido: PedidoDetalle; aviso?: string }>;
};

type ProximoPaso =
  | { tipo: "estado"; estado: EstadoPedidoEditable; texto: string }
  | { tipo: "pago" }
  | { tipo: "info"; texto: string };

const claseEnlaceBoton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-4 text-sm font-bold text-[var(--text-main)] transition hover:border-[var(--kint-selected-border)] active:scale-[0.98]";

function tienePresupuestos(pedido: PedidoDetalle) {
  return pedido.presupuestos.some(
    (opcion) => opcion.precioTotal > 0 || opcion.precioBase > 0
  );
}

function saldoSinCobrar(pedido: PedidoDetalle) {
  const pago = pedido.pago;
  return Boolean(pago && pago.saldoPendiente > 0 && !pago.saldoConfirmado);
}

function proximoPaso(pedido: PedidoDetalle): ProximoPaso {
  switch (pedido.estado) {
    case "Recibido":
      return estadoPresupuesto(pedido).listo
        ? {
            tipo: "estado",
            estado: "Presupuestado",
            texto: "Enviar presupuesto al cliente",
          }
        : {
            tipo: "info",
            texto:
              "Revisá los archivos y cargá las opciones en «Presupuesto», más abajo. Después lo enviás al cliente desde ahí.",
          };
    case "Presupuestado":
      return {
        tipo: "info",
        texto: "Esperando que el cliente elija una opción y el método de pago.",
      };
    case "Método de pago seleccionado":
      return pedido.pago?.comprobante && !pedido.pago.confirmado
        ? { tipo: "pago" }
        : {
            tipo: "info",
            texto: "Esperando que el cliente suba el comprobante de pago.",
          };
    case "Pago confirmado":
      return { tipo: "estado", estado: "En impresión", texto: "Pasar a impresión" };
    case "En impresión":
      return { tipo: "estado", estado: "Terminado", texto: "Marcar como terminado" };
    case "Terminado":
      return { tipo: "estado", estado: "Entregado", texto: "Marcar como entregado" };
    case "Entregado":
      return { tipo: "info", texto: "Pedido entregado. No hay nada más para hacer." };
    default:
      return estaCancelado(pedido.estado)
        ? { tipo: "info", texto: "Pedido cancelado." }
        : { tipo: "info", texto: "Elegí el estado con “Cambiar estado”." };
  }
}

function mensajeEstado(pedido: PedidoDetalle, estado: EstadoPedidoEditable) {
  const advertencias: string[] = [];
  let efecto = "";

  switch (estado) {
    case "Presupuestado": {
      const presupuesto = estadoPresupuesto(pedido);
      efecto = `El cliente recibe un correo con ${presupuesto.cantidad} ${
        presupuesto.cantidad === 1 ? "opción" : "opciones"
      } de presupuesto para elegir, el precio y cómo pagar.`;
      if (!presupuesto.listo) advertencias.push(presupuesto.motivo);
      break;
    }
    case "En impresión":
      efecto = "El cliente recibe un correo avisando que su maqueta está en impresión.";
      break;
    case "Terminado":
      efecto = "El cliente recibe un correo avisando que su maqueta está lista, con la foto final.";
      if (!pedido.fotoFinal) {
        advertencias.push("Todavía no hay foto final: el correo va a salir sin foto.");
      }
      if (saldoSinCobrar(pedido)) {
        advertencias.push(
          `El correo incluye el saldo pendiente de ${pesos(pedido.pago?.saldoPendiente ?? 0)}.`
        );
      }
      break;
    case "Entregado":
      efecto =
        "Se registra la entrega, se acreditan los puntos Kint y el cliente recibe el correo de agradecimiento.";
      if (saldoSinCobrar(pedido)) {
        advertencias.push(
          `Ojo: el saldo de ${pesos(pedido.pago?.saldoPendiente ?? 0)} todavía no está confirmado.`
        );
      }
      break;
  }

  return (
    <div className="space-y-3">
      <p>
        <span className="font-bold text-[var(--text-main)]">{pedido.pedido}</span>{" "}
        pasa de «{textoEstado(pedido.estado)}» a «{estado}».
      </p>
      <p>
        {efecto} El correo se manda solo en la próxima revisión automática.
      </p>
      {advertencias.map((texto) => (
        <p
          key={texto}
          className="flex gap-2 rounded-xl bg-amber-500/12 px-3 py-2.5 font-semibold text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle size={16} className="mt-1 shrink-0" />
          {texto}
        </p>
      ))}
    </div>
  );
}

function decodificar(segmento: string) {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

export default function DetallePedidoAdmin({
  params,
}: {
  params: Promise<{ pedido: string }>;
}) {
  const numero = decodificar(use(params).pedido);
  const { datos, setDatos, error, cargando, recargando, recargar } =
    useDatosAdmin("admin_pedido_detalle", { pedido: numero }, numero);
  const avisar = useAvisos();

  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hojaEstado, setHojaEstado] = useState(false);
  const [hojaEntrega, setHojaEntrega] = useState(false);
  const [fechaNueva, setFechaNueva] = useState("");
  const [pidiendoCancelar, setPidiendoCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const router = useRouter();

  const pedido = datos?.pedido;

  /* Igual que elegir ❌❌❌ en la hoja: se borra todo y el número queda libre. */
  async function cancelarPedido() {
    if (!pedido) return;
    setCancelando(true);
    try {
      const respuesta = await accionAdmin("admin_pedido_cancelar", {
        pedido: pedido.pedido,
      });
      avisar(respuesta.aviso);
      router.push("/admin/pedidos");
    } catch (errorAccion) {
      avisar(
        errorAccion instanceof Error ? errorAccion.message : "No se pudo cancelar.",
        "error"
      );
      setCancelando(false);
    }
  }

  async function confirmar() {
    if (!confirmacion) return;
    setGuardando(true);
    try {
      const respuesta = await confirmacion.ejecutar();
      setDatos({ pedido: respuesta.pedido });
      avisar(respuesta.aviso || confirmacion.exito);
      setConfirmacion(null);
    } catch (errorAccion) {
      avisar(
        errorAccion instanceof Error ? errorAccion.message : "No se pudo guardar.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  function pedirEstado(estado: EstadoPedidoEditable) {
    if (!pedido) return;
    setHojaEstado(false);
    setConfirmacion({
      titulo: `Pasar a «${estado}»`,
      mensaje: mensajeEstado(pedido, estado),
      textoConfirmar: "Cambiar estado",
      exito: `Pedido en «${estado}»`,
      ejecutar: () =>
        accionAdmin("admin_pedido_estado", { pedido: pedido.pedido, estado }),
    });
  }

  function pedirConfirmarPago() {
    if (!pedido?.pago) return;
    const pago = pedido.pago;
    setConfirmacion({
      titulo: "Confirmar pago",
      mensaje: (
        <div className="space-y-3">
          <p>
            Revisá que el comprobante sea por{" "}
            <span className="font-bold text-[var(--text-main)]">
              {pesos(pago.importe)}
            </span>{" "}
            ({pago.metodo || "sin método"}
            {pago.modalidad ? `, ${pago.modalidad}` : ""}).
          </p>
          {pago.comprobante && (
            <a
              href={pago.comprobante}
              target="_blank"
              rel="noopener noreferrer"
              className={`${claseEnlaceBoton} w-full`}
            >
              <ReceiptText size={16} />
              Ver comprobante
            </a>
          )}
          <p>
            El pedido pasa a «Pago confirmado» y el cliente recibe el correo de
            confirmación en la próxima revisión automática.
          </p>
        </div>
      ),
      textoConfirmar: "Confirmar pago",
      exito: "Pago confirmado",
      ejecutar: () => accionAdmin("admin_pago_confirmar", { pedido: pedido.pedido }),
    });
  }

  function pedirConfirmarSaldo() {
    if (!pedido?.pago) return;
    setConfirmacion({
      titulo: "Confirmar saldo",
      mensaje: (
        <p>
          Confirmás que recibiste el saldo de{" "}
          <span className="font-bold text-[var(--text-main)]">
            {pesos(pedido.pago.saldoPendiente)}
          </span>{" "}
          de {pedido.pedido}. Revisá el comprobante antes de confirmar.
        </p>
      ),
      textoConfirmar: "Confirmar saldo",
      exito: "Saldo confirmado",
      ejecutar: () => accionAdmin("admin_saldo_confirmar", { pedido: pedido.pedido }),
    });
  }

  function abrirEntrega() {
    setFechaNueva(pedido?.entrega || "");
    setHojaEntrega(true);
  }

  async function guardarEntrega() {
    // fechaNueva vacía = quitar la fecha.
    if (!pedido) return;
    setGuardando(true);
    try {
      const respuesta = await accionAdmin("admin_pedido_entrega", {
        pedido: pedido.pedido,
        fecha: fechaNueva,
      });
      setDatos({ pedido: respuesta.pedido });
      avisar("Fecha de entrega actualizada");
      setHojaEntrega(false);
    } catch (errorAccion) {
      avisar(
        errorAccion instanceof Error ? errorAccion.message : "No se pudo guardar.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  const volver = (
    <Link
      href="/admin/pedidos"
      className="-ml-2 mb-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
    >
      <ArrowLeft size={17} />
      Maquetas
    </Link>
  );

  if (cargando) {
    return (
      <>
        {volver}
        <Esqueleto filas={6} />
      </>
    );
  }

  if (!pedido) {
    return (
      <>
        {volver}
        <CajaError
          mensaje={error || "No se encontró el pedido."}
          onReintentar={recargar}
        />
      </>
    );
  }

  const cancelado = estaCancelado(pedido.estado);
  const paso = proximoPaso(pedido);
  const whatsapp = linkWhatsapp(
    pedido.whatsapp || pedido.telefonoCuenta || "",
    `Hola ${pedido.nombre}, te escribo por tu pedido ${pedido.pedido} de Kint 3D`
  );
  // revisarEstados saltea los pedidos sin email.
  const avisoPendiente =
    !cancelado &&
    Boolean(pedido.email) &&
    pedido.estado !== pedido.notificado &&
    pedido.estado !== "Método de pago seleccionado";
  const vencida = entregaVencida(pedido.entrega, pedido.estado);
  const pago = pedido.pago;
  const fase = faseEstado(pedido.estado);
  const colorFase = COLOR_FASE[fase];
  const IconoFase =
    {
      nuevo: Inbox,
      presupuestado: FileText,
      esperandoPago: CreditCard,
      pagado: BadgeCheck,
      imprimiendo: Printer,
      terminado: PackageCheck,
      entregado: Truck,
      cancelado: XCircle,
    }[fase] ?? Inbox;

  return (
    <>
      {volver}

      <Encabezado
        titulo={pedido.pedido}
        subtitulo={pedido.fecha ? `Entró el ${fechaHora(pedido.fecha)}` : undefined}
        accion={
          <Boton
            variante="fantasma"
            onClick={recargar}
            cargando={recargando}
            icono={<RefreshCw size={16} />}
            aria-label="Actualizar pedido"
            className="w-11 px-0"
          />
        }
      />

      {/* Cliente: tarjeta con el color de la fase del pedido */}
      <div
        className="relative overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow-soft)]"
        style={{
          borderColor: `${colorFase}66`,
          background: `radial-gradient(120% 140% at 0% 0%, ${colorFase}38 0%, transparent 55%), radial-gradient(80% 80% at 100% 100%, ${colorFase}1f 0%, transparent 60%), var(--kint-panel)`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white shadow"
                style={{ background: colorFase }}
              >
                <IconoFase size={13} strokeWidth={2.6} />
                {textoEstado(pedido.estado)}
              </span>
              {pedido.prioritario && (
                <Chip tono="rojo">
                  <Flame size={11} aria-hidden />
                  Urgente
                </Chip>
              )}
            </div>
            <p className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{pedido.nombre || "Sin nombre"}</p>
            {pedido.email && (
              <a
                href={`mailto:${pedido.email}`}
                className="mt-0.5 block break-all text-sm font-semibold text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-main)] hover:underline"
              >
                {pedido.email}
              </a>
            )}
          </div>
          {pago && pago.precioFinal > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Precio</p>
              <p className="text-3xl font-black tabular-nums leading-none">{pesos(pago.precioFinal)}</p>
              <p
                className={`mt-1 text-[11px] font-black ${
                  pago.confirmado ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"
                }`}
              >
                {pago.saldoConfirmado ? "Cobrado entero" : pago.confirmado ? "Seña cobrada" : "Sin cobrar"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(37,211,102,0.3)] transition hover:brightness-105 active:scale-[0.98]"
            >
              <MessageCircle size={17} />
              WhatsApp
            </a>
          ) : (
            <span className={`${claseEnlaceBoton} cursor-not-allowed opacity-50`} aria-disabled="true">
              <MessageCircle size={16} />
              Sin celular
            </span>
          )}
          {pedido.email ? (
            <a href={`mailto:${pedido.email}`} className={claseEnlaceBoton}>
              <Mail size={16} />
              Correo
            </a>
          ) : (
            <span className={`${claseEnlaceBoton} cursor-not-allowed opacity-50`} aria-disabled="true">
              <Mail size={16} />
              Sin correo
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <ProgresoEstados estado={pedido.estado} />
      </div>

      {avisoPendiente && (
        <div className="mt-3 flex gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
          <BellRing size={17} className="mt-0.5 shrink-0" />
          <p>
            El cliente todavía no recibió el aviso de «{pedido.estado}». Se le
            manda en la próxima revisión automática.
          </p>
        </div>
      )}

      {/* Próximo paso */}
      {!cancelado && (
        <>
          <TituloSeccion icono={<Zap size={14} />} color={colorFase}>Próximo paso</TituloSeccion>
          <div style={{ ["--fase" as string]: colorFase }}>
          <Tarjeta
            className="space-y-3 px-4 py-4"
            color="border-[color-mix(in_srgb,var(--fase)_45%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--fase)_14%,var(--kint-panel)),var(--kint-panel))]"
          >
            {paso.tipo === "estado" && (
              <Boton
                variante="principal"
                tamano="grande"
                className="w-full"
                icono={<ArrowRight size={17} />}
                onClick={() => pedirEstado(paso.estado)}
              >
                {paso.texto}
              </Boton>
            )}
            {paso.tipo === "pago" && (
              <Boton
                variante="exito"
                tamano="grande"
                className="w-full"
                icono={<CheckCircle2 size={17} />}
                onClick={pedirConfirmarPago}
              >
                Confirmar pago
              </Boton>
            )}
            {paso.tipo === "info" && (
              <p className="flex gap-2.5 text-sm text-[var(--text-muted)]">
                <Info size={17} className="mt-0.5 shrink-0" />
                {paso.texto}
              </p>
            )}
            <Boton className="w-full" onClick={() => setHojaEstado(true)}>
              Cambiar estado
            </Boton>
          </Tarjeta>
          </div>
        </>
      )}

      {/* Datos del pedido: en cuadritos */}
      <TituloSeccion icono={<ClipboardList size={14} />} color="#38bdf8">
        Datos del pedido
      </TituloSeccion>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <CuadroDato icono={<CalendarDays size={16} />} color="#fbbf24" titulo="Entrega">
          {pedido.entrega ? (
            <span className={vencida ? "text-red-600 dark:text-red-400" : ""}>
              {fechaDia(pedido.entrega)}
              {pedido.estado !== "Entregado" && !cancelado && (
                <span className="block text-xs font-semibold text-[var(--text-muted)]">
                  {textoDiasHasta(pedido.entrega)}
                </span>
              )}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">Sin fecha</span>
          )}
          {!cancelado && (
            <button
              type="button"
              onClick={abrirEntrega}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[var(--blue-main)] hover:underline dark:text-sky-300"
            >
              <Pencil size={11} />
              Cambiar
            </button>
          )}
        </CuadroDato>
        <CuadroDato icono={<Ruler size={16} />} color="#38bdf8" titulo="Escala">
          {pedido.escala || "—"}
        </CuadroDato>
        <CuadroDato icono={<Palette size={16} />} color="#f472b6" titulo="Colores">
          {pedido.color ? (
            <span className="flex flex-wrap gap-x-2 gap-y-1">
              {pedido.color.split(/\s*,\s*/).filter(Boolean).map((color) => (
                <span key={color} className="inline-flex items-center gap-1">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/20 dark:ring-white/25"
                    style={{ background: colorFilamento(color) }}
                  />
                  {color}
                </span>
              ))}
            </span>
          ) : (
            "—"
          )}
        </CuadroDato>
        <CuadroDato icono={<Puzzle size={16} />} color="#a78bfa" titulo="Armado">
          {/^s[ií]/i.test(pedido.armado) ? "Sí, armado" : pedido.armado ? "No" : "—"}
        </CuadroDato>
        <CuadroDato icono={<CircleDot size={16} />} color="#fb923c" titulo="Boquilla">
          {pedido.boquilla || "—"}
        </CuadroDato>
        {/^s[ií]/i.test(pedido.alisado) && (
          <CuadroDato icono={<Sparkles size={16} />} color="#34d399" titulo="Alisado">
            Sí
          </CuadroDato>
        )}
        {(pedido.codigoDescuento || pedido.descuento > 0) && (
          <CuadroDato icono={<Percent size={16} />} color="#10b981" titulo="Descuento">
            {pedido.codigoDescuento && <span className="font-mono">{pedido.codigoDescuento}</span>}
            {pedido.codigoDescuento && pedido.descuento > 0 && " · "}
            {pedido.descuento > 0 && `${pedido.descuento}%`}
          </CuadroDato>
        )}
      </div>
      {pedido.comentarios && (
        <div className="mt-2.5 rounded-2xl border-l-4 border-sky-400/70 bg-[var(--kint-panel)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <Quote size={12} />
            Comentarios del cliente
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-sm">{pedido.comentarios}</p>
        </div>
      )}

      {/* Archivos y presupuesto: el orden en que trabaja el dueño. */}
      <TituloSeccion icono={<Paperclip size={14} />} color="#94a3b8">
        Archivos{pedido.archivos.length > 0 ? ` (${pedido.archivos.length})` : ""}
      </TituloSeccion>
      <SeccionArchivos archivos={pedido.archivos} />

      <TituloSeccion icono={<Calculator size={14} />} color="#8b5cf6">Presupuesto</TituloSeccion>
      <SeccionPresupuesto
        pedido={pedido}
        onActualizado={(actualizado) => setDatos({ pedido: actualizado })}
        onEnviar={() => pedirEstado("Presupuestado")}
      />

      {pedido.extras && pedido.extras.length > 0 && (
        <>
          <TituloSeccion icono={<ShoppingBag size={14} />} color="#f87171">Extras de la tienda</TituloSeccion>
          <Tarjeta className="divide-y divide-[var(--kint-panel-border)]">
            {pedido.extras.map((extra) => (
              <div
                key={`${extra.producto}-${extra.cadena}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-black">
                    {extra.cantidad} × {extra.producto}
                  </span>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {[extra.cadena && `Cadena ${extra.cadena}`, extra.colores]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-black">{pesos(extra.subtotal)}</span>
              </div>
            ))}
            <p className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
              Ya están sumados al precio del pedido. Imprimilos junto con la maqueta.
            </p>
          </Tarjeta>
        </>
      )}

      {/* Pago */}
      <TituloSeccion icono={<Wallet size={14} />} color="#10b981">Pago</TituloSeccion>
      {pago ? (
        <Tarjeta>
          <dl className="divide-y divide-[var(--kint-panel-border)]">
            <FilaDato etiqueta="Método">{pago.metodo || "Sin seleccionar"}</FilaDato>
            {pago.estado && <FilaDato etiqueta="Estado">{pago.estado}</FilaDato>}
            {pago.modalidad && (
              <FilaDato etiqueta="Modalidad">{pago.modalidad}</FilaDato>
            )}
            <FilaDato etiqueta="Importe">{pesos(pago.importe)}</FilaDato>
            {(pago.saldoPendiente > 0 || pago.comprobanteSaldo) && (
              <FilaDato etiqueta="Saldo">
                {pesos(pago.saldoPendiente)}
                {pago.saldoConfirmado && (
                  <span className="text-emerald-700 dark:text-emerald-300"> · cobrado</span>
                )}
              </FilaDato>
            )}
            <FilaDato etiqueta="Precio final">
              {pago.precioOriginal > 0 && pago.precioOriginal !== pago.precioFinal && (
                <span className="mr-1.5 text-xs font-normal text-[var(--text-muted)] line-through">
                  {pesos(pago.precioOriginal)}
                </span>
              )}
              <span className="font-black">{pesos(pago.precioFinal)}</span>
            </FilaDato>
          </dl>

          <div className="space-y-3 border-t border-[var(--kint-panel-border)] px-4 py-4">
            <EstadoComprobante
              titulo="Comprobante de pago"
              link={pago.comprobante}
              confirmado={pago.confirmado}
              accion={
                pago.comprobante && !pago.confirmado ? (
                  <Boton
                    variante="exito"
                    className="w-full"
                    icono={<CheckCircle2 size={16} />}
                    onClick={pedirConfirmarPago}
                  >
                    Confirmar pago
                  </Boton>
                ) : null
              }
            />
            {(pago.comprobanteSaldo || pago.saldoPendiente > 0) && (
              <EstadoComprobante
                titulo="Comprobante del saldo"
                link={pago.comprobanteSaldo}
                confirmado={pago.saldoConfirmado}
                accion={
                  pago.comprobanteSaldo && !pago.saldoConfirmado ? (
                    <Boton
                      variante="exito"
                      className="w-full"
                      icono={<CheckCircle2 size={16} />}
                      onClick={pedirConfirmarSaldo}
                    >
                      Confirmar saldo
                    </Boton>
                  ) : null
                }
              />
            )}
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta className="px-4 py-4 text-sm text-[var(--text-muted)]">
          Todavía no hay datos de pago: el cliente no eligió presupuesto.
        </Tarjeta>
      )}


      {pedido.fotoFinal && (
        <>
          <TituloSeccion icono={<Images size={14} />} color="#f472b6">Foto final</TituloSeccion>
          <FotoFinal link={pedido.fotoFinal} />
        </>
      )}

      {pedido.historial.length > 0 && (
        <>
          <TituloSeccion icono={<History size={14} />} color="#94a3b8">Historial</TituloSeccion>
          <Historial lineas={pedido.historial} />
        </>
      )}

      {pedido.estado !== "❌❌❌" && (
        <button
          type="button"
          onClick={() => setPidiendoCancelar(true)}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-600/40 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:text-red-400"
        >
          <Trash2 size={16} />
          Cancelar y borrar pedido
        </button>
      )}

      <DialogoConfirmar
        abierto={pidiendoCancelar}
        titulo={`Cancelar ${pedido.pedido}`}
        peligro
        cargando={cancelando}
        textoConfirmar="Sí, cancelar"
        mensaje={
          <div className="space-y-2">
            <p>
              Es lo mismo que elegir <strong>❌❌❌</strong> en la hoja: se borran
              sus archivos, presupuestos, pagos y gestión, y el número{" "}
              <strong>{pedido.pedido}</strong> queda libre para otro cliente.
            </p>
            <p>No se le manda correo al cliente. No se puede deshacer.</p>
          </div>
        }
        onConfirmar={cancelarPedido}
        onCancelar={() => setPidiendoCancelar(false)}
      />

      {/* Cambiar estado */}
      <Hoja
        abierta={hojaEstado}
        onCerrar={() => setHojaEstado(false)}
        titulo="Cambiar estado"
      >
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Elegí el nuevo estado. Al cliente le llega el correo correspondiente
          en la próxima revisión automática.
        </p>
        <ul className="space-y-2">
          {ESTADOS_PEDIDO_EDITABLES.map((estado) => {
            const esActual = estado === pedido.estado;
            const sinPresupuestos =
              estado === "Presupuestado" && !tienePresupuestos(pedido);
            return (
              <li key={estado}>
                <button
                  type="button"
                  disabled={esActual || sinPresupuestos}
                  onClick={() => pedirEstado(estado)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                    esActual
                      ? "border-[var(--kint-selected-border)] bg-[var(--kint-selected-bg)]"
                      : "border-[var(--kint-panel-border)] hover:border-[var(--kint-selected-border)] disabled:opacity-50"
                  }`}
                >
                  <Chip tono={tonoEstado(estado)}>{estado}</Chip>
                  <span className="min-w-0 flex-1 text-xs text-[var(--text-muted)]">
                    {esActual
                      ? "Estado actual"
                      : sinPresupuestos
                      ? "Primero cargá los presupuestos"
                      : ""}
                  </span>
                  {!esActual && !sinPresupuestos && (
                    <ArrowRight size={16} className="shrink-0 text-[var(--text-muted)]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Hoja>

      {/* Fecha de entrega */}
      <Hoja
        abierta={hojaEntrega}
        onCerrar={() => {
          if (!guardando) setHojaEntrega(false);
        }}
        titulo="Fecha de entrega"
        pie={
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={() => setHojaEntrega(false)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton
              variante="principal"
              onClick={guardarEntrega}
              cargando={guardando}
              disabled={fechaNueva === pedido.entrega}
            >
              Guardar
            </Boton>
          </div>
        }
      >
        <Campo
          etiqueta="Nueva fecha"
          ayuda={
            fechaNueva ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {fechaDia(fechaNueva)} · {textoDiasHasta(fechaNueva)}
              </span>
            ) : (
              "Elegí el día en que se entrega el pedido."
            )
          }
        >
          <input
            type="date"
            value={fechaNueva}
            onChange={(evento) => setFechaNueva(evento.target.value)}
            className={`${claseInput} h-12`}
          />
        </Campo>

        {fechaNueva && (
          <button
            type="button"
            onClick={() => setFechaNueva("")}
            className="mt-3 h-11 text-sm font-bold text-red-600 underline-offset-4 hover:underline dark:text-red-400"
          >
            Quitar la fecha
          </button>
        )}
      </Hoja>

      <DialogoConfirmar
        abierto={Boolean(confirmacion)}
        titulo={confirmacion?.titulo ?? ""}
        mensaje={confirmacion?.mensaje}
        textoConfirmar={confirmacion?.textoConfirmar}
        cargando={guardando}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmacion(null)}
      />
    </>
  );
}

function EstadoComprobante({
  titulo,
  link,
  confirmado,
  accion,
}: {
  titulo: string;
  link: string;
  confirmado: boolean;
  accion: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--text-muted)]">{titulo}</span>
        {confirmado ? (
          <Chip tono="verde">
            <CheckCircle2 size={11} aria-hidden />
            Confirmado
          </Chip>
        ) : link ? (
          <Chip tono="ambar">
            <ReceiptText size={11} aria-hidden />
            Por validar
          </Chip>
        ) : (
          <Chip>
            <Clock size={11} aria-hidden />
            Sin comprobante
          </Chip>
        )}
      </div>
      {(link || accion) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={claseEnlaceBoton}
            >
              <ExternalLink size={16} />
              Ver comprobante
            </a>
          )}
          {accion}
        </div>
      )}
    </div>
  );
}

/* Dato del pedido en un cuadrito con ícono de color. */
function CuadroDato({
  icono,
  color,
  titulo,
  children,
}: {
  icono: ReactNode;
  color: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] p-3.5 shadow-[var(--shadow-soft)]">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          {icono}
        </span>
        {titulo}
      </p>
      <div className="mt-2 break-words text-sm font-black">{children}</div>
    </div>
  );
}
