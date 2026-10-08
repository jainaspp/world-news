import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import {
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
  type TopicConfig,
  type TopicPack,
} from '../../shared/topicPack.js';
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
  'cache-control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
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
    const matched = matchTopicItems(material.items, topic);
    const stored = await readPack(env, topic.slug);
    const rewrite = Boolean(options.force && options.refresh?.includes(topic.slug));
    const fresh = rewrite ? matched.map((item) => item.link).filter(Boolean) : newTopicLinks(matched, stored?.seenLinks ?? []);
    if (!fresh.length) {
      rows.push({ slug: topic.slug, action: stored ? 'unchanged' : 'none' });
      continue;
    }
    const outOfTime = Date.now() - started > DEADLINE_MS;
    const outOfBudget = models >= (options.maxModels ?? MODELS_PER_CALL);
    if (outOfTime || outOfBudget) {
      rows.push({ slug: topic.slug, action: 'deferred' });
      more = true;
      continue;
    }
    const freshItems = matched.filter((item) => fresh.includes(item.link));
    const withText = await attachText(env, freshItems.slice(0, ARTICLES_PER_TOPIC), options.articleText);
    const corpus = topicCorpus(withText);
    const thin = corpus.replace(/\s/g, '').length < 200;
    const grokOk = Boolean(key) && spent < XAI_MONTHLY_CAP_USD;
    const search = thin && topic.desk !== 'other' && grokOk;
    const prompt = topicPrompt(topic, withText, stored);
    attempted.push(topic.slug);
    models += 1;
    const completion = options.complete
      ? await options.complete(topic, prompt.system, prompt.user, search)
      : await completeLive(env, topic, prompt.system, prompt.user, search, grokOk, mini, key);
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
    const draft = parseTopicDraft(completion.text, corpus, topic.areas, strictNumbers);
    if (!draft) {
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    const merged = applyTopicUpdate(stored, draft, {
      slug: topic.slug,
      now: now.toISOString(),
      provider: completion.provider,
      model: completion.model,
    });
    merged.sources = sourcesFromItems(withText, stored?.sources ?? []);
    const links = matched.map((item) => item.link);
    const chosen = stored && keepStoredTopic(stored, merged) ? stored : merged;
    if (!topicPublic(chosen) && !stored) {
      rows.push({ slug: topic.slug, action: 'failed', provider: completion.provider });
      continue;
    }
    const next = stampLinks(chosen, links);
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
): Promise<TopicCompletion | null> {
  if (topic.desk === 'other' && mini) {
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
      ? await completeResearch(key, system, user, 1_800, TOPIC_TIMEOUT_MS)
      : await completeText(key, system, user, 1_800, TOPIC_TIMEOUT_MS);
    if (result.text) {
      return { text: result.text, input: result.input, output: result.output, searchCalls: result.searchCalls, provider: 'grok', model: GROK_MODEL };
    }
  }
  const fallback = await workersText(env, system, user);
  if (!fallback) return null;
  return { text: fallback, input: 0, output: 0, searchCalls: 0, provider: 'workers-ai', model: AI_MODEL };
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
