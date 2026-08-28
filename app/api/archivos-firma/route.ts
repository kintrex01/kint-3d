import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXTENSIONES_PERMITIDAS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
];

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
        "No se recibieron imágenes."
      );
    }

    if (archivos.length > 3) {
      throw new Error(
        "Podés subir un máximo de 3 imágenes."
      );
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

      const tipo = String(
        archivo.tipo || ""
      )
        .trim()
        .toLowerCase();

      const pesoArchivo = Number(
        archivo.size || 0
      );

      if (!nombreOriginal) {
        throw new Error(
          "Una de las imágenes no tiene nombre."
        );
      }

      const extension =
        nombreOriginal
          .split(".")
          .pop()
          ?.toLowerCase() || "";

      if (
        !FORMATOS_PERMITIDOS.includes(tipo) ||
        !EXTENSIONES_PERMITIDAS.includes(extension)
      ) {
        throw new Error(
          `${nombreOriginal} no tiene un formato válido.`
        );
      }

      if (pesoArchivo <= 0) {
        throw new Error(
          `${nombreOriginal} está vacío.`
        );
      }

      if (
        pesoArchivo >
        8 * 1024 * 1024
      ) {
        throw new Error(
          `${nombreOriginal} supera los 8 MB.`
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
          ) || "imagen";

      const nombreFinal =
        `${pedidoSeguro}-${nombreBaseSeguro}.${extension}`;

      const ruta =
        `resenas/${pedidoSeguro}/` +
        `${randomUUID()}/` +
        `${nombreFinal}`;

      const {
        data,
        error,
      } = await supabase.storage
        .from("kint-archivos")
        .createSignedUploadUrl(ruta);

      if (error) {
        throw new Error(
          `Supabase no pudo preparar ${nombreOriginal}: ${error.message}`
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
    console.error(
      "ERROR PREPARANDO FOTOS DE RESEÑA:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error al preparar las imágenes.",
      },
      {
        status: 500,
      }
    );
  }
}