"use client";

import { useState } from "react";
import { groupPins, type PinPlace } from "@/lib/groupPins";
import SongPopupCard from "./SongPopupCard";
import type { MapPinWithSong } from "@/lib/mapSearch";

interface PinTreeProps {
  pins: MapPinWithSong[];
  activePinId: string | null;
  onFocus: (pin: MapPinWithSong) => void;
  /** Admin-only. Omit on the public map to render the tree read-only. */
  onEdit?: (pin: MapPinWithSong) => void;
  /** Admin-only. Omit on the public map to render the tree read-only. */
  onDelete?: (pin: MapPinWithSong) => void;
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

interface PlaceNodeProps {
  place: PinPlace;
  /** Left-padding class so the header lines up under its country/city. */
  pad: string;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onEdit?: (pin: MapPinWithSong) => void;
  onDelete?: (pin: MapPinWithSong) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}

// A place (e.g. Jeju Island): collapsible like a country/city, with a song count
// on the right. Expanding reveals a song card per pinned song — same
// album/title/rating layout used on the ratings list and the map popup.
function PlaceNode({
  place,
  pad,
  open,
  active,
  onToggle,
  onEdit,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
}: PlaceNodeProps) {
  return (
    <div className="border-t border-black">
      <div
        className={`flex items-center justify-between gap-2 ${active ? "bg-neutral-100" : ""}`}
      >
        <button
          type="button"
          onClick={onToggle}
          className={`flex min-w-0 flex-1 items-center gap-2 px-4 py-2 ${pad} text-[16px] font-semibold hover:bg-neutral-100 cursor-pointer`}
        >
          <Caret open={open} />
          <span className="min-w-0 flex-1 break-words text-left">
            {place.place_category ? (
              <span className="opacity-60">{place.place_category} · </span>
            ) : null}
            {place.place_name}
          </span>
          <span className="font-normal opacity-60">{place.pins.length}</span>
        </button>

        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-2 pr-4 text-[16px]">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(place.pins[0])}
                className="underline cursor-pointer"
              >
                Edit
              </button>
            )}
            {onDelete &&
              (confirmDeleteId === place.pins[0].id ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      onDelete(place.pins[0]);
                    }}
                    className="font-semibold text-(--color-brand-red) cursor-pointer"
                  >
                    Confirm?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(place.pins[0].id)}
                  className="text-(--color-brand-red) cursor-pointer"
                >
                  Delete
                </button>
              ))}
          </div>
        )}
      </div>

      {open && (
        <div className="space-y-2 bg-white px-3 pb-3 pt-1">
          {place.pins.map((pin) => (
            <SongPopupCard key={pin.id} song={pin.songs} />
          ))}
        </div>
      )}
    </div>
  );
}

// Collapsible Country -> City -> Place tree. Places with a known city nest under
// it; places with no city sit directly under their country. Countries and cities
// default open; places default closed so you click one to reveal its song card.
export default function PinTree({ pins, activePinId, onFocus, onEdit, onDelete }: PinTreeProps) {
  const grouped = groupPins(pins);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openPlaces, setOpenPlaces] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isOpen = (key: string) => !collapsed.has(key);
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isPlaceOpen = (key: string) => openPlaces.has(key);
  const togglePlace = (place: PinPlace, key: string) => {
    const willOpen = !openPlaces.has(key);
    setOpenPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    // Opening a place focuses it on the map too.
    if (willOpen) onFocus(place.pins[0]);
  };

  const renderPlace = (place: PinPlace, parentKey: string, pad: string) => {
    const key = `${parentKey}|place:${place.key}`;
    return (
      <PlaceNode
        key={key}
        place={place}
        pad={pad}
        open={isPlaceOpen(key)}
        active={place.pins.some((p) => p.id === activePinId)}
        onToggle={() => togglePlace(place, key)}
        onEdit={onEdit}
        onDelete={onDelete}
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
      />
    );
  };

  return (
    <ul className="space-y-2 overflow-y-auto pr-1">
      {grouped.map((country) => {
        const cKey = `c:${country.country}`;
        return (
          <li key={cKey} className="border-2 border-black bg-white">
            <button
              type="button"
              onClick={() => toggle(cKey)}
              className="flex w-full items-center gap-2 px-4 py-3 text-[18px] font-bold hover:bg-neutral-100 cursor-pointer"
            >
              <Caret open={isOpen(cKey)} />
              <span className="flex-1 text-left">{country.country}</span>
              <span className="text-[16px] font-normal opacity-60">{country.count}</span>
            </button>

            {isOpen(cKey) && (
              <>
                {/* Places with no city: straight under the country. */}
                {country.loosePlaces.map((place) => renderPlace(place, cKey, "pl-6"))}

                {/* Places grouped by their city. */}
                {country.cities.map((city) => {
                  const cityKey = `${cKey}|city:${city.city}`;
                  return (
                    <div key={cityKey} className="border-t-2 border-black">
                      <button
                        type="button"
                        onClick={() => toggle(cityKey)}
                        className="flex w-full items-center gap-2 px-4 py-2 pl-6 text-[16px] font-semibold hover:bg-neutral-100 cursor-pointer"
                      >
                        <Caret open={isOpen(cityKey)} />
                        <span className="flex-1 text-left">{city.city}</span>
                        <span className="font-normal opacity-60">{city.count}</span>
                      </button>

                      {isOpen(cityKey) &&
                        city.places.map((place) => renderPlace(place, cityKey, "pl-10"))}
                    </div>
                  );
                })}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
