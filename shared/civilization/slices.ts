/**
 * 今｜近｜遠 for explainers, matched by durable theme keywords.
 * Dated article ids rotate out of 今日必讀, so a chip must not depend on one key.
 * 近 stays empty until a real bridge exists, and empty slots are not rendered.
 */

export type SliceLine = '計算工具' | '語音影像' | '學習知識傳播';

export interface SliceSlot {
  label: '今' | '近' | '遠';
  title: string;
  blurb: string;
  href?: string;
  year?: string;
  layer?: string;
}

export interface SliceQuery {
  href?: string;
  key?: string;
  title?: string;
  description?: string;
}

export interface SliceTheme {
  id: string;
  line: SliceLine;
  match: RegExp;
  slots: readonly SliceSlot[];
}

const SCIENCE_MUSEUM = '/hk/landmarks/science-museum/';
const SPACE_MUSEUM = '/hk/landmarks/space-museum/';

/** First match wins. Specific lines come before the broader computing line. */
export const SLICE_THEMES: readonly SliceTheme[] = [
  {
    id: 'speech-image',
    line: '語音影像',
    match: /語音|轉寫|語音識別|\basr\b|nemotron|\bspeech\b|whisper|影像|圖像|繪圖|firefly|音訊|\baudio\b|podcast|影片生成/i,
    slots: [
      {
        label: '今',
        title: '語音與影像',
        blurb: '今日切片：錄音與影像可以整理成可讀的紀錄。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港太空館開幕',
        blurb: '天象廳以公眾展覽講解天文尺度。',
        href: SPACE_MUSEUM,
        year: '1980',
        layer: '科技史',
      },
    ],
  },
  {
    id: 'learning',
    line: '學習知識傳播',
    match: /\bkimi\b|\bkiro\b|notebooklm|寫作|長文|知識傳播|\bcollege\b|\bplanner\b/i,
    slots: [
      {
        label: '今',
        title: '工具分工',
        blurb: '今日切片：寫作、長文與查核可以對應不同工具。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港科學館開幕',
        blurb: '公共場館把科學方法放進展廳。',
        href: SCIENCE_MUSEUM,
        year: '1991',
        layer: '科技史',
      },
    ],
  },
  {
    id: 'compute',
    line: '計算工具',
    match: /人工智能|生成式|語言模型|聊天機械人|本機|開源模型|huggingface|\bllama\b|\bllm\b|\bgpt\b|openai|chatgpt|\bclaude\b|\bgemini\b|bedrock|agentcore|模型/i,
    slots: [
      {
        label: '今',
        title: '本機與公開模型',
        blurb: '今日切片：公開模型與計算工具可以在個人電腦上試行。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港科學館開幕',
        blurb: '城市以常設展覽向公眾講解科學方法。',
        href: SCIENCE_MUSEUM,
        year: '1991',
        layer: '科技史',
      },
    ],
  },
];

export function explainerKeyFromHref(href: string): string {
  const match = /\/explainer\/([^/?#]+)\/?/.exec(href);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function sliceQueryText(query: SliceQuery): string {
  const key = query.key || explainerKeyFromHref(query.href || '');
  return [key, query.title || '', query.description || ''].filter(Boolean).join('\n');
}

export function sliceForQuery(query: SliceQuery): SliceTheme | undefined {
  const text = sliceQueryText(query);
  if (!text.trim()) return undefined;
  return SLICE_THEMES.find((theme) => theme.match.test(text));
}

export interface CoordinateChip {
  layer: string;
  year: string;
}

/** Null when this explainer matches no theme. A dated id is not required. */
export function coordinateFor(input: string | SliceQuery): CoordinateChip | null {
  const query = typeof input === 'string' ? { href: input } : input;
  const row = sliceForQuery(query);
  const far = row?.slots.find((slot) => slot.label === '遠' && slot.layer && slot.year);
  if (!far?.layer || !far.year) return null;
  return { layer: far.layer, year: far.year };
}
