import { describe, it, expect } from "vitest";
import { exifToPhotoMeta } from "./photoExif";

describe("exifToPhotoMeta", () => {
  it("passes through valid GPS and formats the timestamp as a datetime-local value", () => {
    const meta = exifToPhotoMeta(
      { latitude: 33.394, longitude: 126.24 },
      new Date(2024, 2, 15, 21, 42, 7)
    );
    expect(meta).toEqual({ lat: 33.394, lng: 126.24, takenAt: "2024-03-15T21:42" });
  });
  it("returns null coords when GPS is missing or partial", () => {
    expect(exifToPhotoMeta(undefined, null)).toEqual({ lat: null, lng: null, takenAt: null });
    expect(exifToPhotoMeta({ latitude: 33.4, longitude: undefined }, null).lat).toBeNull();
  });
  it("rejects out-of-range and null-island coordinates", () => {
    expect(exifToPhotoMeta({ latitude: 91, longitude: 10 }, null).lat).toBeNull();
    expect(exifToPhotoMeta({ latitude: 10, longitude: 181 }, null).lng).toBeNull();
    expect(exifToPhotoMeta({ latitude: 0, longitude: 0 }, null)).toEqual({ lat: null, lng: null, takenAt: null });
  });
  it("rejects invalid Dates and non-Date timestamps", () => {
    expect(exifToPhotoMeta(null, new Date("garbage")).takenAt).toBeNull();
    expect(exifToPhotoMeta(null, "2024:03:15 21:42:07").takenAt).toBeNull();
  });
});
