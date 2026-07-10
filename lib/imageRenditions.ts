// Browser-side photo processing for memory pins. Pure math is exported for
// unit tests; makeRenditions needs DOM canvas and runs only in admin flows.

export const MEMORY_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAIN_MAX_DIM = 1600;
export const THUMB_SIZE = 320;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];

export function isHeicFile(name: string, type: string): boolean {
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.hei[cf]$/i.test(name);
}

export function validateMemoryFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size > MEMORY_MAX_FILE_BYTES) {
    return "That photo is over 20MB — pick a smaller one.";
  }
  if (!ACCEPTED_TYPES.includes(file.type) && !isHeicFile(file.name, file.type)) {
    return "Unsupported image type — use JPEG, PNG, or HEIC.";
  }
  return null;
}

export function computeScaledSize(w: number, h: number, maxDim: number = MAIN_MAX_DIM): { width: number; height: number } {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const scale = maxDim / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export function computeSquareCrop(w: number, h: number): { sx: number; sy: number; size: number } {
  const size = Math.min(w, h);
  return { sx: Math.round((w - size) / 2), sy: Math.round((h - size) / 2), size };
}

interface DrawSpec {
  sx: number; sy: number; sw: number; sh: number; dw: number; dh: number;
}

async function drawToJpeg(bitmap: ImageBitmap, d: DrawSpec, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = d.dw;
  canvas.height = d.dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read this image — try JPEG or PNG.");
  ctx.drawImage(bitmap, d.sx, d.sy, d.sw, d.sh, 0, 0, d.dw, d.dh);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't read this image — try JPEG or PNG."))),
      "image/jpeg",
      quality
    )
  );
}

/** File → { main ≤1600px JPEG, thumb 320px square JPEG }. HEIC is converted first. */
export async function makeRenditions(file: File): Promise<{ main: Blob; thumb: Blob }> {
  let source: Blob = file;
  if (isHeicFile(file.name, file.type)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      source = Array.isArray(out) ? out[0] : out;
    } catch {
      throw new Error("Couldn't read this image — try JPEG or PNG.");
    }
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error("Couldn't read this image — try JPEG or PNG.");
  }
  try {
    const { width, height } = computeScaledSize(bitmap.width, bitmap.height);
    const main = await drawToJpeg(
      bitmap,
      { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height, dw: width, dh: height },
      0.82
    );
    const crop = computeSquareCrop(bitmap.width, bitmap.height);
    const thumbDim = Math.min(THUMB_SIZE, crop.size);
    const thumb = await drawToJpeg(
      bitmap,
      { sx: crop.sx, sy: crop.sy, sw: crop.size, sh: crop.size, dw: thumbDim, dh: thumbDim },
      0.8
    );
    return { main, thumb };
  } finally {
    bitmap.close();
  }
}
