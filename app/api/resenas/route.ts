function obtenerMensajeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Error desconocido";
}

function obtenerUrlAppsScript() {
  const url =
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim();

  if (!url) {
    throw new Error(
      "Falta configurar GOOGLE_APPS_SCRIPT_URL en Vercel."
    );
  }

  return url;
}

async function llamarAppsScriptPost(
  payload: unknown,
  etapa: string
) {
  const url = obtenerUrlAppsScript();

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "follow",
    });
  } catch (error: unknown) {
    throw new Error(
      `${etapa}: no se pudo conectar con Google Apps Script. ` +
        obtenerMensajeError(error)
    );
  }

  let text = "";

  try {
    text = await response.text();
  } catch (error: unknown) {
    throw new Error(
      `${etapa}: Apps Script respondió, pero no se pudo leer la respuesta. ` +
        obtenerMensajeError(error)
    );
  }

  if (!response.ok) {
    throw new Error(
      `${etapa}: Apps Script respondió ${response.status}. ` +
        text.slice(0, 300)
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${etapa}: Apps Script no devolvió JSON. Respuesta: ` +
        text.slice(0, 300)
    );
  }
}

async function llamarAppsScriptGet(
  parametros: string,
  etapa: string
) {
  const urlBase = obtenerUrlAppsScript();

  const separador =
    urlBase.includes("?") ? "&" : "?";

  const url =
    `${urlBase}${separador}${parametros}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });
  } catch (error: unknown) {
    throw new Error(
      `${etapa}: no se pudo conectar con Google Apps Script. ` +
        obtenerMensajeError(error)
    );
  }

  let text = "";

  try {
    text = await response.text();
  } catch (error: unknown) {
    throw new Error(
      `${etapa}: no se pudo leer la respuesta de Apps Script. ` +
        obtenerMensajeError(error)
    );
  }

  if (!response.ok) {
    throw new Error(
      `${etapa}: Apps Script respondió ${response.status}. ` +
        text.slice(0, 300)
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${etapa}: Apps Script no devolvió JSON. Respuesta: ` +
        text.slice(0, 300)
    );
  }
}

export async function GET() {
  try {
    const data =
      await llamarAppsScriptGet(
        "tipo=resenas",
        "Carga de reseñas"
      );

    if (!data.ok) {
      throw new Error(
        data.error ||
          "Error al obtener reseñas."
      );
    }

    return Response.json(data);
  } catch (error: unknown) {
    console.error(
      "ERROR CARGANDO RESEÑAS:",
      error
    );

    return Response.json(
      {
        ok: false,
        error: obtenerMensajeError(error),
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const data = await request.json();

    const tipo = String(
      data.tipo || "resena"
    ).trim();

    /*
     * =================================
     * LIKE DE RESEÑA
     * =================================
     */

    if (tipo === "like_resena") {
      const pedido = String(
        data.pedido || ""
      )
        .trim()
        .toUpperCase();

      const dispositivo = String(
        data.dispositivo || ""
      ).trim();

      if (!pedido) {
        return Response.json(
          {
            ok: false,
            error:
              "Falta el número de pedido.",
          },
          {
            status: 400,
          }
        );
      }

      if (!dispositivo) {
        return Response.json(
          {
            ok: false,
            error:
              "Falta identificar el dispositivo.",
          },
          {
            status: 400,
          }
        );
      }

      const result =
        await llamarAppsScriptPost(
          {
            tipo: "like_resena",
            pedido,
            dispositivo,
          },
          "Actualización del like"
        );

      if (!result.ok) {
        throw new Error(
          result.error ||
            "No se pudo actualizar el like."
        );
      }

      return Response.json({
        ok: true,
        pedido: result.pedido,
        likes: result.likes,
        tieneLike: result.tieneLike,
      });
    }

    /*
     * =================================
     * NUEVA RESEÑA
     * =================================
     */

    const pedido = String(
      data.pedido || ""
    )
      .trim()
      .toUpperCase();

    const codigo = String(
      data.codigo || ""
    )
      .trim()
      .toUpperCase();

    const estrellas = Number(
      data.estrellas || 0
    );

    const comentario = String(
      data.comentario || ""
    ).trim();

    const autorizarPublicacion =
      data.autorizarPublicacion === true;

    const mostrarProyecto =
      data.mostrarProyecto === true;

    const fotos = Array.isArray(
      data.fotos
    )
      ? data.fotos
          .map((foto: unknown) =>
            String(foto || "").trim()
          )
          .filter(Boolean)
      : [];

    /*
     * =================================
     * VALIDACIONES
     * =================================
     */

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error:
            "Falta el número de pedido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!codigo) {
      return Response.json(
        {
          ok: false,
          error:
            "Falta el código de seguimiento.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      estrellas < 1 ||
      estrellas > 5
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "La calificación debe ser de 1 a 5 estrellas.",
        },
        {
          status: 400,
        }
      );
    }

    if (comentario.length < 3) {
      return Response.json(
        {
          ok: false,
          error:
            "Escribí un comentario sobre tu experiencia.",
        },
        {
          status: 400,
        }
      );
    }

    if (!autorizarPublicacion) {
      return Response.json(
        {
          ok: false,
          error:
            "Tenés que autorizar la publicación de la reseña.",
        },
        {
          status: 400,
        }
      );
    }

    if (fotos.length > 3) {
      return Response.json(
        {
          ok: false,
          error:
            "Podés subir un máximo de 3 imágenes.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fotos.length > 0 &&
      !mostrarProyecto
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Para publicar imágenes, tenés que autorizar que el proyecto sea mostrado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =================================
     * GUARDAR EN APPS SCRIPT
     * =================================
     */

    const result =
      await llamarAppsScriptPost(
        {
          tipo: "resena",
          pedido,
          codigo,
          estrellas,
          comentario,
          autorizarPublicacion,
          mostrarProyecto,
          fotos,
        },
        "Envío de la reseña"
      );

    if (!result.ok) {
      throw new Error(
        result.error ||
          "Error al guardar la reseña."
      );
    }

    return Response.json({
      ok: true,
      pedido,
      codigoEdicion:
        result.codigoEdicion || "",
      fechaLimiteEdicion:
        result.fechaLimiteEdicion || "",
      publicada:
        result.publicada === true,
      mensaje:
        result.mensaje ||
        "Recibimos tu reseña correctamente.",
    });
  } catch (error: unknown) {
    console.error(
      "ERROR PROCESANDO RESEÑA:",
      error
    );

    return Response.json(
      {
        ok: false,
        error: obtenerMensajeError(error),
      },
      {
        status: 500,
      }
    );
  }
}