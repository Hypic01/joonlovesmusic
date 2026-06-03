"use client";

import { useEffect, useState, useCallback } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import MusicMap from "./MusicMap";
import PlaceAutocomplete, { type PlaceResult } from "./PlaceAutocomplete";
import { extractCountry, type AddressComponent } from "@/lib/placeComponents";
import { supabase } from "@/lib/supabase";
import type { MapPinWithSong } from "@/lib/mapSearch";
import type { MapPin, Song } from "@/types/database";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type DraftPin = Omit<MapPin, "id" | "song_id" | "created_at">;

interface SongLocationsEditorProps {
  songId: string | null;
  song?: Song;
  onDraftChange?: (drafts: DraftPin[]) => void;
}

function Inner({ songId, song, onDraftChange }: SongLocationsEditorProps) {
  const [pins, setPins] = useState<MapPinWithSong[]>([]);
  const [drafts, setDrafts] = useState<DraftPin[]>([]);
  const [pending, setPending] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");
  const geocodingLib = useMapsLibrary("geocoding");

  const loadPins = useCallback(async () => {
    if (!songId) return;
    const { data } = await supabase.from("map_pins").select("*, songs(*)").eq("song_id", songId);
    if (data) setPins(data as unknown as MapPinWithSong[]);
  }, [songId]);

  useEffect(() => {
    async function init() {
      await loadPins();
    }
    init();
  }, [loadPins]);

  useEffect(() => {
    if (!songId) onDraftChange?.(drafts);
  }, [drafts, songId, onDraftChange]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<PlaceResult> => {
      const fallback: PlaceResult = {
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat, lng, google_place_id: null, country: null,
      };
      if (!geocodingLib) return fallback;
      try {
        const { results } = await new geocodingLib.Geocoder().geocode({ location: { lat, lng } });
        const top = results[0];
        if (!top) return fallback;
        return {
          place_name: top.formatted_address || fallback.place_name,
          lat, lng,
          google_place_id: top.place_id ?? null,
          country: extractCountry(top.address_components as AddressComponent[] | undefined),
        };
      } catch {
        return fallback;
      }
    },
    [geocodingLib]
  );

  const addPending = async () => {
    if (!pending) return;
    const payload: DraftPin = { ...pending, note: note || null };
    if (songId) {
      await fetch("/api/map-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: songId, ...payload }),
      });
      await loadPins();
    } else {
      setDrafts((prev) => [...prev, payload]);
    }
    setPending(null);
    setNote("");
  };

  const removePersisted = async (id: string) => {
    await fetch(`/api/map-pins/${id}`, { method: "DELETE" });
    await loadPins();
  };

  const previewPins: MapPinWithSong[] = songId
    ? pins
    : drafts.map((d, i) => ({
        id: `draft-${i}`,
        song_id: "draft",
        created_at: "",
        songs: (song ?? ({ title: "(new song)", artist: "" } as Song)),
        ...d,
      }));

  return (
    <div className="space-y-2">
      <label className="block font-semibold">Locations</label>
      <PlaceAutocomplete onSelect={setPending} placeholder="Search a place for this song…" />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full border-2 border-black px-3 py-2"
      />
      <p className="text-sm opacity-70">
        Pending: {pending ? pending.place_name : "— search or click the mini-map —"}
      </p>
      <button type="button" onClick={addPending} className="border-2 border-black px-3 py-1">
        Add location
      </button>

      <div className="h-64 border-2 border-black">
        <MusicMap
          pins={previewPins}
          editable
          onMapClick={async (lat, lng) => setPending(await reverseGeocode(lat, lng))}
        />
      </div>

      <ul className="space-y-1">
        {songId
          ? pins.map((p) => (
              <li key={p.id} className="flex justify-between border-2 border-black px-3 py-1">
                <span>{p.place_name}</span>
                <button type="button" onClick={() => removePersisted(p.id)} className="text-(--color-brand-red)">
                  Remove
                </button>
              </li>
            ))
          : drafts.map((d, i) => (
              <li key={i} className="flex justify-between border-2 border-black px-3 py-1">
                <span>{d.place_name}</span>
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                  className="text-(--color-brand-red)"
                >
                  Remove
                </button>
              </li>
            ))}
      </ul>
    </div>
  );
}

export default function SongLocationsEditor(props: SongLocationsEditorProps) {
  if (!apiKey) {
    return <p className="text-sm opacity-70">Locations disabled — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</p>;
  }
  return (
    <APIProvider apiKey={apiKey}>
      <Inner {...props} />
    </APIProvider>
  );
}
