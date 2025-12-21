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
          <div className="flex items-start gap-6 mb-12">
            {/* Artist Image */}
            {artist?.image_url && (
              <div className="shrink-0">
                <Image
                  src={artist.image_url}
                  alt={`${artistName} photo`}
                  width={240}
                  height={240}
                  className="w-60 h-60 object-cover"
                  priority
                />
              </div>
            )}

            {/* Artist Info */}
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-[56px] font-bold leading-none mb-2">{artistName}</h1>
              <p className="text-[24px] opacity-70">
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </p>
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
                        className="text-[18px] opacity-70 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                        }}
                      >
                        {song.album_name}
                      </p>
                    )}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

