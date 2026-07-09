// Per-year Spotify Wrapped badge themes, recreated from the REAL "Your Top
// Songs YYYY" playlist covers (pulled and eyeballed 2026-07-09). Every layer
// uses hard color stops — no soft blends — to stay on the site's pixel style.
//
// background: CSS background layers painted on the card (last layer = base).
// plate:      solid color behind the text when the background is busy, like
//             the covers whose title sits on a center shape (2022 clover,
//             2024 diamond core). null = text sits straight on the background.
// plateRing:  box-shadow ring around the plate (2022's yellow spike ring).
// text:       label color. rankText: non-podium rank color (defaults to text).
// shadow:     hard offset shadow color for text on loud backgrounds.

export interface WrappedTheme {
  background: string;
  plate: string | null;
  plateRing?: string;
  text: string;
  rankText?: string;
  shadow?: string;
}

export const WRAPPED_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

const flat = (color: string) => `linear-gradient(${color}, ${color})`;

const THEMES: Record<number, WrappedTheme> = {
  // Red-orange field, teal zigzag band up top, white dot grid at the bottom.
  2016: {
    background: [
      "repeating-linear-gradient(45deg, #7DE0D3 0 7px, #B72E22 7px 14px) left top / 100% 12px no-repeat",
      "radial-gradient(circle at 4px 4px, rgba(255,255,255,0.9) 1.6px, transparent 2px) left 0 bottom 16px / 11px 10px repeat-x",
      "radial-gradient(circle at 4px 4px, rgba(255,255,255,0.9) 1.6px, transparent 2px) left 6px bottom 6px / 11px 10px repeat-x",
      flat("#FF4B33"),
    ].join(", "),
    plate: null,
    text: "#FFFFFF",
    shadow: "#8F1D12",
  },
  // Deep green with the pink torn shape + red dots in the top-right corner.
  2017: {
    background: [
      "radial-gradient(circle at 86% 10%, #F2A0BC 0 24%, transparent 24.5%)",
      "radial-gradient(circle at 76% 4%, #D7263D 0 6%, transparent 6.5%)",
      "radial-gradient(circle at 96% 26%, #D7263D 0 4.5%, transparent 5%)",
      flat("#1B7C3E"),
    ].join(", "),
    plate: null,
    text: "#FFFFFF",
    shadow: "#0C3D1E",
  },
  // Lavender field, everything set in big yellow type.
  2018: {
    background: flat("#C9B1E4"),
    plate: null,
    text: "#FBF15C",
    shadow: "#6A4E93",
  },
  // Hot magenta, white wordmark, lime "2019" numerals.
  2019: {
    background: flat("#EB158D"),
    plate: null,
    text: "#FFFFFF",
    rankText: "#CDF564",
    shadow: "#7E0A4C",
  },
  // Mint field with magenta outline type.
  2020: {
    background: flat("#A5DCD9"),
    plate: null,
    text: "#DD1D8E",
    shadow: "#FFFFFF",
  },
  // Lime field crossed by tan ribbons, deep purple type.
  2021: {
    background: [
      "linear-gradient(115deg, transparent 0 58%, #D9BCA3 58% 74%, transparent 74%)",
      "linear-gradient(115deg, transparent 0 12%, #D9BCA3 12% 22%, transparent 22%)",
      flat("#CDF564"),
    ].join(", "),
    plate: null,
    text: "#4B2775",
  },
  // Black field, pink corner blobs, text on the green clover with its yellow
  // spike ring.
  2022: {
    background: [
      "radial-gradient(circle at 0% 0%, #F16CB6 0 20%, transparent 20.5%)",
      "radial-gradient(circle at 100% 0%, #F16CB6 0 20%, transparent 20.5%)",
      "radial-gradient(circle at 0% 100%, #F16CB6 0 20%, transparent 20.5%)",
      "radial-gradient(circle at 100% 100%, #F16CB6 0 20%, transparent 20.5%)",
      flat("#141414"),
    ].join(", "),
    plate: "#1ED760",
    plateRing: "0 0 0 4px #EFFF6B",
    text: "#0B3B1D",
  },
  // Periwinkle with thermal heat-map blobs in opposite corners, black type.
  2023: {
    background: [
      "radial-gradient(circle at 88% 8%, #FFE45C 0 7%, #FF9A3C 7% 12%, #EF5A69 12% 16%, transparent 16.5%)",
      "radial-gradient(circle at 8% 88%, #FFE45C 0 6%, #FF9A3C 6% 10%, #EF5A69 10% 14%, transparent 14.5%)",
      flat("#B7B1F0"),
    ].join(", "),
    plate: null,
    text: "#141414",
  },
  // Concentric pixel diamond: blue rings out from a yellow core, text on the
  // core.
  2024: {
    background:
      "radial-gradient(closest-side at 50% 50%, #F8FF3B 0 42%, #2ADCC8 42% 58%, #2E5CF0 58% 74%, #1D2FA8 74% 90%, #10163F 90% 100%)",
    plate: "#F8FF3B",
    text: "#141414",
  },
  // Cream field, black dashed strip, blue-violet bubble numerals.
  2025: {
    background: [
      "repeating-linear-gradient(90deg, #141414 0 12px, #F4F0EA 12px 24px) 0 62% / 100% 12px no-repeat",
      flat("#F4F0EA"),
    ].join(", "),
    plate: null,
    text: "#141414",
    rankText: "#7A6BEB",
    shadow: "#141414",
  },
};

const FALLBACK_THEME: WrappedTheme = {
  background: flat("#111111"),
  plate: null,
  text: "#FFFFFF",
  rankText: "#9FE870",
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
    return { color: medal, textShadow: `3px 3px 0 ${theme.shadow ?? "#111111"}` };
  }
  const color = theme.rankText ?? theme.text;
  return {
    color,
    textShadow: theme.shadow ? `3px 3px 0 ${theme.shadow}` : undefined,
  };
}
