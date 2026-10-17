/**
 * Hand-written 今｜近｜遠 rows for explainers.
 * No keyword crawl and no article-store writes. An unknown key renders nothing.
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

export interface SliceRecord {
  key: string;
  line: SliceLine;
  slots: SliceSlot[];
}

/** Three tech explainers already on the tool-card list. Near history stays empty until a later bridge. */
export const CIVILIZATION_SLICES: readonly SliceRecord[] = [
  {
    key: '2026-10-17-huggingface-llama-windows-0d4a780afe2e',
    line: '計算工具',
    slots: [
      {
        label: '今',
        title: '本機模型',
        blurb: '今日切片：公開模型可以在個人電腦上試行。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港科學館開幕',
        blurb: '城市以常設展覽向公眾講解科學方法。',
        href: '/hk/landmarks/science-museum/',
        year: '1991',
        layer: '科技史',
      },
    ],
  },
  {
    key: '2026-10-17-kiro-kimi-k3-6158c7fd4cf1',
    line: '學習知識傳播',
    slots: [
      {
        label: '今',
        title: '工具分工',
        blurb: '今日切片：寫作、長文與查核各自對應不同工具。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港科學館開幕',
        blurb: '公共場館把科學方法放進展廳。',
        href: '/hk/landmarks/science-museum/',
        year: '1991',
        layer: '科技史',
      },
    ],
  },
  {
    key: '2026-10-17-nvidia-nemotron-speech-skills-asr-ed30994dfcf2',
    line: '語音影像',
    slots: [
      {
        label: '今',
        title: '語音轉寫',
        blurb: '今日切片：會議錄音可以整理成紀要。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '遠',
        title: '香港太空館開幕',
        blurb: '天象廳以公眾展覽講解天文尺度。',
        href: '/hk/landmarks/space-museum/',
        year: '1980',
        layer: '科技史',
      },
    ],
  },
];

const BY_KEY = new Map(CIVILIZATION_SLICES.map((row) => [row.key, row]));

export function sliceForKey(key: string): SliceRecord | undefined {
  return BY_KEY.get(key);
}

export function explainerKeyFromHref(href: string): string {
  const match = /\/explainer\/([^/?#]+)\/?/.exec(href);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function sliceForHref(href: string): SliceRecord | undefined {
  const key = explainerKeyFromHref(href);
  return key ? sliceForKey(key) : undefined;
}

export interface CoordinateChip {
  layer: string;
  year: string;
}

/** Null when this headline has no hand-written civilization match. */
export function coordinateFor(href: string): CoordinateChip | null {
  const row = sliceForHref(href);
  const far = row?.slots.find((slot) => slot.label === '遠' && slot.layer && slot.year);
  if (!far?.layer || !far.year) return null;
  return { layer: far.layer, year: far.year };
}
