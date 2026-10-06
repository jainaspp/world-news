const STOP = new Set([
  'the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'for', 'with', 'from', 'after', 'as', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'its', 'it', 'that', 'this', 'over', 'into', 'about',
  '與', '的', '了', '在', '及', '和', '將', '被', '為',
]);

export function textTokens(input: string): string[] {
  const lower = input.toLowerCase();
  const words = lower.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1 && !STOP.has(word));
  const chunks = lower.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const grams: string[] = [];
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length - 1; index += 1) grams.push(chunk.slice(index, index + 2));
  }
  return [...words, ...grams];
}

export function jaccard(left: string[], right: string[]): { score: number; shared: number } {
  const a = new Set(left);
  const b = new Set(right);
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const union = a.size + b.size - shared;
  return { score: union ? shared / union : 0, shared };
}
