import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payload = {
      nombre: String(body.nombre || ""),
      email: String(body.email || ""),
      telefono: String(body.telefono || ""),
      fechaEntrega: String(body.fechaEntrega || ""),
      escala: String(body.escala || ""),
      color: String(body.color || ""),
      armado: String(body.armado || ""),
      alisado: String(body.alisado || ""),
      boquilla: String(body.boquilla || ""),
      comentarios: String(body.comentarios || ""),
      codigoDescuento: String(body.codigoDescuento || ""),

      archivoNombre: String(body.archivoNombre || ""),
      archivoLink: String(body.archivoLink || ""),
      archivoId: String(body.archivoId || ""),
    };

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify({
  ...payload,
  archivoNombre: "",
  archivoLink: "",
  archivoId: "",
}),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Apps Script no devolvió JSON. Respuesta: " + text.slice(0, 300));
    }

    if (!data.ok) {
      throw new Error(data.error || "Error en Apps Script");
    }

    let archivoNombreFinal = payload.archivoNombre;
    let archivoLinkFinal = payload.archivoLink;
    let archivoIdFinal = payload.archivoId;

    if (payload.archivoId && data.pedido) {
      const nombreArchivo = payload.archivoId.split("/").pop() || payload.archivoNombre;
      const rutaNueva = `${data.pedido}/${nombreArchivo}`;

      const { error: moveError } = await supabase.storage
        .from("kint-archivos")
        .move(payload.archivoId, rutaNueva);

      if (moveError) {
        throw new Error("Pedido creado, pero no se pudo mover el archivo: " + moveError.message);
      }

      archivoIdFinal = rutaNueva;

      archivoLinkFinal = supabase.storage
        .from("kint-archivos")
        .getPublicUrl(rutaNueva).data.publicUrl;
    }

    if (payload.archivoId && data.pedido) {
      await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
        method: "POST",
        body: JSON.stringify({
          tipo: "archivo_adicional_link",
          pedido: data.pedido,
          codigo: data.codigoSeguimiento,
          archivos: [
            {
              nombreArchivo: archivoNombreFinal,
              link: archivoLinkFinal,
              idDrive: archivoIdFinal,
            },
          ],
        }),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Kint 3D <onboarding@resend.dev>",
      to: "alecap12345@gmail.com",
      subject: `Nuevo pedido Kint 3D - ${data.pedido}`,
      html: `
        <h2>Nuevo pedido recibido</h2>
        <p><strong>N° Pedido:</strong> ${data.pedido}</p>
        <p><strong>Nombre:</strong> ${payload.nombre}</p>
        <p><strong>Email cliente:</strong> ${payload.email}</p>
        <p><strong>WhatsApp:</strong> ${payload.telefono}</p>
        <p><strong>Fecha entrega:</strong> ${payload.fechaEntrega || "Sin fecha"}</p>
        <p><strong>Escala:</strong> ${payload.escala}</p>
        <p><strong>Color:</strong> ${payload.color}</p>
        <p><strong>Armado:</strong> ${payload.armado}</p>
        <p><strong>Alisado:</strong> ${payload.alisado}</p>
        <p><strong>Boquilla:</strong> ${payload.boquilla}</p>
        <p><strong>Archivo:</strong> ${archivoNombreFinal || "Sin archivo"}</p>
        <p><strong>Comentarios:</strong></p>
        <p>${payload.comentarios || "Sin comentarios"}</p>
      `,
    });

    return Response.json({
      ok: true,
      pedido: data.pedido,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error al enviar pedido.",
      },
      { status: 500 }
    );
  }
}