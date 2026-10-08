import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import {
  anchorText,
  ARTICLE_CHARS,
  ARTICLE_CHARS_LONG,
  blockedOutlet,
  extractArticle,
  FETCH_TIMEOUT_MS,
  RAW_HTML_CAP,
} from '../../shared/articleText.js';
import { AI_MODEL, textFromAi } from '../../shared/content.js';
import { renderTopicIndex, renderTopicPage, topicIndexCards, type TopicIndexCard } from '../../shared/topicPage.js';
import {
  anchoredPrompt,
  ANCHORED_FIGURE_CAP,
  applyTopicUpdate,
  keepStoredTopic,
  matchTopicItems,
  newTopicLinks,
  parseTopicDraft,
  parseTopicPack,
  sourcesFromItems,
  topicBySlug,
  topicCorpus,
  topicPrompt,
  topicPublic,
  TOPIC_PACKS,
  topicStorageKey,
  topicWarmWindow,
  type TopicAnchor,
  type TopicConfig,
  type TopicPack,
  type TopicPicture,
} from '../../shared/topicPack.js';
import { findFreeTopicPicture, resolveTopicPicture, validPicture } from '../../shared/topicImage.js';
import {
  callCostUsd,
  GROK_MODEL,
  materialFromBoard,
  roundUsd,
  xaiCostUsd,
  XAI_MONTHLY_CAP_USD,
} from '../../shared/grok.js';
import { stableId } from '../../shared/rss.js';
import type { NewsItem } from '../../shared/types.js';
import type { PagesContext } from '../env.js';
import { edgeCache } from '../env.js';
import { readBoard } from '../board/store.js';
import { articleCacheKey } from './material.js';
import { completeMiniMax } from './minimax.js';
import { adConfig } from './publish.js';
import { kvWritesBlocked, readValue, writeValue, type ContentEnv } from './store.js';
import { monthUsage, saveUsage } from './usage.js';
import { completeResearch, completeText } from './xai.js';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
};

/** Wall clock for one warm call. A second call (skip=) finishes whatever this one deferred. */
const DEADLINE_MS = 70_000;
/**
 * Pages Functions on the free plan allow 50 subrequests per invocation (each redirect counts).
 * Two topics with up to four article fetches each stay well inside it; the warm run calls again
 * with skip= for the rest (more: true).
 */
const MODELS_PER_CALL = 2;
const ARTICLES_PER_TOPIC = 4;
const TOPIC_TIMEOUT_MS = 22_000;
/**
 * Anchored topics (施政報告, 財政預算案, and a decision pinned to an official page) rebuild from
 * their pinned pages plus matched headlines: one invocation, one Grok call with a longer answer.
 * Runs alone in its call.
 */
const ANCHOR_TIMEOUT_MS = 90_000;
const ANCHOR_MAX_TOKENS = 4_000;
const ANCHOR_CHARS = 9_000;
const ANCHOR_TTL_SECONDS = 7 * 24 * 60 * 60;
const ANCHOR_FETCH_MS = 8_000;
const ANCHOR_SOURCE_CAP = 16;

export interface TopicCompletion {
  text: string;
  input: number;
  output: number;
  searchCalls: number;
  provider: 'grok' | 'minimax' | 'workers-ai';
  model: string;
}

export interface TopicGenerateOptions {
  force?: boolean;
  skip?: string[];
  /** With force: rewrite these topics from their current headlines even if none are new. */
  refresh?: string[];
  /** Stop after this many model calls and report more: true. Tests and the deadline both use it. */
  maxModels?: number;
  now?: Date;
  complete?: (topic: TopicConfig, system: string, user: string, search: boolean) => Promise<TopicCompletion | null>;
  articleText?: (url: string) => Promise<string>;
  /** Tests: text of a pinned source instead of fetching it. */
  anchorText?: (url: string) => Promise<string>;
  /** Tests: stand in for the Commons lookup used when a topic has no free source photo and no standing slot. */
  pictureLookup?: (topic: TopicConfig) => Promise<TopicPicture | null>;
}

interface TopicRow {
  slug: string;
  action: 'updated' | 'kept' | 'unchanged' | 'failed' | 'deferred' | 'none';
  provider?: string;
}

function siteUrl(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

function apiKey(env: ContentEnv): string {
  return typeof env.XAI_API_KEY === 'string' ? env.XAI_API_KEY.trim() : '';
}

function minimaxKey(env: ContentEnv): string {
  return typeof env.MINIMAX_API_KEY === 'string' ? env.MINIMAX_API_KEY.trim() : '';
}

function logKv(slug: string, kind: 'limit' | 'error'): void {
  console.error(JSON.stringify({ topic: slug, kv: kind }));
}

async function readEdge(url: string): Promise<string> {
  const cache = edgeCache();
  if (!cache) return '';
  try {
    const hit = await cache.match(new Request(`https://world-news.xyz/topic-article/${stableId(url)}`));
    return hit ? hit.text() : '';
  } catch {
    return '';
  }
}

async function writeEdge(url: string, text: string): Promise<void> {
  const cache = edgeCache();
  if (!cache || !text) return;
  try {
    await cache.put(
      new Request(`https://world-news.xyz/topic-article/${stableId(url)}`),
      new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } }),
    );
  } catch {
    /* ephemeral */
  }
}

function cachedArticle(raw: string | null): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as { text?: string };
    return typeof parsed.text === 'string' ? parsed.text : '';
  } catch {
    return '';
  }
}

/** Read the shared article cache, then the Cache API. A miss is fetched and stored only in the Cache API. */
async function loadArticle(env: ContentEnv, url: string, fetchImpl: typeof fetch): Promise<string> {
  if (!/^https?:\/\//.test(url) || blockedOutlet(url)) return '';
  const stored = cachedArticle(await readValue(env, articleCacheKey(url)).catch(() => null));
  if (stored) return stored.slice(0, ARTICLE_CHARS_LONG);
  const edge = await readEdge(url);
  if (edge) return edge.slice(0, ARTICLE_CHARS_LONG);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'world-news.xyz article fetch', accept: 'text/html' },
    });
    if (!response.ok) return '';
    const type = response.headers.get('content-type') || '';
    if (type && !/html|xml|text\/plain/i.test(type)) return '';
    const text = extractArticle((await response.text()).slice(0, RAW_HTML_CAP), ARTICLE_CHARS_LONG);
    if (text) await writeEdge(url, text);
    return text.slice(0, ARTICLE_CHARS);
  } catch {
    return '';
  }
}

function anchorRequest(url: string): Request {
  return new Request(`https://world-news.xyz/topic-anchor/v1/${stableId(url)}`);
}

/** Text of a pinned source: Cache API first (7 days), else fetched once. Never written to KV. */
async function loadAnchor(url: string): Promise<string> {
  const cache = edgeCache();
  try {
    const hit = cache ? await cache.match(anchorRequest(url)) : undefined;
    if (hit) return await hit.text();
  } catch {
    /* miss */
  }
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(ANCHOR_FETCH_MS),
      headers: { 'user-agent': 'world-news.xyz article fetch', accept: 'text/html' },
    });
    if (!response.ok) return '';
    const text = anchorText((await response.text()).slice(0, RAW_HTML_CAP), ANCHOR_CHARS);
    if (text && cache) {
      await cache.put(
        anchorRequest(url),
        new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': `public, max-age=${ANCHOR_TTL_SECONDS}` } }),
      ).catch(() => undefined);
    }
    return text;
  } catch {
    return '';
  }
}

async function anchorItems(anchors: readonly TopicAnchor[], load: (url: string) => Promise<string>): Promise<NewsItem[]> {
  const texts = await Promise.all(anchors.map((anchor) => load(anchor.url).catch(() => '')));
  return anchors.flatMap((anchor, index) => {
    const text = texts[index] || '';
    if (text.replace(/\s/g, '').length < 200) return [];
    return [{
      id: stableId(anchor.url),
      title: anchor.title,
      link: anchor.url,
      source: anchor.source,
      sourceUrl: new URL(anchor.url).origin,
      regions: ['hk'],
      pubDate: `${anchor.date}T12:00:00+08:00`,
      category: 'hk',
      excerpt: text,
    }];
  });
}

async function workersText(env: ContentEnv, system: string, user: string): Promise<string> {
  if (!env.AI?.run) return '';
  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1_400,
    });
    return textFromAi(result);
  } catch {
    return '';
  }
}

/**
 * One KV put. Same bytes are not written again. A 429 is logged and not retried;
 * the previous value stays in place for the page to serve.
 */
export async function putTopic(env: ContentEnv, pack: TopicPack): Promise<'saved' | 'skipped' | 'limited' | 'error'> {
  const key = topicStorageKey(pack.slug);
  const next = JSON.stringify(pack);
  const prev = await readValue(env, key).catch(() => null);
  if (prev === next) return 'skipped';
  if (!env.CONTENT) return 'error';
  if (await kvWritesBlocked()) {
    logKv(pack.slug, 'limit');
    return 'limited';
  }
  const stored = await writeValue(env, key, next);
  if (stored) return 'saved';
  if (await kvWritesBlocked()) {
    logKv(pack.slug, 'limit');
    return 'limited';
  }
  logKv(pack.slug, 'error');
  return 'error';
}

async function readPack(env: ContentEnv, slug: string): Promise<TopicPack | null> {
  return parseTopicPack(await readValue(env, topicStorageKey(slug)).catch(() => null));
}

/** Source photo, then the stored picture, then the standing slot, then a Commons lookup. */
async function ensureTopicPicture(
  topic: TopicConfig,
  items: NewsItem[],
  stored: TopicPicture | undefined,
  lookup?: (topic: TopicConfig) => Promise<TopicPicture | null>,
): Promise<TopicPicture | null> {
  const resolved = resolveTopicPicture(topic, items, stored);
  if (resolved) return resolved;
  try {
    const found = lookup ? await lookup(topic) : await findFreeTopicPicture(topic.title);
    return found && validPicture(found) ? found : null;
  } catch {
    return null;
  }
}

function stampLinks(pack: TopicPack, links: string[]): TopicPack {
  const seenLinks = [...new Set(links.filter(Boolean))].slice(0, 200);
  return { ...pack, seenLinks };
}

/**
 * Refresh topic packs that have new matching headlines. At most one KV put per topic,
 * and only when the stored JSON changed. Model failures do not write and are not retried here.
 */
export async function generateTopics(
  env: ContentEnv,
  options: TopicGenerateOptions = {},
): Promise<Record<string, unknown>> {
  const now = options.now ?? new Date();
  if (!options.force && !topicWarmWindow(now)) {
    return { ok: true, kind: 'topic', skipped: 'schedule', puts: 0, more: false, topics: [], fallback: false };
  }
  const board = await readBoard(env).catch(() => null);
  const material = materialFromBoard(board);
  if (!material) {
    return { ok: true, kind: 'topic', error: 'cache-cold', puts: 0, more: false, topics: [], fallback: false };
  }
  const tracked = await monthUsage(env, now).catch(() => null);
  let spent = tracked?.costUsd ?? 0;
  const skip = new Set(options.skip ?? []);
  const started = Date.now();
  const rows: TopicRow[] = [];
  const attempted: string[] = [];
  let puts = 0;
  let models = 0;
  let limited = false;
  let more = false;
  const bill = { input: 0, output: 0, search: 0, requests: 0, grok: 0, workers: 0, minimax: 0 };

  const key = apiKey(env);
  const mini = minimaxKey(env);

  for (const topic of TOPIC_PACKS) {
    if (limited || await kvWritesBlocked()) {
      limited = true;
      rows.push({ slug: topic.slug, action: 'deferred' });
      more = true;
      continue;
    }
    if (skip.has(topic.slug)) continue;
    const anchors = topic.anchors ?? [];
    const anchorLinks = anchors.map((anchor) => anchor.url);
    const matched = matchTopicItems(material.items, topic).filter((item) => !anchorLinks.includes(item.link));
    const stored = await readPack(env, topic.slug);
    const rewrite = Boolean(options.force && options.refresh?.includes(topic.slug));
    // An anchored topic is rebuilt in full from its pinned sources on first build, when a new
    // anchor is configured, or on refresh. Later headlines are merged as ordinary updates.
    const unseenAnchor = anchorLinks.some((url) => !(stored?.seenLinks ?? []).includes(url));
    const rebuild = anchors.length > 0 && (rewrite || unseenAnchor);
    const fresh = rewrite || rebuild ? matched.map((item) => item.link).filter(Boolean) : newTopicLinks(matched, stored?.seenLinks ?? []);
    if (!fresh.length && !rebuild) {
      rows.push({ slug: topic.slug, action: stored ? 'unchanged' : 'none' });
      continue;
    }
    const outOfTime = Date.now() - started > DEADLINE_MS;
    const budget = options.maxModels ?? MODELS_PER_CALL;
    const outOfBudget = rebuild ? models > 0 : models >= budget;
    if (outOfTime || outOfBudget) {
      rows.push({ slug: topic.slug, action: 'deferred' });
      more = true;
      continue;
    }
    const pinned = rebuild ? await anchorItems(anchors, options.anchorText ?? loadAnchor) : [];
    const anchored = pinned.length > 0;
    // Pinned pages unreachable this run: fall back to an ordinary update with new headlines only.
    const useLinks = anchored || rewrite ? fresh : newTopicLinks(matched, stored?.seenLinks ?? []);
    const freshItems = matched.filter((item) => useLinks.includes(item.link));
    const headlines = await attachText(env, freshItems.slice(0, ARTICLES_PER_TOPIC), options.articleText);
    if (!anchored && !headlines.length) {
      rows.push({ slug: topic.slug, action: stored ? 'unchanged' : 'none' });
      continue;
    }
    const withText = [...pinned, ...headlines];
    const picture = await ensureTopicPicture(topic, withText, stored?.picture, options.pictureLookup);
    if (!picture) {
      rows.push({ slug: topic.slug, action: 'failed' });
      continue;
    }
    const corpus = topicCorpus(withText);
    const thin = corpus.replace(/\s/g, '').length < 200;
    const grokOk = Boolean(key) && spent < XAI_MONTHLY_CAP_USD;
    const search = thin && topic.desk !== 'other' && grokOk;
    const prompt = anchored ? anchoredPrompt(topic, withText) : topicPrompt(topic, withText, stored);
    attempted.push(topic.slug);
    models += anchored ? budget : 1;
    const limits = anchored
      ? { maxTokens: ANCHOR_MAX_TOKENS, timeoutMs: ANCHOR_TIMEOUT_MS }
      : { maxTokens: 1_800, timeoutMs: TOPIC_TIMEOUT_MS };
    const completion = options.complete
      ? await options.complete(topic, prompt.system, prompt.user, search)
      : await completeLive(env, topic, prompt.system, prompt.user, search, grokOk, mini, key, limits, anchored);
    if (!completion?.text) {
      rows.push({ slug: topic.slug, action: 'failed' });
      continue;
    }
    bill.input += completion.input;
    bill.output += completion.output;
    bill.search += completion.searchCalls;
    bill.requests += 1;
    if (completion.provider === 'grok') bill.grok += 1;
    else if (completion.provider === 'minimax') bill.minimax += 1;
    else bill.workers += 1;
    spent += callCostUsd(completion.input, completion.output, completion.searchCalls);
    const strictNumbers = completion.searchCalls === 0;
    const figureCap = anchors.length ? ANCHORED_FIGURE_CAP : undefined;
    const draft = parseTopicDraft(completion.text, corpus, topic.areas, strictNumbers, figureCap);
    if (!draft) {
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    // A full rebuild replaces the pack (keep-better below still guards against a thinner draft).
    const merged = applyTopicUpdate(anchored ? null : stored, draft, {
      slug: topic.slug,
      now: now.toISOString(),
      provider: completion.provider,
      model: completion.model,
      ...(figureCap ? { figureCap } : {}),
    });
    if (anchored && stored?.publishedAt) merged.publishedAt = stored.publishedAt;
    // The column name is a label. A grounded body is still published when the model's own title
    // does not share enough wording with an English official page to pass the source check.
    if (anchored && topic.anchorAsk && !merged.title) merged.title = topic.title;
    merged.sources = anchored
      ? sourcesFromItems(withText, [], ANCHOR_SOURCE_CAP)
      : sourcesFromItems(withText, stored?.sources ?? [], anchors.length ? ANCHOR_SOURCE_CAP : undefined);
    const keptAnchors = anchored ? anchorLinks : anchorLinks.filter((url) => stored?.seenLinks?.includes(url));
    const links = [...keptAnchors, ...matched.map((item) => item.link)];
    const chosen = stored && keepStoredTopic(stored, merged) ? stored : merged;
    if (!topicPublic(chosen) && !stored) {
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    const next = stampLinks({ ...chosen, picture }, links);
    if (stored && chosen === stored) next.updatedAt = stored.updatedAt;
    const wrote = await putTopic(env, next);
    if (wrote === 'limited') {
      limited = true;
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    if (wrote === 'error') {
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    if (wrote === 'saved') puts += 1;
    rows.push({
      slug: topic.slug,
      action: chosen === stored ? 'kept' : 'updated',
      provider: completion.provider,
    });
  }

  let usagePut = 0;
  if (tracked && (bill.input || bill.output || bill.search || bill.requests || bill.grok || bill.workers || bill.minimax)) {
    tracked.inputTokens += bill.input;
    tracked.outputTokens += bill.output;
    tracked.searchCalls += bill.search;
    tracked.requests += bill.requests;
    tracked.grokTopic += bill.grok;
    tracked.workersTopic += bill.workers;
    tracked.minimaxTopic += bill.minimax;
    tracked.costUsd = roundUsd(xaiCostUsd(tracked.inputTokens, tracked.outputTokens, tracked.searchCalls));
    await saveUsage(env, tracked);
    usagePut = 1;
  }
  return {
    ok: true,
    kind: 'topic',
    puts,
    usagePut,
    more,
    kv: limited ? 'limited' : 'ok',
    attempted,
    topics: rows,
    fallback: false,
  };
}

async function attachText(
  env: ContentEnv,
  items: NewsItem[],
  articleText?: (url: string) => Promise<string>,
): Promise<NewsItem[]> {
  const out: NewsItem[] = [];
  for (const item of items) {
    const text = articleText ? await articleText(item.link).catch(() => '') : await loadArticle(env, item.link, fetch);
    out.push(text ? { ...item, excerpt: text.slice(0, ARTICLE_CHARS) } : item);
  }
  return out;
}

async function completeLive(
  env: ContentEnv,
  topic: TopicConfig,
  system: string,
  user: string,
  search: boolean,
  grokOk: boolean,
  mini: string,
  key: string,
  limits: { maxTokens: number; timeoutMs: number } = { maxTokens: 1_800, timeoutMs: TOPIC_TIMEOUT_MS },
  anchored = false,
): Promise<TopicCompletion | null> {
  // A full anchored rebuild uses the long Grok draft, including desks that otherwise start on MiniMax.
  // MiniMax's short topic path ignores that budget. Later headline updates stay on the desk's usual writer.
  if (!anchored && topic.desk === 'other' && mini) {
    const written = await completeMiniMax(mini, system, user, TOPIC_TIMEOUT_MS);
    if (written.text && !written.quota) {
      if (grokOk && key) {
        const verified = await completeText(key, verifySystem(), verifyUser(user, written.text), 1_200, TOPIC_TIMEOUT_MS);
        if (verified.input || verified.output) {
          return {
            text: verified.text.includes('{') ? verified.text : written.text,
            input: verified.input,
            output: verified.output,
            searchCalls: 0,
            provider: 'minimax',
            model: written.model,
          };
        }
      }
      return { text: written.text, input: 0, output: 0, searchCalls: 0, provider: 'minimax', model: written.model };
    }
  }
  if (grokOk && key) {
    const result = search
      ? await completeResearch(key, system, user, limits.maxTokens, limits.timeoutMs)
      : await completeText(key, system, user, limits.maxTokens, limits.timeoutMs);
    if (result.text) {
      return { text: result.text, input: result.input, output: result.output, searchCalls: result.searchCalls, provider: 'grok', model: GROK_MODEL };
    }
  }
  if (anchored && mini) {
    const written = await completeMiniMax(mini, system, user, limits.timeoutMs);
    if (written.text && !written.quota) {
      return { text: written.text, input: 0, output: 0, searchCalls: 0, provider: 'minimax', model: written.model };
    }
  }
  // No Workers AI stand-in for topic packs: its drafts used Cantonese and unsourced claims.
  // A topic without a Grok or MiniMax draft keeps its last version or shows headlines only.
  void workersText;
  void env;
  return null;
}

function verifySystem(): string {
  return '你是事實核對。只可刪除或收窄 JSON 裡來源沒有的事實，不可新增事實、數字或引言。維持繁體中文正式新聞書面語。回傳同一個 JSON，不要加說明。';
}

function verifyUser(material: string, draft: string): string {
  return `資料：${material}\n待核對：${draft}`;
}

async function loadCards(env: ContentEnv): Promise<Map<string, TopicPack | null>> {
  const pairs = await Promise.all(TOPIC_PACKS.map(async (topic) => [topic.slug, await readPack(env, topic.slug)] as const));
  return new Map(pairs);
}

export async function serveTopicIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const cards: TopicIndexCard[] = topicIndexCards(await loadCards(env).catch(() => new Map()));
  const html = renderTopicIndex(cards, `${siteUrl(env)}/topic/`, adConfig(env));
  return new Response(html, { headers: HTML_HEADERS });
}

export async function serveTopic(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const slug = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const topic = topicBySlug(slug);
  const cards = await loadCards(env).catch(() => new Map());
  if (!topic) {
    const html = renderTopicIndex(topicIndexCards(cards), `${siteUrl(env)}/topic/`, adConfig(env));
    return new Response(html, { status: 404, headers: HTML_HEADERS });
  }
  const board = await readBoard(env).catch(() => null);
  const items = materialFromBoard(board)?.items ?? [];
  const headlines = matchTopicItems(items, topic);
  const others = topicIndexCards(cards).map((card) => ({
    slug: card.topic.slug,
    title: card.topic.title,
    description: card.description,
  }));
  const html = renderTopicPage({
    topic,
    pack: cards.get(slug) ?? null,
    headlines,
    others,
  }, `${siteUrl(env)}/topic/${slug}/`, adConfig(env));
  return new Response(html, { headers: HTML_HEADERS });
}

/** Slugs with a public pack, for the sitemap. Reads only. */
export async function publicTopicPaths(env: ContentEnv): Promise<{ slug: string; updatedAt: string }[]> {
  const cards = await loadCards(env);
  const out: { slug: string; updatedAt: string }[] = [];
  for (const topic of TOPIC_PACKS) {
    const pack = cards.get(topic.slug);
    if (pack && topicPublic(pack)) out.push({ slug: topic.slug, updatedAt: pack.updatedAt });
  }
  return out;
}
