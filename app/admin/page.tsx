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
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    rating: "",
    comment: "",
    cover_url: "",
    spotify_track_id: "",
    youtube_video_id: "",
    album_name: "",
    release_date: "",
    duration_ms: null as number | null,
    explicit: false,
    popularity: null as number | null,
    isrc: "",
    track_number: null as number | null,
    disc_number: null as number | null,
    album_type: "",
    preview_url: "",
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

  // Detect URL type
  const getUrlType = (url: string): "spotify" | "youtube" | null => {
    if (url.includes("spotify.com") || url.includes("open.spotify")) {
      return "spotify";
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    return null;
  };

  const handleFetchFromUrl = async () => {
    if (!mediaUrl.trim()) {
      setMessage({ type: "error", text: "Please enter a Spotify or YouTube URL" });
      return;
    }

    const urlType = getUrlType(mediaUrl);
    if (!urlType) {
      setMessage({ type: "error", text: "Please enter a valid Spotify or YouTube URL" });
      return;
    }

    setFetchingUrl(true);
    setMessage(null);

    try {
      const apiEndpoint = urlType === "spotify" ? "/api/spotify" : "/api/youtube";
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mediaUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch from ${urlType}`);
      }

      if (urlType === "spotify") {
        // Auto-fill the form with Spotify data
        setFormData({
          ...formData,
          title: data.title || "",
          artist: data.artist || "",
          cover_url: data.cover_url || "",
          spotify_track_id: data.spotify_track_id || "",
          youtube_video_id: "",
          album_name: data.album_name || "",
          release_date: data.release_date || "",
          duration_ms: data.duration_ms || null,
          explicit: data.explicit || false,
          popularity: data.popularity || null,
          isrc: data.isrc || "",
          track_number: data.track_number || null,
          disc_number: data.disc_number || null,
          album_type: data.album_type || "",
          preview_url: data.preview_url || "",
        });

        // Save artist data to database
        if (data.artists && Array.isArray(data.artists)) {
          for (const artist of data.artists) {
            try {
              await supabase.from("artists").upsert({
                name: artist.name,
                image_url: artist.image_url,
                spotify_id: artist.spotify_id,
              }, {
                onConflict: 'name'
              });
            } catch (artistError) {
              console.error(`Failed to save artist ${artist.name}:`, artistError);
            }
          }
        }

        setMessage({ type: "success", text: "Song info fetched from Spotify!" });
      } else {
        // Auto-fill the form with YouTube data
        setFormData({
          ...formData,
          title: data.title || "",
          artist: data.artist || "",
          cover_url: data.cover_url || "",
          spotify_track_id: "",
          youtube_video_id: data.youtube_video_id || "",
          album_name: "",
          release_date: data.release_date || "",
          duration_ms: data.duration_ms || null,
          explicit: false,
          popularity: null,
          isrc: "",
          track_number: null,
          disc_number: null,
          album_type: "",
          preview_url: "",
        });

        setMessage({ type: "success", text: "Video info fetched from YouTube! Please verify the title and artist." });
      }

      setMediaUrl(""); // Clear the URL field after successful fetch
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setFetchingUrl(false);
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
        youtube_video_id: formData.youtube_video_id || null,
        album_name: formData.album_name || null,
        release_date: formData.release_date || null,
        duration_ms: formData.duration_ms,
        explicit: formData.explicit,
        popularity: formData.popularity,
        isrc: formData.isrc || null,
        track_number: formData.track_number,
        disc_number: formData.disc_number,
        album_type: formData.album_type || null,
        preview_url: formData.preview_url || null,
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
        youtube_video_id: "",
        album_name: "",
        release_date: "",
        duration_ms: null,
        explicit: false,
        popularity: null,
        isrc: "",
        track_number: null,
        disc_number: null,
        album_type: "",
        preview_url: "",
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
              {/* Spotify/YouTube URL Auto-fill */}
              <div className="p-6 border-2 border-black bg-white mb-6">
                <label className="block text-[20px] font-semibold mb-3">
                  Paste Spotify or YouTube URL to auto-fill
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/... or https://youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={fetchingUrl}
                    className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[18px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {fetchingUrl ? "Fetching..." : "Fetch Info"}
                  </button>
                </div>
                <p className="mt-2 text-[14px] opacity-60">
                  Supports Spotify track URLs and YouTube video URLs
                </p>
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

              <div>
                <label className="block text-[20px] font-semibold mb-2">
                  Album Name
                </label>
                <input
                  type="text"
                  value={formData.album_name}
                  onChange={(e) =>
                    setFormData({ ...formData, album_name: e.target.value })
                  }
                  placeholder="Auto-filled from Spotify or enter manually"
                  className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                />
              </div>

              <div>
                <label className="block text-[20px] font-semibold mb-2">
                  Release Date
                </label>
                <input
                  type="text"
                  value={formData.release_date}
                  onChange={(e) =>
                    setFormData({ ...formData, release_date: e.target.value })
                  }
                  placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                  className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                />
                <p className="mt-1 text-[14px] opacity-60">
                  Accepts: 2020, 2020-03, or 2020-03-15
                </p>
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

