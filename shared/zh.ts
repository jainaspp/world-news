import { S2HK_CHARS, S2HK_WORDS } from './s2hkMap.js';

let charMap: Map<string, string> | null = null;

function chars(): Map<string, string> {
  if (charMap) return charMap;
  charMap = new Map();
  for (let i = 0; i + 1 < S2HK_CHARS.length; i += 2) charMap.set(S2HK_CHARS[i]!, S2HK_CHARS[i + 1]!);
  return charMap;
}

/** Deterministic Simplified → Traditional (Hong Kong) conversion. Traditional text passes through unchanged. */
export function toHK(text: string): string {
  if (!text) return text;
  const map = chars();
  let result = '';
  let index = 0;
  outer: while (index < text.length) {
    for (const [simplified, traditional] of S2HK_WORDS) {
      if (text.startsWith(simplified, index)) {
        result += traditional;
        index += simplified.length;
        continue outer;
      }
    }
    const char = text[index]!;
    result += map.get(char) ?? char;
    index += 1;
  }
  return result;
}

/** Share of CJK characters among all letters (CJK + Latin). 1 = all Chinese, 0 = all English. */
export function cjkShare(text: string): number {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  // One Chinese character carries roughly a word; weigh Latin letters as 1/4 so names like "BBC" don't fail a line.
  const total = cjk + latin / 4;
  return total === 0 ? 1 : cjk / total;
}

export function isMostlyEnglish(text: string, threshold = 0.6): boolean {
  return cjkShare(text) < threshold;
}

export function hasChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}
