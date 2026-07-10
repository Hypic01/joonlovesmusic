"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Map, AdvancedMarker, Pin, InfoWindow, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";
import type { MapPinWithSong } from "@/lib/mapSearch";
import { formatMoment } from "@/lib/formatMoment";
import SongPopupCard from "./SongPopupCard";

const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;

// Google's InfoWindow renders its content in Roboto; force the site font so the
// popup matches the rest of joonlovesmusic.
const SITE_FONT =
  "var(--font-jersey-10), var(--font-noto-sans-kr), var(--font-noto-sans-jp), ui-sans-serif, system-ui, sans-serif";

// Pans/zooms the map whenever a place is picked. Lives inside <Map> so it can
// read the map instance via context. Depends on primitive lat/lng (not an
// object) so it only fires when the picked coordinates actually change.
function PanToDraft({
  lat,
  lng,
  skipPanRef,
}: {
  lat: number | null;
  lng: number | null;
  skipPanRef: RefObject<boolean>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    // When the coordinate change came from dragging the draft pin, keep the
    // user's current view instead of recentering + resetting the zoom.
    if (skipPanRef.current) {
      skipPanRef.current = false;
      return;
    }
    map.panTo({ lat, lng });
    map.setZoom(11);
  }, [map, lat, lng, skipPanRef]);
  return null;
}

// Pans + zooms in to a pin when it's opened (clicked). Keyed on the pin id so
// reopening the same pin re-focuses it even after the user has panned away.
function PanToActivePin({
  pinId,
  lat,
  lng,
}: {
  pinId: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || pinId == null || lat == null || lng == null) return;
    map.panTo({ lat, lng });
    map.setZoom(13);
  }, [map, pinId, lat, lng]);
  return null;
}

interface MusicMapProps {
  pins: MapPinWithSong[];
  editable?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  openPinId?: string | null;
  onOpenPinChange?: (id: string | null) => void;
  /** The not-yet-saved place the admin just picked (search or map click). */
  draftPosition?: { lat: number; lng: number } | null;
  /** Fired when the admin drags the blue draft pin to refine its coordinates. */
  onDraftMove?: (lat: number, lng: number) => void;
}

export default function MusicMap({
  pins,
  editable = false,
  onMapClick,
  openPinId,
  onOpenPinChange,
  draftPosition = null,
  onDraftMove,
}: MusicMapProps) {
  const [internalOpen, setInternalOpen] = useState<string | null>(null);
  const skipPanRef = useRef(false);
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
      // Only the admin editor clamps zoom-out / locks to world bounds; the public
      // /map keeps its full world view (defaultZoom 2) and free panning.
      {...(editable
        ? {
            minZoom: 3,
            restriction: {
              latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
              strictBounds: true,
            },
          }
        : {})}
      className="h-full w-full"
      onClick={(e: MapMouseEvent) => {
        if (editable && onMapClick && e.detail.latLng) {
          onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
        }
      }}
    >
      <PanToDraft
        lat={draftPosition?.lat ?? null}
        lng={draftPosition?.lng ?? null}
        skipPanRef={skipPanRef}
      />
      <PanToActivePin
        pinId={activeId}
        lat={activePin?.lat ?? null}
        lng={activePin?.lng ?? null}
      />

      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          onClick={() => setOpen(pin.id)}
        >
          {pin.photo_thumb_url ? (
            <div className="border-2 border-black bg-white p-[3px] shadow-[0_3px_0_rgba(0,0,0,0.25)] transition-transform duration-150 hover:scale-110">
              {/* Plain <img>: marker thumbs are tiny, and next/image would need the
                  storage host in remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pin.photo_thumb_url}
                alt={`Memory at ${pin.place_name}`}
                className="block h-11 w-11 object-cover"
              />
            </div>
          ) : (
            <Pin background="#ff4242" borderColor="#000000" glyphColor="#ffffff" />
          )}
        </AdvancedMarker>
      ))}

      {draftPosition && (
        <AdvancedMarker
          position={draftPosition}
          draggable={!!onDraftMove}
          onDragEnd={(e) => {
            const ll = e.latLng;
            if (!ll || !onDraftMove) return;
            // Skip the auto-pan that PanToDraft would otherwise run for this
            // coordinate change, so the dropped pin stays exactly where placed.
            skipPanRef.current = true;
            onDraftMove(ll.lat(), ll.lng());
          }}
        >
          <Pin background="#2563eb" borderColor="#000000" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}

      {activePin && (
        <InfoWindow
          position={{ lat: activePin.lat, lng: activePin.lng }}
          onCloseClick={() => setOpen(null)}
          maxWidth={560}
        >
          <div className="space-y-2" style={{ fontFamily: SITE_FONT }}>
            {activePin.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePin.photo_url}
                alt={`Memory at ${activePin.place_name}`}
                loading="lazy"
                className="block max-h-64 w-full border-2 border-black object-cover"
              />
            )}
            <p className="text-[28px] font-bold">{activePin.place_name}</p>
            {formatMoment(activePin.taken_at) && (
              <p className="text-[18px]">{formatMoment(activePin.taken_at)}</p>
            )}
            {activePin.note && <p className="text-[20px] opacity-70">{activePin.note}</p>}
            <SongPopupCard song={activePin.songs} />
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}
