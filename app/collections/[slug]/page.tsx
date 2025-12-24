"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import SongBar from "@/app/components/SongBar";
import { supabase } from "@/lib/supabase";
import type { BlogPost, Song } from "@/types/database";

export const dynamic = "force-dynamic";

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      // Fetch the blog post
      const { data: postData, error: postError } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (postError || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(postData);

      // Fetch associated songs if there are song_ids
      if (postData.song_ids && postData.song_ids.length > 0) {
        const { data: songsData, error: songsError } = await supabase
          .from("songs")
          .select("*")
          .in("id", postData.song_ids);

        if (!songsError && songsData) {
          // Sort songs in the order they appear in song_ids
          const sortedSongs = postData.song_ids
            .map((id: string) => songsData.find((song) => song.id === id))
            .filter(Boolean) as Song[];
          setSongs(sortedSongs);
        }
      }

      setLoading(false);
    }

    fetchPost();
  }, [slug]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  if (notFound || !post) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto text-center py-16">
            <h1 className="text-[48px] font-bold mb-4">Post Not Found</h1>
            <p className="text-[18px] opacity-70 mb-8">
              The blog post you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/collections"
              className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold"
            >
              Back to Posts
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto mb-8">
          {/* Back link */}
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-[16px] font-semibold hover:underline mb-6"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to all posts
          </Link>

          {/* Header */}
          <h1 className="text-[36px] md:text-[48px] lg:text-[56px] font-black mb-2">
            {post.title}
          </h1>
          <p className="text-[16px] md:text-[18px] opacity-50 mb-8">
            {formatDate(post.created_at)}
          </p>

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-12">
            {post.content.split("\n").map((paragraph, index) => (
              <p
                key={index}
                className="text-[16px] md:text-[18px] leading-relaxed mb-4"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Featured Songs */}
          {songs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-[24px] md:text-[32px] font-bold mb-4">
                Featured Songs
              </h2>
              <div className="flex flex-col gap-3">
                {songs.map((song, index) => (
                  <SongBar key={song.id} song={song} rank={index + 1} showRank />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
