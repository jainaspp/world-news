import { briefingOverview } from './headlineNumbers.js';
import { arabicDigits, cantoneseLeft, polishProse, preachySentence, proseSane, rejoinQuotes, splitSentences, tidyDisplay } from './prose.js';
import { researchSources, SOURCE_LIST_CAP } from './search.js';
import { stableId } from './rss.js';
import { hasChinese, isMostlyEnglish, toHK } from './zh.js';
import { bestImage } from './media.js';
import { bracketNames, englishNames, fixOutlets, scrubPlaces } from './grounding.js';
export { bestImage, imageScore } from './media.js';
import type { StoryCluster } from './trending';
import { blockedHkChinaStory } from './feeds.js';

/** Cheap Qwen MoE on Workers AI. Traditional Chinese is strong, and the neuron rate stays inside the free 10k/day. */
export const AI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

/** Cloudflare list price, neurons per 1,000,000 tokens. */
export const MODEL_NEURONS = { inputPerMillion: 4625, outputPerMillion: 30475 };

/**
 * Per HKT day. Existing columns use about 15 calls. Grok briefings, comparisons, and focus intros
 * fall back here when the monthly cap is hit or xAI does not answer, so the pool is larger.
 * A digest-sized call is about 110 neurons; 60 of those stay under the free 10k/day.
 */
export const DAILY_AI_CALLS = 60;

/** Analysis pieces per scheduled run. */
export const ANALYSIS_PER_RUN = 6;

export const ANALYSIS_HEADINGS = ['背景', '各方說法', '點解要關心', '與香港的關係', '接落嚟留意咩'] as const;

export const BRIEFING_HEADINGS = ['香港', '內地', '今日值得留意'] as const;

export type BriefingScope = 'hk' | 'world' | 'techfin';

export type ArticleProvider = 'grok' | 'minimax' | 'workers-ai';

export function briefingScopeOf(key: string): BriefingScope {
  if (key.endsWith('-techfin')) return 'techfin';
  if (key.endsWith('-world')) return 'world';
  return 'hk';
}

export function briefingHeadings(scope: BriefingScope = 'hk'): readonly string[] {
  if (scope === 'world') return ['國際', '今日值得留意'];
  if (scope === 'techfin') return ['科技', '財經', '今日值得留意'];
  return BRIEFING_HEADINGS;
}

export const COMPARE_HEADINGS = ['事件經過', '各方回應', '後續關注'] as const;

/** Narrative Chinese characters. Timeline titles are not the article. */
export function narrativeChars(doc: ContentDoc): number {
  const text = [
    ...(doc.points ?? []),
    ...doc.blocks.filter((block) => block.title !== '事件時間線').flatMap((block) => block.sentences),
  ].join('');
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

/** Render-time cleanup for stored briefings and explainers: numeral fixes and model commentary removed. */
export function tidyStored(doc: ContentDoc): ContentDoc {
  if (doc.kind !== 'briefing' && doc.kind !== 'compare') return doc;
  const blocks = doc.blocks.map((block) => (block.title === '事件時間線'
    ? block
    : { ...block, sentences: rejoinQuotes(block.sentences).map(tidyDisplay).filter((line) => line.trim() && !preachySentence(line)) }))
    .filter((block) => block.title === '事件時間線' || block.sentences.length > 0);
  const next: ContentDoc = { ...doc, title: tidyDisplay(doc.title), description: tidyDisplay(doc.description), blocks };
  if (doc.points) next.points = doc.points.map(tidyDisplay).filter((line) => line.trim() && !preachySentence(line));
  return next;
}

/** Fewer summary points than this and the piece is treated as thin. */
export const MIN_PUBLIC_POINTS = 2;

/** Below this, a briefing or explainer stays unpublished. */
export const PUBLISH_FLOOR = 500;

/** Grok-verified MiniMax explainers list from 400 narrative characters (with at least 2 points). */
export const VERIFIED_MINIMAX_FLOOR = 400;

/** The explainer floor for this piece: 400 when MiniMax wrote it and Grok verified it, else 500. */
export function explainerFloor(doc: ContentDoc): number {
  return doc.provider === 'minimax' && doc.verified === 'grok' ? VERIFIED_MINIMAX_FLOOR : PUBLISH_FLOOR;
}

/** Briefings are multi-section digests; list them from 400 narrative characters. Explainers keep the 500 floor. */
export const BRIEFING_PUBLIC_FLOOR = 400;

/** Narrative prose of a briefing or explainer: every block except the data-built timeline. */
export function narrativeProse(doc: ContentDoc): string {
  return doc.blocks.filter((block) => block.title !== '事件時間線').flatMap((block) => block.sentences).join('');
}

/** Normal punctuation and no broken score runs in the narrative. */
export function narrativeSane(doc: ContentDoc): boolean {
  return proseSane(narrativeProse(doc));
}

/**
 * A MiniMax piece that is mid-pipeline or has not passed Grok's verification pass. It is never
 * listed and its page shows only the source list.
 */
export function heldMiniMax(doc: ContentDoc): boolean {
  if (doc.stage === 'drafted' || doc.stage === 'verify') return true;
  return doc.provider === 'minimax' && doc.mode === 'ai' && doc.verified !== 'grok';
}

/** A comparison that is thin, old-format, or still Cantonese stays out of the public list. */
export function explainerCurrent(stored: ContentDoc): boolean {
  if (stored.kind !== 'compare' || stored.mode !== 'ai' || heldMiniMax(stored)) return false;
  const doc = tidyStored(stored);
  if ((doc.points?.length ?? 0) < MIN_PUBLIC_POINTS) return false;
  if (!hasChinese(doc.title)) return false;
  const titles = new Set(doc.blocks.map((block) => block.title));
  if (!titles.has('事件時間線') || !titles.has('事件經過')) return false;
  if (narrativeChars(doc) < explainerFloor(doc)) return false;
  if (!narrativeSane(doc)) return false;
  const prose = [
    doc.title,
    doc.description,
    ...(doc.points ?? []),
    ...doc.blocks.filter((block) => block.title !== '事件時間線').flatMap((block) => block.sentences),
  ].join('\n');
  return !cantoneseLeft(prose);
}

/** A briefing under the floor is noindex and omitted from the index and sitemap. */
export function briefingPublic(stored: ContentDoc): boolean {
  if (stored.kind !== 'briefing' || stored.mode !== 'ai' || heldMiniMax(stored)) return false;
  const doc = tidyStored(stored);
  if ((doc.points?.length ?? 0) < MIN_PUBLIC_POINTS) return false;
  if (!hasChinese(doc.title)) return false;
  const titles = new Set(doc.blocks.map((block) => block.title));
  const scope = briefingScopeOf(doc.key);
  const headings = briefingHeadings(scope);
  const body = headings.filter((heading) => heading !== '今日值得留意');
  // The world and tech/finance briefs may stand without the watch-list section.
  if ((scope === 'hk' && !titles.has('今日值得留意')) || !body.some((heading) => titles.has(heading))) return false;
  if (narrativeChars(doc) < BRIEFING_PUBLIC_FLOOR) return false;
  if (!narrativeSane(doc)) return false;
  const prose = [doc.title, doc.description, ...(doc.points ?? []), ...doc.blocks.flatMap((block) => block.sentences)].join('\n');
  return !cantoneseLeft(prose);
}

export const TIMELINE_HEADING = '事件時間線';

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
  /** Fact or figure this outlet itself reported. */
  facts?: string;
  /** Short description of how this outlet framed the story. */
  tone?: string;
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
  kind: 'digest' | 'analysis' | 'weekly' | 'briefing' | 'compare';
  key: string;
  title: string;
  description: string;
  blocks: DigestBlock[];
  publishedAt: string;
  hkt: string;
  mode: 'ai' | 'sources';
  model?: string;
  /** Which writer produced this piece. Missing on rows from before MiniMax. */
  provider?: ArticleProvider;
  /** MiniMax piece mid-pipeline: 'drafted' is not fact-checked yet and never shown; 'checked' awaits its second draft. */
  stage?: 'drafted' | 'checked' | 'verify';
  /** Set once Grok's final verification pass has run on a MiniMax piece. */
  verified?: 'grok';
  /** Grok verification cost for this piece, in US dollars. */
  verifyUsd?: number;
  highlight?: Highlight;
  /** Short takeaways for the key-points box. Briefing and comparison pieces. */
  points?: string[];
  originalTitle?: string;
  originalUrl?: string;
  /** Phrases the grounding guard removed or changed. Stored for audit, not shown. */
  guard?: string[];
  /** URLs Grok's web search actually returned, merged with the cluster links. Shown once at the bottom. */
  citations?: SourceRef[];
  /** Web search supplied facts, so a later render does not drop figures that were not in the board excerpt. */
  researched?: boolean;
  /** Set when a follow-up appended timeline rows instead of writing a new piece. */
  updatedAt?: string;
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

const SECOND_LEVEL = /^(co|com|org|net|gov|edu|ac)$/;

/** Outlet brand from a URL: bbc.co.uk and bbc.com → bbc, edition.cnn.com → cnn. */
export function brandKey(url: string): string {
  try {
    const labels = new URL(url).hostname.toLowerCase().replace(/^www\./, '').split('.');
    let index = labels.length - 2;
    if (index > 0 && SECOND_LEVEL.test(labels[index] || '') && (labels[labels.length - 1] || '').length === 2) index -= 1;
    return labels[Math.max(0, index)] || '';
  } catch {
    return '';
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** A title made from a URL slug: lower-case ASCII words only. */
function slugTitle(title: string): boolean {
  return /^[a-z0-9\s'’…-]+$/.test(title);
}

/** "coco gauff racist abuse china open b3061943" → "Coco gauff racist abuse china open". */
function prettySlug(title: string): string {
  const words = title.replace(/…$/, '').split(/\s+/).filter((word) => word && !(/\d/.test(word) && word.length >= 5));
  const text = words.join(' ');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

/**
 * The list a reader sees under 來源. Cluster links (named outlets) always stay. Web citations
 * are dropped when they repeat an outlet already listed or when all we have is a bare domain;
 * slug titles are tidied.
 */
export function sourceList(doc: ContentDoc, cap = SOURCE_LIST_CAP): SourceRef[] {
  const known = uniqueSources(doc);
  const knownUrls = new Set(known.map((source) => source.url));
  const base = doc.citations?.length ? doc.citations : known;
  const brands = new Set(base.filter((source) => knownUrls.has(source.url)).map((source) => brandKey(source.url)));
  const out: SourceRef[] = [];
  for (const source of base) {
    if (out.length >= cap) break;
    if (knownUrls.has(source.url)) {
      out.push(source);
      continue;
    }
    const brand = brandKey(source.url);
    if (!brand || brands.has(brand)) continue;
    const title = (source.title || '').trim();
    if (!title || title === hostOf(source.url) || title === source.source) continue;
    const shown = slugTitle(title) ? prettySlug(title) : title;
    if (!shown) continue;
    brands.add(brand);
    out.push(shown === title ? source : { ...source, title: shown });
  }
  return out;
}

/**
 * Put the URLs Grok cited first, then cluster links that survived the same-event filter.
 * A citation that is already a cluster link keeps that outlet's name.
 */
export function attachCitations(doc: ContentDoc, urls: string[]): ContentDoc {
  const cited = researchSources(urls);
  if (!cited.length) return doc;
  const known = new Map(uniqueSources(doc).map((source) => [source.url, source]));
  const seen = new Set<string>();
  const merged: SourceRef[] = [];
  const push = (source: SourceRef) => {
    if (!source.url || seen.has(source.url) || merged.length >= SOURCE_LIST_CAP) return;
    seen.add(source.url);
    merged.push(source);
  };
  for (const source of cited) push(known.get(source.url) ?? source);
  for (const source of known.values()) push(source);
  return { ...doc, citations: merged };
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
      excerpt: item.excerpt?.slice(0, 2_500),
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
  const blocks = clusters.slice(0, 10).filter((cluster) => cluster.count >= 2 && !hkChinaClusterBlocked(cluster)).map((cluster) => {
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

function isChinaDesk(cluster: StoryCluster): boolean {
  return cluster.items.some((item) => item.category === 'china');
}

/** HK/mainland-desk clusters must not carry Taiwan / sensitive / blocked-outlet material. */
function hkChinaClusterBlocked(cluster: StoryCluster): boolean {
  if (!isHk(cluster) && !isChinaDesk(cluster)) return false;
  return cluster.items.some((item) => blockedHkChinaStory(item));
}

export function pickAnalysisClusters(clusters: StoryCluster[], limit = ANALYSIS_PER_RUN): StoryCluster[] {
  const picked = clusters.filter((cluster) => cluster.count >= 3 && !hkChinaClusterBlocked(cluster)).slice(0, limit);
  if (!picked.some(isHk)) {
    const local = clusters.find((cluster) => cluster.count >= 2 && isHk(cluster) && !hkChinaClusterBlocked(cluster));
    if (local) {
      if (picked.length >= limit) picked.pop();
      picked.push(local);
    }
  }
  if (picked.length < Math.min(5, limit)) {
    for (const cluster of clusters) {
      if (picked.length >= Math.min(5, limit)) break;
      if (cluster.count >= 2 && !hkChinaClusterBlocked(cluster) && !picked.includes(cluster)) picked.push(cluster);
    }
  }
  return picked;
}

export function analysisEligible(cluster: StoryCluster): boolean {
  if (hkChinaClusterBlocked(cluster)) return false;
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

/** `true` is the thin-material web_search fallback. `material` writes from fetched excerpts and does not search. */
export type ResearchMode = boolean | 'material';

function columnPrompt(doc: ContentDoc, strict: boolean, research: ResearchMode = false, excerptOverride?: number): { system: string; user: string; maxTokens: number } {
  const usingSearch = research === true;
  const usingMaterial = research === 'material';
  const bounds = usingSearch
    ? '下面的標題和摘錄可能不足。動筆之前最多用網頁搜尋 2 次，找這一件事的完整報道、背景、數字和較早發展，搜尋完才寫。只採用通訊社、報章和廣播等新聞來源，不要採用社交媒體、論壇或百科。正文採用的來源最多 8 個。事實必須來自搜尋結果或下面的標題，禁止添加兩邊都沒有的事實、數字、引言、人名、地點或因果。'
    : '只可使用提供的標題和摘錄。同一事實只寫一次：各家說法相同就合併成一句，只有數字或措辭不同時才點名是哪一家。禁止添加來源沒有寫的事實、數字、引言、人名、地點、因果或形容，例如「迅速」「安全救下」。不要搜尋。';
  const system = [
    '你是世界頭條的編輯，寫原創整合，不是改寫任何一篇報道。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語。',
    '判斷用「是」。使用全形標點。相關的分句用「，」連成一句，每句 25 至 45 字，不要寫成一連串以「。」分隔的短句；每段都要有逗號。中文之間不要用空格分隔。數字和年份一律用阿拉伯數字，例如 2026、3.2%、21.44億、13歲、305份，不要寫成「十三歲」「三百零五份」。',
    bounds,
    '不要寫「未有回應」「未有評論」「政府未有表態」這類否定句，除非摘錄原文這樣寫。沒有回應、沒有數字、沒有下一步，就整段省略，不要用空話填篇幅。',
    '不要添加資料以外的背景事實。不要寫免責聲明，也不要寫說教或呼籲句。',
    '用新聞書面語寫成自然段落，句子長短要有變化，每段二至四句，使用全形逗號。不要把一句話拆成許多短句，也不要寫「事件造成…結果」這類空話。引文每次不超過二十字，不要大段照抄摘錄。',
    '不要稱呼資料欄位，也不要談論材料的格式。不要把標題原句串成內文。',
    '來源標題或引述若是粵語口語（例如 嘢、咗、嘅、係、拎、喺），一律改寫成書面語轉述，不要照抄粵語字詞，引號內也一樣。',
    '提到媒體時照用資料中 source 的名稱，不要自行翻譯或改名，也不要在名稱後面再加一次分類。',
    'title 必須是你為這一件事撰寫的中文標題，不要拼接來源標題，也不要改用其中一條標題。英文來源同樣要寫中文標題。不要用 Markdown。回覆必須是 JSON。',
    usingSearch
      ? '正文寫 700 至 1000 個中文字，用搜尋到的背景、數字和經過把內容寫充實，不要為了湊字重複同一事實。'
      : usingMaterial
        ? '用提供的摘錄把經過、數字和背景寫清楚。各節字數以下文為準，不要為了湊字重複同一事實。'
        : '正文至少 500 個中文字。材料不夠就如實寫短，不要為了湊字重複同一事實。',
    strict ? '上一次太短、太多英文，或夾有粵語口語。今次每一句都用正式新聞書面語，正文至少 500 個中文字，同一事實只寫一次。' : '',
  ].join('');
  const excerptCap = excerptOverride ?? (usingMaterial ? 1_200 : 480);
  const clip = (source: SourceRef, index: number) => ({
    n: index + 1,
    source: source.source,
    title: source.title,
    excerpt: (source.excerpt || '').slice(0, usingMaterial && index >= 6 && !excerptOverride ? 160 : excerptCap),
  });
  const background = usingSearch ? '搜尋到的背景' : '摘錄中的背景';
  if (doc.kind === 'briefing') {
    const scope = briefingScopeOf(doc.key);
    const headings = briefingHeadings(scope);
    const data = doc.blocks
      .filter((block) => headings.includes(block.title) && block.title !== '今日值得留意')
      .map((block) => ({ heading: block.title, sources: block.sources.map(clip) }));
    const headingUnion = headings.map((heading) => `"${heading}"`).join('|');
    const lengthRule = scope === 'techfin'
      ? '每個 heading 只出現一次；科技和財經兩段各寫 250 至 350 字，涵蓋兩至三件事，並只用提供的摘錄說明為何重要；今日值得留意寫 100 至 150 字。每句 25 至 45 字，不要寫成一連串短句。'
      : scope === 'world'
        ? '每個 heading 只出現一次；國際段寫 350 至 550 字，涵蓋兩至三件事，並只用提供的摘錄說明為何重要；今日值得留意寫 100 至 150 字。每句 25 至 45 字，不要寫成一連串短句。'
        : `每個 heading 只出現一次；香港和內地兩段各寫 250 至 350 字，涵蓋兩至三件事，並用${background}說明為何重要；今日值得留意寫 100 至 150 字。每句 25 至 45 字，不要寫成一連串短句。`;
    const sectionRule = scope === 'techfin'
      ? '科技段只根據科技來源，財經段只根據財經來源。兩段都要寫；只有標題沒有摘錄的來源，就只寫標題已說明的事實，不要推測。資料完全沒有該類來源時才省略那一段。今日值得留意必須寫。'
      : scope === 'world'
        ? '國際段只根據提供的國際來源；只有標題沒有摘錄的來源，就只寫標題已說明的事實，不要推測。今日值得留意必須寫。'
        : '香港段只根據香港來源，內地段只根據內地來源。沒有來源的一邊就整段省略。';
    const watch = scope === 'hk'
      ? '今日值得留意綜合兩邊，寫今日要追的具體事項，仍然只可以用上面出現過的事實。不要在這一段重複列出連結。'
      : '今日值得留意綜合上面各段，寫今日要追的具體事項，仍然只可以用上面出現過的事實。不要在這一段重複列出連結。';
    const shape = [
      `回傳 {"title":"以一則主要新聞為主的新聞標題","description":"今日要聞：……","sections":[{"heading":${headingUnion},"text":"..."}],"points":["重點","重點","重點"]}。${lengthRule}`,
      'title 是正式書面語的新聞標題，圍繞今日最重要的一則新聞，14 至 26 字；可以用「，」或「；」接一個簡短的次要分句，最多涉及兩件事。不可把三則新聞的標題串在一起，也不可省去標點。其他新聞寫進 points，points 第一項就是標題那則新聞。',
      'description 以「今日要聞：」開頭，60 字以內，用一句概括兩至三則主要新聞，不要照抄任何一段的第一句。',
      `這是分析，不是標題清單，也不是逐家複述。每一段先寫發生了甚麼，再寫${usingSearch ? '搜尋結果或來源' : '來源'}提到的影響。不要寫「凸顯…重要性」「提醒市民…」「為…鋪路」這類評論或說教。同一事實只寫一次。句子長短要有變化。`,
      sectionRule,
      watch,
      'points 三至四項，每項 30 字以內。標題、description 和 points 的數字必須與正文所寫完全一致。',
    ].join('');
    const maxTokens = usingSearch ? 4_500 : usingMaterial ? 3_200 : 2_400;
    return { system, user: `${shape}\n資料：${JSON.stringify(data)} /no_think`, maxTokens };
  }
  const timeline = doc.blocks.find((block) => block.title === TIMELINE_HEADING);
  const sources = (timeline?.sources.length ? timeline.sources : doc.blocks[0]?.sources) ?? [];
  const depth = usingSearch || usingMaterial
    ? `「事件經過」分三段寫（段與段之間用換行），第一段交代事件本身，第二段補充${background}和較早發展，第三段寫關鍵數字和影響，每段 120 字以上。三節正文合共少於 600 字會被退回重寫。`
    : '';
  const shape = [
    '回傳 {"title":"你撰寫的中文標題","description":"40字以內的摘要","points":["重點","重點","重點"],"highlight":{"label":"重點數字","items":["名稱與單位，例如加幅 3.2%"]},"sections":[{"heading":"事件經過"|"各方回應"|"後續關注","text":"..."}]}。每個 heading 只出現一次。「事件經過」寫 350 至 500 字，按時間交代背景、經過和關鍵數字；「各方回應」寫 120 至 200 字；「後續關注」寫 100 至 160 字。每句 25 至 45 字，把相關細節寫在同一句，不要寫成一連串短句。',
    '這是一篇新聞懶人包，把各家報道收成一篇，讓讀者立刻明白發生了甚麼。不要做成對照表，不要按媒體各寫一遍同一個事實。',
    'points 剛好三行，每行 20 至 35 字，是文首摘要。highlight 的每一項都要有中文名稱和單位，例如「加幅 3.2%」「規模 21.44億歐元」；沒有數字就省略 highlight。不要只寫「3.2%」或「307」。',
    '「事件經過」按時間寫清經過，分成自然段落。「各方回應」只寫來源點名的人或機構說了甚麼；來源沒有引述就不要輸出這一節。「後續關注」只寫來源提到的下一步、日期或未決事項；沒有就不要輸出這一節。',
    'title 是這一件事的中文標題，不要拼接來源標題。禁止添加來源沒有的事實。',
    `主事件是「${doc.title}」。資料若混有另一件事，只寫主事件，與主事件無關的來源完全不要寫，也不要把兩件事寫在一起。`,
    depth,
  ].join('');
  const maxTokens = usingSearch ? 4_000 : usingMaterial ? 2_800 : 2_000;
  return {
    system,
    user: `${shape}\n資料：${JSON.stringify(sources.map(clip))} /no_think`,
    maxTokens,
  };
}

export function promptFor(doc: ContentDoc, strict = false, research: ResearchMode = false, excerptCap?: number): { system: string; user: string; maxTokens: number } {
  if (doc.kind === 'briefing' || doc.kind === 'compare') return columnPrompt(doc, strict, research, excerptCap);
  const system = [
    '你是世界頭條的編輯。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語，英文來源都要譯成中文。',
    '只可使用提供的標題和摘錄。禁止添加來源沒有寫的事實、數字、引言、人名、地點、國籍、身份或因果。',
    '提到媒體時照用資料中 source 的名稱（例如 BBC News、Al Jazeera），不要自行翻譯或改名。',
    '不要寫任何人的國籍、職銜、年齡或所屬機構，除非資料原文寫明。人名第一次出現時寫成「中文譯名（English Name）」，不肯定譯名就直接用英文原名。',
    '不要用 Markdown。回覆必須是 JSON。',
    strict ? '上一次回覆有太多英文，或標題仍然是英文。今次每一則 title 和 sentences 都要用繁體中文正式新聞書面語（機構名、人名英文縮寫可以保留）。不可以只改內文而留下英文標題。' : '',
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
  const highlight = 'highlight 可選：資料裡有具體數字就用 {"label":"重點數字","items":["數字＋十字以內說明"]}，否則用 {"label":"關鍵詞","items":["詞"]}，最多四項，數字必須原文出現過；沒有就省略 highlight。';
  if (doc.kind === 'analysis') {
    const sources = doc.blocks[0]?.sources ?? [];
    const data = sources.map((source, index) => ({ n: index + 1, source: source.source, title: source.title, excerpt: source.excerpt || '' }));
    const shape = [
      '回傳 {"title":"主標題的中文翻譯","sections":[{"heading":"背景"|"各方說法"|"點解要關心"|"與香港的關係"|"接落嚟留意咩","text":"三至四句，每句至少三十五字"}],"outlets":[{"n":1,"angle":"十五至三十字，概括這間媒體報道的角度或重點"}],"highlight":{...}}。',
      '有資料支持的段落寫清楚，全篇正文以四百字為目標。只寫資料有實質內容支持的段落；沒有資料就整段省略，不要寫「來源未有提及」或類似句子。',
      '「各方說法」比較不同媒體的說法；「點解要關心」只寫資料提到的影響；「與香港的關係」只在資料直接提到香港，或對香港讀者有明顯影響時才寫；「接落嚟留意咩」只寫資料提到的下一步、時間表或未解決問題。內文用正式新聞書面語。',
      'outlets 每個來源一項，用 n 對應，angle 只可概括該來源自己的標題和摘錄。',
    ].join('');
    return { system, user: `${shape}\n${highlight}\n資料：${JSON.stringify(data)} /no_think`, maxTokens: 1500 };
  }
  const shape = doc.kind === 'weekly'
    ? '回傳 {"sections":[{"heading":"一週科技"|"一週財經","text":"..."}],"highlight":{...}}。每段六至八句，每句至少三十字，只回顧列出的標題。標題足夠時兩段正文合計約四百字；標題不足就如實寫短，不要編造。'
    : '回傳 {"items":[{"n":1,"title":"該則新聞的中文標題","sentences":["...","...","..."]}],"highlight":{...}}。每一則剛好三句，每句至少四十字，綜合至少兩個來源；title 是忠實的中文翻譯。';
  return {
    system,
    user: `${shape}\n${highlight}\n資料：${JSON.stringify(payload)} /no_think`,
    maxTokens: doc.kind === 'digest' ? 3200 : 1400,
  };
}

const FILLER = /來源未有提及|未有足夠|沒有足夠資料|資料未有|未有提供/;

/** True when a model sentence carries real material rather than a "nothing in the sources" filler. */
export function meaningful(sentence: string): boolean {
  const text = sentence.trim();
  return text.length >= 4 && !FILLER.test(text);
}

function sentencesOf(text: string, max: number): string[] {
  return splitSentences(toHK(String(text || ''))).filter(meaningful).slice(0, max);
}

/** Every human-readable string the model wrote, for the language check. */
export function generatedText(doc: ContentDoc): string {
  const parts = [doc.title, ...(doc.points ?? []), ...doc.blocks.flatMap((block) => [doc.kind === 'digest' ? block.title : '', ...block.sentences])];
  for (const block of doc.blocks) {
    for (const source of block.sources) {
      if (source.angle) parts.push(source.angle);
      if (source.facts) parts.push(source.facts);
      if (source.tone) parts.push(source.tone);
    }
  }
  return parts.join(' ');
}

/** Converts every model-written string to Traditional Chinese (HK). Source titles stay as published. */
export function toTraditional(doc: ContentDoc): ContentDoc {
  const blocks = doc.blocks.map((block) => ({
    ...block,
    title: block.originalTitle ? toHK(block.title) : block.title,
    sentences: block.sentences.map(toHK),
    sources: block.sources.map((source) => {
      const next = { ...source };
      if (source.angle) next.angle = toHK(source.angle);
      if (source.facts) next.facts = toHK(source.facts);
      if (source.tone) next.tone = toHK(source.tone);
      return next;
    }),
  }));
  const next: ContentDoc = { ...doc, blocks, description: toHK(doc.description), title: doc.originalTitle ? toHK(doc.title) : doc.title };
  if (doc.highlight) next.highlight = { ...doc.highlight, items: doc.highlight.items.map(toHK) };
  if (doc.points) next.points = doc.points.map(toHK);
  return next;
}

/** Keeps a model highlight only if every number in it appears in the source titles/excerpts. */
export function cleanHighlight(doc: ContentDoc, value: unknown): Highlight | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as { label?: unknown; items?: unknown };
  const label = row.label === '重點數字' ? '重點數字' : row.label === '關鍵詞' ? '關鍵詞' : null;
  if (!label || !Array.isArray(row.items)) return undefined;
  const haystack = arabicDigits(doc.blocks.flatMap((block) => [block.title, ...block.sources.flatMap((source) => [source.title, source.excerpt || ''])]).join(' ')).replace(/,/g, '');
  const items = row.items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length > 0 && item.length <= 28)
    .filter((item) => (arabicDigits(item).replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).every((number) => haystack.includes(number)))
    .filter((item) => label !== '重點數字' || labeledNumber(item))
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

/** A 重點數字 item needs a unit and a Chinese label, not a bare figure such as 3.2% or 約 3%. */
function labeledNumber(item: string): boolean {
  const text = arabicDigits(item);
  if (!/\d/.test(text)) return false;
  const hasUnit = /%|％|億|萬|元|美元|港元|歐元|人|項|次|公里|米|噸|歲/.test(text);
  const rest = text.replace(/\d+(?:\.\d+)?/g, '').replace(/[%％\s·]/g, '');
  if (!hasUnit || !/[\u3400-\u9fff]/.test(rest)) return false;
  return !/^[約大概左右]+$/.test(rest);
}

const EMBELLISHMENTS = ['迅速', '安全救下', '英勇', '驚險', '慘烈', '史無前例'];

function stripEmbellishments(text: string, haystack: string): string {
  let out = text;
  for (const word of EMBELLISHMENTS) {
    if (!haystack.includes(word)) out = out.split(word).join('');
  }
  return out.replace(/，{2,}/g, '，').replace(/^[，、\s]+/, '').replace(/[，、\s]+$/, '');
}

function sourceText(sources: SourceRef[], extra: string[] = []): string {
  return [...extra, ...sources.flatMap((source) => [source.title, source.excerpt || ''])].join(' \n ');
}

/** Every number in `text` has to show up in the source haystack. Commas are ignored; Chinese numerals count as their digits. */
function numbersSupported(text: string, haystack: string): boolean {
  const hay = arabicDigits(haystack).replace(/,/g, '');
  return (arabicDigits(text).replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).every((number) => hay.includes(number));
}

const DENIAL = /未有回應|未有評論|沒有回應|沒有評論|未作回應|未作評論|尚未回應|尚未評論|未有表態|沒有表態|政府未有|議員未有/;
const PADDED = /造成.+結果|事件造成/;

/** Drop invented "nobody commented" lines and sentences copied verbatim from the lead text. */
function publishableSentence(line: string, haystack: string): boolean {
  if (PADDED.test(line)) return false;
  if (DENIAL.test(line) && !DENIAL.test(haystack)) return false;
  const compact = line.replace(/\s/g, '');
  if (compact.length >= 24 && haystack.replace(/\s/g, '').includes(compact)) return false;
  return true;
}

function groundedField(value: string | undefined, haystack: string, clean: (text: string, haystack: string) => string | null): string | undefined {
  if (!value) return undefined;
  if (!numbersSupported(value, haystack)) return undefined;
  const cleaned = clean(value, haystack);
  return cleaned || undefined;
}

/** A Chinese source headline if any outlet has one (faithful by definition), else the original headline. */
function fallbackTitle(doc: ContentDoc, sources: SourceRef[]): string {
  return sources.find((source) => hasChinese(source.title))?.title || doc.originalTitle || doc.title;
}

/**
 * Deterministic grounding pass over everything the model wrote: unsupported countries and
 * nationalities, model-written outlet names, and bracketed English names for transliterations.
 */
/**
 * A briefing's lead is an overview of the edition: the model's 「今日要聞：…」 line when it is grounded
 * and not a copy of the first section, otherwise 「今日要聞：」 plus the first summary points.
 */
function briefingLead(
  written: string,
  firstSentence: string,
  points: readonly string[],
  allText: string,
  clean: (text: string, haystack: string) => string | null,
): string {
  const model = written.trim();
  const copied = !model || model === firstSentence || firstSentence.startsWith(model.replace(/[。！？]$/u, '').slice(0, 16));
  if (!copied && model.startsWith('今日要聞') && numbersSupported(model, allText)) {
    const cleaned = clean(model, allText);
    if (cleaned && hasChinese(cleaned)) return cleaned;
  }
  return briefingOverview(points) ?? (firstSentence || model);
}

export function guardDoc(doc: ContentDoc, options?: { researched?: boolean }): ContentDoc {
  const log: string[] = [];
  // Researched pieces carry facts from web search, so headline-only place and number checks would cut them.
  const researched = Boolean(options?.researched || doc.researched);
  const allSources = uniqueSources(doc);
  const names = [...new Set(allSources.map((source) => source.source))];
  const allText = sourceText(allSources, [doc.originalTitle || '']);
  const clean = (text: string, haystack: string): string | null => {
    const outlets = fixOutlets(text, names);
    log.push(...outlets.removed);
    const plain = stripEmbellishments(outlets.text, haystack);
    if (researched) return plain;
    const places = scrubPlaces(plain, haystack);
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
  if ((doc.kind === 'briefing' || doc.kind === 'compare') && title === doc.title) {
    const cleaned = clean(title, allText);
    const unsupportedNumber = !researched && Boolean(cleaned) && !numbersSupported(cleaned || '', allText);
    if (cleaned && hasChinese(cleaned) && !unsupportedNumber) title = cleaned;
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
    if (doc.kind === 'briefing' || doc.kind === 'compare') sentences = sentences.filter((line) => publishableSentence(line, haystack));
    if (doc.kind === 'digest' && sentences.length < 2) sentences = draftSentences(block.sources);
    const sources = block.sources.map((source) => {
      const own = sourceText([source]);
      const next = { ...source };
      const angle = groundedField(source.angle, own, clean);
      const facts = groundedField(source.facts, own, clean);
      const tone = groundedField(source.tone, own, clean);
      if (angle) next.angle = angle;
      else delete next.angle;
      if (facts) next.facts = facts;
      else delete next.facts;
      if (tone) next.tone = tone;
      else delete next.tone;
      return next;
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
    // The timeline lists raw source headlines, so the dek comes from the first written section.
    description: doc.mode === 'ai' ? (namedBlocks.find((block) => block.title !== TIMELINE_HEADING) ?? namedBlocks[0])?.sentences[0] || doc.description : doc.description,
  };
  const points = (doc.points ?? [])
    .map((item) => ((researched || numbersSupported(item, allText)) ? clean(item, allText) : null))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);
  if (doc.kind === 'briefing' && doc.mode === 'ai') next.description = briefingLead(doc.description, next.description, points, allText, clean);
  if (originalTitle) next.originalTitle = originalTitle;
  else delete next.originalTitle;
  if (highlight) next.highlight = highlight;
  else delete next.highlight;
  if (points.length) next.points = points;
  else delete next.points;
  if (log.length) next.guard = log;
  else delete next.guard;
  if (researched) next.researched = true;
  else delete next.researched;
  return tidyStored(next);
}

function polishColumn(doc: ContentDoc): ContentDoc {
  if (doc.kind !== 'briefing' && doc.kind !== 'compare') return doc;
  const text = (value: string) => polishProse(value);
  const blocks = doc.blocks.map((block) => ({
    ...block,
    title: text(block.title),
    sentences: rejoinQuotes(block.sentences.flatMap((line) => splitSentences(text(line)))),
    sources: block.sources.map((source) => {
      const next = { ...source };
      if (source.angle) next.angle = text(source.angle);
      if (source.facts) next.facts = text(source.facts);
      if (source.tone) next.tone = text(source.tone);
      return next;
    }),
  })).filter((block) => block.sentences.length > 0);
  const points = doc.points?.map(text).map((item) => item.trim()).filter(Boolean);
  const next: ContentDoc = { ...doc, title: text(doc.title), description: text(doc.description), blocks };
  if (points?.length) next.points = points;
  else delete next.points;
  return next;
}

export function applyModelText(doc: ContentDoc, raw: string, model = AI_MODEL, options?: { researched?: boolean }): ContentDoc | null {
  const result = applyModelBody(doc, raw, model);
  if (!result) return null;
  const polished = polishColumn(toTraditional(withHighlight(result.doc, result.record)));
  // Reject output that is mostly English; the caller may retry once with a stricter prompt.
  if (isMostlyEnglish(generatedText(polished))) return null;
  // Cantonese particles are rejected so the caller regenerates in formal news Chinese.
  if ((doc.kind === 'briefing' || doc.kind === 'compare') && cantoneseLeft(generatedText(polished))) return null;
  // Lost punctuation (or a glued score such as 七比56比一) is rejected so the caller retries.
  if ((doc.kind === 'briefing' || doc.kind === 'compare') && !narrativeSane(polished)) return null;
  // Digest midnight fallback: Chinese sentences but English block titles left untranslated → retry.
  // Checked before guardDoc so a grounded-away Chinese title that falls back to the English
  // source headline is not treated as a failed translation.
  if (doc.kind === 'digest' && digestHasEnglishHeadlines(polished)) return null;
  return guardDoc(polished, options);
}

/** True when a digest still shows English headlines that the model should have translated. */
export function digestHasEnglishHeadlines(doc: ContentDoc): boolean {
  const blocks = doc.blocks.filter((block) => block.sentences.length > 0);
  if (!blocks.length) return false;
  const englishTitles = blocks.filter((block) => !hasChinese(block.title) && isMostlyEnglish(block.title));
  return englishTitles.length >= Math.ceil(blocks.length / 2);
}

function pointList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => toHK(item.trim()))
    .filter((item) => meaningful(item) && item.length <= 40)
    .slice(0, 4);
}

function applyColumnModel(
  doc: ContentDoc,
  record: {
    title?: unknown;
    description?: unknown;
    points?: unknown;
    sections?: { heading?: string; text?: string }[];
    outlets?: { n?: number; emphasis?: unknown; angle?: unknown; facts?: unknown; tone?: unknown }[];
    highlight?: unknown;
  },
  model: string,
): { doc: ContentDoc; record: { highlight?: unknown } } | null {
  if (doc.kind !== 'briefing' && doc.kind !== 'compare') return null;
  if (!Array.isArray(record.sections)) return null;
  const allowed = new Set<string>(doc.kind === 'briefing' ? briefingHeadings(briefingScopeOf(doc.key)) : COMPARE_HEADINGS);
  const byHeading = new Map<string, string[]>();
  for (const section of record.sections) {
    const heading = toHK(String(section?.heading || '').trim());
    if (!allowed.has(heading) || byHeading.has(heading)) continue;
    const sentences = sentencesOf(String(section?.text || ''), 16);
    if (sentences.length) byHeading.set(heading, sentences);
  }
  const draftByHeading = new Map(doc.blocks.map((block) => [block.title, block]));
  const allSources = uniqueSources(doc);
  const blocks = [...allowed].filter((heading) => byHeading.has(heading)).map((heading) => {
    const draft = draftByHeading.get(heading);
    const sources = heading === '今日值得留意' ? [] : (draft?.sources.length ? draft.sources : allSources);
    const category = draft?.category || doc.blocks[0]?.category;
    return {
      title: heading,
      sentences: byHeading.get(heading) ?? [],
      sources,
      ...(category ? { category } : {}),
    };
  });
  if (!blocks.length) return null;
  const timeline = doc.kind === 'compare' ? draftByHeading.get(TIMELINE_HEADING) : undefined;
  const withFrames = timeline ? [timeline, ...blocks] : blocks;
  const zh = typeof record.title === 'string' ? toHK(record.title.trim()) : '';
  const titled = zh && hasChinese(zh) && zh.length <= 48
    ? { title: zh, ...(!hasChinese(doc.title) ? { originalTitle: doc.originalTitle || doc.title } : {}) }
    : {};
  const described = typeof record.description === 'string' ? toHK(record.description.trim()) : '';
  const description = described && hasChinese(described) ? described.slice(0, 140) : (withFrames[0]?.sentences[0] || doc.description);
  const points = pointList(record.points).slice(0, doc.kind === 'compare' ? 3 : 4);
  const next: ContentDoc = { ...doc, ...titled, blocks: withFrames, mode: 'ai', model, description };
  if (points.length) next.points = points;
  else delete next.points;
  return { doc: next, record: { highlight: record.highlight } };
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
    outlets?: { n?: number; angle?: unknown; emphasis?: unknown; facts?: unknown; tone?: unknown }[];
    points?: unknown;
    description?: unknown;
  };
  if (doc.kind === 'briefing' || doc.kind === 'compare') return applyColumnModel(doc, record, model);
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
      const sentences = sentencesOf(String(section?.text || ''), 5);
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
      const sentences = sentencesOf(String(section?.text || ''), 16);
      return sentences.length ? { ...block, sentences } : block;
    });
    if (blocks.every((block, index) => block === doc.blocks[index])) return null;
    return { doc: { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description }, record };
  }
  return null;
}

export function textFromAi(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const row = result as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
    output?: { type?: string; content?: { type?: string; text?: unknown }[] }[];
  };
  if (typeof row.response === 'string') return row.response;
  const content = row.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content) return content;
  if (!Array.isArray(row.output)) return '';
  const parts: string[] = [];
  for (const item of row.output) {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if (block && (block.type === 'output_text' || block.type === 'text') && typeof block.text === 'string') parts.push(block.text);
    }
  }
  return parts.join('\n');
}

export function estimateNeurons(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * MODEL_NEURONS.inputPerMillion + (outputTokens / 1_000_000) * MODEL_NEURONS.outputPerMillion;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

export { renderContentPage, renderAnalysisIndex, renderColumnIndex, type AdConfig, type PageOptions } from './contentPage.js';
