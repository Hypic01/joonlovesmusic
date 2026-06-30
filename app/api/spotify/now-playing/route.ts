import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getNowPlaying, toNowPlayingVM, buildTrackRatingMap } from "@/lib/spotify";

// Polled by NowPlayingBanner every ~25s. Always 200 (idle VM on error) so the
// client poller stays alive.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [np, songsRes] = await Promise.all([
      getNowPlaying(),
      supabase
        .from("songs")
        .select("id, spotify_track_id, rating")
        .not("spotify_track_id", "is", null),
    ]);
    const ratingMap = buildTrackRatingMap(songsRes.data ?? []);
    return NextResponse.json(toNowPlayingVM(np, ratingMap));
  } catch {
    return NextResponse.json({ isPlaying: false, track: null });
  }
}
