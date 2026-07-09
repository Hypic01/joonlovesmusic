# Spotify Wrapped Honor Badges — Design Spec

**Date:** 2026-07-09
**Status:** Approved by Joon (design + interactive mockup reviewed in browser)
**Branch:** music-map (or a new branch off main at implementation time)

## What we're building

Song detail pages (`/musics/[id]`) show "honor badges" for every year the song
appeared in Joon's Spotify Wrapped ("Your Top Songs YYYY"). A badge names the
honor ("Joon's Top Songs 2024") and the song's rank that year (#1–#100), styled
per-year after that year's Wrapped visual theme, in the site's existing design
system. Ranks 1–3 get a fancier "podium" treatment with metallic shine.

Data is imported **once** from Spotify (plus one rerun each December for the
new year). Page loads never call Spotify.

## Decisions (all confirmed with Joon)

1. **Years covered:** 2016–2025. Joon has all ten "Your Top Songs YYYY"
   playlists saved in his Spotify library.
2. **Badge cutoff:** all 100 ranks earn a badge, not just top 10.
3. **Placement:** inside the existing Awards section on the song page (which is
   currently empty in production — the `awards` table has no rows). Manual
   awards and Wrapped badges share the section; Wrapped badges sort newest year
   first.
4. **Year themes:** hand-curated in code. During implementation we look at each
   year's actual "Your Top Songs YYYY" playlist cover art and pick a 3-color
   palette per year plus a designated text color guaranteed readable against the
   badge background (solves gold-text-on-gold-background).
5. **Medal colors:** #1 gold, #2 silver, #3 bronze on the rank number.
6. **Podium treatment (ranks 1–3):** no literal "PODIUM" text. Instead: a
   metallic gold/silver/bronze gradient frame around the card with a slow
   ambient shimmer animation, a diagonal light-sweep shine on hover, and a
   larger rank number. Ranks 4–100 are flat, calm cards.
7. **Multi-year songs:** a song can appear in several years (e.g. 2019 and
   2022). It gets one row per year in the database and one badge per year on
   the page. Uniqueness is enforced per (year, rank) — never per song.
8. **Design system:** strictly reuse the site's existing language — flat
   colors, hard 2px black borders, no rounded corners, the explicit px text
   scale (`text-[24px]` headings / `text-[18px]` controls / `text-[16px]`
   body), `font-black` numbers. No new styling inventions beyond the approved
   metallic podium effect.
9. **Import trigger:** a terminal script run manually, not an admin UI button.

## Architecture

```
Spotify "Your Top Songs YYYY" playlists  (10 playlists, ranked order)
        │  scripts/import-wrapped.mjs — run once per year, idempotent
        ▼
wrapped_entries table in Supabase        (~1,000 rows)
        │  read-time match by spotify_track_id OR isrc
        ▼
Song page Awards section                 (WrappedBadge components)
```

Matching happens at **read time**, so a song added to the catalog later gets
its badges automatically with no re-import.

## Components

### 1. `wrapped_entries` table (Supabase migration)

| column           | type      | notes                                    |
|------------------|-----------|------------------------------------------|
| id               | uuid pk   | default gen_random_uuid()                |
| year             | int       | e.g. 2024                                |
| rank             | int       | 1–100, playlist position                 |
| spotify_track_id | text      | from the playlist track                  |
| isrc             | text null | from track external_ids, may be missing  |
| track_name       | text      | for eyeballing/debugging                 |
| artist_name      | text      | for eyeballing/debugging                 |
| created_at       | timestamptz | default now()                          |

- Unique constraint on `(year, rank)`.
- Indexes on `spotify_track_id` and `isrc` (the page queries by these).
- RLS: public read, writes via service role only (same posture as other tables).

### 2. `scripts/import-wrapped.mjs`

- Follows the existing `scripts/spotify-auth.mjs` precedent; reads
  `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, and
  `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`.
- Pages through the user's saved playlists (`/me/playlists`) and matches names
  `Your Top Songs YYYY` for 2016–2025 (also accept Spotify-owned Wrapped
  playlists found via search if a year is missing from the library).
- For each year: fetch all playlist tracks in order; playlist position = rank
  (1-based). Extract track id, ISRC (`external_ids.isrc`), name, first artist.
- Upsert on `(year, rank)` — rerunnable without duplicates; a rerun refreshes.
- Reports per year: found/not-found, row count written. A missing playlist
  skips that year with a clear message and imports the rest.
- Handles Spotify pagination (playlists >50, tracks >100) and local tracks
  (null track objects) by skipping with a warning while keeping rank positions
  aligned to playlist index.

### 3. `lib/wrappedThemes.ts`

- `WRAPPED_THEMES: Record<number, { colors: [string, string, string]; text: string }>`
  for 2016–2025, hand-picked from each year's real Wrapped playlist cover.
- `text` is guaranteed readable against the badge background color.
- Fallback theme for a year with no entry (future-proofing for 2026 before the
  palette is added).
- Medal constants: gold `#FFD700`-family, silver `#C9CDD3`-family, bronze
  `#CD7F32`-family gradients for podium frames and rank-number colors.

### 4. `WrappedBadge` component (`app/components/WrappedBadge.tsx`)

- Props: `year`, `rank`.
- Card: year-theme background, `border-2 border-black`, no rounded corners,
  top accent stripe in a secondary theme color, label "Joon's Top Songs" +
  year, big `font-black` rank number.
- Rank number color: gold/silver/bronze for 1–3 with a hard pixel-offset text
  shadow; otherwise the theme's designated text color.
- Podium (rank ≤ 3): metallic gradient frame (6px padding wrapper inside a 2px
  black border), slow `background-position` shimmer keyframe, and an absolutely
  positioned skewed light-sweep element animated across the card on hover.
  Pure CSS (the approved mockup's technique) — no libraries.
- Non-podium: flat card, no animation.

### 5. Song page integration (`app/musics/[id]/page.tsx`)

- Add one query to the existing `Promise.all`: select from `wrapped_entries`
  where `spotify_track_id` equals the song's `spotify_track_id` OR `isrc`
  equals the song's `isrc` (skip null fields; if both are null, skip the query).
- The Awards section renders when `awards.length > 0 || wrapped.length > 0`.
  Wrapped badges render newest-year-first, alongside any manual award cards.
- If the same (year, rank) matches by both track id and ISRC, it renders once
  (dedupe by entry id).

## Data facts (checked 2026-07-09)

- 291 songs total; 283 have `spotify_track_id`, 282 have `isrc`. The ~8
  without either simply show no Wrapped badges — nothing breaks.
- `awards` table is empty, so no reconciliation with existing awards is needed.
- `SPOTIFY_REFRESH_TOKEN` is already minted in `.env.local` (from the
  spotify-stats feature).

## Edge cases

- **Playlist missing from library:** script names the year and continues.
- **Song with no Spotify id and no ISRC:** no badges, no error.
- **Local/unavailable tracks inside a Wrapped playlist:** skipped with a
  warning; ranks stay aligned to playlist position.
- **Duplicate match via both id and ISRC:** dedupe by entry id, render once.
- **Future year (2026):** rerun the script; add the year's palette to
  `lib/wrappedThemes.ts` (fallback theme renders until then).

## Out of scope

- Badges on the `/musics` list page or song bars (detail page only).
- Admin UI for editing wrapped entries (the script + table are the interface).
- Auto-extraction of theme colors from cover art.

## Verification

- Unit tests: theme file completeness (every year 2016–2025 has 3 colors +
  text color), rank→medal mapping, playlist-position→rank alignment logic, and
  the match-query builder (id-only, isrc-only, both, neither).
- Post-import sanity: cross-check a handful of known songs (e.g. the real 2024
  #1) against what renders on their pages.
- `npm run build` + lint + existing test suite pass.
- Final look-and-feel sign-off by Joon in a real browser (per the music-map
  precedent: subagents/tests verify code, Joon verifies feel).
