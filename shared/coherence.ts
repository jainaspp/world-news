/** Which numbered sources are one event. A failed parse returns null so the caller keeps the strict cluster. */
export function parseCoherence(raw: string, count: number): number[] | null {
  const fenced = raw.replace(/```json|```/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1)) as { keep?: unknown };
    if (!Array.isArray(parsed.keep)) return null;
    const keep = [...new Set(parsed.keep.filter((value): value is number => Number.isInteger(value) && value >= 1 && value <= count))];
    return keep;
  } catch {
    return null;
  }
}

export function keepItems<T>(items: T[], keep: number[]): T[] {
  const wanted = new Set(keep);
  return items.filter((_, index) => wanted.has(index + 1));
}

export function coherencePrompt(items: { source: string; title: string }[]): { system: string; user: string } {
  const lines = items.map((item, index) => `${index + 1}. ${item.source}：${item.title}`).join('\n');
  return {
    system: '你只判斷哪些報道是同一件新聞。不同事件、不同人物、不同地點的標題不要放在一起。只回 JSON：{"keep":[1,2]}。keep 是同一事件的編號，至少要有兩個才成立；如果沒有兩個以上是同一件事，回 {"keep":[]}。',
    user: lines,
  };
}
