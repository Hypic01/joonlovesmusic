import { describe, it, expect } from "vitest";
import {
  WRAPPED_YEARS,
  getWrappedTheme,
  getRankNumberStyle,
} from "@/lib/wrappedThemes";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("wrappedThemes", () => {
  it("covers every year 2016-2025", () => {
    expect(WRAPPED_YEARS).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it("every year has 3 valid hex colors and a valid text color", () => {
    for (const year of WRAPPED_YEARS) {
      const theme = getWrappedTheme(year);
      expect(theme.colors).toHaveLength(3);
      for (const c of theme.colors) expect(c).toMatch(HEX);
      expect(theme.text).toMatch(HEX);
      // text must differ from the background it sits on
      expect(theme.text.toLowerCase()).not.toBe(theme.colors[0].toLowerCase());
    }
  });

  it("unknown year falls back to a complete theme", () => {
    const theme = getWrappedTheme(2099);
    expect(theme.colors).toHaveLength(3);
    expect(theme.text).toMatch(HEX);
  });

  it("ranks 1-3 get medal colors with a pixel shadow, others get theme text", () => {
    const theme = getWrappedTheme(2024);
    const gold = getRankNumberStyle(1, theme);
    const silver = getRankNumberStyle(2, theme);
    const bronze = getRankNumberStyle(3, theme);
    const plain = getRankNumberStyle(14, theme);
    expect(gold.color).toBe("#FFD700");
    expect(silver.color).toBe("#E8ECF1");
    expect(bronze.color).toBe("#CD7F32");
    for (const s of [gold, silver, bronze]) expect(s.textShadow).toBeTruthy();
    expect(plain.color).toBe(theme.text);
    expect(plain.textShadow).toBeUndefined();
  });
});
