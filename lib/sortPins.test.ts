import { describe, it, expect } from "vitest";
import { comparePinsByCreatedAt, sortPins } from "./sortPins";

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

describe("comparePinsByCreatedAt", () => {
  it("returns positive when a is older under newest order", () => {
    expect(comparePinsByCreatedAt(rows[0], rows[1], "newest")).toBeGreaterThan(0);
  });

  it("returns negative when a is older under oldest order", () => {
    expect(comparePinsByCreatedAt(rows[0], rows[1], "oldest")).toBeLessThan(0);
  });
});
