import { describe, it, expect } from "vitest";
import { buildRows, pickNewTracks, buildSongRow } from "./wrapped-helpers.mjs";

const item = (id, name, artist, isrc) => ({
  track: {
    id,
    name,
    artists: [{ name: artist }],
    external_ids: isrc ? { isrc } : {},
  },
});

describe("buildRows", () => {
  it("maps playlist position to rank, 1-based", () => {
    const { rows, warnings } = buildRows(2023, [
      item("aaa", "Song A", "Artist A", "ISRC1"),
      item("bbb", "Song B", "Artist B", "ISRC2"),
    ]);
    expect(warnings).toEqual([]);
    expect(rows).toEqual([
      { year: 2023, rank: 1, spotify_track_id: "aaa", isrc: "ISRC1", track_name: "Song A", artist_name: "Artist A" },
      { year: 2023, rank: 2, spotify_track_id: "bbb", isrc: "ISRC2", track_name: "Song B", artist_name: "Artist B" },
    ]);
  });

  it("skips null/local tracks with a warning without shifting later ranks", () => {
    const { rows, warnings } = buildRows(2020, [
      item("aaa", "Song A", "Artist A", "ISRC1"),
      { track: null },
      item("ccc", "Song C", "Artist C", null),
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 3]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("2020");
    expect(warnings[0]).toContain("position 2");
  });

  it("stores null isrc when Spotify has none", () => {
    const { rows } = buildRows(2020, [item("aaa", "Song A", "Artist A", null)]);
    expect(rows[0].isrc).toBeNull();
  });

  it("joins multiple artists with a comma like the songs table does", () => {
    const { rows } = buildRows(2023, [
      {
        track: {
          id: "aaa",
          name: "Collab",
          artists: [{ name: "One" }, { name: "Two" }],
          external_ids: { isrc: "X" },
        },
      },
    ]);
    expect(rows[0].artist_name).toBe("One, Two");
  });
});

describe("pickNewTracks", () => {
  const t = (id, isrc) => ({ id, name: id, artists: [], external_ids: isrc ? { isrc } : {} });

  it("drops tracks already in the catalog by id or isrc", () => {
    const picked = pickNewTracks(
      [t("aaa", "I1"), t("bbb", "I2"), t("ccc", "I3")],
      new Set(["aaa"]),
      new Set(["I2"])
    );
    expect(picked.map((x) => x.id)).toEqual(["ccc"]);
  });

  it("dedupes new tracks against each other by id and isrc, first wins", () => {
    const picked = pickNewTracks(
      [t("aaa", "SAME"), t("aaa", "SAME"), t("bbb", "SAME"), t("ccc", null), t("ddd", null)],
      new Set(),
      new Set()
    );
    expect(picked.map((x) => x.id)).toEqual(["aaa", "ccc", "ddd"]);
  });
});

describe("buildSongRow", () => {
  it("maps a raw track to an unrated songs row", () => {
    const row = buildSongRow({
      id: "aaa",
      name: "Song A",
      artists: [{ name: "One" }, { name: "Two" }],
      external_ids: { isrc: "ISRC1" },
      album: {
        name: "Album A",
        images: [{ url: "https://img/cover.jpg" }],
        release_date: "2019-03-15",
        album_type: "album",
      },
      duration_ms: 201000,
      explicit: true,
      track_number: 3,
      disc_number: 1,
    });
    expect(row).toEqual({
      title: "Song A",
      artist: "One, Two",
      rating: null,
      cover_url: "https://img/cover.jpg",
      album_name: "Album A",
      release_date: "2019-03-15",
      album_type: "album",
      spotify_track_id: "aaa",
      isrc: "ISRC1",
      duration_ms: 201000,
      explicit: true,
      track_number: 3,
      disc_number: 1,
    });
  });

  it("tolerates missing album/metadata with nulls", () => {
    const row = buildSongRow({ id: "aaa", name: "Bare", artists: [{ name: "X" }], external_ids: {} });
    expect(row.cover_url).toBeNull();
    expect(row.album_name).toBeNull();
    expect(row.isrc).toBeNull();
    expect(row.rating).toBeNull();
  });
});
