"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to avoid build-time errors with environment variables
export const dynamic = 'force-dynamic';
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import type { Song, Award } from "@/types/database";

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    rating: "",
    comment: "",
    cover_url: "",
  });

  useEffect(() => {
    // Check authentication
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

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

        // Pre-fill form
        setFormData({
          title: songData.title || "",
          artist: songData.artist || "",
          rating: songData.rating?.toString() || "",
          comment: songData.comment || "",
          cover_url: songData.cover_url || "",
        });

        // Fetch awards
        const { data: awardsData, error: awardsError } = await supabase
          .from("awards")
          .select("*")
          .eq("song_id", id);

        if (awardsError) throw awardsError;
        setAwards(awardsData || []);
      } catch (error) {
        console.error("Error fetching song:", error);
        setMessage({ type: "error", text: "Failed to load song" });
      } finally {
        setLoading(false);
      }
    }

    fetchSong();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("songs")
        .update({
          title: formData.title,
          artist: formData.artist,
          rating: parseInt(formData.rating),
          comment: formData.comment || null,
          cover_url: formData.cover_url || null,
        })
        .eq("id", id);

      if (error) throw error;

      setMessage({ type: "success", text: "Song updated successfully!" });

      // Redirect to song detail page after 1 second
      setTimeout(() => {
        router.push(`/musics/${id}`);
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update song";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-[48px] font-bold mb-2">Edit Song</h1>
              <button
                onClick={() => router.push(`/musics/${id}`)}
                className="text-[18px] font-semibold hover:underline cursor-pointer"
              >
                ← Back to Song
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer"
            >
              Logout
            </button>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 border-2 ${
                message.type === "success"
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
              }`}
            >
              <p className={`font-semibold ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
            </div>

            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Artist *
              </label>
              <input
                type="text"
                required
                value={formData.artist}
                onChange={(e) =>
                  setFormData({ ...formData, artist: e.target.value })
                }
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
            </div>

            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Rating (0-100) *
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({ ...formData, rating: e.target.value })
                }
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
            </div>

            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Comment
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
            </div>

            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Cover URL
              </label>
              <input
                type="url"
                value={formData.cover_url}
                onChange={(e) =>
                  setFormData({ ...formData, cover_url: e.target.value })
                }
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
            </div>

            {/* Awards section - placeholder for future */}
            {awards.length > 0 && (
              <div>
                <label className="block text-[20px] font-semibold mb-2">
                  Awards ({awards.length})
                </label>
                <div className="space-y-2">
                  {awards.map((award) => (
                    <div key={award.id} className="p-4 border-2 border-black bg-white">
                      <p className="font-semibold">{award.name}</p>
                      <p>{award.detail}</p>
                      <p className="text-[24px] font-black">{award.position}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[14px] opacity-70">
                  Award editing coming soon
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[20px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

