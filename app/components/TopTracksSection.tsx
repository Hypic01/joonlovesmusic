"use client";

import { useState } from "react";
import type { TimeRange, TopTrackVM } from "@/lib/spotify";
import RangeToggle from "./RangeToggle";
import SpotifyTrackRow from "./SpotifyTrackRow";

interface TopTracksSectionProps {
  /** All three ranges preloaded server-side so the toggle is instant. */
  data: Record<TimeRange, TopTrackVM[]>;
}

export default function TopTracksSection({ data }: TopTracksSectionProps) {
  const [range, setRange] = useState<TimeRange>("short_term");
  const rows = data[range];

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <h2 className="text-[32px] lg:text-[40px] font-black leading-none">top tracks</h2>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {rows.length === 0 ? (
        <p className="text-[18px] opacity-60 border-2 border-black p-4">
          no data for this range yet
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((track) => (
            <SpotifyTrackRow
              key={track.trackId}
              rank={track.rank}
              title={track.title}
              artist={track.artist}
              coverUrl={track.coverUrl}
              spotifyUrl={track.spotifyUrl}
              rated={track.rated}
              priority={track.rank <= 5}
            />
          ))}
        </div>
      )}
    </section>
  );
}
