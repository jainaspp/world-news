/** Ranked-list helpers. The layout choice itself lives in `?view=list`. */

export const LAYOUT_CARDS_HK = '卡片';
export const LAYOUT_LIST_HK = '列表';

/**
 * Outlet count already computed for the classic cards.
 * A single source is not a heat figure, so the row leaves it off.
 */
export function rankHeatCount(sourceCount: number): number | null {
  if (!Number.isFinite(sourceCount) || sourceCount < 2) return null;
  return Math.floor(sourceCount);
}
