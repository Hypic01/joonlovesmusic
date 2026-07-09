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
