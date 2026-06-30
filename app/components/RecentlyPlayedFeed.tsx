import { formatRelativeTime, type RecentlyPlayedVM } from "@/lib/spotify";
import SpotifyTrackRow from "./SpotifyTrackRow";

interface RecentlyPlayedFeedProps {
  items: RecentlyPlayedVM[];
  /** A single "now" captured by the server render so all rows agree. */
  nowMs: number;
}

export default function RecentlyPlayedFeed({ items, nowMs }: RecentlyPlayedFeedProps) {
  return (
    <section className="mb-12">
      <h2 className="text-[32px] lg:text-[40px] font-black leading-none mb-4">recently played</h2>

      {items.length === 0 ? (
        <p className="text-[18px] opacity-60 border-2 border-black p-4">no recent plays yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <SpotifyTrackRow
              // played_at alone isn't unique (same track can repeat); pair with index.
              key={`${item.playedAt}-${index}`}
              title={item.title}
              artist={item.artist}
              coverUrl={item.coverUrl}
              spotifyUrl={item.spotifyUrl}
              rated={item.rated}
              meta={formatRelativeTime(item.playedAt, nowMs)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
