export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Pull the country name out of a Google geocoder/place address_components array.
 * Returns null when absent.
 */
export function extractCountry(
  components: AddressComponent[] | undefined | null
): string | null {
  if (!components || components.length === 0) return null;
  const country = components.find((c) => c.types.includes("country"));
  return country ? country.long_name : null;
}

/**
 * Pull the city out of address_components, preferring the most city-like field
 * and falling back through broader administrative levels. Returns null when none.
 */
export function extractCity(
  components: AddressComponent[] | undefined | null
): string | null {
  if (!components || components.length === 0) return null;
  const byType = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? null;
  return (
    byType("locality") ??
    byType("postal_town") ??
    byType("administrative_area_level_2") ??
    byType("administrative_area_level_1") ??
    null
  );
}
