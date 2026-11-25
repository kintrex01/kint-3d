/*
 * Mensajes de WhatsApp del panel según la etapa del pedido (por si el
 * correo le llegó a spam). Se pueden cambiar en Configuración › Whatsapp;
 * vacío = el mensaje de siempre. Marcas que se reemplazan:
 *   {nombre} {pedido} {correo} {link}
 */

export const ETAPAS_WHATSAPP: Record<string, { clave: string; titulo: string; defecto: string }> = {
  Recibido: {
    clave: "whatsapp_recibido",
    titulo: "Pedido recibido",
    defecto:
      "¡Hola {nombre}! Recibimos tu pedido {pedido} en Kint 3D. Te mandamos un correo de confirmación a {correo}: si no lo ves, fijate en Spam o Promociones y marcalo como «No es spam». Seguí tu pedido acá: {link}",
  },
  Presupuestado: {
    clave: "whatsapp_presupuestado",
    titulo: "Presupuesto enviado",
    defecto:
      "¡Hola {nombre}! Ya te mandé el presupuesto de tu pedido {pedido} a {correo}. Si no lo ves, fijate en Spam o Promociones (y marcalo como «No es spam» para que te lleguen los próximos avisos). También lo ves y elegís la opción acá: {link}",
  },
  "En impresión": {
    clave: "whatsapp_en_impresion",
    titulo: "En impresión",
    defecto: "¡Hola {nombre}! Tu pedido {pedido} ya se está imprimiendo 🖨️ Lo seguís acá: {link}",
  },
  Terminado: {
    clave: "whatsapp_terminado",
    titulo: "Terminado",
    defecto:
      "¡Hola {nombre}! Tu maqueta {pedido} está terminada 🎉 Te mandé las fotos a {correo} (si no lo ves, fijate en Spam). ¿Coordinamos la entrega? Tu pedido: {link}",
  },
  Entregado: {
    clave: "whatsapp_entregado",
    titulo: "Entregado",
    defecto:
      "¡Gracias por confiar en Kint 3D, {nombre}! Si te gustó tu maqueta, nos ayuda muchísimo una reseña: {link}",
  },
};

export function linkSeguimiento(pedido: string, codigo: string) {
  return `https://kint3d.com/seguimiento?pedido=${encodeURIComponent(pedido)}&codigo=${encodeURIComponent(codigo)}`;
}

/* Mensaje de la etapa con los datos del pedido ("" si la etapa no tiene). */
export function mensajeWhatsapp(
  datos: { estado: string; nombre: string; pedido: string; email: string; codigo: string },
  plantillas: Record<string, string>
) {
  const etapa = ETAPAS_WHATSAPP[datos.estado];
  if (!etapa) return "";
  const plantilla = (plantillas[etapa.clave] || "").trim() || etapa.defecto;
  const nombre = datos.nombre.trim().split(/\s+/)[0] || "";
  return plantilla
    .replace(/\{nombre\}/g, nombre)
    .replace(/\{pedido\}/g, datos.pedido)
    .replace(/\{correo\}/g, datos.email || "tu correo")
    .replace(/\{link\}/g, linkSeguimiento(datos.pedido, datos.codigo))
    .replace(/\s+([!?.,])/g, "$1")
    .replace(/¡Hola !/g, "¡Hola!");
}

/*
 * Reparto › «Estoy en FADU»: Configuración › Whatsapp › «Whatsapp fadu» ({nombre} {pedido}; vacío = este).
 * Si le dijiste hasta qué hora estás, se agrega; si todavía debe plata, se le recuerda cuánto.
 */
export const MENSAJE_FADU = "¡Hola {nombre}! Estoy en FADU con tu pedido {pedido} 📦 ¿Pasás a retirarlo?";

export function mensajeFadu(
  datos: { nombre: string; pedido: string; hasta?: string; cobrar?: number },
  plantilla = ""
) {
  const nombre = datos.nombre.trim().split(/\s+/)[0] || "";
  let texto = (plantilla.trim() || MENSAJE_FADU)
    .replace(/\{nombre\}/g, nombre)
    .replace(/\{pedido\}/g, datos.pedido)
    .replace(/\s+([!?.,])/g, "$1")
    .replace(/¡Hola !/g, "¡Hola!");
  if (datos.hasta) texto += ` Estoy hasta las ${datos.hasta}.`;
  if (datos.cobrar && datos.cobrar > 0) texto += ` Acordate que quedan $${datos.cobrar.toLocaleString("es-UY")} por pagar.`;
  return texto;
}
