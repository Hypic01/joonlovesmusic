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
