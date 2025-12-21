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
}

export interface Award {
  id: string;
  song_id: string;
  name: string;
  detail: string;
  position: string;
}

