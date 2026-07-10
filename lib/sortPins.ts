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

export type PinListSort = "newest" | "oldest" | "score" | "moment";

export const PIN_SORT_OPTIONS: { value: PinListSort; label: string }[] = [
  { value: "newest", label: "Newest added" },
  { value: "oldest", label: "Oldest added" },
  { value: "score", label: "Score: high to low" },
  { value: "moment", label: "Moment: newest" },
];

/**
 * Orders pins for the flat list view on /map. Score uses the linked song's
 * rating (unrated pins last); moment uses taken_at as a wall-clock string
 * (pins without a moment last). Ties fall back to newest-added. Pure and
 * non-mutating.
 */
export function sortPinsForList<
  T extends { created_at: string; taken_at?: string | null; songs: { rating: number | null } }
>(pins: T[], sort: PinListSort): T[] {
  if (sort === "newest" || sort === "oldest") return sortPins(pins, sort);
  return [...pins].sort((a, b) => {
    if (sort === "score") {
      const ar = a.songs.rating;
      const br = b.songs.rating;
      if (ar == null && br == null) return comparePinsByCreatedAt(a, b, "newest");
      if (ar == null) return 1;
      if (br == null) return -1;
      if (br !== ar) return br - ar;
      return comparePinsByCreatedAt(a, b, "newest");
    }
    const am = a.taken_at ?? null;
    const bm = b.taken_at ?? null;
    if (am == null && bm == null) return comparePinsByCreatedAt(a, b, "newest");
    if (am == null) return 1;
    if (bm == null) return -1;
    // Wall-clock strings ("2025-01-15T21:42") order correctly as text.
    if (am !== bm) return bm.localeCompare(am);
    return comparePinsByCreatedAt(a, b, "newest");
  });
}
