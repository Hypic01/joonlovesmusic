import { describe, it, expect } from "vitest";
import { extractCountry, extractCity, type AddressComponent } from "./placeComponents";

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

describe("extractCity", () => {
  it("prefers locality", () => {
    expect(extractCity(components)).toBe("Minato City");
  });

  it("falls back to postal_town then admin levels", () => {
    expect(
      extractCity([
        { long_name: "Greater London", short_name: "London", types: ["administrative_area_level_2"] },
        { long_name: "London", short_name: "London", types: ["postal_town"] },
      ])
    ).toBe("London");
    expect(
      extractCity([
        { long_name: "California", short_name: "CA", types: ["administrative_area_level_1"] },
      ])
    ).toBe("California");
  });

  it("returns null when no city-like component and for empty input", () => {
    expect(
      extractCity([{ long_name: "Japan", short_name: "JP", types: ["country"] }])
    ).toBeNull();
    expect(extractCity(undefined)).toBeNull();
    expect(extractCity([])).toBeNull();
  });
});
