/*
 * CONTRATO DEL PANEL DE ADMIN
 *
 * Única fuente de verdad de lo que viaja entre:
 *   pantallas /admin  →  POST /api/admin/accion  →  Apps Script (Admin_Kint3D.js)
 *
 * Cada acción es { tipo: "admin_...", ...datos } y responde
 * { ok: true, ...resultado } o { ok: false, error }.
 *
 * Fechas: "yyyy-mm-dd" para días y ISO completo para momentos.
 * Dinero: número en pesos uruguayos.
 */

/* ------------------------------------------------------------------ */
/* Pedidos de maquetas (hoja "Pedidos", números KNT-xxxx)              */
/* ------------------------------------------------------------------ */

export const ESTADOS_PEDIDO = [
  "Recibido",
  "Presupuestado",
  "Método de pago seleccionado",
  "Pago confirmado",
  "En impresión",
  "Terminado",
  "Entregado",
] as const;

export const ESTADO_CANCELADO = "❌❌❌";

/* Estados que el dueño puede poner desde el panel (como hoy en la hoja). */
export const ESTADOS_PEDIDO_EDITABLES = [
  "Presupuestado",
  "En impresión",
  "Terminado",
  "Entregado",
] as const;

export type EstadoPedidoEditable = (typeof ESTADOS_PEDIDO_EDITABLES)[number];

export type PagoPedido = {
  metodo: string; // Pagos G ("Sin seleccionar", "Transferencia", "Puntos Kint"...)
  estado: string; // Pagos H
  confirmado: boolean; // Pagos J
  comprobante: string; // Pagos I (link)
  modalidad: string; // Pagos L ("Seña 20%" / "Pago total")
  importe: number; // Pagos M
  saldoPendiente: number; // Pagos N
  comprobanteSaldo: string; // Pagos O (link)
  saldoConfirmado: boolean; // Pagos P
  precioOriginal: number; // Pagos E
  precioFinal: number; // Pagos F
};

export type PedidoResumen = {
  pedido: string; // KNT-0001
  codigo: string; // código de seguimiento (B)
  fecha: string; // C, ISO
  entrega: string; // D, "yyyy-mm-dd" o ""
  nombre: string;
  email: string;
  whatsapp: string;
  estado: string; // Q
  notificado: string; // T: último estado avisado al cliente
  prioritario: boolean; // P
  pago: PagoPedido | null;
};

/*
 * Una fila de la hoja Presupuestos. Su posición en
 * PedidoDetalle.presupuestos es el `index` que usan las acciones
 * admin_presupuesto_* (el mismo orden que ve el cliente).
 */
export type OpcionPresupuesto = {
  opcion: string;
  descripcion: string;
  tiempo: string;
  filamento: string;
  precioBase: number;
  urgente: boolean;
  recargo: number; // %
  precioTotal: number;
  seleccionado: boolean;
};

/* Lo que carga el dueño en el formulario de una opción. */
export type OpcionPresupuestoEntrada = {
  opcion: string; // "Recomendada", "Premium", "Barata" o texto libre
  descripcion: string;
  tiempo: string; // texto libre, ej. "7 hs 45 minutos"
  filamento: string; // gramos ("" = sin dato)
  precioBase: number; // pesos, > 0
};

/* Para comprobar que la fila no cambió en la hoja mientras se editaba. */
export type OpcionPresupuestoEsperada = {
  opcion: string;
  precioBase: number;
};

export type ArchivoPedido = {
  tipo: string;
  nombre: string;
  link: string;
};

export type PedidoDetalle = PedidoResumen & {
  escala: string;
  color: string;
  armado: string;
  alisado: string;
  boquilla: string;
  codigoDescuento: string;
  descuento: number; // % (0-100)
  comentarios: string;
  historial: string[]; // líneas de R, de la más vieja a la más nueva
  fotoFinal: string; // S (link)
  presupuestos: OpcionPresupuesto[];
  archivos: ArchivoPedido[];
};

/* ------------------------------------------------------------------ */
/* Tienda (hoja "Tienda", números TND-xxxx, una fila por línea)         */
/* ------------------------------------------------------------------ */

export const ESTADOS_TIENDA = ["Pendiente", "Listo", "Entregado"] as const;
export type EstadoTienda = (typeof ESTADOS_TIENDA)[number];

export type LineaCompraTienda = {
  producto: string;
  cantidad: number;
  cadena: string;
  color?: string; // columna "Colores" de Tienda, si existe
  subtotal: number;
};

export type CompraTienda = {
  pedido: string; // TND-0001
  fechaEntrega: string; // "yyyy-mm-dd" o ""
  cliente: string;
  email: string;
  alias: string; // de Clientes (por email), puede ser ""
  comentario: string;
  modalidad: "Seña" | "Completo" | string;
  estado: EstadoTienda | string;
  pagoConfirmado: boolean;
  comprobante: string;
  comprobanteSaldo?: string; // columna "Comprobante saldo" (lo sube el cliente desde el seguimiento)
  total: number; // suma de las líneas
  senaPorcentaje: number; // configuración actual de la tienda
  montoSena: number; // round(total * senaPorcentaje / 100), 0 si es Completo
  lineas: LineaCompraTienda[];
};

/* ------------------------------------------------------------------ */
/* Productos (hoja "Productos")                                        */
/* ------------------------------------------------------------------ */

export type ProductoAdmin = {
  nombre: string;
  precio: number;
  precioMayor: number; // 0 = sin precio por mayor
  precioGranMayor: number; // 0 = sin precio gran por mayor
  foto: string; // contenido crudo de la celda Foto ("" = carpeta automática)
  cadenas: string[];
  colores: string[]; // los de la foto (columna "Colores" de Productos)
  minColores: number; // 0 = vacío (la tienda usa 1)
  maxColores: number; // 0 = vacío (la tienda usa 2)
  activo: boolean;
  fotos: number; // cuántas fotos encuentra la tienda (celda o carpeta)
};

export type ProductoEntrada = Omit<ProductoAdmin, "fotos">;

/* ------------------------------------------------------------------ */
/* Configuración (hoja "Configuración")                                */
/* ------------------------------------------------------------------ */

export type TipoConfig = "toggle" | "numero" | "fecha" | "texto";

export type FilaConfig = {
  fila: number;
  etiqueta: string; // columna A tal cual
  clave: string; // normalizada (ej. "pedido_urgente_valor")
  valor: string | number; // fechas como "yyyy-mm-dd"
  comentario: string; // columna C (en muchos toggles es el mensaje al cliente)
  esSeccion: boolean; // fila de título (ej. "PEDIDOS")
  seccion: string; // título de la sección a la que pertenece
  tipo: TipoConfig;
  opciones: string[]; // valores permitidos si la celda tiene desplegable
};

/* ------------------------------------------------------------------ */
/* Días sin entrega, reseñas, clientes                                  */
/* ------------------------------------------------------------------ */

export type DiaSinEntrega = { fecha: string; motivo: string };

export type ResenaAdmin = {
  id: string;
  fecha: string; // ISO
  pedido: string;
  nombre: string;
  email: string;
  estrellas: number;
  comentario: string;
  aprobada: boolean; // G
  mostrarProyecto: boolean; // H
  fotos: string[];
};

export type ClienteAdmin = {
  email: string;
  nombre: string;
  alias: string;
  estado: string; // "Activo" | "Bloqueado"
  topKint: boolean;
  puntos: number;
  registro: string; // ISO
};

/* ------------------------------------------------------------------ */
/* Resumen (pantalla de inicio del panel)                              */
/* ------------------------------------------------------------------ */

export type EntregaAgenda = {
  tipo: "maqueta" | "tienda";
  pedido: string;
  nombre: string;
  fecha: string; // "yyyy-mm-dd"
  estado: string;
};

export type ResumenAdmin = {
  pedidos: {
    porEstado: Record<string, number>; // solo pedidos no cancelados
    activos: number; // ni Entregado ni cancelado
    pagosPorValidar: number; // comprobante cargado y J sin marcar
    saldosPorValidar: number; // comprobante de saldo cargado y P sin marcar
  };
  tienda: {
    pendientes: number;
    listos: number;
    pagosPorConfirmar: number;
  };
  resenasPendientes: number;
  proximasEntregas: EntregaAgenda[]; // hoy + 14 días, ordenadas
  diasSinEntrega: DiaSinEntrega[]; // próximos 30 días
  diagnostico: {
    cuotaCorreos: number; // MailApp.getRemainingDailyQuota()
    activadores: { funcion: string; tipo: string }[];
  };
};

/* ------------------------------------------------------------------ */
/* Acciones: { tipo } → respuesta                                      */
/* ------------------------------------------------------------------ */

/* Acciones que no necesitan datos. */
export type SinDatos = Record<string, never>;

export type AccionesAdmin = {
  admin_resumen: { pedido: SinDatos; respuesta: { resumen: ResumenAdmin } };

  admin_pedidos_listar: {
    pedido: { incluirCancelados?: boolean };
    respuesta: { pedidos: PedidoResumen[] };
  };
  admin_pedido_detalle: {
    pedido: { pedido: string };
    respuesta: { pedido: PedidoDetalle };
  };
  /* Escribe Q como lo haría el dueño; el correo lo manda revisarEstados. */
  // Igual que elegir ❌❌❌ en la hoja: se borra todo y el número queda libre.
  admin_pedido_cancelar: {
    pedido: { pedido: string };
    respuesta: { pedido: string; aviso: string };
  };
  admin_pedido_estado: {
    pedido: { pedido: string; estado: EstadoPedidoEditable };
    respuesta: { pedido: PedidoDetalle; aviso: string };
  };
  /* Igual que marcar la casilla Pagos J (llama al mismo handler de onEdit). */
  admin_pago_confirmar: {
    pedido: { pedido: string };
    respuesta: { pedido: PedidoDetalle; aviso: string };
  };
  /* Igual que marcar Pagos P. */
  admin_saldo_confirmar: {
    pedido: { pedido: string };
    respuesta: { pedido: PedidoDetalle };
  };
  admin_pedido_entrega: {
    pedido: { pedido: string; fecha: string };
    respuesta: { pedido: PedidoDetalle };
  };

  /* Valores del desplegable "Opción" de Presupuestos (soloLista = la hoja rechaza otros). */
  admin_presupuesto_opciones: {
    pedido: SinDatos;
    respuesta: { opciones: string[]; soloLista: boolean };
  };
  /*
   * Agrega (index null) o edita una opción en Presupuestos, igual que a mano:
   * calcula recargo urgente y precio total. `confirmar` es obligatorio si el
   * pedido ya pasó de Presupuestado o el cliente ya eligió una opción.
   */
  admin_presupuesto_guardar: {
    pedido: {
      pedido: string;
      index: number | null;
      opcion: OpcionPresupuestoEntrada;
      esperado?: OpcionPresupuestoEsperada;
      confirmar?: boolean;
    };
    respuesta: { pedido: PedidoDetalle; aviso: string };
  };
  /* Borra una opción (no se puede borrar la elegida por el cliente). */
  admin_presupuesto_borrar: {
    pedido: {
      pedido: string;
      index: number;
      esperado?: OpcionPresupuestoEsperada;
      confirmar?: boolean;
    };
    respuesta: { pedido: PedidoDetalle; aviso: string };
  };

  admin_tienda_listar: {
    pedido: SinDatos;
    respuesta: { compras: CompraTienda[] };
  };
  admin_tienda_estado: {
    pedido: { pedido: string; estado: EstadoTienda; notificar: boolean };
    // puntos: Puntos Kint acreditados al marcar Entregado (0 si no corresponde).
    respuesta: { compra: CompraTienda; correoEnviado: boolean; puntos?: number };
  };
  // Borra la compra (filas, anti-duplicados y comprobantes): el TND queda libre.
  admin_tienda_cancelar: {
    pedido: { pedido: string };
    respuesta: { pedido: string; filasBorradas: number };
  };
  admin_tienda_pago: {
    pedido: { pedido: string; confirmado: boolean; notificar: boolean };
    respuesta: { compra: CompraTienda; correoEnviado: boolean };
  };

  admin_productos_listar: {
    pedido: SinDatos;
    respuesta: {
      productos: ProductoAdmin[];
      cadenasOpciones: string[];
      coloresOpciones: string[];
      hayColores: boolean; // existe la columna "Colores disponibles"
      hayLimitesColores: boolean; // existen "Min de Colores" y "Max de Colores"
    };
  };
  /* nombreOriginal vacío = producto nuevo. */
  admin_producto_guardar: {
    pedido: { nombreOriginal: string; producto: ProductoEntrada };
    respuesta: { productos: ProductoAdmin[] };
  };

  admin_config_listar: {
    pedido: SinDatos;
    respuesta: { filas: FilaConfig[] };
  };
  admin_config_guardar: {
    pedido: { clave: string; valor?: string | number; comentario?: string };
    respuesta: { filas: FilaConfig[] };
  };

  admin_dias_listar: {
    pedido: SinDatos;
    respuesta: { dias: DiaSinEntrega[] };
  };
  admin_dia_guardar: {
    pedido: DiaSinEntrega;
    respuesta: { dias: DiaSinEntrega[] };
  };
  admin_dia_quitar: {
    pedido: { fecha: string };
    respuesta: { dias: DiaSinEntrega[] };
  };

  admin_resenas_listar: {
    pedido: SinDatos;
    respuesta: { resenas: ResenaAdmin[] };
  };
  admin_resena_moderar: {
    pedido: { id: string; aprobada?: boolean; mostrarProyecto?: boolean };
    respuesta: { resena: ResenaAdmin };
  };
  admin_resena_borrar: {
    pedido: { id: string };
    respuesta: { id: string; pedido: string };
  };

  admin_clientes_buscar: {
    pedido: { q: string };
    respuesta: { clientes: ClienteAdmin[] };
  };
  admin_cliente_estado: {
    pedido: { email: string; bloqueado: boolean };
    respuesta: { cliente: ClienteAdmin };
  };
};

export type TipoAccionAdmin = keyof AccionesAdmin;

export const ACCIONES_ADMIN = [
  "admin_resumen",
  "admin_pedidos_listar",
  "admin_pedido_detalle",
  "admin_pedido_estado",
  "admin_pedido_cancelar",
  "admin_pago_confirmar",
  "admin_saldo_confirmar",
  "admin_pedido_entrega",
  "admin_presupuesto_opciones",
  "admin_presupuesto_guardar",
  "admin_presupuesto_borrar",
  "admin_tienda_listar",
  "admin_tienda_estado",
  "admin_tienda_pago",
  "admin_tienda_cancelar",
  "admin_productos_listar",
  "admin_producto_guardar",
  "admin_config_listar",
  "admin_config_guardar",
  "admin_dias_listar",
  "admin_dia_guardar",
  "admin_dia_quitar",
  "admin_resenas_listar",
  "admin_resena_moderar",
  "admin_resena_borrar",
  "admin_clientes_buscar",
  "admin_cliente_estado",
] as const satisfies readonly TipoAccionAdmin[];
