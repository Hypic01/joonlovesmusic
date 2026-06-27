import { describe, it, expect } from "vitest";
import { derivePlaceCategory } from "./placeCategory";

describe("derivePlaceCategory", () => {
  it("maps a known primary type to a friendly label", () => {
    expect(derivePlaceCategory(["restaurant", "food", "point_of_interest", "establishment"])).toBe(
      "Restaurant"
    );
    expect(derivePlaceCategory(["lodging", "establishment"])).toBe("Hotel");
    expect(derivePlaceCategory(["premise"])).toBe("Building");
  });

  it("skips generic types and title-cases an unmapped specific type", () => {
    expect(derivePlaceCategory(["establishment", "point_of_interest", "amusement_park"])).toBe(
      "Amusement Park"
    );
  });

  it("returns null when only generic types or no types are present", () => {
    expect(derivePlaceCategory(["establishment", "point_of_interest", "political"])).toBeNull();
    expect(derivePlaceCategory([])).toBeNull();
    expect(derivePlaceCategory(undefined)).toBeNull();
  });
});
