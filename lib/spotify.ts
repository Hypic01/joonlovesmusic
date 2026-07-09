// Server-only helpers for reading the owner's *personal* Spotify data.
//
// Unlike app/api/spotify/route.ts (Client Credentials flow → public catalog),
// these endpoints require user-authorized OAuth. We store a long-lived
// SPOTIFY_REFRESH_TOKEN and exchange it for short-lived access tokens here.
// Nothing in this module is safe to import from a Client Component.

const SPOTIFY_API = "https://api.spotify.com/v1";

export type TimeRange = "short_term" | "medium_term" | "long_term";

// ---------------------------------------------------------------------------
// Raw Spotify response shapes (only the fields we read)
// ---------------------------------------------------------------------------

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtistRef {
  id: string;
  name: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  album: { name: string; images: SpotifyImage[] };
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface SpotifyArtistFull {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  external_urls: { spotify: string };
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export interface NowPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrack | null;
}

// ---------------------------------------------------------------------------
// Plain-JSON view models (serializable across the RSC → Client boundary)
// ---------------------------------------------------------------------------

export interface TrackRating {
  id: string;
  rating: number;
}

export interface TopTrackVM {
  rank: number;
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  spotifyUrl: string;
  rated: TrackRating | null;
}

export interface TopArtistVM {
  rank: number;
  artistId: string;
  name: string;
  imageUrl: string | null;
  spotifyUrl: string;
  /** True when the artist exists in our `artists` table → link to /artists/[linkName]. */
  matched: boolean;
  /**
   * The artist's stored DB name, used for the /artists/[name] link. The artist
   * page matches songs by exact name string, so we must link the canonical
   * stored name rather than Spotify's display string. Null when unmatched.
   */
  linkName: string | null;
}

export interface RecentlyPlayedVM {
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  spotifyUrl: string;
  playedAt: string;
  rated: TrackRating | null;
}

export interface NowPlayingVM {
  isPlaying: boolean;
  track:
    | {
        trackId: string;
        title: string;
        artist: string;
        coverUrl: string | null;
        spotifyUrl: string;
        rated: TrackRating | null;
      }
    | null;
}

// ---------------------------------------------------------------------------
// Cross-link lookups (built from Supabase rows, then used by the mappers)
// ---------------------------------------------------------------------------

export interface ArtistLookupRow {
  name: string;
  spotify_id: string | null;
  image_url: string | null;
}

export interface ArtistLookup {
  byId: Map<string, ArtistLookupRow>;
  byName: Map<string, ArtistLookupRow>;
}

export function buildTrackRatingMap(
  songs: { id: string; spotify_track_id: string | null; rating: number | null }[]
): Map<string, TrackRating> {
  const map = new Map<string, TrackRating>();
  for (const song of songs) {
    // Unrated (Wrapped-imported) songs are skipped so a "rated" chip always
    // means Joon actually scored the track.
    if (song.spotify_track_id && song.rating != null) {
      map.set(song.spotify_track_id, { id: song.id, rating: song.rating });
    }
  }
  return map;
}

export function buildArtistLookup(artists: ArtistLookupRow[]): ArtistLookup {
  const byId = new Map<string, ArtistLookupRow>();
  const byName = new Map<string, ArtistLookupRow>();
  for (const artist of artists) {
    if (artist.spotify_id) byId.set(artist.spotify_id, artist);
    byName.set(artist.name.toLowerCase(), artist);
  }
  return { byId, byName };
}

// ---------------------------------------------------------------------------
// Pure mappers (raw Spotify + lookups → view models)
// ---------------------------------------------------------------------------

function joinArtists(artists: SpotifyArtistRef[]): string {
  return artists.map((a) => a.name).join(", ");
}

function firstImage(images: SpotifyImage[] | undefined): string | null {
  return images?.[0]?.url ?? null;
}

export function toTopTrackVM(
  track: SpotifyTrack,
  rank: number,
  ratingMap: Map<string, TrackRating>
): TopTrackVM {
  return {
    rank,
    trackId: track.id,
    title: track.name,
    artist: joinArtists(track.artists),
    coverUrl: firstImage(track.album?.images),
    spotifyUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
    rated: ratingMap.get(track.id) ?? null,
  };
}

export function toTopArtistVM(
  artist: SpotifyArtistFull,
  rank: number,
  lookup: ArtistLookup
): TopArtistVM {
  const matched =
    lookup.byId.get(artist.id) ?? lookup.byName.get(artist.name.toLowerCase()) ?? null;
  return {
    rank,
    artistId: artist.id,
    name: artist.name,
    imageUrl: firstImage(artist.images) ?? matched?.image_url ?? null,
    spotifyUrl: artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${artist.id}`,
    matched: Boolean(matched),
    linkName: matched?.name ?? null,
  };
}

export function toRecentlyPlayedVM(
  item: RecentlyPlayedItem,
  ratingMap: Map<string, TrackRating>
): RecentlyPlayedVM {
  const track = item.track;
  return {
    trackId: track.id,
    title: track.name,
    artist: joinArtists(track.artists),
    coverUrl: firstImage(track.album?.images),
    spotifyUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
    playedAt: item.played_at,
    rated: ratingMap.get(track.id) ?? null,
  };
}

export function toNowPlayingVM(
  np: NowPlayingResponse | null,
  ratingMap: Map<string, TrackRating>
): NowPlayingVM {
  if (!np || !np.item) return { isPlaying: false, track: null };
  const track = np.item;
  return {
    isPlaying: np.is_playing,
    track: {
      trackId: track.id,
      title: track.name,
      artist: joinArtists(track.artists),
      coverUrl: firstImage(track.album?.images),
      spotifyUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
      rated: ratingMap.get(track.id) ?? null,
    },
  };
}

/** Compact "5m ago" / "3h ago" / "2d ago" relative timestamp. `nowMs` injected for testability. */
export function formatRelativeTime(playedAtISO: string, nowMs: number): string {
  const then = new Date(playedAtISO).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor(Math.max(0, nowMs - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ---------------------------------------------------------------------------
// Network I/O — refresh-token auth + the /me/* reads.
// Mirrors the fetch/error style of app/api/spotify/route.ts.
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getUserAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Spotify user credentials missing (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN)"
    );
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Spotify access token");
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export async function getTopTracks(range: TimeRange): Promise<SpotifyTrack[]> {
  const token = await getUserAccessToken();
  const response = await fetch(`${SPOTIFY_API}/me/top/tracks?time_range=${range}&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch top tracks (${response.status})`);
  }
  const data = await response.json();
  return (data.items ?? []) as SpotifyTrack[];
}

export async function getTopArtists(range: TimeRange): Promise<SpotifyArtistFull[]> {
  const token = await getUserAccessToken();
  const response = await fetch(`${SPOTIFY_API}/me/top/artists?time_range=${range}&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch top artists (${response.status})`);
  }
  const data = await response.json();
  return (data.items ?? []) as SpotifyArtistFull[];
}

export async function getRecentlyPlayed(): Promise<RecentlyPlayedItem[]> {
  const token = await getUserAccessToken();
  const response = await fetch(`${SPOTIFY_API}/me/player/recently-played?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch recently played (${response.status})`);
  }
  const data = await response.json();
  return (data.items ?? []) as RecentlyPlayedItem[];
}

export async function getNowPlaying(): Promise<NowPlayingResponse | null> {
  const token = await getUserAccessToken();
  const response = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // 204 = nothing playing / no active device — a normal idle state, not an error.
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch now playing (${response.status})`);
  }
  const data = await response.json();
  return data as NowPlayingResponse;
}
