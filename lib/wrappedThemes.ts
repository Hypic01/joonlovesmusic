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
// shadow:     hard offset shadow behind the LABELS (never the same color as
//             text — that smears it). rankShadow: shadow behind the rank
//             number only (defaults to shadow).

export interface WrappedTheme {
  background: string;
  plate: string | null;
  plateRing?: string;
  text: string;
  rankText?: string;
  shadow?: string;
  rankShadow?: string;
}

export const WRAPPED_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

const flat = (color: string) => `linear-gradient(${color}, ${color})`;

const THEMES: Record<number, WrappedTheme> = {
  // Red-orange field, teal zigzag band up top, white dot grid at the bottom;
  // text plate in the brighter field red.
  2016: {
    background: [
      "repeating-linear-gradient(45deg, #7DE0D3 0 7px, #A3271C 7px 14px) left top / 100% 12px no-repeat",
      "radial-gradient(circle at 4px 4px, rgba(255,255,255,0.9) 1.6px, transparent 2px) left 0 bottom 14px / 11px 10px repeat-x",
      "radial-gradient(circle at 4px 4px, rgba(255,255,255,0.9) 1.6px, transparent 2px) left 6px bottom 4px / 11px 10px repeat-x",
      flat("#E03A24"),
    ].join(", "),
    plate: "#FF4B33",
    text: "#FFFFFF",
    shadow: "#8F1D12",
  },
  // Deep green with pink torn shapes + red dots in opposite corners; plate in
  // the cover's field green.
  2017: {
    background: [
      "radial-gradient(circle at 88% 8%, #F2A0BC 0 26%, transparent 26.5%)",
      "radial-gradient(circle at 74% 3%, #D7263D 0 7%, transparent 7.5%)",
      "radial-gradient(circle at 97% 30%, #D7263D 0 5%, transparent 5.5%)",
      "radial-gradient(circle at 8% 92%, #F2A0BC 0 12%, transparent 12.5%)",
      flat("#145C2E"),
    ].join(", "),
    plate: "#1B7C3E",
    text: "#FFFFFF",
    shadow: "#0C3D1E",
  },
  // Lavender pixel checker behind the cover's yellow: yellow plate, purple
  // type (inverse of the yellow-on-lavender cover text, for legibility).
  2018: {
    background: [
      "repeating-conic-gradient(#C9B1E4 0deg 90deg, #D9C6EE 90deg 180deg) top left / 32px 32px",
      flat("#C9B1E4"),
    ].join(", "),
    plate: "#FBF15C",
    text: "#6A4E93",
  },
  // Deep magenta with lime corner wedges + a white diagonal; bright magenta
  // plate, white wordmark, lime numerals like the cover.
  2019: {
    background: [
      "linear-gradient(135deg, #CDF564 0 22%, transparent 22.5%)",
      "linear-gradient(315deg, #CDF564 0 14%, transparent 14.5%)",
      "linear-gradient(135deg, transparent 0 24%, #FFFFFF 24% 27%, transparent 27.5%)",
      flat("#C40E75"),
    ].join(", "),
    plate: "#EB158D",
    text: "#FFFFFF",
    rankText: "#CDF564",
    shadow: "#7E0A4C",
  },
  // Deeper teal field with magenta/white bullseyes in the corners; mint plate
  // with the cover's magenta type.
  2020: {
    background: [
      "radial-gradient(circle at 100% 0%, #DD1D8E 0 12px, #FFFFFF 12px 22px, #DD1D8E 22px 32px, #FFFFFF 32px 42px, transparent 42px)",
      "radial-gradient(circle at 0% 100%, #DD1D8E 0 10px, #FFFFFF 10px 18px, #DD1D8E 18px 26px, transparent 26px)",
      flat("#8ECFCB"),
    ].join(", "),
    plate: "#A5DCD9",
    text: "#B80E70",
    rankShadow: "#FFFFFF",
  },
  // Deeper lime field crossed by tan ribbons; lime plate, deep purple type.
  2021: {
    background: [
      "linear-gradient(115deg, transparent 0 55%, #D9BCA3 55% 72%, transparent 72%)",
      "linear-gradient(115deg, transparent 0 14%, #D9BCA3 14% 26%, transparent 26%)",
      flat("#B8E64F"),
    ].join(", "),
    plate: "#CDF564",
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
  // Deeper periwinkle with thermal heat-map blobs in opposite corners;
  // periwinkle plate, black type.
  2023: {
    background: [
      "radial-gradient(circle at 90% 6%, #FFE45C 0 9%, #FF9A3C 9% 15%, #EF5A69 15% 20%, transparent 20.5%)",
      "radial-gradient(circle at 6% 92%, #FFE45C 0 8%, #FF9A3C 8% 13%, #EF5A69 13% 18%, transparent 18.5%)",
      flat("#A29BE8"),
    ].join(", "),
    plate: "#B7B1F0",
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
  // Warm cream field with black dashed strips top and bottom and a violet
  // dot; cream plate, black type, blue-violet numerals.
  2025: {
    background: [
      "repeating-linear-gradient(90deg, #141414 0 12px, #F4F0EA 12px 24px) 0 12% / 100% 10px no-repeat",
      "repeating-linear-gradient(90deg, #141414 0 12px, #F4F0EA 12px 24px) 0 88% / 100% 10px no-repeat",
      "radial-gradient(circle at 90% 50%, #7A6BEB 0 8%, transparent 8.5%)",
      flat("#E8E2D8"),
    ].join(", "),
    plate: "#F4F0EA",
    text: "#141414",
    rankText: "#7A6BEB",
    rankShadow: "#141414",
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
    return {
      color: medal,
      textShadow: `3px 3px 0 ${theme.rankShadow ?? theme.shadow ?? "#111111"}`,
    };
  }
  const color = theme.rankText ?? theme.text;
  const shadow = theme.rankShadow ?? theme.shadow;
  return {
    color,
    textShadow: shadow ? `3px 3px 0 ${shadow}` : undefined,
  };
}
