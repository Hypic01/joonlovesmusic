import { describe, it, expect } from "vitest";
import {
  MEMORY_MAX_FILE_BYTES,
  validateMemoryFile,
  isHeicFile,
  computeScaledSize,
  computeSquareCrop,
} from "./imageRenditions";

describe("validateMemoryFile", () => {
  it("accepts jpeg/png/heic under the size cap", () => {
    expect(validateMemoryFile({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
    expect(validateMemoryFile({ name: "a.png", size: 1000, type: "image/png" })).toBeNull();
    expect(validateMemoryFile({ name: "IMG_1.HEIC", size: 1000, type: "" })).toBeNull();
  });
  it("rejects oversized files with a clear message", () => {
    const err = validateMemoryFile({ name: "a.jpg", size: MEMORY_MAX_FILE_BYTES + 1, type: "image/jpeg" });
    expect(err).toMatch(/20MB/);
  });
  it("rejects unsupported types", () => {
    expect(validateMemoryFile({ name: "a.gif", size: 10, type: "image/gif" })).toMatch(/JPEG, PNG, or HEIC/);
    expect(validateMemoryFile({ name: "a.pdf", size: 10, type: "application/pdf" })).not.toBeNull();
  });
});

describe("isHeicFile", () => {
  it("detects by mime type and by extension (case-insensitive)", () => {
    expect(isHeicFile("x", "image/heic")).toBe(true);
    expect(isHeicFile("x", "image/heif")).toBe(true);
    expect(isHeicFile("IMG_0001.HEIC", "")).toBe(true);
    expect(isHeicFile("photo.heif", "")).toBe(true);
    expect(isHeicFile("photo.jpg", "image/jpeg")).toBe(false);
  });
});

describe("computeScaledSize", () => {
  it("keeps small images as-is", () => {
    expect(computeScaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it("scales the longest side down to maxDim, preserving aspect", () => {
    expect(computeScaledSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(computeScaledSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});

describe("computeSquareCrop", () => {
  it("center-crops landscape and portrait", () => {
    expect(computeSquareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 });
    expect(computeSquareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, size: 3000 });
    expect(computeSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 });
  });
});
