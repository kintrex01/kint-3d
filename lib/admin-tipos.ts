import type { PerfilCalculadora } from "@/lib/calculadora";
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
  telefonoCuenta?: string; // celular de la cuenta del cliente (Clientes › Teléfono)
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
  // Productos de la tienda sumados al presupuesto (hoja Extras).
  extras?: ExtraPedido[];
};

export type ExtraPedido = {
  producto: string;
  cadena: string;
  colores: string;
  cantidad: number;
  precio: number;
  subtotal: number;
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
  variante?: string; // columna "Variante" de Tienda, si existe
  colores?: string[]; // en un personalizado: [borde, letras]
  comentario?: string; // de la pieza (personalizado: "Texto: … | Fuente: … | Tamaño: …")
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
  telefono?: string; // celular de la cuenta (Clientes › Teléfono), "099 123 456"
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
  // "Entero", "Mordido"...: el cliente tiene que elegir una ([] = sin variantes).
  variantes: string[];
  descripcion: string; // texto corto que se ve en la tienda ("" = sin descripción)
  etiquetas: string[]; // "Llavero", "Clicker", "Combo": filtros de la tienda
  personalizable: boolean; // el cliente lo arma en 3D
  tipoPersonalizado?: "Llavero" | "Mascota" | ""; // llavero con nombre o chapita de mascota
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
  // Foto final del pedido (Pedidos › S), si tiene: la del proyecto.
  fotoProyecto?: string;
};

/* Una fila de "Todos los pedidos" (maqueta o compra de la tienda). */
export type PedidoGeneral = {
  tipo: "maqueta" | "tienda";
  pedido: string;
  fecha: string; // ISO ("" si no se sabe): cuándo llegó
  entrega?: string; // "yyyy-mm-dd" o "": para cuándo lo quiere
  cliente: string;
  email: string;
  estado: string;
  monto: number;
  pagado: boolean;
  detalle: string;
};

/* Caja: ingresos (pagos confirmados) y gastos. Ver Caja_Kint3D.js. */
export type MovimientoCaja = {
  id: string; // "KNT-0013|sena" (automático) o "M-..." (cargado a mano)
  fecha: string; // ISO
  tipo: "ingreso" | "gasto";
  concepto: string;
  monto: number;
  pedido: string;
  categoria: string;
  automatico: boolean; // de un pedido: se va solo si se cancela
};

export type ItemHistorialCliente = {
  tipo: "maqueta" | "tienda";
  pedido: string;
  fecha: string; // ISO ("" si no tiene)
  estado: string;
  monto: number;
  pagado: boolean;
  detalle?: string; // tienda: "2 × Casco, 1 × Portaplanos"
};

export type HistorialCliente = {
  email: string;
  gastado: number; // solo pagos confirmados
  pedidos: number;
  compras: number;
  items: ItemHistorialCliente[];
};

export type ClienteAdmin = {
  email: string;
  telefono?: string; // "099 123 456" ("" si no cargó)
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
  metricas?: MetricasAdmin | null;
};

export type MetricasAdmin = {
  ventasMes: number; // pagos confirmados (maquetas + tienda) de pedidos de este mes
  ventasMesAnterior: number;
  pedidosMes: number; // maquetas que entraron este mes
  comprasMes: number; // compras de la tienda de este mes
  semanas: { desde: string; maquetas: number; tienda: number }[]; // 8, la última = esta semana
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

  /* orden = índices actuales en el orden nuevo (lo que ve el cliente). */
  admin_presupuesto_ordenar: {
    pedido: { pedido: string; orden: number[] };
    respuesta: { pedido: PedidoDetalle };
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

  /* Orden de la tienda ("Destacados"): nombres en el orden nuevo. */
  admin_productos_ordenar: {
    pedido: { nombres: string[] };
    respuesta: AccionesAdmin["admin_productos_listar"]["respuesta"];
  };

  admin_config_listar: {
    pedido: SinDatos;
    respuesta: { filas: FilaConfig[] };
  };
  admin_config_guardar: {
    pedido: { clave: string; valor?: string | number; comentario?: string };
    respuesta: { filas: FilaConfig[] };
  };
  /* Filamento (nombre, color, foto), hito de fidelidad o boquilla. */
  admin_config_agregar: {
    pedido: {
      clase: "filamento" | "fidelidad" | "boquilla"; // ("tipo" es el nombre de la acción)
      nombre?: string;
      color?: string;
      foto?: string;
      pedidos?: number;
      descuento?: number;
    };
    respuesta: { filas: FilaConfig[] };
  };
  admin_config_borrar: {
    pedido: { clave: string };
    respuesta: { filas: FilaConfig[] };
  };
  admin_extras_ver: {
    pedido: { pedido: string };
    respuesta: { pedido: string; extras: ExtraPedido[]; total: number; productos: { nombre: string; precio: number; cadenas: string[]; foto: string }[] };
  };
  admin_extras_guardar: {
    pedido: { pedido: string; items: { producto: string; cadena: string; cantidad: number; precio: number }[] };
    respuesta: { pedido: string; extras: ExtraPedido[]; total: number; productos: { nombre: string; precio: number; cadenas: string[]; foto: string }[] };
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
  admin_todos_listar: {
    pedido: SinDatos;
    respuesta: { pedidos: PedidoGeneral[] };
  };
  // Borra de todos lados (pedidos de prueba): ver PedidosTodos_Kint3D.js.
  admin_borrar_pedidos: {
    pedido: { pedidos: string[] };
    respuesta: { borrados: string[]; errores: string[] };
  };
  admin_caja_listar: {
    pedido: SinDatos;
    respuesta: { movimientos: MovimientoCaja[]; desde: string };
  };
  admin_caja_guardar: {
    pedido: {
      sentido: "ingreso" | "gasto"; // "tipo" ya es el nombre de la acción
      concepto: string;
      monto: number;
      fecha: string; // yyyy-mm-dd
      categoria: string;
    };
    respuesta: { movimiento: MovimientoCaja };
  };
  admin_caja_borrar: {
    pedido: { id: string };
    respuesta: { borrado: string };
  };
  // Calculadora: perfiles de costos (Calculadora_Kint3D.js).
  admin_calc_listar: {
    pedido: SinDatos;
    respuesta: { perfiles: PerfilCalculadora[]; activo: string };
  };
  admin_calc_guardar: {
    pedido: { perfiles: PerfilCalculadora[]; activo: string };
    respuesta: { perfiles: PerfilCalculadora[]; activo: string };
  };
  admin_cliente_historial: {
    pedido: { email: string };
    respuesta: HistorialCliente;
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
  admin_ruleta_giros_listar: {
    pedido: SinDatos;
    respuesta: { giros: GiroRegalo[] };
  };
  /* giros: -1 = ilimitados, 0 = quitar. */
  admin_ruleta_giros_guardar: {
    pedido: { email: string; giros: number; nota?: string };
    respuesta: { giros: GiroRegalo[] };
  };
  admin_ruleta_config_listar: {
    pedido: SinDatos;
    respuesta: VistaRuletaAdmin;
  };
  admin_puntos_historial: {
    pedido: { email: string };
    respuesta: PuntosCliente;
  };
  admin_premios_listar: {
    pedido: SinDatos;
    respuesta: { premios: PremioGanado[] };
  };
  admin_premio_estado: {
    pedido: { codigo: string; entregado: boolean };
    respuesta: { premios: PremioGanado[] };
  };
  /* sumar: puntos con signo; fijar: el saldo queda en ese número. */
  admin_puntos_ajustar: {
    pedido: { email: string; modo: "sumar" | "fijar"; puntos: number; motivo?: string };
    respuesta: PuntosCliente;
  };
  admin_puntos_revertir: {
    pedido: { email: string; id: string };
    respuesta: PuntosCliente;
  };
  admin_ruleta_config_guardar: {
    pedido: { config: ConfigRuleta };
    respuesta: VistaRuletaAdmin;
  };
};

export type PremioRuletaConfig = {
  id: string;
  tipo: "puntos" | "descuento" | "regalo" | "regalo_tienda" | "otra";
  nombre: string; // vacío = automático ("25 puntos", "10% OFF")
  valor: string | number;
  chance: number; // % si sale ese día
  color: string; // "" = el del tipo
  activo: boolean;
};

export type CanjeRuletaConfig = {
  id: string;
  nombre: string;
  puntos: number;
  tipo: "descuento" | "regalo";
  valor: string | number;
};

export type ConfigRuleta = {
  horas: number; // cada cuántas horas llegan giros nuevos
  girosPorTanda: number; // cuántos giros llegan cada vez
  acumulables: number; // cuántos se guardan como máximo
  costoPuntos: number; // 0 = no se gira con puntos
  porciones: number; // premios que entran cada día
  mostrar: "rareza" | "porcentaje" | "nada";
  premios: PremioRuletaConfig[];
  canjes: CanjeRuletaConfig[];
};

export type VistaRuletaAdmin = {
  config: ConfigRuleta;
  hoy: { nombre: string; tipo: string; chance: number; color: string; misterio: boolean }[];
  cambiaEn: string;
};

/* Un premio ganado en la ruleta o canjeado con puntos (hoja Premios). */
export type PremioGanado = {
  fecha: string;
  email: string;
  alias: string;
  origen: string; // Ruleta | Ruleta extra | Canje
  tipo: "regalo" | "descuento";
  premio: string;
  detalle: string;
  codigo: string;
  vence: string;
  estado: string; // Disponible | Reclamado · KNT-0012 | Entregado · KNT-0012
};

/* Un movimiento de la hoja Puntos. */
export type MovimientoPuntos = {
  id: string; // PTS-0012
  fecha: string; // ISO
  pedido: string;
  tipo: string; // Ganados | Utilizados | Ajuste | Reversión
  puntos: number; // con signo
  saldoAnterior: number;
  saldoNuevo: number;
  estado: string; // "Revertido" si se deshizo
  comentario: string;
  revertible: boolean;
};

export type PuntosCliente = {
  email: string;
  puntos: number;
  acumulados: number;
  movimientos: MovimientoPuntos[];
};

/* Giros de la ruleta que el dueño le regala a un cliente. */
export type GiroRegalo = {
  email: string;
  nombre: string;
  giros: number; // -1 = ilimitados
  nota: string;
  desde: string;
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
  "admin_presupuesto_ordenar",
  "admin_tienda_listar",
  "admin_tienda_estado",
  "admin_tienda_pago",
  "admin_tienda_cancelar",
  "admin_productos_listar",
  "admin_producto_guardar",
  "admin_productos_ordenar",
  "admin_config_listar",
  "admin_config_guardar",
  "admin_config_agregar",
  "admin_config_borrar",
  "admin_extras_ver",
  "admin_extras_guardar",
  "admin_dias_listar",
  "admin_dia_guardar",
  "admin_dia_quitar",
  "admin_resenas_listar",
  "admin_resena_moderar",
  "admin_resena_borrar",
  "admin_cliente_historial",
  "admin_todos_listar",
  "admin_borrar_pedidos",
  "admin_caja_listar",
  "admin_caja_guardar",
  "admin_caja_borrar",
  "admin_calc_listar",
  "admin_calc_guardar",
  "admin_clientes_buscar",
  "admin_cliente_estado",
  "admin_ruleta_giros_listar",
  "admin_ruleta_giros_guardar",
  "admin_ruleta_config_listar",
  "admin_ruleta_config_guardar",
  "admin_puntos_historial",
  "admin_puntos_ajustar",
  "admin_puntos_revertir",
  "admin_premios_listar",
  "admin_premio_estado",
] as const satisfies readonly TipoAccionAdmin[];
