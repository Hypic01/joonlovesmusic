"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRatingColor } from "@/lib/ratingColors";
import type { NowPlayingVM } from "@/lib/spotify";

interface NowPlayingBannerProps {
  /** Server-rendered seed so there's no first-paint flash. */
  initial: NowPlayingVM;
}

const POLL_MS = 25_000;

export default function NowPlayingBanner({ initial }: NowPlayingBannerProps) {
  const [now, setNow] = useState<NowPlayingVM>(initial);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/spotify/now-playing");
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as NowPlayingVM;
        if (!cancelled) setNow(data);
      } catch {
        // Transient error — keep the last known state and try again next tick.
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const track = now.isPlaying ? now.track : null;

  return (
    <div className="border-2 border-black bg-white p-3 md:p-4 mb-10 flex items-center gap-3 lg:gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-3 h-3 ${track ? "bg-(--color-brand-red) animate-pulse" : "bg-neutral-300"}`}
        />
        <span className="text-[12px] lg:text-[14px] font-bold uppercase tracking-wide">
          now playing
        </span>
      </div>

      {track ? (
        <>
          {track.coverUrl ? (
            <Image
              src={track.coverUrl}
              alt={`${track.title} cover`}
              width={56}
              height={56}
              className="w-12 h-12 lg:w-14 lg:h-14 object-cover shrink-0"
              priority
            />
          ) : (
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-neutral-300 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {track.rated ? (
              <Link href={`/musics/${track.rated.id}`} prefetch={false} className="hover:underline">
                <div className="text-[16px] lg:text-[20px] font-bold truncate">{track.title}</div>
              </Link>
            ) : (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                <div className="text-[16px] lg:text-[20px] font-bold truncate">{track.title}</div>
              </a>
            )}
            <div className="text-[13px] lg:text-[15px] opacity-80 truncate">{track.artist}</div>
          </div>

          {track.rated && (
            <div
              className="w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center shrink-0"
              style={{ backgroundColor: getRatingColor(track.rated.rating) }}
            >
              <span className="text-[20px] lg:text-[24px] font-black">{track.rated.rating}</span>
            </div>
          )}
        </>
      ) : (
        <span className="text-[15px] lg:text-[16px] opacity-60">not playing right now</span>
      )}
    </div>
  );
}
