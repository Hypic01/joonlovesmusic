import Link from "next/link";
import Image from "next/image";
import type { Song } from "@/types/database";
import { getRatingColor, displayRating } from "@/lib/ratingColors";

interface SongPopupCardProps {
  song: Song;
}

// Compact card for the map InfoWindow. Forces the site font (Google's InfoWindow
// otherwise renders in Roboto) and keeps the title + artist clearly readable.
const SITE_FONT =
  "var(--font-jersey-10), var(--font-noto-sans-kr), var(--font-noto-sans-jp), ui-sans-serif, system-ui, sans-serif";

export default function SongPopupCard({ song }: SongPopupCardProps) {
  return (
    <Link
      href={`/musics/${song.id}`}
      prefetch={true}
      className="flex items-center gap-4 border-2 border-black bg-white p-3 hover:border-(--color-brand-red) w-full"
      style={{ fontFamily: SITE_FONT }}
    >
      {/* Album Cover — square, same size as the score block */}
      {song.cover_url ? (
        <Image
          src={song.cover_url}
          alt={`${song.title} cover`}
          width={96}
          height={96}
          className="w-24 h-24 object-cover shrink-0"
        />
      ) : (
        <div className="w-24 h-24 bg-neutral-300 shrink-0" />
      )}

      {/* Title / album / artist — flexible middle that fills the gap */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[32px] font-bold leading-tight truncate">
          {song.title}
        </h3>
        {song.album_name && (
          <p className="text-[18px] opacity-70 truncate">{song.album_name}</p>
        )}
        <p className="text-[20px] truncate">{song.artist}</p>
      </div>

      {/* Score block — square, same size as the cover */}
      <div
        className="w-24 h-24 flex items-center justify-center shrink-0"
        style={{ backgroundColor: getRatingColor(song.rating) }}
      >
        <span className="text-[40px] font-black">{displayRating(song.rating)}</span>
      </div>
    </Link>
  );
}
