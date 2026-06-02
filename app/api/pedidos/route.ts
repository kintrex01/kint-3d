import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo") as File | null;

    let archivoBase64 = "";
    let archivoNombre = "";
    let archivoTipo = "";

    if (archivo && archivo.size > 0) {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      archivoBase64 = buffer.toString("base64");
      archivoNombre = archivo.name;
      archivoTipo = archivo.type || "application/octet-stream";
    }

    const payload = {
      nombre: String(formData.get("nombre") || ""),
      email: String(formData.get("email") || ""),
      telefono: String(formData.get("telefono") || ""),
      fechaEntrega: String(formData.get("fechaEntrega") || ""),
      escala: String(formData.get("escala") || ""),
      color: String(formData.get("color") || ""),
      armado: String(formData.get("armado") || ""),
      alisado: String(formData.get("alisado") || ""),
      boquilla: String(formData.get("boquilla") || ""),
      comentarios: String(formData.get("comentarios") || ""),
      codigoDescuento: String(formData.get("codigoDescuento") || ""),
      archivoBase64,
      archivoNombre,
      archivoTipo,
    };

    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    const text = await response.text();

console.log("RESPUESTA APPS SCRIPT:", text);

let data;
try {
  data = JSON.parse(text);
} catch {
  throw new Error("Apps Script no devolvió JSON. Respuesta: " + text.slice(0, 300));
}

    if (!data.ok) {
      throw new Error(data.error || "Error en Apps Script");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log("RESEND KEY EXISTE:", !!process.env.RESEND_API_KEY);

    const emailResult = await resend.emails.send({
      from: "Kint 3D <onboarding@resend.dev>",
      to: "kint3d.uy@gmail.com",
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
  <p><strong>Archivo:</strong> ${archivoNombre || "Sin archivo"}</p>
  <p><strong>Comentarios:</strong></p>
  <p>${payload.comentarios || "Sin comentarios"}</p>
      `,
    });

    console.log("RESEND RESULT:", emailResult);

    return Response.json({
      ok: true,
      pedido: data.pedido,
    });
  } catch (error: any) {
    console.error("ERROR PEDIDO:", error);

    return Response.json(
      {
        ok: false,
        error: error?.message || JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}