import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pedido = String(body.pedido || "")
      .trim()
      .toUpperCase();

    const archivos = Array.isArray(body.archivos)
      ? body.archivos
      : [];

    if (!pedido) {
      throw new Error(
        "Falta el número de pedido."
      );
    }

    if (!archivos.length) {
      throw new Error(
        "No se recibieron archivos."
      );
    }

    // Tope por pedido: nadie puede pedir cientos de permisos de subida.
    if (archivos.length > 15) {
      throw new Error("Podés subir hasta 15 archivos por pedido.");
    }

    // Pedido real o el provisorio de Cotizar (todavía sin número).
    if (!/^((KNT|TND)-\d{1,6}|COTIZACION-TEMP)$/.test(pedido)) {
      throw new Error("El número de pedido no es válido.");
    }

    const pedidoSeguro = pedido.replace(
      /[^A-Z0-9_-]/g,
      ""
    );

    if (!pedidoSeguro) {
      throw new Error(
        "El número de pedido no es válido."
      );
    }

    const firmados = [];

    for (const archivo of archivos) {
      const nombreOriginal = String(
        archivo.nombre || ""
      ).trim();

      const pesoArchivo = Number(
        archivo.size || 0
      );

      if (!nombreOriginal) {
        throw new Error(
          "Uno de los archivos no tiene nombre."
        );
      }

      const extension = nombreOriginal
        .split(".")
        .pop()
        ?.toLowerCase();

      if (
        extension !== "stl" &&
        extension !== "skp"
      ) {
        throw new Error(
          "Solo se permiten archivos STL o SKP."
        );
      }

      if (pesoArchivo <= 0) {
        throw new Error(
          `${nombreOriginal} está vacío.`
        );
      }

      if (
        pesoArchivo >
        50 * 1024 * 1024
      ) {
        throw new Error(
          `${nombreOriginal} supera los 50 MB.`
        );
      }

      const nombreSinExtension =
        nombreOriginal.replace(
          /\.[^.]+$/,
          ""
        );

      const nombreBaseSeguro =
        nombreSinExtension
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(/\s+/g, "_")
          .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
          )
          .replace(/_+/g, "_")
          .replace(
            /^_+|_+$/g,
            ""
          ) || "archivo";

      const nombreFinal =
        `${pedidoSeguro}-${nombreBaseSeguro}.${extension}`;

      const ruta =
        `${pedidoSeguro}/${randomUUID()}/${nombreFinal}`;

      // Si Supabase tiene un corte corto (ej. se reinicia), se reintenta.
      let data: { signedUrl: string; token: string; path: string } | null = null;
      let ultimoError = "";
      for (let intento = 0; intento < 4 && !data; intento++) {
        if (intento) await new Promise((listo) => setTimeout(listo, 1500 * intento));
        const resultado = await supabase.storage.from("kint-archivos").createSignedUploadUrl(ruta);
        if (resultado.error) ultimoError = resultado.error.message;
        else data = resultado.data;
      }

      if (!data) {
        throw new Error(
          `El servidor de archivos no responde (${ultimoError}). Esperá un minuto y probá de nuevo.`
        );
      }

      const publicUrl =
        supabase.storage
          .from("kint-archivos")
          .getPublicUrl(ruta)
          .data.publicUrl;

      firmados.push({
        nombreArchivo: nombreFinal,
        nombreOriginal,
        ruta,
        token: data.token,
        signedUrl: data.signedUrl,
        link: publicUrl,
      });
    }

    return Response.json({
      ok: true,
      archivos: firmados,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error al preparar subida.",
      },
      {
        status: 500,
      }
    );
  }
}