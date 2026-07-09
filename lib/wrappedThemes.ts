// Per-year Spotify Wrapped badge themes, hand-curated from each year's
// "Your Top Songs YYYY" cover art. colors = [background, accent stripe, extra
// accent]; text = designated readable color on that background.
// Tuning a year = editing one entry here.

export interface WrappedTheme {
  colors: [string, string, string];
  text: string;
}

export const WRAPPED_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

const THEMES: Record<number, WrappedTheme> = {
  2016: { colors: ["#2941AB", "#8AA8FF", "#CFF27E"], text: "#FFFFFF" },
  2017: { colors: ["#111111", "#FF4B6E", "#3EF0C5"], text: "#FFFFFF" },
  2018: { colors: ["#B02897", "#FF6BC1", "#2D0F41"], text: "#FFFFFF" },
  2019: { colors: ["#F94F6D", "#FFC864", "#2E77D0"], text: "#111111" },
  2020: { colors: ["#7358FF", "#B7FF36", "#1D1147"], text: "#FFFFFF" },
  2021: { colors: ["#0F0E17", "#00F5D4", "#F72585"], text: "#FFFFFF" },
  2022: { colors: ["#FF54B0", "#B4FF00", "#5C2E91"], text: "#111111" },
  2023: { colors: ["#FF3D5A", "#FFC0CB", "#7C3AED"], text: "#FFFFFF" },
  2024: { colors: ["#FF6437", "#FFD1B8", "#1D2769"], text: "#111111" },
  2025: { colors: ["#4F17D8", "#9BF0E1", "#FF7BAC"], text: "#FFFFFF" },
};

const FALLBACK_THEME: WrappedTheme = {
  colors: ["#111111", "#9FE870", "#FFFFFF"],
  text: "#FFFFFF",
};

export function getWrappedTheme(year: number): WrappedTheme {
  return THEMES[year] ?? FALLBACK_THEME;
}

export const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#E8ECF1",
  3: "#CD7F32",
};

export function getRankNumberStyle(
  rank: number,
  theme: WrappedTheme
): { color: string; textShadow?: string } {
  const medal = MEDAL_COLORS[rank];
  if (medal) {
    // Hard offset shadow keeps the metallic number readable on any theme
    // background (the gold-on-gold problem).
    const shadow = theme.text === "#FFFFFF" ? "#111111" : theme.colors[2];
    return { color: medal, textShadow: `3px 3px 0 ${shadow}` };
  }
  return { color: theme.text };
}
