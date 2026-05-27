# Music Map — Design Spec

**Date:** 2026-05-27
**Project:** joonlovesmusic
**Status:** Approved (design); pending implementation plan

## Context

joonlovesmusic is a personal, admin-curated music-rating site (Next.js 16 App Router,
React 19, Supabase, Tailwind v4). The owner wants a new page that ties songs to real-world
places — "this song reminds me of this city / building / spot." Each connection is shown as
a pin on a familiar Google-Maps-style interactive map; clicking a pin surfaces the connected
song. The owner also wants to attach locations to a song directly while adding/editing it for
rating, and a Spotify-style universal search on the map page.

A future enhancement (explicitly **out of scope for v1**) is a time dimension — a song that
evokes a place only at a certain time (e.g. 9pm / at night). The schema leaves room for this.

## Goals

- Public, read-only map at `/map` showing all song↔place pins.
- Admin can create/edit/delete pins from **two** surfaces:
  1. A standalone `/admin/map` editor (place-first: search/click a spot, assign a song).
  2. The existing song add/edit forms (song-first: attach place(s) to the song being rated).
- Spotify-style universal search on `/map` (by song title, artist, album, place, country).
- Consistent with existing patterns: anon Supabase client for public reads, service-role +
  cookie auth for admin writes, `force-dynamic` client pages, reuse of `SongBar`.

## Non-Goals (v1)

- Time-of-day / hour conditions on a pin (future; schema-compatible).
- Public users creating pins (admin-only writes).
- Many-to-many place entities / shared place records (a pin is a flat place + one song).
- Searching songs that have **no** pin (map search only indexes pinned songs).

## Decisions

- **Curation:** admin adds (behind existing `ADMIN_PASSWORD` / `middleware.ts` cookie guard);
  public views read-only.
- **Map provider:** Google Maps via **`@vis.gl/react-google-maps`** (Google's official React
  library — declarative `<Map>` / `<AdvancedMarker>` / `<InfoWindow>`, `useMapsLibrary` hook for
  Places). Chosen over `@react-google-maps/api` (heavier/older) and raw
  `@googlemaps/js-api-loader` (manual marker lifecycle). Swappable later if needed.
- **Place picking (admin):** both Places **search autocomplete** and **click-to-drop** on the map.
- **Song source:** a pin links to an **existing rated song** (`songs` row). Picker reuses the
  blog editor's pattern (search `songs` by title/artist/album + accept a pasted Spotify URL).
- **Cardinality:** one pin = one place + one song. A song may have many pins. (one-to-many)
- **Search source:** index derived client-side from loaded pins — only songs that have pins.

## Data Model

New table **`map_pins`** (one row per pin):

| column | type | notes |
|---|---|---|
| `id` | uuid pk | default `gen_random_uuid()` |
| `song_id` | uuid not null | FK → `songs.id`, `ON DELETE CASCADE` |
| `place_name` | text not null | label, e.g. "Tokyo Tower" or "Lisbon" |
| `lat` | double precision not null | |
| `lng` | double precision not null | |
| `google_place_id` | text null | Google place reference (re-center / dedupe) |
| `country` | text null | from Google address components at creation; powers country search |
| `note` | text null | optional "why this place" |
| `created_at` | timestamptz not null default `now()` | |

- Index on `song_id`.
- Deleting a song cascades to its pins.
- **Future (not built):** nullable `hour` / `time_of_day` column — additive, no rework.

New TypeScript interface `MapPin` in `types/database.ts` mirroring the columns above.

## API

**Reads (public)** — no new route. The `/map` page reads directly via the anon `supabase`
client with an embedded join (PostgREST), consistent with existing pages:

```ts
supabase.from('map_pins').select('*, songs(*)')
```

The FK to `songs` makes the embed work; each pin arrives with its full song row.

**Writes (admin)** — new route `app/api/map-pins/` using the service-role client +
`checkAdminAuth()` cookie check, mirroring `app/api/songs/[id]/route.ts`:

- `POST /api/map-pins` — create a pin (`{ song_id, place_name, lat, lng, google_place_id, country, note }`)
- `PATCH /api/map-pins/[id]` — move / rename / edit note
- `DELETE /api/map-pins/[id]` — remove a pin

Each privileged handler returns `401` if the `admin-auth` cookie is not `authenticated`.

## Components (`app/components/`)

- **`MusicMap.tsx`** — wraps `@vis.gl/react-google-maps` (`APIProvider` + `Map` +
  `AdvancedMarker` + `InfoWindow`). Props: `pins`, `editable?`, `onMapClick?`, `onPinClick?`,
  imperative "fly to / fit bounds" support. Pin popup reuses **`SongBar`** for the song.
- **`PlaceAutocomplete.tsx`** — Places Autocomplete search box; resolves a selection to
  `{ place_name, lat, lng, google_place_id, country }` (country read from address components).
  Used by the admin map editor and the song form.
- **`MapSearch.tsx`** — Spotify-style universal search for `/map`: input + suggestion dropdown.
  Each row = left **icon** + keyword + **subtext** label:
  | type | icon | subtext | matches |
  |---|---|---|---|
  | Song | ♪ | "Song" | `songs.title` |
  | Artist | mic | "Artist" | `songs.artist` |
  | Album | disc | "Album" | `songs.album_name` |
  | Place | pin | "Place" | `map_pins.place_name` |
  | Country | globe | "Country" | `map_pins.country` |
  The same keyword can yield multiple rows of different types (like Spotify). Index built
  client-side from loaded pins (distinct values among pinned songs only). On select: Song/Place
  → fly to that pin (fit bounds if several); Artist/Album/Country → filter to matching pins and
  fit the view.
- **`SongLocationsEditor.tsx`** — reusable block for the song add/edit forms: lists the song's
  pins, add via `PlaceAutocomplete` + a mini `MusicMap` (click to fine-tune the exact point),
  remove. Search **and** mini-map confirm, per the chosen UI.

## Pages

- **`app/map/page.tsx`** — public, read-only, `"use client"`, `export const dynamic = 'force-dynamic'`.
  Renders `MapSearch` + `MusicMap` over all pins.
- **`app/admin/map/page.tsx`** — admin editor. Auth via `fetch('/api/admin/check')` redirect
  pattern (like other admin pages) + `middleware.ts`. Place-first flow: search/click to set a
  location, pick a song (reused `songs` search + Spotify-URL pattern), save; list/edit/delete
  existing pins.
- **`app/page.tsx`** — add a nav link to the new map page alongside the existing links.

## Song-Form Integration

Embed `SongLocationsEditor` into both:

- **New song** (`app/admin/music/page.tsx`): collect locations in local state; after the song
  row is inserted and its `id` is returned, `POST` each pin.
- **Edit song** (`app/admin/edit/[id]/page.tsx`): load the song's existing pins, allow
  add/remove/move, persist via the `/api/map-pins` routes.

## Error Handling

- Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → friendly inline message, no crash (mirrors the
  warn-don't-throw approach in `lib/supabase.ts`).
- Autocomplete / pin-save failures → inline message via the existing
  `setMessage({ type, text })` UI pattern used across admin pages.
- Song deletion cascades to pins (DB-level FK).

## Environment & External Setup

- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` (client-side key).
- In Google Cloud: enable **Maps JavaScript API** + **Places API**; restrict the key by HTTP
  referrer; billing enabled (free monthly credit covers a personal site).
- New dependency: `@vis.gl/react-google-maps`.
- Document the new env var in CLAUDE.md's environment section.

## Verification

- **DB:** create the `map_pins` table + FK + index (Supabase migration); confirm a song delete
  cascades its pins.
- **Public read:** `/map` loads pins via the anon client join and renders markers; clicking a
  marker shows the song via `SongBar`.
- **Admin editor:** logged-in admin can search a place, click to drop, assign a song, save;
  pin appears on both `/admin/map` and `/map`. Edit and delete work. Logged-out access to
  `/admin/map` redirects to login; direct `POST/PATCH/DELETE /api/map-pins` without the cookie
  returns 401.
- **Song forms:** adding a new song with locations creates the song + its pins; editing a song
  adds/removes locations and they reflect on `/map`.
- **Search:** typing a song/artist/album/place/country shows correctly-typed rows (icon +
  subtext); selecting flies to / filters the map appropriately; only pinned songs appear.
- **Resilience:** with the Maps key unset, `/map` shows a friendly message instead of crashing.
- `npm run lint` and `npm run build` pass.
