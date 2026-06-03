import { describe, it, expect } from "vitest";
import { buildSearchIndex, matchSearch, type MapPinWithSong } from "./mapSearch";
import type { Song } from "@/types/database";

function song(overrides: Partial<Song>): Song {
  return {
    id: "s1",
    title: "Title",
    artist: "Artist",
    rating: 80,
    rank: 1,
    cover_url: null,
    comment: null,
    created_at: "2024-01-01",
    album_name: "Album",
    ...overrides,
  } as Song;
}

function pin(id: string, s: Song, extra: Partial<MapPinWithSong> = {}): MapPinWithSong {
  return {
    id,
    song_id: s.id,
    place_name: "Tokyo",
    lat: 35.6,
    lng: 139.7,
    google_place_id: null,
    country: "Japan",
    note: null,
    created_at: "2024-01-01",
    songs: s,
    ...extra,
  };
}

describe("buildSearchIndex", () => {
  it("produces typed, de-duplicated entries from pins", () => {
    const s = song({ id: "s1", title: "Lisbon", artist: "Beach House", album_name: "Bloom" });
    const pins = [
      pin("p1", s, { place_name: "Lisbon", country: "Portugal" }),
      pin("p2", s, { place_name: "Porto", country: "Portugal" }),
    ];
    const index = buildSearchIndex(pins);

    expect(index.filter((e) => e.type === "song")).toHaveLength(1);
    expect(index.filter((e) => e.type === "country")).toHaveLength(1);
    const country = index.find((e) => e.type === "country")!;
    expect(country.label).toBe("Portugal");
    expect(country.pinIds.sort()).toEqual(["p1", "p2"]);
  });

  it("splits multi-artist strings on commas", () => {
    const s = song({ id: "s2", artist: "Jay-Z, Kanye West" });
    const index = buildSearchIndex([pin("p1", s)]);
    const artists = index.filter((e) => e.type === "artist").map((e) => e.label).sort();
    expect(artists).toEqual(["Jay-Z", "Kanye West"]);
  });

  it("skips null album/country", () => {
    const s = song({ id: "s3", album_name: null });
    const index = buildSearchIndex([pin("p1", s, { country: null })]);
    expect(index.some((e) => e.type === "album")).toBe(false);
    expect(index.some((e) => e.type === "country")).toBe(false);
  });
});

describe("matchSearch", () => {
  const s = song({ id: "s1", title: "Lisbon", artist: "Beach House", album_name: "Bloom" });
  const index = buildSearchIndex([pin("p1", s, { place_name: "Lisbon", country: "Portugal" })]);

  it("matches case-insensitively across types and can return the same keyword twice", () => {
    const results = matchSearch(index, "lis");
    const labels = results.map((r) => `${r.type}:${r.label}`).sort();
    expect(labels).toContain("song:Lisbon");
    expect(labels).toContain("place:Lisbon");
  });

  it("returns empty for blank query", () => {
    expect(matchSearch(index, "   ")).toEqual([]);
  });

  it("ranks prefix matches before substring matches", () => {
    const s2 = song({ id: "s2", title: "Best Lisbon", artist: "X", album_name: null });
    const idx = buildSearchIndex([
      pin("p1", s, { place_name: "Lisbon", country: null }),
      pin("p2", s2, { place_name: "Aaa", country: null }),
    ]);
    const results = matchSearch(idx, "lis").filter((r) => r.type === "song");
    expect(results[0].label).toBe("Lisbon");
  });
});
