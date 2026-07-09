"use client";

import { getWrappedTheme, getRankNumberStyle } from "@/lib/wrappedThemes";

interface WrappedBadgeProps {
  year: number;
  rank: number;
}

// One "Joon's Top Songs YYYY / #rank" honor badge. Ranks 1-3 get the metallic
// podium frame (gradient + shimmer + hover sweep, defined in globals.css).
export default function WrappedBadge({ year, rank }: WrappedBadgeProps) {
  const theme = getWrappedTheme(year);
  const rankStyle = getRankNumberStyle(rank, theme);
  const podium = rank <= 3;

  const card = (
    <div
      className="relative overflow-hidden px-8 py-6 text-center border-2 border-black"
      style={{ backgroundColor: theme.colors[0], color: theme.text }}
    >
      {!podium && (
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: theme.colors[1] }}
        />
      )}
      {podium && <div className="wrapped-sweep" aria-hidden="true" />}
      <p className="text-[18px] font-semibold leading-tight">
        Joon&apos;s Top Songs
      </p>
      <p className="text-[18px] font-semibold leading-tight">{year}</p>
      <p
        className={`${podium ? "text-[56px]" : "text-[48px]"} font-black mt-2 leading-none`}
        style={rankStyle}
      >
        #{rank}
      </p>
    </div>
  );

  if (!podium) return card;

  const frameClass =
    rank === 1
      ? "wrapped-frame-gold"
      : rank === 2
        ? "wrapped-frame-silver"
        : "wrapped-frame-bronze";

  return <div className={`wrapped-podium-frame ${frameClass}`}>{card}</div>;
}
