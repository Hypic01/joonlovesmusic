import { toDateTimeLocalValue } from "./formatMoment";

export interface PhotoMeta {
  lat: number | null;
  lng: number | null;
  /** `YYYY-MM-DDTHH:mm` — ready for a datetime-local input. */
  takenAt: string | null;
}

interface GpsLike {
  latitude?: number;
  longitude?: number;
}

/** Pure mapper from exifr's outputs to our meta shape; guards ranges and null island. */
export function exifToPhotoMeta(gps: GpsLike | null | undefined, dt: unknown): PhotoMeta {
  let lat: number | null = null;
  let lng: number | null = null;
  if (
    gps &&
    typeof gps.latitude === "number" &&
    typeof gps.longitude === "number" &&
    Number.isFinite(gps.latitude) &&
    Number.isFinite(gps.longitude) &&
    Math.abs(gps.latitude) <= 90 &&
    Math.abs(gps.longitude) <= 180 &&
    !(gps.latitude === 0 && gps.longitude === 0)
  ) {
    lat = gps.latitude;
    lng = gps.longitude;
  }
  const takenAt =
    dt instanceof Date && !Number.isNaN(dt.getTime()) ? toDateTimeLocalValue(dt) : null;
  return { lat, lng, takenAt };
}

/**
 * Read GPS + DateTimeOriginal from a photo (JPEG or HEIC). exifr is
 * dynamically imported so public pages never bundle it. Never throws:
 * any parse failure just means "no metadata found".
 */
export async function extractPhotoMeta(file: File | Blob): Promise<PhotoMeta> {
  try {
    const exifr = (await import("exifr")).default;
    const [gps, tags] = await Promise.all([
      exifr.gps(file).catch(() => undefined),
      exifr.parse(file, { pick: ["DateTimeOriginal"] }).catch(() => undefined),
    ]);
    return exifToPhotoMeta(gps ?? null, tags?.DateTimeOriginal ?? null);
  } catch {
    return { lat: null, lng: null, takenAt: null };
  }
}
