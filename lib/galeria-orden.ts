/*
 * Orden de la galería (el mismo en /galeria y en Configuración › Galeria):
 * 1) las que ordenaste a mano (Galeria destacadas), en ese orden;
 * 2) las que tienen reseña, de más likes a menos;
 * 3) el resto, de más likes a menos (y después como vienen: de la más nueva a la más vieja).
 */
export type ItemOrdenable = { destacado?: number; likes?: number; tieneResena?: boolean; resena?: unknown };

export function ordenarGaleria<T extends ItemOrdenable>(items: T[]): T[] {
  const grupo = (item: T) => (item.destacado ? 0 : item.tieneResena || item.resena ? 1 : 2);
  return items
    .map((item, orden) => ({ item, orden }))
    .sort(
      (a, b) =>
        grupo(a.item) - grupo(b.item) ||
        (grupo(a.item) === 0 ? (a.item.destacado ?? 0) - (b.item.destacado ?? 0) : (b.item.likes ?? 0) - (a.item.likes ?? 0)) ||
        a.orden - b.orden
    )
    .map(({ item }) => item);
}
