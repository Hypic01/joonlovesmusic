import { describe, it, expect } from "vitest";
import { buildWrappedFilter } from "@/lib/wrapped";

describe("buildWrappedFilter", () => {
  it("matches on both identifiers when both exist", () => {
    expect(buildWrappedFilter("abc123", "USUM72309521")).toBe(
      "spotify_track_id.eq.abc123,isrc.eq.USUM72309521"
    );
  });

  it("matches on track id alone", () => {
    expect(buildWrappedFilter("abc123", null)).toBe("spotify_track_id.eq.abc123");
    expect(buildWrappedFilter("abc123", undefined)).toBe("spotify_track_id.eq.abc123");
  });

  it("matches on isrc alone", () => {
    expect(buildWrappedFilter(null, "USUM72309521")).toBe("isrc.eq.USUM72309521");
  });

  it("returns null when the song has neither identifier", () => {
    expect(buildWrappedFilter(null, null)).toBeNull();
    expect(buildWrappedFilter(undefined, undefined)).toBeNull();
    expect(buildWrappedFilter("", "")).toBeNull();
  });
});
