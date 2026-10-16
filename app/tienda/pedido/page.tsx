import { redirect } from "next/navigation";

/*
 * El seguimiento de las compras de la tienda (TND) ahora vive en
 * /seguimiento (Consultar pedido). Esta ruta queda solo para los
 * links de correos viejos: redirige conservando ?n= y ?e=.
 */
export default async function PedidoTiendaRedireccion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const destino = new URLSearchParams();

  for (const clave of ["n", "e"]) {
    const valor = parametros[clave];
    const texto = Array.isArray(valor) ? valor[0] : valor;
    if (texto) destino.set(clave, texto);
  }

  const query = destino.toString();
  redirect(query ? `/seguimiento?${query}` : "/seguimiento");
}
