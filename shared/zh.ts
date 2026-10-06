import { S2HK_CHARS, S2HK_WORDS } from './s2hkMap.js';

let s2t: Map<string, string> | null = null;
let t2s: Map<string, string> | null = null;

function s2tMap(): Map<string, string> {
  if (s2t) return s2t;
  s2t = new Map();
  for (let i = 0; i + 1 < S2HK_CHARS.length; i += 2) s2t.set(S2HK_CHARS[i]!, S2HK_CHARS[i + 1]!);
  return s2t;
}

function t2sMap(): Map<string, string> {
  if (t2s) return t2s;
  t2s = new Map();
  for (let i = 0; i + 1 < S2HK_CHARS.length; i += 2) {
    const simplified = S2HK_CHARS[i]!;
    const traditional = S2HK_CHARS[i + 1]!;
    // First Simplified→Traditional wins in s2t; reverse keeps the first Traditional→Simplified.
    if (!t2s.has(traditional)) t2s.set(traditional, simplified);
  }
  return t2s;
}

/** Deterministic Simplified → Traditional (Hong Kong). Traditional text passes through unchanged. */
export function toHK(text: string): string {
  if (!text) return text;
  const map = s2tMap();
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

/** Deterministic Traditional → Simplified. Uses the reverse of the OpenCC-derived map (no AI). */
export function toCN(text: string): string {
  if (!text) return text;
  const map = t2sMap();
  let result = '';
  let index = 0;
  outer: while (index < text.length) {
    for (const [simplified, traditional] of S2HK_WORDS) {
      if (text.startsWith(traditional, index)) {
        result += simplified;
        index += traditional.length;
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
  const total = cjk + latin / 4;
  return total === 0 ? 1 : cjk / total;
}

export function isMostlyEnglish(text: string, threshold = 0.6): boolean {
  return cjkShare(text) < threshold;
}

export function hasChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

/** Headline language. Non-Chinese titles render in the sans stack. */
export function titleLang(title: string): 'zh' | 'en' | 'ja' {
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(title)) return 'ja';
  if (isMostlyEnglish(title)) return 'en';
  return 'zh';
}

export type UiLang = 'zh-HK' | 'zh-CN' | 'en';

export function normalizeLang(raw: string | null | undefined): UiLang {
  const value = (raw || '').trim();
  if (value === 'en') return 'en';
  if (value === 'zh-CN' || value === 'zh' || value === 'cn' || value === '简') return 'zh-CN';
  return 'zh-HK';
}

/** Title for cards: EN keeps RSS original; 簡 converts CJK to Simplified; 繁 uses HK Traditional. */
export function displayTitle(title: string, lang: UiLang): string {
  if (!title) return title;
  if (lang === 'en') return title;
  if (lang === 'zh-CN') return toCN(title);
  return toHK(title);
}
