/**
 * Deterministic grounding guard for model output, alongside the number check on highlights.
 * - Countries / nationalities: a mention that the piece's own sources don't support (in Chinese
 *   or English) is removed when it is a droppable modifier (法國籍、法國的物理學家), otherwise the
 *   sentence is dropped. Titles fall back to the most-reported source headline.
 * - Outlets: model-written outlet names are replaced by the feed's configured source name.
 * - People: a transliterated name (with ·) gets the English name from the sources in brackets.
 */

interface Place {
  zh: string[];
  en: RegExp;
  /** Case-sensitive abbreviations (US, UK) so the word "us" does not count. */
  abbr?: RegExp;
}

const P = (zh: string[], en: string, abbr?: string): Place => ({
  zh,
  en: new RegExp(`\\b(?:${en})\\b`, 'i'),
  ...(abbr ? { abbr: new RegExp(`(?:^|[^A-Za-z])(?:${abbr})(?![A-Za-z])`) } : {}),
});

/** Longest Chinese forms are matched first, so 印度尼西亞 is not read as 印度. 香港 is left out on purpose. */
export const PLACES: Place[] = [
  P(['美國'], 'american|americans|america|united states|washington|white house|pentagon', 'U\\.S\\.?|US|USA'),
  P(['英國'], 'british|britain|united kingdom|england|london|scotland|scottish|wales|welsh', 'U\\.K\\.?|UK'),
  P(['法國'], 'french|france|paris'),
  P(['德國'], 'german|germany|berlin'),
  P(['意大利', '義大利'], 'italian|italy|rome'),
  P(['西班牙'], 'spanish|spain|madrid'),
  P(['葡萄牙'], 'portuguese|portugal|lisbon'),
  P(['荷蘭'], 'dutch|netherlands|holland|amsterdam'),
  P(['比利時'], 'belgian|belgium|brussels'),
  P(['瑞士'], 'swiss|switzerland|geneva|zurich'),
  P(['瑞典'], 'swedish|sweden|stockholm|nobel'),
  P(['挪威'], 'norwegian|norway|oslo'),
  P(['丹麥'], 'danish|denmark|copenhagen'),
  P(['芬蘭'], 'finnish|finland|helsinki'),
  P(['奧地利'], 'austrian|austria|vienna'),
  P(['波蘭'], 'polish|poland|warsaw'),
  P(['愛爾蘭'], 'irish|ireland|dublin'),
  P(['希臘'], 'greek|greece|athens'),
  P(['土耳其'], 'turkish|turkey|türkiye|ankara|istanbul|erdogan'),
  P(['俄羅斯', '俄國', '俄方', '俄'], 'russian|russians|russia|moscow|kremlin|putin'),
  P(['烏克蘭', '烏方'], 'ukrainian|ukraine|kyiv|kiev|zelensky'),
  P(['白俄羅斯'], 'belarus|belarusian|minsk'),
  P(['以色列'], 'israeli|israelis|israel|jerusalem|tel aviv|netanyahu', 'IDF'),
  P(['巴勒斯坦'], 'palestinian|palestinians|palestine|gaza|west bank|hamas'),
  P(['伊朗'], 'iranian|iran|tehran'),
  P(['伊拉克'], 'iraqi|iraq|baghdad'),
  P(['敘利亞'], 'syrian|syria|damascus'),
  P(['黎巴嫩'], 'lebanese|lebanon|beirut|hezbollah'),
  P(['沙特', '沙地阿拉伯', '沙烏地阿拉伯'], 'saudi|saudi arabia|riyadh'),
  P(['卡塔爾', '卡達'], 'qatari|qatar|doha'),
  P(['阿聯酋'], 'emirati|emirates|dubai|abu dhabi', 'UAE'),
  P(['埃及'], 'egyptian|egypt|cairo'),
  P(['也門', '葉門'], 'yemeni|yemen|houthi|houthis'),
  P(['中國', '中國籍', '中方', '內地', '北京'], 'chinese|china|beijing|shanghai|xi jinping', 'PRC'),
  P(['台灣', '臺灣'], 'taiwanese|taiwan|taipei'),
  P(['日本'], 'japanese|japan|tokyo'),
  P(['韓國', '南韓'], 'korean|south korea|korea|seoul'),
  P(['北韓', '朝鮮'], 'north korea|north korean|pyongyang', 'DPRK'),
  P(['印度尼西亞', '印尼'], 'indonesian|indonesia|jakarta'),
  P(['印度'], 'indian|india|delhi|mumbai|modi'),
  P(['巴基斯坦'], 'pakistani|pakistan|islamabad'),
  P(['孟加拉'], 'bangladeshi|bangladesh|dhaka'),
  P(['阿富汗'], 'afghan|afghanistan|kabul|taliban'),
  P(['泰國'], 'thai|thailand|bangkok'),
  P(['越南'], 'vietnamese|vietnam|hanoi'),
  P(['菲律賓'], 'filipino|philippine|philippines|manila'),
  P(['馬來西亞'], 'malaysian|malaysia|kuala lumpur'),
  P(['新加坡'], 'singaporean|singapore'),
  P(['緬甸'], 'myanmar|burmese|burma'),
  P(['澳洲', '澳大利亞'], 'australian|australia|sydney|melbourne|canberra'),
  P(['新西蘭', '紐西蘭'], 'new zealand|kiwi|wellington|auckland'),
  P(['加拿大'], 'canadian|canada|ottawa|toronto'),
  P(['墨西哥'], 'mexican|mexico'),
  P(['巴西'], 'brazilian|brazil|brasilia|rio'),
  P(['阿根廷'], 'argentine|argentinian|argentina|buenos aires'),
  P(['委內瑞拉'], 'venezuelan|venezuela|caracas|maduro'),
  P(['古巴'], 'cuban|cuba|havana'),
  P(['南非'], 'south african|south africa|johannesburg|pretoria'),
  P(['尼日利亞'], 'nigerian|nigeria|lagos|abuja'),
  P(['肯尼亞', '肯亞'], 'kenyan|kenya|nairobi'),
  P(['埃塞俄比亞'], 'ethiopian|ethiopia|addis ababa'),
  P(['剛果'], 'congo|congolese|kinshasa', 'DRC'),
];

const ALL_ZH = PLACES.flatMap((place) => place.zh.map((zh) => ({ zh, place }))).sort((a, b) => b.zh.length - a.zh.length);

/** Words after a country that make it a droppable modifier: 法國物理學家 → 物理學家. */
const PERSON_NOUN = '(?:科學家|物理學家|化學家|學者|研究員|研究人員|教授|醫生|作家|導演|演員|歌手|藝人|運動員|球員|選手|商人|富豪|企業家|工程師|記者|男子|女子|男性|女性|公民|人士)';

export interface GuardResult {
  text: string;
  removed: string[];
  dropped: boolean;
}

function supported(place: Place, zhHaystack: string, enHaystack: string): boolean {
  return place.zh.some((zh) => zhHaystack.includes(zh)) || place.en.test(enHaystack) || Boolean(place.abbr?.test(enHaystack));
}

/** Countries mentioned in `text` that the sources do not support. */
export function ungroundedPlaces(text: string, sourcesText: string): string[] {
  let rest = text;
  const out: string[] = [];
  for (const { zh, place } of ALL_ZH) {
    if (!rest.includes(zh)) continue;
    // Mask so a shorter form (印度 inside 印度尼西亞, 俄 inside 俄羅斯) is not counted again.
    rest = rest.split(zh).join('□'.repeat(zh.length));
    if (!supported(place, sourcesText, sourcesText)) out.push(zh);
  }
  return [...new Set(out)];
}

/**
 * Removes unsupported country mentions when they are modifiers; marks the text dropped otherwise.
 * "卡塔爾新聞" style outlet renames become 「有媒體」 here; real outlet names are fixed by fixOutlets.
 */
export function scrubPlaces(text: string, sourcesText: string): GuardResult {
  const removed: string[] = [];
  let out = text;
  for (const zh of ungroundedPlaces(text, sourcesText)) {
    const e = zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns: [RegExp, string][] = [
      [new RegExp(`${e}(?:新聞|媒體|傳媒|電視台|電視臺|通訊社|日報|時報|報章|報)`, 'g'), '有媒體'],
      [new RegExp(`(?:來自|出身)${e}(?:的)?`, 'g'), ''],
      [new RegExp(`${e}(?:籍|裔)(?:的)?`, 'g'), ''],
      [new RegExp(`${e}(?:的)?(?=${PERSON_NOUN})`, 'g'), ''],
    ];
    for (const [pattern, replacement] of patterns) {
      out = out.replace(pattern, (match) => {
        removed.push(`刪除「${match}」：${text}`);
        return replacement;
      });
    }
  }
  if (ungroundedPlaces(out, sourcesText).length) {
    return { text: '', removed: [...removed, ...ungroundedPlaces(out, sourcesText).map((zh) => `${zh}（整句刪除：${text}）`)], dropped: true };
  }
  return { text: out.replace(/^[，、\s]+/, '').replace(/，，/g, '，'), removed, dropped: false };
}

/** Model-written Chinese names for outlets, mapped to a word in the configured feed name. */
const OUTLET_ALIASES: [RegExp, string][] = [
  [/半島電視台|半島電視臺|卡塔爾半島(?:電視台|新聞)?|半島新聞/g, 'al jazeera'],
  [/英國廣播公司|英國廣播|BBC新聞/g, 'bbc'],
  [/《?衛報》?|英國《衛報》|《觀察者》|觀察者報/g, 'guardian'],
  [/路透社|路透/g, 'reuters'],
  [/美聯社/g, 'associated press'],
  [/法新社/g, 'afp'],
  [/《?紐約時報》?/g, 'new york times|nytimes'],
  [/《?華盛頓郵報》?/g, 'washington post'],
  [/美國全國廣播公司財經頻道|消費者新聞與商業頻道/g, 'cnbc'],
  [/邊緣網站|《?邊緣》?/g, 'verge'],
  [/香港電台|港台/g, '香港電台|rthk'],
  [/南華早報|《南華早報》/g, 'scmp|south china morning post'],
];

/** Replaces model-written outlet names with the feed's own source name; unknown 《…》 outlets become 有媒體. */
export function fixOutlets(text: string, sourceNames: string[]): GuardResult {
  const removed: string[] = [];
  let out = text;
  for (const [pattern, key] of OUTLET_ALIASES) {
    const keys = key.split('|');
    const real = sourceNames.find((name) => keys.some((k) => name.toLowerCase().includes(k)));
    out = out.replace(pattern, (match) => {
      if (real && match === real) return match;
      if (real && real.includes(match)) return match;
      removed.push(`${match}→${real || '有媒體'}`);
      return real || '有媒體';
    });
  }
  return { text: out, removed, dropped: false };
}

/** English personal names (two or three capitalised words) found in source titles/excerpts. */
export function englishNames(sourcesText: string, exclude: string[] = []): string[] {
  const skip = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'Of', 'And', 'For', 'With', 'After', 'Before', 'How', 'What', 'Why', 'Who', 'Watch', 'New', 'South', 'North', 'East', 'West', 'Prize', 'Nobel', 'World', 'Cup', 'Bros', 'Discovery', 'News', 'Times', 'Post', 'Pole']);
  const out: string[] = [];
  for (const match of sourcesText.matchAll(/\b([A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?)\s([A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?)(?:\s([A-Z][a-z]+))?\b/g)) {
    const words = match.slice(1).filter(Boolean) as string[];
    if (words.some((word) => skip.has(word))) continue;
    if (PLACES.some((place) => place.en.test(words.join(' ')))) continue;
    const name = words.join(' ');
    if (exclude.some((item) => item.toLowerCase().includes(name.toLowerCase()))) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Adds the English name in brackets after the first transliterated name (X·Y) that is not already
 * followed by one. Only when the match is unambiguous: one candidate, or a candidate whose surname
 * shares the transliteration's first sound is not checkable, so ambiguous cases are left as is.
 */
const NAME_STOP = new Set([...'因在獲表示指的是於與和被將曾已稱說為以及就對向把從由等今早前後近也都則並而及憑透率帶擔任出任']);

/** End index of a transliterated surname after "·" (1–4 characters, stops at common function words). */
function surnameEnd(text: string, start: number): number {
  let end = start;
  while (end < text.length && end - start < 4 && /[\u3400-\u9fff]/.test(text[end]!) && !NAME_STOP.has(text[end]!)) end += 1;
  if (text[end] === '·') return surnameEnd(text, end + 1);
  return end;
}

/**
 * Adds the English name in brackets after the first transliterated name (X·Y) not already followed
 * by one. Only when unambiguous: one candidate with the same number of parts, or a single name overall.
 */
export function bracketNames(texts: string[], names: string[]): { texts: string[]; added: string[] } {
  const added: string[] = [];
  if (!names.length) return { texts, added };
  const used = new Set<string>();
  const result = texts.map((text) => {
    let out = '';
    let index = 0;
    while (index < text.length) {
      const dot = text.indexOf('·', index);
      if (dot < 1 || !/[\u3400-\u9fff]/.test(text[dot - 1]!) || !/[\u3400-\u9fff]/.test(text[dot + 1] || '')) {
        out += text.slice(index);
        break;
      }
      const end = surnameEnd(text, dot + 1);
      let begin = dot;
      while (begin > index && dot - begin < 4 && /[\u3400-\u9fff]/.test(text[begin - 1]!)) begin -= 1;
      const translit = text.slice(begin, end);
      const parts = translit.split('·').length;
      const free = names.filter((name) => !used.has(name));
      const fit = free.filter((name) => name.split(' ').length === parts);
      const pick = fit.length === 1 ? fit[0] : names.length === 1 && free.length === 1 ? free[0] : '';
      out += text.slice(index, end);
      if (pick && !/^[（(]/.test(text.slice(end, end + 1))) {
        used.add(pick);
        out += `（${pick}）`;
        added.push(`${text.slice(dot + 1, end)}（${pick}）`);
      }
      index = end;
    }
    return out;
  });
  return { texts: result, added };
}
