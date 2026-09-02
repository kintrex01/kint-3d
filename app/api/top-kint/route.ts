export async function GET() {
  try {
    const baseUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!baseUrl) {
      return Response.json(
        {
          ok: false,
          habilitado: false,
          ranking: [],
          error:
            "Falta GOOGLE_APPS_SCRIPT_URL.",
        },
        {
          status: 500,
        }
      );
    }

    const url =
      `${baseUrl}` +
      `?tipo=top_kint&limite=3`;

    const response =
  await fetch(url, {
    next: {
      revalidate: 120,
    },
  });

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        {
          ok: false,
          habilitado: false,
          ranking: [],
          error:
            "Apps Script no devolvió JSON válido.",
          respuesta: text,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json(
      data
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        habilitado: false,
        ranking: [],
        error:
          error?.message ||
          "No se pudo cargar Top Kint.",
      },
      {
        status: 500,
      }
    );
  }
}