"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering to avoid build-time errors with Supabase
export const dynamic = 'force-dynamic';

const SONGS_PER_PAGE = 50;

export default function MusicsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Filter songs based on search query
  const filteredSongs = allSongs.filter((song) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = song.title.toLowerCase().includes(query);
    const artistMatch = song.artist.toLowerCase().includes(query);
    const albumMatch = song.album_name?.toLowerCase().includes(query) || false;
    
    return titleMatch || artistMatch || albumMatch;
  });

  const totalPages = Math.ceil(filteredSongs.length / SONGS_PER_PAGE);
  const startIndex = (currentPage - 1) * SONGS_PER_PAGE;
  const endIndex = startIndex + SONGS_PER_PAGE;
  const currentSongs = filteredSongs.slice(startIndex, endIndex);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
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

          {/* Search Bar */}
          <div className="max-w-[964px] mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="search by song, album, or artist"
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
                  className="flex items-center gap-4 p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
                >
                  {/* Rank */}
                  <div className="w-16 text-center text-[48px] font-black">
                    {song.rank}
                  </div>

                  {/* Album Cover */}
                  {song.cover_url ? (
                    <Image
                      src={song.cover_url}
                      alt={`${song.title} cover`}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover shrink-0"
                      priority={song.rank <= 10}
                      loading={song.rank <= 10 ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-neutral-300 shrink-0" />
                  )}

                {/* Song Info */}
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold leading-none">
                    {song.title}
                  </h3>
                  {song.album_name && (
                    <p
                      className="text-[18px] font-normal opacity-70 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                      }}
                    >
                      {song.album_name}
                    </p>
                  )}
                  <div className="text-[20px]">
                    {song.artist.split(',').map((artist, index, array) => (
                      <span key={index}>
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={(e) => {
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
                  className="w-24 h-24 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: getRatingColor(song.rating) }}
                >
                  <span className="text-[40px] font-black">{song.rating}</span>
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
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredSongs.length > SONGS_PER_PAGE && (
            <div className="max-w-[964px] mx-auto mb-8">
              <div className="flex items-center justify-between">
                <p className="text-[16px]">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSongs.length)} of{" "}
                  {filteredSongs.length} {searchQuery ? "matching " : ""}songs
                </p>

              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer"
                >
                  Previous
                </button>

                {/* Page Numbers */}
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

                {/* Next Button */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed font-semibold cursor-pointer"
                >
                  Next
                </button>
              </div>
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

