import { describe, it, expect } from "vitest";
import {
  buildTrackRatingMap,
  buildArtistLookup,
  toTopTrackVM,
  toTopArtistVM,
  toRecentlyPlayedVM,
  toNowPlayingVM,
  formatRelativeTime,
  type SpotifyTrack,
  type SpotifyArtistFull,
} from "./spotify";

const track = (id: string, name = "Song"): SpotifyTrack => ({
  id,
  name,
  artists: [
    { id: "art1", name: "Artist One" },
    { id: "art2", name: "Artist Two" },
  ],
  album: { name: "Album", images: [{ url: "https://i.scdn.co/image/cover", height: 640, width: 640 }] },
  duration_ms: 200000,
  external_urls: { spotify: `https://open.spotify.com/track/${id}` },
});

const fullArtist = (id: string, name = "Artist One"): SpotifyArtistFull => ({
  id,
  name,
  images: [{ url: "https://i.scdn.co/image/artist", height: 640, width: 640 }],
  genres: ["pop"],
  external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
});

describe("buildTrackRatingMap", () => {
  it("keys ratings by spotify_track_id and skips null ids", () => {
    const map = buildTrackRatingMap([
      { id: "song-a", spotify_track_id: "spotify-1", rating: 88 },
      { id: "song-b", spotify_track_id: null, rating: 50 },
    ]);
    expect(map.get("spotify-1")).toEqual({ id: "song-a", rating: 88 });
    expect(map.has("song-b")).toBe(false);
    expect(map.size).toBe(1);
  });
});

describe("buildArtistLookup", () => {
  it("indexes by spotify_id and lowercased name", () => {
    const lookup = buildArtistLookup([
      { name: "Phoebe Bridgers", spotify_id: "sp-id-1", image_url: "img" },
      { name: "No Spotify Id", spotify_id: null, image_url: null },
    ]);
    expect(lookup.byId.get("sp-id-1")?.name).toBe("Phoebe Bridgers");
    expect(lookup.byName.get("phoebe bridgers")?.spotify_id).toBe("sp-id-1");
    expect(lookup.byName.get("no spotify id")).toBeTruthy();
    expect(lookup.byId.has("")).toBe(false);
  });
});

describe("toTopTrackVM", () => {
  it("joins artist names, picks the first cover, and marks rated tracks", () => {
    const ratingMap = buildTrackRatingMap([
      { id: "song-x", spotify_track_id: "t1", rating: 73 },
    ]);
    const vm = toTopTrackVM(track("t1"), 1, ratingMap);
    expect(vm.rank).toBe(1);
    expect(vm.trackId).toBe("t1");
    expect(vm.artist).toBe("Artist One, Artist Two");
    expect(vm.coverUrl).toBe("https://i.scdn.co/image/cover");
    expect(vm.spotifyUrl).toBe("https://open.spotify.com/track/t1");
    expect(vm.rated).toEqual({ id: "song-x", rating: 73 });
  });

  it("leaves rated null and coverUrl null when unmatched / no images", () => {
    const bare: SpotifyTrack = { ...track("t2"), album: { name: "Album", images: [] } };
    const vm = toTopTrackVM(bare, 5, new Map());
    expect(vm.rated).toBeNull();
    expect(vm.coverUrl).toBeNull();
  });
});

describe("toTopArtistVM", () => {
  it("matches by spotify_id first and links by the stored DB name", () => {
    const lookup = buildArtistLookup([
      { name: "Phoebe Bridgers", spotify_id: "art1", image_url: "stored" },
    ]);
    const vm = toTopArtistVM(fullArtist("art1", "Phoebe Bridgers"), 2, lookup);
    expect(vm.matched).toBe(true);
    expect(vm.linkName).toBe("Phoebe Bridgers");
    expect(vm.imageUrl).toBe("https://i.scdn.co/image/artist");
  });

  it("falls back to a case-insensitive name match but links the stored casing", () => {
    const lookup = buildArtistLookup([
      { name: "Artist One", spotify_id: "other-id", image_url: "stored" },
    ]);
    const vm = toTopArtistVM(fullArtist("art1", "artist one"), 3, lookup);
    expect(vm.matched).toBe(true);
    expect(vm.linkName).toBe("Artist One");
  });

  it("marks matched=false, linkName=null, and keeps the Spotify image when no match", () => {
    const vm = toTopArtistVM(fullArtist("art1"), 4, buildArtistLookup([]));
    expect(vm.matched).toBe(false);
    expect(vm.linkName).toBeNull();
    expect(vm.imageUrl).toBe("https://i.scdn.co/image/artist");
  });
});

describe("toRecentlyPlayedVM", () => {
  it("carries played_at and cross-links ratings", () => {
    const ratingMap = buildTrackRatingMap([
      { id: "song-r", spotify_track_id: "t3", rating: 41 },
    ]);
    const vm = toRecentlyPlayedVM(
      { track: track("t3"), played_at: "2026-06-30T10:00:00Z" },
      ratingMap
    );
    expect(vm.playedAt).toBe("2026-06-30T10:00:00Z");
    expect(vm.rated).toEqual({ id: "song-r", rating: 41 });
  });
});

describe("toNowPlayingVM", () => {
  it("returns an idle VM for null or itemless responses", () => {
    expect(toNowPlayingVM(null, new Map())).toEqual({ isPlaying: false, track: null });
    expect(toNowPlayingVM({ is_playing: false, item: null }, new Map())).toEqual({
      isPlaying: false,
      track: null,
    });
  });

  it("maps an active track with rating cross-link", () => {
    const ratingMap = buildTrackRatingMap([
      { id: "song-n", spotify_track_id: "t4", rating: 90 },
    ]);
    const vm = toNowPlayingVM({ is_playing: true, item: track("t4", "Now") }, ratingMap);
    expect(vm.isPlaying).toBe(true);
    expect(vm.track?.title).toBe("Now");
    expect(vm.track?.rated).toEqual({ id: "song-n", rating: 90 });
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-06-30T12:00:00Z");
  it("buckets recent durations", () => {
    expect(formatRelativeTime("2026-06-30T11:59:30Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-06-30T11:30:00Z", now)).toBe("30m ago");
    expect(formatRelativeTime("2026-06-30T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-06-28T12:00:00Z", now)).toBe("2d ago");
  });
  it("clamps future timestamps to 'just now' and ignores bad input", () => {
    expect(formatRelativeTime("2026-07-01T12:00:00Z", now)).toBe("just now");
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});
