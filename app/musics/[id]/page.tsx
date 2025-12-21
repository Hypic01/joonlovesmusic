"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song, Award } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering to avoid build-time errors with environment variables
export const dynamic = 'force-dynamic';

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [song, setSong] = useState<Song | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.authenticated))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    async function fetchSong() {
      try {
        // Fetch song
        const { data: songData, error: songError } = await supabase
          .from("songs")
          .select("*")
          .eq("id", id)
          .single();

        if (songError) throw songError;
        setSong(songData);

        // Fetch awards for this song
        const { data: awardsData, error: awardsError } = await supabase
          .from("awards")
          .select("*")
          .eq("song_id", id);

        if (awardsError) throw awardsError;
        setAwards(awardsData || []);
      } catch (error) {
        console.error("Error fetching song:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  if (loading) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">Song not found</p>
            <button
              onClick={() => router.push("/musics")}
              className="mt-4 px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer"
            >
              Back to list
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />

          <div className="max-w-[964px] mx-auto">
            {/* Edit Button - Only show if admin */}
            {isAdmin && (
              <div className="mb-6">
                <button
                  onClick={() => router.push(`/admin/edit/${song.id}`)}
                  className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer"
                >
                  Edit Song
                </button>
              </div>
            )}

            {/* Song Header */}
            <div className="flex items-start gap-6 mb-12">
              {/* Album Cover and Spotify Player */}
              <div className="shrink-0" style={{ width: '320px' }}>
                {/* Album Cover */}
                {song.cover_url ? (
                  <Image
                    src={song.cover_url}
                    alt={`${song.title} cover`}
                    width={320}
                    height={320}
                    className="w-full object-cover"
                    style={{ aspectRatio: '1/1' }}
                  />
                ) : (
                  <div className="w-full bg-neutral-300" style={{ aspectRatio: '1/1' }} />
                )}

                {/* Spotify Embed Player */}
                {song.spotify_track_id && (
                  <div className="mt-4">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${song.spotify_track_id}?utm_source=generator&theme=0`}
                      width="320"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title={`Spotify player for ${song.title}`}
                    />
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="flex-1">
                <h1 className="text-[56px] font-bold leading-none mb-2">
                  {song.title}
                </h1>
                <p className="text-[32px] font-normal">{song.artist}</p>
              </div>

              {/* Rating with Last Updated */}
              <div className="shrink-0">
                <div 
                  className="w-32 h-32 flex items-center justify-center"
                  style={{ backgroundColor: getRatingColor(song.rating) }}
                >
                  <span className="text-[64px] font-black">{song.rating}</span>
                </div>
                {/* Last Updated */}
                {song.updated_at && (
                  <div className="text-[14px] opacity-60 mt-2 text-center">
                    Last updated:<br />
                    {new Date(song.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Awards Section */}
            {awards.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Awards</h2>
                <div className="flex flex-wrap gap-4">
                  {awards.map((award) => (
                    <div
                      key={award.id}
                      className="bg-[#9FE870] px-8 py-6 text-center"
                    >
                      <p className="text-[18px] font-semibold leading-tight">
                        {award.name}
                      </p>
                      <p className="text-[18px] font-semibold leading-tight">
                        {award.detail}
                      </p>
                      <p className="text-[48px] font-black mt-2">
                        {award.position}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Section */}
            {song.comment && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-2">Comment</h2>
                <p className="text-[18px] leading-relaxed">{song.comment}</p>
              </div>
            )}
          </div>
        </div>
      </main>
  );
}

