"use client";

import { useState } from "react";
import { Map, AdvancedMarker, Pin, InfoWindow, type MapMouseEvent } from "@vis.gl/react-google-maps";
import type { MapPinWithSong } from "@/lib/mapSearch";
import SongBar from "./SongBar";

const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;

interface MusicMapProps {
  pins: MapPinWithSong[];
  editable?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  openPinId?: string | null;
  onOpenPinChange?: (id: string | null) => void;
}

export default function MusicMap({
  pins,
  editable = false,
  onMapClick,
  openPinId,
  onOpenPinChange,
}: MusicMapProps) {
  const [internalOpen, setInternalOpen] = useState<string | null>(null);
  const activeId = openPinId !== undefined ? openPinId : internalOpen;

  const setOpen = (id: string | null) => {
    setInternalOpen(id);
    onOpenPinChange?.(id);
  };

  const activePin = activeId ? pins.find((p) => p.id === activeId) : undefined;

  return (
    <Map
      mapId={mapId}
      defaultCenter={{ lat: 20, lng: 0 }}
      defaultZoom={2}
      gestureHandling="greedy"
      className="h-full w-full"
      onClick={(e: MapMouseEvent) => {
        if (editable && onMapClick && e.detail.latLng) {
          onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
        }
      }}
    >
      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          onClick={() => setOpen(pin.id)}
        >
          <Pin background="#ff4242" borderColor="#000000" glyphColor="#ffffff" />
        </AdvancedMarker>
      ))}

      {activePin && (
        <InfoWindow
          position={{ lat: activePin.lat, lng: activePin.lng }}
          onCloseClick={() => setOpen(null)}
          maxWidth={320}
        >
          <div className="w-72 space-y-2">
            <p className="text-lg font-bold">{activePin.place_name}</p>
            {activePin.note && <p className="text-sm opacity-70">{activePin.note}</p>}
            <SongBar song={activePin.songs} />
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}
