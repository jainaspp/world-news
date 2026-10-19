import { esc } from '../contentPage.js';
import { CIV_LINES, isCivLine } from './contract.js';

/**
 * Hub four-line filter.
 * Chips are 能量 / 信息 / 制度 / 貨幣, plus 全部.
 * A block joins only when every entry in its `lines` array is a CivLine,
 * so earth, city, and tech vocabularies stay out of this closed set.
 * The attribute order follows CIV_LINES. Matching is by token, not by order.
 */

export const LINE_FILTER_EMPTY = '這一線暫無匹配的階段或模式卡。';

/** Leading-space attribute, or an empty string when the block is not in the closed set. */
export function lineFilterAttrs(lines: readonly string[] | undefined): string {
  if (!lines?.length || lines.some((line) => !isCivLine(line))) return '';
  const kept = CIV_LINES.filter((line) => lines.includes(line));
  if (kept.length !== lines.length) return '';
  return ` data-lines="${kept.join(' ')}"`;
}

/** True when a selected line should hide this block. 全部 (empty) hides nothing. */
export function lineFilterHides(lines: readonly string[], selected: string): boolean {
  if (!selected) return false;
  return !lines.includes(selected);
}

/** One empty sentence, only after a line is chosen and nothing matches. */
export function lineFilterEmpty(groups: readonly (readonly string[])[], selected: string): boolean {
  if (!selected) return false;
  return groups.every((lines) => lineFilterHides(lines, selected));
}

/** Controls plus the paper sentence. The sentence stays hidden until script shows it. */
export function renderLineFilter(): string {
  const all = '<button type="button" class="chip" data-line="" aria-pressed="true">全部</button>';
  const chips = CIV_LINES.map((line) => `<button type="button" class="chip" data-line="${esc(line)}" aria-pressed="false">${esc(line)}</button>`).join('');
  return `<div class="line-filter" role="group" aria-label="按四線篩選階段與模式卡">${all}${chips}</div><p class="line-filter-empty" hidden>${esc(LINE_FILTER_EMPTY)}</p>`;
}
