import { NextRequest, NextResponse } from "next/server";

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Format duration from ISO 8601 to milliseconds
function parseDuration(duration: string): number | null {
  if (!duration) return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Please use a valid YouTube video URL." },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Fetch video details from YouTube Data API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from YouTube API");
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Get the best quality thumbnail
    const thumbnails = snippet.thumbnails;
    const cover_url =
      thumbnails.maxres?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null;

    // Parse the title to try to extract artist - title format
    // Common formats: "Artist - Title", "Artist: Title", "Artist | Title"
    let title = snippet.title || "";
    let artist = snippet.channelTitle || "";

    // Try to parse "Artist - Title" format
    const titleMatch = title.match(/^(.+?)\s*[-–—:|]\s*(.+)$/);
    if (titleMatch) {
      artist = titleMatch[1].trim();
      title = titleMatch[2].trim();
    }

    // Clean up common suffixes from title
    title = title
      .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, "")
      .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, "")
      .replace(/\s*\(Official\s*Audio\)/gi, "")
      .replace(/\s*\[Official\s*Audio\]/gi, "")
      .replace(/\s*\(Lyrics?\)/gi, "")
      .replace(/\s*\[Lyrics?\]/gi, "")
      .replace(/\s*\(Lyric\s*Video\)/gi, "")
      .replace(/\s*\[Lyric\s*Video\]/gi, "")
      .replace(/\s*\(Visualizer\)/gi, "")
      .replace(/\s*\[Visualizer\]/gi, "")
      .replace(/\s*\(Audio\)/gi, "")
      .replace(/\s*\[Audio\]/gi, "")
      .replace(/\s*\(HD\)/gi, "")
      .replace(/\s*\(HQ\)/gi, "")
      .replace(/\s*\(4K\)/gi, "")
      .replace(/\s*MV$/gi, "")
      .replace(/\s*M\/V$/gi, "")
      .trim();

    // Clean up artist name
    artist = artist
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/\s*VEVO$/i, "")
      .replace(/\s*Official$/i, "")
      .trim();

    return NextResponse.json({
      title,
      artist,
      cover_url,
      youtube_video_id: videoId,
      duration_ms: parseDuration(contentDetails.duration),
      release_date: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : null,
      channel_name: snippet.channelTitle,
    });
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube data. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
