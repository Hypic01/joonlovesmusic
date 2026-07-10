"use client";

import { getRatingColor, displayRating } from "@/lib/ratingColors";
import { formatMoment } from "@/lib/formatMoment";
import type { MapPinWithSong } from "@/lib/mapSearch";

interface PinListProps {
  pins: MapPinWithSong[];
  activePinId: string | null;
  onFocus: (pin: MapPinWithSong) => void;
}

// Flat, sortable alternative to the Country → City → Place tree on /map.
// One row per pin: memory thumb (or plate), song + place · moment, rating block.
export default function PinList({ pins, activePinId, onFocus }: PinListProps) {
  return (
    <ul className="space-y-2 overflow-y-auto">
      {pins.map((pin) => {
        const moment = formatMoment(pin.taken_at);
        return (
          <li key={pin.id}>
            <button
              type="button"
              onClick={() => onFocus(pin)}
              className={`flex w-full items-center gap-3 border-2 bg-white p-2 text-left cursor-pointer hover:border-(--color-brand-red) ${
                activePinId === pin.id ? "border-(--color-brand-red)" : "border-black"
              }`}
            >
              {pin.photo_thumb_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pin.photo_thumb_url}
                  alt={`Memory at ${pin.place_name}`}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 border border-black object-cover"
                />
              ) : (
                <div className="h-12 w-12 shrink-0 bg-neutral-300" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{pin.songs.title}</span>
                <span className="block truncate text-[14px] opacity-70">
                  {pin.place_name}
                  {moment && ` · ${moment}`}
                </span>
              </span>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center text-[20px] font-black"
                style={{ backgroundColor: getRatingColor(pin.songs.rating) }}
              >
                {displayRating(pin.songs.rating)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
