"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering to avoid build-time errors with Supabase
export const dynamic = 'force-dynamic';

const SONGS_PER_PAGE = 50;

type SortOption = "rating-desc" | "rating-asc" | "updated-desc" | "updated-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating-desc", label: "Rating (High to Low)" },
  { value: "rating-asc", label: "Rating (Low to High)" },
  { value: "updated-desc", label: "Updated (New to Old)" },
  { value: "updated-asc", label: "Updated (Old to New)" },
];

export default function MusicsPage() {
  return (
    <Suspense fallback={
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <MusicsContent />
    </Suspense>
  );
}

function MusicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialSort = (searchParams.get("sort") as SortOption) || "rating-desc";
  const initialSearch = searchParams.get("q") || "";

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update URL when state changes
  const updateURL = (page: number, sort: SortOption, search: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (sort !== "rating-desc") params.set("sort", sort);
    if (search) params.set("q", search);

    const queryString = params.toString();
    const newUrl = queryString ? `/musics?${queryString}` : "/musics";
    router.replace(newUrl, { scroll: false });
  };

  // Sync state with URL params when navigating back/forward
  useEffect(() => {
    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
    const sortFromUrl = (searchParams.get("sort") as SortOption) || "rating-desc";
    const searchFromUrl = searchParams.get("q") || "";

    if (pageFromUrl !== currentPage) setCurrentPage(pageFromUrl);
    if (sortFromUrl !== sortBy) setSortBy(sortFromUrl);
    if (searchFromUrl !== searchQuery) setSearchQuery(searchFromUrl);
  }, [searchParams]);

  useEffect(() => {
    async function fetchSongs() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .order("rating", { ascending: false });

        if (error) throw error;

        // Add rank based on position in sorted array
        const songsWithRank = (data || []).map((song, index) => ({
          ...song,
          rank: index + 1,
        }));

        setAllSongs(songsWithRank);
      } catch (error) {
        console.error("Error fetching songs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSongs();
  }, []);

  // Filter and sort songs
  const filteredSongs = allSongs
    .filter((song) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const titleMatch = song.title.toLowerCase().includes(query);
      const artistMatch = song.artist.toLowerCase().includes(query);
      const albumMatch = song.album_name?.toLowerCase().includes(query) || false;
      const ratingMatch = song.rating.toString() === query;

      return titleMatch || artistMatch || albumMatch || ratingMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating-desc":
          return b.rating - a.rating;
        case "rating-asc":
          return a.rating - b.rating;
        case "updated-desc":
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        case "updated-asc":
          return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
        default:
          return 0;
      }
    })
    .map((song, index) => ({
      ...song,
      rank: index + 1,
    }));

  const totalPages = Math.ceil(filteredSongs.length / SONGS_PER_PAGE);
  const startIndex = (currentPage - 1) * SONGS_PER_PAGE;
  const endIndex = startIndex + SONGS_PER_PAGE;
  const currentSongs = filteredSongs.slice(startIndex, endIndex);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearchQuery(newSearch);
    setCurrentPage(1);
    updateURL(1, sortBy, newSearch);
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    setSortDropdownOpen(false);
    updateURL(1, newSort, searchQuery);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    updateURL(page, sortBy, searchQuery);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 });
    }
  };
  return (
    <main className="relative h-full overflow-hidden overflow-x-hidden">
        <div ref={scrollContainerRef} className="relative z-10 h-full overflow-y-auto overflow-x-hidden">
          <Navbar />

          {/* Search Bar and Sort */}
          <div className="max-w-[964px] mx-auto mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="search by song, album, artist, or rating"
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
              <div ref={sortDropdownRef} className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center justify-between gap-3 px-4 py-4 text-[18px] border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer font-semibold w-full md:min-w-[240px]"
                >
                  <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {sortDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 border-2 border-black bg-white z-50">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full px-4 py-3 text-[16px] text-left hover:bg-neutral-100 cursor-pointer ${
                          sortBy === option.value ? "bg-neutral-100 font-semibold" : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Songs List */}
          <div className="max-w-[964px] mx-auto space-y-4 mb-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold">Loading songs...</p>
              </div>
            ) : currentSongs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold mb-4">No songs found</p>
                <button
                  onClick={() => router.push("/admin")}
                  className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer"
                >
                  Add Your First Song
                </button>
              </div>
            ) : (
              currentSongs.map((song) => (
                <Link
                  key={song.id}
                  href={`/musics/${song.id}`}
                  prefetch={true}
                  className="block p-3 md:p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
                >
                  {/* Mobile Layout - Square-ish */}
                  <div className="sm:hidden">
                    {/* Top Row: Rank + Album Cover + Rating */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[32px] font-black w-10 text-center">{song.rank}</div>
                      {song.cover_url ? (
                        <Image
                          src={song.cover_url}
                          alt={`${song.title} cover`}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover"
                          priority={song.rank <= 10}
                          loading={song.rank <= 10 ? "eager" : "lazy"}
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
                    <div className="pl-12">
                      <h3 className="text-[22px] font-bold leading-tight truncate">
                        {song.title}
                      </h3>
                      {song.album_name && (
                        <p className="text-[14px] font-normal opacity-70 truncate">
                          {song.album_name}
                        </p>
                      )}
                      <div className="text-[14px] truncate">
                        {song.artist}
                      </div>
                    </div>
                  </div>

                  {/* Tablet/Desktop Layout - Single Row */}
                  <div className="hidden sm:flex items-center gap-3 lg:gap-4">
                    {/* Rank */}
                    <div className="w-12 lg:w-16 text-center text-[36px] lg:text-[48px] font-black">
                      {song.rank}
                    </div>

                    {/* Album Cover */}
                    {song.cover_url ? (
                      <Image
                        src={song.cover_url}
                        alt={`${song.title} cover`}
                        width={96}
                        height={96}
                        className="w-20 h-20 lg:w-24 lg:h-24 object-cover shrink-0"
                        priority={song.rank <= 10}
                        loading={song.rank <= 10 ? "eager" : "lazy"}
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
                        {song.artist.split(',').map((artist, index, array) => (
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
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredSongs.length > 0 && (
            <div className="max-w-[964px] mx-auto mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-[16px]">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSongs.length)} of{" "}
                  {filteredSongs.length} {searchQuery ? "matching " : ""}songs
                </p>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer text-[14px] sm:text-[16px]"
                    >
                      Prev
                    </button>

                    {/* Page Numbers - desktop shows all */}
                    <div className="hidden sm:flex gap-2">
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

                    {/* Mobile smart pagination */}
                    <div className="flex sm:hidden items-center gap-1">
                      {/* First page */}
                      {currentPage > 2 && (
                        <>
                          <button
                            onClick={() => goToPage(1)}
                            className="w-8 h-8 border-2 border-black bg-white hover:bg-neutral-100 font-semibold cursor-pointer text-[14px]"
                          >
                            1
                          </button>
                          {currentPage > 3 && (
                            <span className="px-1 text-[14px]">...</span>
                          )}
                        </>
                      )}

                      {/* Pages around current */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page >= currentPage - 1 && page <= currentPage + 1)
                        .map(page => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 border-2 border-black font-semibold cursor-pointer text-[14px] ${
                              currentPage === page
                                ? "bg-(--color-brand-red) text-white"
                                : "bg-white hover:bg-neutral-100"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                      {/* Last page */}
                      {currentPage < totalPages - 1 && (
                        <>
                          {currentPage < totalPages - 2 && (
                            <span className="px-1 text-[14px]">...</span>
                          )}
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="w-8 h-8 border-2 border-black bg-white hover:bg-neutral-100 font-semibold cursor-pointer text-[14px]"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 sm:px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer text-[14px] sm:text-[16px]"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!loading && searchQuery && filteredSongs.length === 0 && (
            <div className="max-w-[964px] mx-auto text-center py-12">
              <p className="text-[24px] font-semibold mb-2">No songs found</p>
              <p className="text-[18px] opacity-70">
                Try searching for a different song, artist, or album
              </p>
            </div>
          )}
        </div>
      </main>
  );
}

