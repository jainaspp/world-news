/**
 * Civilization deep-read contract.
 *
 * Reading blocks, chronicle milestone blocks, and pattern cards share
 * `CivReadingShape`. Pattern cards add the mechanism fields and stay data:
 * a new card is a new object, not a new route or template branch.
 *
 * Field list, limits, and the closed line set: SCHEMA.md
 */

export const CIV_LINES = ['能量', '信息', '制度', '貨幣'] as const;

export type CivLine = (typeof CIV_LINES)[number];

export function isCivLine(value: string): value is CivLine {
  return (CIV_LINES as readonly string[]).includes(value);
}

export interface CivProduct {
  name: string;
  detail: string;
  kind?: string;
}

export interface CivDriver {
  name: string;
  detail: string;
}

export interface CivSource {
  name: string;
  url: string;
  /** `mechanism` marks the source the mechanism sentence mainly relies on. */
  supports?: 'mechanism';
}

/** Fields shared by ReadingBlock, ChronicleMilestoneBlock, and CivCard. */
export interface CivReadingShape {
  event: string;
  eventDetail: string;
  products: readonly CivProduct[];
  drivers: readonly CivDriver[];
  impact: string;
}

export const CIV_CARD_LIMITS = {
  problem: 40,
  mechanism: 120,
  boundary: 80,
  ask: 28,
  minSources: 4,
} as const;

/**
 * A pattern card: one callable mechanism mounted on an existing chronicle anchor.
 * `lines` stay inside the four-line closed set. Subject words such as 度量
 * belong in the title, not in a fifth line.
 */
export interface CivCard extends CivReadingShape {
  id: string;
  title: string;
  lines: readonly CivLine[];
  /** Existing href plus hash. Pattern cards do not add a route. */
  anchor: string;
  problem: string;
  mechanism: string;
  boundary: string;
  maintenance: string;
  ask: string;
  sources: readonly CivSource[];
  /**
   * Optional ids in SLICE_THEMES. Empty or omitted: the card renders no slice row.
   * Filling the bridge is a separate track.
   */
  sliceThemeIds?: readonly string[];
}

export function civChars(text: string): number {
  return [...text].length;
}

const PATTERN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATTERN_ANCHOR = /^\/civilization\/chronicle\/#stage-\d+$/;

/** Empty array means the card satisfies the contract. */
export function civCardIssues(card: CivCard): string[] {
  const issues: string[] = [];
  const limits = CIV_CARD_LIMITS;
  if (!PATTERN_ID.test(card.id)) issues.push('id');
  if (!card.title.trim()) issues.push('title');
  if (card.lines.length < 1 || card.lines.length > CIV_LINES.length) issues.push('lines');
  if (new Set(card.lines).size !== card.lines.length) issues.push('lines-dup');
  for (const line of card.lines) {
    if (!isCivLine(line)) issues.push(`line:${line}`);
  }
  if (!PATTERN_ANCHOR.test(card.anchor)) issues.push('anchor');
  if (!card.problem.trim() || civChars(card.problem) > limits.problem) issues.push('problem');
  if (!card.mechanism.trim() || civChars(card.mechanism) > limits.mechanism) issues.push('mechanism');
  if (!card.boundary.trim() || civChars(card.boundary) > limits.boundary) issues.push('boundary');
  if (!card.maintenance.trim()) issues.push('maintenance');
  if (!card.ask.trim() || civChars(card.ask) > limits.ask) issues.push('ask');
  if (!card.event.trim() || !card.eventDetail.trim() || !card.impact.trim()) issues.push('reading');
  if (card.products.length < 1 || card.drivers.length < 1) issues.push('lists');
  for (const product of card.products) {
    if (!product.name.trim() || !product.detail.trim()) issues.push('product');
  }
  for (const driver of card.drivers) {
    if (!driver.name.trim() || !driver.detail.trim()) issues.push('driver');
  }
  if (card.sources.length < limits.minSources) issues.push('sources');
  const urls = new Set<string>();
  let mechanismSources = 0;
  for (const source of card.sources) {
    if (!source.name.trim() || !/^https:\/\//.test(source.url)) issues.push('source');
    if (urls.has(source.url)) issues.push('source-dup');
    urls.add(source.url);
    if (source.supports === 'mechanism') mechanismSources += 1;
  }
  if (mechanismSources !== 1) issues.push('mechanism-source');
  if (card.sliceThemeIds?.some((id) => !id.trim())) issues.push('slice');
  return issues;
}
