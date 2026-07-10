"use client";

import { useEffect, useState, useCallback } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import MusicMap from "./MusicMap";
import PlaceAutocomplete, { type PlaceResult } from "./PlaceAutocomplete";
import MemoryPhotoInput, { type PhotoDraft } from "./MemoryPhotoInput";
import { extractCountry, extractCity, type AddressComponent } from "@/lib/placeComponents";
import { derivePlaceCategory } from "@/lib/placeCategory";
import { supabase } from "@/lib/supabase";
import { uploadMemoryPhoto } from "@/lib/memoryUpload";
import { formatMoment } from "@/lib/formatMoment";
import type { PhotoMeta } from "@/lib/photoExif";
import type { MapPinWithSong } from "@/lib/mapSearch";
import type { MapPin, Song } from "@/types/database";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type DraftPin = Omit<MapPin, "id" | "song_id" | "created_at"> & {
  /** Staged photo file for drafts on the add-song page; uploaded at song save. */
  photoFile?: File | null;
};

interface SongLocationsEditorProps {
  songId: string | null;
  song?: Song;
  onDraftChange?: (drafts: DraftPin[]) => void;
}

function Inner({ songId, song, onDraftChange }: SongLocationsEditorProps) {
  const [pins, setPins] = useState<MapPinWithSong[]>([]);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [drafts, setDrafts] = useState<DraftPin[]>([]);
  const [pending, setPending] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [takenAt, setTakenAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const geocodingLib = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const loadPins = useCallback(async () => {
    if (!songId) return;
    try {
      const { data } = await supabase.from("map_pins").select("*, songs(*)").eq("song_id", songId);
      if (data) setPins(data as unknown as MapPinWithSong[]);
    } finally {
      setPinsLoaded(true);
    }
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
        lat, lng, google_place_id: null, country: null, city: null, place_category: null,
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
          city: extractCity(top.address_components as AddressComponent[] | undefined),
          place_category: derivePlaceCategory(top.types ?? null),
        };
      } catch {
        return fallback;
      }
    },
    [geocodingLib]
  );

  const handlePhotoPick = async (draft: PhotoDraft, meta: PhotoMeta) => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return draft;
    });
    if (meta.takenAt) setTakenAt(meta.takenAt);
    if (meta.lat != null && meta.lng != null) {
      const lat = meta.lat;
      const lng = meta.lng;
      // Same flow as a map click: instant raw-coordinate pending, then refine.
      setPending({
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        google_place_id: null,
        country: null,
        city: null,
        place_category: null,
      });
      const refined = await reverseGeocode(lat, lng);
      setPending((p) => (p && p.lat === lat && p.lng === lng ? refined : p));
    }
  };

  const clearPhoto = () => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const addPending = async () => {
    if (!pending || saving) return;
    const payload: DraftPin = { ...pending, note: note || null, taken_at: takenAt || null };
    if (songId) {
      setSaving(true);
      try {
        let photoUrls: { photo_url?: string; photo_thumb_url?: string } = {};
        if (photo) {
          try {
            photoUrls = await uploadMemoryPhoto(photo.file);
          } catch (e) {
            setMessage({
              type: "error",
              text: e instanceof Error ? e.message : "Photo upload failed — try again",
            });
            return; // atomic: no pin without its photo
          }
        }
        const res = await fetch("/api/map-pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ song_id: songId, ...payload, ...photoUrls }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: null }));
          setMessage({ type: "error", text: error || "Failed to add location" });
          return;
        }
        setMessage({ type: "success", text: `Added ${payload.place_name}` });
        await loadPins();
      } finally {
        setSaving(false);
      }
    } else {
      setDrafts((prev) => [...prev, { ...payload, photoFile: photo?.file ?? null }]);
      setMessage({ type: "success", text: `Added ${payload.place_name}` });
    }
    setPending(null);
    setNote("");
    clearPhoto();
    setTakenAt("");
  };

  const removePersisted = async (id: string, placeName: string) => {
    const res = await fetch(`/api/map-pins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      setMessage({ type: "error", text: error || "Failed to remove location" });
      return;
    }
    setMessage({ type: "success", text: `Removed ${placeName}` });
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
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`border-2 px-3 py-2 text-sm font-semibold ${
            message.type === "error"
              ? "border-(--color-brand-red) bg-red-50 text-(--color-brand-red)"
              : "border-black bg-green-100 text-black"
          }`}
        >
          {message.text}
        </div>
      )}
      <PlaceAutocomplete
        onSelect={setPending}
        placeholder="Search a place for this song…"
        initialValue={pending?.place_name ?? ""}
        id="song-location-place"
        label="Search for a place for this song"
      />
      <label htmlFor="song-location-note" className="sr-only">
        Optional note about this location
      </label>
      <input
        id="song-location-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full border-2 border-black px-3 py-2"
      />
      <MemoryPhotoInput
        photo={photo}
        takenAt={takenAt}
        onTakenAtChange={setTakenAt}
        onPick={handlePhotoPick}
        onClear={clearPhoto}
        disabled={saving}
        idPrefix="song-location"
      />
      <p className="text-sm opacity-70">
        Pending: {pending ? pending.place_name : "— search or click the mini-map —"}
      </p>
      <button
        type="button"
        onClick={addPending}
        disabled={saving || !pending}
        className="border-2 border-black px-3 py-1 disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add location"}
      </button>

      <div className="h-64 border-2 border-black">
        <MusicMap
          pins={previewPins}
          editable
          draftPosition={pending ? { lat: pending.lat, lng: pending.lng } : null}
          onDraftMove={(lat, lng) =>
            setPending((p) => (p ? { ...p, lat, lng } : p))
          }
          onMapClick={async (lat, lng) => {
            // Show the draft pin instantly, then refine once geocoding resolves.
            setPending({
              place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              lat,
              lng,
              google_place_id: null,
              country: null,
              city: null,
              place_category: null,
            });
            const refined = await reverseGeocode(lat, lng);
            setPending((p) => (p && p.lat === lat && p.lng === lng ? refined : p));
          }}
        />
      </div>

      {songId && !pinsLoaded ? (
        <p className="text-sm opacity-70" aria-live="polite">
          Loading locations…
        </p>
      ) : (songId ? pins.length : drafts.length) === 0 ? (
        <p className="text-sm opacity-70">No locations yet</p>
      ) : (
        <ul className="space-y-1">
          {songId
            ? pins.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 border-2 border-black px-3 py-1">
                  <span className="min-w-0 truncate">
                    {p.place_name}
                    {p.photo_thumb_url && <span className="opacity-70"> · photo</span>}
                    {formatMoment(p.taken_at) && (
                      <span className="opacity-70"> · {formatMoment(p.taken_at)}</span>
                    )}
                  </span>
                  <button type="button" onClick={() => removePersisted(p.id, p.place_name)} className="text-(--color-brand-red) shrink-0">
                    Remove
                  </button>
                </li>
              ))
            : drafts.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-2 border-black px-3 py-1">
                  <span className="min-w-0 truncate">
                    {d.place_name}
                    {d.photoFile && <span className="opacity-70"> · photo</span>}
                    {formatMoment(d.taken_at) && (
                      <span className="opacity-70"> · {formatMoment(d.taken_at)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                    className="text-(--color-brand-red) shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
        </ul>
      )}
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
