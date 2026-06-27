"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import Navbar from "../components/Navbar";
import MusicMap from "../components/MusicMap";
import MapSearch from "../components/MapSearch";
import PinTree from "../components/PinTree";
import { supabase } from "@/lib/supabase";
import type { MapPinWithSong } from "@/lib/mapSearch";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function MapPage() {
  const [pins, setPins] = useState<MapPinWithSong[]>([]);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [filterIds, setFilterIds] = useState<string[] | null>(null);

  useEffect(() => {
    supabase
      .from("map_pins")
      .select("*, songs(*)")
      .then(({ data }) => {
        if (data) setPins(data as unknown as MapPinWithSong[]);
      });
  }, []);

  if (!apiKey) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <p className="p-8">Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable it.</p>
        </div>
      </main>
    );
  }

  const visiblePins = filterIds ? pins.filter((p) => filterIds.includes(p.id)) : pins;

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 flex h-full flex-col pb-5">
        <Navbar />
        <APIProvider apiKey={apiKey}>
          <div className="z-20 flex items-center gap-3 px-1 py-3">
            <MapSearch
              pins={pins}
              onFocusPins={(ids) => {
                setFilterIds(ids);
                setOpenPinId(ids.length === 1 ? ids[0] : null);
              }}
            />
            {filterIds && (
              <button
                type="button"
                onClick={() => { setFilterIds(null); setOpenPinId(null); }}
                className="border-2 border-black px-3 py-2 whitespace-nowrap hover:bg-neutral-100"
              >
                Show all
              </button>
            )}
          </div>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[2fr_0.7fr] lg:overflow-hidden">
            {/* LEFT: the map */}
            <div className="min-h-80 border-2 border-black lg:min-h-0">
              <MusicMap pins={visiblePins} openPinId={openPinId} onOpenPinChange={setOpenPinId} />
            </div>

            {/* RIGHT: categorized pin list — Country -> City -> Place */}
            <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
              <h2 className="text-[24px] font-bold">Pins ({pins.length})</h2>
              {pins.length === 0 ? (
                <p className="text-[16px] opacity-70">No pins yet</p>
              ) : (
                <PinTree
                  pins={pins}
                  activePinId={openPinId}
                  onFocus={(p) => {
                    setFilterIds(null);
                    setOpenPinId(p.id);
                  }}
                />
              )}
            </div>
          </div>
        </APIProvider>
      </div>
    </main>
  );
}
