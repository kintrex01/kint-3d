# Tienda y panel de admin — guía rápida

## Publicar en kint3d.com

1. Cargar en Vercel (Project → Settings → Environment Variables → Production y Preview),
   copiando los valores de `.env.local`:
   - `ADMIN_PASSWORD` — contraseña del panel (cambiala por una tuya cuando quieras).
   - `ADMIN_SESSION_SECRET` — firma de la sesión. Si la cambiás, se cierran todas las sesiones.
   - `ADMIN_API_SECRET` — clave compartida con Apps Script. **Tiene que ser igual** a la
     propiedad `ADMIN_API_SECRET` del script (o al respaldo que está en `Admin_Kint3D.js`).
2. Mergear la rama `tienda-y-admin` en `main` y hacer push. Vercel publica solo.
3. Entrar a `https://kint3d.com/admin` desde el celular y agregarlo a la pantalla de inicio
   (Compartir → Agregar a inicio) para usarlo como una app.

El Apps Script ya está publicado: cada cambio se sube con `clasp push` y una versión nueva
del mismo deployment, así la URL no cambia.

## Qué se maneja desde la planilla

| Hoja | Qué es |
|---|---|
| **Productos** | Nombre, Precio, Por Mayor, Gran por mayor, Foto, Cadenas disponibles, Activo. Opcional: **Colores disponibles** (el cliente elige color como la cadena). |
| **Tienda** | Una fila por línea de cada compra (TND). Las columnas se buscan por **título**: se pueden mover o agregar columnas sin romper nada (ej. "Colores", "Alias"). |
| **Tienda IDs** (oculta) | Memoria anti-duplicados de compras. **No borrar.** |
| **Días sin entrega** | Fecha + Motivo. Esos días salen en rojo y nadie los puede elegir (tienda y cotizar). |
| **Configuración → TIENDA** | `Pedidos por mayor` (10) y `Gran pedido por mayor` (20): desde cuántas unidades de un producto rige cada precio. |

Fotos de productos: carpeta de Drive **Tienda - Fotos** con una subcarpeta por producto
(mismo nombre). La primera foto por nombre es la portada (`1.jpg`, `2.jpg`…). La carpeta
tiene que estar compartida como "Cualquier persona con el enlace" (Lector).

## Panel (/admin)

- **Inicio**: lo que hay que hacer hoy, próximas entregas, pedidos por estado y salud del sistema.
- **Maquetas**: cambiar estado, confirmar pago y saldo, fecha de entrega. El correo al cliente
  sale igual que cuando editás la hoja: lo manda la revisión automática (`revisarEstados`).
- **Tienda**: confirmar pago, marcar Listo / Entregado y avisar al cliente por correo.
- **Calendario**: tocar un día para bloquearlo o desbloquearlo.
- **Productos, Reseñas, Clientes, Configuración**: lo mismo que en la planilla, pensado para el celular.

## Para clientes

- `/tienda` — compra con cuenta Kint (correo + alias), checkout en pasos, precio por mayor.
- `/tienda/pedido` — "Seguí tu compra" con número TND + email (el link viene en el correo).
