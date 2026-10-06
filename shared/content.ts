import { stableId } from './rss.js';
import type { StoryCluster } from './trending';

/** Cheap Qwen MoE on Workers AI. Traditional Chinese is strong, and the neuron rate stays inside the free 10k/day. */
export const AI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

/** Cloudflare list price, neurons per 1,000,000 tokens. */
export const MODEL_NEURONS = { inputPerMillion: 4625, outputPerMillion: 30475 };

export const DAILY_AI_CALLS = 12;

export interface SourceRef {
  title: string;
  url: string;
  source: string;
  excerpt?: string;
  /** Story photo from the feed (RSS media/og). Optional: older docs have none. */
  image?: string;
  category?: string;
  pubDate?: string;
}

export interface DigestBlock {
  title: string;
  sentences: string[];
  sources: SourceRef[];
  category?: string;
}

/** "重點數字" or "關鍵詞" box. Only kept when the model gives one that the sources back up. */
export interface Highlight {
  label: '重點數字' | '關鍵詞';
  items: string[];
}

export interface ContentDoc {
  kind: 'digest' | 'analysis' | 'weekly';
  key: string;
  title: string;
  description: string;
  blocks: DigestBlock[];
  publishedAt: string;
  hkt: string;
  mode: 'ai' | 'sources';
  model?: string;
  highlight?: Highlight;
}

/** One row of the per-kind archive list kept in KV (index:<kind>). */
export interface IndexEntry {
  key: string;
  title: string;
  description: string;
  publishedAt: string;
  image?: string;
  category?: string;
  sources: number;
}

export function leadImage(doc: ContentDoc): string {
  for (const block of doc.blocks) {
    for (const source of block.sources) {
      if (source.image && /^https?:\/\//.test(source.image)) return source.image;
    }
  }
  return '';
}

export function docCategories(doc: ContentDoc): string[] {
  const seen: string[] = [];
  for (const block of doc.blocks) {
    const ids = [block.category, ...block.sources.map((source) => source.category)];
    for (const id of ids) if (id && !seen.includes(id)) seen.push(id);
  }
  return seen.slice(0, 4);
}

export function uniqueSources(doc: ContentDoc): SourceRef[] {
  return [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()];
}

export function indexEntry(doc: ContentDoc): IndexEntry {
  const entry: IndexEntry = {
    key: doc.key,
    title: doc.title,
    description: doc.description.slice(0, 140),
    publishedAt: doc.publishedAt,
    sources: uniqueSources(doc).length,
  };
  const image = leadImage(doc);
  if (image) entry.image = image;
  const category = docCategories(doc)[0];
  if (category) entry.category = category;
  return entry;
}

/** Newest first, one row per key, capped. */
export function mergeIndex(current: IndexEntry[], doc: ContentDoc, limit = 40): IndexEntry[] {
  const next = [indexEntry(doc), ...current.filter((entry) => entry && entry.key !== doc.key)];
  return next.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, limit);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function hktParts(now = new Date()): { date: string; hour: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat('en-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: parts.weekday || 'Sun',
  };
}

export function slotId(now = new Date()): string {
  const { date, hour } = hktParts(now);
  return `${date}-${hour < 12 ? 'am' : 'pm'}`;
}

export function recentSlots(now = new Date()): string[] {
  return [slotId(now), slotId(new Date(now.getTime() - 12 * 60 * 60 * 1000))];
}

export function weeklyEdition(now = new Date()): string {
  const { date, weekday } = hktParts(now);
  const index = Math.max(0, WEEKDAYS.indexOf(weekday));
  const [year, month, day] = date.split('-').map(Number);
  const sunday = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1) - index * 86400000);
  return sunday.toISOString().slice(0, 10);
}

export function formatHkt(iso: string): string {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return '';
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(time);
}

export function analysisSlug(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return `${words || 'story'}-${stableId(title)}`;
}

export function isGenerateAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return header === secret;
}

export function sourcesFromCluster(cluster: StoryCluster): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const item of cluster.items) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    sources.push({
      title: item.title,
      url: item.link,
      source: item.source,
      excerpt: item.excerpt?.slice(0, 160),
      ...(item.image ? { image: item.image } : {}),
      ...(item.category ? { category: item.category } : {}),
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
    });
    if (sources.length >= 6) break;
  }
  return sources;
}

export function draftSentences(sources: SourceRef[]): string[] {
  const names = [...new Set(sources.map((source) => source.source))].slice(0, 4).join('、');
  const lead = sources[0]?.title ?? '';
  const rest = sources.slice(1, 3).map((source) => source.title).filter(Boolean).join('；');
  return [
    `${names}報道：${lead}`,
    rest ? `相關標題還有：${rest}。` : '其他來源未有另列標題。',
    '詳情只以來源原文為準。來源沒有寫出的數字、引言同背景，這裡都不補充。',
  ];
}

export function digestFromClusters(clusters: StoryCluster[], key: string, now = new Date()): ContentDoc {
  const blocks = clusters.slice(0, 10).filter((cluster) => cluster.count >= 2).map((cluster) => {
    const sources = sourcesFromCluster(cluster);
    return { title: cluster.lead.title, sentences: draftSentences(sources), sources, category: cluster.lead.category || 'world' };
  });
  return {
    kind: 'digest',
    key,
    title: `世界頭條精選 ${key}`,
    description: blocks[0] ? `綜合多個來源：${blocks[0].title}` : '這一期暫時沒有足夠來源。',
    blocks,
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function analysisFromCluster(cluster: StoryCluster, now = new Date()): ContentDoc {
  const sources = sourcesFromCluster(cluster);
  const slug = analysisSlug(cluster.lead.title);
  const lines = draftSentences(sources);
  return {
    kind: 'analysis',
    key: slug,
    title: cluster.lead.title,
    description: `${cluster.count} 個來源報道：${cluster.lead.title}`,
    blocks: [
      { title: '背景', sentences: [lines[0] || '來源未有提及背景。'], sources, category: cluster.lead.category || 'world' },
      { title: '各方說法', sentences: [lines[1] || '來源未有提及各方說法。'], sources: [] },
      { title: '與香港的關係', sentences: ['對香港讀者，目前只看到各來源的標題，未有足夠描述可以判斷對本地的影響。'], sources: [] },
    ],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function weeklyFromHeadlines(tech: SourceRef[], business: SourceRef[], key: string, now = new Date()): ContentDoc {
  const block = (title: string, sources: SourceRef[], category: string): DigestBlock => ({
    title,
    category,
    sentences: sources.length ? draftSentences(sources) : ['這一週未有足夠標題。', '來源未有提及更多。', '有新標題後會再更新。'],
    sources,
  });
  return {
    kind: 'weekly',
    key,
    title: `一週回顧 ${key}`,
    description: '一週科技同一週財經，只根據已收錄的標題。',
    blocks: [block('一週科技', tech.slice(0, 8), 'tech'), block('一週財經', business.slice(0, 8), 'business')],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function promptFor(doc: ContentDoc): { system: string; user: string; maxTokens: number } {
  const system = [
    '你是世界頭條的編輯。一律用繁體中文（香港書面語），不要用簡體字，英文來源都要譯成中文；可以有輕微本地語氣，不要堆砌俚語。',
    '只可使用提供的標題同短描述。禁止添加來源沒有寫的事實、數字、引言、人名、地點或因果。',
    '不肯定就寫「來源未有提及」。不要用 Markdown。回覆必須是 JSON。',
  ].join('');
  const payload = doc.blocks.map((block, index) => ({
    n: index + 1,
    title: block.title,
    sources: block.sources.map((source) => ({
      source: source.source,
      title: source.title,
      excerpt: source.excerpt || '',
    })),
  }));
  const shape = doc.kind === 'analysis'
    ? '回傳 {"sections":[{"heading":"背景"|"各方說法"|"與香港的關係","text":"..."}],"highlight":{...}}，三段都要有，每段兩句以內。'
    : doc.kind === 'weekly'
      ? '回傳 {"sections":[{"heading":"一週科技"|"一週財經","text":"..."}],"highlight":{...}}。每段三至五句，只回顧列出的標題。'
      : '回傳 {"items":[{"n":1,"sentences":["...","...","..."]}],"highlight":{...}}。每一則剛好三句，綜合至少兩個來源。';
  const highlight = 'highlight 可選：資料入面有具體數字就用 {"label":"重點數字","items":["數字＋十字以內說明"]}，否則用 {"label":"關鍵詞","items":["詞"]}，最多四項，數字必須原文出現過；沒有就省略 highlight。';
  return {
    system,
    user: `${shape}\n${highlight}\n資料：${JSON.stringify(payload)}`,
    maxTokens: doc.kind === 'digest' ? 3200 : 1000,
  };
}

/** Keeps a model highlight only if every number in it appears in the source titles/excerpts. */
export function cleanHighlight(doc: ContentDoc, value: unknown): Highlight | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as { label?: unknown; items?: unknown };
  const label = row.label === '重點數字' ? '重點數字' : row.label === '關鍵詞' ? '關鍵詞' : null;
  if (!label || !Array.isArray(row.items)) return undefined;
  const haystack = doc.blocks.flatMap((block) => [block.title, ...block.sources.flatMap((source) => [source.title, source.excerpt || ''])]).join(' ').replace(/,/g, '');
  const items = row.items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length > 0 && item.length <= 28)
    .filter((item) => (item.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).every((number) => haystack.includes(number)))
    .slice(0, 4);
  if (!items.length) return undefined;
  if (label === '重點數字' && !items.some((item) => /\d/.test(item))) return { label: '關鍵詞', items };
  return { label, items };
}

function withHighlight(doc: ContentDoc, record: { highlight?: unknown }): ContentDoc {
  const highlight = cleanHighlight(doc, record.highlight);
  if (!highlight) {
    const rest = { ...doc };
    delete rest.highlight;
    return rest;
  }
  return { ...doc, highlight };
}

export function applyModelText(doc: ContentDoc, raw: string, model = AI_MODEL): ContentDoc | null {
  const result = applyModelBody(doc, raw, model);
  if (!result) return null;
  return withHighlight(result.doc, result.record);
}

function applyModelBody(doc: ContentDoc, raw: string, model: string): { doc: ContentDoc; record: { highlight?: unknown } } | null {
  const fenced = raw.replace(/```json|```/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as { highlight?: unknown; items?: { n?: number; sentences?: unknown }[]; sections?: { heading?: string; text?: string }[] };
  if (doc.kind === 'digest' && Array.isArray(record.items)) {
    const blocks = doc.blocks.map((block, index) => {
      const match = record.items?.find((item) => item.n === index + 1) ?? record.items?.[index];
      const sentences = Array.isArray(match?.sentences) ? match.sentences.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).slice(0, 3) : [];
      if (sentences.length < 3) return block;
      return { ...block, sentences };
    });
    if (blocks.every((block, index) => block.sentences === doc.blocks[index]?.sentences)) return null;
    return { doc: { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description }, record };
  }
  if (doc.kind === 'analysis' && Array.isArray(record.sections)) {
    const blocks = record.sections.slice(0, 3).map((section) => ({
      title: String(section.heading || doc.title),
      sentences: String(section.text || '').split(/(?<=。)/).map((line) => line.trim()).filter(Boolean).slice(0, 4),
      sources: doc.blocks[0]?.sources ?? [],
      category: doc.blocks[0]?.category,
    })).filter((block) => block.sentences.length > 0);
    if (!blocks.length) return null;
    return { doc: { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description }, record };
  }
  if (doc.kind === 'weekly' && Array.isArray(record.sections)) {
    const blocks = doc.blocks.map((block) => {
      const section = record.sections?.find((item) => item.heading === block.title);
      const sentences = String(section?.text || '').split(/(?<=。)/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
      return sentences.length ? { ...block, sentences } : block;
    });
    if (blocks.every((block, index) => block === doc.blocks[index])) return null;
    return { doc: { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description }, record };
  }
  return null;
}

export function textFromAi(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const row = result as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  if (typeof row.response === 'string') return row.response;
  const content = row.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

export function estimateNeurons(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * MODEL_NEURONS.inputPerMillion + (outputTokens / 1_000_000) * MODEL_NEURONS.outputPerMillion;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

export { renderContentPage, renderAnalysisIndex, type AdConfig, type PageOptions } from './contentPage.js';
