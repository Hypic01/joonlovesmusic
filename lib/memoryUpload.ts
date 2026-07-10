// Client-side: validate → renditions → POST to /api/memory-photos.
// Throws Error with a user-facing message on any failure; callers abort their
// save on throw (atomic: no pin row is written when its photo fails).
import { validateMemoryFile } from "./imageRenditions";

export interface MemoryPhotoUrls {
  photo_url: string;
  photo_thumb_url: string;
}

export async function uploadMemoryPhoto(file: File): Promise<MemoryPhotoUrls> {
  const invalid = validateMemoryFile(file);
  if (invalid) throw new Error(invalid);
  const { makeRenditions } = await import("./imageRenditions");
  const { main, thumb } = await makeRenditions(file);
  const form = new FormData();
  form.append("main", main, "main.jpg");
  form.append("thumb", thumb, "thumb.jpg");
  let res: Response;
  try {
    res = await fetch("/api/memory-photos", { method: "POST", body: form });
  } catch {
    throw new Error("Photo upload failed — check your connection and try again");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Photo upload failed — try again");
  return json as MemoryPhotoUrls;
}
