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

    const pedido = String(data.pedido || "").trim();
    const codigo = String(data.codigo || "").trim();
    const estrellas = Number(data.estrellas || 0);
    const comentario = String(data.comentario || "").trim();
    const mostrarProyecto = Boolean(data.mostrarProyecto);

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

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
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
        mostrarProyecto,
      }),
    });

    const text = await response.text();
    const result = JSON.parse(text);

    if (!result.ok) {
      throw new Error(result.error || "Error al guardar la reseña.");
    }

    return Response.json({
      ok: true,
      idResena: result.idResena,
      codigoEdicion: result.codigoEdicion,
      fechaLimiteEdicion: result.fechaLimiteEdicion,
    });
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al enviar la reseña.";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 }
    );
  }
}