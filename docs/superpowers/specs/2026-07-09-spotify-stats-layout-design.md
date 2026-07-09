# Spotify Stats Responsive Layout — Design Spec

**Date:** 2026-07-09
**Status:** Approved by Joon (wireframe mockups reviewed in visual companion; "Build it now")
**Branch:** music-map

## Problem

`/spotify-stats` stacks Now Playing → 50 top tracks → 50 top artists → 50
recently played in one 964px column (~150 rows). Top artists and recently
played sit ~3 screens down; visitors never discover them.

## Approved design (responsive hybrid)

- **Desktop (≥ `lg`, the site's 1200px breakpoint):** the three sections render
  as three parallel columns — top tracks | top artists | recently played —
  each with its own heading and range toggle, scrolling together with the
  page. The page container widens to `max-w-[1360px]` on `lg`+ (this page
  only) so each column gets ~430px ≈ phone width, which every row component
  already renders well at. No nested scroll areas.
- **Tablet & phone (< 1200px):** a pixel tab bar sits directly under Now
  Playing — `top tracks · top artists · recently played` — showing one
  full-width section at a time. Default tab: top tracks. Active tab = solid
  black background, white text; inactive = white with 2px black border
  (matches the approved wireframe and the site's button language).
- **Single DOM:** all three sections stay mounted; the tab state only toggles
  visibility classes below `lg` (`hidden` vs `block`), and `lg:` classes force
  all three visible as grid columns regardless of tab state. No duplicated
  rendering, no layout jank, tab switching is instant (data is already
  preloaded server-side for all ranges).
- Now Playing banner and the page header stay full-width above the
  columns/tabs. Tab state is client-side only (no URL param — YAGNI).

## Components

- **New:** `app/components/StatsSectionsLayout.tsx` (client) — owns the tab
  state, renders the tab bar (`lg:hidden`) and the `grid grid-cols-1
  lg:grid-cols-3 gap-6` wrapper. Receives `{ topTracks, topArtists,
  recentlyPlayed, nowMs }` (all already-serializable view models) and renders
  the three existing section components unchanged inside visibility wrappers.
- **Changed:** `app/spotify-stats/page.tsx` — Shell's inner container becomes
  `max-w-[964px] lg:max-w-[1360px]`; the three serial section renders are
  replaced by one `<StatsSectionsLayout …>`.
- **Unchanged:** `TopTracksSection`, `TopArtistsSection`, `RecentlyPlayedFeed`,
  `NowPlayingBanner`, `RangeToggle`, all data fetching.

## Accessibility & UX rules applied

- Tab bar uses `role="tablist"` / `role="tab"` + `aria-selected`; tabs are
  44px+ tall (`py-3` at `text-[18px]`), `cursor-pointer`.
- Visibility switching uses classes only (no re-mount → images don't reload,
  scroll position of the page is preserved).
- Headings inside columns keep the existing type scale; columns must not
  horizontal-scroll at 1200–1440px.

## Verification

- tsc, lint (pre-existing admin/blog error excepted), full vitest suite,
  `npm run build`.
- Browser pass at 1440px (three columns), 1000px (tabs, tablet), 390px
  (tabs, phone): all three sections reachable, tab switching instant, no
  horizontal scroll. Joon does the final feel pass.

## Out of scope

- URL-synced tab state, sticky tab bar, list-length changes, section reorder,
  any data-layer changes.
