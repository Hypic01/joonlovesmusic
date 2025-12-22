"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song, Artist } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const artistName = decodeURIComponent(params.artistName as string);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchArtistData() {
      try {
        // Fetch artist data and songs in parallel
        const [
          { data: songsData, error: songsError },
          { data: artistData }
        ] = await Promise.all([
          supabase.from("songs").select("*").order("rating", { ascending: false }),
          supabase.from("artists").select("*").eq("name", artistName).single()
        ]);

        if (songsError) throw songsError;
        // Artist data might not exist if not fetched from Spotify yet

        // Filter songs where the artist name appears in the artist field
        // Split by comma and check if any artist matches
        const filteredSongs = (songsData || []).filter((song) => {
          const artists = song.artist.split(',').map((a: string) => a.trim());
          return artists.includes(artistName);
        });

        // Add rank based on position in filtered array
        const songsWithRank = filteredSongs.map((song, index) => ({
          ...song,
          rank: index + 1,
        }));

        setSongs(songsWithRank);
        setArtist(artistData || null);
      } catch (error) {
        console.error("Error fetching artist data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchArtistData();
  }, [artistName]);

  // Calculate average rating
  const averageRating = songs.length > 0
    ? Math.round(songs.reduce((sum, song) => sum + song.rating, 0) / songs.length)
    : 0;

  return (
    <main className="relative h-full overflow-hidden">
      <div ref={scrollContainerRef} className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto">
          <button
            onClick={() => router.back()}
            className="text-[18px] font-semibold hover:underline cursor-pointer mb-6"
          >
            ← Back
          </button>

          {/* Artist Header with Image */}
          <div className="mb-8 sm:mb-12">
            {/* Mobile Layout */}
            <div className="sm:hidden">
              {/* Top: Artist Image + Rating side by side */}
              <div className="flex gap-4 mb-4">
                <div className="w-32 h-32 shrink-0">
                  {loading ? (
                    <div className="w-32 h-32 bg-neutral-200 animate-pulse" />
                  ) : artist?.image_url ? (
                    <Image
                      src={artist.image_url}
                      alt={`${artistName} photo`}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-32 h-32 bg-neutral-200 flex items-center justify-center">
                      <span className="text-[48px] opacity-30">{artistName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1" />
                {songs.length > 0 && (
                  <div className="shrink-0">
                    <div
                      className="w-20 h-20 flex items-center justify-center"
                      style={{ backgroundColor: getRatingColor(averageRating) }}
                    >
                      <span className="text-[40px] font-black">{averageRating}</span>
                    </div>
                    <div className="text-[12px] opacity-60 mt-1 text-center">
                      Avg Rating
                    </div>
                  </div>
                )}
              </div>
              {/* Bottom: Artist Info */}
              <div>
                <h1 className="text-[32px] font-bold leading-none mb-1">{artistName}</h1>
                <p className="text-[16px] opacity-70">
                  {songs.length} {songs.length === 1 ? "song" : "songs"}
                </p>
              </div>
            </div>

            {/* Tablet/Desktop Layout */}
            <div className="hidden sm:flex items-start gap-4 lg:gap-6">
              {/* Artist Image - always reserve space */}
              <div className="shrink-0 w-40 h-40 lg:w-60 lg:h-60">
                {loading ? (
                  <div className="w-full h-full bg-neutral-200 animate-pulse" />
                ) : artist?.image_url ? (
                  <Image
                    src={artist.image_url}
                    alt={`${artistName} photo`}
                    width={240}
                    height={240}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                    <span className="text-[48px] lg:text-[64px] opacity-30">{artistName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Artist Info and Average Rating */}
              <div className="flex-1 flex items-start justify-between gap-4 lg:gap-6">
                {/* Artist Info */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h1 className="text-[36px] lg:text-[56px] font-bold leading-none mb-2 truncate">{artistName}</h1>
                  <p className="text-[18px] lg:text-[24px] opacity-70">
                    {songs.length} {songs.length === 1 ? "song" : "songs"}
                  </p>
                </div>

                {/* Average Rating */}
                {songs.length > 0 && (
                  <div className="shrink-0">
                    <div
                      className="w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center"
                      style={{ backgroundColor: getRatingColor(averageRating) }}
                    >
                      <span className="text-[48px] lg:text-[64px] font-black">{averageRating}</span>
                    </div>
                    <div className="text-[12px] lg:text-[14px] opacity-60 mt-2 text-center">
                      Average Rating
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Songs List */}
          <div className="space-y-4 mb-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold">Loading songs...</p>
              </div>
            ) : songs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold mb-4">No songs found</p>
                <p className="text-[18px] opacity-70">
                  This artist doesn&apos;t have any songs yet
                </p>
              </div>
            ) : (
              songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => router.push(`/musics/${song.id}`)}
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
                        <p className="text-[14px] opacity-70 truncate">
                          {song.album_name}
                        </p>
                      )}
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
                        <p
                          className="text-[14px] lg:text-[18px] opacity-70 hover:underline cursor-pointer truncate"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (song.album_name) {
                              router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                            }
                          }}
                        >
                          {song.album_name}
                        </p>
                      )}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

