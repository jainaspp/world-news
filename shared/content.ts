import { stableId } from './rss.js';
import { hasChinese, isMostlyEnglish, toHK } from './zh.js';
import { bestImage } from './media.js';
import { bracketNames, englishNames, fixOutlets, scrubPlaces } from './grounding.js';
export { bestImage, imageScore } from './media.js';
import type { StoryCluster } from './trending';

/** Cheap Qwen MoE on Workers AI. Traditional Chinese is strong, and the neuron rate stays inside the free 10k/day. */
export const AI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

/** Cloudflare list price, neurons per 1,000,000 tokens. */
export const MODEL_NEURONS = { inputPerMillion: 4625, outputPerMillion: 30475 };

/**
 * Per HKT day. Schedule: 2 digests + 2 × 6 analyses + Sunday weekly = 15, plus one retry per doc
 * at most and a few on-demand analysis pages. About 60 neurons per call, so 30 calls ≈ 1,800 neurons.
 */
export const DAILY_AI_CALLS = 30;

/** Analysis pieces per scheduled run. */
export const ANALYSIS_PER_RUN = 6;

export const ANALYSIS_HEADINGS = ['背景', '各方說法', '點解要關心', '與香港的關係', '接落嚟留意咩'] as const;

export interface SourceRef {
  title: string;
  url: string;
  source: string;
  excerpt?: string;
  /** Story photo from the feed (RSS media/og). Optional: older docs have none. */
  image?: string;
  category?: string;
  pubDate?: string;
  /** One-line paraphrase of this outlet's angle, from the model. */
  angle?: string;
}

export interface DigestBlock {
  title: string;
  sentences: string[];
  sources: SourceRef[];
  category?: string;
  /** Original (usually English) headline when the title was translated. */
  originalTitle?: string;
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
  originalTitle?: string;
  originalUrl?: string;
  /** Phrases the grounding guard removed or changed. Stored for audit, not shown. */
  guard?: string[];
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
  /** Distinct outlets ("N 間媒體報道"). Older rows may lack it. */
  outlets?: number;
  originalTitle?: string;
}

export function outletCount(sources: SourceRef[]): number {
  return new Set(sources.map((source) => source.source)).size;
}

export function leadImage(doc: ContentDoc): string {
  return bestImage(doc.blocks.flatMap((block) => block.sources));
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
    outlets: outletCount(uniqueSources(doc)),
  };
  if (doc.originalTitle) entry.originalTitle = doc.originalTitle;
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

export function sourcesFromCluster(cluster: StoryCluster, limit = 6): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  // One story per outlet first, so the side-by-side view has distinct outlets; then fill.
  const outlets = new Set<string>();
  const ordered = [
    ...cluster.items.filter((item) => (outlets.has(item.source) ? false : (outlets.add(item.source), true))),
    ...cluster.items,
  ];
  for (const item of ordered) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    sources.push({
      title: item.title,
      url: item.link,
      source: item.source,
      excerpt: item.excerpt?.slice(0, 300),
      ...(item.image ? { image: item.image } : {}),
      ...(item.category ? { category: item.category } : {}),
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
    });
    if (sources.length >= limit) break;
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
  const sources = sourcesFromCluster(cluster, 8);
  const slug = analysisSlug(cluster.lead.title);
  const lines = draftSentences(sources);
  const outlets = outletCount(sources);
  return {
    kind: 'analysis',
    key: slug,
    title: cluster.lead.title,
    description: `${outlets} 間媒體報道：${cluster.lead.title}`,
    // Draft (no model) keeps only what the titles support; empty sections are not shown.
    blocks: [
      { title: '背景', sentences: lines.slice(0, 2), sources, category: cluster.lead.category || 'world' },
    ],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
    originalUrl: cluster.lead.link,
  };
}

/** Prefers clusters with 3+ outlets and makes sure one Hong Kong story is in the run when any has 2+ outlets. */
function isHk(cluster: StoryCluster): boolean {
  return cluster.items.some((item) => item.category === 'hk');
}

export function pickAnalysisClusters(clusters: StoryCluster[], limit = ANALYSIS_PER_RUN): StoryCluster[] {
  const picked = clusters.filter((cluster) => cluster.count >= 3).slice(0, limit);
  if (!picked.some(isHk)) {
    const local = clusters.find((cluster) => cluster.count >= 2 && isHk(cluster));
    if (local) {
      if (picked.length >= limit) picked.pop();
      picked.push(local);
    }
  }
  if (picked.length < Math.min(5, limit)) {
    for (const cluster of clusters) {
      if (picked.length >= Math.min(5, limit)) break;
      if (cluster.count >= 2 && !picked.includes(cluster)) picked.push(cluster);
    }
  }
  return picked;
}

export function analysisEligible(cluster: StoryCluster): boolean {
  return cluster.count >= 3 || (cluster.count >= 2 && isHk(cluster));
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

export function promptFor(doc: ContentDoc, strict = false): { system: string; user: string; maxTokens: number } {
  const system = [
    '你是世界頭條的編輯。一律用繁體中文（香港書面語），不要用簡體字，英文來源都要譯成中文；可以有輕微本地語氣，不要堆砌俚語。',
    '只可使用提供的標題同短描述（excerpt）。禁止添加來源沒有寫的事實、數字、引言、人名、地點、國籍、身份或因果。',
    '提到媒體時照用資料中 source 的名稱（例如 BBC News、Al Jazeera），不要自行翻譯或改名。',
    '不要寫任何人的國籍、職銜、年齡或所屬機構，除非資料原文寫明。人名第一次出現時寫成「中文譯名（English Name）」，不肯定譯名就直接用英文原名。',
    '不要用 Markdown。回覆必須是 JSON。',
    strict ? '上一次回覆有太多英文，或者標題仍然係英文。今次每一則 title 同 sentences 全部要用繁體中文（除咗機構名、人名英文縮寫）。唔可以只改內文而留英文標題。' : '',
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
  const highlight = 'highlight 可選：資料入面有具體數字就用 {"label":"重點數字","items":["數字＋十字以內說明"]}，否則用 {"label":"關鍵詞","items":["詞"]}，最多四項，數字必須原文出現過；沒有就省略 highlight。';
  if (doc.kind === 'analysis') {
    const sources = doc.blocks[0]?.sources ?? [];
    const data = sources.map((source, index) => ({ n: index + 1, source: source.source, title: source.title, excerpt: source.excerpt || '' }));
    const shape = [
      '回傳 {"title":"主標題的中文翻譯","sections":[{"heading":"背景"|"各方說法"|"點解要關心"|"與香港的關係"|"接落嚟留意咩","text":"兩至三句"}],"outlets":[{"n":1,"angle":"十五至三十字，概括呢間媒體報道嘅角度或重點"}],"highlight":{...}}。',
      '只寫資料有實質內容支持的段落；冇料就整段省略，絕對不要寫「來源未有提及」或類似句子。',
      '「各方說法」要比較唔同媒體或當事人講法；「點解要關心」只講資料寫到的影響；「與香港的關係」只在資料直接提到香港或香港讀者明顯受影響時才寫；「接落嚟留意咩」只寫資料提到的下一步、時間表或未解決問題。',
      'outlets 每個來源一項，用 n 對應，angle 只可概括該來源自己的標題同 excerpt。',
    ].join('');
    return { system, user: `${shape}\n${highlight}\n資料：${JSON.stringify(data)} /no_think`, maxTokens: 1500 };
  }
  const shape = doc.kind === 'weekly'
    ? '回傳 {"sections":[{"heading":"一週科技"|"一週財經","text":"..."}],"highlight":{...}}。每段三至五句，只回顧列出的標題。'
    : '回傳 {"items":[{"n":1,"title":"該則新聞的中文標題","sentences":["...","...","..."]}],"highlight":{...}}。每一則剛好三句，綜合至少兩個來源；title 是忠實的中文翻譯。';
  return {
    system,
    user: `${shape}\n${highlight}\n資料：${JSON.stringify(payload)} /no_think`,
    maxTokens: doc.kind === 'digest' ? 3200 : 1000,
  };
}

const FILLER = /來源未有提及|未有足夠|沒有足夠資料|資料未有|未有提供/;

/** True when a model sentence carries real material rather than a "nothing in the sources" filler. */
export function meaningful(sentence: string): boolean {
  const text = sentence.trim();
  return text.length >= 4 && !FILLER.test(text);
}

function sentencesOf(text: string, max: number): string[] {
  return toHK(String(text || '')).split(/(?<=[。！？])/).map((line) => line.trim()).filter(meaningful).slice(0, max);
}

/** Every human-readable string the model wrote, for the language check. */
export function generatedText(doc: ContentDoc): string {
  const parts = [doc.title, ...doc.blocks.flatMap((block) => [doc.kind === 'digest' ? block.title : '', ...block.sentences])];
  for (const block of doc.blocks) for (const source of block.sources) if (source.angle) parts.push(source.angle);
  return parts.join(' ');
}

/** Converts every model-written string to Traditional Chinese (HK). Source titles stay as published. */
export function toTraditional(doc: ContentDoc): ContentDoc {
  const blocks = doc.blocks.map((block) => ({
    ...block,
    title: block.originalTitle ? toHK(block.title) : block.title,
    sentences: block.sentences.map(toHK),
    sources: block.sources.map((source) => (source.angle ? { ...source, angle: toHK(source.angle) } : source)),
  }));
  const next: ContentDoc = { ...doc, blocks, description: toHK(doc.description), title: doc.originalTitle ? toHK(doc.title) : doc.title };
  if (doc.highlight) next.highlight = { ...doc.highlight, items: doc.highlight.items.map(toHK) };
  return next;
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

function sourceText(sources: SourceRef[], extra: string[] = []): string {
  return [...extra, ...sources.flatMap((source) => [source.title, source.excerpt || ''])].join(' \n ');
}

/** A Chinese source headline if any outlet has one (faithful by definition), else the original headline. */
function fallbackTitle(doc: ContentDoc, sources: SourceRef[]): string {
  return sources.find((source) => hasChinese(source.title))?.title || doc.originalTitle || doc.title;
}

/**
 * Deterministic grounding pass over everything the model wrote: unsupported countries and
 * nationalities, model-written outlet names, and bracketed English names for transliterations.
 */
export function guardDoc(doc: ContentDoc): ContentDoc {
  const log: string[] = [];
  const allSources = uniqueSources(doc);
  const names = [...new Set(allSources.map((source) => source.source))];
  const allText = sourceText(allSources, [doc.originalTitle || '']);
  const clean = (text: string, haystack: string): string | null => {
    const outlets = fixOutlets(text, names);
    log.push(...outlets.removed);
    const places = scrubPlaces(outlets.text, haystack);
    log.push(...places.removed);
    return places.dropped ? null : places.text;
  };
  let title = doc.title;
  let originalTitle = doc.originalTitle;
  if (doc.originalTitle) {
    const cleaned = clean(doc.title, allText);
    if (cleaned === null || cleaned !== doc.title) {
      title = fallbackTitle(doc, allSources);
      if (!hasChinese(title) || title === doc.originalTitle) originalTitle = undefined;
      log.push(`標題改用來源標題：${doc.title} → ${title}`);
    }
  }
  const blocks = doc.blocks.map((block) => {
    // Only the published headlines/summaries count as support, never the model's own title.
    const haystack = sourceText(block.sources, [block.originalTitle || '']);
    let blockTitle = block.title;
    let blockOriginal = block.originalTitle;
    if (block.originalTitle) {
      const cleaned = clean(block.title, haystack);
      if (cleaned === null || cleaned !== block.title) {
        blockTitle = block.sources.find((source) => hasChinese(source.title))?.title || block.originalTitle;
        blockOriginal = hasChinese(blockTitle) && blockTitle !== block.originalTitle ? block.originalTitle : undefined;
        log.push(`標題改用來源標題：${block.title} → ${blockTitle}`);
      }
    }
    let sentences = block.sentences.map((line) => clean(line, haystack)).filter((line): line is string => Boolean(line && line.trim()));
    if (doc.kind === 'digest' && sentences.length < 2) sentences = draftSentences(block.sources);
    const sources = block.sources.map((source) => {
      if (!source.angle) return source;
      const angle = clean(source.angle, sourceText([source]));
      if (angle) return { ...source, angle };
      const rest = { ...source };
      delete rest.angle;
      return rest;
    });
    const next: DigestBlock = { ...block, title: blockTitle, sentences, sources };
    if (blockOriginal) next.originalTitle = blockOriginal;
    else delete next.originalTitle;
    return next;
  }).filter((block) => block.sentences.length > 0);
  const english = englishNames(allText, names);
  const bracketed = bracketNames([title, ...blocks.flatMap((block) => block.sentences)], english);
  log.push(...bracketed.added.map((item) => `加上英文名：${item}`));
  let cursor = 1;
  const namedBlocks = blocks.map((block) => {
    const sentences = block.sentences.map(() => bracketed.texts[cursor++] ?? '');
    return { ...block, sentences };
  });
  let highlight = doc.highlight;
  if (highlight) {
    const items = highlight.items.map((item) => clean(item, allText)).filter((item): item is string => Boolean(item));
    highlight = items.length ? { ...highlight, items } : undefined;
  }
  const next: ContentDoc = {
    ...doc,
    title: bracketed.texts[0] || title,
    blocks: namedBlocks,
    description: doc.mode === 'ai' ? namedBlocks[0]?.sentences[0] || doc.description : doc.description,
  };
  if (originalTitle) next.originalTitle = originalTitle;
  else delete next.originalTitle;
  if (highlight) next.highlight = highlight;
  else delete next.highlight;
  if (log.length) next.guard = log;
  else delete next.guard;
  return next;
}

export function applyModelText(doc: ContentDoc, raw: string, model = AI_MODEL): ContentDoc | null {
  const result = applyModelBody(doc, raw, model);
  if (!result) return null;
  const polished = toTraditional(withHighlight(result.doc, result.record));
  // Reject output that is mostly English; the caller may retry once with a stricter prompt.
  if (isMostlyEnglish(generatedText(polished))) return null;
  // Digest midnight fallback: Chinese sentences but English block titles left untranslated → retry.
  // Checked before guardDoc so a grounded-away Chinese title that falls back to the English
  // source headline is not treated as a failed translation.
  if (doc.kind === 'digest' && digestHasEnglishHeadlines(polished)) return null;
  return guardDoc(polished);
}

/** True when a digest still shows English headlines that the model should have translated. */
export function digestHasEnglishHeadlines(doc: ContentDoc): boolean {
  const blocks = doc.blocks.filter((block) => block.sentences.length > 0);
  if (!blocks.length) return false;
  const englishTitles = blocks.filter((block) => !hasChinese(block.title) && isMostlyEnglish(block.title));
  return englishTitles.length >= Math.ceil(blocks.length / 2);
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
  const record = parsed as {
    highlight?: unknown;
    title?: unknown;
    items?: { n?: number; title?: unknown; sentences?: unknown }[];
    sections?: { heading?: string; text?: string }[];
    outlets?: { n?: number; angle?: unknown }[];
  };
  if (doc.kind === 'digest' && Array.isArray(record.items)) {
    const blocks = doc.blocks.map((block, index) => {
      const match = record.items?.find((item) => item.n === index + 1) ?? record.items?.[index];
      const sentences = Array.isArray(match?.sentences) ? match.sentences.filter((line): line is string => typeof line === 'string' && meaningful(line)).slice(0, 3) : [];
      if (sentences.length < 2) return block;
      const zh = typeof match?.title === 'string' ? toHK(match.title.trim()) : '';
      if (zh && hasChinese(zh) && !hasChinese(block.title) && zh.length <= 80) return { ...block, sentences, title: zh, originalTitle: block.originalTitle || block.title };
      return { ...block, sentences };
    });
    if (blocks.every((block, index) => block.sentences === doc.blocks[index]?.sentences)) return null;
    return { doc: { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description }, record };
  }
  if (doc.kind === 'analysis' && Array.isArray(record.sections)) {
    const sources = doc.blocks[0]?.sources ?? [];
    const category = doc.blocks[0]?.category;
    const allowed = new Set<string>(ANALYSIS_HEADINGS);
    const byHeading = new Map<string, string[]>();
    for (const section of record.sections) {
      const heading = toHK(String(section?.heading || '').trim());
      if (!allowed.has(heading) || byHeading.has(heading)) continue;
      const sentences = sentencesOf(String(section?.text || ''), 4);
      if (sentences.length) byHeading.set(heading, sentences);
    }
    const blocks = ANALYSIS_HEADINGS.filter((heading) => byHeading.has(heading)).map((heading) => ({
      title: heading,
      sentences: byHeading.get(heading) ?? [],
      sources,
      ...(category ? { category } : {}),
    }));
    if (!blocks.length) return null;
    const angles = new Map<number, string>();
    for (const [index, row] of (Array.isArray(record.outlets) ? record.outlets : []).entries()) {
      const n = typeof row?.n === 'number' ? row.n : index + 1;
      const angle = typeof row?.angle === 'string' ? toHK(row.angle.trim()) : '';
      if (angle && meaningful(angle) && angle.length <= 80) angles.set(n, angle);
    }
    const withAngles = sources.map((source, index) => (angles.has(index + 1) ? { ...source, angle: angles.get(index + 1) } : source));
    const finalBlocks = blocks.map((block) => ({ ...block, sources: withAngles }));
    const zh = typeof record.title === 'string' ? toHK(record.title.trim()) : '';
    // Only translate English headlines; a Chinese source headline stays as published.
    const titled = zh && hasChinese(zh) && !hasChinese(doc.title) && zh.length <= 90 ? { title: zh, originalTitle: doc.originalTitle || doc.title } : {};
    return { doc: { ...doc, ...titled, blocks: finalBlocks, mode: 'ai', model, description: finalBlocks[0]?.sentences[0] || doc.description }, record };
  }
  if (doc.kind === 'weekly' && Array.isArray(record.sections)) {
    const blocks = doc.blocks.map((block) => {
      const section = record.sections?.find((item) => item.heading === block.title);
      const sentences = sentencesOf(String(section?.text || ''), 5);
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
