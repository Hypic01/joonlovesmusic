export type PinSortOrder = "newest" | "oldest";

/**
 * Pure comparator that orders two records by their `created_at` timestamp.
 * Unparseable dates are treated as epoch 0 so they sort to the end/start
 * deterministically rather than throwing. Extracted for unit testing.
 */
export function comparePinsByCreatedAt<T extends { created_at: string }>(
  a: T,
  b: T,
  order: PinSortOrder
): number {
  const at = new Date(a.created_at).getTime();
  const bt = new Date(b.created_at).getTime();
  const an = Number.isNaN(at) ? 0 : at;
  const bn = Number.isNaN(bt) ? 0 : bt;
  return order === "newest" ? bn - an : an - bn;
}

/** Returns a new array of pins sorted by created_at without mutating the input. */
export function sortPins<T extends { created_at: string }>(
  pins: T[],
  order: PinSortOrder
): T[] {
  return [...pins].sort((a, b) => comparePinsByCreatedAt(a, b, order));
}
