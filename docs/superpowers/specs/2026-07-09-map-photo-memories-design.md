# Map Photo Memories — Design

**Date:** 2026-07-09
**Branch:** `music-map`
**Status:** Approved by Joon (visual walkthrough reviewed in browser companion)

## Overview

A song-memory isn't pinned to a place alone — it's pinned to a moment. A photo naturally carries both: EXIF metadata holds GPS coordinates and a timestamp. This feature lets a map pin carry a photo and a moment (`taken_at`), turning the Music Map from "where I heard this" into "the memory itself."

Origin: friend feedback that music ties to time as much as location; the original 2026-05-27 map spec explicitly deferred the time dimension.

Nothing about the existing map is removed. Every new field is optional. A pin without a photo or time behaves exactly as today.

## Locked decisions

| Decision | Choice |
| --- | --- |
| Photo visibility | Public — shown on `/map` and song pages |
| Time's role (v1) | Display only — no filters, no timeline mode |
| Data model | The pin IS the memory (columns on `map_pins`; no new table) |
| Map markers | Photo pins render as photo chips; photo-less pins unchanged; **no clustering, ever** (standing rule) |
| Song pages | Gain a "Memories" section near Awards |
| Optionality | Photo and time are optional everywhere; photo only ever prefills, never gates |
| Admin surfaces | `SongLocationsEditor` (add-song + edit-song pages) **and** `/admin/map` create/edit |

## Data model

Migration `add_memory_to_map_pins` — three nullable columns on `map_pins`:

| Column | Type | Meaning |
| --- | --- | --- |
| `photo_url` | text | Full-size display image (public URL) |
| `photo_thumb_url` | text | Small square rendition used as the map marker chip |
| `taken_at` | timestamp (no time zone) | The moment, as local wall-clock time where taken |

- `types/database.ts` `MapPin` gains the three fields (all `| null`), and `MapPinWithSong` inherits them.
- **`taken_at` semantics:** EXIF timestamps are local time at the place of capture, usually without zone info. Store and display the wall-clock value verbatim — "9:42 PM in Jeju" — never convert to or from UTC.
- Existing pins stay valid with all three fields null.

## Storage

- One Supabase Storage bucket: **`memories`**. Policies: public read (SELECT); INSERT/DELETE granted to the same role the admin pages currently use for `map_pins` writes (browser client on authed admin pages) — mirror the existing access model, don't invent a new one.
- Object names: `<uuid>.jpg` and `<uuid>_thumb.jpg` where the uuid is `crypto.randomUUID()` generated at upload time (pin ids don't exist yet for drafts on the add-song page).
- **Upload happens on save, not on file-select** — abandoning a form leaves no orphaned objects.
- Replacing a photo or deleting a pin removes the old objects, best-effort: a failed cleanup logs and never blocks the save/delete.

## Image pipeline (all client-side; no server code)

1. **Parse:** `exifr` reads GPS (decimal lat/lng — it converts EXIF DMS internally) and `DateTimeOriginal`, from JPEG and HEIC alike.
2. **Convert:** HEIC → JPEG via `heic2any` (Chrome can't display HEIC).
3. **Renditions:** canvas produces a main image (longest side ≤ 1600px, JPEG quality ~0.82) and a thumb (320px, square center-crop) — the thumb keeps 52px marker chips crisp on retina.
4. **Place:** GPS coordinates enter the existing draft-pin path (`DraftPin` shape) — identical to a map click; reverse geocoding fills `place_name`, `city`, `country`, `place_category` via the code path map-click pins already use.

Both new dependencies (`exifr`, `heic2any`) are **dynamically imported inside the admin photo flow** so public pages pay zero bundle cost.

Suggested new units, each pure and unit-testable where possible:

- `lib/photoExif.ts` — file → `{ lat?, lng?, takenAt? }` (wraps exifr; pure mapping logic separated for tests)
- `lib/imageRenditions.ts` — file → `{ main: Blob, thumb: Blob }` (canvas; crop math extracted pure)
- `lib/formatMoment.ts` — `taken_at` → "Mar 15, 2024 · 9:42 PM" (pure, tested)

## Admin flows

### A. Song add/edit (`/admin/music`, `/admin/edit/[id]` via `SongLocationsEditor`)

- New **"Add a photo"** zone (dashed 2px black border, camera SVG icon, "GPS and time auto-fill from the photo. JPEG, PNG, HEIC.").
- **Photo with GPS:** draft pin drops at the EXIF coordinates, map zooms there, reverse geocode fills place fields, `taken_at` prefills. Pin stays draggable; every field stays editable.
- **Photo without GPS:** photo and any time found stay attached to the draft; a notice reads "No location in this photo — pick the place," and location is set the normal way (search / click / drag).
- **No photo:** flow is byte-for-byte today's flow.
- Each draft/pin row gets an optional `taken_at` field (`datetime-local` input) — EXIF prefills, manual entry/override always possible, empty allowed. A photo-less pin may still carry a time.

### B. Map admin (`/admin/map`)

- Create panel gets the same "Add a photo" zone **and** the optional `taken_at` field.
- Pin **edit** gains: attach / replace / remove photo, plus the `taken_at` field. This is how pre-existing pins (e.g. Jeju) retroactively become full memories.

Design-system compliance (standing requirement from 2026-06-11): all new admin controls reuse the existing form styling — 2px black borders, explicit px type scale (24/18/16), the established button patterns. No new visual idioms.

## Public map (`/map`)

- **Markers:** pins with `photo_thumb_url` render as a photo chip — ~52px square thumbnail in a 2px black frame on a white plate, slight grow on hover (transform-only, 150–300ms). Implemented as custom `AdvancedMarker` children. Pins without photos keep the current red marker. No clustering.
- **Popup (memory card):** photo on top at full card width (object-cover, ~4:3), then the existing `SongPopupCard` row (cover, title, artist, rating block — behavior untouched, still links to the song page), then a moment line: `place_name · Mar 15, 2024 · 9:42 PM`, then the note in italics if present. Missing `taken_at` → moment line shows the place only. Photo-less pins keep today's popup exactly.
- **Deep link:** `/map?pin=<id>` centers the map on that pin and opens its card. Song-page memory cards link here.

## Song page (`/musics/[id]`)

- New **Memories** section placed directly below the Awards block (and in that same spot when a song has no awards), rendered only when the song has ≥ 1 pin with a photo or a `taken_at`.
- Each memory card: photo (or a gray plate when the pin has only a time), `place_name` (18px bold), city · country (16px gray), moment line, note in italics. Card = site pattern (2px black border, red border on hover), links to `/map?pin=<id>`.
- Order: `COALESCE(taken_at, created_at)` descending — newest moment first.

## Edge cases and errors

| Case | Behavior |
| --- | --- |
| Unreadable/corrupt image | Clear error message; form state untouched |
| File > 20MB | Rejected upfront with message, before any processing |
| HEIC conversion failure | Error: "Couldn't read this image — try JPEG or PNG" |
| Storage upload failure | The whole save aborts atomically; nothing half-written; user retries |
| EXIF has time but no GPS | Time prefills; location set manually |
| EXIF has GPS but no time | Pin places; `taken_at` left empty or entered manually |
| Geocoding unavailable/disabled | Pin saves with coordinates as place fallback (existing "Other" path) |
| Photo cleanup failure on replace/delete | Logged, non-fatal |

## Prerequisite (outside the codebase)

Enable the **Geocoding API** on the Maps key in Google Cloud Console and add it to the key's API restrictions (standing to-do since June). Photo GPS arrives as bare coordinates; without Geocoding, photo pins still save and place correctly but show coordinates/"Other" instead of place names. The feature degrades gracefully.

## Testing

- **Unit (Vitest, alongside existing suite):** EXIF→draft mapping, `formatMoment`, thumb crop math. Existing 65 tests stay green.
- **Build:** `npm run build` clean.
- **End-to-end via `/browse`:** GPS-photo happy path; no-GPS screenshot path; public map chip renders; memory popup contents; song page Memories section; `/map?pin=` deep link.
- **Final feel check:** Joon, in a real browser (standing rule — subagents/tools never sign off on feel).

## Out of scope (v1)

- Year filters, timeline/scrubber modes (time is display-only)
- Multiple photos per pin (one photo per pin; two photos at one place = two pins)
- Photo-only memories with no location (rejected Approach B — every memory lives on the map)
- Date-only precision for `taken_at` (a set moment always displays date + time)
- Photo indicators in the admin `PinTree`
- Clustering (permanently out, per standing rule)
