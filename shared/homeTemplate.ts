/** Homepage template choice, stored on the device. The standard feed stays the default. */

export const HOME_TEMPLATE_KEY = 'wn-home-template';

export type HomeTemplate = 'classic' | 'rank';

/** Traditional Chinese copy for the server-rendered shell. The client translates the same lines. */
export const TEMPLATE_TO_RANK_HK = '改用標題榜';
export const TEMPLATE_TO_CLASSIC_HK = '返回標準版';
export const RANK_TAGLINE_HK = '公開標題依序排列，方便快速瀏覽。';

export function readHomeTemplate(storage: Pick<Storage, 'getItem'> | null | undefined): HomeTemplate {
  try {
    return storage?.getItem(HOME_TEMPLATE_KEY) === 'rank' ? 'rank' : 'classic';
  } catch {
    return 'classic';
  }
}

export function writeHomeTemplate(
  template: HomeTemplate,
  storage: Pick<Storage, 'setItem'> | null | undefined,
): void {
  try {
    storage?.setItem(HOME_TEMPLATE_KEY, template);
  } catch {
    /* private mode or a full store */
  }
}

/**
 * Outlet count already computed for the classic cards.
 * A single source is not a heat figure, so the row leaves it off.
 */
export function rankHeatCount(sourceCount: number): number | null {
  if (!Number.isFinite(sourceCount) || sourceCount < 2) return null;
  return Math.floor(sourceCount);
}
