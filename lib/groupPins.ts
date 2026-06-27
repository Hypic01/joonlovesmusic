import type { MapPinWithSong } from "./mapSearch";

// Groups pins into a Country -> City -> Place hierarchy for the categorized
// list. A "place" (e.g. Jeju Island) collects every song pinned there, so it can
// be a collapsible node showing a song count. Pure + dependency-free so it can
// be unit tested.

export const UNKNOWN_GROUP = "Other";

export interface PinPlace {
  /** Stable key for collapse state — the Google place id, else the place name. */
  key: string;
  place_name: string;
  place_category: string | null;
  /** The songs (pins) at this place. */
  pins: MapPinWithSong[];
}

export interface PinCity {
  city: string;
  places: PinPlace[];
  /** Total songs across this city's places. */
  count: number;
}

export interface PinCountry {
  country: string;
  cities: PinCity[];
  /** Places whose city is unknown — shown directly under the country (no "Other"
   * city level), so e.g. South Korea lists "Jeju Island" straight away. */
  loosePlaces: PinPlace[];
  /** Total songs across the whole country. */
  count: number;
}

// Alphabetical, but the catch-all "Other" bucket always sorts last.
function sortGroupNames(a: string, b: string): number {
  if (a === UNKNOWN_GROUP && b !== UNKNOWN_GROUP) return 1;
  if (b === UNKNOWN_GROUP && a !== UNKNOWN_GROUP) return -1;
  return a.localeCompare(b);
}

// Collapse a flat pin list into per-place groups (a place can hold several songs),
// sorted alphabetically by place name.
function buildPlaces(pins: MapPinWithSong[]): PinPlace[] {
  const byPlace = new Map<string, MapPinWithSong[]>();
  for (const pin of pins) {
    const key = pin.google_place_id?.trim() || pin.place_name;
    if (!byPlace.has(key)) byPlace.set(key, []);
    byPlace.get(key)!.push(pin);
  }
  const places: PinPlace[] = [];
  for (const [key, placePins] of byPlace) {
    places.push({
      key,
      place_name: placePins[0].place_name,
      place_category: placePins[0].place_category ?? null,
      pins: placePins,
    });
  }
  places.sort((a, b) => a.place_name.localeCompare(b.place_name));
  return places;
}

function countSongs(places: PinPlace[]): number {
  return places.reduce((sum, p) => sum + p.pins.length, 0);
}

interface CountryBuckets {
  cities: Map<string, MapPinWithSong[]>;
  loose: MapPinWithSong[];
}

export function groupPins(pins: MapPinWithSong[]): PinCountry[] {
  const countries = new Map<string, CountryBuckets>();

  for (const pin of pins) {
    const country = pin.country?.trim() || UNKNOWN_GROUP;
    const city = pin.city?.trim();
    if (!countries.has(country)) countries.set(country, { cities: new Map(), loose: [] });
    const bucket = countries.get(country)!;
    if (city) {
      if (!bucket.cities.has(city)) bucket.cities.set(city, []);
      bucket.cities.get(city)!.push(pin);
    } else {
      // No city → list this place straight under its country.
      bucket.loose.push(pin);
    }
  }

  const result: PinCountry[] = [];
  for (const [country, bucket] of countries) {
    const cities: PinCity[] = [];
    let count = 0;
    for (const [city, cityPins] of bucket.cities) {
      const places = buildPlaces(cityPins);
      const cityCount = countSongs(places);
      cities.push({ city, places, count: cityCount });
      count += cityCount;
    }
    cities.sort((a, b) => sortGroupNames(a.city, b.city));
    const loosePlaces = buildPlaces(bucket.loose);
    count += countSongs(loosePlaces);
    result.push({ country, cities, loosePlaces, count });
  }
  result.sort((a, b) => sortGroupNames(a.country, b.country));
  return result;
}
