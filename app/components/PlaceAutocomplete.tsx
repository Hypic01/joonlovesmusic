"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { extractCountry, type AddressComponent } from "@/lib/placeComponents";

export interface PlaceResult {
  place_name: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
  country: string | null;
}

interface PlaceAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

export default function PlaceAutocomplete({ onSelect, placeholder }: PlaceAutocompleteProps) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [widget, setWidget] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "geometry", "place_id", "address_components"],
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
      });
      if (inputRef.current) inputRef.current.value = "";
    });
    return () => listener.remove();
  }, [widget, onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder || "Search a place…"}
      className="w-full border-2 border-black bg-white px-3 py-2"
    />
  );
}
