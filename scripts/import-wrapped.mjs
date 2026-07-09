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
