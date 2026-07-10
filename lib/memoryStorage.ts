const PUBLIC_PREFIX = "/storage/v1/object/public/memories/";

/** Maps a memories-bucket public URL back to its storage object path (for cleanup). */
export function storagePathFromPublicUrl(url: string): string | null {
  const idx = url.indexOf(PUBLIC_PREFIX);
  if (idx === -1) return null;
  const path = url.slice(idx + PUBLIC_PREFIX.length).split("?")[0];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}
