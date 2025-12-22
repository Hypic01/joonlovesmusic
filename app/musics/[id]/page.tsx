"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import type { Song, Award, RatingHistory, CommentHistory } from "@/types/database";
import { getRatingColor } from "@/lib/ratingColors";

// Force dynamic rendering to avoid build-time errors with environment variables
export const dynamic = 'force-dynamic';

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [song, setSong] = useState<Song | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [commentHistory, setCommentHistory] = useState<CommentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

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
        // Fetch all data in parallel for better performance
        const [
          { data: songData, error: songError },
          { data: awardsData, error: awardsError },
          { data: historyData, error: historyError },
          { data: commentHistoryData, error: commentHistoryError }
        ] = await Promise.all([
          supabase.from("songs").select("*").eq("id", id).single(),
          supabase.from("awards").select("*").eq("song_id", id),
          supabase.from("rating_history").select("*").eq("song_id", id).order("changed_at", { ascending: false }),
          supabase.from("comment_history").select("*").eq("song_id", id).order("changed_at", { ascending: false })
        ]);

        // Check for errors
        if (songError) throw songError;
        if (awardsError) throw awardsError;
        if (historyError) throw historyError;
        if (commentHistoryError) throw commentHistoryError;

        // Set all data
        console.log("Fetched song data:", songData); // Debug log
        setSong(songData);
        setAwards(awardsData || []);
        setRatingHistory(historyData || []);
        setCommentHistory(commentHistoryData || []);
      } catch (error) {
        console.error("Error fetching song:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  const handleDeleteRatingHistory = async (historyId: string) => {
    if (!confirm("Are you sure you want to delete this rating history entry?")) {
      return;
    }

    setDeletingHistoryId(historyId);
    try {
      const response = await fetch(`/api/rating-history/${historyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete");
      }

      // Remove from local state
      setRatingHistory((prev) => prev.filter((h) => h.id !== historyId));
    } catch (error) {
      console.error("Error deleting rating history:", error);
      alert("Failed to delete rating history");
    } finally {
      setDeletingHistoryId(null);
    }
  };

  if (loading) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            {/* Skeleton loader for better UX */}
            <div className="animate-pulse">
              <div className="flex items-start gap-6 mb-12">
                {/* Album cover skeleton */}
                <div className="w-60 h-60 bg-neutral-200 shrink-0" />
                {/* Song info skeleton */}
                <div className="flex-1 space-y-4">
                  <div className="h-14 bg-neutral-200 w-3/4" />
                  <div className="h-8 bg-neutral-200 w-1/2" />
                  <div className="h-10 bg-neutral-200 w-2/3" />
                </div>
                {/* Rating skeleton */}
                <div className="w-32 h-32 bg-neutral-200 shrink-0" />
              </div>
            </div>
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

            {/* Song Header - Responsive Layout */}
            <div className="mb-6">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                {/* Top: Album Cover + Rating side by side */}
                <div className="flex gap-4 mb-4">
                  <div className="w-32 h-32 shrink-0">
                    {song.cover_url ? (
                      <Image
                        src={song.cover_url}
                        alt={`${song.title} cover`}
                        width={128}
                        height={128}
                        className="w-32 h-32 object-cover"
                        priority
                      />
                    ) : (
                      <div className="w-32 h-32 bg-neutral-300" />
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0">
                    <div
                      className="w-20 h-20 flex items-center justify-center"
                      style={{ backgroundColor: getRatingColor(song.rating) }}
                    >
                      <span className="text-[40px] font-black">{song.rating}</span>
                    </div>
                    {song.updated_at && (
                      <div className="text-[12px] opacity-60 mt-1 text-center">
                        {new Date(song.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* Bottom: Song Info */}
                <div>
                  <h1 className="text-[32px] font-bold leading-none mb-1">
                    {song.title}
                  </h1>
                  {song.album_name && (
                    <p
                      className="text-[16px] font-normal opacity-70 mb-1 hover:underline cursor-pointer"
                      onClick={() => {
                        if (song.album_name) {
                          router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                        }
                      }}
                    >
                      {song.album_name}
                    </p>
                  )}
                  <div className="text-[18px] font-normal">
                    {song.artist.split(',').map((artist, index, array) => (
                      <span key={index}>
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={() => router.push(`/artists/${encodeURIComponent(artist.trim())}`)}
                        >
                          {artist.trim()}
                        </span>
                        {index < array.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </div>
                  {song.release_date && (
                    <p className="text-[14px] opacity-60 mt-2">
                      Released: {new Date(song.release_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Tablet/Desktop Layout */}
              <div className="hidden sm:flex sm:flex-row sm:items-start gap-4 lg:gap-6">
                {/* Album Cover */}
                <div className="shrink-0 w-40 h-40 lg:w-60 lg:h-60">
                  {song.cover_url ? (
                    <Image
                      src={song.cover_url}
                      alt={`${song.title} cover`}
                      width={240}
                      height={240}
                      className="w-full h-full object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-300" />
                  )}
                </div>

                {/* Song Info and Rating */}
                <div className="flex-1 flex items-start justify-between gap-4 lg:gap-6">
                  {/* Song Info */}
                  <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: '160px' }}>
                    <div>
                      <h1 className="text-[36px] lg:text-[56px] font-bold leading-none mb-2 truncate">
                        {song.title}
                      </h1>
                      {song.album_name && (
                        <p
                          className="text-[16px] lg:text-[24px] font-normal opacity-70 mb-1 hover:underline cursor-pointer truncate"
                          onClick={() => {
                            if (song.album_name) {
                              router.push(`/albums/${encodeURIComponent(song.album_name)}`);
                            }
                          }}
                        >
                          {song.album_name}
                        </p>
                      )}
                      <div className="text-[20px] lg:text-[32px] font-normal truncate">
                        {song.artist.split(',').map((artist, index, array) => (
                          <span key={index}>
                            <span
                              className="hover:underline cursor-pointer"
                              onClick={() => router.push(`/artists/${encodeURIComponent(artist.trim())}`)}
                            >
                              {artist.trim()}
                            </span>
                            {index < array.length - 1 && <span>, </span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Release Date - Aligned to bottom */}
                    {song.release_date && (
                      <p className="text-[14px] lg:text-[16px] opacity-60 mt-auto">
                        Released: {new Date(song.release_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Rating with Last Updated */}
                  <div className="shrink-0">
                    <div
                      className="w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center"
                      style={{ backgroundColor: getRatingColor(song.rating) }}
                    >
                      <span className="text-[48px] lg:text-[64px] font-black">{song.rating}</span>
                    </div>
                    {/* Last Updated */}
                    {song.updated_at && (
                      <div className="text-[12px] lg:text-[14px] opacity-60 mt-2 text-center">
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
              </div>

              {/* Spotify Embed Player - Below everything */}
              {song.spotify_track_id && (
                <div className="mt-16">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${song.spotify_track_id}?utm_source=generator&theme=0`}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={`Spotify player for ${song.title}`}
                    style={{ 
                      width: '400px', 
                      height: '80px',
                      maxWidth: '100%',
                      border: 'none'
                    }}
                  />
                </div>
              )}
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
            <div className="mb-12">
              <h2 className="text-[28px] font-bold mb-2">Comment</h2>
              {song.comment ? (
                <p className="text-[18px] leading-relaxed">{song.comment}</p>
              ) : (
                <p className="text-[18px] leading-relaxed opacity-50 italic">
                  Joon hasn&apos;t added comment to this music yet.
                </p>
              )}
            </div>

            {/* Rating History Section */}
            {ratingHistory.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Rating History</h2>
                <div className="space-y-4">
                  {ratingHistory.map((history) => (
                    <div
                      key={history.id}
                      className="flex items-center gap-4 p-4 border-2 border-black bg-white"
                    >
                      {/* Rating */}
                      <div
                        className="w-16 h-16 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: getRatingColor(history.rating) }}
                      >
                        <span className="text-[32px] font-black">{history.rating}</span>
                      </div>

                      {/* Date */}
                      <div className="flex-1">
                        <p className="text-[18px] font-semibold">
                          {new Date(history.changed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-[14px] opacity-60">Previous rating</p>
                      </div>

                      {/* Delete button - admin only */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteRatingHistory(history.id)}
                          disabled={deletingHistoryId === history.id}
                          className="px-3 py-1 text-[14px] border-2 border-black bg-white hover:border-red-500 hover:text-red-500 font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {deletingHistoryId === history.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment History Section */}
            {commentHistory.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[28px] font-bold mb-6">Comment History</h2>
                <div className="space-y-4">
                  {commentHistory.map((history) => (
                    <div
                      key={history.id}
                      className="p-4 border-2 border-black bg-white"
                    >
                      {/* Header with rating and date */}
                      <div className="flex items-center gap-4 mb-4">
                        {/* Rating at that time */}
                        <div
                          className="w-12 h-12 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: getRatingColor(history.rating) }}
                        >
                          <span className="text-[24px] font-black">{history.rating}</span>
                        </div>

                        {/* Date */}
                        <div className="flex-1">
                          <p className="text-[18px] font-semibold">
                            {new Date(history.changed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-[14px] opacity-60">Previous comment</p>
                        </div>
                      </div>

                      {/* Comment text */}
                      {history.comment ? (
                        <p className="text-[16px] leading-relaxed">{history.comment}</p>
                      ) : (
                        <p className="text-[16px] opacity-50 italic">No comment</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
  );
}

