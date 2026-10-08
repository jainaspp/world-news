import type { ContentDoc } from './content.js';

function numbers(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

function hasNumber(body: string, n: string): boolean {
  return new RegExp(`(?<![\\d.])${n.replace('.', '\\.')}(?![\\d.])`).test(body);
}

/** Longest briefing headline, counting each Chinese character and each Latin word or number as one. */
export const HEADLINE_MAX = 28;
const CLAUSE_RE = /[，；：]/;

export function headlineLength(title: string): number {
  const cjk = (title.match(/[\u3400-\u9fff]/g) ?? []).length;
  const runs = (title.match(/[A-Za-z0-9][A-Za-z0-9.,%]*/g) ?? []).length;
  return cjk + runs;
}

function bigrams(text: string): Set<string> {
  const out = new Set<string>();
  for (const run of text.match(/[\u3400-\u9fff]+/g) ?? []) {
    for (let i = 0; i + 1 < run.length; i += 1) out.add(run.slice(i, i + 2));
  }
  return out;
}

function overlaps(a: string, b: string): boolean {
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  for (const pair of right) if (left.has(pair)) shared += 1;
  return shared >= 3 || (shared >= 2 && shared * 2 >= right.size);
}

/** Distinct stories among the summary points that the headline mentions (points on one story count once). */
export function headlineStories(title: string, points: readonly string[]): number {
  const stories: string[] = [];
  for (const point of points) {
    if (!overlaps(title, point)) continue;
    if (!stories.some((seen) => overlaps(seen, point) || overlaps(point, seen))) stories.push(point);
  }
  return stories.length;
}

/**
 * A briefing headline leads with one story: at most two stories, a second one only after 「，」「；」
 * or 「：」, and no longer than HEADLINE_MAX. 「香港觀塘單位火警救出男童選委會提名首日收307份東湧地盤工人墮下不治」
 * (three headlines glued together) fails.
 */
export function headlineShapeOk(title: string, points: readonly string[]): boolean {
  const clean = title.trim();
  if (!clean || headlineLength(clean) > HEADLINE_MAX) return false;
  const stories = headlineStories(clean, points);
  if (stories >= 3) return false;
  return stories < 2 || CLAUSE_RE.test(clean);
}

function bare(line: string): string {
  return line.trim().replace(/[。！？，；、\s]+$/u, '');
}

function repairedTitle(title: string, points: readonly string[]): string | null {
  const first = bare(title.split(CLAUSE_RE)[0] || '');
  const candidates = [first, ...points.map(bare), ...points.map((point) => bare(point.split(CLAUSE_RE)[0] || ''))];
  return candidates.find((line) => headlineLength(line) >= 8 && headlineShapeOk(line, points) && headlineStories(line, points) <= 1) ?? null;
}

/**
 * Title and summary points may only use numbers the body states. A point with a number the body
 * does not have (「首日接307份」 when the body says 305份 plus 2份) is dropped; a title with one
 * falls back to the first point that passes. A headline that glues several stories together is
 * replaced by a single-lead one from its own first clause or the first point. Cheap, no model call.
 */
export function settleBriefingHeadline(doc: ContentDoc): ContentDoc {
  if (doc.kind !== 'briefing' || doc.mode !== 'ai') return doc;
  const body = doc.blocks.flatMap((block) => block.sentences).join('\n').replace(/(\d),(?=\d{3})/g, '$1');
  const fits = (line: string) => numbers(line).every((n) => hasNumber(body, n));
  const points = doc.points ?? [];
  const kept = points.filter(fits);
  let nextPoints = kept.length >= 2 ? kept : points.filter(fits);
  let title = fits(doc.title) ? doc.title : (kept[0] ?? doc.title);
  if (!headlineShapeOk(title, nextPoints)) {
    const repaired = repairedTitle(title, nextPoints);
    if (repaired) title = repaired;
  }
  // The 重點 list carries the other stories; drop the point now used word for word as the title.
  if (title !== doc.title && nextPoints.length >= 4 && bare(nextPoints[0] || '') === bare(title)) nextPoints = nextPoints.slice(1);
  // The lead follows the points it was built from, and may not state a number the body lacks either.
  const overview = briefingOverview(points);
  const description = (overview && doc.description === overview) || !fits(doc.description)
    ? (briefingOverview(nextPoints) ?? doc.description)
    : doc.description;
  if (title === doc.title && description === doc.description && nextPoints.length === points.length && nextPoints.every((point, index) => point === points[index])) return doc;
  return { ...doc, title, description, points: nextPoints };
}

/** @deprecated use settleBriefingHeadline */
export const alignHeadlineNumbers = settleBriefingHeadline;

/** The lead line: 「今日要聞：」 and the first summary points, so the intro is an overview rather than story 1. */
export function briefingOverview(points: readonly string[]): string | null {
  const lines = points.map(bare).filter(Boolean).slice(0, 3);
  return lines.length >= 2 ? `今日要聞：${lines.join('；')}。` : null;
}
