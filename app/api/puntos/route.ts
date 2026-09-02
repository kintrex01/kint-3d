export async function POST(request: Request) {
  try {
    const body = await request.json();

    const accion = String(
      body.accion || "usar"
    )
      .trim()
      .toLowerCase();

    let tipo = "usar_puntos";

    if (accion === "quitar") {
      tipo = "quitar_puntos";
    }

    if (accion === "usar_saldo") {
      tipo = "usar_puntos_saldo";
    }

    const payload: any = {
      tipo,
      pedido: body.pedido,
      codigo: body.codigo,
    };

    if (
      tipo === "usar_puntos" ||
      tipo === "usar_puntos_saldo"
    ) {
      payload.puntos = Number(
        body.puntos || 0
      );
    }

    if (tipo === "usar_puntos") {
      payload.confirmarReemplazoBeneficio =
        body.confirmarReemplazoBeneficio === true;
    }

    const response = await fetch(
      process.env.GOOGLE_APPS_SCRIPT_URL!,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
      }
    );

    const text =
      await response.text();

    const data =
      JSON.parse(text);

    return Response.json(data);
  } catch (error: any) {
    return Response.json({
      ok: false,
      error:
        error?.message ||
        "Error al procesar Puntos Kint.",
    });
  }
}