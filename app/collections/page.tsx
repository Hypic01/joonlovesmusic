"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import type { BlogPost } from "@/types/database";

export const dynamic = "force-dynamic";

export default function WhenToListenWhatPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    }

    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto mb-8">
          <h1 className="text-[48px] md:text-[72px] font-black mb-4">
            when to listen what
          </h1>
          <p className="text-[18px] md:text-[24px] opacity-70 mb-8">
            my thoughts on music and when to listen to them
          </p>

          {loading ? (
            <p className="text-[24px] font-semibold">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[24px] font-semibold opacity-70">
                No posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/collections/${post.slug}`}
                  className="block p-4 md:p-6 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
                >
                  <h2 className="text-[24px] md:text-[32px] font-bold mb-2">
                    {post.title}
                  </h2>
                  <p className="text-[14px] md:text-[16px] opacity-50 mb-3">
                    {formatDate(post.created_at)}
                  </p>
                  {post.preview && (
                    <p className="text-[16px] md:text-[18px] opacity-70 line-clamp-2">
                      {post.preview}
                    </p>
                  )}
                  {post.song_ids && post.song_ids.length > 0 && (
                    <p className="text-[14px] mt-3 opacity-50">
                      {post.song_ids.length} song
                      {post.song_ids.length > 1 ? "s" : ""} featured
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
