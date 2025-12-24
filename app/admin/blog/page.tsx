"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import type { BlogPost } from "@/types/database";

export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/admin/login");
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchPosts();
    }
  }, [checkingAuth]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/blog?all=true");
      const data = await res.json();
      if (data.data) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
    setDeleting(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (checkingAuth) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">Checking authentication...</p>
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[36px] md:text-[48px] font-black">Blog Posts</h1>
            <Link
              href="/admin/blog/new"
              className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold"
            >
              New Post
            </Link>
          </div>

          <Link
            href="/admin"
            className="inline-block text-[16px] font-semibold hover:underline mb-6"
          >
            &larr; Back to Admin
          </Link>

          {loading ? (
            <p className="text-[24px] font-semibold">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[24px] font-semibold opacity-70 mb-4">
                No blog posts yet
              </p>
              <Link
                href="/admin/blog/new"
                className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold"
              >
                Create Your First Post
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 border-2 border-black bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-[20px] font-bold truncate">
                        {post.title}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-[12px] font-semibold ${
                          post.published
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-[14px] opacity-50">
                      {formatDate(post.created_at)} &middot; /{post.slug}
                      {post.song_ids && post.song_ids.length > 0 && (
                        <span>
                          {" "}
                          &middot; {post.song_ids.length} song
                          {post.song_ids.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/collections/${post.slug}`}
                      className="px-4 py-2 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[14px]"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/blog/edit/${post.id}`}
                      className="px-4 py-2 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[14px]"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="px-4 py-2 border-2 border-black bg-white hover:border-red-500 hover:text-red-500 font-semibold text-[14px] cursor-pointer disabled:opacity-50"
                    >
                      {deleting === post.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
