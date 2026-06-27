import { describe, it, expect } from "vitest";
import { shouldSearch } from "./useDebounce";

describe("shouldSearch", () => {
  it("is false for blank or whitespace-only queries", () => {
    expect(shouldSearch("")).toBe(false);
    expect(shouldSearch("   ")).toBe(false);
  });

  it("is true once a non-empty term is present", () => {
    expect(shouldSearch("a")).toBe(true);
    expect(shouldSearch("  bon iver  ")).toBe(true);
  });

  it("respects a custom minimum length against the trimmed value", () => {
    expect(shouldSearch("ab", 3)).toBe(false);
    expect(shouldSearch(" abc ", 3)).toBe(true);
  });
});
