export const OVER_SPLIT_MIN_CARDS = 200;
export const OVER_SPLIT_SHORT_FRONT_RATIO = 0.6;
export const OVER_SPLIT_SHORT_FRONT_MAX_WORDS = 2;

function wordCount(front: string): number {
  const text = front
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
  if (text.length === 0) return 0;
  return text.split(/\s+/).length;
}

export function detectOverSplit(fronts: string[]): boolean {
  if (fronts.length < OVER_SPLIT_MIN_CARDS) return false;
  const shortFronts = fronts.filter(
    (front) => wordCount(front) <= OVER_SPLIT_SHORT_FRONT_MAX_WORDS
  ).length;
  return shortFronts / fronts.length >= OVER_SPLIT_SHORT_FRONT_RATIO;
}
