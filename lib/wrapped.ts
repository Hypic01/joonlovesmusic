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
