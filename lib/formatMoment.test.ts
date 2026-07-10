import { describe, it, expect } from "vitest";
import { formatMoment, toDateTimeLocalValue } from "./formatMoment";

describe("formatMoment", () => {
  it("formats an afternoon moment", () => {
    expect(formatMoment("2024-03-15T21:42")).toBe("Mar 15, 2024 · 9:42 PM");
  });
  it("accepts seconds from the DB and ignores them", () => {
    expect(formatMoment("2024-03-15T21:42:07")).toBe("Mar 15, 2024 · 9:42 PM");
  });
  it("formats midnight and noon as 12", () => {
    expect(formatMoment("2023-11-02T00:05")).toBe("Nov 2, 2023 · 12:05 AM");
    expect(formatMoment("2023-11-02T12:05")).toBe("Nov 2, 2023 · 12:05 PM");
  });
  it("keeps the minute zero-padded but not the day", () => {
    expect(formatMoment("2025-01-03T09:07")).toBe("Jan 3, 2025 · 9:07 AM");
  });
  it("returns null for empty, null, or garbage input", () => {
    expect(formatMoment(null)).toBeNull();
    expect(formatMoment(undefined)).toBeNull();
    expect(formatMoment("")).toBeNull();
    expect(formatMoment("not-a-date")).toBeNull();
    expect(formatMoment("2024-13-05T10:00")).toBeNull();
    expect(formatMoment("2024-05-32T10:00")).toBeNull();
    expect(formatMoment("2024-05-05T25:00")).toBeNull();
  });
});

describe("toDateTimeLocalValue", () => {
  it("renders a Date's local wall-clock fields, zero-padded, no seconds", () => {
    expect(toDateTimeLocalValue(new Date(2024, 2, 15, 21, 42, 7))).toBe("2024-03-15T21:42");
    expect(toDateTimeLocalValue(new Date(2025, 0, 3, 9, 7))).toBe("2025-01-03T09:07");
  });
});
