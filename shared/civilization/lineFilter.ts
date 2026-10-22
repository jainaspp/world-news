import { esc } from '../contentPage.js';
import { CIV_LINES, isCivLine } from './contract.js';

/**
 * Hub four-line filter.
 * Chips are 能量 / 信息 / 制度 / 貨幣, plus 全部.
 * A block joins only when every entry in its `lines` array is a CivLine,
 * so earth, city, and tech vocabularies stay out of this closed set.
 * The attribute order follows CIV_LINES. Matching is by token, not by order.
 */

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

/** One empty result, only after a line is chosen and nothing in these groups matches. */
export function lineFilterEmpty(groups: readonly (readonly string[])[], selected: string): boolean {
  if (!selected) return false;
  return groups.every((lines) => lineFilterHides(lines, selected));
}

export interface LineFilterTally {
  stages: number;
  patterns: number;
}

/** Participating groups only. Outsider vocabularies and duplicates stay out of the count. */
export function lineFilterTally(groups: readonly (readonly string[])[], selected: string): number {
  return groups.filter((lines) => lineFilterAttrs(lines) !== '' && !lineFilterHides(lines, selected)).length;
}

function tallyPiece(count: number, measure: string, noun: string, empty: string): string {
  if (count === 0) return empty;
  return `${count} ${measure}${noun}`;
}

/**
 * Status sentence. The name is 全部 or one CivLine.
 * Counts are written as digits; zero uses 暫無. No gloss beyond the closed set.
 */
export function lineFilterStatus(selected: string, tally: LineFilterTally): string {
  const name = selected === '' ? '全部' : (isCivLine(selected) ? selected : '');
  if (!name) return '';
  const stages = tallyPiece(tally.stages, '個', '階段', '暫無階段');
  const patterns = tallyPiece(tally.patterns, '張', '模式卡', '暫無模式卡');
  return `${name}：${stages}，${patterns}。`;
}

/** Pattern-board echo for one selected line. 全部 returns an empty string. */
export function lineFilterPatternStatus(selected: string, patterns: number): string {
  if (!isCivLine(selected)) return '';
  const body = tallyPiece(patterns, '張', '模式卡', '暫無模式卡');
  return `${selected}：${body}。`;
}

function filterChip(stageGroups: readonly (readonly string[])[], patternGroups: readonly (readonly string[])[], line: string, pressed: boolean): string {
  const stages = lineFilterTally(stageGroups, line);
  const patterns = lineFilterTally(patternGroups, line);
  const status = lineFilterStatus(line, { stages, patterns });
  const patternStatus = lineFilterPatternStatus(line, patterns);
  const patternAttr = patternStatus ? ` data-pattern-status="${esc(patternStatus)}"` : '';
  const label = line ? esc(line) : '全部';
  return `<button type="button" class="chip" data-line="${esc(line)}" data-stages="${stages}" data-patterns="${patterns}" data-status="${esc(status)}"${patternAttr} aria-pressed="${pressed ? 'true' : 'false'}" aria-label="${esc(status)}"><span class="line-filter-name">${label}</span><span class="line-filter-count">${stages}<span class="line-filter-unit"> 階段</span></span></button>`;
}

/**
 * Controls plus the count sentence.
 * The sentence is server-written from the tallies. Script only swaps which button's sentence is shown.
 * A zero stage count on 全部 renders the paper empty state immediately.
 */
export function renderLineFilter(stageGroups: readonly (readonly string[])[], patternGroups: readonly (readonly string[])[]): string {
  const tally = { stages: lineFilterTally(stageGroups, ''), patterns: lineFilterTally(patternGroups, '') };
  const status = lineFilterStatus('', tally);
  const empty = tally.stages === 0 ? ' is-empty' : '';
  const all = filterChip(stageGroups, patternGroups, '', true);
  const chips = CIV_LINES.map((line) => filterChip(stageGroups, patternGroups, line, false)).join('');
  return `<div class="line-filter" role="group" aria-labelledby="line-filter-legend" aria-controls="pattern-board"><p class="line-filter-legend" id="line-filter-legend">按四線篩選模式卡</p><div class="line-filter-row">${all}${chips}</div></div><p class="line-filter-status${empty}" id="line-filter-status" role="status">${esc(status)}</p>`;
}
