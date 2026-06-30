"use client";

import Image from "next/image";
import type { Album } from "@/types/database";

interface AlbumCardProps {
  album: Album;
  priority?: boolean;
}

export default function AlbumCard({ album, priority = false }: AlbumCardProps) {
  return (
    <div className="flex flex-col">
      {album.cover_url ? (
        <Image
          src={album.cover_url}
          alt={`${album.name} cover`}
          width={300}
          height={300}
          className="w-full aspect-square object-cover border-2 border-black"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <div className="w-full aspect-square bg-neutral-300 border-2 border-black" />
      )}
      <div className="mt-2">
        <h3 className="text-[16px] md:text-[18px] font-bold leading-tight truncate">
          {album.name}
        </h3>
        <p className="text-[14px] md:text-[16px] opacity-70 truncate">
          {album.artist}
        </p>
      </div>
    </div>
  );
}
