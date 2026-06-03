import { describe, it, expect } from "vitest";
import { extractCountry, type AddressComponent } from "./placeComponents";

const components: AddressComponent[] = [
  { long_name: "Tokyo Tower", short_name: "Tokyo Tower", types: ["point_of_interest"] },
  { long_name: "Minato City", short_name: "Minato City", types: ["locality"] },
  { long_name: "Japan", short_name: "JP", types: ["country", "political"] },
];

describe("extractCountry", () => {
  it("returns the country long_name when a country component exists", () => {
    expect(extractCountry(components)).toBe("Japan");
  });

  it("returns null when no country component exists", () => {
    expect(
      extractCountry([{ long_name: "Nowhere", short_name: "NW", types: ["locality"] }])
    ).toBeNull();
  });

  it("returns null for undefined/empty input", () => {
    expect(extractCountry(undefined)).toBeNull();
    expect(extractCountry([])).toBeNull();
  });
});
