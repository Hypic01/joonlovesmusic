// Turns a Google Places `types` array into a friendly, human place category
// ("Restaurant", "Hotel", "Building", ...) for grouping pins by what kind of
// place they are. Pure + dependency-free so it can be unit tested.

const FRIENDLY: Record<string, string> = {
  restaurant: "Restaurant",
  food: "Restaurant",
  meal_takeaway: "Restaurant",
  cafe: "Café",
  bakery: "Bakery",
  bar: "Bar",
  night_club: "Nightclub",
  lodging: "Hotel",
  park: "Park",
  museum: "Museum",
  art_gallery: "Art gallery",
  tourist_attraction: "Attraction",
  store: "Store",
  shopping_mall: "Mall",
  supermarket: "Supermarket",
  university: "University",
  school: "School",
  library: "Library",
  stadium: "Stadium",
  airport: "Airport",
  train_station: "Train station",
  subway_station: "Subway station",
  transit_station: "Transit station",
  church: "Church",
  place_of_worship: "Place of worship",
  hospital: "Hospital",
  beach: "Beach",
  natural_feature: "Nature",
  premise: "Building",
  neighborhood: "Neighborhood",
  sublocality: "Neighborhood",
  locality: "City",
};

// Types that carry no useful "what kind of place" signal on their own.
const GENERIC = new Set([
  "establishment",
  "point_of_interest",
  "political",
  "geocode",
  "plus_code",
  "route",
  "street_address",
  "premise_number",
]);

/**
 * Derive a friendly place category from a Google Places `types` array.
 * Returns null when nothing meaningful can be derived.
 */
export function derivePlaceCategory(
  types: string[] | undefined | null
): string | null {
  if (!types || types.length === 0) return null;
  for (const t of types) {
    if (FRIENDLY[t]) return FRIENDLY[t];
  }
  const first = types.find((t) => !GENERIC.has(t));
  if (!first) return null;
  return first
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
