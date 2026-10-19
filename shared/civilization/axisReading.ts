import { cjkChars, esc } from '../contentPage.js';
import { renderReadingBlock } from './blocks.js';
import type { CivDriver, CivProduct } from './contract.js';

/**
 * Expandable stage readings for the tech and city axis pages.
 *
 * A new block is a new object in the stage's array. Rendering stays here and
 * in `renderReadingBlock`. Do not add a route or a PAGES key.
 * Omit `image` and the block keeps a paper seal. Set `image` to a base name
 * under `/static/civilization` (no size suffix) when a vignette exists.
 */

const CIV = '/static/civilization';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Below this, a reading is still a caption, not a stage. */
export const AXIS_READING_MIN_CHARS = 280;

export interface AxisReading {
  /** Second and later blocks on the same stage. The first block uses the stage id. */
  slug?: string;
  event: string;
  eventDetail: string;
  products: CivProduct[];
  drivers: CivDriver[];
  impact: string;
  /** Subset of that page's own line vocabulary. Not the chronicle four-line set. */
  lines: readonly string[];
  /** Base name such as `tech-stage-1-product`. Omitted: paper seal. */
  image?: string;
  imageAlt?: string;
}

export function axisReadingProse(readings: readonly AxisReading[]): string {
  return readings.map((reading) => [
    reading.event,
    reading.eventDetail,
    ...reading.products.flatMap((item) => [item.kind ?? '', item.name, item.detail]),
    ...reading.drivers.flatMap((item) => [item.name, item.detail]),
    reading.impact,
    ...reading.lines,
  ].join('\n')).join('\n');
}

/** Empty means the readings match the stage lines and the thickness floor. */
export function axisReadingIssues(
  readings: readonly AxisReading[],
  stageLines: readonly string[],
  allowedLines: readonly string[],
): string[] {
  const issues: string[] = [];
  if (readings.length < 1) issues.push('empty');
  readings.forEach((reading, index) => {
    const tag = `${index}`;
    if (reading.slug !== undefined && !SLUG.test(reading.slug)) issues.push(`slug:${tag}`);
    if (!reading.event.trim() || !reading.eventDetail.trim() || !reading.impact.trim()) issues.push(`reading:${tag}`);
    if (reading.products.length < 1 || reading.drivers.length < 1) issues.push(`lists:${tag}`);
    if (reading.lines.length < 1) issues.push(`lines:${tag}`);
    for (const line of reading.lines) {
      if (!allowedLines.includes(line) || !stageLines.includes(line)) issues.push(`line:${tag}:${line}`);
    }
    for (const product of reading.products) {
      if (!product.name.trim() || !product.detail.trim()) issues.push(`product:${tag}`);
      if (product.kind && !allowedLines.includes(product.kind)) issues.push(`kind:${tag}:${product.kind}`);
    }
    for (const driver of reading.drivers) {
      if (!driver.name.trim() || !driver.detail.trim()) issues.push(`driver:${tag}`);
    }
    if (reading.image !== undefined && !SLUG.test(reading.image)) issues.push(`image:${tag}`);
    if (cjkChars(axisReadingProse([reading])) < AXIS_READING_MIN_CHARS) issues.push(`thin:${tag}`);
  });
  const slugs = readings.slice(1).map((reading, index) => reading.slug?.trim() || String(index + 2));
  if (new Set(slugs).size !== slugs.length) issues.push('slug-dup');
  return issues;
}

function anchorFor(prefix: string, stageN: number, reading: AxisReading, index: number): string {
  if (index === 0) return `${prefix}-${stageN}`;
  return `${prefix}-${stageN}-${reading.slug?.trim() || index + 1}`;
}

/** One details block per reading. The first anchor is `#tech-N-reading` or `#city-N-reading`. */
export function renderStageReadings(prefix: string, stageN: number, readings: readonly AxisReading[]): string {
  return readings.map((reading, index) => {
    const anchor = anchorFor(prefix, stageN, reading, index);
    const cover = reading.image ? `${CIV}/${reading.image}` : null;
    return renderReadingBlock({
      anchor,
      event: reading.event,
      eventDetail: reading.eventDetail,
      products: reading.products.map((item) => ({ ...item })),
      drivers: reading.drivers.map((item) => ({ ...item })),
      impact: reading.impact,
      cover,
      coverAlt: reading.imageAlt,
      lines: reading.lines,
    });
  }).join('');
}

/** In-page jump. The target is the first reading on this stage. */
export function stageReadingJump(prefix: string, stageN: number, readings: readonly AxisReading[]): string {
  if (!readings.length) return '';
  const anchor = anchorFor(prefix, stageN, readings[0], 0);
  return `<a href="${esc(`#${anchor}-reading`)}">產物與推動力</a>`;
}
