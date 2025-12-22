"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumName = decodeURIComponent(params.albumName as string);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAlbumSongs() {
      try {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .eq("album_name", albumName)
          .order("track_number", { ascending: true, nullsFirst: false });

        if (error) throw error;

        // Add rank based on position in sorted array
        const songsWithRank = (data || []).map((song, index) => ({
          ...song,
          rank: index + 1,
        }));

        setSongs(songsWithRank);
      } catch (error) {
        console.error("Error fetching album songs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbumSongs();
  }, [albumName]);

  return (
    <main className="relative h-full overflow-hidden">
      <div ref={scrollContainerRef} className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto">
          {/* Album Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-[18px] font-semibold hover:underline cursor-pointer mb-4"
            >
              ← Back
            </button>
            <h1 className="text-[56px] font-bold leading-none mb-2">{albumName}</h1>
            <p className="text-[24px] opacity-70">
              {songs.length} {songs.length === 1 ? "track" : "tracks"}
            </p>
          </div>

          {/* Songs List */}
          <div className="space-y-4 mb-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold">Loading tracks...</p>
              </div>
            ) : songs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[24px] font-semibold mb-4">No tracks found</p>
                <p className="text-[18px] opacity-70">
                  This album doesn&apos;t have any tracks yet
                </p>
              </div>
            ) : (
              songs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => router.push(`/musics/${song.id}`)}
                  className="block p-3 md:p-4 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
                >
                  {/* Mobile Layout - Square-ish */}
                  <div className="sm:hidden">
                    {/* Top Row: Track Number + Album Cover + Rating */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[32px] font-black w-10 text-center">{song.track_number || index + 1}</div>
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
                      <p className="text-[14px] opacity-70 truncate">{song.artist}</p>
                    </div>
                  </div>

                  {/* Tablet/Desktop Layout - Single Row */}
                  <div className="hidden sm:flex items-center gap-3 lg:gap-4">
                    {/* Track Number */}
                    <div className="w-12 lg:w-16 text-center text-[36px] lg:text-[48px] font-black">
                      {song.track_number || index + 1}
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
                      <p className="text-[14px] lg:text-[18px] opacity-70 truncate">{song.artist}</p>
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

