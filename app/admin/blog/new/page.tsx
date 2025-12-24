"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import type { Song } from "@/types/database";

export const dynamic = "force-dynamic";

export default function NewBlogPostPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    preview: "",
    published: false,
  });

  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);

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

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  // Search songs
  const handleSongSearch = async () => {
    if (!songSearch.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .or(
          `title.ilike.%${songSearch}%,artist.ilike.%${songSearch}%,album_name.ilike.%${songSearch}%`
        )
        .limit(10);

      if (!error && data) {
        // Filter out already selected songs
        const filtered = data.filter(
          (song) => !selectedSongs.find((s) => s.id === song.id)
        );
        setSongResults(filtered);
      }
    } catch (error) {
      console.error("Error searching songs:", error);
    }
    setSearching(false);
  };

  const addSong = (song: Song) => {
    setSelectedSongs((prev) => [...prev, song]);
    setSongResults((prev) => prev.filter((s) => s.id !== song.id));
  };

  const removeSong = (songId: string) => {
    setSelectedSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          song_ids: selectedSongs.map((s) => s.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      setMessage({ type: "success", text: "Post created successfully!" });
      setTimeout(() => {
        router.push("/admin/blog");
      }, 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create post",
      });
    }
    setSubmitting(false);
  };

  if (checkingAuth) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">
              Checking authentication...
            </p>
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
          <Link
            href="/admin/blog"
            className="inline-block text-[16px] font-semibold hover:underline mb-6"
          >
            &larr; Back to Blog Posts
          </Link>

          <h1 className="text-[36px] md:text-[48px] font-black mb-6">
            New Blog Post
          </h1>

          {message && (
            <div
              className={`p-4 mb-6 border-2 ${
                message.type === "success"
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                required
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                placeholder="Post title"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Slug (URL path)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                required
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                placeholder="post-url-slug"
              />
              <p className="text-[14px] opacity-50 mt-1">
                URL: /collections/{formData.slug || "..."}
              </p>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Preview (optional)
              </label>
              <input
                type="text"
                value={formData.preview}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, preview: e.target.value }))
                }
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                placeholder="Short preview text for list view"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                required
                rows={12}
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red) resize-y"
                placeholder="Write your blog post content here..."
              />
            </div>

            {/* Song Selection */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Featured Songs
              </label>

              {/* Selected Songs */}
              {selectedSongs.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 border-2 border-black bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] opacity-50">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{song.title}</p>
                          <p className="text-[14px] opacity-70">{song.artist}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSong(song.id)}
                        className="px-3 py-1 border-2 border-black hover:border-red-500 hover:text-red-500 text-[14px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSongSearch();
                    }
                  }}
                  className="flex-1 px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                  placeholder="Search songs by title, artist, or album"
                />
                <button
                  type="button"
                  onClick={handleSongSearch}
                  disabled={searching}
                  className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer disabled:opacity-50"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>

              {/* Search Results */}
              {songResults.length > 0 && (
                <div className="mt-2 border-2 border-black bg-white">
                  {songResults.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => addSong(song)}
                      className="w-full flex items-center justify-between p-3 hover:bg-neutral-100 border-b border-black last:border-b-0 cursor-pointer text-left"
                    >
                      <div>
                        <p className="font-semibold">{song.title}</p>
                        <p className="text-[14px] opacity-70">{song.artist}</p>
                      </div>
                      <span className="text-[14px] font-semibold">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Published */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    published: e.target.checked,
                  }))
                }
                className="w-5 h-5 cursor-pointer"
              />
              <label
                htmlFor="published"
                className="text-[18px] font-semibold cursor-pointer"
              >
                Publish immediately
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 border-2 border-black bg-(--color-brand-red) text-white font-bold text-[18px] hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Post"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
