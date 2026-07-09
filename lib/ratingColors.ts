/**
 * Get the background color for a rating value
 * Uses a 3-color gradient:
 * - Red (#FF0000) for unfavorable (0-49)
 * - Yellow (#FFCC33) for mixed (50-69)
 * - Green (#66CC33) for favorable (70-100)
 */

/** Neutral gray for songs without a rating yet (unrated Wrapped imports). */
const UNRATED_COLOR = "#D4D4D4";

export function getRatingColor(rating: number | null | undefined): string {
  if (rating == null) {
    return UNRATED_COLOR;
  }
  // Clamp rating between 0 and 100
  const clampedRating = Math.max(0, Math.min(100, rating));

  // Red for unfavorable (0-49)
  if (clampedRating < 50) {
    return "#FF0000";
  }

  // Yellow for mixed/okay (50-69)
  if (clampedRating < 70) {
    return "#FFCC33";
  }

  // Green for favorable (70-100)
  return "#66CC33";
}

/** Score-block text: the rating number, or an en-dash when unrated. */
export function displayRating(rating: number | null | undefined): string {
  return rating == null ? "–" : String(rating);
}
