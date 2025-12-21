"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to avoid build-time errors with environment variables
export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingSpotify, setFetchingSpotify] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    rating: "",
    comment: "",
    cover_url: "",
    spotify_track_id: "",
  });

  useEffect(() => {
    // Check authentication
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

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleFetchFromSpotify = async () => {
    if (!spotifyUrl.trim()) {
      setMessage({ type: "error", text: "Please enter a Spotify URL" });
      return;
    }

    setFetchingSpotify(true);
    setMessage(null);

    try {
      const response = await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: spotifyUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch from Spotify");
      }

      // Auto-fill the form
      setFormData({
        ...formData,
        title: data.title || "",
        artist: data.artist || "",
        cover_url: data.cover_url || "",
        spotify_track_id: data.spotify_track_id || "",
      });

      setMessage({ type: "success", text: "Song info fetched from Spotify!" });
      setSpotifyUrl(""); // Clear the URL field after successful fetch
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch from Spotify";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setFetchingSpotify(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Check for duplicate (same title AND artist)
      const { data: existingSongs, error: checkError } = await supabase
        .from("songs")
        .select("id, title, artist")
        .eq("title", formData.title)
        .eq("artist", formData.artist);

      if (checkError) throw checkError;

      if (existingSongs && existingSongs.length > 0) {
        setMessage({
          type: "error",
          text: `This song already exists: "${formData.title}" by ${formData.artist}. Please check the music list.`,
        });
        setLoading(false);
        return;
      }

      // If no duplicate, proceed with insert
      const { error } = await supabase.from("songs").insert({
        title: formData.title,
        artist: formData.artist,
        rating: parseInt(formData.rating),
        comment: formData.comment || null,
        cover_url: formData.cover_url || null,
        spotify_track_id: formData.spotify_track_id || null,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Song added successfully!" });
      setFormData({
        title: "",
        artist: "",
        rating: "",
        comment: "",
        cover_url: "",
        spotify_track_id: "",
      });

      // Refresh after 1 second
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add song";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
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

          <div className="max-w-[964px] mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-[48px] font-bold mb-2">Admin - Add Song</h1>
                <button
                  onClick={() => router.push("/musics")}
                  className="text-[18px] font-semibold hover:underline cursor-pointer"
                >
                  ← Back to Music List
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
              {/* Spotify URL Auto-fill */}
              <div className="p-6 border-2 border-black bg-white mb-6">
                <label className="block text-[20px] font-semibold mb-3">
                  Or paste Spotify URL to auto-fill
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/..."
                    className="flex-1 px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromSpotify}
                    disabled={fetchingSpotify}
                    className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[18px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {fetchingSpotify ? "Fetching..." : "Fetch from Spotify"}
                  </button>
                </div>
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[20px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? "Adding..." : "Add Song"}
              </button>
            </form>
          </div>
        </div>
      </main>
  );
}

