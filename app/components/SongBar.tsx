"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Song } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

interface SongBarProps {
  song: Song;
  rank?: number;
  showRank?: boolean;
  showArrow?: boolean;
  priority?: boolean;
}

export default function SongBar({
  song,
  rank,
  showRank = false,
  showArrow = false,
  priority = false,
}: SongBarProps) {
  const router = useRouter();

  return (
    <Link
      href={`/musics/${song.id}`}
      prefetch={true}
      className="block p-3 md:p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
    >
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Top Row: Rank + Album Cover + Rating */}
        <div className="flex items-center gap-3 mb-2">
          {showRank && rank !== undefined && (
            <div className="text-[32px] font-black w-10 text-center">{rank}</div>
          )}
          {song.cover_url ? (
            <Image
              src={song.cover_url}
              alt={`${song.title} cover`}
              width={80}
              height={80}
              className="w-20 h-20 object-cover"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-20 h-20 bg-neutral-300" />
          )}
          <div className="flex-1" />
          <div
            className="w-16 h-16 flex items-center justify-center shrink-0"
            style={{ backgroundColor: getRatingColor(song.rating) }}
          >
            <span className="text-[32px] font-black">{song.rating}</span>
          </div>
        </div>

        {/* Bottom Row: Song Info */}
        <div className={showRank ? "pl-12" : ""}>
          <h3 className="text-[22px] font-bold leading-tight truncate">
            {song.title}
          </h3>
          {song.album_name && (
            <p className="text-[14px] font-normal opacity-70 truncate">
              {song.album_name}
            </p>
          )}
          <div className="text-[14px] truncate">{song.artist}</div>
        </div>
      </div>

      {/* Tablet/Desktop Layout - Single Row */}
      <div className="hidden sm:flex items-center gap-3 lg:gap-4">
        {/* Rank */}
        {showRank && rank !== undefined && (
          <div className="w-12 lg:w-16 text-center text-[36px] lg:text-[48px] font-black">
            {rank}
          </div>
        )}

        {/* Album Cover */}
        {song.cover_url ? (
          <Image
            src={song.cover_url}
            alt={`${song.title} cover`}
            width={96}
            height={96}
            className="w-20 h-20 lg:w-24 lg:h-24 object-cover shrink-0"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-neutral-300 shrink-0" />
        )}

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[24px] lg:text-[32px] font-bold leading-none truncate">
            {song.title}
          </h3>
          {song.album_name && (
            <span
              className="block max-w-fit text-[14px] lg:text-[18px] font-normal opacity-70 hover:underline cursor-pointer truncate"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (song.album_name) {
                  router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                }
              }}
            >
              {song.album_name}
            </span>
          )}
          <div className="text-[16px] lg:text-[20px] truncate">
            {song.artist.split(",").map((artist, index, array) => (
              <span key={index}>
                <span
                  className="hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/artists/${encodeURIComponent(artist.trim())}`);
                  }}
                >
                  {artist.trim()}
                </span>
                {index < array.length - 1 && <span>, </span>}
              </span>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div
          className="w-16 h-16 lg:w-24 lg:h-24 flex items-center justify-center shrink-0"
          style={{ backgroundColor: getRatingColor(song.rating) }}
        >
          <span className="text-[32px] lg:text-[40px] font-black">{song.rating}</span>
        </div>

        {/* Arrow - hidden on tablet, visible on desktop */}
        {showArrow && (
          <button className="hidden lg:flex w-16 h-16 items-center justify-center shrink-0 hover:opacity-60 cursor-pointer">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </div>
    </Link>
  );
}
