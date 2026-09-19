export type RatingValue = number | string | null | undefined;

function numericRating(value: RatingValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatRatingScore(value: RatingValue): string | null {
  const parsed = numericRating(value);
  if (parsed === null) return null;

  const rounded = Math.round((parsed + Number.EPSILON) * 10) / 10;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${display}/5`;
}

export function formatRatingAccessibility(value: RatingValue): string | null {
  const score = formatRatingScore(value);
  return score ? `التقييم ${score.replace("/", " من ")}` : null;
}