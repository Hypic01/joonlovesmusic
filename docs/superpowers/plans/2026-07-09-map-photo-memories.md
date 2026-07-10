# Map Photo Memories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map pins can carry a photo and a moment (`taken_at`) — uploaded photos auto-fill location + time from EXIF, render as photo-chip markers and memory popups on `/map`, and appear in a Memories section on song pages.

**Architecture:** Three nullable columns on `map_pins` (no new table). Photos are processed entirely in the browser (EXIF parse → HEIC convert → two JPEG renditions) and uploaded through a new `/api/memory-photos` route that mirrors the existing map-pins API pattern (service-role Supabase client + `admin-auth` cookie check). All storage cleanup happens server-side inside the map-pins PATCH/DELETE routes. Spec: `docs/superpowers/specs/2026-07-09-map-photo-memories-design.md`.

**Tech Stack:** Next.js 16 App Router (client pages), Supabase (Postgres + Storage via `@supabase/supabase-js`), `@vis.gl/react-google-maps`, `exifr` (EXIF), `heic2any` (HEIC→JPEG), Vitest 4, Tailwind 4.

## Global Constraints

- **Design system:** 2px black borders (`border-2 border-black`), white plates, brand red `--color-brand-red` (#ff4242), explicit px type scale (`text-[24px]` headings / `text-[18px]` controls / `text-[16px]` body). Reuse existing input/button classes shown in the code below — invent nothing new.
- **No clustering on the map, ever** (standing user rule). Photo-less pins keep the exact current red `<Pin>` marker and popup.
- **Everything optional:** photo and `taken_at` never gate a save; a photo only ever prefills fields.
- **`taken_at` is local wall-clock time** ("the moment as remembered"): string `YYYY-MM-DDTHH:mm` end-to-end; never converted to/from UTC; column type `timestamp` (no time zone).
- **`exifr`, `heic2any`, and `lib/imageRenditions` are loaded via dynamic `import()` only inside admin photo flows** — public pages must pay zero bundle cost.
- **Memory photos render with plain `<img>` (+ `{/* eslint-disable-next-line @next/next/no-img-element */}`), `loading="lazy"` where noted** — NOT `next/image`, to avoid adding the Supabase storage host to image remotePatterns. Album covers keep using `next/image` as today.
- **Verification commands:** `npm test` (Vitest) after every task; `npm run build` only in the final task (slow on iCloud). Never run bare `tsc` (untracked iCloud `* 2.*` junk files break it). Never touch or delete files matching `* 2.*`.
- **API auth pattern** (copy exactly, already used by map-pins routes): `getSupabaseAdmin()` with `SUPABASE_SERVICE_ROLE_KEY` (env var already configured) + `checkAdminAuth()` reading the `admin-auth` cookie.
- Commit messages: conventional prefix (`feat:`/`docs:`), one line, ending with the `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer.
- The dev server on this machine must be started detached if needed (iCloud path; see memory note) — but this plan only requires it in Task 13.

---

### Task 1: Database migration, storage bucket, and types

**Files:**
- Modify: `types/database.ts:80-92` (the `MapPin` interface)
- Database: Supabase migration `add_memory_to_map_pins` + `memories` bucket (via Supabase MCP tools)

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces: `map_pins.photo_url text | null`, `map_pins.photo_thumb_url text | null`, `map_pins.taken_at timestamp | null`; public storage bucket `memories`; TS fields `photo_url?: string | null; photo_thumb_url?: string | null; taken_at?: string | null` on `MapPin` (and therefore on `MapPinWithSong` and `DraftPin`, which derive from it).

- [ ] **Step 1: Find the Supabase project id**

Use the Supabase MCP tool `list_projects` and locate the joonlovesmusic project. Use its `id` as `project_id` in the next steps.

- [ ] **Step 2: Apply the migration**

Use MCP tool `apply_migration` with `name: "add_memory_to_map_pins"` and query:

```sql
alter table map_pins
  add column if not exists photo_url text,
  add column if not exists photo_thumb_url text,
  add column if not exists taken_at timestamp;
```

- [ ] **Step 3: Create the public bucket**

Use MCP tool `execute_sql` with:

```sql
insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;
```

No storage RLS policies are needed: only the service-role key (which bypasses RLS) ever writes, and public-read comes from `public = true`.

- [ ] **Step 4: Verify both**

`execute_sql`:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'map_pins' and column_name in ('photo_url','photo_thumb_url','taken_at');
```

Expected: 3 rows (`photo_url` text, `photo_thumb_url` text, `taken_at` timestamp without time zone).

```sql
select id, public from storage.buckets where id = 'memories';
```

Expected: 1 row with `public = true`.

- [ ] **Step 5: Update the TS type**

In `types/database.ts`, extend `MapPin` (keep existing fields exactly as they are):

```ts
export interface MapPin {
  id: string;
  song_id: string;
  place_name: string;
  lat: number;
  lng: number;
  google_place_id?: string | null;
  country?: string | null;
  city?: string | null;
  place_category?: string | null;
  note?: string | null;
  /** Public URL of the memory photo (Supabase Storage `memories` bucket). */
  photo_url?: string | null;
  /** Small square rendition used as the map marker chip. */
  photo_thumb_url?: string | null;
  /** The moment as local wall-clock time, `YYYY-MM-DDTHH:mm[:ss]` — never timezone-converted. */
  taken_at?: string | null;
  created_at: string;
}
```

- [ ] **Step 6: Run tests, then commit**

Run: `npm test` — Expected: all existing tests pass (65+).

```bash
git add types/database.ts
git commit -m "feat: map_pins carry photo_url/photo_thumb_url/taken_at + memories bucket"
```

---

### Task 2: `lib/formatMoment.ts` — moment formatting

**Files:**
- Create: `lib/formatMoment.ts`
- Test: `lib/formatMoment.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `formatMoment(takenAt: string | null | undefined): string | null` → `"Mar 15, 2024 · 9:42 PM"`; `toDateTimeLocalValue(date: Date): string` → `"2024-03-15T21:42"` (datetime-local input format). Used by Tasks 3, 8, 9, 10, 12.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/formatMoment.test.ts
import { describe, it, expect } from "vitest";
import { formatMoment, toDateTimeLocalValue } from "./formatMoment";

describe("formatMoment", () => {
  it("formats an afternoon moment", () => {
    expect(formatMoment("2024-03-15T21:42")).toBe("Mar 15, 2024 · 9:42 PM");
  });
  it("accepts seconds from the DB and ignores them", () => {
    expect(formatMoment("2024-03-15T21:42:07")).toBe("Mar 15, 2024 · 9:42 PM");
  });
  it("formats midnight and noon as 12", () => {
    expect(formatMoment("2023-11-02T00:05")).toBe("Nov 2, 2023 · 12:05 AM");
    expect(formatMoment("2023-11-02T12:05")).toBe("Nov 2, 2023 · 12:05 PM");
  });
  it("keeps the minute zero-padded but not the day", () => {
    expect(formatMoment("2025-01-03T09:07")).toBe("Jan 3, 2025 · 9:07 AM");
  });
  it("returns null for empty, null, or garbage input", () => {
    expect(formatMoment(null)).toBeNull();
    expect(formatMoment(undefined)).toBeNull();
    expect(formatMoment("")).toBeNull();
    expect(formatMoment("not-a-date")).toBeNull();
    expect(formatMoment("2024-13-05T10:00")).toBeNull();
    expect(formatMoment("2024-05-32T10:00")).toBeNull();
    expect(formatMoment("2024-05-05T25:00")).toBeNull();
  });
});

describe("toDateTimeLocalValue", () => {
  it("renders a Date's local wall-clock fields, zero-padded, no seconds", () => {
    expect(toDateTimeLocalValue(new Date(2024, 2, 15, 21, 42, 7))).toBe("2024-03-15T21:42");
    expect(toDateTimeLocalValue(new Date(2025, 0, 3, 9, 7))).toBe("2025-01-03T09:07");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/formatMoment.test.ts`
Expected: FAIL — cannot resolve `./formatMoment`.

- [ ] **Step 3: Implement**

```ts
// lib/formatMoment.ts
// The moment is local wall-clock time ("9:42 PM in Jeju") — parsed with a regex,
// never via `new Date(string)`, so no timezone/DST math can shift it.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMoment(takenAt: string | null | undefined): string | null {
  if (!takenAt) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(takenAt);
  if (!m) return null;
  const year = m[1];
  const monthIdx = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour24 = parseInt(m[4], 10);
  const minute = m[5];
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31 || hour24 > 23 || parseInt(minute, 10) > 59) {
    return null;
  }
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${MONTHS[monthIdx]} ${day}, ${year} · ${hour12}:${minute} ${period}`;
}

/** Format a Date's local fields for a `<input type="datetime-local">` value. */
export function toDateTimeLocalValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/formatMoment.test.ts` — Expected: PASS (7 tests).
Run: `npm test` — Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/formatMoment.ts lib/formatMoment.test.ts
git commit -m "feat: formatMoment — wall-clock moment formatting for memories"
```

---

### Task 3: `lib/photoExif.ts` — EXIF → photo metadata

**Files:**
- Create: `lib/photoExif.ts`
- Test: `lib/photoExif.test.ts`
- Modify: `package.json` (add `exifr`, `heic2any` dependencies)

**Interfaces:**
- Consumes: `toDateTimeLocalValue` from `lib/formatMoment` (Task 2)
- Produces: `interface PhotoMeta { lat: number | null; lng: number | null; takenAt: string | null }`; `exifToPhotoMeta(gps, dt): PhotoMeta` (pure); `extractPhotoMeta(file: File | Blob): Promise<PhotoMeta>` (dynamic-imports exifr; never throws — returns all-null meta on any failure). Used by Task 7.

- [ ] **Step 1: Install dependencies**

Run: `npm install exifr heic2any`
Expected: both added to `dependencies` in `package.json`. Both ship their own TypeScript types — do NOT add ambient declaration files.

- [ ] **Step 2: Write the failing tests (pure mapper only — the exifr wrapper is exercised end-to-end in Task 13)**

```ts
// lib/photoExif.test.ts
import { describe, it, expect } from "vitest";
import { exifToPhotoMeta } from "./photoExif";

describe("exifToPhotoMeta", () => {
  it("passes through valid GPS and formats the timestamp as a datetime-local value", () => {
    const meta = exifToPhotoMeta(
      { latitude: 33.394, longitude: 126.24 },
      new Date(2024, 2, 15, 21, 42, 7)
    );
    expect(meta).toEqual({ lat: 33.394, lng: 126.24, takenAt: "2024-03-15T21:42" });
  });
  it("returns null coords when GPS is missing or partial", () => {
    expect(exifToPhotoMeta(undefined, null)).toEqual({ lat: null, lng: null, takenAt: null });
    expect(exifToPhotoMeta({ latitude: 33.4, longitude: undefined }, null).lat).toBeNull();
  });
  it("rejects out-of-range and null-island coordinates", () => {
    expect(exifToPhotoMeta({ latitude: 91, longitude: 10 }, null).lat).toBeNull();
    expect(exifToPhotoMeta({ latitude: 10, longitude: 181 }, null).lng).toBeNull();
    expect(exifToPhotoMeta({ latitude: 0, longitude: 0 }, null)).toEqual({ lat: null, lng: null, takenAt: null });
  });
  it("rejects invalid Dates and non-Date timestamps", () => {
    expect(exifToPhotoMeta(null, new Date("garbage")).takenAt).toBeNull();
    expect(exifToPhotoMeta(null, "2024:03:15 21:42:07").takenAt).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/photoExif.test.ts`
Expected: FAIL — cannot resolve `./photoExif`.

- [ ] **Step 4: Implement**

```ts
// lib/photoExif.ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/photoExif.test.ts` — Expected: PASS (4 tests).
Run: `npm test` — Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/photoExif.ts lib/photoExif.test.ts
git commit -m "feat: photoExif — EXIF GPS/time extraction with range guards"
```

---

### Task 4: `lib/imageRenditions.ts` — validation, crop math, renditions

**Files:**
- Create: `lib/imageRenditions.ts`
- Test: `lib/imageRenditions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MEMORY_MAX_FILE_BYTES = 20 * 1024 * 1024`; `validateMemoryFile(file: { name: string; size: number; type: string }): string | null` (error message or null); `isHeicFile(name: string, type: string): boolean`; `computeScaledSize(w: number, h: number, maxDim?: number): { width: number; height: number }`; `computeSquareCrop(w: number, h: number): { sx: number; sy: number; size: number }`; `makeRenditions(file: File): Promise<{ main: Blob; thumb: Blob }>` (browser-only: canvas + optional heic2any). Used by Tasks 5 and 7.

- [ ] **Step 1: Write the failing tests (pure functions only — `makeRenditions` uses canvas and is exercised end-to-end in Task 13)**

```ts
// lib/imageRenditions.test.ts
import { describe, it, expect } from "vitest";
import {
  MEMORY_MAX_FILE_BYTES,
  validateMemoryFile,
  isHeicFile,
  computeScaledSize,
  computeSquareCrop,
} from "./imageRenditions";

describe("validateMemoryFile", () => {
  it("accepts jpeg/png/heic under the size cap", () => {
    expect(validateMemoryFile({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
    expect(validateMemoryFile({ name: "a.png", size: 1000, type: "image/png" })).toBeNull();
    expect(validateMemoryFile({ name: "IMG_1.HEIC", size: 1000, type: "" })).toBeNull();
  });
  it("rejects oversized files with a clear message", () => {
    const err = validateMemoryFile({ name: "a.jpg", size: MEMORY_MAX_FILE_BYTES + 1, type: "image/jpeg" });
    expect(err).toMatch(/20MB/);
  });
  it("rejects unsupported types", () => {
    expect(validateMemoryFile({ name: "a.gif", size: 10, type: "image/gif" })).toMatch(/JPEG, PNG, or HEIC/);
    expect(validateMemoryFile({ name: "a.pdf", size: 10, type: "application/pdf" })).not.toBeNull();
  });
});

describe("isHeicFile", () => {
  it("detects by mime type and by extension (case-insensitive)", () => {
    expect(isHeicFile("x", "image/heic")).toBe(true);
    expect(isHeicFile("x", "image/heif")).toBe(true);
    expect(isHeicFile("IMG_0001.HEIC", "")).toBe(true);
    expect(isHeicFile("photo.heif", "")).toBe(true);
    expect(isHeicFile("photo.jpg", "image/jpeg")).toBe(false);
  });
});

describe("computeScaledSize", () => {
  it("keeps small images as-is", () => {
    expect(computeScaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it("scales the longest side down to maxDim, preserving aspect", () => {
    expect(computeScaledSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(computeScaledSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});

describe("computeSquareCrop", () => {
  it("center-crops landscape and portrait", () => {
    expect(computeSquareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 });
    expect(computeSquareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, size: 3000 });
    expect(computeSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/imageRenditions.test.ts`
Expected: FAIL — cannot resolve `./imageRenditions`.

- [ ] **Step 3: Implement**

```ts
// lib/imageRenditions.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/imageRenditions.test.ts` — Expected: PASS (8 tests).
Run: `npm test` — Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/imageRenditions.ts lib/imageRenditions.test.ts
git commit -m "feat: imageRenditions — validation, crop math, JPEG renditions"
```

---

### Task 5: Storage path helper, upload API route, client upload helper

**Files:**
- Create: `lib/memoryStorage.ts`
- Test: `lib/memoryStorage.test.ts`
- Create: `app/api/memory-photos/route.ts`
- Create: `lib/memoryUpload.ts`

**Interfaces:**
- Consumes: `validateMemoryFile`, `makeRenditions` (Task 4)
- Produces:
  - `storagePathFromPublicUrl(url: string): string | null` — `"https://…/storage/v1/object/public/memories/abc.jpg" → "abc.jpg"` (used by Task 6 routes)
  - `POST /api/memory-photos` — multipart form fields `main`, `thumb` (JPEG Blobs) → `200 { photo_url: string, photo_thumb_url: string }` | `401 { error }` | `400 { error }` | `500 { error }`
  - `uploadMemoryPhoto(file: File): Promise<{ photo_url: string; photo_thumb_url: string }>` — client helper, throws `Error` with a user-facing message on any failure (used by Tasks 7, 8, 9)

- [ ] **Step 1: Write the failing test for the path helper**

```ts
// lib/memoryStorage.test.ts
import { describe, it, expect } from "vitest";
import { storagePathFromPublicUrl } from "./memoryStorage";

describe("storagePathFromPublicUrl", () => {
  it("extracts the object path from a memories public URL", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/public/memories/9f3c-1.jpg"
      )
    ).toBe("9f3c-1.jpg");
  });
  it("strips query strings and decodes escapes", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/public/memories/a%20b.jpg?download=1"
      )
    ).toBe("a b.jpg");
  });
  it("returns null for URLs outside the memories bucket or garbage", () => {
    expect(
      storagePathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/covers/x.jpg")
    ).toBeNull();
    expect(storagePathFromPublicUrl("not a url")).toBeNull();
    expect(
      storagePathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/memories/")
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/memoryStorage.test.ts`
Expected: FAIL — cannot resolve `./memoryStorage`.

- [ ] **Step 3: Implement the path helper**

```ts
// lib/memoryStorage.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/memoryStorage.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Create the upload API route**

```ts
// app/api/memory-photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Renditions arrive pre-compressed from the client (≤1600px / 320px JPEGs),
// so these caps only guard against abuse — normal uploads are far smaller.
const MAX_MAIN_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 2 * 1024 * 1024;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("admin-auth")?.value === "authenticated";
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const form = await request.formData();
    const main = form.get("main");
    const thumb = form.get("thumb");
    if (!(main instanceof Blob) || !(thumb instanceof Blob)) {
      return NextResponse.json({ error: "main and thumb image files are required" }, { status: 400 });
    }
    if (main.size === 0 || thumb.size === 0 || main.size > MAX_MAIN_BYTES || thumb.size > MAX_THUMB_BYTES) {
      return NextResponse.json({ error: "Image is empty or too large" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const mainPath = `${id}.jpg`;
    const thumbPath = `${id}_thumb.jpg`;
    const uploadOpts = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };

    const { error: mainErr } = await supabase.storage.from("memories").upload(mainPath, main, uploadOpts);
    if (mainErr) {
      console.error("Storage upload error (main):", mainErr);
      return NextResponse.json({ error: "Photo upload failed — try again" }, { status: 500 });
    }
    const { error: thumbErr } = await supabase.storage.from("memories").upload(thumbPath, thumb, uploadOpts);
    if (thumbErr) {
      console.error("Storage upload error (thumb):", thumbErr);
      // Don't leave a half-uploaded pair behind.
      await supabase.storage.from("memories").remove([mainPath]);
      return NextResponse.json({ error: "Photo upload failed — try again" }, { status: 500 });
    }

    const photo_url = supabase.storage.from("memories").getPublicUrl(mainPath).data.publicUrl;
    const photo_thumb_url = supabase.storage.from("memories").getPublicUrl(thumbPath).data.publicUrl;
    return NextResponse.json({ photo_url, photo_thumb_url });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create the client upload helper**

```ts
// lib/memoryUpload.ts
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
  const res = await fetch("/api/memory-photos", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Photo upload failed — try again");
  return json as MemoryPhotoUrls;
}
```

- [ ] **Step 7: Run tests, then commit**

Run: `npm test` — Expected: full suite green (route + helper have no unit tests; they're exercised end-to-end in Task 13).

```bash
git add lib/memoryStorage.ts lib/memoryStorage.test.ts app/api/memory-photos/route.ts lib/memoryUpload.ts
git commit -m "feat: memory photo upload — API route + client helper + path mapper"
```

---

### Task 6: map-pins API routes accept memory fields + server-side cleanup

**Files:**
- Modify: `app/api/map-pins/route.ts` (POST)
- Modify: `app/api/map-pins/[id]/route.ts` (PATCH + DELETE)

**Interfaces:**
- Consumes: `storagePathFromPublicUrl` (Task 5)
- Produces: POST/PATCH accept optional `photo_url: string | null`, `photo_thumb_url: string | null`, `taken_at: string | null` (`YYYY-MM-DDTHH:mm[:ss]`). PATCH removes storage objects orphaned by a photo replace/remove; DELETE removes the pin's storage objects. Cleanup is best-effort (logged, never fails the request). Used by Tasks 7, 8, 9.

- [ ] **Step 1: Extend POST validation and insert**

In `app/api/map-pins/route.ts`, replace the destructuring line (line 26) with:

```ts
    const { song_id, place_name, lat, lng, google_place_id, country, city, place_category, note, photo_url, photo_thumb_url, taken_at } = body;
```

After the existing lat/lng range check (ends line 49), add:

```ts
    const isOptionalString = (v: unknown): v is string | null | undefined =>
      v === undefined || v === null || typeof v === "string";
    // Local wall-clock moment; seconds optional (datetime-local sends none, Postgres returns them).
    const TAKEN_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
    if (!isOptionalString(photo_url) || !isOptionalString(photo_thumb_url) || !isOptionalString(taken_at)) {
      return NextResponse.json(
        { error: "photo_url, photo_thumb_url, and taken_at must be strings when provided" },
        { status: 400 }
      );
    }
    if (typeof taken_at === "string" && taken_at && !TAKEN_AT_RE.test(taken_at)) {
      return NextResponse.json(
        { error: "taken_at must look like 2024-03-15T21:42" },
        { status: 400 }
      );
    }
```

In the `.insert({ … })` object (lines 54-64), add after `note: note || null,`:

```ts
        photo_url: photo_url || null,
        photo_thumb_url: photo_thumb_url || null,
        taken_at: taken_at || null,
```

- [ ] **Step 2: Extend PATCH the same way, plus orphan cleanup**

In `app/api/map-pins/[id]/route.ts`, add the import at the top:

```ts
import { storagePathFromPublicUrl } from "@/lib/memoryStorage";
```

Replace the PATCH destructuring line (line 29) with:

```ts
    const { song_id, place_name, lat, lng, google_place_id, country, city, place_category, note, photo_url, photo_thumb_url, taken_at } = body;
```

After the lng range check (ends line 55), add the same `isOptionalString` / `TAKEN_AT_RE` validation block from Step 1 (identical code).

Extend the `update` object (lines 57-67) with:

```ts
      photo_url: photo_url ?? null,
      photo_thumb_url: photo_thumb_url ?? null,
      taken_at: taken_at ?? null,
```

Then replace the section from `const supabase = getSupabaseAdmin();` through the `if (!data)` check (lines 69-83) with:

```ts
    const supabase = getSupabaseAdmin();

    // Snapshot current photo URLs so a replace/remove can clean up storage.
    const { data: existing } = await supabase
      .from("map_pins")
      .select("photo_url, photo_thumb_url")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("map_pins")
      .update(update)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    // Best-effort: remove storage objects the update just orphaned.
    const stale = [existing?.photo_url, existing?.photo_thumb_url]
      .filter((u): u is string => typeof u === "string" && !!u)
      .filter((u) => u !== update.photo_url && u !== update.photo_thumb_url);
    if (stale.length > 0) {
      const paths = stale
        .map(storagePathFromPublicUrl)
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("memories").remove(paths);
        if (rmErr) console.error("Storage cleanup error (patch):", rmErr);
      }
    }
```

- [ ] **Step 3: DELETE cleans up the pin's photos**

In the same file, replace the DELETE body between `const { id } = await params;` and the final success return (lines 100-107) with:

```ts
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("map_pins")
      .select("photo_url, photo_thumb_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("map_pins").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort storage cleanup — a failure never blocks the delete.
    const urls = [existing?.photo_url, existing?.photo_thumb_url].filter(
      (u): u is string => typeof u === "string" && !!u
    );
    if (urls.length > 0) {
      const paths = urls.map(storagePathFromPublicUrl).filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("memories").remove(paths);
        if (rmErr) console.error("Storage cleanup error (delete):", rmErr);
      }
    }
    return NextResponse.json({ success: true });
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/api/map-pins/route.ts "app/api/map-pins/[id]/route.ts"
git commit -m "feat: map-pins API carries photo/taken_at + server-side storage cleanup"
```

---

### Task 7: `MemoryPhotoInput` component

**Files:**
- Create: `app/components/MemoryPhotoInput.tsx`

**Interfaces:**
- Consumes: `validateMemoryFile` (Task 4), `extractPhotoMeta`, `PhotoMeta` (Task 3)
- Produces:

```ts
export interface PhotoDraft {
  file: File;
  previewUrl: string; // object URL — callers revoke it on clear/replace
  hasGps: boolean;
}
interface MemoryPhotoInputProps {
  photo: PhotoDraft | null;
  existingPhotoUrl?: string | null; // edit mode: currently saved photo (thumb)
  takenAt: string;                  // "" or "YYYY-MM-DDTHH:mm"
  onTakenAtChange: (value: string) => void;
  onPick: (draft: PhotoDraft, meta: PhotoMeta) => void;
  onClear: () => void;
  disabled?: boolean;
  idPrefix: string; // unique DOM ids when multiple instances render
}
```

Used by Tasks 8 and 9.

- [ ] **Step 1: Implement the component**

```tsx
// app/components/MemoryPhotoInput.tsx
"use client";

import { useRef, useState } from "react";
import { validateMemoryFile } from "@/lib/imageRenditions";
import { extractPhotoMeta, type PhotoMeta } from "@/lib/photoExif";

export interface PhotoDraft {
  file: File;
  previewUrl: string;
  hasGps: boolean;
}

interface MemoryPhotoInputProps {
  photo: PhotoDraft | null;
  existingPhotoUrl?: string | null;
  takenAt: string;
  onTakenAtChange: (value: string) => void;
  onPick: (draft: PhotoDraft, meta: PhotoMeta) => void;
  onClear: () => void;
  disabled?: boolean;
  idPrefix: string;
}

// Optional photo + moment capture for a pin. The photo only ever prefills —
// EXIF GPS/time land in the parent's draft state and stay fully editable.
export default function MemoryPhotoInput({
  photo,
  existingPhotoUrl = null,
  takenAt,
  onTakenAtChange,
  onPick,
  onClear,
  disabled = false,
  idPrefix,
}: MemoryPhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateMemoryFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setReading(true);
    try {
      const meta = await extractPhotoMeta(file);
      onPick(
        {
          file,
          previewUrl: URL.createObjectURL(file),
          hasGps: meta.lat != null && meta.lng != null,
        },
        meta
      );
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shownPreview = photo?.previewUrl ?? existingPhotoUrl ?? null;

  return (
    <div className="space-y-2">
      <label className="block font-semibold">
        Photo (optional) — GPS and time auto-fill
      </label>
      {error && (
        <p
          role="alert"
          className="border-2 border-(--color-brand-red) bg-red-50 px-3 py-2 text-sm font-semibold text-(--color-brand-red)"
        >
          {error}
        </p>
      )}
      <div className="flex items-start gap-3">
        {shownPreview ? (
          // HEIC previews can't render in Chrome; the broken-image state is
          // acceptable in admin — the moment line + filename confirm the pick.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPreview}
            alt="Memory photo preview"
            className="h-24 w-24 border-2 border-black object-cover"
          />
        ) : (
          <button
            type="button"
            disabled={disabled || reading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center border-2 border-dashed border-black text-sm hover:border-(--color-brand-red) disabled:opacity-50 cursor-pointer"
          >
            {reading ? "Reading…" : "Add photo"}
          </button>
        )}
        <div className="space-y-1">
          {shownPreview && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || reading}
                className="border-2 border-black px-3 py-1 text-sm disabled:opacity-50 cursor-pointer"
              >
                {reading ? "Reading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onClear();
                }}
                disabled={disabled}
                className="border-2 border-black px-3 py-1 text-sm text-(--color-brand-red) disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}
          <p className="text-sm opacity-70">JPEG, PNG, HEIC — up to 20MB</p>
          {photo && !photo.hasGps && (
            <p className="text-sm font-semibold text-(--color-brand-red)">
              No location in this photo — pick the place (search / click / drag).
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        id={`${idPrefix}-photo`}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Choose a memory photo"
      />
      <label htmlFor={`${idPrefix}-taken-at`} className="block font-semibold">
        Moment (optional)
      </label>
      <input
        id={`${idPrefix}-taken-at`}
        type="datetime-local"
        value={takenAt}
        onChange={(e) => onTakenAtChange(e.target.value)}
        disabled={disabled}
        className="border-2 border-black bg-white px-3 py-2 disabled:opacity-50"
      />
    </div>
  );
}
```

- [ ] **Step 2: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/components/MemoryPhotoInput.tsx
git commit -m "feat: MemoryPhotoInput — photo pick + EXIF prefill + moment field"
```

---

### Task 8: Capture memories in `SongLocationsEditor` + save them from the add-song page

**Files:**
- Modify: `app/components/SongLocationsEditor.tsx`
- Modify: `app/admin/music/page.tsx:219-228` (the draft-pin save loop)

**Interfaces:**
- Consumes: `MemoryPhotoInput`, `PhotoDraft` (Task 7), `PhotoMeta` (Task 3), `uploadMemoryPhoto` (Task 5), `formatMoment` (Task 2)
- Produces: `DraftPin` becomes `Omit<MapPin, "id" | "song_id" | "created_at"> & { photoFile?: File | null }` — same export name, so `app/admin/music/page.tsx` and `app/admin/edit/[id]/page.tsx` keep compiling. Draft pins now may carry `taken_at` and a `photoFile`; persisted mode (edit-song page) uploads before POSTing.

- [ ] **Step 1: Update `SongLocationsEditor.tsx`**

Change the imports (lines 3-11) to:

```tsx
import { useEffect, useState, useCallback } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import MusicMap from "./MusicMap";
import PlaceAutocomplete, { type PlaceResult } from "./PlaceAutocomplete";
import MemoryPhotoInput, { type PhotoDraft } from "./MemoryPhotoInput";
import { extractCountry, extractCity, type AddressComponent } from "@/lib/placeComponents";
import { derivePlaceCategory } from "@/lib/placeCategory";
import { supabase } from "@/lib/supabase";
import { uploadMemoryPhoto } from "@/lib/memoryUpload";
import { formatMoment } from "@/lib/formatMoment";
import type { PhotoMeta } from "@/lib/photoExif";
import type { MapPinWithSong } from "@/lib/mapSearch";
import type { MapPin, Song } from "@/types/database";
```

Change the `DraftPin` type (line 15) to:

```tsx
export type DraftPin = Omit<MapPin, "id" | "song_id" | "created_at"> & {
  /** Staged photo file for drafts on the add-song page; uploaded at song save. */
  photoFile?: File | null;
};
```

Inside `Inner`, after the `note` state (line 28), add:

```tsx
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [takenAt, setTakenAt] = useState("");
```

After the `reverseGeocode` callback (ends line 84), add the photo handlers:

```tsx
  const handlePhotoPick = async (draft: PhotoDraft, meta: PhotoMeta) => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return draft;
    });
    if (meta.takenAt) setTakenAt(meta.takenAt);
    if (meta.lat != null && meta.lng != null) {
      const lat = meta.lat;
      const lng = meta.lng;
      // Same flow as a map click: instant raw-coordinate pending, then refine.
      setPending({
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        google_place_id: null,
        country: null,
        city: null,
        place_category: null,
      });
      const refined = await reverseGeocode(lat, lng);
      setPending((p) => (p && p.lat === lat && p.lng === lng ? refined : p));
    }
  };

  const clearPhoto = () => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };
```

Replace the whole `addPending` function (lines 86-110) with:

```tsx
  const addPending = async () => {
    if (!pending || saving) return;
    const payload: DraftPin = { ...pending, note: note || null, taken_at: takenAt || null };
    if (songId) {
      setSaving(true);
      try {
        let photoUrls: { photo_url?: string; photo_thumb_url?: string } = {};
        if (photo) {
          try {
            photoUrls = await uploadMemoryPhoto(photo.file);
          } catch (e) {
            setMessage({
              type: "error",
              text: e instanceof Error ? e.message : "Photo upload failed — try again",
            });
            return; // atomic: no pin without its photo
          }
        }
        const res = await fetch("/api/map-pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ song_id: songId, ...payload, ...photoUrls }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: null }));
          setMessage({ type: "error", text: error || "Failed to add location" });
          return;
        }
        setMessage({ type: "success", text: `Added ${payload.place_name}` });
        await loadPins();
      } finally {
        setSaving(false);
      }
    } else {
      setDrafts((prev) => [...prev, { ...payload, photoFile: photo?.file ?? null }]);
      setMessage({ type: "success", text: `Added ${payload.place_name}` });
    }
    setPending(null);
    setNote("");
    clearPhoto();
    setTakenAt("");
  };
```

In the JSX, insert the photo input between the note `<input>` (ends line 165) and the `Pending:` paragraph (line 166):

```tsx
      <MemoryPhotoInput
        photo={photo}
        takenAt={takenAt}
        onTakenAtChange={setTakenAt}
        onPick={handlePhotoPick}
        onClear={clearPhoto}
        disabled={saving}
        idPrefix="song-location"
      />
```

Enrich the two list branches (lines 210-232) so saved pins and drafts show their memory bits — replace the `<ul>` block with:

```tsx
        <ul className="space-y-1">
          {songId
            ? pins.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 border-2 border-black px-3 py-1">
                  <span className="min-w-0 truncate">
                    {p.place_name}
                    {p.photo_thumb_url && <span className="opacity-70"> · photo</span>}
                    {formatMoment(p.taken_at) && (
                      <span className="opacity-70"> · {formatMoment(p.taken_at)}</span>
                    )}
                  </span>
                  <button type="button" onClick={() => removePersisted(p.id, p.place_name)} className="text-(--color-brand-red) shrink-0">
                    Remove
                  </button>
                </li>
              ))
            : drafts.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-2 border-black px-3 py-1">
                  <span className="min-w-0 truncate">
                    {d.place_name}
                    {d.photoFile && <span className="opacity-70"> · photo</span>}
                    {formatMoment(d.taken_at) && (
                      <span className="opacity-70"> · {formatMoment(d.taken_at)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                    className="text-(--color-brand-red) shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
        </ul>
```

- [ ] **Step 2: Upload draft photos when the add-song form saves**

In `app/admin/music/page.tsx`, add the import after line 11:

```tsx
import { uploadMemoryPhoto } from "@/lib/memoryUpload";
```

Replace the draft-save loop (lines 219-227) with:

```tsx
      // Save any location pins attached during creation. A pin whose photo
      // fails to upload is skipped entirely (nothing half-written) — the song
      // itself is already saved; re-add that location from the edit page.
      if (inserted && locationDrafts.length > 0) {
        for (const d of locationDrafts) {
          const { photoFile, ...pinFields } = d;
          let photoUrls: { photo_url?: string; photo_thumb_url?: string } = {};
          if (photoFile) {
            try {
              photoUrls = await uploadMemoryPhoto(photoFile);
            } catch (e) {
              setMessage({
                type: "error",
                text: `Song saved, but the photo for ${d.place_name} failed to upload (${
                  e instanceof Error ? e.message : "upload error"
                }). Re-add that location from the edit page.`,
              });
              continue;
            }
          }
          await fetch("/api/map-pins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ song_id: inserted.id, ...pinFields, ...photoUrls }),
          });
        }
      }
```

- [ ] **Step 3: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/components/SongLocationsEditor.tsx app/admin/music/page.tsx
git commit -m "feat: photo + moment capture in song add/edit location editor"
```

---

### Task 9: Photo + moment in `/admin/map` create & edit (and fix the backfill body)

**Files:**
- Modify: `app/admin/map/page.tsx`

**Interfaces:**
- Consumes: `MemoryPhotoInput`, `PhotoDraft` (Task 7), `PhotoMeta` (Task 3), `uploadMemoryPhoto` (Task 5)
- Produces: create panel and pin edit both handle photo attach/replace/remove + `taken_at`. **Critical fix:** the one-time backfill PATCH now sends `photo_url`/`photo_thumb_url`/`taken_at` through — without this, the backfill would null out existing memories AND the PATCH route's cleanup would delete their storage objects.

- [ ] **Step 1: Add imports and state**

Add to the imports in `app/admin/map/page.tsx` (after line 11):

```tsx
import MemoryPhotoInput, { type PhotoDraft } from "@/app/components/MemoryPhotoInput";
import { uploadMemoryPhoto } from "@/lib/memoryUpload";
import type { PhotoMeta } from "@/lib/photoExif";
```

In `Editor()`, after the `note` state (line 61), add:

```tsx
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [takenAt, setTakenAt] = useState("");
  const [existingPhoto, setExistingPhoto] = useState<{ url: string | null; thumb: string | null }>({ url: null, thumb: null });
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
```

- [ ] **Step 2: Fix the backfill PATCH body (silent-data-loss guard)**

In the backfill effect, extend the `body: JSON.stringify({ … })` object (lines 117-127) with three lines after `note: p.note ?? null,`:

```tsx
            photo_url: p.photo_url ?? null,
            photo_thumb_url: p.photo_thumb_url ?? null,
            taken_at: p.taken_at ?? null,
```

- [ ] **Step 3: Photo handlers**

After the `useReverseGeocode`-derived `reverseGeocode` in `Editor` (line 73 area), add alongside the other handlers (e.g. right before `resetForm`, line 202):

```tsx
  const handlePhotoPick = async (draft: PhotoDraft, meta: PhotoMeta) => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return draft;
    });
    setRemoveExistingPhoto(false);
    if (meta.takenAt) setTakenAt(meta.takenAt);
    if (meta.lat != null && meta.lng != null) {
      const lat = meta.lat;
      const lng = meta.lng;
      setDraft({
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        google_place_id: null,
        country: null,
        city: null,
        place_category: null,
      });
      const refined = await reverseGeocode(lat, lng);
      setDraft((d) => (d && d.lat === lat && d.lng === lng ? refined : d));
    }
  };

  const handlePhotoClear = () => {
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
      setPhoto(null);
      return; // un-stage the new file; a saved photo (if any) stays
    }
    setRemoveExistingPhoto(true); // no staged file: mark the saved photo for removal
  };
```

- [ ] **Step 4: Reset/edit wiring**

Replace `resetForm` (lines 202-209) with:

```tsx
  const resetForm = () => {
    setDraft(null);
    setSelectedSong(null);
    setNote("");
    setSongResults([]);
    setSongSearch("");
    setEditingId(null);
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setTakenAt("");
    setExistingPhoto({ url: null, thumb: null });
    setRemoveExistingPhoto(false);
  };
```

In `startEdit` (lines 256-278), after `setNote(pin.note ?? "");` add:

```tsx
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setTakenAt(pin.taken_at ? pin.taken_at.slice(0, 16) : "");
    setExistingPhoto({ url: pin.photo_url ?? null, thumb: pin.photo_thumb_url ?? null });
    setRemoveExistingPhoto(false);
```

- [ ] **Step 5: Save flow**

Replace the `payload` construction **and** the `setSaving(true);` line in `savePin` (lines 217-228) with the block below — `setSaving(true)` moves above the upload so the Save button disables while the photo uploads, and the upload-failure path resets it before returning:

```tsx
    setSaving(true);
    let photoFields: { photo_url: string | null; photo_thumb_url: string | null };
    if (photo) {
      try {
        const up = await uploadMemoryPhoto(photo.file);
        photoFields = { photo_url: up.photo_url, photo_thumb_url: up.photo_thumb_url };
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Photo upload failed — try again",
        });
        setSaving(false);
        return; // atomic: don't save the pin without its photo
      }
    } else if (editingId && !removeExistingPhoto) {
      photoFields = { photo_url: existingPhoto.url, photo_thumb_url: existingPhoto.thumb };
    } else {
      photoFields = { photo_url: null, photo_thumb_url: null };
    }
    const payload = {
      song_id: selectedSong.id,
      place_name: draft.place_name,
      lat: draft.lat,
      lng: draft.lng,
      google_place_id: draft.google_place_id,
      country: draft.country,
      city: draft.city,
      place_category: draft.place_category,
      note: note || null,
      taken_at: takenAt || null,
      ...photoFields,
    };
```

Note: `savePin` currently guards `if (saving) return;` and `if (!draft || !selectedSong)` before this — keep both guards above the new block (upload only happens with a valid pin). The `try { fetch … } finally { setSaving(false); }` that follows stays exactly as-is; the moved `setSaving(true)` pairs with that `finally`. The old-photo cleanup on replace/remove happens server-side (Task 6).

- [ ] **Step 6: Render the input in the form**

In the JSX, insert between the note `<input>` (ends line 423) and the button row (line 425):

```tsx
          <MemoryPhotoInput
            photo={photo}
            existingPhotoUrl={removeExistingPhoto ? null : existingPhoto.thumb ?? existingPhoto.url}
            takenAt={takenAt}
            onTakenAtChange={setTakenAt}
            onPick={handlePhotoPick}
            onClear={handlePhotoClear}
            disabled={saving}
            idPrefix="admin-map"
          />
```

- [ ] **Step 7: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/admin/map/page.tsx
git commit -m "feat: admin map pins gain photo attach/replace/remove + moment"
```

---

### Task 10: Photo-chip markers and memory popup on the map

**Files:**
- Modify: `app/components/MusicMap.tsx`

**Interfaces:**
- Consumes: `formatMoment` (Task 2); `MapPinWithSong` now carries `photo_url`/`photo_thumb_url`/`taken_at` (Task 1)
- Produces: pins with `photo_thumb_url` render a 54px photo chip (44px image + white plate + 2px black frame — ≥44px touch target); popup shows photo + moment line. Photo-less pins are pixel-identical to today.

- [ ] **Step 1: Add the import**

In `app/components/MusicMap.tsx` after line 6:

```tsx
import { formatMoment } from "@/lib/formatMoment";
```

- [ ] **Step 2: Conditional marker rendering**

Replace the pins map block (lines 129-137) with:

```tsx
      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          onClick={() => setOpen(pin.id)}
        >
          {pin.photo_thumb_url ? (
            <div className="border-2 border-black bg-white p-[3px] shadow-[0_3px_0_rgba(0,0,0,0.25)] transition-transform duration-150 hover:scale-110">
              {/* Plain <img>: marker thumbs are tiny, and next/image would need the
                  storage host in remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pin.photo_thumb_url}
                alt={`Memory at ${pin.place_name}`}
                className="block h-11 w-11 object-cover"
              />
            </div>
          ) : (
            <Pin background="#ff4242" borderColor="#000000" glyphColor="#ffffff" />
          )}
        </AdvancedMarker>
      ))}
```

- [ ] **Step 3: Memory popup**

Replace the InfoWindow content `<div>` (lines 162-166) with:

```tsx
          <div className="space-y-2" style={{ fontFamily: SITE_FONT }}>
            {activePin.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePin.photo_url}
                alt={`Memory at ${activePin.place_name}`}
                loading="lazy"
                className="block max-h-64 w-full border-2 border-black object-cover"
              />
            )}
            <p className="text-[28px] font-bold">{activePin.place_name}</p>
            {formatMoment(activePin.taken_at) && (
              <p className="text-[18px]">{formatMoment(activePin.taken_at)}</p>
            )}
            {activePin.note && <p className="text-[20px] opacity-70">{activePin.note}</p>}
            <SongPopupCard song={activePin.songs} />
          </div>
```

Layout note (matches the approved walkthrough): the place reads as the 28px heading with the moment line directly under it — place and moment stay adjacent, so the spec's `place · date · time` content is fully present without repeating the place name.

- [ ] **Step 4: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/components/MusicMap.tsx
git commit -m "feat: photo-chip markers + memory popup on the music map"
```

---

### Task 11: `/map?pin=<id>` deep link

**Files:**
- Modify: `app/map/page.tsx`

**Interfaces:**
- Consumes: existing `openPinId` state + `PanToActivePin` behavior (opens and pans/zooms once pins load)
- Produces: `/map?pin=<id>` opens that pin's popup and centers on it. Used by Task 12's memory cards.

- [ ] **Step 1: Read the query param on mount**

In `app/map/page.tsx`, after the pins-loading `useEffect` (ends line 28), add:

```tsx
  // Deep link: /map?pin=<id> opens that pin. Read via window.location (not
  // useSearchParams) — this page is fully client-side and this avoids the
  // Suspense-boundary requirement.
  useEffect(() => {
    const pinId = new URLSearchParams(window.location.search).get("pin");
    if (pinId) setOpenPinId(pinId);
  }, []);
```

No further change needed: `MusicMap`'s existing `PanToActivePin` pans/zooms as soon as the pin data arrives, and an unknown id simply matches no pin.

- [ ] **Step 2: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/map/page.tsx
git commit -m "feat: /map?pin= deep link opens and centers a pin"
```

---

### Task 12: Song page Memories section

**Files:**
- Create: `app/components/MemoryCard.tsx`
- Modify: `app/musics/[id]/page.tsx`

**Interfaces:**
- Consumes: `formatMoment` (Task 2), `MapPin` (Task 1), `/map?pin=` (Task 11)
- Produces: `MemoryCard({ pin }: { pin: MapPin })` — linked card with photo/place/moment/note; Memories section on the song page directly below the Awards block, shown only when ≥1 pin has a photo or a `taken_at`, ordered newest moment first.

- [ ] **Step 1: Create `MemoryCard`**

```tsx
// app/components/MemoryCard.tsx
import Link from "next/link";
import type { MapPin } from "@/types/database";
import { formatMoment } from "@/lib/formatMoment";

interface MemoryCardProps {
  pin: MapPin;
}

// A song-page memory: photo, place, moment, note — links to the exact pin on /map.
export default function MemoryCard({ pin }: MemoryCardProps) {
  const moment = formatMoment(pin.taken_at);
  return (
    <Link
      href={`/map?pin=${pin.id}`}
      className="flex w-full max-w-[420px] items-center gap-4 border-2 border-black bg-white p-3 hover:border-(--color-brand-red)"
    >
      {pin.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pin.photo_thumb_url ?? pin.photo_url}
          alt={`Memory at ${pin.place_name}`}
          loading="lazy"
          className="h-24 w-24 shrink-0 border border-black object-cover"
        />
      ) : (
        <div className="h-24 w-24 shrink-0 bg-neutral-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-bold">{pin.place_name}</p>
        {(pin.city || pin.country) && (
          <p className="truncate text-[16px] opacity-70">
            {[pin.city, pin.country].filter(Boolean).join(", ")}
          </p>
        )}
        {moment && <p className="text-[16px]">{moment}</p>}
        {pin.note && <p className="truncate text-[14px] italic opacity-60">&ldquo;{pin.note}&rdquo;</p>}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Fetch memory pins on the song page**

In `app/musics/[id]/page.tsx`:

Add to the type import (line 8): `MapPin` →

```tsx
import type { Song, Award, RatingHistory, CommentHistory, WrappedEntry, MapPin } from "@/types/database";
```

Add the component import after line 11:

```tsx
import MemoryCard from "@/app/components/MemoryCard";
```

Add state after `wrappedEntries` (line 48):

```tsx
  const [memoryPins, setMemoryPins] = useState<MapPin[]>([]);
```

Extend the parallel fetch: in the `Promise.all` destructuring (lines 67-77), add a fifth entry. The block becomes:

```tsx
        const [
          { data: songData, error: songError },
          { data: awardsData, error: awardsError },
          { data: historyData, error: historyError },
          { data: commentHistoryData, error: commentHistoryError },
          { data: pinsData }
        ] = await Promise.all([
          supabase.from("songs").select("*").eq("id", id).single(),
          supabase.from("awards").select("*").eq("song_id", id),
          supabase.from("rating_history").select("*").eq("song_id", id).order("changed_at", { ascending: false }),
          supabase.from("comment_history").select("*").eq("song_id", id).order("changed_at", { ascending: false }),
          supabase.from("map_pins").select("*").eq("song_id", id)
        ]);
```

After `setCommentHistory(commentHistoryData || []);` (line 90), add:

```tsx
        // Memories: pins that carry a photo or a moment, newest moment first.
        // taken_at is wall-clock ISO-ish and created_at is ISO — string compare orders both.
        const memories = ((pinsData as MapPin[]) || [])
          .filter((p) => p.photo_url || p.taken_at)
          .sort((a, b) =>
            (b.taken_at ?? b.created_at).localeCompare(a.taken_at ?? a.created_at)
          );
        setMemoryPins(memories);
```

- [ ] **Step 3: Render the section directly below the Awards block**

Insert between the Awards section's closing (line 436, after the `)}`) and the `{/* Comment Section */}` comment:

```tsx
            {/* Memories Section — pins with a photo or a moment */}
            {memoryPins.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Memories</h2>
                <div className="flex flex-wrap gap-4">
                  {memoryPins.map((pin) => (
                    <MemoryCard key={pin.id} pin={pin} />
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test` — Expected: full suite green.

```bash
git add app/components/MemoryCard.tsx "app/musics/[id]/page.tsx"
git commit -m "feat: Memories section on song pages — photo, place, moment"
```

---

### Task 13: Build, end-to-end verification, work log

**Files:**
- No source changes expected (fixes only if verification fails)
- Modify: `~/Obsidian/Joon/1. Projects/joonlovesmusic/Work Log.md` (append entry)

**Interfaces:**
- Consumes: everything above
- Produces: verified feature; work-log entry

- [ ] **Step 1: Full test suite + production build**

Run: `npm test` — Expected: all tests pass (65 existing + ~22 new).
Run: `npm run build` — Expected: build succeeds (pre-existing lint error in `app/admin/blog/page.tsx:33` is known and out of scope; do not fix it in this branch).

- [ ] **Step 2: Start the dev server (detached — iCloud path rule)**

Run with `run_in_background` (never `!`): `npm run dev`
Wait for "Ready"; first compile is slow on this machine.

- [ ] **Step 3: End-to-end via `/browse`, logged in as admin**

Prepare fixtures in the scratchpad first (both are tiny JPEGs written with exiftool if available, else download-free fallback: use any JPEG from the repo's public assets for the no-EXIF case and skip the GPS case's auto-fill assertion, noting it for Joon's manual pass):

1. **GPS photo path** (`/admin/map`): pick a JPEG with GPS + DateTimeOriginal EXIF → draft pin drops at its coordinates, map pans, place fields fill (or coordinate fallback if Geocoding API still disabled), Moment field prefills → pick a song → Save pin → pin appears.
2. **No-GPS path** (`/admin/map`): pick a plain JPEG → red "No location in this photo" notice, photo stays attached → set place via map click → save succeeds.
3. **Moment-only pin**: edit an existing pin, set Moment, no photo → saves; popup shows the moment line.
4. **Replace/remove photo**: edit the pin from (1), Replace with another JPEG → save; then Remove → save; confirm via Supabase MCP `execute_sql` (`select photo_url from map_pins where id = '…'`) and check the old objects are gone (`select name from storage.objects where bucket_id = 'memories'`).
5. **Public `/map`**: photo pin renders as a chip, photo-less pins unchanged; clicking the chip opens the memory popup (photo, place, moment, note, song card).
6. **Deep link**: visit `/map?pin=<id-from-step-1>` → popup opens centered.
7. **Song page**: the song from step (1) shows the Memories section below Awards with photo, place, moment; card links back to the deep link.
8. **Add-song drafts** (`/admin/music`): attach a photo to a draft location, submit the song → pin created with photo (verify on `/map`).

- [ ] **Step 4: Clean up test data**

Delete any test pins/songs created above via the admin UI (verifies DELETE cleanup path once more — after deleting the photo pin, `select name from storage.objects where bucket_id = 'memories'` should show its objects gone).

- [ ] **Step 5: Append the work-log entry**

Append to `~/Obsidian/Joon/1. Projects/joonlovesmusic/Work Log.md` a dated entry covering: photo memories on map pins (EXIF auto-fill, photo-chip markers, memory popups, song-page Memories, `/map?pin=` deep links), and the Geocoding API dependency status.

- [ ] **Step 6: Final commit (if any fixes landed during verification)**

```bash
git status --short   # review; leave the untracked `* 2.*` junk files alone
git add <each changed source file, listed explicitly — never -A>
git commit -m "fix: verification fixes for map photo memories"
```

Skip the commit if verification produced no changes. Joon does the final feel check in his real browser (standing rule) and decides on push/deploy.

---

## Notes for the implementer

- **Geocoding API**: if still disabled on the Maps key, photo pins save with coordinate-string place names (existing fallback). Don't chase it in code — it's a Google Cloud Console toggle on Joon's side (also add it to the key's API restrictions). Surface the status in the Task 13 report.
- **Orphan risk accepted**: if an upload succeeds but the subsequent pin POST fails, two objects are orphaned in `memories`. Rare, cheap, and invisible — spec accepts this; do not build reconciliation.
- **HEIC previews** show as broken images in Chrome's admin preview (`URL.createObjectURL` of a HEIC). Acceptable — the uploaded renditions are JPEG and render everywhere. The preview caveat is commented in `MemoryPhotoInput`.
- **Do not** touch `PinTree`, clustering, year filters, `next.config` image domains, or the `* 2.*` junk files.
