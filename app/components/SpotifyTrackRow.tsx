import Link from "next/link";
import Image from "next/image";
import { getRatingColor } from "@/lib/ratingColors";
import type { TrackRating } from "@/lib/spotify";

interface SpotifyTrackRowProps {
  title: string;
  artist: string;
  coverUrl: string | null;
  spotifyUrl: string;
  rated: TrackRating | null;
  rank?: number;
  /** Secondary line, e.g. "3h ago" for recently played. */
  meta?: string;
  priority?: boolean;
}

/**
 * A ranked track row mirroring SongBar's brutalist layout, but driven by
 * Spotify view-model data rather than a full Song. Rated tracks link to the
 * internal /musics page and show the colored rating chip; unrated tracks link
 * out to Spotify and show a muted placeholder chip.
 */
export default function SpotifyTrackRow({
  title,
  artist,
  coverUrl,
  spotifyUrl,
  rated,
  rank,
  meta,
  priority = false,
}: SpotifyTrackRowProps) {
  const inner = (
    <div className="flex items-center gap-3 lg:gap-4 p-3 md:p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer">
      {rank !== undefined && (
        <div className="w-8 lg:w-16 text-center text-[24px] lg:text-[48px] font-black shrink-0">
          {rank}
        </div>
      )}

      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={`${title} cover`}
          width={96}
          height={96}
          className="w-16 h-16 lg:w-24 lg:h-24 object-cover shrink-0"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <div className="w-16 h-16 lg:w-24 lg:h-24 bg-neutral-300 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-[18px] lg:text-[28px] font-bold leading-tight truncate">{title}</h3>
        <div className="text-[14px] lg:text-[18px] opacity-80 truncate">{artist}</div>
        {meta && <div className="text-[14px] opacity-60 truncate">{meta}</div>}
      </div>

      {rated ? (
        <div
          className="w-14 h-14 lg:w-20 lg:h-20 flex items-center justify-center shrink-0"
          style={{ backgroundColor: getRatingColor(rated.rating) }}
        >
          <span className="text-[22px] lg:text-[36px] font-black">{rated.rating}</span>
        </div>
      ) : (
        <div className="w-14 h-14 lg:w-20 lg:h-20 flex items-center justify-center shrink-0 bg-neutral-200 text-neutral-400">
          <span className="text-[22px] lg:text-[36px] font-black">—</span>
        </div>
      )}
    </div>
  );

  if (rated) {
    return (
      <Link href={`/musics/${rated.id}`} prefetch={false} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  );
}
