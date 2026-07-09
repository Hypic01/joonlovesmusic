# Spotify Stats Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/spotify-stats` shows top tracks | top artists | recently played as three parallel columns on desktop (≥1200px) and as a pixel tab bar showing one section at a time below that — so no section is ever buried.

**Architecture:** One new client component (`StatsSectionsLayout`) owns a tab state and wraps the three existing section components in a `grid-cols-1 lg:grid-cols-3` grid. Below `lg` the tab state flips `hidden`/`block` on the wrappers; at `lg`+ the `lg:block`/`lg:grid` classes force all three visible, making the tab state irrelevant. Single DOM, no re-mounts, data flow unchanged (page stays a server component passing preloaded view models).

**Tech Stack:** Next.js 16 App Router, Tailwind 4, existing components (`TopTracksSection`, `TopArtistsSection`, `RecentlyPlayedFeed` — all unchanged).

**Spec:** `docs/superpowers/specs/2026-07-09-spotify-stats-layout-design.md`

## Global Constraints

- Design system: `border-2 border-black`, no rounded corners, px text scale, active tab = solid black bg + white text, inactive = white bg + `hover:border-(--color-brand-red)`.
- Site breakpoint `lg` = 1200px (defined in `app/globals.css` `@theme`).
- Tab targets ≥44px tall (`py-3` + `text-[16px]`+). `role="tablist"`/`role="tab"` + `aria-selected`. `cursor-pointer`.
- No nested scroll areas; columns must not horizontally overflow at 1200–1440px (`min-w-0` on grid children so `truncate` keeps working).
- No new dependencies; no data-layer changes; pure-layout change (no unit-test infra for components exists — verification is tsc/lint/suite/build + browser).
- Work on `music-map`; commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `StatsSectionsLayout` + page integration

**Files:**
- Create: `app/components/StatsSectionsLayout.tsx`
- Modify: `app/spotify-stats/page.tsx` (Shell container width; replace the three serial section renders)

**Interfaces:**
- Consumes: `TopTracksSection({ data: Record<TimeRange, TopTrackVM[]> })`, `TopArtistsSection({ data: Record<TimeRange, TopArtistVM[]> })`, `RecentlyPlayedFeed({ items: RecentlyPlayedVM[], nowMs: number })` — all existing, unchanged.
- Produces: default-export client component `StatsSectionsLayout({ topTracks, topArtists, recentlyPlayed, nowMs })` with those exact prop types.

- [ ] **Step 1: Create the component**

Create `app/components/StatsSectionsLayout.tsx`:

```tsx
"use client";

import { useState } from "react";
import type {
  TimeRange,
  TopTrackVM,
  TopArtistVM,
  RecentlyPlayedVM,
} from "@/lib/spotify";
import TopTracksSection from "./TopTracksSection";
import TopArtistsSection from "./TopArtistsSection";
import RecentlyPlayedFeed from "./RecentlyPlayedFeed";

type StatsTab = "tracks" | "artists" | "recent";

const TABS: { value: StatsTab; label: string }[] = [
  { value: "tracks", label: "top tracks" },
  { value: "artists", label: "top artists" },
  { value: "recent", label: "recently played" },
];

interface StatsSectionsLayoutProps {
  topTracks: Record<TimeRange, TopTrackVM[]>;
  topArtists: Record<TimeRange, TopArtistVM[]>;
  recentlyPlayed: RecentlyPlayedVM[];
  nowMs: number;
}

// Responsive hybrid (spec 2026-07-09): at lg+ all three sections render as
// parallel grid columns; below lg a pixel tab bar shows one at a time. One
// DOM — the tab state only flips visibility classes below lg, so switching
// is instant and nothing re-mounts.
export default function StatsSectionsLayout({
  topTracks,
  topArtists,
  recentlyPlayed,
  nowMs,
}: StatsSectionsLayoutProps) {
  const [tab, setTab] = useState<StatsTab>("tracks");

  const sectionClass = (value: StatsTab) =>
    `${tab === value ? "block" : "hidden"} lg:block min-w-0`;

  return (
    <div>
      {/* Tab bar — tablet & phone only; at lg+ all sections are visible */}
      <div
        role="tablist"
        aria-label="stats sections"
        className="lg:hidden flex gap-2 mb-6"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 px-2 py-3 text-[16px] sm:text-[18px] border-2 border-black font-semibold cursor-pointer leading-tight ${
              tab === t.value
                ? "bg-black text-white"
                : "bg-white hover:border-(--color-brand-red)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={sectionClass("tracks")}>
          <TopTracksSection data={topTracks} />
        </div>
        <div className={sectionClass("artists")}>
          <TopArtistsSection data={topArtists} />
        </div>
        <div className={sectionClass("recent")}>
          <RecentlyPlayedFeed items={recentlyPlayed} nowMs={nowMs} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate in the page**

In `app/spotify-stats/page.tsx`:

Replace the three section imports (keep `NowPlayingBanner`):

```tsx
import NowPlayingBanner from "@/app/components/NowPlayingBanner";
import StatsSectionsLayout from "@/app/components/StatsSectionsLayout";
```

(delete the `TopTracksSection`, `TopArtistsSection`, `RecentlyPlayedFeed` import lines).

In `Shell`, widen the container on desktop:

```tsx
        <div className="max-w-[964px] lg:max-w-[1360px] mx-auto">{children}</div>
```

Replace the tail of the page render:

```tsx
      <NowPlayingBanner initial={nowPlaying} />
      <StatsSectionsLayout
        topTracks={topTracks}
        topArtists={topArtists}
        recentlyPlayed={recentlyPlayed}
        nowMs={nowMs}
      />
    </Shell>
```

- [ ] **Step 3: Verify compile, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: tsc clean; lint shows only the pre-existing `app/admin/blog/page.tsx` error + 8 warnings; 68 tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/components/StatsSectionsLayout.tsx app/spotify-stats/page.tsx
git commit -m "feat: responsive spotify-stats — 3 columns on desktop, tabs below lg

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Browser verification + build + push

**Files:** none (verification only; fix-forward if a check fails).

**Interfaces:**
- Consumes: Task 1's page, local dev server, the gstack browse daemon.

- [ ] **Step 1: Start the dev server detached and warm the route**

Run `npm run dev` via run_in_background (iCloud: first compile is slow), wait for "Ready in", then `curl -s -o /dev/null http://localhost:3000/spotify-stats` (may take ~2min on first compile).

- [ ] **Step 2: Desktop pass (1440px)**

With browse: `viewport 1440x900`, goto `http://localhost:3000/spotify-stats`, screenshot. Expected: three columns side by side (tracks/artists/recent), each with heading (+ range toggle on tracks/artists), NO tab bar, no horizontal scroll (`js "document.documentElement.scrollWidth <= document.documentElement.clientWidth"` → true).

- [ ] **Step 3: Tablet pass (1000px)**

`viewport 1000x800`, reload, screenshot. Expected: tab bar visible, only top tracks section shown. Click the "top artists" tab (`js` click on the tab button), screenshot: artists list replaces tracks instantly. Same for "recently played".

- [ ] **Step 4: Phone pass (390px)**

`viewport 390x844`, reload, screenshot. Expected: tab bar fits in one row (labels may wrap to two lines but stay legible), section full-width, no horizontal scroll.

- [ ] **Step 5: Full verification + push**

Run: `npm run build` (stop the dev server first — shared `.next`), expect success. Then `git push origin music-map`. Note: production deploys from `music-map`, so this goes live — flag that to Joon in the summary and open `http://localhost:3000/spotify-stats` (or prod after deploy) for his feel pass.
