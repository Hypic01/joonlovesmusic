"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { extractCountry, extractCity, type AddressComponent } from "@/lib/placeComponents";
import { derivePlaceCategory } from "@/lib/placeCategory";

export interface PlaceResult {
  place_name: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
  country: string | null;
  city: string | null;
  place_category: string | null;
}

interface PlaceAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  /**
   * Text to display in the input. Keeps the visible place name in sync with the
   * selected/edited pin so the box never looks blank when a location is already
   * attached (e.g. when an admin clicks Edit on a saved pin). The Google widget
   * is otherwise uncontrolled, so we write this straight onto the DOM input.
   */
  initialValue?: string;
  /** id for the input so an associated <label> can point at it. */
  id?: string;
  /** Accessible label text (rendered visually hidden) for screen readers. */
  label?: string;
}

export default function PlaceAutocomplete({
  onSelect,
  placeholder,
  initialValue,
  id,
  label,
}: PlaceAutocompleteProps) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [widget, setWidget] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "geometry", "place_id", "address_components", "types"],
    });
    setWidget(ac);
  }, [places]);

  useEffect(() => {
    if (!widget) return;
    const listener = widget.addListener("place_changed", () => {
      const place = widget.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onSelect({
        place_name: place.name || place.formatted_address || "Unnamed place",
        lat: loc.lat(),
        lng: loc.lng(),
        google_place_id: place.place_id ?? null,
        country: extractCountry(place.address_components as AddressComponent[] | undefined),
        city: extractCity(place.address_components as AddressComponent[] | undefined),
        place_category: derivePlaceCategory(place.types ?? null),
      });
    });
    return () => listener.remove();
  }, [widget, onSelect]);

  // Mirror the attached place name into the (otherwise uncontrolled) input so the
  // box reflects the current selection/edit instead of showing a stale or blank
  // value. Only writes when the value actually changes to avoid clobbering typing.
  useEffect(() => {
    if (initialValue === undefined) return;
    if (inputRef.current && inputRef.current.value !== initialValue) {
      inputRef.current.value = initialValue;
    }
  }, [initialValue]);

  return (
    <>
      {/* Google appends its .pac-container suggestion dropdown to <body>, which
          otherwise renders behind the map's own stacking context. Lift it. */}
      <style>{`.pac-container { z-index: 2000 !important; }`}</style>
      <div className="relative">
        {label && (
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder || "Search a place…"}
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
      </div>
    </>
  );
}
