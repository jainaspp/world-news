/**
 * Written Traditional Chinese as used by Hong Kong newspapers (書面語).
 * Applied to model prose for briefings, comparisons, and weekly focus intros.
 */

const CN_DIGIT: Record<string, number> = {
  '○': 0,
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
const PARTICLES = /\u5605|\u55BA|\u4F62|\u54A9|\u5497|\u5622|\u5481|\u5514|\u5187|\u569F|\u54CB|\u5566|\u56C9|\u5572|\u4E5C|\u55CE|\u561B|\u7540|\u5625|\u5649|\u55F0|\u9EDE\u89E3|\u800C\u5BB6|\u540C\u57CB|\u51B3|\u5165\u9762|\u5462\u5572|\u5462\u500B|\u55F0\u5572/;

/** True when formal news copy still contains Cantonese particles. 關係 / 係數 stay legal. */
export function cantoneseLeft(text: string): boolean {
  if (PARTICLES.test(text)) return true;
  return /(?<![\u95DC\u5E72])\u4FC2(?![\u6578\u7D71\u5217])/.test(text);
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
  const placed = percent.replace(NUMBER_BODY, (full) => cnNumber(full) ?? full);
  return placed
    .replace(/(?<!比)[零〇○一二三四五六七八九]{2,}(?!比)/g, (run) => [...run].map((ch) => String(CN_DIGIT[ch] ?? ch)).join(''))
    // 十月20日 → 10月20日 when the day is already Arabic; 十一黃金周 is a holiday name.
    .replace(/(^|[^\d零〇一二兩三四五六七八九十])十月(?=\d)/g, '$110月')
    // 二○26年 → 2026年 when the model mixes a Chinese year prefix with Arabic digits.
    .replace(/[零〇○一二三四五六七八九]+(?=\d{1,3}年)/g, (run) => [...run].map((ch) => String(CN_DIGIT[ch] ?? ch)).join(''))
    .replace(/11(黃金周|黃金週|國慶)/g, '十一$1');
}

/** Colloquial particles, full-width punctuation, and Arabic digits. Source titles are not passed here. */
export function toWritten(text: string): string {
  let out = text
    .replace(/\u55BA/g, '在')
    .replace(/\u5605/g, '的')
    .replace(/\u6211\u54CB/g, '我們')
    .replace(/\u800C\u5BB6/g, '目前')
    .replace(/\u9EDE\u89E3/g, '為何')
    .replace(/\u5462\u500B/g, '這個')
    .replace(/\u5462\u5572/g, '這些')
    .replace(/\u55F0\u500B/g, '那個')
    .replace(/\u55F0\u5572/g, '那些')
    .replace(/\u5165\u9762/g, '之中')
    .replace(/\u540C\u57CB/g, '和')
    .replace(/\u5514/g, '不')
    .replace(/\u5187/g, '沒有')
    .replace(/\u5497/g, '了')
    .replace(/\u51B3/g, '決')
    .replace(/(?<![\u95DC\u5E72])\u4FC2(?![\u6578\u7D71\u5217])/g, '是');
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

const SMALL_CN: Record<string, number> = { 零: 0, 〇: 0, '○': 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** 七 → 7, 十二 → 12, 二十三 → 23 for clock hours; null when it is not a plain number. */
function smallCnInt(text: string): number | null {
  if (!text) return null;
  if (text === '十') return 10;
  const ten = text.indexOf('十');
  if (ten < 0) return text.length === 1 && text in SMALL_CN ? SMALL_CN[text]! : null;
  const tens = ten === 0 ? 1 : SMALL_CN[text.slice(0, ten)];
  const rest = text.slice(ten + 1);
  const ones = rest ? SMALL_CN[rest] : 0;
  if (tens == null || ones == null || rest.length > 1) return null;
  return tens * 10 + ones;
}

/**
 * Display fixes applied to stored pieces at render time as well as new ones:
 * 二○26年 → 2026年, 七時54分 → 7時54分, and a stray digit glued before 去年/今年 (大樓1去年 → 大樓去年).
 */
export function tidyNumerals(text: string): string {
  if (!text) return text;
  return arabicDigits(text)
    .replace(/[零〇○一二三四五六七八九]+(?=\d{1,3}年)/g, (run) => [...run].map((ch) => String(SMALL_CN[ch] ?? ch)).join(''))
    .replace(/([零〇一二兩三四五六七八九十]{1,3})(時|點)(?=\d{1,2}分)/g, (full, hour: string, unit: string) => {
      const value = smallCnInt(hour);
      return value == null || value > 24 ? full : `${value}${unit}`;
    })
    .replace(/(?<=[\u3400-\u9fff])\d(?=(?:去年|今年|明年|前年|上月|本月|昨日|今日|昨晚|今晚))/g, '');
}

const PREACHY_ANYWHERE = /凸顯.{0,20}重要性|為.{0,20}鋪路/;
const PREACHY_OPENING = /^(?:此事|此舉|事件|事態|這|此|有關事件|相關事件|該事件)/;
const PREACHY_SOFT = /提醒(?:市民|家長)|引起.{0,20}關注/;

/** Closing commentary the model adds on its own, such as 此事凸顯…重要性 or 此舉為…鋪路. Attributed lines stay. */
export function preachySentence(sentence: string): boolean {
  const line = sentence.trim();
  if (PREACHY_ANYWHERE.test(line)) return !/表示|指出|強調|認為|批評|聲稱/.test(line);
  return PREACHY_SOFT.test(line) && PREACHY_OPENING.test(line);
}

/** Month and day written in Chinese numerals: 十月七日 → 10月7日, and 2026年五月 → 2026年5月. */
function monthDay(month: string, day?: string): string | null {
  const m = smallCnInt(month);
  if (m == null || m < 1 || m > 12) return null;
  if (day == null) return `${m}月`;
  const d = smallCnInt(day);
  if (d == null || d < 1 || d > 31) return null;
  return `${m}月${d}日`;
}

/**
 * Mixed Chinese and Arabic numbers the model sometimes writes:
 * 二萬8000 → 2萬8000, 2026年十月七日 → 2026年10月7日, 十月七日 → 10月7日, 2026年五月 → 2026年5月.
 */
export function tidyMixedNumbers(text: string): string {
  if (!text) return text;
  return text
    .replace(/([一二兩三四五六七八九十]{1,3})(萬|億)(?=\d)/g, (full, run: string, unit: string) => {
      const value = smallCnInt(run);
      return value == null ? full : `${value}${unit}`;
    })
    .replace(/([一二三四五六七八九十]{1,3})月([一二三四五六七八九十]{1,3})日/g, (full, month: string, day: string) => monthDay(month, day) ?? full)
    // 九月19日 → 9月19日 when the day is already Arabic.
    .replace(/([一二三四五六七八九十]{1,3})月(?=\d{1,2}日)/g, (full, month: string) => monthDay(month) ?? full)
    .replace(/(\d{4}年)([一二三四五六七八九十]{1,3})月/g, (full, year: string, month: string) => {
      const fixed = monthDay(month);
      return fixed ? `${year}${fixed}` : full;
    });
}

/**
 * Taiwan and mainland wording that Hong Kong papers write differently. Conservative on purpose:
 * only names and terms where the Hong Kong form is unambiguous.
 */
const HK_TERMS: [RegExp, string][] = [
  [/川普/g, '特朗普'],
  [/社群媒體/g, '社交媒體'],
  [/諾定鹹/g, '諾定咸'],
  [/普丁/g, '普京'],
  [/澤倫斯基/g, '澤連斯基'],
  [/紐西蘭/g, '新西蘭'],
  [/義大利/g, '意大利'],
  [/報導/g, '報道'],
  [/我國(?=外交部|政府|國防部|商務部|駐|海關|國務院)/g, '中國'],
  [/我國/g, '內地'],
  [/軟體/g, '軟件'],
  [/網路/g, '網絡'],
  [/品質/g, '質素'],
];

export function hkWording(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pattern, replacement] of HK_TERMS) out = out.replace(pattern, replacement);
  return out;
}

/** Render-time cleanup for model prose: numerals, mixed numbers, and Hong Kong wording. */
export function tidyDisplay(text: string): string {
  return hkWording(tidyMixedNumbers(tidyNumerals(text)));
}

/** A score or number run glued together after punctuation was dropped, e.g. 七比56比一. */
const BROKEN_SCORE = /比[\d零〇一二三四五六七八九十]{2,}比|\d比\d{2,}比/;

/** At least one 「，」 per this many Chinese characters of narrative prose. */
export const COMMA_EVERY = 60;

/**
 * False when narrative prose has lost its punctuation (fewer than one 「，」 per 60 Chinese
 * characters) or contains a broken score run. Short texts are judged on the score only.
 */
export function proseSane(text: string): boolean {
  if (BROKEN_SCORE.test(text)) return false;
  const han = (text.match(/[\u3400-\u9fff]/g) || []).length;
  if (han < 120) return true;
  const commas = (text.match(/，/g) || []).length;
  return commas * COMMA_EVERY >= han;
}
