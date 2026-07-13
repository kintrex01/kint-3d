export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pedido = String(
      searchParams.get("pedido") || ""
    )
      .trim()
      .toUpperCase();

    const codigoEdicion = String(
      searchParams.get("codigo") || ""
    )
      .trim()
      .toUpperCase();

    if (!pedido) {
      return Response.json(
        {
          ok: false,
          error: "Falta el número de pedido.",
        },
        { status: 400 }
      );
    }

    if (!codigoEdicion) {
      return Response.json(
        {
          ok: false,
          error: "Falta el código de edición.",
        },
        { status: 400 }
      );
    }

    const url =
      `${process.env.GOOGLE_APPS_SCRIPT_URL}` +
      `?tipo=editar_resena` +
      `&pedido=${encodeURIComponent(pedido)}` +
      `&codigoEdicion=${encodeURIComponent(codigoEdicion)}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const text = await response.text();

    if (!text || !text.trim()) {
      throw new Error(
        "Apps Script devolvió una respuesta vacía."
      );
    }

    const data = JSON.parse(text);

    if (!data.ok) {
      return Response.json(
        {
          ok: false,
          error:
            data.error ||
            "No se pudo cargar la reseña.",
        },
        { status: 400 }
      );
    }

    return Response.json(data);
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al cargar la reseña.";

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

    const pedido = String(data.pedido || "")
      .trim()
      .toUpperCase();

    const codigoEdicion = String(
      data.codigoEdicion || ""
    )
      .trim()
      .toUpperCase();

    const estrellas = Number(data.estrellas || 0);
    const comentario = String(
      data.comentario || ""
    ).trim();

    const mostrarProyecto = Boolean(
      data.mostrarProyecto
    );

    const fotos = Array.isArray(data.fotos)
      ? data.fotos
          .map((foto: unknown) =>
            String(foto || "").trim()
          )
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

    if (!codigoEdicion) {
      return Response.json(
        {
          ok: false,
          error: "Falta el código de edición.",
        },
        { status: 400 }
      );
    }

    if (estrellas < 1 || estrellas > 5) {
      return Response.json(
        {
          ok: false,
          error:
            "La calificación debe ser de 1 a 5 estrellas.",
        },
        { status: 400 }
      );
    }

    if (comentario.length < 3) {
      return Response.json(
        {
          ok: false,
          error:
            "Escribí un comentario sobre tu experiencia.",
        },
        { status: 400 }
      );
    }

    if (fotos.length > 3) {
      return Response.json(
        {
          ok: false,
          error:
            "Podés guardar un máximo de 3 imágenes.",
        },
        { status: 400 }
      );
    }

    if (fotos.length > 0 && !mostrarProyecto) {
      return Response.json(
        {
          ok: false,
          error:
            "Para publicar imágenes, autorizá que el proyecto sea mostrado.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      process.env.GOOGLE_APPS_SCRIPT_URL!,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          tipo: "editar_resena",
          pedido,
          codigoEdicion,
          estrellas,
          comentario,
          mostrarProyecto,
          fotos,
        }),
      }
    );

    const text = await response.text();

    if (!text || !text.trim()) {
      throw new Error(
        "Apps Script devolvió una respuesta vacía."
      );
    }

    const result = JSON.parse(text);

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error:
            result.error ||
            "No se pudo actualizar la reseña.",
        },
        { status: 400 }
      );
    }

    return Response.json({
      ok: true,
      pedido,
      mensaje:
        "La reseña fue actualizada correctamente.",
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al actualizar la reseña.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}