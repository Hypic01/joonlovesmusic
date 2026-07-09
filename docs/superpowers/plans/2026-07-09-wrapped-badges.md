# Spotify Wrapped Honor Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Song detail pages show per-year "Joon's Top Songs YYYY — #rank" badges for every year the song appeared in Joon's Spotify Wrapped, with metallic podium treatment for ranks 1–3.

**Architecture:** A one-time terminal script reads Joon's *own copies* of the "Your Top Songs YYYY" playlists (Spotify's API blocks the Spotify-owned originals — verified 2026-07-09) and writes ~100 rows per year into a new `wrapped_entries` Supabase table. The song page (`app/musics/[id]/page.tsx`) matches at read time by `spotify_track_id` OR `isrc` and renders `WrappedBadge` cards inside the existing Awards section. Spotify is never called during page loads.

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

## Prerequisite — Joon's manual step (not a coding task)

The API cannot read Spotify-owned Wrapped playlists, but it CAN read Joon's own copies. Joon already has two copies:

| year | playlist name | playlist id | tracks |
|------|---------------|-------------|--------|
| 2022 | Hypic's Top Song 2022 | `1MfbMv5q0b0BdpbuK3Lzov` | 101 ⚠️ verify order |
| 2023 | 2023년 나의 최애곡 (2) | `1z11gypRZWW5xZ9mCbHzWN` | 100 ✓ (pos 1 = "Baby again..") |

Joon copies the remaining years (2016, 2017, 2018, 2019, 2020, 2021, 2024, 2025): in the Spotify app, open "Your Top Songs YYYY" → ⋯ menu → **Add to other playlist** → **New playlist** (any name containing the year works, e.g. "Wrapped 2016"). Order is preserved. The import script has a `--list` mode (Task 5) that prints candidate playlists so the ids can be pasted into its config. Import runs per-year and is rerunnable, so missing years can be added later without blocking any coding task.

⚠️ The 2022 copy has 101 tracks. Before trusting it, confirm with Joon that the extra track is appended at the END (ranks unshifted). If it was prepended or inserted, Joon re-copies 2022 fresh.

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
- Consumes: `wrapped_entries` table (Task 1). Env vars from Global Constraints.
- Produces:
  - `buildRows(year, items)` in helpers → `{ rows: Array<{year, rank, spotify_track_id, isrc, track_name, artist_name}>, warnings: string[] }`. `items` = raw Spotify playlist-track items. Rank = playlist position (index + 1); null/local tracks are skipped with a warning but do NOT shift later ranks.
  - CLI: `node --env-file=.env.local scripts/import-wrapped.mjs --list` prints user-owned playlists (name, id, track count) to find Wrapped copies. Without `--list`, imports every year that has an id in `WRAPPED_PLAYLIST_IDS`, deleting that year's rows first (idempotent), and prints a per-year summary.

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/wrapped-helpers.test.mjs`
Expected: FAIL — cannot resolve `./wrapped-helpers.mjs`.

- [ ] **Step 3: Write the helpers**

Create `scripts/wrapped-helpers.mjs`:

```js
// Pure logic for the Wrapped import script — kept I/O-free so vitest can
// cover the rank-alignment rules.

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
//     Imports every year with an id in WRAPPED_PLAYLIST_IDS. Rerunnable:
//     each year's rows are deleted and rewritten.
//
// Needs playlist-read-private scope on SPOTIFY_REFRESH_TOKEN (minted 2026-07-09).

import { buildRows } from "./wrapped-helpers.mjs";

// year -> playlist id of Joon's own copy (null = not copied yet, skipped).
const WRAPPED_PLAYLIST_IDS = {
  2016: null,
  2017: null,
  2018: null,
  2019: null,
  2020: null,
  2021: null,
  2022: "1MfbMv5q0b0BdpbuK3Lzov", // "Hypic's Top Song 2022" — ⚠️ 101 tracks; confirm order with Joon before trusting (Task 7 Step 1)
  2023: "1z11gypRZWW5xZ9mCbHzWN", // "2023년 나의 최애곡 (2)"
  2024: null,
  2025: null,
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
  const fields = "next,items(track(id,name,artists(name),external_ids))";
  let url = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100&fields=${encodeURIComponent(fields)}`;
  while (url) {
    const page = await spotifyGet(token, url);
    items.push(...(page.items ?? []));
    url = page.next;
  }
  return items;
}

async function replaceYear(year, rows) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const del = await fetch(`${supabaseUrl}/rest/v1/wrapped_entries?year=eq.${year}`, {
    method: "DELETE",
    headers,
  });
  if (!del.ok) throw new Error(`Delete year ${year} failed (${del.status}): ${await del.text()}`);
  const ins = await fetch(`${supabaseUrl}/rest/v1/wrapped_entries`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) throw new Error(`Insert year ${year} failed (${ins.status}): ${await ins.text()}`);
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
const missing = [];
for (const [yearStr, playlistId] of Object.entries(WRAPPED_PLAYLIST_IDS)) {
  const year = Number(yearStr);
  if (!playlistId) {
    missing.push(year);
    continue;
  }
  const items = await fetchPlaylistItems(token, playlistId);
  if (items.length !== 100) {
    console.warn(`⚠️  year ${year}: playlist has ${items.length} tracks (expected 100) — importing anyway, ranks = playlist positions.`);
  }
  const { rows, warnings } = buildRows(year, items);
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  await replaceYear(year, rows);
  console.log(`✅ year ${year}: imported ${rows.length} entries.`);
  imported += 1;
}

if (missing.length > 0) {
  console.log(`\nSkipped (no playlist id yet): ${missing.join(", ")}`);
  console.log("Copy each Wrapped playlist in Spotify, run with --list to find its id, add it above, rerun.");
}
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

### Task 7: Real import + sanity checks + final verification

**Files:**
- Modify: `scripts/import-wrapped.mjs` (fill `WRAPPED_PLAYLIST_IDS` for whatever years Joon has copied by now)

**Interfaces:**
- Consumes: everything above.
- Produces: real `wrapped_entries` rows; verified badges on real song pages.

- [ ] **Step 1: Confirm 2022 copy order with Joon**

Ask Joon whether the 101st track in "Hypic's Top Song 2022" was added at the end (ranks intact) or the playlist should be re-copied. Update the id in `WRAPPED_PLAYLIST_IDS` if he re-copies.

- [ ] **Step 2: Fill in newly copied years**

Run `node --env-file=.env.local scripts/import-wrapped.mjs --list`, identify Joon's new copies (100-track playlists named per year), and set their ids in `WRAPPED_PLAYLIST_IDS`.

- [ ] **Step 3: Run the import**

Run: `node --env-file=.env.local scripts/import-wrapped.mjs`
Expected: `✅ year YYYY: imported 100 entries.` per configured year; skipped years listed.

- [ ] **Step 4: Sanity-check the data**

```bash
cd "/Users/joonwoopark/Library/Mobile Documents/com~apple~CloudDocs/Coding Projects/joonlovesmusic" && URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) && KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2) && curl -s "$URL/rest/v1/wrapped_entries?select=year,rank,track_name,artist_name&rank=lte.3&order=year.desc,rank.asc" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Expected: each imported year's top 3, e.g. 2023 #1 = "Baby again.." (Fred again.., Skrillex, Four Tet). Confirm the list looks right to Joon.

Then find rated songs that earned badges and open one in the browser:

```bash
curl -s "$URL/rest/v1/wrapped_entries?select=year,rank,track_name&order=rank.asc&limit=10" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Cross-reference a couple against `songs.spotify_track_id`/`isrc` and open those song pages to confirm badges render with real year themes.

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit + Joon's browser sign-off**

```bash
git add scripts/import-wrapped.mjs
git commit -m "chore: fill wrapped playlist ids and run import

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Joon does the final look-and-feel pass in his browser (podium shimmer speed, per-year palettes — tuned in `lib/wrappedThemes.ts` if needed). Remaining years import later by rerunning Task 7 steps 2–4 as he copies more playlists.
