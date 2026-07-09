"use client";

import { getWrappedTheme, getRankNumberStyle } from "@/lib/wrappedThemes";

interface WrappedBadgeProps {
  year: number;
  rank: number;
}

// One "Joon's Top Songs YYYY / #rank" honor badge, styled after that year's
// real Wrapped playlist cover (layers in lib/wrappedThemes.ts). Busy covers
// put the text on a solid plate, like the covers themselves do. Ranks 1-3 get
// the metallic podium frame (gradient + shimmer + hover sweep, globals.css).
export default function WrappedBadge({ year, rank }: WrappedBadgeProps) {
  const theme = getWrappedTheme(year);
  const rankStyle = getRankNumberStyle(rank, theme);
  const podium = rank <= 3;

  const labelStyle = {
    color: theme.text,
    textShadow: theme.shadow ? `2px 2px 0 ${theme.shadow}` : undefined,
  };

  const content = (
    <>
      <p className="text-[18px] font-semibold leading-tight" style={labelStyle}>
        Joon&apos;s Top Songs
      </p>
      <p className="text-[18px] font-semibold leading-tight" style={labelStyle}>
        {year}
      </p>
      <p
        className={`${podium ? "text-[56px]" : "text-[48px]"} font-black mt-2 leading-none`}
        style={rankStyle}
      >
        #{rank}
      </p>
    </>
  );

  const card = (
    <div
      className="relative overflow-hidden px-6 py-6 text-center border-2 border-black min-w-[184px]"
      style={{ background: theme.background }}
    >
      {theme.plate ? (
        <div
          className="border-2 border-black px-4 py-3 m-1"
          style={{ background: theme.plate, boxShadow: theme.plateRing }}
        >
          {content}
        </div>
      ) : (
        content
      )}
      {podium && <div className="wrapped-sweep" aria-hidden="true" />}
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
