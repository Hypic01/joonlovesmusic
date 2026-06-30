import { NextRequest, NextResponse } from "next/server";

// Get Spotify access token using Client Credentials flow
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify Client ID and Secret must be set in environment variables");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get Spotify access token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "Spotify URL is required" },
        { status: 400 }
      );
    }

    const isAlbumUrl = url.includes("open.spotify.com/album/") || url.includes("spotify.com/album/");
    const isTrackUrl = url.includes("open.spotify.com/track/") || url.includes("spotify.com/track/");

    // Validate Spotify URL format
    if (!isTrackUrl && !isAlbumUrl) {
      return NextResponse.json(
        { error: "Invalid Spotify URL. Please use a track or album URL." },
        { status: 400 }
      );
    }

    // Handle album URLs
    if (isAlbumUrl) {
      const albumIdMatch = url.match(/album\/([a-zA-Z0-9]+)/);
      if (!albumIdMatch) {
        return NextResponse.json(
          { error: "Could not extract album ID from URL" },
          { status: 400 }
        );
      }
      const albumId = albumIdMatch[1];

      const accessToken = await getSpotifyAccessToken();

      const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!albumResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch album from Spotify" },
          { status: 500 }
        );
      }

      const albumData = await albumResponse.json();

      return NextResponse.json({
        type: "album",
        name: albumData.name || "",
        artist: albumData.artists?.map((a: { name: string }) => a.name).join(", ") || "",
        cover_url: albumData.images?.[0]?.url || albumData.images?.[1]?.url || "",
        spotify_album_id: albumId,
        release_date: albumData.release_date || null,
        total_tracks: albumData.total_tracks || null,
        album_type: albumData.album_type || null,
      });
    }

    // Extract track ID from URL
    const trackIdMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackIdMatch) {
      return NextResponse.json(
        { error: "Could not extract track ID from URL" },
        { status: 400 }
      );
    }
    const trackId = trackIdMatch[1];

    // Get access token
    const accessToken = await getSpotifyAccessToken();

    // Fetch track details from Spotify Web API
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!trackResponse.ok) {
      // Fallback to oEmbed if Web API fails
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedResponse = await fetch(oembedUrl);
      
      if (!oembedResponse.ok) {
        throw new Error("Failed to fetch from Spotify");
      }

      const oembedData = await oembedResponse.json();
      const titleMatch = oembedData.title?.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      
      return NextResponse.json({
        title: titleMatch ? titleMatch[1].trim() : oembedData.title || "",
        artist: titleMatch ? titleMatch[2].trim() : "",
        cover_url: oembedData.thumbnail_url || "",
      });
    }

    const trackData = await trackResponse.json();

    // Extract data from Spotify Web API response
    const title = trackData.name || "";
    const artist = trackData.artists?.map((a: { name: string }) => a.name).join(", ") || "";
    const cover_url = trackData.album?.images?.[0]?.url || trackData.album?.images?.[1]?.url || "";
    const album_name = trackData.album?.name || "";

    // Release date - Spotify returns different precision levels:
    // "2020" (year), "2020-03" (month), "2020-03-15" (day)
    // We accept all formats
    const release_date = trackData.album?.release_date || null;
    const duration_ms = trackData.duration_ms || null;
    const explicit = trackData.explicit || false;
    const popularity = trackData.popularity || null;
    const isrc = trackData.external_ids?.isrc || null;
    const track_number = trackData.track_number || null;
    const disc_number = trackData.disc_number || 1;
    const album_type = trackData.album?.album_type || null;
    const preview_url = trackData.preview_url || null;

    // Fetch artist images
    const artistsData = await Promise.all(
      (trackData.artists || []).map(async (artist: { id: string; name: string }) => {
        try {
          const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            return {
              name: artist.name,
              spotify_id: artist.id,
              image_url: artistData.images?.[0]?.url || artistData.images?.[1]?.url || null,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch artist ${artist.name}:`, error);
        }
        return {
          name: artist.name,
          spotify_id: artist.id,
          image_url: null,
        };
      })
    );

    return NextResponse.json({
      type: "track",
      title,
      artist,
      cover_url,
      spotify_track_id: trackId,
      album_name,
      release_date,
      duration_ms,
      explicit,
      popularity,
      isrc,
      track_number,
      disc_number,
      album_type,
      preview_url,
      artists: artistsData, // Array of artist objects with images
    });
  } catch (error) {
    console.error("Error fetching Spotify data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Spotify data. Please check the URL and try again." },
      { status: 500 }
    );
  }
}

