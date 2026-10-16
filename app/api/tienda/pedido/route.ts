/*
 * Compra de la tienda.
 *
 * Ruta propia, separada de /api/comprobante:
 * el comprobante viaja junto con la compra y
 * Apps Script lo guarda en la carpeta de la tienda.
 */

export const maxDuration = 60;

/*
 * Vercel corta los cuerpos de más de 4,5 MB.
 * 4.200.000 caracteres en base64 ≈ 3,1 MB reales.
 */
const MAX_COMPROBANTE_BASE64 = 4_200_000;
const MAX_LINEAS = 30;
const MAX_COLORES = 2;
const MAX_COMENTARIO_PIEZA = 300;

type ItemEntrada = {
  producto?: unknown;
  cantidad?: unknown;
  cadena?: unknown;
  variante?: unknown;
  // Formato anterior: un solo color como texto.
  color?: unknown;
  colores?: unknown;
  comentario?: unknown;
};

/*
 * Colores opcionales (0, 1 o 2). Acepta la lista nueva
 * y el "color" de texto de los carritos viejos.
 * Si mandan más de 2, se reenvían igual para que
 * Apps Script responda con un error claro.
 */
function coloresDeItem(item: ItemEntrada) {
  if (Array.isArray(item?.colores)) {
    return item.colores
      .map((color) => String(color ?? "").trim())
      .filter(Boolean)
      .slice(0, MAX_COLORES + 1);
  }

  const color = String(item?.color || "").trim();
  return color ? [color] : [];
}

export async function POST(request: Request) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
      throw new Error(
        "Falta configurar GOOGLE_APPS_SCRIPT_URL."
      );
    }

    const body = await request.json();

    /*
     * Sin recortar: un carrito recortado da otro total
     * y Apps Script respondería "los precios cambiaron".
     */
    if (
      Array.isArray(body.items) &&
      body.items.length > MAX_LINEAS
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Hay demasiados productos en una sola compra. Dividila en dos.",
        },
        { status: 400 }
      );
    }

    const items = Array.isArray(body.items)
      ? (body.items as ItemEntrada[])
          .map((item) => {
            const colores = coloresDeItem(item);

            return {
              producto: String(item?.producto || ""),
              cantidad: Number(item?.cantidad) || 0,
              cadena: String(item?.cadena || ""),
            variante: String(item?.variante || "").slice(0, 60),
              colores,
              // Para versiones de Apps Script que solo leen "color".
              color: colores[0] || "",
              comentario: String(item?.comentario || "")
                .trim()
                .slice(0, MAX_COMENTARIO_PIEZA),
            };
          })
      : [];

    const archivoBase64 = String(
      body.archivoBase64 || ""
    );

    const archivoNombre = String(
      body.archivoNombre || ""
    );

    if (!archivoBase64 || !archivoNombre) {
      return Response.json(
        {
          ok: false,
          error: "Subí el comprobante de pago.",
        },
        { status: 400 }
      );
    }

    if (archivoBase64.length > MAX_COMPROBANTE_BASE64) {
      return Response.json(
        {
          ok: false,
          error:
            "El comprobante es muy pesado. Probá con una captura de pantalla.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        tipo: "pedido_tienda",
        nombre: String(body.nombre || ""),
        telefono: String(body.telefono || "").slice(0, 24),
        email: String(body.email || ""),
        alias: String(body.alias || ""),
        idCompra: String(body.idCompra || ""),
        comentario: String(body.comentario || ""),
        fechaEntrega: String(body.fechaEntrega || ""),
        fechasEntrega: Array.isArray(body.fechasEntrega)
          ? (body.fechasEntrega as unknown[]).slice(0, 10).map((dia) => String(dia || "").slice(0, 10))
          : [],
        modalidad: String(body.modalidad || ""),
        total: Number(body.total),
        items,
        archivoBase64,
        archivoNombre,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Apps Script no devolvió una respuesta válida."
      );
    }

    return Response.json(data, {
      status: data.ok ? 200 : 400,
    });
  } catch (error: unknown) {
    console.error("ERROR EN COMPRA DE TIENDA:", error);

    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo confirmar la compra.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}
