import type { SourceRef } from './content.js';
import { cantoneseLeft, polishProse, preachySentence, proseSane, tidyDisplay } from './prose.js';
import { SOURCE_LIST_CAP } from './search.js';
import type { NewsItem } from './types.js';
import { hasChinese, isMostlyEnglish, toHK } from './zh.js';

/**
 * Evergreen topic packs. Facts are never stored here — only the desk, the match
 * keywords, and the figure groups a model may use when the sources support them.
 */
export interface TopicConfig {
  slug: string;
  title: string;
  /** Index blurb. Describes the column, not a news event. */
  blurb: string;
  desk: 'hk' | 'china' | 'other';
  category: string;
  keywords: readonly string[];
  areas: readonly string[];
}

export const TOPIC_PACKS: readonly TopicConfig[] = [
  {
    slug: 'policy-address',
    title: '施政報告',
    blurb: '行政長官施政報告的措施、時間線，以及對市民的影響。',
    desk: 'hk',
    category: 'hk',
    keywords: ['施政報告', '行政長官', '李家超 施政', 'policy address'],
    areas: ['房屋', '經濟', '民生', '稅務/津貼'],
  },
  {
    slug: 'budget',
    title: '財政預算案',
    blurb: '財政預算案和稅務、津貼變動的措施與時間線。',
    desk: 'hk',
    category: 'hk',
    keywords: ['財政預算案', '預算案', '財政司司長', '差餉寬免', '稅務寬免', '薪俸稅'],
    areas: ['稅務', '津貼', '開支'],
  },
  {
    slug: 'property',
    title: '樓市',
    blurb: '樓價、供應、居屋公屋和按揭的最新變化。',
    desk: 'hk',
    category: 'hk',
    keywords: ['樓市', '樓價', '居屋', '公屋輪候', '公屋供應', '簡約公屋', '一手樓', '按揭', '差估署'],
    areas: ['樓價', '供應', '按揭'],
  },
  {
    slug: 'weather',
    title: '颱風與天氣警告',
    blurb: '熱帶氣旋、暴雨警告，以及對通勤和上課的影響。',
    desk: 'hk',
    category: 'hk',
    keywords: ['颱風', '熱帶氣旋', '黑色暴雨', '天文台', '八號風球', '天氣警告'],
    areas: ['警告', '影響'],
  },
  {
    slug: 'us-china',
    title: '中美關係',
    blurb: '中美關稅、談判和官方表態的時間線。',
    desk: 'china',
    category: 'china',
    keywords: ['中美', '中國 關稅', '中國 特朗普', '習近平 美國', '貿易戰'],
    areas: ['關稅', '談判'],
  },
  {
    slug: 'ai',
    title: '人工智能',
    blurb: '人工智能產品、晶片和監管的公開報道。',
    desk: 'other',
    category: 'tech',
    keywords: ['人工智能', '生成式人工智能', '大模型', '晶片 出口'],
    areas: ['產品', '監管'],
  },
  {
    slug: 'mideast',
    title: '中東局勢',
    blurb: '中東衝突和外交表態的時間線。',
    desk: 'other',
    category: 'world',
    keywords: ['加沙', '以色列', '伊朗', '中東'],
    areas: ['事態', '外交'],
  },
] as const;

export interface TopicFigure {
  area: string;
  label: string;
  value: string;
}

export interface TopicEvent {
  date: string;
  text: string;
}

export interface TopicPack {
  slug: string;
  title: string;
  description: string;
  points: string[];
  timeline: TopicEvent[];
  figures: TopicFigure[];
  impact: string[];
  reactions: string[];
  sources: SourceRef[];
  /** Feed links already folded into this pack. New links are the only reason to call a model. */
  seenLinks: string[];
  publishedAt: string;
  updatedAt: string;
  mode: 'ai' | 'sources';
  provider?: 'grok' | 'minimax' | 'workers-ai';
  model?: string;
}

export interface TopicDraft {
  title: string;
  description: string;
  points: string[];
  timeline: TopicEvent[];
  figures: TopicFigure[];
  impact: string[];
  reactions: string[];
}

const DISCLAIMER = /免責|僅供參考|只供參考|編者按|編者的話|AI 生成|人工智能生成|模型整理|本文由/;
const TIMELINE_CAP = 20;
const FIGURE_CAP = 12;
const LIST_CAP = 6;

export function topicBySlug(slug: string): TopicConfig | undefined {
  return TOPIC_PACKS.find((topic) => topic.slug === slug);
}

export function topicStorageKey(slug: string): string {
  return `topic:${slug}`;
}

/** 07:30 and 18:30 HKT warm runs, plus an hour of Actions delay. Sunday 20:00 is outside this. */
export function topicWarmWindow(now = new Date()): boolean {
  const hkt = new Date(now.getTime() + 8 * 3_600_000);
  const hour = hkt.getUTCHours();
  return hour === 7 || hour === 8 || hour === 18 || hour === 19;
}

export function keywordHits(text: string, keyword: string): boolean {
  const hay = text.toLowerCase();
  const parts = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return parts.length > 0 && parts.every((part) => hay.includes(part));
}

export function topicMatchesText(text: string, topic: TopicConfig): boolean {
  return topic.keywords.some((keyword) => keywordHits(text, keyword));
}

export function relatedTopics(text: string): TopicConfig[] {
  return TOPIC_PACKS.filter((topic) => topicMatchesText(text, topic));
}

export function matchTopicItems(items: NewsItem[], topic: TopicConfig): NewsItem[] {
  return items
    .filter((item) => topicMatchesText(`${item.title}\n${item.excerpt || ''}`, topic))
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate) || a.id.localeCompare(b.id));
}

export function newTopicLinks(items: NewsItem[], seen: readonly string[]): string[] {
  const known = new Set(seen);
  return items.map((item) => item.link).filter((link) => link && !known.has(link));
}

export function topicCorpus(items: NewsItem[]): string {
  const raw = items.map((item) => [item.title, item.excerpt || '', item.pubDate || '', item.source].join('\n')).join('\n');
  return `${raw}\n${tidyDisplay(toHK(raw))}`;
}

function han(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

export function topicRichness(pack: TopicPack): number {
  const text = [
    pack.title,
    pack.description,
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.flatMap((row) => [row.label, row.value]),
    ...pack.impact,
    ...pack.reactions,
  ].join('');
  return han(text);
}

function narrativeLines(pack: Pick<TopicPack, 'points' | 'timeline' | 'impact' | 'reactions' | 'figures'>): string[] {
  return [
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.map((row) => `${row.label}${row.value}`),
    ...pack.impact,
    ...pack.reactions,
  ];
}

function narrativeOf(pack: Pick<TopicPack, 'points' | 'timeline' | 'impact' | 'reactions' | 'figures'>): string {
  return [
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.map((row) => `${row.label}${row.value}`),
    ...pack.impact,
    ...pack.reactions,
  ].join('');
}

/** A pack worth indexing. Thin or still-Cantonese text stays off the sitemap. */
export function topicPublic(pack: TopicPack): boolean {
  if (pack.mode !== 'ai') return false;
  if (!hasChinese(pack.title) || pack.points.length < 2) return false;
  if (!pack.timeline.length && !pack.figures.length) return false;
  const prose = narrativeOf(pack);
  // Topic lines are short single sentences, so the comma guard is applied line by line;
  // joined together they would fail it for having no 「，」 between sentences.
  const lines = narrativeLines(pack);
  if (!lines.every((line) => proseSane(line)) || cantoneseLeft(prose) || isMostlyEnglish(pack.title)) return false;
  return pack.points.every((point) => hasChinese(point));
}

/**
 * A rewrite must not replace a better version. Same 15% floor as explainers:
 * a public pack stays when the candidate is unlistable or materially thinner.
 */
export function keepStoredTopic(stored: TopicPack, next: TopicPack): boolean {
  if (!topicPublic(stored)) return false;
  if (!topicPublic(next)) return true;
  return topicRichness(next) < topicRichness(stored) * 0.85;
}

export function parseTopicPack(raw: string | null): TopicPack | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as TopicPack;
    if (!value || typeof value.slug !== 'string' || typeof value.title !== 'string') return null;
    if (!Array.isArray(value.points) || !Array.isArray(value.timeline) || !Array.isArray(value.seenLinks)) return null;
    return value;
  } catch {
    return null;
  }
}

function numbersGrounded(text: string, corpus: string): boolean {
  const nums = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => new RegExp(`(?<!\\d)${n.replace('.', '\\.')}(?!\\d)`).test(corpus));
}

/** Share of the line's Chinese character pairs that appear in the source text. */
export function groundedShare(line: string, corpus: string): number {
  const pairs: string[] = [];
  for (const run of line.match(/[\u3400-\u9fff]+/g) ?? []) {
    for (let i = 0; i + 1 < run.length; i += 1) pairs.push(run.slice(i, i + 2));
  }
  if (pairs.length < 6) return 1;
  return pairs.filter((pair) => corpus.includes(pair)).length / pairs.length;
}

/** Below this share a line is mostly words the sources never used: an invented detail or a guess. */
export const GROUNDED_MIN = 0.5;

function quotesGrounded(line: string, corpus: string): boolean {
  const quoted = [...line.matchAll(/[「“"]([^」”"]{2,})[」”"]/g)].map((match) => match[1]);
  return quoted.every((text) => corpus.includes(text) || corpus.includes(toHK(text)));
}

function cleanLine(raw: unknown, corpus: string, strictNumbers: boolean): string {
  const source = String(raw ?? '');
  // A broken character (U+FFFD) means the model reply was cut mid-character: drop the line.
  if (source.includes('\uFFFD')) return '';
  const line = tidyDisplay(toHK(polishProse(source))).replace(/\s+/g, ' ').trim();
  if (!line || !hasChinese(line) || isMostlyEnglish(line)) return '';
  if (cantoneseLeft(line) || preachySentence(line) || DISCLAIMER.test(line)) return '';
  if (strictNumbers && !numbersGrounded(line, corpus)) return '';
  if (groundedShare(line, corpus) < GROUNDED_MIN || !quotesGrounded(line, corpus)) return '';
  return line;
}

/** Narrative lines end with a full stop, like the rest of the site's copy. */
function sentence(line: string): string {
  if (!line) return '';
  return /[。！？」』）)]$/.test(line) ? line : `${line}。`;
}

/** Headline clauses the model separated with spaces become one line joined by 「，」. */
function titleLine(raw: unknown): string {
  return String(raw ?? '').replace(/([\u3400-\u9fff」》])\s+(?=[\u3400-\u9fff「《])/g, '$1，').trim();
}

function cleanDate(raw: unknown, corpus: string): string {
  const match = /(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? ''));
  if (!match) return '';
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const month = String(Number(match[2]));
  const day = String(Number(match[3]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return '';
  if (corpus.includes(iso)) return iso;
  const yearOk = new RegExp(`(?<!\\d)${match[1]}(?!\\d)`).test(corpus);
  const monthOk = new RegExp(`(?<!\\d)${month}(?!\\d)`).test(corpus);
  const dayOk = new RegExp(`(?<!\\d)${day}(?!\\d)`).test(corpus);
  return yearOk && monthOk && dayOk ? iso : '';
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Model JSON, restricted to lines whose numbers appear in the source text. */
export function parseTopicDraft(raw: string, corpus: string, areas: readonly string[], strictNumbers = true): TopicDraft | null {
  const text = raw.replace(/```json|```/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const allowed = new Set(areas);
  const points = asList(parsed.points).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, 3);
  const timeline: TopicEvent[] = [];
  for (const row of asList(parsed.timeline)) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const date = cleanDate(record.date, corpus);
    const line = sentence(cleanLine(record.text, corpus, strictNumbers));
    if (!date || !line) continue;
    if (timeline.some((item) => item.date === date && item.text === line)) continue;
    timeline.push({ date, text: line });
  }
  const figures: TopicFigure[] = [];
  for (const row of asList(parsed.figures)) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const area = tidyDisplay(String(record.area ?? '')).trim();
    const label = cleanLine(record.label, corpus, false);
    const value = cleanLine(record.value, corpus, strictNumbers);
    if (!area || !label || !value || !/\d/.test(value)) continue;
    if (allowed.size && !allowed.has(area)) continue;
    if (!numbersGrounded(value, corpus)) continue;
    figures.push({ area, label, value });
  }
  const draft: TopicDraft = {
    title: cleanLine(titleLine(parsed.title), corpus, strictNumbers) || cleanLine(titleLine(parsed.title), corpus, false),
    description: sentence(cleanLine(parsed.description, corpus, strictNumbers)),
    points,
    timeline: timeline.slice(0, TIMELINE_CAP),
    figures: figures.slice(0, FIGURE_CAP),
    impact: asList(parsed.impact).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, LIST_CAP),
    reactions: asList(parsed.reactions).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, LIST_CAP),
  };
  if (!draft.title && !draft.points.length && !draft.timeline.length && !draft.figures.length) return null;
  return draft;
}

function sameEvent(a: TopicEvent, b: TopicEvent): boolean {
  return a.date === b.date && a.text === b.text;
}

/**
 * Update in place: keep the previous timeline, figures, impact, and reactions,
 * and append only new grounded lines. The three-line summary is replaced only
 * when the new lines are not materially thinner.
 */
export function applyTopicUpdate(
  previous: TopicPack | null,
  draft: TopicDraft,
  meta: { slug: string; now: string; provider: TopicPack['provider']; model?: string },
): TopicPack {
  const points = draft.points.length >= 2 && han(draft.points.join('')) >= han((previous?.points ?? []).join('')) * 0.85
    ? draft.points
    : (previous?.points?.length ? previous.points : draft.points);
  const timeline = [...(previous?.timeline ?? [])];
  for (const row of draft.timeline) {
    if (!timeline.some((item) => sameEvent(item, row))) timeline.push(row);
  }
  timeline.sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text, 'zh-HK'));
  const figures = [...(previous?.figures ?? [])];
  for (const row of draft.figures) {
    if (!figures.some((item) => item.area === row.area && item.value === row.value)) figures.push(row);
  }
  const append = (prior: string[] | undefined, extra: string[]) => {
    const next = [...(prior ?? [])];
    for (const line of extra) if (!next.includes(line)) next.push(line);
    return next.slice(0, LIST_CAP);
  };
  const pack: TopicPack = {
    slug: meta.slug,
    title: draft.title || previous?.title || '',
    description: draft.description || previous?.description || points[0] || '',
    points,
    timeline: timeline.slice(-TIMELINE_CAP),
    figures: figures.slice(-FIGURE_CAP),
    impact: append(previous?.impact, draft.impact),
    reactions: append(previous?.reactions, draft.reactions),
    sources: previous?.sources ?? [],
    seenLinks: previous?.seenLinks ?? [],
    publishedAt: previous?.publishedAt || meta.now,
    updatedAt: meta.now,
    mode: 'ai',
    provider: meta.provider,
    ...(meta.model ? { model: meta.model } : {}),
  };
  return pack;
}

export function sourcesFromItems(items: NewsItem[], previous: SourceRef[] = []): SourceRef[] {
  const out: SourceRef[] = [];
  const seen = new Set<string>();
  const push = (source: SourceRef) => {
    if (!source.url || seen.has(source.url) || out.length >= SOURCE_LIST_CAP) return;
    seen.add(source.url);
    out.push(source);
  };
  for (const item of items) {
    push({
      title: item.title,
      url: item.link,
      source: item.source,
      ...(item.excerpt ? { excerpt: item.excerpt.slice(0, 280) } : {}),
      ...(item.category ? { category: item.category } : {}),
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      ...(item.image ? { image: item.image } : {}),
    });
  }
  for (const source of previous) push(source);
  return out;
}

export function topicPrompt(topic: TopicConfig, items: NewsItem[], previous: TopicPack | null): { system: string; user: string; maxTokens: number } {
  const areas = topic.areas.join('、');
  const system = [
    '你是世界頭條的編輯，整理一篇持續更新的專題。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語，不要用台灣用語。',
    '判斷用「是」。使用全形標點。數字和年份一律用阿拉伯數字。中文之間不要用空格。',
    '只可使用下面標題和摘錄裡已經寫明的事實。禁止添加來源沒有的事實、數字、引言、人名、日期、地點或因果。摘錄沒有的措施不要寫。',
    '與這個專題無關的摘錄整段略過。沒有資料的欄位回傳空陣列，不要寫「未有回應」「未有評論」或任何免責聲明、編者按。',
    '不要稱呼資料欄位，不要寫「AI」。回覆必須是 JSON，不要用 Markdown。',
    previous
      ? '這是更新，不是重寫。保留上一版仍然成立的日期和數字，只根據新摘錄增補或修正。沒有新事實的欄位回傳空陣列。'
      : '這是第一版。材料不夠就如實寫短，不要為了湊字重複。',
  ].join('');
  const material = items.slice(0, 6).map((item, index) => ({
    n: index + 1,
    source: item.source,
    title: item.title,
    date: (item.pubDate || '').slice(0, 10),
    excerpt: (item.excerpt || '').slice(0, 700),
  }));
  const prior = previous
    ? {
      title: previous.title,
      description: previous.description,
      points: previous.points,
      timeline: previous.timeline,
      figures: previous.figures,
      impact: previous.impact,
      reactions: previous.reactions,
    }
    : null;
  const user = [
    `專題：${topic.title}`,
    `數字只可歸入這些欄：${areas}。沒有數字就不要輸出該欄。`,
    `title 寫一句 12 至 22 字，不要用空格分隔。points 寫三句，每句 40 字以內，概括目前發生了甚麼。points 和 timeline 只寫與「${topic.title}」直接相關的事；同一摘錄裡的其他新聞（例如採訪日誌列出的其他活動）一律略過。`,
    '引述官員或議員的話時保留原文的逗號。',
    'timeline 每項 date 用摘錄或標題裡的 YYYY-MM-DD，text 一句。',
    'figures 的 value 必須是摘錄裡出現過的數字。label 是這個數字指甚麼。',
    'impact 只寫摘錄明確寫出的、對香港市民的直接影響，不要推測「可能」「或會」；摘錄沒有寫就回傳空陣列。reactions 只寫摘錄裡點名的政黨、官員或團體的說法，引言必須逐字來自摘錄。',
    `回傳 {"title":"","description":"","points":[],"timeline":[{"date":"YYYY-MM-DD","text":""}],"figures":[{"area":"","label":"","value":""}],"impact":[],"reactions":[]}`,
    prior ? `上一版：${JSON.stringify(prior)}` : '',
    `資料：${JSON.stringify(material)}`,
  ].filter(Boolean).join('\n');
  return { system, user, maxTokens: previous ? 1_400 : 1_800 };
}
