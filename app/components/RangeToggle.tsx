import type { TimeRange } from "@/lib/spotify";

export const RANGES: TimeRange[] = ["short_term", "medium_term", "long_term"];

export const RANGE_LABELS: Record<TimeRange, string> = {
  short_term: "4 weeks",
  medium_term: "6 months",
  long_term: "all time",
};

// Spotify's buckets are approximate, and "all time" is its longest window.
const RANGE_HINTS: Record<TimeRange, string> = {
  short_term: "spotify: roughly the last 4 weeks",
  medium_term: "spotify: roughly the last 6 months",
  long_term: "spotify: its longest window (several years of listening)",
};

interface RangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="flex gap-2">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          title={RANGE_HINTS[range]}
          className={`px-3 lg:px-4 py-2 text-[14px] lg:text-[16px] border-2 border-black font-semibold cursor-pointer ${
            value === range
              ? "bg-(--color-brand-red) text-white"
              : "bg-white hover:border-(--color-brand-red)"
          }`}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
