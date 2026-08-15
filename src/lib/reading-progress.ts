/**
 * Pure reading-progress math (no DB imports) so it is trivially unit-testable.
 * Progress accounts for position *within* the current chapter, meaning a reader
 * who scrolls 90% through chapter 1 of 5 records 18% — not 0% and not 20%.
 */
export function computeProgress(
  chapterNumber: number,
  scrollRatio: number,
  totalChapters: number
): number {
  if (totalChapters <= 0) return 0;
  const clampedRatio = Math.min(Math.max(scrollRatio, 0), 1);
  const idx = Math.max(chapterNumber - 1, 0);
  const pct = ((idx + clampedRatio) / totalChapters) * 100;
  return Math.min(100, Math.round(pct));
}
