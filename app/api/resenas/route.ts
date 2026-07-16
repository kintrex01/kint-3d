export async function GET() {
  try {
    const response = await fetch(
      `${process.env.GOOGLE_APPS_SCRIPT_URL}?tipo=resenas`,
      {
        cache: "no-store",
      }
    );

    const text = await response.text();
    const data = JSON.parse(text);

    if (!data.ok) {
      throw new Error(data.error || "Error al obtener reseñas.");
    }

    return Response.json(data);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al obtener reseñas.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const tipo = String(data.tipo || "resena").trim();

    if (tipo === "like_resena") {
      const pedido = String(data.pedido || "")
        .trim()
        .toUpperCase();

      const dispositivo = String(data.dispositivo || "").trim();

      if (!pedido) {
        return Response.json(
          {
            ok: false,
            error: "Falta el número de pedido.",
          },
          { status: 400 }
        );
      }

      if (!dispositivo) {
        return Response.json(
          {
            ok: false,
            error: "Falta identificar el dispositivo.",
          },
          { status: 400 }
        );
      }

      const response = await fetch(
        process.env.GOOGLE_APPS_SCRIPT_URL!,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            tipo: "like_resena",
            pedido,
            dispositivo,
          }),
        }
      );

      const text = await response.text();
      const result = JSON.parse(text);

      if (!result.ok) {
        throw new Error(
          result.error || "No se pudo actualizar el like."
        );
      }

      return Response.json({
  ok: true,
  pedido: result.pedido,
  likes: result.likes,
  tieneLike: result.tieneLike,
});
    }

    const pedido = String(data.pedido || "")
      .trim()
      .toUpperCase();

    const codigo = String(data.codigo || "")
      .trim()
      .toUpperCase();

    const estrellas = Number(data.estrellas || 0);
    const comentario = String(data.comentario || "").trim();

    const autorizarPublicacion = Boolean(
      data.autorizarPublicacion
    );

    const mostrarProyecto = Boolean(data.mostrarProyecto);

    const fotos = Array.isArray(data.fotos)
      ? data.fotos
          .map((foto: unknown) => String(foto || "").trim())
          .filter(Boolean)
      : [];

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error: "Falta el número de pedido.",
        },
        { status: 400 }
      );
    }

    if (!codigo) {
      return Response.json(
        {
          ok: false,
          error: "Falta el código de seguimiento.",
        },
        { status: 400 }
      );
    }

    if (estrellas < 1 || estrellas > 5) {
      return Response.json(
        {
          ok: false,
          error: "La calificación debe ser de 1 a 5 estrellas.",
        },
        { status: 400 }
      );
    }

    if (comentario.length < 3) {
      return Response.json(
        {
          ok: false,
          error: "Escribí un comentario sobre tu experiencia.",
        },
        { status: 400 }
      );
    }

    if (!autorizarPublicacion) {
      return Response.json(
        {
          ok: false,
          error:
            "Tenés que autorizar la publicación de la reseña.",
        },
        { status: 400 }
      );
    }

    if (fotos.length > 3) {
      return Response.json(
        {
          ok: false,
          error: "Podés subir un máximo de 3 imágenes.",
        },
        { status: 400 }
      );
    }

    if (fotos.length > 0 && !mostrarProyecto) {
      return Response.json(
        {
          ok: false,
          error:
            "Para publicar imágenes, tenés que autorizar que el proyecto sea mostrado.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      process.env.GOOGLE_APPS_SCRIPT_URL!,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          tipo: "resena",
          pedido,
          codigo,
          estrellas,
          comentario,
          autorizarPublicacion,
          mostrarProyecto,
          fotos,
        }),
      }
    );

    const text = await response.text();
    const result = JSON.parse(text);

    if (!result.ok) {
      throw new Error(
        result.error || "Error al guardar la reseña."
      );
    }

    return Response.json({
  ok: true,
  pedido,
  codigoEdicion: result.codigoEdicion,
  fechaLimiteEdicion: result.fechaLimiteEdicion,
  publicada: result.publicada === true,
  mensaje:
    result.mensaje ||
    "Recibimos tu reseña correctamente.",
});

  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al procesar la solicitud.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}