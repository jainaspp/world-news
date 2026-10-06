/** 快訊 is only for a headline under 30 minutes old, or an explicit backend flag. */

export const BREAKING_MS = 30 * 60 * 1000;
export const BREAKING_CAP = 3;

export interface BreakingCandidate {
  id: string;
  pubDate?: string;
  breaking?: boolean;
}

export function isBreaking(item: BreakingCandidate, now = Date.now()): boolean {
  if (item.breaking === true) return true;
  if (!item.pubDate) return false;
  const published = Date.parse(item.pubDate);
  if (Number.isNaN(published)) return false;
  const age = now - published;
  return age >= 0 && age < BREAKING_MS;
}

/** Newest qualifying ids, capped so one viewport never shows more than three 快訊 badges. */
export function breakingIds(items: BreakingCandidate[], now = Date.now(), cap = BREAKING_CAP): Set<string> {
  const ranked = items
    .filter((item) => isBreaking(item, now))
    .map((item) => ({ id: item.id, at: Date.parse(item.pubDate || '') || 0 }))
    .sort((a, b) => b.at - a.at);
  return new Set(ranked.slice(0, cap).map((item) => item.id));
}
