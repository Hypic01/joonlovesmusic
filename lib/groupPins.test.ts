import { describe, it, expect } from "vitest";
import { groupPins, UNKNOWN_GROUP } from "./groupPins";
import type { MapPinWithSong } from "./mapSearch";

function pin(
  place_name: string,
  country: string | null,
  city: string | null,
  title: string = place_name
): MapPinWithSong {
  return {
    id: `${place_name}:${title}`,
    song_id: "s",
    place_name,
    lat: 0,
    lng: 0,
    country,
    city,
    place_category: null,
    created_at: "2026-01-01",
    songs: { title } as MapPinWithSong["songs"],
  } as MapPinWithSong;
}

describe("groupPins", () => {
  it("nests pins under country then city then place, sorted alphabetically", () => {
    const grouped = groupPins([
      pin("Tokyo Tower", "Japan", "Tokyo"),
      pin("Eiffel Tower", "France", "Paris"),
      pin("Shibuya Crossing", "Japan", "Tokyo"),
      pin("Osaka Castle", "Japan", "Osaka"),
    ]);

    expect(grouped.map((c) => c.country)).toEqual(["France", "Japan"]);
    const japan = grouped.find((c) => c.country === "Japan")!;
    expect(japan.count).toBe(3);
    expect(japan.cities.map((c) => c.city)).toEqual(["Osaka", "Tokyo"]);
    const tokyo = japan.cities.find((c) => c.city === "Tokyo")!;
    expect(tokyo.count).toBe(2);
    expect(tokyo.places.map((p) => p.place_name)).toEqual(["Shibuya Crossing", "Tokyo Tower"]);
  });

  it("groups multiple songs at the same place under one place node", () => {
    const grouped = groupPins([
      pin("Jeju Island", "South Korea", null, "Kids in Love"),
      pin("Jeju Island", "South Korea", null, "Another Song"),
    ]);
    const korea = grouped.find((c) => c.country === "South Korea")!;
    expect(korea.loosePlaces).toHaveLength(1);
    expect(korea.loosePlaces[0].place_name).toBe("Jeju Island");
    expect(korea.loosePlaces[0].pins).toHaveLength(2);
    expect(korea.count).toBe(2);
  });

  it("buckets a missing country under 'Other' and sorts it last", () => {
    const grouped = groupPins([
      pin("Mystery Spot", null, null),
      pin("Eiffel Tower", "France", "Paris"),
    ]);
    expect(grouped.map((c) => c.country)).toEqual(["France", UNKNOWN_GROUP]);
    const other = grouped.find((c) => c.country === UNKNOWN_GROUP)!;
    // No city: the place sits directly under the country, with no city level.
    expect(other.cities).toEqual([]);
    expect(other.loosePlaces.map((p) => p.place_name)).toEqual(["Mystery Spot"]);
  });

  it("lists a known-country / unknown-city place directly under the country", () => {
    const grouped = groupPins([pin("Jeju Island", "South Korea", null)]);
    const korea = grouped.find((c) => c.country === "South Korea")!;
    expect(korea.cities).toEqual([]);
    expect(korea.loosePlaces.map((p) => p.place_name)).toEqual(["Jeju Island"]);
    expect(korea.count).toBe(1);
  });
});
