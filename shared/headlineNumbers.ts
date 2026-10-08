import type { ContentDoc } from './content.js';

function numbers(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

function hasNumber(body: string, n: string): boolean {
  return new RegExp(`(?<![\\d.])${n.replace('.', '\\.')}(?![\\d.])`).test(body);
}

/**
 * Title and summary points may only use numbers the body states. A point with a number the body
 * does not have (「首日接307份」 when the body says 305份 plus 2份) is dropped; a title with one
 * falls back to the first point that passes. Cheap, no model call.
 */
export function alignHeadlineNumbers(doc: ContentDoc): ContentDoc {
  if (doc.kind !== 'briefing' || doc.mode !== 'ai') return doc;
  const body = [doc.description, ...doc.blocks.flatMap((block) => block.sentences)].join('\n').replace(/(\d),(?=\d{3})/g, '$1');
  const fits = (line: string) => numbers(line).every((n) => hasNumber(body, n));
  const points = doc.points ?? [];
  const kept = points.filter(fits);
  const title = fits(doc.title) ? doc.title : (kept[0] ?? doc.title);
  if (kept.length === points.length && title === doc.title) return doc;
  return { ...doc, title, points: kept.length >= 2 ? kept : points.filter(fits) };
}
