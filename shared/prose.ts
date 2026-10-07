/**
 * Written Traditional Chinese as used by Hong Kong newspapers (書面語).
 * Applied to model prose for briefings, comparisons, and weekly focus intros.
 */

const CN_DIGIT: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const BANNED = /標題同描述|標題和描述|標題同短描述|標題和短描述|短描述/;

/** Colloquial Cantonese that must not survive into formal news copy. */
const PARTICLES = /嘅|喺|佢|咩|咗|嘢|咁|唔|冇|嚟|哋|啦|囉|啲|乜|喎|嘛|畀|嘥|噉|嗰|點解|而家|同埋|决|入面|呢啲|呢個|嗰啲/;

/** True when formal news copy still contains Cantonese particles. 關係 / 係數 stay legal. */
export function cantoneseLeft(text: string): boolean {
  if (PARTICLES.test(text)) return true;
  return /(?<![關干])係(?![數統列])/.test(text);
}

/** A Chinese number that includes a unit or a decimal point. Bare 一 / 十 are left alone. */
const NUMBER_BODY = /[零〇一二兩三四五六七八九十百千]+(?:點[零〇一二三四五六七八九]+)?/g;

function parseCnInt(text: string): number | null {
  if (!text) return 0;
  let total = 0;
  let current = 0;
  let saw = false;
  for (const ch of text) {
    if (ch in CN_DIGIT) {
      current = CN_DIGIT[ch] ?? 0;
      saw = true;
      continue;
    }
    const unit = ch === '十' ? 10 : ch === '百' ? 100 : ch === '千' ? 1000 : 0;
    if (!unit) return null;
    saw = true;
    total += (current || 1) * unit;
    current = 0;
  }
  return saw ? total + current : null;
}

function cnNumber(body: string): string | null {
  if (!/[零〇一二兩三四五六七八九]/.test(body) || !/[十百千點]/.test(body)) return null;
  const [whole, frac] = body.split('點');
  const integer = parseCnInt(whole || '');
  if (integer == null) return null;
  if (frac == null) return String(integer);
  let digits = '';
  for (const ch of frac) {
    if (!(ch in CN_DIGIT)) return null;
    digits += String(CN_DIGIT[ch]);
  }
  return digits ? `${integer}.${digits}` : String(integer);
}

/** 三百零七 → 307, 二十一點四四億 → 21.44億, 百分之五十七點七 → 57.7%. */
export function arabicDigits(text: string): string {
  const percent = text.replace(/百分之([零〇一二兩三四五六七八九十百千點]+)/g, (full, body: string) => {
    const value = cnNumber(body);
    return value == null ? full : `${value}%`;
  });
  return percent.replace(NUMBER_BODY, (full) => cnNumber(full) ?? full);
}

/** Colloquial particles, full-width punctuation, and Arabic digits. Source titles are not passed here. */
export function toWritten(text: string): string {
  let out = text
    .replace(/喺/g, '在')
    .replace(/嘅/g, '的')
    .replace(/同埋/g, '和')
    .replace(/决/g, '決')
    .replace(/(?<![關干])係(?![數統列])/g, '是');
  out = arabicDigits(out);
  let previous = '';
  while (out !== previous) {
    previous = out;
    out = out.replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, '$1$2');
  }
  return out
    .replace(/,(?!\d)/g, '，')
    .replace(/([\u3400-\u9fff]);/g, '$1；')
    .replace(/([\u3400-\u9fff])\?/g, '$1？')
    .replace(/([\u3400-\u9fff])!/g, '$1！')
    .replace(/([\u3400-\u9fff]):/g, '$1：')
    .replace(/([\u3400-\u9fff])\.(?=[\u3400-\u9fff]|\s|$)/g, '$1。')
    .replace(/([，。！？；：])\s+/g, '$1');
}

/** Drops any sentence that names the source format. The model is told not to write these. */
export function dropBannedSentences(text: string): string {
  return text
    .split(/(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !BANNED.test(sentence))
    .join('');
}

export function polishProse(text: string): string {
  return dropBannedSentences(toWritten(text));
}
