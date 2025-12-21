export interface Song {
  id: string; // UUID from Supabase
  title: string;
  artist: string;
  rating: number;
  rank: number;
  cover_url: string | null;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  spotify_track_id?: string | null;
  album_name?: string | null;
  release_date?: string | null;
  duration_ms?: number | null;
  explicit?: boolean | null;
  popularity?: number | null;
  isrc?: string | null;
  track_number?: number | null;
  disc_number?: number | null;
  album_type?: string | null;
  preview_url?: string | null;
}

export interface Award {
  id: string;
  song_id: string;
  name: string;
  detail: string;
  position: string;
}

export interface RatingHistory {
  id: string;
  song_id: string;
  rating: number;
  changed_at: string;
}

export interface CommentHistory {
  id: string;
  song_id: string;
  comment: string | null;
  rating: number;
  changed_at: string;
}

export interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  spotify_id: string | null;
  created_at: string;
}

