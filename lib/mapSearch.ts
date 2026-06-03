import type { MapPin, Song } from "@/types/database";

export interface MapPinWithSong extends MapPin {
  songs: Song;
}

export type SearchType = "song" | "artist" | "album" | "place" | "country";

export interface SearchEntry {
  type: SearchType;
  label: string;
  pinIds: string[];
}

/** Build a de-duplicated, typed search index from pins (only pinned songs). */
export function buildSearchIndex(pins: MapPinWithSong[]): SearchEntry[] {
  const map = new Map<string, SearchEntry>();

  const add = (type: SearchType, rawLabel: string | null | undefined, pinId: string) => {
    const label = (rawLabel ?? "").trim();
    if (!label) return;
    const key = `${type} ${label.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.pinIds.includes(pinId)) existing.pinIds.push(pinId);
    } else {
      map.set(key, { type, label, pinIds: [pinId] });
    }
  };

  for (const pin of pins) {
    const s = pin.songs;
    add("song", s.title, pin.id);
    for (const artist of s.artist.split(",")) add("artist", artist, pin.id);
    add("album", s.album_name, pin.id);
    add("place", pin.place_name, pin.id);
    add("country", pin.country, pin.id);
  }

  return Array.from(map.values());
}

/** Filter the index by query; prefix matches rank before substring matches. */
export function matchSearch(index: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = index.filter((e) => e.label.toLowerCase().includes(q));
  return matches.sort((a, b) => {
    const aPrefix = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.label.localeCompare(b.label);
  });
}
