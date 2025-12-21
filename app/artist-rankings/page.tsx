"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song, Artist } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

export const dynamic = 'force-dynamic';

const ARTISTS_PER_PAGE = 50;

type SortOption = "rating-desc" | "rating-asc" | "songs-desc" | "songs-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating-desc", label: "Rating (High to Low)" },
  { value: "rating-asc", label: "Rating (Low to High)" },
  { value: "songs-desc", label: "Songs (Most to Least)" },
  { value: "songs-asc", label: "Songs (Least to Most)" },
];

interface ArtistRanking {
  name: string;
  averageRating: number;
  songCount: number;
  imageUrl: string | null;
  rank: number;
}

export default function ArtistRankingsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [artistRankings, setArtistRankings] = useState<ArtistRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating-desc");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch songs and artists in parallel
        const [
          { data: songsData, error: songsError },
          { data: artistsData, error: artistsError }
        ] = await Promise.all([
          supabase.from("songs").select("*"),
          supabase.from("artists").select("*")
        ]);

        if (songsError) throw songsError;
        if (artistsError) throw artistsError;

        // Create a map of artist images
        const artistImageMap = new Map<string, string>();
        (artistsData || []).forEach((artist: Artist) => {
          if (artist.image_url) {
            artistImageMap.set(artist.name, artist.image_url);
          }
        });

        // Group songs by artist and calculate average ratings
        const artistStats = new Map<string, { totalRating: number; count: number }>();

        (songsData || []).forEach((song: Song) => {
          // Split by comma and process each artist
          const artists = song.artist.split(',').map((a: string) => a.trim());
          artists.forEach((artistName: string) => {
            const existing = artistStats.get(artistName) || { totalRating: 0, count: 0 };
            artistStats.set(artistName, {
              totalRating: existing.totalRating + song.rating,
              count: existing.count + 1,
            });
          });
        });

        // Convert to array with rankings
        const rankings: ArtistRanking[] = Array.from(artistStats.entries()).map(
          ([name, stats]) => ({
            name,
            averageRating: Math.round(stats.totalRating / stats.count),
            songCount: stats.count,
            imageUrl: artistImageMap.get(name) || null,
            rank: 0,
          })
        );

        setArtistRankings(rankings);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter and sort artists
  const filteredArtists = artistRankings
    .filter((artist) => {
      if (!searchQuery.trim()) return true;
      return artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating-desc":
          return b.averageRating - a.averageRating;
        case "rating-asc":
          return a.averageRating - b.averageRating;
        case "songs-desc":
          return b.songCount - a.songCount;
        case "songs-asc":
          return a.songCount - b.songCount;
        default:
          return 0;
      }
    })
    .map((artist, index) => ({
      ...artist,
      rank: index + 1,
    }));

  const totalPages = Math.ceil(filteredArtists.length / ARTISTS_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTISTS_PER_PAGE;
  const endIndex = startIndex + ARTISTS_PER_PAGE;
  const currentArtists = filteredArtists.slice(startIndex, endIndex);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 });
    }
  };

  return (
    <main className="relative h-full overflow-hidden">
      <div ref={scrollContainerRef} className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        {/* Page Title */}
        <div className="max-w-[964px] mx-auto mb-8">
          <h1 className="text-[48px] font-bold">Artists Power Rankings</h1>
          <p className="text-[20px] opacity-70">Ranked by average song rating</p>
        </div>

        {/* Search Bar and Sort */}
        <div className="max-w-[964px] mx-auto mb-8">
          <div className="flex gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="search artists"
                className="w-full px-6 py-4 text-[20px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                aria-label="Search"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="px-4 py-4 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red) cursor-pointer font-semibold"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Artists List */}
        <div className="max-w-[964px] mx-auto space-y-4 mb-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[24px] font-semibold">Loading artists...</p>
            </div>
          ) : currentArtists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[24px] font-semibold mb-4">No artists found</p>
            </div>
          ) : (
            currentArtists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => router.push(`/artists/${encodeURIComponent(artist.name)}`)}
                className="flex items-center gap-4 p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
              >
                {/* Rank */}
                <div className="w-16 text-center text-[48px] font-black">
                  {artist.rank}
                </div>

                {/* Artist Image */}
                {artist.imageUrl ? (
                  <Image
                    src={artist.imageUrl}
                    alt={`${artist.name} photo`}
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-neutral-200 shrink-0 flex items-center justify-center">
                    <span className="text-[40px] opacity-30">
                      {artist.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Artist Info */}
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold leading-none">
                    {artist.name}
                  </h3>
                  <p className="text-[18px] opacity-70">
                    {artist.songCount} {artist.songCount === 1 ? "song" : "songs"}
                  </p>
                </div>

                {/* Average Rating */}
                <div
                  className="w-24 h-24 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: getRatingColor(artist.averageRating) }}
                >
                  <span className="text-[40px] font-black">{artist.averageRating}</span>
                </div>

                {/* Arrow */}
                <button className="w-16 h-16 flex items-center justify-center shrink-0 hover:opacity-60 cursor-pointer">
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
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredArtists.length > 0 && (
          <div className="max-w-[964px] mx-auto mb-8">
            <div className="flex items-center justify-between">
              <p className="text-[16px]">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredArtists.length)} of{" "}
                {filteredArtists.length} {searchQuery ? "matching " : ""}artists
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 border-2 border-black font-semibold cursor-pointer ${
                            currentPage === page
                              ? "bg-(--color-brand-red) text-white"
                              : "bg-white hover:bg-neutral-100"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!loading && searchQuery && filteredArtists.length === 0 && (
          <div className="max-w-[964px] mx-auto text-center py-12">
            <p className="text-[24px] font-semibold mb-2">No artists found</p>
            <p className="text-[18px] opacity-70">
              Try searching for a different artist name
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
