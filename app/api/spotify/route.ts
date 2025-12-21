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

    // Validate Spotify URL format
    if (!url.includes("open.spotify.com/track/")) {
      return NextResponse.json(
        { error: "Invalid Spotify URL. Please use a track URL (open.spotify.com/track/...)." },
        { status: 400 }
      );
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

    return NextResponse.json({
      title,
      artist,
      cover_url,
      spotify_track_id: trackId, // Include track ID for embedding
    });
  } catch (error) {
    console.error("Error fetching Spotify data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Spotify data. Please check the URL and try again." },
      { status: 500 }
    );
  }
}

