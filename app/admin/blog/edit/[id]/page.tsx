"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import type { Song, BlogPost, Album } from "@/types/database";

export const dynamic = "force-dynamic";

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
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
  const [searchMessage, setSearchMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [albumSearch, setAlbumSearch] = useState("");
  const [selectedAlbums, setSelectedAlbums] = useState<Album[]>([]);
  const [searchingAlbum, setSearchingAlbum] = useState(false);
  const [albumSearchMessage, setAlbumSearchMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

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
      fetchPost();
    }
  }, [checkingAuth, id]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/blog/${id}`);
      const data = await res.json();

      if (data.data) {
        const post: BlogPost = data.data;
        setFormData({
          title: post.title,
          slug: post.slug,
          content: post.content,
          preview: post.preview || "",
          published: post.published,
        });

        // Fetch associated songs
        if (post.song_ids && post.song_ids.length > 0) {
          const { data: songsData } = await supabase
            .from("songs")
            .select("*")
            .in("id", post.song_ids);

          if (songsData) {
            // Sort songs in the order they appear in song_ids
            const sortedSongs = post.song_ids
              .map((songId: string) =>
                songsData.find((song) => song.id === songId)
              )
              .filter(Boolean) as Song[];
            setSelectedSongs(sortedSongs);
          }
        }

        // Fetch associated albums
        if (post.album_ids && post.album_ids.length > 0) {
          const { data: albumsData } = await supabase
            .from("albums")
            .select("*")
            .in("id", post.album_ids);

          if (albumsData) {
            // Sort albums in the order they appear in album_ids
            const sortedAlbums = post.album_ids
              .map((albumId: string) =>
                albumsData.find((album) => album.id === albumId)
              )
              .filter(Boolean) as Album[];
            setSelectedAlbums(sortedAlbums);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    }
    setLoading(false);
  };

  // Detect if input is a Spotify track URL
  const isSpotifyTrackUrl = (input: string): boolean => {
    return input.includes("open.spotify.com/track/") || input.includes("spotify.com/track/");
  };

  // Detect if input is a Spotify album URL
  const isSpotifyAlbumUrl = (input: string): boolean => {
    return input.includes("open.spotify.com/album/") || input.includes("spotify.com/album/");
  };

  // Search songs (handles both text search and Spotify URLs)
  const handleSongSearch = async () => {
    if (!songSearch.trim()) return;

    setSearching(true);
    setSearchMessage(null);
    setSongResults([]);

    try {
      if (isSpotifyTrackUrl(songSearch)) {
        const response = await fetch("/api/spotify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: songSearch }),
        });

        const spotifyData = await response.json();

        if (!response.ok) {
          setSearchMessage({ type: "error", text: spotifyData.error || "Failed to fetch from Spotify" });
          setSearching(false);
          return;
        }

        const { data: existingSongs, error: dbError } = await supabase
          .from("songs")
          .select("*")
          .eq("spotify_track_id", spotifyData.spotify_track_id)
          .limit(1);

        if (dbError) {
          setSearchMessage({ type: "error", text: "Error checking database" });
          setSearching(false);
          return;
        }

        if (existingSongs && existingSongs.length > 0) {
          const song = existingSongs[0];
          if (selectedSongs.find((s) => s.id === song.id)) {
            setSearchMessage({ type: "info", text: `"${song.title}" is already selected` });
          } else {
            setSelectedSongs((prev) => [...prev, song]);
            setSongSearch("");
            setSearchMessage({ type: "success", text: `Added "${song.title}" by ${song.artist}` });
          }
        } else {
          setSearchMessage({
            type: "error",
            text: `"${spotifyData.title}" by ${spotifyData.artist} is not in your database. Add it via the Music admin page first.`,
          });
        }
      } else {
        const { data, error } = await supabase
          .from("songs")
          .select("*")
          .or(`title.ilike.%${songSearch}%,artist.ilike.%${songSearch}%,album_name.ilike.%${songSearch}%`)
          .limit(10);

        if (!error && data) {
          const filtered = data.filter((song) => !selectedSongs.find((s) => s.id === song.id));
          setSongResults(filtered);
          if (filtered.length === 0 && data.length === 0) {
            setSearchMessage({ type: "info", text: "No songs found. Try a different search or paste a Spotify URL." });
          }
        }
      }
    } catch (error) {
      console.error("Error searching songs:", error);
      setSearchMessage({ type: "error", text: "An error occurred while searching" });
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

  const moveSongUp = (index: number) => {
    if (index === 0) return;
    setSelectedSongs((prev) => {
      const newSongs = [...prev];
      [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
      return newSongs;
    });
  };

  const moveSongDown = (index: number) => {
    if (index === selectedSongs.length - 1) return;
    setSelectedSongs((prev) => {
      const newSongs = [...prev];
      [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
      return newSongs;
    });
  };

  // Handle album search with Spotify URL
  const handleAlbumSearch = async () => {
    if (!albumSearch.trim()) return;

    if (!isSpotifyAlbumUrl(albumSearch)) {
      setAlbumSearchMessage({ type: "error", text: "Please paste a Spotify album URL" });
      return;
    }

    setSearchingAlbum(true);
    setAlbumSearchMessage(null);

    try {
      const response = await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: albumSearch }),
      });

      const spotifyData = await response.json();

      if (!response.ok) {
        setAlbumSearchMessage({ type: "error", text: spotifyData.error || "Failed to fetch from Spotify" });
        setSearchingAlbum(false);
        return;
      }

      // Check if album exists in database
      const { data: existingAlbums, error: dbError } = await supabase
        .from("albums")
        .select("*")
        .eq("spotify_album_id", spotifyData.spotify_album_id)
        .limit(1);

      if (dbError) {
        setAlbumSearchMessage({ type: "error", text: "Error checking database" });
        setSearchingAlbum(false);
        return;
      }

      if (existingAlbums && existingAlbums.length > 0) {
        const album = existingAlbums[0];
        if (selectedAlbums.find((a) => a.id === album.id)) {
          setAlbumSearchMessage({ type: "info", text: `"${album.name}" is already selected` });
        } else {
          setSelectedAlbums((prev) => [...prev, album]);
          setAlbumSearch("");
          setAlbumSearchMessage({ type: "success", text: `Added "${album.name}" by ${album.artist}` });
        }
      } else {
        // Album doesn't exist, create it
        const { data: newAlbum, error: insertError } = await supabase
          .from("albums")
          .insert({
            name: spotifyData.name,
            artist: spotifyData.artist,
            cover_url: spotifyData.cover_url,
            spotify_album_id: spotifyData.spotify_album_id,
            release_date: spotifyData.release_date,
          })
          .select()
          .single();

        if (insertError) {
          setAlbumSearchMessage({ type: "error", text: "Failed to save album to database" });
          setSearchingAlbum(false);
          return;
        }

        setSelectedAlbums((prev) => [...prev, newAlbum]);
        setAlbumSearch("");
        setAlbumSearchMessage({ type: "success", text: `Added "${newAlbum.name}" by ${newAlbum.artist}` });
      }
    } catch (error) {
      console.error("Error searching albums:", error);
      setAlbumSearchMessage({ type: "error", text: "An error occurred while searching" });
    }
    setSearchingAlbum(false);
  };

  const removeAlbum = (albumId: string) => {
    setSelectedAlbums((prev) => prev.filter((a) => a.id !== albumId));
  };

  const moveAlbumUp = (index: number) => {
    if (index === 0) return;
    setSelectedAlbums((prev) => {
      const newAlbums = [...prev];
      [newAlbums[index - 1], newAlbums[index]] = [newAlbums[index], newAlbums[index - 1]];
      return newAlbums;
    });
  };

  const moveAlbumDown = (index: number) => {
    if (index === selectedAlbums.length - 1) return;
    setSelectedAlbums((prev) => {
      const newAlbums = [...prev];
      [newAlbums[index], newAlbums[index + 1]] = [newAlbums[index + 1], newAlbums[index]];
      return newAlbums;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          song_ids: selectedSongs.map((s) => s.id),
          album_ids: selectedAlbums.map((a) => a.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update post");
      }

      setMessage({ type: "success", text: "Post updated successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update post",
      });
    }
    setSubmitting(false);
  };

  if (checkingAuth || loading) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">
              {checkingAuth ? "Checking authentication..." : "Loading..."}
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
            Edit Blog Post
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
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
                        <span className="text-[14px] opacity-50 w-6 text-center">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveSongUp(index)}
                            disabled={index === 0}
                            className="px-2 py-0.5 border border-black hover:border-(--color-brand-red) text-[12px] font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSongDown(index)}
                            disabled={index === selectedSongs.length - 1}
                            className="px-2 py-0.5 border border-black hover:border-(--color-brand-red) text-[12px] font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↓
                          </button>
                        </div>
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
                  placeholder="Search by title/artist or paste Spotify URL"
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

              {/* Search Message */}
              {searchMessage && (
                <div className={`mt-2 p-3 border-2 ${
                  searchMessage.type === "success" ? "border-green-500 bg-green-50 text-green-700" :
                  searchMessage.type === "error" ? "border-red-500 bg-red-50 text-red-700" :
                  "border-blue-500 bg-blue-50 text-blue-700"
                }`}>
                  {searchMessage.text}
                </div>
              )}

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

            {/* Album Selection */}
            <div>
              <label className="block text-[18px] font-semibold mb-2">
                Featured Albums
              </label>

              {/* Selected Albums */}
              {selectedAlbums.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {selectedAlbums.map((album, index) => (
                    <div key={album.id} className="relative">
                      {album.cover_url && (
                        <img
                          src={album.cover_url}
                          alt={album.name}
                          className="w-full aspect-square object-cover border-2 border-black"
                        />
                      )}
                      <div className="mt-2">
                        <p className="font-semibold text-[14px] truncate">{album.name}</p>
                        <p className="text-[12px] opacity-70 truncate">{album.artist}</p>
                      </div>
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveAlbumUp(index)}
                          disabled={index === 0}
                          className="w-6 h-6 bg-white border-2 border-black hover:border-(--color-brand-red) text-[12px] font-bold cursor-pointer flex items-center justify-center disabled:opacity-30"
                        >
                          &larr;
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAlbumDown(index)}
                          disabled={index === selectedAlbums.length - 1}
                          className="w-6 h-6 bg-white border-2 border-black hover:border-(--color-brand-red) text-[12px] font-bold cursor-pointer flex items-center justify-center disabled:opacity-30"
                        >
                          &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAlbum(album.id)}
                          className="w-6 h-6 bg-white border-2 border-black hover:border-red-500 hover:text-red-500 text-[14px] font-bold cursor-pointer flex items-center justify-center"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Album Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={albumSearch}
                  onChange={(e) => setAlbumSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAlbumSearch();
                    }
                  }}
                  className="flex-1 px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                  placeholder="Paste Spotify album URL"
                />
                <button
                  type="button"
                  onClick={handleAlbumSearch}
                  disabled={searchingAlbum}
                  className="px-6 py-3 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer disabled:opacity-50"
                >
                  {searchingAlbum ? "..." : "Add"}
                </button>
              </div>

              {/* Album Search Message */}
              {albumSearchMessage && (
                <div className={`mt-2 p-3 border-2 ${
                  albumSearchMessage.type === "success" ? "border-green-500 bg-green-50 text-green-700" :
                  albumSearchMessage.type === "error" ? "border-red-500 bg-red-50 text-red-700" :
                  "border-blue-500 bg-blue-50 text-blue-700"
                }`}>
                  {albumSearchMessage.text}
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
                Published
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 border-2 border-black bg-(--color-brand-red) text-white font-bold text-[18px] hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
