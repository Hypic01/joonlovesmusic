"use client";

import { useEffect, useRef, useState } from "react";

interface SortDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Shared sort control matching the music-ratings page dropdown
// (app/musics/page.tsx): button trigger + rotating chevron, bordered panel,
// outside-click close. Generic over option values so any page can reuse it.
export default function SortDropdown({ options, value, onChange, className }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-3 px-4 py-4 text-[18px] border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer font-semibold w-full"
      >
        <span>{current?.label ?? "Sort"}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 border-2 border-black bg-white z-50">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-[16px] text-left hover:bg-neutral-100 cursor-pointer ${
                option.value === value ? "bg-neutral-100 font-semibold" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
