"use client";

import { useState } from "react";
import type { TimeRange, TopArtistVM } from "@/lib/spotify";
import RangeToggle from "./RangeToggle";
import SpotifyArtistRow from "./SpotifyArtistRow";

interface TopArtistsSectionProps {
  /** All three ranges preloaded server-side so the toggle is instant. */
  data: Record<TimeRange, TopArtistVM[]>;
}

export default function TopArtistsSection({ data }: TopArtistsSectionProps) {
  const [range, setRange] = useState<TimeRange>("short_term");
  const rows = data[range];

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <h2 className="text-[32px] lg:text-[40px] font-black leading-none">top artists</h2>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {rows.length === 0 ? (
        <p className="text-[18px] opacity-60 border-2 border-black p-4">
          no data for this range yet
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((artist) => (
            <SpotifyArtistRow key={artist.artistId} {...artist} priority={artist.rank <= 5} />
          ))}
        </div>
      )}
    </section>
  );
}
