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
  const [fetchingSpotify, setFetchingSpotify] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    rating: "",
    comment: "",
    cover_url: "",
    spotify_track_id: "",
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
          spotify_track_id: songData.spotify_track_id || "",
          album_name: songData.album_name || "",
          release_date: songData.release_date || "",
          duration_ms: songData.duration_ms || null,
          explicit: songData.explicit || false,
          popularity: songData.popularity || null,
          isrc: songData.isrc || "",
          track_number: songData.track_number || null,
          disc_number: songData.disc_number || null,
          album_type: songData.album_type || "",
          preview_url: songData.preview_url || "",
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

      // Auto-fill the form with Spotify data
      setFormData({
        ...formData,
        title: data.title || formData.title,
        artist: data.artist || formData.artist,
        cover_url: data.cover_url || formData.cover_url,
        spotify_track_id: data.spotify_track_id || formData.spotify_track_id,
        album_name: data.album_name || formData.album_name,
        release_date: data.release_date || formData.release_date,
        duration_ms: data.duration_ms || formData.duration_ms,
        explicit: data.explicit || formData.explicit,
        popularity: data.popularity || formData.popularity,
        isrc: data.isrc || formData.isrc,
        track_number: data.track_number || formData.track_number,
        disc_number: data.disc_number || formData.disc_number,
        album_type: data.album_type || formData.album_type,
        preview_url: data.preview_url || formData.preview_url,
      });

      // Save artist data to database
      if (data.artists && Array.isArray(data.artists)) {
        for (const artist of data.artists) {
          try {
            // Upsert artist (insert or update if exists)
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

      setMessage({ type: "success", text: "Fetched Spotify data! Review and save." });
      setSpotifyUrl(""); // Clear URL field
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch from Spotify";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setFetchingSpotify(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updateData = {
        title: formData.title,
        artist: formData.artist,
        rating: parseInt(formData.rating),
        comment: formData.comment || null,
        cover_url: formData.cover_url || null,
        spotify_track_id: formData.spotify_track_id || null,
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
      };

      console.log("Updating song with data:", updateData); // Debug log

      const { error, data } = await supabase
        .from("songs")
        .update(updateData)
        .eq("id", id)
        .select(); // Add select to return updated data

      console.log("Update result:", { error, data }); // Debug log

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

          {/* Spotify Fetch Section */}
          <div className="mb-8 p-6 border-2 border-black bg-neutral-50">
            <h2 className="text-[24px] font-bold mb-4">Update from Spotify</h2>
            <p className="text-[16px] mb-4 opacity-70">
              Paste a Spotify URL to update album name, release date, and other metadata
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/..."
                className="flex-1 px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
              <button
                type="button"
                onClick={handleFetchFromSpotify}
                disabled={fetchingSpotify}
                className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[18px] disabled:opacity-50 cursor-pointer"
              >
                {fetchingSpotify ? "Fetching..." : "Fetch from Spotify"}
              </button>
            </div>
          </div>

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
                type="date"
                value={formData.release_date}
                onChange={(e) =>
                  setFormData({ ...formData, release_date: e.target.value })
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

