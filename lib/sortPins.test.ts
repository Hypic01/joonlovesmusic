import { describe, it, expect } from "vitest";
import { comparePinsByCreatedAt, sortPins, sortPinsForList } from "./sortPins";

const rows = [
  { id: "a", created_at: "2024-01-01T00:00:00Z" },
  { id: "b", created_at: "2024-03-01T00:00:00Z" },
  { id: "c", created_at: "2024-02-01T00:00:00Z" },
];

describe("sortPins", () => {
  it("orders newest first", () => {
    expect(sortPins(rows, "newest").map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("orders oldest first", () => {
    expect(sortPins(rows, "oldest").map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...rows];
    sortPins(rows, "newest");
    expect(rows).toEqual(copy);
  });

  it("treats unparseable dates as epoch 0", () => {
    const mixed = [
      { id: "x", created_at: "not-a-date" },
      { id: "y", created_at: "2024-01-01T00:00:00Z" },
    ];
    expect(sortPins(mixed, "newest").map((r) => r.id)).toEqual(["y", "x"]);
    expect(sortPins(mixed, "oldest").map((r) => r.id)).toEqual(["x", "y"]);
  });
});

describe("sortPinsForList", () => {
  const listRows = [
    { id: "a", created_at: "2024-01-01T00:00:00Z", taken_at: "2024-05-01T10:00", songs: { rating: 80 } },
    { id: "b", created_at: "2024-03-01T00:00:00Z", taken_at: null, songs: { rating: null } },
    { id: "c", created_at: "2024-02-01T00:00:00Z", taken_at: "2025-01-15T21:42", songs: { rating: 99 } },
    { id: "d", created_at: "2024-04-01T00:00:00Z", taken_at: "2023-11-02T07:18", songs: { rating: 80 } },
  ];

  it("passes newest/oldest through to created_at ordering", () => {
    expect(sortPinsForList(listRows, "newest").map((r) => r.id)).toEqual(["d", "b", "c", "a"]);
    expect(sortPinsForList(listRows, "oldest").map((r) => r.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("orders score high to low with unrated last and newest-added tiebreak", () => {
    // c (99) first; a and d tie at 80 → d added later wins; b (unrated) last
    expect(sortPinsForList(listRows, "score").map((r) => r.id)).toEqual(["c", "d", "a", "b"]);
  });

  it("orders moment newest first with moment-less pins last", () => {
    expect(sortPinsForList(listRows, "moment").map((r) => r.id)).toEqual(["c", "a", "d", "b"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...listRows];
    sortPinsForList(listRows, "score");
    expect(listRows).toEqual(copy);
  });
});

describe("comparePinsByCreatedAt", () => {
  it("returns positive when a is older under newest order", () => {
    expect(comparePinsByCreatedAt(rows[0], rows[1], "newest")).toBeGreaterThan(0);
  });

  it("returns negative when a is older under oldest order", () => {
    expect(comparePinsByCreatedAt(rows[0], rows[1], "oldest")).toBeLessThan(0);
  });
});
