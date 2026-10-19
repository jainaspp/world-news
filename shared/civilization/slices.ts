/**
 * 今｜近｜遠 for explainers, matched by durable theme keywords.
 * Dated article ids rotate out of 今日必讀, so a chip must not depend on one key.
 * 近 is the question↔precedent bridge. A slot with an empty title or blurb is not rendered.
 * precedentRef.href points at the pattern card mounted on the chronicle page.
 */

export type SliceLine = '計算工具' | '語音影像' | '學習知識傳播' | '度量' | '能源';

/** Soft ids reserved for Track A pattern cards. Binding stays by id until those cards exist. */
export type PatternCardId = 'power-store' | 'copy-check' | 'measure-promise';

export type SliceAxis = 'chronicle' | 'tech' | 'earth' | 'origins';

export interface SlicePrecedentRef {
  patternCardId: PatternCardId;
  axis: SliceAxis;
  /** Existing chronicle, tech, earth, or origins anchor. No new /civilization/ route. */
  href: string;
  anchor: string;
}

export interface SliceSlot {
  label: '今' | '近' | '遠';
  title: string;
  blurb: string;
  href?: string;
  year?: string;
  layer?: string;
  precedentRef?: SlicePrecedentRef;
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
  /** Mild question a reader can ask of today's explainer. At most 28 characters. */
  civQuestion: string;
  slots: readonly SliceSlot[];
}

const SCIENCE_MUSEUM = '/hk/landmarks/science-museum/';
const SPACE_MUSEUM = '/hk/landmarks/space-museum/';

/** First match wins. Specific lines come before the broader computing line. */
export const SLICE_THEMES: readonly SliceTheme[] = [
  {
    id: 'speech-image',
    line: '語音影像',
    civQuestion: '一段聲音如何留下可核對的紀錄？',
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
        label: '近',
        title: '廣播與可重放影像',
        blurb: '電波把同一段聲音送進許多家庭，攝影則留下可以重看的畫面。',
        href: '/civilization/chronicle/#pattern-copy-check',
        year: '約 1920',
        layer: '科技史',
        precedentRef: {
          patternCardId: 'copy-check',
          axis: 'chronicle',
          href: '/civilization/chronicle/#pattern-copy-check',
          anchor: 'pattern-copy-check',
        },
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
    civQuestion: '一份說明如何讓陌生人事後核對？',
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
        label: '近',
        title: '可公開連結的文件',
        blurb: '萬維網使一份說明可以被不相識的人檢索，並在事後對照。',
        href: '/civilization/chronicle/#pattern-copy-check',
        year: '約 1990',
        layer: '科技史',
        precedentRef: {
          patternCardId: 'copy-check',
          axis: 'chronicle',
          href: '/civilization/chronicle/#pattern-copy-check',
          anchor: 'pattern-copy-check',
        },
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
    id: 'measure',
    line: '度量',
    civQuestion: '異地的同一單位如何仍然可信？',
    match: /度量衡|度量單位|度量|校準|公制|國際單位|公斤|公尺/,
    slots: [
      {
        label: '今',
        title: '單位與校準',
        blurb: '今日切片：度量新聞可以先問，同一單位在異地是否仍可核對。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '近',
        title: '可重複的觀測',
        blurb: '二十世紀的單位約定，沿用科學方法裡別人可以重做的前提。',
        href: '/civilization/chronicle/#pattern-measure-promise',
        year: '約 1960',
        layer: '科技史',
        precedentRef: {
          patternCardId: 'measure-promise',
          axis: 'chronicle',
          href: '/civilization/chronicle/#pattern-measure-promise',
          anchor: 'pattern-measure-promise',
        },
      },
      {
        label: '遠',
        title: '可傳遞的協作',
        blurb: '共享刻度先要有可以傳遞的語言與協作。深時間只作背景，不作單一起點。',
        href: '/civilization/origins/',
        year: '約數',
        layer: '人類起源',
        precedentRef: {
          patternCardId: 'measure-promise',
          axis: 'origins',
          href: '/civilization/origins/',
          anchor: 'origins',
        },
      },
    ],
  },
  {
    id: 'energy',
    line: '能源',
    civQuestion: '能量如何被存住並送到別處？',
    match: /能源|發電|電網|儲能|太陽能|風電|核電|蒸汽機|化石燃料/,
    slots: [
      {
        label: '今',
        title: '能量的調度',
        blurb: '今日切片：能源新聞可以先問能量存在哪裡、如何送出。',
        year: '2026',
        layer: '科技史',
      },
      {
        label: '近',
        title: '城市電網',
        blurb: '工業能量進入城市管網之後，電力可以在別處取用。',
        href: '/civilization/chronicle/#pattern-power-store',
        year: '約 1930',
        layer: '科技史',
        precedentRef: {
          patternCardId: 'power-store',
          axis: 'chronicle',
          href: '/civilization/chronicle/#pattern-power-store',
          anchor: 'pattern-power-store',
        },
      },
      {
        label: '遠',
        title: '大氧化與化學能量',
        blurb: '產氧之後，好氧代謝可以調動更多化學能量。年代為約數。',
        href: '/civilization/earth/#earth-1',
        year: '約 24 億年前',
        layer: '地球生命',
        precedentRef: {
          patternCardId: 'power-store',
          axis: 'earth',
          href: '/civilization/earth/#earth-1',
          anchor: 'earth-1',
        },
      },
    ],
  },
  {
    id: 'compute',
    line: '計算工具',
    civQuestion: '計算步驟能否離開單一機器？',
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
        label: '近',
        title: '可互相送達的計算',
        blurb: '分組交換讓處理步驟離開單一機器，文件可以用連結彼此指向。',
        href: '/civilization/chronicle/#pattern-copy-check',
        year: '約 1970',
        layer: '科技史',
        precedentRef: {
          patternCardId: 'copy-check',
          axis: 'chronicle',
          href: '/civilization/chronicle/#pattern-copy-check',
          anchor: 'pattern-copy-check',
        },
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

export function nearSlot(theme: SliceTheme): SliceSlot | undefined {
  return theme.slots.find((slot) => slot.label === '近' && slot.title.trim() && slot.blurb.trim() && slot.precedentRef);
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
