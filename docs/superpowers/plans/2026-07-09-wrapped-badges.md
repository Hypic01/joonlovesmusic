# Spotify Wrapped Honor Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Song detail pages show per-year "Joon's Top Songs YYYY — #rank" badges for every year the song appeared in Joon's Spotify Wrapped, with metallic podium treatment for ranks 1–3 — and every Wrapped song not yet in the catalog gets an unrated song page (gray score block), hidden from the main list by default.

**Architecture:** A one-time terminal script reads Joon's *own copies* of the "Your Top Songs YYYY" playlists (Spotify's API blocks the Spotify-owned originals — verified 2026-07-09), writes ~100 rows per year into a new `wrapped_entries` Supabase table, and creates unrated `songs` rows (`rating = null`) for the ~757 Wrapped tracks missing from the catalog. The song page matches at read time by `spotify_track_id` OR `isrc` and renders `WrappedBadge` cards inside the existing Awards section. `songs.rating` becomes nullable; every rating surface renders null as a gray "–" block; `/musics` hides unrated songs behind a toggle. Spotify is never called during page loads.

**Tech Stack:** Next.js 16 App Router (client page), Supabase (PostgREST via `@supabase/supabase-js` on the page; raw REST + service role in the script), vitest, Tailwind 4 + hand-rolled CSS keyframes in `app/globals.css`, Node ≥20 `.mjs` script with `--env-file`.

**Spec:** `docs/superpowers/specs/2026-07-09-wrapped-badges-design.md`

## Global Constraints

- Design system: flat colors, hard `border-2 border-black`, NO rounded corners, px text scale (`text-[18px]` labels, `text-[48px]`+ `font-black` numbers), match the existing award card classes (`px-8 py-6 text-center`, label `text-[18px] font-semibold leading-tight`).
- No literal "PODIUM" text on badges. Podium fanciness = metallic gradient frame + ambient shimmer + hover light-sweep only.
- No new npm dependencies.
- All work on the current branch (`music-map`).
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Env vars available in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` (already re-minted 2026-07-09 with `playlist-read-private` + `playlist-read-collaborative` scopes).
- Supabase project id: `vvnzlxayrqqvoubvcunl`.
- Unrated songs (`rating = null`) render as a neutral gray score block (`#D4D4D4`) showing `–`; they are EXCLUDED from artist-ranking averages and from `buildTrackRatingMap`.

## Prerequisite — DONE (2026-07-09)

The API cannot read Spotify-owned Wrapped playlists, but it CAN read Joon's own copies. Joon has copied all ten years; ids verified via the API:

| year | playlist id | tracks |
|------|-------------|--------|
| 2016 | `36jgG3FZUW7yf3gu9g6D3N` | 101 ⚠️ confirm extra track is appended at END |
| 2017 | `0wRrpuHXkb345LUdQ9nQOh` | 100 |
| 2018 | `6oBrWi86ZvrVfKMCb8DTxK` | 100 |
| 2019 | `4ixj4isGjmw95Z8P0BFjDP` | 100 |
| 2020 | `300iT0dtj4nJifheF2MSdo` | 100 |
| 2021 | `33jZsbPDoMvvfI6fDi8LNY` | 100 |
| 2022 | `1MfbMv5q0b0BdpbuK3Lzov` | 101 ⚠️ confirm extra track is appended at END |
| 2023 | `3sfYOY1h05P2cEJWoidx1N` | 100 (pos 1 = "Baby again..") |
| 2024 | `1YbzMr2yNVuuQGWuXE1mIH` | 100 |
| 2025 | `3PE5ElFMXYRyT2otoc3PpU` | 100 |

Measured 2026-07-09: 873 unique tracks across the ten playlists; 116 already in the catalog (by track id or ISRC); **757 new unrated songs** will be created; 84 tracks appear in 2+ years.

⚠️ For 2016 and 2022 (101 tracks each), ask Joon whether the extra track sits at the END (ranks unshifted — import as-is) or elsewhere (he re-copies the playlist and the id gets updated). Do this in Task 10 before the real import.

---

### Task 1: `wrapped_entries` table + `WrappedEntry` type

**Files:**
- Create: Supabase migration `create_wrapped_entries` (applied remotely, not a repo file)
- Modify: `types/database.ts` (append after the `MapPin` interface)

**Interfaces:**
- Produces: table `public.wrapped_entries` with columns `id uuid pk`, `year int`, `rank int`, `spotify_track_id text`, `isrc text null`, `track_name text`, `artist_name text`, `created_at timestamptz`; unique `(year, rank)`; public read RLS. TypeScript type `WrappedEntry` exported from `types/database.ts`.

- [ ] **Step 1: Apply the migration**

Apply with the Supabase MCP tool (`mcp__claude_ai_Supabase__apply_migration`, project_id `vvnzlxayrqqvoubvcunl`, name `create_wrapped_entries`) — or, if MCP is unavailable, ask Joon to paste it into the Supabase SQL editor:

```sql
create table if not exists public.wrapped_entries (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year between 2000 and 2100),
  rank int not null check (rank between 1 and 200),
  spotify_track_id text not null,
  isrc text,
  track_name text not null,
  artist_name text not null,
  created_at timestamptz not null default now(),
  unique (year, rank)
);

create index if not exists wrapped_entries_track_idx
  on public.wrapped_entries (spotify_track_id);
create index if not exists wrapped_entries_isrc_idx
  on public.wrapped_entries (isrc);

alter table public.wrapped_entries enable row level security;

create policy "Public read access" on public.wrapped_entries
  for select using (true);
```

(No insert/update/delete policies: the import script writes with the service-role key, which bypasses RLS — same posture as the other tables.)

- [ ] **Step 2: Verify the table is publicly readable**

Run:
```bash
cd "/Users/joonwoopark/Library/Mobile Documents/com~apple~CloudDocs/Coding Projects/joonlovesmusic" && URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) && KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2) && curl -s "$URL/rest/v1/wrapped_entries?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: `[]` (empty array, no error object).

- [ ] **Step 3: Add the `WrappedEntry` type**

Append to `types/database.ts`:

```ts
export interface WrappedEntry {
  id: string;
  year: number;
  rank: number;
  spotify_track_id: string;
  isrc: string | null;
  track_name: string;
  artist_name: string;
  created_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add types/database.ts
git commit -m "feat: wrapped_entries table + WrappedEntry type

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/wrappedThemes.ts` — per-year palettes + rank styling

**Files:**
- Create: `lib/wrappedThemes.ts`
- Test: `lib/wrappedThemes.test.ts`

**Interfaces:**
- Produces:
  - `interface WrappedTheme { colors: [string, string, string]; text: string }`
  - `getWrappedTheme(year: number): WrappedTheme` — returns the year's theme or `FALLBACK_THEME` for unknown years.
  - `getRankNumberStyle(rank: number, theme: WrappedTheme): { color: string; textShadow?: string }` — gold/silver/bronze for ranks 1/2/3 (with hard pixel-offset text shadow), otherwise `theme.text`, no shadow.
  - `WRAPPED_YEARS: number[]` — `[2016..2025]`.

Palette note: these are best-effort recreations of each Spotify Wrapped year theme, picked to be legible with the designated `text` color. Joon fine-tunes any year during final browser sign-off by editing this one file.

- [ ] **Step 1: Write the failing test**

Create `lib/wrappedThemes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  WRAPPED_YEARS,
  getWrappedTheme,
  getRankNumberStyle,
} from "@/lib/wrappedThemes";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("wrappedThemes", () => {
  it("covers every year 2016-2025", () => {
    expect(WRAPPED_YEARS).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it("every year has 3 valid hex colors and a valid text color", () => {
    for (const year of WRAPPED_YEARS) {
      const theme = getWrappedTheme(year);
      expect(theme.colors).toHaveLength(3);
      for (const c of theme.colors) expect(c).toMatch(HEX);
      expect(theme.text).toMatch(HEX);
      // text must differ from the background it sits on
      expect(theme.text.toLowerCase()).not.toBe(theme.colors[0].toLowerCase());
    }
  });

  it("unknown year falls back to a complete theme", () => {
    const theme = getWrappedTheme(2099);
    expect(theme.colors).toHaveLength(3);
    expect(theme.text).toMatch(HEX);
  });

  it("ranks 1-3 get medal colors with a pixel shadow, others get theme text", () => {
    const theme = getWrappedTheme(2024);
    const gold = getRankNumberStyle(1, theme);
    const silver = getRankNumberStyle(2, theme);
    const bronze = getRankNumberStyle(3, theme);
    const plain = getRankNumberStyle(14, theme);
    expect(gold.color).toBe("#FFD700");
    expect(silver.color).toBe("#E8ECF1");
    expect(bronze.color).toBe("#CD7F32");
    for (const s of [gold, silver, bronze]) expect(s.textShadow).toBeTruthy();
    expect(plain.color).toBe(theme.text);
    expect(plain.textShadow).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/wrappedThemes.test.ts`
Expected: FAIL — cannot resolve `@/lib/wrappedThemes`.

- [ ] **Step 3: Write the implementation**

Create `lib/wrappedThemes.ts`:

```ts
// Per-year Spotify Wrapped badge themes, hand-curated from each year's
// "Your Top Songs YYYY" cover art. colors = [background, accent stripe, extra
// accent]; text = designated readable color on that background.
// Tuning a year = editing one entry here.

export interface WrappedTheme {
  colors: [string, string, string];
  text: string;
}

export const WRAPPED_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

const THEMES: Record<number, WrappedTheme> = {
  2016: { colors: ["#2941AB", "#8AA8FF", "#CFF27E"], text: "#FFFFFF" },
  2017: { colors: ["#111111", "#FF4B6E", "#3EF0C5"], text: "#FFFFFF" },
  2018: { colors: ["#B02897", "#FF6BC1", "#2D0F41"], text: "#FFFFFF" },
  2019: { colors: ["#F94F6D", "#FFC864", "#2E77D0"], text: "#111111" },
  2020: { colors: ["#7358FF", "#B7FF36", "#1D1147"], text: "#FFFFFF" },
  2021: { colors: ["#0F0E17", "#00F5D4", "#F72585"], text: "#FFFFFF" },
  2022: { colors: ["#FF54B0", "#B4FF00", "#5C2E91"], text: "#111111" },
  2023: { colors: ["#FF3D5A", "#FFC0CB", "#7C3AED"], text: "#FFFFFF" },
  2024: { colors: ["#FF6437", "#FFD1B8", "#1D2769"], text: "#111111" },
  2025: { colors: ["#4F17D8", "#9BF0E1", "#FF7BAC"], text: "#FFFFFF" },
};

const FALLBACK_THEME: WrappedTheme = {
  colors: ["#111111", "#9FE870", "#FFFFFF"],
  text: "#FFFFFF",
};

export function getWrappedTheme(year: number): WrappedTheme {
  return THEMES[year] ?? FALLBACK_THEME;
}

export const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#E8ECF1",
  3: "#CD7F32",
};

export function getRankNumberStyle(
  rank: number,
  theme: WrappedTheme
): { color: string; textShadow?: string } {
  const medal = MEDAL_COLORS[rank];
  if (medal) {
    // Hard offset shadow keeps the metallic number readable on any theme
    // background (the gold-on-gold problem).
    const shadow = theme.text === "#FFFFFF" ? "#111111" : theme.colors[2];
    return { color: medal, textShadow: `3px 3px 0 ${shadow}` };
  }
  return { color: theme.text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/wrappedThemes.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/wrappedThemes.ts lib/wrappedThemes.test.ts
git commit -m "feat: hand-curated wrapped year themes + medal rank styling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `lib/wrapped.ts` — match-filter builder

**Files:**
- Create: `lib/wrapped.ts`
- Test: `lib/wrapped.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `buildWrappedFilter(spotifyTrackId: string | null | undefined, isrc: string | null | undefined): string | null` — a PostgREST `.or()` filter string matching either identifier, or `null` when the song has neither (callers skip the query entirely).

- [ ] **Step 1: Write the failing test**

Create `lib/wrapped.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildWrappedFilter } from "@/lib/wrapped";

describe("buildWrappedFilter", () => {
  it("matches on both identifiers when both exist", () => {
    expect(buildWrappedFilter("abc123", "USUM72309521")).toBe(
      "spotify_track_id.eq.abc123,isrc.eq.USUM72309521"
    );
  });

  it("matches on track id alone", () => {
    expect(buildWrappedFilter("abc123", null)).toBe("spotify_track_id.eq.abc123");
    expect(buildWrappedFilter("abc123", undefined)).toBe("spotify_track_id.eq.abc123");
  });

  it("matches on isrc alone", () => {
    expect(buildWrappedFilter(null, "USUM72309521")).toBe("isrc.eq.USUM72309521");
  });

  it("returns null when the song has neither identifier", () => {
    expect(buildWrappedFilter(null, null)).toBeNull();
    expect(buildWrappedFilter(undefined, undefined)).toBeNull();
    expect(buildWrappedFilter("", "")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/wrapped.test.ts`
Expected: FAIL — cannot resolve `@/lib/wrapped`.

- [ ] **Step 3: Write the implementation**

Create `lib/wrapped.ts`:

```ts
// Builds the PostgREST .or() filter that finds a song's Wrapped entries by
// Spotify track id OR ISRC (the ISRC catches "same recording, different
// Spotify version"). Returns null when the song has neither identifier —
// callers must then skip the query.
//
// Spotify track ids are base62 and ISRCs are alphanumeric, so no PostgREST
// escaping is needed (no commas/parens possible — unlike song titles, see
// lib/songSearchFilter).

export function buildWrappedFilter(
  spotifyTrackId: string | null | undefined,
  isrc: string | null | undefined
): string | null {
  const parts: string[] = [];
  if (spotifyTrackId) parts.push(`spotify_track_id.eq.${spotifyTrackId}`);
  if (isrc) parts.push(`isrc.eq.${isrc}`);
  return parts.length > 0 ? parts.join(",") : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/wrapped.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/wrapped.ts lib/wrapped.test.ts
git commit -m "feat: wrapped entry match-filter builder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `WrappedBadge` component + podium CSS

**Files:**
- Create: `app/components/WrappedBadge.tsx`
- Modify: `app/globals.css` (append at end of file)

**Interfaces:**
- Consumes: `getWrappedTheme`, `getRankNumberStyle` from `@/lib/wrappedThemes` (Task 2).
- Produces: default-export React component `WrappedBadge({ year, rank }: { year: number; rank: number })`. Purely presentational; no data fetching.

Visual contract (approved mockup): card mirrors the existing award card (`px-8 py-6 text-center`, `text-[18px] font-semibold` label, `font-black` number, `border-2 border-black`, no rounding). Non-podium: flat card + top accent stripe. Podium (rank ≤ 3): metallic gradient frame (gold/silver/bronze) with slow shimmer, diagonal light-sweep on hover, number bumped `text-[48px]` → `text-[56px]`.

- [ ] **Step 1: Append podium CSS to `app/globals.css`**

```css
/* --- Wrapped badge podium effects (ranks 1-3) --------------------------- */

.wrapped-podium-frame {
  padding: 6px;
  border: 2px solid #000;
  background-size: 300% 300%;
  animation: wrapped-shimmer 4s ease-in-out infinite;
}

.wrapped-frame-gold {
  background-image: linear-gradient(135deg, #8a6d00 0%, #ffd700 20%, #fff6c4 38%, #ffd700 55%, #b8860b 75%, #ffd700 100%);
}

.wrapped-frame-silver {
  background-image: linear-gradient(135deg, #7d838c 0%, #c9cdd3 20%, #ffffff 38%, #c9cdd3 55%, #8f959e 75%, #c9cdd3 100%);
}

.wrapped-frame-bronze {
  background-image: linear-gradient(135deg, #6e3f14 0%, #cd7f32 20%, #f0c090 38%, #cd7f32 55%, #8c5420 75%, #cd7f32 100%);
}

@keyframes wrapped-shimmer {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
}

.wrapped-sweep {
  position: absolute;
  top: -20%;
  bottom: -20%;
  width: 45%;
  left: -80%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  pointer-events: none;
}

.wrapped-podium-frame:hover .wrapped-sweep {
  animation: wrapped-sweep 0.7s ease-out;
}

@keyframes wrapped-sweep {
  from { left: -80%; }
  to { left: 160%; }
}
```

- [ ] **Step 2: Create the component**

Create `app/components/WrappedBadge.tsx`:

```tsx
"use client";

import { getWrappedTheme, getRankNumberStyle } from "@/lib/wrappedThemes";

interface WrappedBadgeProps {
  year: number;
  rank: number;
}

// One "Joon's Top Songs YYYY / #rank" honor badge. Ranks 1-3 get the metallic
// podium frame (gradient + shimmer + hover sweep, defined in globals.css).
export default function WrappedBadge({ year, rank }: WrappedBadgeProps) {
  const theme = getWrappedTheme(year);
  const rankStyle = getRankNumberStyle(rank, theme);
  const podium = rank <= 3;

  const card = (
    <div
      className="relative overflow-hidden px-8 py-6 text-center border-2 border-black"
      style={{ backgroundColor: theme.colors[0], color: theme.text }}
    >
      {!podium && (
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: theme.colors[1] }}
        />
      )}
      {podium && <div className="wrapped-sweep" aria-hidden="true" />}
      <p className="text-[18px] font-semibold leading-tight">
        Joon&apos;s Top Songs
      </p>
      <p className="text-[18px] font-semibold leading-tight">{year}</p>
      <p
        className={`${podium ? "text-[56px]" : "text-[48px]"} font-black mt-2 leading-none`}
        style={rankStyle}
      >
        #{rank}
      </p>
    </div>
  );

  if (!podium) return card;

  const frameClass =
    rank === 1
      ? "wrapped-frame-gold"
      : rank === 2
        ? "wrapped-frame-silver"
        : "wrapped-frame-bronze";

  return <div className={`wrapped-podium-frame ${frameClass}`}>{card}</div>;
}
```

- [ ] **Step 3: Verify it compiles and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (pre-existing warnings unrelated to these files are fine).

- [ ] **Step 4: Commit**

```bash
git add app/components/WrappedBadge.tsx app/globals.css
git commit -m "feat: WrappedBadge component with metallic podium treatment

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Import script (`--list` + per-year import)

**Files:**
- Create: `scripts/wrapped-helpers.mjs` (pure logic, unit-tested)
- Create: `scripts/wrapped-helpers.test.mjs`
- Create: `scripts/import-wrapped.mjs` (I/O shell)

**Interfaces:**
- Consumes: `wrapped_entries` table (Task 1); nullable `songs.rating` (Task 7 — only needed at RUN time in Task 10, not to write/test this script). Env vars from Global Constraints.
- Produces:
  - `buildRows(year, items)` in helpers → `{ rows: Array<{year, rank, spotify_track_id, isrc, track_name, artist_name}>, warnings: string[] }`. `items` = raw Spotify playlist-track items. Rank = playlist position (index + 1); null/local tracks are skipped with a warning but do NOT shift later ranks.
  - `pickNewTracks(tracks, existingIds, existingIsrcs)` in helpers → array of raw track objects NOT in the catalog, deduped among themselves by track id and by ISRC (first occurrence wins).
  - `buildSongRow(track)` in helpers → an unrated `songs` insert row (`rating: null`, full metadata).
  - CLI: `node --env-file=.env.local scripts/import-wrapped.mjs --list` prints user-owned playlists (name, id, track count). Without `--list`, imports every year in `WRAPPED_PLAYLIST_IDS` (deleting that year's rows first — idempotent), then creates unrated `songs` rows for Wrapped tracks missing from the catalog (rerun-safe: already-created songs match by id/isrc and are skipped), and prints a summary.

- [ ] **Step 1: Write the failing helper test**

Create `scripts/wrapped-helpers.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { buildRows } from "./wrapped-helpers.mjs";

const item = (id, name, artist, isrc) => ({
  track: {
    id,
    name,
    artists: [{ name: artist }],
    external_ids: isrc ? { isrc } : {},
  },
});

describe("buildRows", () => {
  it("maps playlist position to rank, 1-based", () => {
    const { rows, warnings } = buildRows(2023, [
      item("aaa", "Song A", "Artist A", "ISRC1"),
      item("bbb", "Song B", "Artist B", "ISRC2"),
    ]);
    expect(warnings).toEqual([]);
    expect(rows).toEqual([
      { year: 2023, rank: 1, spotify_track_id: "aaa", isrc: "ISRC1", track_name: "Song A", artist_name: "Artist A" },
      { year: 2023, rank: 2, spotify_track_id: "bbb", isrc: "ISRC2", track_name: "Song B", artist_name: "Artist B" },
    ]);
  });

  it("skips null/local tracks with a warning without shifting later ranks", () => {
    const { rows, warnings } = buildRows(2020, [
      item("aaa", "Song A", "Artist A", "ISRC1"),
      { track: null },
      item("ccc", "Song C", "Artist C", null),
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 3]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("2020");
    expect(warnings[0]).toContain("position 2");
  });

  it("stores null isrc when Spotify has none", () => {
    const { rows } = buildRows(2020, [item("aaa", "Song A", "Artist A", null)]);
    expect(rows[0].isrc).toBeNull();
  });

  it("joins multiple artists with a comma like the songs table does", () => {
    const { rows } = buildRows(2023, [
      {
        track: {
          id: "aaa",
          name: "Collab",
          artists: [{ name: "One" }, { name: "Two" }],
          external_ids: { isrc: "X" },
        },
      },
    ]);
    expect(rows[0].artist_name).toBe("One, Two");
  });
});

describe("pickNewTracks", () => {
  const t = (id, isrc) => ({ id, name: id, artists: [], external_ids: isrc ? { isrc } : {} });

  it("drops tracks already in the catalog by id or isrc", () => {
    const picked = pickNewTracks(
      [t("aaa", "I1"), t("bbb", "I2"), t("ccc", "I3")],
      new Set(["aaa"]),
      new Set(["I2"])
    );
    expect(picked.map((x) => x.id)).toEqual(["ccc"]);
  });

  it("dedupes new tracks against each other by id and isrc, first wins", () => {
    const picked = pickNewTracks(
      [t("aaa", "SAME"), t("aaa", "SAME"), t("bbb", "SAME"), t("ccc", null), t("ddd", null)],
      new Set(),
      new Set()
    );
    expect(picked.map((x) => x.id)).toEqual(["aaa", "ccc", "ddd"]);
  });
});

describe("buildSongRow", () => {
  it("maps a raw track to an unrated songs row", () => {
    const row = buildSongRow({
      id: "aaa",
      name: "Song A",
      artists: [{ name: "One" }, { name: "Two" }],
      external_ids: { isrc: "ISRC1" },
      album: {
        name: "Album A",
        images: [{ url: "https://img/cover.jpg" }],
        release_date: "2019-03-15",
        album_type: "album",
      },
      duration_ms: 201000,
      explicit: true,
      track_number: 3,
      disc_number: 1,
    });
    expect(row).toEqual({
      title: "Song A",
      artist: "One, Two",
      rating: null,
      cover_url: "https://img/cover.jpg",
      album_name: "Album A",
      release_date: "2019-03-15",
      album_type: "album",
      spotify_track_id: "aaa",
      isrc: "ISRC1",
      duration_ms: 201000,
      explicit: true,
      track_number: 3,
      disc_number: 1,
    });
  });

  it("tolerates missing album/metadata with nulls", () => {
    const row = buildSongRow({ id: "aaa", name: "Bare", artists: [{ name: "X" }], external_ids: {} });
    expect(row.cover_url).toBeNull();
    expect(row.album_name).toBeNull();
    expect(row.isrc).toBeNull();
    expect(row.rating).toBeNull();
  });
});
```

(Update the import line to `import { buildRows, pickNewTracks, buildSongRow } from "./wrapped-helpers.mjs";`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/wrapped-helpers.test.mjs`
Expected: FAIL — cannot resolve `./wrapped-helpers.mjs`.

- [ ] **Step 3: Write the helpers**

Create `scripts/wrapped-helpers.mjs`:

```js
// Pure logic for the Wrapped import script — kept I/O-free so vitest can
// cover the rank-alignment and dedup rules.

// Raw playlist items -> wrapped_entries rows. Rank = playlist position
// (1-based). Null/local tracks (Spotify returns track: null for removed or
// local files) are skipped with a warning but their position is preserved so
// later ranks do not shift.
export function buildRows(year, items) {
  const rows = [];
  const warnings = [];
  items.forEach((entry, index) => {
    const track = entry?.track;
    if (!track || !track.id) {
      warnings.push(`year ${year}: skipped unreadable track at position ${index + 1}`);
      return;
    }
    rows.push({
      year,
      rank: index + 1,
      spotify_track_id: track.id,
      isrc: track.external_ids?.isrc ?? null,
      track_name: track.name ?? "",
      artist_name: (track.artists ?? []).map((a) => a.name).join(", "),
    });
  });
  return { rows, warnings };
}

// Raw tracks (all years, in order) -> the subset needing new unrated songs
// rows: not already in the catalog by id or ISRC, deduped among themselves by
// both identifiers (first occurrence wins, so the earliest-processed year's
// version of a recording becomes the song page).
export function pickNewTracks(tracks, existingIds, existingIsrcs) {
  const picked = [];
  const seenIds = new Set();
  const seenIsrcs = new Set();
  for (const track of tracks) {
    if (!track || !track.id) continue;
    const isrc = track.external_ids?.isrc ?? null;
    if (existingIds.has(track.id) || (isrc && existingIsrcs.has(isrc))) continue;
    if (seenIds.has(track.id) || (isrc && seenIsrcs.has(isrc))) continue;
    seenIds.add(track.id);
    if (isrc) seenIsrcs.add(isrc);
    picked.push(track);
  }
  return picked;
}

// Raw track -> unrated songs insert row. Mirrors the columns the admin
// add-song flow writes, with rating explicitly null.
export function buildSongRow(track) {
  return {
    title: track.name ?? "",
    artist: (track.artists ?? []).map((a) => a.name).join(", "),
    rating: null,
    cover_url: track.album?.images?.[0]?.url ?? null,
    album_name: track.album?.name ?? null,
    release_date: track.album?.release_date ?? null,
    album_type: track.album?.album_type ?? null,
    spotify_track_id: track.id,
    isrc: track.external_ids?.isrc ?? null,
    duration_ms: track.duration_ms ?? null,
    explicit: track.explicit ?? null,
    track_number: track.track_number ?? null,
    disc_number: track.disc_number ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/wrapped-helpers.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the import script**

Create `scripts/import-wrapped.mjs`:

```js
// One-time import of Joon's Spotify Wrapped ("Your Top Songs YYYY") rankings
// into the wrapped_entries Supabase table.
//
// Spotify's API blocks Spotify-owned algorithmic playlists (verified
// 2026-07-09: zero spotify-owned playlists visible even with playlist scopes),
// so this reads Joon's OWN COPIES of each Wrapped playlist. To copy one in the
// Spotify app: open "Your Top Songs YYYY" -> ... -> Add to other playlist ->
// New playlist (order is preserved).
//
// Usage:
//   node --env-file=.env.local scripts/import-wrapped.mjs --list
//     Prints your playlists (name/id/tracks) to find copies for the map below.
//   node --env-file=.env.local scripts/import-wrapped.mjs
//     Imports every year in WRAPPED_PLAYLIST_IDS (each year's wrapped_entries
//     rows are deleted and rewritten — rerunnable), then creates unrated
//     songs rows (rating = null) for Wrapped tracks missing from the catalog
//     (rerun-safe: existing songs match by track id / ISRC and are skipped).
//
// Needs playlist-read-private scope on SPOTIFY_REFRESH_TOKEN (minted 2026-07-09).

import { buildRows, pickNewTracks, buildSongRow } from "./wrapped-helpers.mjs";

// year -> playlist id of Joon's own copy (ids verified via API, 2026-07-09).
const WRAPPED_PLAYLIST_IDS = {
  2016: "36jgG3FZUW7yf3gu9g6D3N", // ⚠️ 101 tracks; confirm extra is at END with Joon (Task 10 Step 1)
  2017: "0wRrpuHXkb345LUdQ9nQOh",
  2018: "6oBrWi86ZvrVfKMCb8DTxK",
  2019: "4ixj4isGjmw95Z8P0BFjDP",
  2020: "300iT0dtj4nJifheF2MSdo",
  2021: "33jZsbPDoMvvfI6fDi8LNY",
  2022: "1MfbMv5q0b0BdpbuK3Lzov", // ⚠️ 101 tracks; confirm extra is at END with Joon (Task 10 Step 1)
  2023: "3sfYOY1h05P2cEJWoidx1N",
  2024: "1YbzMr2yNVuuQGWuXE1mIH",
  2025: "3PE5ElFMXYRyT2otoc3PpU",
};

const SPOTIFY_API = "https://api.spotify.com/v1";

const env = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Run with: node --env-file=.env.local scripts/import-wrapped.mjs`);
    process.exit(1);
  }
  return value;
};

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const clientId = env("SPOTIFY_CLIENT_ID");
const clientSecret = env("SPOTIFY_CLIENT_SECRET");
const refreshToken = env("SPOTIFY_REFRESH_TOKEN");

async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function spotifyGet(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify GET ${url} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function listPlaylists(token) {
  const playlists = [];
  let url = `${SPOTIFY_API}/me/playlists?limit=50`;
  while (url) {
    const page = await spotifyGet(token, url);
    for (const p of page.items ?? []) {
      if (p) playlists.push(p);
    }
    url = page.next;
  }
  return playlists;
}

async function fetchPlaylistItems(token, playlistId) {
  const items = [];
  const fields =
    "next,items(track(id,name,artists(name),external_ids,album(name,images,release_date,album_type),duration_ms,explicit,track_number,disc_number))";
  let url = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100&fields=${encodeURIComponent(fields)}`;
  while (url) {
    const page = await spotifyGet(token, url);
    items.push(...(page.items ?? []));
    url = page.next;
  }
  return items;
}

const sbHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function replaceYear(year, rows) {
  const del = await fetch(`${supabaseUrl}/rest/v1/wrapped_entries?year=eq.${year}`, {
    method: "DELETE",
    headers: sbHeaders,
  });
  if (!del.ok) throw new Error(`Delete year ${year} failed (${del.status}): ${await del.text()}`);
  const ins = await fetch(`${supabaseUrl}/rest/v1/wrapped_entries`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) throw new Error(`Insert year ${year} failed (${ins.status}): ${await ins.text()}`);
}

// All catalog identifiers, paginated past PostgREST's 1000-row default.
async function fetchExistingSongIdentifiers() {
  const all = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/songs?select=spotify_track_id,isrc&limit=${page}&offset=${from}`,
      { headers: sbHeaders }
    );
    if (!res.ok) throw new Error(`Fetch songs failed (${res.status}): ${await res.text()}`);
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

async function insertSongs(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const res = await fetch(`${supabaseUrl}/rest/v1/songs`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Insert songs failed (${res.status}): ${await res.text()}`);
  }
}

const token = await getAccessToken();

if (process.argv.includes("--list")) {
  const playlists = await listPlaylists(token);
  console.log(`\n${playlists.length} playlists in your library:\n`);
  for (const p of playlists) {
    console.log(`${String(p.tracks?.total ?? "?").padStart(4)} tracks  ${p.id}  ${p.name}  (owner: ${p.owner?.id})`);
  }
  console.log("\nPaste the matching ids into WRAPPED_PLAYLIST_IDS in this script.");
  process.exit(0);
}

let imported = 0;
const allTracks = [];
for (const [yearStr, playlistId] of Object.entries(WRAPPED_PLAYLIST_IDS)) {
  const year = Number(yearStr);
  const items = await fetchPlaylistItems(token, playlistId);
  if (items.length !== 100) {
    console.warn(`⚠️  year ${year}: playlist has ${items.length} tracks (expected 100) — importing anyway, ranks = playlist positions.`);
  }
  const { rows, warnings } = buildRows(year, items);
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  await replaceYear(year, rows);
  console.log(`✅ year ${year}: imported ${rows.length} wrapped entries.`);
  imported += 1;
  for (const it of items) {
    if (it?.track?.id) allTracks.push(it.track);
  }
}

// Unrated song pages for Wrapped tracks missing from the catalog.
const existing = await fetchExistingSongIdentifiers();
const existingIds = new Set(existing.map((s) => s.spotify_track_id).filter(Boolean));
const existingIsrcs = new Set(existing.map((s) => s.isrc).filter(Boolean));
const newTracks = pickNewTracks(allTracks, existingIds, existingIsrcs);
const songRows = newTracks.map(buildSongRow);
await insertSongs(songRows);
console.log(`✅ created ${songRows.length} unrated songs (scanned ${allTracks.length} wrapped tracks against ${existing.length} catalog songs).`);

console.log(`\nDone. ${imported} year(s) imported.`);
```

- [ ] **Step 6: Verify `--list` mode works against the real API**

Run:
```bash
cd "/Users/joonwoopark/Library/Mobile Documents/com~apple~CloudDocs/Coding Projects/joonlovesmusic" && node --env-file=.env.local scripts/import-wrapped.mjs --list | head -20
```
Expected: a list of ~269 playlists with ids; includes `1MfbMv5q0b0BdpbuK3Lzov` and `1z11gypRZWW5xZ9mCbHzWN`.

- [ ] **Step 7: Commit**

```bash
git add scripts/wrapped-helpers.mjs scripts/wrapped-helpers.test.mjs scripts/import-wrapped.mjs
git commit -m "feat: wrapped playlist import script with --list discovery mode

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Song page integration

**Files:**
- Modify: `app/musics/[id]/page.tsx`

**Interfaces:**
- Consumes: `WrappedEntry` type (Task 1), `buildWrappedFilter` (Task 3), `WrappedBadge` (Task 4), `wrapped_entries` table (Task 1).
- Produces: the Awards section renders Wrapped badges (newest year first) alongside manual award cards, and appears when either exists.

Note (deliberate spec deviation): the wrapped query needs the song row's `spotify_track_id`/`isrc`, so it cannot join the id-keyed `Promise.all`; it runs immediately after the song row arrives. One small indexed query — imperceptible.

- [ ] **Step 1: Add imports and state**

In `app/musics/[id]/page.tsx`:

Change the types import line to:
```tsx
import type { Song, Award, RatingHistory, CommentHistory, WrappedEntry } from "@/types/database";
```

Add below the other imports:
```tsx
import WrappedBadge from "@/app/components/WrappedBadge";
import { buildWrappedFilter } from "@/lib/wrapped";
```

Add below the `awards` state declaration:
```tsx
const [wrappedEntries, setWrappedEntries] = useState<WrappedEntry[]>([]);
```

- [ ] **Step 2: Fetch wrapped entries after the song row arrives**

Inside `fetchSong()`, after `setCommentHistory(commentHistoryData || []);` add:

```tsx
        // Wrapped honors depend on the song row's identifiers, so this runs
        // after the parallel batch. Matches by track id OR ISRC (version-proof).
        const wrappedFilter = buildWrappedFilter(songData?.spotify_track_id, songData?.isrc);
        if (wrappedFilter) {
          const { data: wrappedData, error: wrappedError } = await supabase
            .from("wrapped_entries")
            .select("*")
            .or(wrappedFilter)
            .order("year", { ascending: false });
          if (wrappedError) throw wrappedError;
          setWrappedEntries(wrappedData || []);
        }
```

- [ ] **Step 3: Render badges in the Awards section**

Replace the Awards section block:

```tsx
            {/* Awards Section */}
            {awards.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Awards</h2>
                <div className="flex flex-wrap gap-4">
                  {awards.map((award) => (
```

with:

```tsx
            {/* Awards Section — Wrapped honors + manual awards */}
            {(awards.length > 0 || wrappedEntries.length > 0) && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Awards</h2>
                <div className="flex flex-wrap gap-4 items-start">
                  {wrappedEntries.map((entry) => (
                    <WrappedBadge key={entry.id} year={entry.year} rank={entry.rank} />
                  ))}
                  {awards.map((award) => (
```

(The rest of the existing award-card markup stays untouched.)

- [ ] **Step 4: Verify compile, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: all pass.

- [ ] **Step 5: Visual smoke test with seeded data**

Insert two fake entries pointing at a real song (grab a song with a `spotify_track_id` first):

```bash
cd "/Users/joonwoopark/Library/Mobile Documents/com~apple~CloudDocs/Coding Projects/joonlovesmusic" && URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) && KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) && curl -s "$URL/rest/v1/songs?select=id,title,spotify_track_id&spotify_track_id=not.is.null&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Then with that `spotify_track_id` (call it TRACKID) insert a podium and a plain entry (re-export `URL`/`KEY` as above if running in a fresh shell):

```bash
curl -s -X POST "$URL/rest/v1/wrapped_entries" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '[{"year":2098,"rank":1,"spotify_track_id":"TRACKID","isrc":null,"track_name":"smoke","artist_name":"smoke"},{"year":2097,"rank":42,"spotify_track_id":"TRACKID","isrc":null,"track_name":"smoke","artist_name":"smoke"}]'
```

Start the dev server detached (`npm run dev` via run_in_background — iCloud path makes first compile slow), open `http://localhost:3000/musics/<song id>`, and confirm: gold-framed shimmering #1 badge (fallback theme, year 2098), flat #42 badge, hover sweep works, existing layout intact. Then delete the smoke rows:

```bash
curl -s -X DELETE "$URL/rest/v1/wrapped_entries?year=in.(2097,2098)" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

- [ ] **Step 6: Commit**

```bash
git add "app/musics/[id]/page.tsx"
git commit -m "feat: render wrapped honor badges on song pages

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Nullable rating foundation (`ratingColors` helpers + migration)

**Files:**
- Create: Supabase migration `songs_rating_nullable` (applied remotely, not a repo file)
- Modify: `lib/ratingColors.ts`
- Test: `lib/ratingColors.test.ts` (new)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `getRatingColor(rating: number | null | undefined): string` (null/undefined → `#D4D4D4` gray) and `displayRating(rating: number | null | undefined): string` (null/undefined → `"–"`, else the number as a string). DB column `songs.rating` accepts NULL. The `Song` TYPE is NOT changed in this task (that happens with the surface fixes in Task 8 so every task stays compile-green).

- [ ] **Step 1: Apply the migration**

Apply with the Supabase MCP tool (`mcp__claude_ai_Supabase__apply_migration`, project_id `vvnzlxayrqqvoubvcunl`, name `songs_rating_nullable`):

```sql
alter table public.songs alter column rating drop not null;
```

- [ ] **Step 2: Write the failing test**

Create `lib/ratingColors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getRatingColor, displayRating } from "@/lib/ratingColors";

describe("getRatingColor", () => {
  it("keeps the 3-color gradient for numbers", () => {
    expect(getRatingColor(0)).toBe("#FF0000");
    expect(getRatingColor(49)).toBe("#FF0000");
    expect(getRatingColor(50)).toBe("#FFCC33");
    expect(getRatingColor(69)).toBe("#FFCC33");
    expect(getRatingColor(70)).toBe("#66CC33");
    expect(getRatingColor(100)).toBe("#66CC33");
  });

  it("returns neutral gray for unrated", () => {
    expect(getRatingColor(null)).toBe("#D4D4D4");
    expect(getRatingColor(undefined)).toBe("#D4D4D4");
  });
});

describe("displayRating", () => {
  it("shows the number for rated songs", () => {
    expect(displayRating(87)).toBe("87");
    expect(displayRating(0)).toBe("0");
  });

  it("shows an en-dash for unrated songs", () => {
    expect(displayRating(null)).toBe("–");
    expect(displayRating(undefined)).toBe("–");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/ratingColors.test.ts`
Expected: FAIL — `displayRating` is not exported / null not handled.

- [ ] **Step 4: Update the implementation**

In `lib/ratingColors.ts`, change the signature and add the null branch + helper:

```ts
/** Neutral gray for songs without a rating yet (unrated Wrapped imports). */
const UNRATED_COLOR = "#D4D4D4";

export function getRatingColor(rating: number | null | undefined): string {
  if (rating == null) {
    return UNRATED_COLOR;
  }
  // Clamp rating between 0 and 100
  const clampedRating = Math.max(0, Math.min(100, rating));

  // Red for unfavorable (0-49)
  if (clampedRating < 50) {
    return "#FF0000";
  }

  // Yellow for mixed/okay (50-69)
  if (clampedRating < 70) {
    return "#FFCC33";
  }

  // Green for favorable (70-100)
  return "#66CC33";
}

/** Score-block text: the rating number, or an en-dash when unrated. */
export function displayRating(rating: number | null | undefined): string {
  return rating == null ? "–" : String(rating);
}
```

(Keep the existing top-of-file doc comment.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/ratingColors.test.ts && npx tsc --noEmit`
Expected: PASS; tsc clean (widening a parameter type breaks no caller).

- [ ] **Step 6: Commit**

```bash
git add lib/ratingColors.ts lib/ratingColors.test.ts
git commit -m "feat: nullable rating groundwork — gray color + en-dash display for unrated

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Null-safe rating across every surface

**Files:**
- Modify: `types/database.ts` (Song.rating), `lib/spotify.ts` + `lib/spotify.test.ts`, `app/components/SongBar.tsx`, `app/components/SongPopupCard.tsx`, `app/musics/page.tsx`, `app/musics/[id]/page.tsx`, `app/albums/[albumName]/page.tsx`, `app/artists/[artistName]/page.tsx`, `app/artist-rankings/page.tsx`, `app/admin/edit/[id]/page.tsx`, `app/api/songs/[id]/route.ts` (if it validates rating), `app/admin/music/page.tsx` (only if tsc flags it)

**Interfaces:**
- Consumes: `getRatingColor` + `displayRating` (Task 7).
- Produces: `Song.rating: number | null`; the whole app compiles and behaves with null ratings. `buildTrackRatingMap` accepts `rating: number | null` rows and SKIPS them when null.

The compiler drives this task: change the type first, then fix every error `npx tsc --noEmit` reports using these exact patterns — plus four logic changes tsc cannot see (listed in Step 3).

- [ ] **Step 1: Change the type**

In `types/database.ts`:

```ts
  rating: number | null;
```

(replacing `rating: number;` in `interface Song`).

- [ ] **Step 2: Fix every tsc error with these patterns**

Run `npx tsc --noEmit` repeatedly and apply, per error kind:

1. **Rendering the number** — `{song.rating}` (or `{s.rating}` etc.) becomes `{displayRating(song.rating)}`, importing `displayRating` from `@/lib/ratingColors` next to the existing `getRatingColor` import. Known spots: `SongBar.tsx` (mobile + desktop blocks), `SongPopupCard.tsx`, `app/musics/[id]/page.tsx` (mobile + desktop rating blocks), `app/albums/[albumName]/page.tsx`, `app/artists/[artistName]/page.tsx`, `app/admin/music/page.tsx` list if present. `getRatingColor(song.rating)` calls need no change (Task 7 widened it).
2. **Arithmetic in sorts** — `b.rating - a.rating` becomes `(b.rating ?? -1) - (a.rating ?? -1)`; `a.rating - b.rating` becomes `(a.rating ?? 101) - (b.rating ?? 101)` (unrated sinks to the bottom in BOTH directions).
3. **String matching in search** — `song.rating.toString() === query` becomes `song.rating != null && song.rating.toString() === query`.
4. **`buildTrackRatingMap`** in `lib/spotify.ts` — parameter type becomes `songs: { id: string; spotify_track_id: string | null; rating: number | null }[]` and the guard becomes `if (song.spotify_track_id && song.rating != null)`, so unrated songs NEVER produce a rated-chip (`TrackRating.rating` stays `number`).

- [ ] **Step 3: Apply the four logic changes tsc cannot catch**

1. **Postgres null ordering** — Postgres puts NULLs FIRST on `order by ... desc`, which would float 757 unrated songs to the top. Every `.order("rating", { ascending: false })` becomes `.order("rating", { ascending: false, nullsFirst: false })`. Known spots: `app/musics/page.tsx`, `app/artists/[artistName]/page.tsx`; grep for others: `grep -rn 'order("rating"' app --include="*.tsx"`.
2. **Artist rankings must exclude unrated** — in `app/artist-rankings/page.tsx`, where songs are grouped into per-artist totals (`totalRating: existing.totalRating + song.rating` around line 133), skip unrated songs entirely: at the top of that aggregation loop add `if (song.rating == null) return;` (or `continue;` matching the loop form) so unrated songs affect neither the average nor the song count.
3. **Admin edit can keep/clear null** — in `app/admin/edit/[id]/page.tsx`: initialize the form with `rating: data.rating?.toString() ?? ""`, save with `rating: formData.rating.trim() === "" ? null : parseInt(formData.rating)`, and remove any `required` attribute from the rating input so an unrated song can be saved unrated. If `app/api/songs/[id]/route.ts` rejects null/absent rating in its PATCH validation, relax it to allow explicit null.
4. **Add-song form stays required** — `app/admin/music/page.tsx` keeps requiring a rating for manual adds (unrated songs enter only via the import). No change unless tsc demands a type fix.

- [ ] **Step 4: Update the spotify lib test**

In `lib/spotify.test.ts`, extend the `buildTrackRatingMap` coverage (add to the existing describe block, matching its style):

```ts
  it("skips songs with null rating so unrated imports never look rated", () => {
    const map = buildTrackRatingMap([
      { id: "s1", spotify_track_id: "t1", rating: 90 },
      { id: "s2", spotify_track_id: "t2", rating: null },
    ]);
    expect(map.get("t1")).toEqual({ id: "s1", rating: 90 });
    expect(map.has("t2")).toBe(false);
  });
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: all pass, zero remaining `rating` type errors.

- [ ] **Step 6: Commit**

```bash
git add types/database.ts lib/spotify.ts lib/spotify.test.ts app
git commit -m "feat: null-safe ratings everywhere — gray blocks, guarded sorts, excluded from rankings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: `/musics` hides unrated songs behind a toggle

**Files:**
- Modify: `app/musics/page.tsx`

**Interfaces:**
- Consumes: null-safe sorts/search from Task 8.
- Produces: `/musics` defaults to rated-only; a "Show unrated" design-system toggle (URL param `unrated=1`) reveals unrated songs; unrated rows show NO rank number and rank numbering counts rated songs only.

- [ ] **Step 1: Add the state + URL sync**

Following the page's existing `sortBy`/`searchQuery` pattern: `const [showUnrated, setShowUnrated] = useState(searchParams.get("unrated") === "1");` — include `unrated` in the URL-building helper (set `unrated=1` when on, delete the param when off) and in the back/forward sync effect.

- [ ] **Step 2: Filter + rank**

In the `filteredSongs` chain, add as the FIRST filter condition:

```tsx
      if (!showUnrated && song.rating == null) return false;
```

Replace the final rank-assigning `.map()` so unrated rows get no rank and rated ranks stay contiguous:

```tsx
    .map((song) => ({ ...song }));

  let ratedRank = 0;
  for (const song of filteredSongs) {
    song.rank = song.rating != null ? ++ratedRank : 0;
  }
```

and where `SongBar` receives its props, pass `showRank={song.rank > 0}` (keep the existing `rank={song.rank}`).

- [ ] **Step 3: The toggle button**

Next to the existing sort control, same design language (mirror the sort trigger's classes on that page):

```tsx
              <button
                onClick={() => handleShowUnratedChange(!showUnrated)}
                aria-pressed={showUnrated}
                className={`px-4 py-4 text-[18px] border-2 border-black hover:border-(--color-brand-red) font-semibold cursor-pointer ${
                  showUnrated ? "bg-neutral-100" : "bg-white"
                }`}
              >
                {showUnrated ? "Hide unrated" : "Show unrated"}
              </button>
```

with `handleShowUnratedChange` updating state + URL and resetting to page 1 (same shape as the existing sort/search handlers).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: all pass. Manual check happens in Task 10 once real unrated songs exist.

- [ ] **Step 5: Commit**

```bash
git add app/musics/page.tsx
git commit -m "feat: /musics unrated toggle — rated-only by default

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Real import + sanity checks + final verification

**Files:**
- Modify: `scripts/import-wrapped.mjs` (only if Joon re-copies a 101-track year)

**Interfaces:**
- Consumes: everything above.
- Produces: real `wrapped_entries` + unrated `songs` rows; verified badges on real song pages.

- [ ] **Step 1: Confirm the two 101-track years with Joon**

2016 (`36jgG3FZUW7yf3gu9g6D3N`) and 2022 (`1MfbMv5q0b0BdpbuK3Lzov`) have 101 tracks. Ask Joon whether each extra track sits at the END (ranks intact — import as-is) or elsewhere (he re-copies; update the id). If Joon is unavailable, import anyway (the script warns) and note the caveat in the summary — a re-copy + rerun later self-heals because import replaces the year.

- [ ] **Step 2: Run the import**

Run: `node --env-file=.env.local scripts/import-wrapped.mjs`
Expected: `✅ year YYYY: imported 100 wrapped entries.` (101 for 2016/2022) for all ten years, then `✅ created ~757 unrated songs ...` (exact count may drift a few from the 2026-07-09 measurement).

- [ ] **Step 3: Sanity-check the data**

```bash
cd "/Users/joonwoopark/Library/Mobile Documents/com~apple~CloudDocs/Coding Projects/joonlovesmusic" && URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) && KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2) && curl -s "$URL/rest/v1/wrapped_entries?select=year,rank,track_name,artist_name&rank=lte.3&order=year.desc,rank.asc" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Expected: each imported year's top 3, e.g. 2023 #1 = "Baby again.." (Fred again.., Skrillex, Four Tet). Confirm the list looks right to Joon.

Then find rated songs that earned badges and open one in the browser:

```bash
curl -s "$URL/rest/v1/wrapped_entries?select=year,rank,track_name&order=rank.asc&limit=10" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Cross-reference a couple against `songs.spotify_track_id`/`isrc` and open those song pages to confirm badges render with real year themes.

Then check the unrated-songs side:

```bash
curl -s "$URL/rest/v1/songs?select=id&rating=is.null" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" -H "Range: 0-0" -D - -o /dev/null | grep -i content-range
```

Expected: ~757 unrated songs; total songs ~1,048. In the dev server: `/musics` still lists 291 songs by default; the "Show unrated" toggle reveals the rest (gray "–" blocks, no rank numbers); an unrated song's page shows cover/title/album/artist, gray score block, and its Wrapped badges; `/artist-rankings` averages are unchanged from before the import.

- [ ] **Step 4: Full verification**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit (if the script changed) + Joon's browser sign-off**

```bash
git add scripts/import-wrapped.mjs
git commit -m "chore: update wrapped playlist ids after order verification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Skip the commit if Step 1 changed nothing.) Joon does the final look-and-feel pass in his browser (podium shimmer speed, per-year palettes — tuned in `lib/wrappedThemes.ts`; unrated-toggle feel). Future years (2026+) = copy the new Wrapped playlist, add its id + theme, rerun the script.
