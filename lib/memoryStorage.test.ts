import { describe, it, expect } from "vitest";
import { storagePathFromPublicUrl } from "./memoryStorage";

describe("storagePathFromPublicUrl", () => {
  it("extracts the object path from a memories public URL", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/public/memories/9f3c-1.jpg"
      )
    ).toBe("9f3c-1.jpg");
  });
  it("strips query strings and decodes escapes", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/public/memories/a%20b.jpg?download=1"
      )
    ).toBe("a b.jpg");
  });
  it("returns null for URLs outside the memories bucket or garbage", () => {
    expect(
      storagePathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/covers/x.jpg")
    ).toBeNull();
    expect(storagePathFromPublicUrl("not a url")).toBeNull();
    expect(
      storagePathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/memories/")
    ).toBeNull();
  });
});
