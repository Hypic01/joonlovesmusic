import Navbar from "@/app/components/Navbar";
import NowPlayingBanner from "@/app/components/NowPlayingBanner";
import StatsSectionsLayout from "@/app/components/StatsSectionsLayout";
import { supabase } from "@/lib/supabase";
import {
  getTopTracks,
  getTopArtists,
  getRecentlyPlayed,
  getNowPlaying,
  buildTrackRatingMap,
  buildArtistLookup,
  toTopTrackVM,
  toTopArtistVM,
  toRecentlyPlayedVM,
  toNowPlayingVM,
  type TimeRange,
  type TopTrackVM,
  type TopArtistVM,
  type RecentlyPlayedVM,
} from "@/lib/spotify";

// First server-fetching page in the app: SPOTIFY_REFRESH_TOKEN must stay
// server-side, and we render live (Date.now() per request).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function settledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />
        <div className="max-w-[964px] lg:max-w-[1360px] mx-auto">{children}</div>
      </div>
    </main>
  );
}

export default async function SpotifyStatsPage() {
  // This async Server Component renders once per request, so a single timestamp
  // here is stable for the render and shared by all "x ago" labels below.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  const configured = Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );

  if (!configured) {
    return (
      <Shell>
        <div className="border-2 border-black p-6 lg:p-8">
          <h1 className="text-[32px] lg:text-[40px] font-black leading-none mb-3">
            spotify stats are warming up
          </h1>
          <p className="text-[18px] opacity-70">
            this page needs a spotify connection that isn&apos;t set up yet. check back soon.
          </p>
        </div>
      </Shell>
    );
  }

  // Cross-link data (rated songs + known artists) for matching Spotify items.
  const [songsRes, artistsRes] = await Promise.all([
    supabase
      .from("songs")
      .select("id, spotify_track_id, rating")
      .not("spotify_track_id", "is", null),
    supabase.from("artists").select("name, spotify_id, image_url"),
  ]);
  const ratingMap = buildTrackRatingMap(songsRes.data ?? []);
  const artistLookup = buildArtistLookup(artistsRes.data ?? []);

  // All Spotify reads in parallel; one failed range degrades on its own.
  const [stShort, stMed, stLong, saShort, saMed, saLong, recentRes, nowRes] =
    await Promise.allSettled([
      getTopTracks("short_term"),
      getTopTracks("medium_term"),
      getTopTracks("long_term"),
      getTopArtists("short_term"),
      getTopArtists("medium_term"),
      getTopArtists("long_term"),
      getRecentlyPlayed(),
      getNowPlaying(),
    ]);

  const topTracks: Record<TimeRange, TopTrackVM[]> = {
    short_term: settledOr(stShort, []).map((t, i) => toTopTrackVM(t, i + 1, ratingMap)),
    medium_term: settledOr(stMed, []).map((t, i) => toTopTrackVM(t, i + 1, ratingMap)),
    long_term: settledOr(stLong, []).map((t, i) => toTopTrackVM(t, i + 1, ratingMap)),
  };

  const topArtists: Record<TimeRange, TopArtistVM[]> = {
    short_term: settledOr(saShort, []).map((a, i) => toTopArtistVM(a, i + 1, artistLookup)),
    medium_term: settledOr(saMed, []).map((a, i) => toTopArtistVM(a, i + 1, artistLookup)),
    long_term: settledOr(saLong, []).map((a, i) => toTopArtistVM(a, i + 1, artistLookup)),
  };

  const recentlyPlayed: RecentlyPlayedVM[] = settledOr(recentRes, []).map((item) =>
    toRecentlyPlayedVM(item, ratingMap)
  );

  const nowPlaying = toNowPlayingVM(settledOr(nowRes, null), ratingMap);

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-[40px] lg:text-[56px] font-black leading-none">
          joon&apos;s spotify stats
        </h1>
        <p className="text-[15px] lg:text-[18px] opacity-60 mt-2">
          what i actually listen to, pulled live from spotify — ranked top 50, not exact play counts.
        </p>
      </header>

      <NowPlayingBanner initial={nowPlaying} />
      <StatsSectionsLayout
        topTracks={topTracks}
        topArtists={topArtists}
        recentlyPlayed={recentlyPlayed}
        nowMs={nowMs}
      />
    </Shell>
  );
}
