"use client";

import { useState } from "react";
import type {
  TimeRange,
  TopTrackVM,
  TopArtistVM,
  RecentlyPlayedVM,
} from "@/lib/spotify";
import TopTracksSection from "./TopTracksSection";
import TopArtistsSection from "./TopArtistsSection";
import RecentlyPlayedFeed from "./RecentlyPlayedFeed";

type StatsTab = "tracks" | "artists" | "recent";

const TABS: { value: StatsTab; label: string }[] = [
  { value: "tracks", label: "top tracks" },
  { value: "artists", label: "top artists" },
  { value: "recent", label: "recently played" },
];

interface StatsSectionsLayoutProps {
  topTracks: Record<TimeRange, TopTrackVM[]>;
  topArtists: Record<TimeRange, TopArtistVM[]>;
  recentlyPlayed: RecentlyPlayedVM[];
  nowMs: number;
}

// Responsive hybrid (spec 2026-07-09): at lg+ all three sections render as
// parallel grid columns; below lg a pixel tab bar shows one at a time. One
// DOM — the tab state only flips visibility classes below lg, so switching
// is instant and nothing re-mounts.
export default function StatsSectionsLayout({
  topTracks,
  topArtists,
  recentlyPlayed,
  nowMs,
}: StatsSectionsLayoutProps) {
  const [tab, setTab] = useState<StatsTab>("tracks");

  const sectionClass = (value: StatsTab) =>
    `${tab === value ? "block" : "hidden"} lg:block min-w-0`;

  return (
    <div>
      {/* Tab bar — tablet & phone only; at lg+ all sections are visible */}
      <div
        role="tablist"
        aria-label="stats sections"
        className="lg:hidden flex gap-2 mb-6"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 px-2 py-3 text-[16px] sm:text-[18px] border-2 border-black font-semibold cursor-pointer leading-tight ${
              tab === t.value
                ? "bg-black text-white"
                : "bg-white hover:border-(--color-brand-red)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={sectionClass("tracks")}>
          <TopTracksSection data={topTracks} />
        </div>
        <div className={sectionClass("artists")}>
          <TopArtistsSection data={topArtists} />
        </div>
        <div className={sectionClass("recent")}>
          <RecentlyPlayedFeed items={recentlyPlayed} nowMs={nowMs} />
        </div>
      </div>
    </div>
  );
}
