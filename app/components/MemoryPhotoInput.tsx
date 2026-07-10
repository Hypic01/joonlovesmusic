"use client";

import { useRef, useState } from "react";
import { validateMemoryFile } from "@/lib/imageRenditions";
import { extractPhotoMeta, type PhotoMeta } from "@/lib/photoExif";

export interface PhotoDraft {
  file: File;
  previewUrl: string;
  hasGps: boolean;
}

interface MemoryPhotoInputProps {
  photo: PhotoDraft | null;
  existingPhotoUrl?: string | null;
  takenAt: string;
  onTakenAtChange: (value: string) => void;
  onPick: (draft: PhotoDraft, meta: PhotoMeta) => void;
  onClear: () => void;
  disabled?: boolean;
  idPrefix: string;
}

// Optional photo + moment capture for a pin. The photo only ever prefills —
// EXIF GPS/time land in the parent's draft state and stay fully editable.
export default function MemoryPhotoInput({
  photo,
  existingPhotoUrl = null,
  takenAt,
  onTakenAtChange,
  onPick,
  onClear,
  disabled = false,
  idPrefix,
}: MemoryPhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateMemoryFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setReading(true);
    try {
      const meta = await extractPhotoMeta(file);
      onPick(
        {
          file,
          previewUrl: URL.createObjectURL(file),
          hasGps: meta.lat != null && meta.lng != null,
        },
        meta
      );
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shownPreview = photo?.previewUrl ?? existingPhotoUrl ?? null;

  return (
    <div className="space-y-2">
      <label className="block font-semibold">
        Photo (optional) — GPS and time auto-fill
      </label>
      {error && (
        <p
          role="alert"
          className="border-2 border-(--color-brand-red) bg-red-50 px-3 py-2 text-sm font-semibold text-(--color-brand-red)"
        >
          {error}
        </p>
      )}
      <div className="flex items-start gap-3">
        {shownPreview ? (
          // HEIC previews can't render in Chrome; the broken-image state is
          // acceptable in admin — the moment line + filename confirm the pick.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPreview}
            alt="Memory photo preview"
            className="h-24 w-24 border-2 border-black object-cover"
          />
        ) : (
          <button
            type="button"
            disabled={disabled || reading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center border-2 border-dashed border-black text-sm hover:border-(--color-brand-red) disabled:opacity-50 cursor-pointer"
          >
            {reading ? "Reading…" : "Add photo"}
          </button>
        )}
        <div className="space-y-1">
          {shownPreview && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || reading}
                className="border-2 border-black px-3 py-1 text-sm disabled:opacity-50 cursor-pointer"
              >
                {reading ? "Reading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onClear();
                }}
                disabled={disabled}
                className="border-2 border-black px-3 py-1 text-sm text-(--color-brand-red) disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}
          <p className="text-sm opacity-70">JPEG, PNG, HEIC — up to 20MB</p>
          {photo && !photo.hasGps && (
            <p className="text-sm font-semibold text-(--color-brand-red)">
              No location in this photo — pick the place (search / click / drag).
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        id={`${idPrefix}-photo`}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Choose a memory photo"
      />
      <label htmlFor={`${idPrefix}-taken-at`} className="block font-semibold">
        Moment (optional)
      </label>
      <input
        id={`${idPrefix}-taken-at`}
        type="datetime-local"
        value={takenAt}
        onChange={(e) => onTakenAtChange(e.target.value)}
        disabled={disabled}
        className="border-2 border-black bg-white px-3 py-2 disabled:opacity-50"
      />
    </div>
  );
}
