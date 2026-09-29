/** American odds → decimal, per docs/GAME_RULES.md §4: o>0 → 1+o/100, o<0 → 1+100/|o|. */
export function americanToDecimal(o: number): number {
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

/** Formats American odds for display: "+150", "−200" (em-dash-free minus, U+2212). */
export function formatAmerican(o: number): string {
  return o > 0 ? `+${o}` : `−${Math.abs(o)}`;
}

/** Implied probability from American odds (no vig removal). */
export function impliedProbability(o: number): number {
  return o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
}

export function median(nums: number[]): number {
  if (nums.length === 0) {
    throw new Error('median: empty array');
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
