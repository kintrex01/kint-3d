export async function GET() {
  try {
    const response = await fetch(
      `${process.env.GOOGLE_APPS_SCRIPT_URL}?tipo=resenas`
    );

    const text = await response.text();
    const data = JSON.parse(text);

    if (!data.ok) {
      throw new Error(data.error || "Error al obtener reseñas.");
    }

    return Response.json(data);
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al obtener reseñas.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
        tipo: "resena",
        pedido: data.pedido,
        estrellas: data.estrellas,
        comentario: data.comentario,
        mostrarProyecto: data.mostrarProyecto,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();
    const result = JSON.parse(text);

    if (!result.ok) {
      throw new Error(result.error || "Error al guardar la reseña.");
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al enviar la reseña.",
      },
      { status: 500 }
    );
  }
}