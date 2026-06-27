import { describe, it, expect } from "vitest";
import { buildSongSearchFilter } from "./mapSearch";

describe("buildSongSearchFilter", () => {
  it("targets title, artist, and album columns", () => {
    expect(buildSongSearchFilter("bloom")).toBe(
      'title.ilike."%bloom%",artist.ilike."%bloom%",album_name.ilike."%bloom%"'
    );
  });

  it("trims surrounding whitespace", () => {
    expect(buildSongSearchFilter("  porto  ")).toBe(
      'title.ilike."%porto%",artist.ilike."%porto%",album_name.ilike."%porto%"'
    );
  });

  it("keeps commas inside the quoted term so multi-word artists stay intact", () => {
    const filter = buildSongSearchFilter("Tyler, the Creator");
    expect(filter).toContain('title.ilike."%Tyler, the Creator%"');
  });

  it("escapes backslashes and double quotes", () => {
    expect(buildSongSearchFilter('a"b\\c')).toContain('"%a\\"b\\\\c%"');
  });
});
