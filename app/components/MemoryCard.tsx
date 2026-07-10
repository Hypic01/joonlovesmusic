import Link from "next/link";
import type { MapPin } from "@/types/database";
import { formatMoment } from "@/lib/formatMoment";

interface MemoryCardProps {
  pin: MapPin;
}

// A song-page memory: photo, place, moment, note — links to the exact pin on /map.
export default function MemoryCard({ pin }: MemoryCardProps) {
  const moment = formatMoment(pin.taken_at);
  return (
    <Link
      href={`/map?pin=${pin.id}`}
      className="flex w-full max-w-[420px] items-center gap-4 border-2 border-black bg-white p-3 hover:border-(--color-brand-red)"
    >
      {pin.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pin.photo_thumb_url ?? pin.photo_url}
          alt={`Memory at ${pin.place_name}`}
          loading="lazy"
          className="h-24 w-24 shrink-0 border border-black object-cover"
        />
      ) : (
        <div className="h-24 w-24 shrink-0 bg-neutral-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-bold">{pin.place_name}</p>
        {(pin.city || pin.country) && (
          <p className="truncate text-[16px] opacity-70">
            {[pin.city, pin.country].filter(Boolean).join(", ")}
          </p>
        )}
        {moment && <p className="text-[16px]">{moment}</p>}
        {pin.note && <p className="truncate text-[14px] italic opacity-60">&ldquo;{pin.note}&rdquo;</p>}
      </div>
    </Link>
  );
}
