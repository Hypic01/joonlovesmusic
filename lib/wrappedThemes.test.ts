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

  it("every year has a layered background, valid text color, and sane plate", () => {
    for (const year of WRAPPED_YEARS) {
      const theme = getWrappedTheme(year);
      // background is a non-empty CSS image list (gradients only, hard-edged)
      expect(theme.background).toMatch(/gradient\(/);
      expect(theme.text).toMatch(HEX);
      if (theme.plate !== null) expect(theme.plate).toMatch(HEX);
      if (theme.rankText) expect(theme.rankText).toMatch(HEX);
      if (theme.shadow) expect(theme.shadow).toMatch(HEX);
    }
  });

  it("unknown year falls back to a complete theme", () => {
    const theme = getWrappedTheme(2099);
    expect(theme.background).toMatch(/gradient\(/);
    expect(theme.text).toMatch(HEX);
  });

  it("every year provides a solid plate so text stays legible", () => {
    // Joon's call (2026-07-09): all badges use the 2022/2024 look — decorated
    // cover background + solid center plate holding the text.
    for (const year of WRAPPED_YEARS) {
      expect(getWrappedTheme(year).plate).toMatch(HEX);
    }
  });

  it("ranks 1-3 get medal colors with a pixel shadow", () => {
    const theme = getWrappedTheme(2024);
    const gold = getRankNumberStyle(1, theme);
    const silver = getRankNumberStyle(2, theme);
    const bronze = getRankNumberStyle(3, theme);
    expect(gold.color).toBe("#FFD700");
    expect(silver.color).toBe("#E8ECF1");
    expect(bronze.color).toBe("#CD7F32");
    for (const s of [gold, silver, bronze]) expect(s.textShadow).toBeTruthy();
  });

  it("non-podium ranks use the theme rank color (cover-faithful accents)", () => {
    const t2019 = getWrappedTheme(2019);
    expect(getRankNumberStyle(14, t2019).color).toBe("#CDF564"); // lime "2019" numerals
    const t2018 = getWrappedTheme(2018);
    expect(getRankNumberStyle(14, t2018).color).toBe(t2018.text); // falls back to text
  });
});
