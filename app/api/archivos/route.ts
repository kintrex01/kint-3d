import { createClient } from "@supabase/supabase-js";

const BUCKET = "kint-archivos";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function obtenerMensajeError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

async function llamarAppsScript(
  payload: Record<string, unknown>
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    throw new Error(
      "Falta configurar GOOGLE_APPS_SCRIPT_URL."
    );
  }

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type":
        "text/plain;charset=utf-8",
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!text || !text.trim()) {
    throw new Error(
      "Apps Script devolvió una respuesta vacía."
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Apps Script devolvió una respuesta inválida."
    );
  }

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Apps Script no pudo completar la operación."
    );
  }

  return data;
}

async function eliminarDeSupabase(
  ruta: string
) {
  /*
   * Las rutas de Supabase contienen carpetas:
   * KNT-0001/uuid/archivo.skp
   *
   * Los identificadores antiguos de Google Drive
   * no contienen "/".
   */
  if (!ruta || !ruta.includes("/")) {
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([ruta]);

  if (error) {
    throw new Error(error.message);
  }
}

/*
 * Agregar archivos adicionales.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pedido = String(
      body.pedido || ""
    )
      .trim()
      .toUpperCase();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    const archivos = Array.isArray(
      body.archivos
    )
      ? body.archivos
      : [];

    if (!pedido) {
      throw new Error(
        "Falta el número de pedido."
      );
    }

    if (!codigo) {
      throw new Error(
        "Falta el código de seguimiento."
      );
    }

    if (!archivos.length) {
      throw new Error(
        "No se recibieron archivos."
      );
    }

    await llamarAppsScript({
      tipo: "archivo_adicional_link",
      pedido,
      codigo,
      archivos,
    });

    return Response.json({
      ok: true,
      archivos,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error:
          obtenerMensajeError(error) ||
          "Error al registrar archivos.",
      },
      { status: 500 }
    );
  }
}

/*
 * Eliminar un archivo.
 */
export async function DELETE(
  request: Request
) {
  try {
    const body = await request.json();

    const pedido = String(
      body.pedido || ""
    )
      .trim()
      .toUpperCase();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    const idArchivo = String(
      body.idArchivo || ""
    ).trim();

    if (!pedido) {
      throw new Error(
        "Falta el número de pedido."
      );
    }

    if (!codigo) {
      throw new Error(
        "Falta el código de seguimiento."
      );
    }

    if (!idArchivo) {
      throw new Error(
        "Falta identificar el archivo."
      );
    }

    /*
     * Apps Script verifica primero que el archivo
     * pertenezca realmente al pedido y elimina
     * su fila de Google Sheets.
     */
    await llamarAppsScript({
      tipo: "eliminar_archivo",
      pedido,
      codigo,
      idArchivo,
    });

    let advertencia = "";

    /*
     * Si es una ruta de Supabase,
     * eliminamos también el objeto físico.
     */
    try {
      await eliminarDeSupabase(idArchivo);
    } catch (error) {
      console.error(
        "No se pudo eliminar el objeto de Supabase:",
        error
      );

      advertencia =
        "El archivo fue retirado del pedido, pero quedó una copia interna pendiente de limpieza.";
    }

    return Response.json({
      ok: true,
      idArchivo,
      advertencia,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error:
          obtenerMensajeError(error) ||
          "Error al eliminar el archivo.",
      },
      { status: 500 }
    );
  }
}

/*
 * Reemplazar un archivo.
 *
 * El archivo nuevo ya debe haber sido
 * subido mediante /api/archivos-firma.
 */
export async function PATCH(
  request: Request
) {
  try {
    const body = await request.json();

    const pedido = String(
      body.pedido || ""
    )
      .trim()
      .toUpperCase();

    const codigo = String(
      body.codigo || ""
    )
      .trim()
      .toUpperCase();

    const idArchivoAnterior = String(
      body.idArchivoAnterior || ""
    ).trim();

    const idArchivoNuevo = String(
      body.idArchivoNuevo || ""
    ).trim();

    const nombreArchivoNuevo = String(
      body.nombreArchivoNuevo || ""
    ).trim();

    const linkArchivoNuevo = String(
      body.linkArchivoNuevo || ""
    ).trim();

    if (!pedido) {
      throw new Error(
        "Falta el número de pedido."
      );
    }

    if (!codigo) {
      throw new Error(
        "Falta el código de seguimiento."
      );
    }

    if (!idArchivoAnterior) {
      throw new Error(
        "Falta identificar el archivo anterior."
      );
    }

    if (
      !idArchivoNuevo ||
      !nombreArchivoNuevo ||
      !linkArchivoNuevo
    ) {
      throw new Error(
        "Faltan datos del archivo nuevo."
      );
    }

    const pedidoSeguro = pedido.replace(
      /[^A-Z0-9_-]/g,
      ""
    );

    /*
     * Evita registrar una ruta nueva que
     * pertenezca a otro pedido.
     */
    if (
      !idArchivoNuevo.startsWith(
        `${pedidoSeguro}/`
      )
    ) {
      throw new Error(
        "La ruta del archivo nuevo no corresponde a este pedido."
      );
    }

    /*
     * Primero actualizamos Google Sheets.
     *
     * Si Apps Script rechaza el reemplazo,
     * eliminamos el archivo nuevo para no
     * dejar una carga huérfana.
     */
    try {
      await llamarAppsScript({
        tipo: "reemplazar_archivo",
        pedido,
        codigo,
        idArchivoAnterior,
        idArchivoNuevo,
        nombreArchivoNuevo,
        linkArchivoNuevo,
      });
    } catch (error) {
      try {
        await eliminarDeSupabase(
          idArchivoNuevo
        );
      } catch (errorLimpieza) {
        console.error(
          "No se pudo limpiar el archivo nuevo:",
          errorLimpieza
        );
      }

      throw error;
    }

    let advertencia = "";

    /*
     * Cuando Google Sheets ya apunta a la
     * versión nueva, quitamos la anterior.
     */
    if (
      idArchivoAnterior !== idArchivoNuevo
    ) {
      try {
        await eliminarDeSupabase(
          idArchivoAnterior
        );
      } catch (error) {
        console.error(
          "No se pudo eliminar la versión anterior:",
          error
        );

        advertencia =
          "El archivo fue reemplazado, pero quedó una copia interna anterior pendiente de limpieza.";
      }
    }

    return Response.json({
      ok: true,
      idArchivoAnterior,
      idArchivoNuevo,
      nombreArchivoNuevo,
      advertencia,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error:
          obtenerMensajeError(error) ||
          "Error al reemplazar el archivo.",
      },
      { status: 500 }
    );
  }
}