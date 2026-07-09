import { describe, it, expect } from "vitest";
import { getRatingColor, displayRating } from "@/lib/ratingColors";

describe("getRatingColor", () => {
  it("keeps the 3-color gradient for numbers", () => {
    expect(getRatingColor(0)).toBe("#FF0000");
    expect(getRatingColor(49)).toBe("#FF0000");
    expect(getRatingColor(50)).toBe("#FFCC33");
    expect(getRatingColor(69)).toBe("#FFCC33");
    expect(getRatingColor(70)).toBe("#66CC33");
    expect(getRatingColor(100)).toBe("#66CC33");
  });

  it("returns neutral gray for unrated", () => {
    expect(getRatingColor(null)).toBe("#D4D4D4");
    expect(getRatingColor(undefined)).toBe("#D4D4D4");
  });
});

describe("displayRating", () => {
  it("shows the number for rated songs", () => {
    expect(displayRating(87)).toBe("87");
    expect(displayRating(0)).toBe("0");
  });

  it("shows an en-dash for unrated songs", () => {
    expect(displayRating(null)).toBe("–");
    expect(displayRating(undefined)).toBe("–");
  });
});
