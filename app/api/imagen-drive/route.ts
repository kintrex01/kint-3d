export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return new Response("ID de imagen inválido.", {
        status: 400,
      });
    }

    const enlaces = [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
      `https://drive.google.com/uc?export=view&id=${id}`,
      `https://drive.usercontent.google.com/download?id=${id}&export=view`,
    ];

    for (const enlace of enlaces) {
      const response = await fetch(enlace, {
        redirect: "follow",
        cache: "no-store",
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (response.ok && contentType.startsWith("image/")) {
        const imagen = await response.arrayBuffer();

        return new Response(imagen, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            /*
             * s-maxage: la CDN de Vercel guarda la foto y no vuelve a pasar
             * por esta función en cada visita (cada pasada cuenta para el
             * límite de transferencia del plan). Una foto nueva en Drive
             * tiene otro ID, así que guardarla una semana no trae problemas.
             */
            "Cache-Control":
              "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
          },
        });
      }
    }

    return new Response("No se pudo cargar la imagen.", {
      status: 404,
    });
  } catch {
    return new Response("Error al cargar la imagen.", {
      status: 500,
    });
  }
}