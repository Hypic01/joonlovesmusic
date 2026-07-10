"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import Navbar from "@/app/components/Navbar";
import MusicMap from "@/app/components/MusicMap";
import PlaceAutocomplete, { type PlaceResult } from "@/app/components/PlaceAutocomplete";
import PinTree from "@/app/components/PinTree";
import MemoryPhotoInput, { type PhotoDraft } from "@/app/components/MemoryPhotoInput";
import { uploadMemoryPhoto } from "@/lib/memoryUpload";
import type { PhotoMeta } from "@/lib/photoExif";
import { supabase } from "@/lib/supabase";
import { extractCountry, extractCity, type AddressComponent } from "@/lib/placeComponents";
import { derivePlaceCategory } from "@/lib/placeCategory";
import { buildSongSearchFilter, type MapPinWithSong } from "@/lib/mapSearch";
import { useDebounce, shouldSearch } from "@/lib/useDebounce";
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
        city: null,
        place_category: null,
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
          city: extractCity(top.address_components as AddressComponent[] | undefined),
          place_category: derivePlaceCategory(top.types ?? null),
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
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [draft, setDraft] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [takenAt, setTakenAt] = useState("");
  const [existingPhoto, setExistingPhoto] = useState<{ url: string | null; thumb: string | null }>({ url: null, thumb: null });
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const songSearchRef = useRef<HTMLInputElement>(null);
  const reverseGeocode = useReverseGeocode();
  const geocodingLib = useMapsLibrary("geocoding");
  const backfillRanRef = useRef(false);

  const debouncedSearch = useDebounce(songSearch, 250);

  // Auto-dismiss the status banner so it's never left stale after scrolling.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const loadPins = useCallback(async () => {
    try {
      const { data } = await supabase.from("map_pins").select("*, songs(*)");
      if (data) setPins(data as unknown as MapPinWithSong[]);
    } finally {
      setPinsLoaded(true);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await loadPins();
    }
    init();
  }, [loadPins]);

  // One-time backfill: older pins (created before city/place_category existed)
  // get those fields filled in by reverse-geocoding their coordinates, so the
  // categorized list can group them. Waits for the geocoder to be ready.
  useEffect(() => {
    if (backfillRanRef.current) return;
    if (!pinsLoaded || !geocodingLib) return;
    const needsBackfill = pins.filter((p) => !p.city && !p.place_category);
    backfillRanRef.current = true;
    if (needsBackfill.length === 0) return;
    async function backfill() {
      for (const p of needsBackfill) {
        const geo = await reverseGeocode(p.lat, p.lng);
        await fetch(`/api/map-pins/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            song_id: p.song_id,
            place_name: p.place_name,
            lat: p.lat,
            lng: p.lng,
            google_place_id: p.google_place_id ?? geo.google_place_id,
            country: p.country ?? geo.country,
            city: geo.city,
            place_category: geo.place_category,
            note: p.note ?? null,
            photo_url: p.photo_url ?? null,
            photo_thumb_url: p.photo_thumb_url ?? null,
            taken_at: p.taken_at ?? null,
          }),
        });
      }
      await loadPins();
    }
    backfill();
  }, [pinsLoaded, geocodingLib, pins, reverseGeocode, loadPins]);

  // Live, debounced song search: queries as the admin types (no Enter needed).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!shouldSearch(debouncedSearch)) {
        setSongResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      const { data } = await supabase
        .from("songs")
        .select("*")
        .or(buildSongSearchFilter(debouncedSearch))
        .limit(10);
      if (!cancelled) {
        setSongResults((data as Song[]) || []);
        setSearchLoading(false);
        setHighlightIndex(-1);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // "Searching…" the instant the user types, until the debounced query resolves.
  const isSearching =
    shouldSearch(songSearch) && (songSearch !== debouncedSearch || searchLoading);
  const showSongDropdown = shouldSearch(songSearch);
  const songListboxId = "song-search-listbox";

  const selectSong = (s: Song) => {
    setSelectedSong(s);
    setSongResults([]);
    setSongSearch("");
    setHighlightIndex(-1);
  };

  // Keyboard support for the combobox: arrows move the highlight, Enter picks the
  // highlighted (or first) result, Escape closes the dropdown.
  const onSongKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSongDropdown || isSearching || songResults.length === 0) {
      if (e.key === "Escape") {
        setSongSearch("");
        setSongResults([]);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % songResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? songResults.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = songResults[highlightIndex] ?? songResults[0];
      if (pick) selectSong(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSongSearch("");
      setSongResults([]);
    }
  };

  const handlePhotoPick = async (draft: PhotoDraft, meta: PhotoMeta) => {
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return draft;
    });
    setRemoveExistingPhoto(false);
    if (meta.takenAt) setTakenAt(meta.takenAt);
    if (meta.lat != null && meta.lng != null) {
      const lat = meta.lat;
      const lng = meta.lng;
      setDraft({
        place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        google_place_id: null,
        country: null,
        city: null,
        place_category: null,
      });
      const refined = await reverseGeocode(lat, lng);
      setDraft((d) => (d && d.lat === lat && d.lng === lng ? refined : d));
    }
  };

  const handlePhotoClear = () => {
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
      setPhoto(null);
      return; // un-stage the new file; a saved photo (if any) stays
    }
    setRemoveExistingPhoto(true); // no staged file: mark the saved photo for removal
  };

  const resetForm = () => {
    setDraft(null);
    setSelectedSong(null);
    setNote("");
    setSongResults([]);
    setSongSearch("");
    setEditingId(null);
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setTakenAt("");
    setExistingPhoto({ url: null, thumb: null });
    setRemoveExistingPhoto(false);
  };

  const savePin = async () => {
    if (saving) return;
    if (!draft || !selectedSong) {
      setMessage({ type: "error", text: "Pick a place and a song first." });
      return;
    }
    setSaving(true);
    let photoFields: { photo_url: string | null; photo_thumb_url: string | null };
    if (photo) {
      try {
        const up = await uploadMemoryPhoto(photo.file);
        photoFields = { photo_url: up.photo_url, photo_thumb_url: up.photo_thumb_url };
      } catch (e) {
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Photo upload failed — try again",
        });
        setSaving(false);
        return; // atomic: don't save the pin without its photo
      }
    } else if (editingId && !removeExistingPhoto) {
      photoFields = { photo_url: existingPhoto.url, photo_thumb_url: existingPhoto.thumb };
    } else {
      photoFields = { photo_url: null, photo_thumb_url: null };
    }
    const payload = {
      song_id: selectedSong.id,
      place_name: draft.place_name,
      lat: draft.lat,
      lng: draft.lng,
      google_place_id: draft.google_place_id,
      country: draft.country,
      city: draft.city,
      place_category: draft.place_category,
      note: note || null,
      taken_at: takenAt || null,
      ...photoFields,
    };
    try {
      const res = await fetch(
        editingId ? `/api/map-pins/${editingId}` : "/api/map-pins",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        setMessage({ type: "error", text: error || "Failed to save pin" });
        return;
      }
      setMessage({
        type: "success",
        text: editingId
          ? `Updated "${selectedSong.title}" at ${draft.place_name}`
          : `Pinned "${selectedSong.title}" to ${draft.place_name}`,
      });
      resetForm();
      await loadPins();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (pin: MapPinWithSong) => {
    setEditingId(pin.id);
    setDraft({
      place_name: pin.place_name,
      lat: pin.lat,
      lng: pin.lng,
      google_place_id: pin.google_place_id ?? null,
      country: pin.country ?? null,
      city: pin.city ?? null,
      place_category: pin.place_category ?? null,
    });
    setSelectedSong(pin.songs);
    setNote(pin.note ?? "");
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setTakenAt(pin.taken_at ? pin.taken_at.slice(0, 16) : "");
    setExistingPhoto({ url: pin.photo_url ?? null, thumb: pin.photo_thumb_url ?? null });
    setRemoveExistingPhoto(false);
    setSongResults([]);
    setSongSearch("");
    setMessage(null);
    // Make the edit transition perceptible on every viewport: the editor lives
    // at the top of the left column, far above the pin list on mobile.
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      songSearchRef.current?.focus({ preventScroll: true });
    });
  };

  const deletePin = async (pin: MapPinWithSong) => {
    const res = await fetch(`/api/map-pins/${pin.id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      setMessage({ type: "error", text: error || "Failed to delete pin" });
      return;
    }
    if (editingId === pin.id) resetForm();
    setMessage({
      type: "success",
      text: `Removed "${pin.songs.title}" from ${pin.place_name}`,
    });
    await loadPins();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-3 pb-5">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`sticky top-0 z-30 border-2 px-4 py-3 text-[18px] font-semibold ${
            message.type === "error"
              ? "border-(--color-brand-red) bg-red-50 text-(--color-brand-red)"
              : "border-black bg-green-100 text-black"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* LEFT: editor + map */}
        <div ref={editorRef} className="flex min-h-0 flex-col gap-3">
          {editingId && (
            <div className="flex items-center justify-between border-2 border-black bg-neutral-100 px-4 py-3 text-[18px]">
              <span className="font-semibold">Editing an existing pin</span>
              <button type="button" onClick={resetForm} className="underline cursor-pointer">
                Cancel edit
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <PlaceAutocomplete
              onSelect={setDraft}
              placeholder="Search a place…"
              initialValue={draft?.place_name ?? ""}
              id="place-search"
              label="Search for a place"
            />

            <div className="relative">
              <label htmlFor="song-search" className="sr-only">
                Search your songs by title, artist, or album
              </label>
              <input
                ref={songSearchRef}
                id="song-search"
                role="combobox"
                aria-expanded={showSongDropdown}
                aria-controls={songListboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  highlightIndex >= 0 && songResults[highlightIndex]
                    ? `song-opt-${songResults[highlightIndex].id}`
                    : undefined
                }
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                onKeyDown={onSongKeyDown}
                placeholder="Search your songs by title, artist, or album…"
                className="w-full pl-6 pr-14 py-4 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              {showSongDropdown && (
                <ul
                  id={songListboxId}
                  role="listbox"
                  aria-label="Song search results"
                  className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border-2 border-black bg-white"
                >
                  {isSearching ? (
                    <li className="px-4 py-3 text-[16px] opacity-70">Searching…</li>
                  ) : songResults.length === 0 ? (
                    <li className="px-4 py-3 text-[16px] opacity-70">No matches</li>
                  ) : (
                    songResults.map((s, i) => (
                      <li
                        key={s.id}
                        id={`song-opt-${s.id}`}
                        role="option"
                        aria-selected={highlightIndex === i}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightIndex(i)}
                          onClick={() => selectSong(s)}
                          className={`block w-full px-4 py-3 text-[16px] text-left cursor-pointer ${
                            highlightIndex === i ? "bg-neutral-100" : "hover:bg-neutral-100"
                          }`}
                        >
                          {s.title} — {s.artist}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          <p className="text-[16px] opacity-70">
            Place: {draft ? draft.place_name : "— search above, click the map, or drag the blue pin —"} | Song:{" "}
            {selectedSong ? selectedSong.title : "—"}
          </p>

          <label htmlFor="pin-note" className="sr-only">
            Optional note about this place
          </label>
          <input
            id="pin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (why this place)…"
            className="w-full px-6 py-4 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
          />

          <MemoryPhotoInput
            photo={photo}
            existingPhotoUrl={removeExistingPhoto ? null : existingPhoto.thumb ?? existingPhoto.url}
            takenAt={takenAt}
            onTakenAtChange={setTakenAt}
            onPick={handlePhotoPick}
            onClear={handlePhotoClear}
            disabled={saving}
            idPrefix="admin-map"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={savePin}
              disabled={saving}
              className="border-2 border-black bg-(--color-brand-red) px-4 py-4 text-[18px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? editingId
                  ? "Updating…"
                  : "Saving…"
                : editingId
                  ? "Update pin"
                  : "Save pin"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-black px-4 py-4 text-[18px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="min-h-80 flex-1 border-2 border-black">
            <MusicMap
              pins={pins}
              editable
              openPinId={openPinId}
              onOpenPinChange={setOpenPinId}
              draftPosition={draft ? { lat: draft.lat, lng: draft.lng } : null}
              onDraftMove={(lat, lng) => setDraft((d) => (d ? { ...d, lat, lng } : d))}
              onMapClick={async (lat, lng) => {
                // Drop the draft pin instantly with raw coordinates, then refine
                // the place name/country once reverse geocoding resolves.
                setDraft({
                  place_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                  lat,
                  lng,
                  google_place_id: null,
                  country: null,
                  city: null,
                  place_category: null,
                });
                const refined = await reverseGeocode(lat, lng);
                setDraft((d) =>
                  d && d.lat === lat && d.lng === lng ? refined : d
                );
              }}
            />
          </div>
        </div>

        {/* RIGHT: categorized pin list — Country -> City -> Place */}
        <div className="flex min-h-0 flex-col gap-3">
          <h2 className="text-[24px] font-bold">Saved pins ({pins.length})</h2>
          {!pinsLoaded ? (
            <p className="text-[16px] opacity-70" aria-live="polite">
              Loading pins…
            </p>
          ) : pins.length === 0 ? (
            <p className="text-[16px] opacity-70">No pins yet</p>
          ) : (
            <PinTree
              pins={pins}
              activePinId={openPinId}
              onFocus={(p) => setOpenPinId(p.id)}
              onEdit={startEdit}
              onDelete={deletePin}
            />
          )}
        </div>
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
