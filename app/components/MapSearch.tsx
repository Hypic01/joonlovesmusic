"use client";

import { useMemo, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { buildSearchIndex, matchSearch, type MapPinWithSong, type SearchType } from "@/lib/mapSearch";

const TYPE_META: Record<SearchType, { icon: string; subtext: string }> = {
  song: { icon: "♪", subtext: "Song" },
  artist: { icon: "🎤", subtext: "Artist" },
  album: { icon: "💿", subtext: "Album" },
  place: { icon: "📍", subtext: "Place" },
  country: { icon: "🌐", subtext: "Country" },
};

interface MapSearchProps {
  pins: MapPinWithSong[];
  onFocusPins: (pinIds: string[]) => void;
}

export default function MapSearch({ pins, onFocusPins }: MapSearchProps) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const index = useMemo(() => buildSearchIndex(pins), [pins]);
  const results = useMemo(() => matchSearch(index, query).slice(0, 10), [index, query]);

  const focus = (pinIds: string[]) => {
    setQuery("");
    onFocusPins(pinIds);
    if (!map || pinIds.length === 0) return;
    const focused = pins.filter((p) => pinIds.includes(p.id));
    if (focused.length === 1) {
      map.panTo({ lat: focused[0].lat, lng: focused[0].lng });
      map.setZoom(12);
    } else {
      const bounds = new google.maps.LatLngBounds();
      focused.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 80);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums, places…"
        className="w-full border-2 border-black bg-white px-4 py-3 text-lg"
      />
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto border-2 border-black bg-white">
          {results.map((r) => (
            <li key={`${r.type}-${r.label}`}>
              <button
                type="button"
                onClick={() => focus(r.pinIds)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-100"
              >
                <span className="text-xl">{TYPE_META[r.type].icon}</span>
                <span className="flex flex-col">
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-sm opacity-60">{TYPE_META[r.type].subtext}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
