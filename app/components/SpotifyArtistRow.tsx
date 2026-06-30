import Link from "next/link";
import Image from "next/image";
import type { TopArtistVM } from "@/lib/spotify";

interface SpotifyArtistRowProps extends TopArtistVM {
  priority?: boolean;
}

/**
 * A ranked artist row. Matched artists (present in our `artists` table) link to
 * the internal /artists page; unmatched artists link out to Spotify.
 */
export default function SpotifyArtistRow({
  rank,
  name,
  imageUrl,
  spotifyUrl,
  matched,
  linkName,
  priority = false,
}: SpotifyArtistRowProps) {
  const inner = (
    <div className="flex items-center gap-3 lg:gap-4 p-3 md:p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer">
      <div className="w-8 lg:w-16 text-center text-[24px] lg:text-[48px] font-black shrink-0">
        {rank}
      </div>

      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          width={96}
          height={96}
          className="w-16 h-16 lg:w-24 lg:h-24 object-cover shrink-0"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <div className="w-16 h-16 lg:w-24 lg:h-24 bg-neutral-300 shrink-0 flex items-center justify-center text-[28px] font-black text-neutral-500">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-[22px] lg:text-[32px] font-bold truncate">{name}</h3>
      </div>
    </div>
  );

  if (matched && linkName) {
    return (
      <Link href={`/artists/${encodeURIComponent(linkName)}`} prefetch={false} className="block">
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
