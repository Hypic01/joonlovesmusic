"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import Navbar from "@/app/components/Navbar";
import MusicMap from "@/app/components/MusicMap";
import PlaceAutocomplete, { type PlaceResult } from "@/app/components/PlaceAutocomplete";
import { supabase } from "@/lib/supabase";
import { extractCountry, type AddressComponent } from "@/lib/placeComponents";
import type { MapPinWithSong } from "@/lib/mapSearch";
import type { Song } from "@/types/database";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function useReverseGeocode() {
  const geocodingLib = useMapsLibrary("geocoding");
  return useCallback(
    async (lat: number, lng: number): Promise<PlaceResult> => {
      const fallback: PlaceResult = {
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        google_place_id: null,
        country: null,
      };
      if (!geocodingLib) return fallback;
      const geocoder = new geocodingLib.Geocoder();
      try {
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        const top = results[0];
        if (!top) return fallback;
        return {
          place_name: top.formatted_address || fallback.place_name,
          lat,
          lng,
          google_place_id: top.place_id ?? null,
          country: extractCountry(top.address_components as AddressComponent[] | undefined),
        };
      } catch {
        return fallback;
      }
    },
    [geocodingLib]
  );
}

function Editor() {
  const [pins, setPins] = useState<MapPinWithSong[]>([]);
  const [draft, setDraft] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const reverseGeocode = useReverseGeocode();

  const loadPins = useCallback(async () => {
    const { data } = await supabase.from("map_pins").select("*, songs(*)");
    if (data) setPins(data as unknown as MapPinWithSong[]);
  }, []);

  useEffect(() => {
    async function init() {
      await loadPins();
    }
    init();
  }, [loadPins]);

  const searchSongs = async () => {
    if (!songSearch.trim()) return;
    // PostgREST .or() treats commas as separators, so quote the term (and escape
    // backslashes/quotes) to keep legitimate queries like "Tyler, the Creator" intact.
    const q = songSearch.trim().replace(/[\\"]/g, (m) => `\\${m}`);
    const { data } = await supabase
      .from("songs")
      .select("*")
      .or(`title.ilike."%${q}%",artist.ilike."%${q}%",album_name.ilike."%${q}%"`)
      .limit(10);
    setSongResults(data || []);
  };

  const savePin = async () => {
    if (!draft || !selectedSong) {
      setMessage({ type: "error", text: "Pick a place and a song first." });
      return;
    }
    const res = await fetch("/api/map-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_id: selectedSong.id, ...draft, note: note || null }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      setMessage({ type: "error", text: error || "Failed to save pin" });
      return;
    }
    setMessage({ type: "success", text: `Pinned "${selectedSong.title}" to ${draft.place_name}` });
    setDraft(null);
    setSelectedSong(null);
    setNote("");
    setSongResults([]);
    setSongSearch("");
    await loadPins();
  };

  const deletePin = async (id: string) => {
    const res = await fetch(`/api/map-pins/${id}`, { method: "DELETE" });
    if (res.ok) await loadPins();
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto py-3">
      {message && (
        <p className={message.type === "error" ? "text-(--color-brand-red)" : ""}>{message.text}</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <PlaceAutocomplete onSelect={setDraft} placeholder="Search a place…" />
        <div className="flex gap-2">
          <input
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchSongs()}
            placeholder="Search your songs by title/artist/album…"
            className="flex-1 border-2 border-black px-3 py-2"
          />
          <button type="button" onClick={searchSongs} className="border-2 border-black px-4">
            Search
          </button>
        </div>
      </div>

      {songResults.length > 0 && (
        <ul className="border-2 border-black">
          {songResults.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { setSelectedSong(s); setSongResults([]); }}
                className="block w-full px-3 py-2 text-left hover:bg-neutral-100"
              >
                {s.title} — {s.artist}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm opacity-70">
        Place: {draft ? draft.place_name : "— search above or click the map —"} | Song:{" "}
        {selectedSong ? selectedSong.title : "—"}
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (why this place)…"
        className="border-2 border-black px-3 py-2"
      />
      <button type="button" onClick={savePin} className="border-2 border-black bg-(--color-brand-red) px-4 py-2 text-white">
        Save pin
      </button>

      <div className="min-h-80 flex-1 border-2 border-black">
        <MusicMap
          pins={pins}
          editable
          onMapClick={async (lat, lng) => setDraft(await reverseGeocode(lat, lng))}
        />
      </div>

      <div>
        <h2 className="mb-2 text-xl font-bold">Existing pins ({pins.length})</h2>
        <ul className="space-y-1">
          {pins.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-2 border-black px-3 py-2">
              <span>{p.place_name} → {p.songs.title}</span>
              <button type="button" onClick={() => deletePin(p.id)} className="text-(--color-brand-red)">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AdminMapPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) router.push("/admin/login");
        else setCheckingAuth(false);
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <p className="p-8">Checking authentication…</p>
        </div>
      </main>
    );
  }

  if (!apiKey) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <p className="p-8">Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 flex h-full flex-col">
        <Navbar />
        <APIProvider apiKey={apiKey}>
          <Editor />
        </APIProvider>
      </div>
    </main>
  );
}
