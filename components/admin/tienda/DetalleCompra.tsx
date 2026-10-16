"use client";

/*
 * Contenido de la hoja con el detalle de una compra de la tienda:
 * líneas, pago y botones de estado.
 */

import {
  CheckCircle2,
  Mail,
  MessageCircle,
  ReceiptText,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  ESTADOS_TIENDA,
  type CompraTienda,
  type EstadoTienda,
} from "@/lib/admin-tipos";
import {
  Boton,
  Chip,
  Interruptor,
  fechaDia,
  linkWhatsapp,
  pesos,
  textoDiasHasta,
  tonoEstado,
} from "@/components/admin/ui";
import { ArchivosLlavero } from "@/components/admin/tienda/ArchivosLlavero";
import { leerPersonalizacion } from "@/lib/llavero/personalizacion";

const claseEnlaceBoton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel)] px-4 text-sm font-bold text-[var(--text-main)] transition hover:border-[var(--kint-selected-border)] active:scale-[0.98]";

export function textoLinea(linea: CompraTienda["lineas"][number]) {
  const detalle = [linea.color, linea.cadena].filter(Boolean).join(", ");
  return `${linea.cantidad} × ${linea.producto}${detalle ? ` (${detalle})` : ""}`;
}

export function textoModalidad(compra: CompraTienda) {
  if (compra.montoSena > 0) {
    return `Seña ${pesos(compra.montoSena)} · saldo ${pesos(
      Math.max(compra.total - compra.montoSena, 0)
    )}`;
  }
  return compra.modalidad === "Completo" ? "Pago completo" : compra.modalidad;
}

export function DetalleCompra({
  compra,
  notificar,
  onNotificar,
  guardando,
  onPago,
  onEstado,
  onCancelar,
}: {
  compra: CompraTienda;
  notificar: boolean;
  onNotificar: (activo: boolean) => void;
  guardando: string;
  onPago: (confirmado: boolean) => void;
  onEstado: (estado: EstadoTienda) => void;
  onCancelar: () => void;
}) {
  const ocupado = Boolean(guardando);

  return (
    <div className="space-y-5">
      {/* Cliente */}
      <div>
        <p className="text-lg font-black leading-tight">
          {compra.cliente || "Sin nombre"}
          {compra.alias && (
            <span className="ml-1.5 text-sm font-semibold text-[var(--text-muted)]">
              ({compra.alias})
            </span>
          )}
        </p>
        {compra.email && (
          <p className="break-all text-sm text-[var(--text-muted)]">{compra.email}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tono={tonoEstado(compra.estado)}>{compra.estado || "Sin estado"}</Chip>
          <Chip tono={compra.pagoConfirmado ? "verde" : "ambar"}>
            {compra.pagoConfirmado ? "Pago confirmado" : "Pago sin confirmar"}
          </Chip>
        </div>
        {compra.fechaEntrega && (
          <p className="mt-2 text-sm">
            Entrega <span className="font-bold">{fechaDia(compra.fechaEntrega)}</span>
            {compra.estado !== "Entregado" && (
              <span className="text-[var(--text-muted)]">
                {" "}· {textoDiasHasta(compra.fechaEntrega)}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Líneas */}
      <div className="rounded-2xl border border-[var(--kint-panel-border)]">
        <ul className="divide-y divide-[var(--kint-panel-border)]">
          {compra.lineas.map((linea, indice) => (
            <li
              key={`${linea.producto}-${linea.cadena}-${indice}`}
              className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="font-bold">
                  {linea.cantidad} × {linea.producto}
                </span>
                {linea.variante && (
                  <span className="block text-xs font-bold text-[var(--text-main)]">
                    Variante: {linea.variante}
                  </span>
                )}
                {linea.color && (
                  <span className="block text-xs text-[var(--text-muted)]">
                    Color {linea.color}
                  </span>
                )}
                {linea.cadena && (
                  <span className="block text-xs text-[var(--text-muted)]">
                    Cadena {linea.cadena}
                  </span>
                )}
                {(() => {
                  const personalizacion = leerPersonalizacion(linea.comentario || "");
                  if (personalizacion) {
                    return (
                      <ArchivosLlavero
                        pedido={compra.pedido}
                        personalizacion={personalizacion}
                        colores={linea.colores || []}
                      />
                    );
                  }
                  return linea.comentario ? (
                    <span className="block text-xs italic text-[var(--text-muted)]">
                      “{linea.comentario}”
                    </span>
                  ) : null;
                })()}
              </span>
              <span className="shrink-0 font-semibold">{pesos(linea.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-4 py-3 rounded-b-2xl">
          <span className="text-sm font-bold">Total</span>
          <span className="text-lg font-black">{pesos(compra.total)}</span>
        </div>
      </div>
      {textoModalidad(compra) && (
        <p className="-mt-3 text-xs text-[var(--text-muted)]">{textoModalidad(compra)}</p>
      )}

      {compra.comentario && (
        <div>
          <p className="text-xs font-bold text-[var(--text-muted)]">Comentario</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm">
            {compra.comentario}
          </p>
        </div>
      )}

      {compra.comprobanteSaldo && (
        <a
          href={compra.comprobanteSaldo}
          target="_blank"
          rel="noopener noreferrer"
          className={`${claseEnlaceBoton} w-full border-red-600/40 text-red-700 dark:text-red-300`}
        >
          <ReceiptText size={16} />
          Comprobante del saldo
        </a>
      )}

      <div className="grid grid-cols-2 gap-2">
        {compra.comprobante ? (
          <a
            href={compra.comprobante}
            target="_blank"
            rel="noopener noreferrer"
            className={claseEnlaceBoton}
          >
            <ReceiptText size={16} />
            Comprobante
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={`${claseEnlaceBoton} cursor-not-allowed opacity-50`}
          >
            <ReceiptText size={16} />
            Sin comprobante
          </span>
        )}
        {compra.telefono ? (
          // Lo más rápido: WhatsApp al celular de su cuenta.
          <a
            href={linkWhatsapp(
              compra.telefono,
              `Hola ${compra.cliente.split(" ")[0] || ""}, te escribo de Kint 3D por tu compra ${compra.pedido}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={`${claseEnlaceBoton} border-emerald-600/50 text-emerald-700 dark:text-emerald-400`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        ) : compra.email ? (
          // Abre tu programa de correo con un mail nuevo para el cliente.
          <a
            href={`mailto:${compra.email}?subject=${encodeURIComponent(`Tu compra ${compra.pedido} en Kint 3D`)}`}
            className={claseEnlaceBoton}
          >
            <Mail size={16} />
            Escribir correo
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={`${claseEnlaceBoton} cursor-not-allowed opacity-50`}
          >
            <Mail size={16} />
            Sin contacto
          </span>
        )}
      </div>

      {compra.telefono && compra.email && (
        <p className="-mt-2 text-center text-xs text-[var(--text-muted)]">
          Celular {compra.telefono} ·{" "}
          <a
            href={`mailto:${compra.email}?subject=${encodeURIComponent(`Tu compra ${compra.pedido} en Kint 3D`)}`}
            className="font-bold text-[var(--blue-main)] hover:underline dark:text-[var(--blue-soft)]"
          >
            o escribile un correo
          </a>
        </p>
      )}

      {/* Acciones */}
      <div className="space-y-4 rounded-2xl border border-[var(--kint-panel-border)] bg-[var(--kint-panel-soft)] px-4 py-4">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-bold">Avisar al cliente por correo</span>
          <Interruptor
            activo={notificar && Boolean(compra.email)}
            onCambiar={onNotificar}
            deshabilitado={ocupado || !compra.email}
            etiqueta="Avisar al cliente por correo"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">Pago</p>
          {compra.pagoConfirmado ? (
            <Boton
              className="w-full"
              icono={<Undo2 size={16} />}
              cargando={guardando === "pago"}
              disabled={ocupado}
              onClick={() => onPago(false)}
            >
              Quitar confirmación
            </Boton>
          ) : (
            <Boton
              variante="exito"
              className="w-full"
              icono={<CheckCircle2 size={16} />}
              cargando={guardando === "pago"}
              disabled={ocupado}
              onClick={() => onPago(true)}
            >
              Confirmar pago
            </Boton>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">Estado</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Estado de la compra">
            {ESTADOS_TIENDA.map((estado) => {
              const actual = compra.estado === estado;
              return (
                <Boton
                  key={estado}
                  variante={actual ? "principal" : "secundario"}
                  className="px-2"
                  aria-pressed={actual}
                  cargando={guardando === estado}
                  disabled={ocupado}
                  onClick={() => {
                    if (!actual) onEstado(estado);
                  }}
                >
                  {estado}
                </Boton>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancelar}
        disabled={ocupado}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-600/40 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50 dark:text-red-400"
      >
        <Trash2 size={16} />
        Cancelar y borrar compra
      </button>
    </div>
  );
}
