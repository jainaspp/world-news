import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { ARTICLE_CHARS, ARTICLE_CHARS_LONG, needsSearch } from '../../shared/articleText.js';
import { coherentCluster, sameEvent, type StoryCluster } from '../../shared/angles.js';
import { coherencePrompt, keepItems, parseCoherence } from '../../shared/coherence.js';
import {
  applyBundles,
  applyDelta,
  articleRoom,
  bundleFrom,
  deltaPrompt,
  excerptChars,
  matchEvent,
  newLinks,
  overPace,
  parseDelta,
  titlesAreSameEvent,
  UPDATES_PER_CALL,
  type StoredEvent,
} from '../../shared/research.js';
import type { NewsItem } from '../../shared/types.js';
import {
  analysisSlug,
  applyModelText,
  attachCitations,
  briefingPublic,
  explainerCurrent,
  formatHkt,
  guardDoc,
  hktParts,
  renderColumnIndex,
  renderContentPage,
  type BriefingScope,
  type ContentDoc,
  narrativeChars,
  heldMiniMax,
} from '../../shared/content.js';
import {
  COMPARE_BATCH,
  GROK_MODEL,
  bodyChars,
  briefingFromItems,
  briefingKey,
  callCostUsd,
  XAI_MONTHLY_CAP_USD,
  capReached,
  columnDelivery,
  compareFromCluster,
  emptyUsage,
  hktMonth,
  materialFromBoard,
  parseWritten,
  pickCompareBatch,
  pieceReady,
  preferWritten,
  relatedEarlier,
  richness,
  routeForCluster,
  selectBriefingItems,
  slotInstant,
  statusFrom,
  storySignature,
  upsertWritten,
  withArticle,
  withTokens,
  writerFor,
  writtenKey,
  type ColumnDelivery,
  type MonthUsage,
  type WrittenStory,
} from '../../shared/grok.js';
import type { PagesContext } from '../env.js';
import { readBoard } from '../board/store.js';
import { generateFocus } from './focus.js';
import { adConfig, polish } from './publish.js';
import { fetchArticleTexts, fetchTitles, readBundles, readEvents, stampExcerpts, writeBundle, writeEvents } from './material.js';
import { docKey, readDoc, readIndex, readValue, rememberIndexMany, writeDoc, writeValue, type ContentEnv } from './store.js';
import { completeGrok, completeText, XAI_TIMEOUT_MS } from './xai.js';
import { cleanMiniMax, expandMiniMax, pipelineMiniMax } from './minimax.js';
import { applyVerify, parseVerify, verifyPrompt, VERIFY_MAX_TOKENS, VERIFY_MODEL } from './grokVerify.js';
import { completeWith } from './xai.js';
import { monthUsage, saveUsage } from './usage.js';
import {
  briefingDraft,
  clusterWriter,
  isBriefingScope,
  MINIMAX_PER_CALL,
  pickMiniMaxBatch,
  scopedBriefingKey,
  type ArticleWriter,
} from '../../shared/writers.js';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
};

const WALL_MS = 60_000;
/** MiniMax pipeline budget from the start of the request; the warm run's curl waits 90 s. */
const MINIMAX_DEADLINE_MS = 64_000;
/** Grok's verification pass must end by here (the warm run's curl waits 90 s). */
const VERIFY_DEADLINE_MS = 86_000;
/** Article pages read for one world or tech/finance brief. */
const SCOPED_FETCH = 10;
/** Only start the stricter second Grok attempt while there is room before the edge's 100 s limit. */
const RETRY_BEFORE_MS = 35_000;

function siteUrl(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

function emptyDoc(kind: 'briefing' | 'compare', key: string, title: string): ContentDoc {
  const now = new Date().toISOString();
  return {
    kind,
    key,
    title,
    description: '這一期還沒有內容。',
    blocks: [],
    publishedAt: now,
    hkt: formatHkt(now),
    mode: 'sources',
  };
}

function htmlPage(
  doc: ContentDoc,
  canonical: string,
  env: ContentEnv,
  archive: Awaited<ReturnType<typeof readIndex>>,
  status = 200,
  explainers: Awaited<ReturnType<typeof readIndex>> = [],
): Response {
  // An unchecked or unverified MiniMax piece is never shown: only its source list.
  const listed = heldMiniMax(doc)
    ? { ...doc, mode: 'sources' as const, points: [], blocks: doc.blocks.map((block) => ({ ...block, sentences: block.sources.slice(0, 6).map((ref) => `${ref.source}報道：${ref.title}。`) })) }
    : doc;
  const shown = listed.mode === 'ai' ? guardDoc(listed) : listed;
  return new Response(renderContentPage(shown, canonical, { ads: adConfig(env), archive, explainers }), { status, headers: HTML_HEADERS });
}

function apiKey(env: ContentEnv): string {
  return typeof env.XAI_API_KEY === 'string' ? env.XAI_API_KEY.trim() : '';
}

function minimaxKey(env: ContentEnv): string {
  return typeof env.MINIMAX_API_KEY === 'string' ? env.MINIMAX_API_KEY.trim() : '';
}

function stampProvider(doc: ContentDoc): ContentDoc {
  if (doc.mode !== 'ai') return doc;
  if (doc.provider) return doc;
  const model = (doc.model || '').toLowerCase();
  if (model.includes('minimax')) return { ...doc, provider: 'minimax' };
  if (model.includes('grok')) return { ...doc, provider: 'grok' };
  if (doc.model) return { ...doc, provider: 'workers-ai' };
  return doc;
}

/** A material draft below this many body characters retries with web_search instead of a strict rewrite. */
const MATERIAL_RETRY_CHARS = 400;

interface Job {
  draft: ContentDoc;
  route: 'grok' | 'workers';
  /** MiniMax for tech, finance, international, and the other non-HK/China desks. */
  writer?: ArticleWriter;
  /** Thin fetched text only. The default path is chat completions over article excerpts. */
  search?: boolean;
  /** Fetched excerpts are already on the draft. No search tool. */
  material?: boolean;
  /** Hong Kong story: allows a third, web-search attempt after a thin strict retry. */
  hk?: boolean;
  fetchedSources?: number;
  /** Tokens already billed for this article, such as the coherence check. */
  priorInput?: number;
  priorOutput?: number;
}

export interface ArticleCost {
  key: string;
  costUsd: number;
  searchCalls: number;
  inputTokens: number;
  outputTokens: number;
  fetchedSources: number;
}

/** MiniMax, then Grok inside the US$10 cap, then Workers AI. MiniMax calls are not added to the xAI bill. */
/** Spend so far within the month's straight-line share of the cap (HKT days elapsed). */
export function verifyPaceOk(costUsd: number, now = new Date()): boolean {
  const hkt = new Date(now.getTime() + 8 * 3_600_000);
  const days = new Date(Date.UTC(hkt.getUTCFullYear(), hkt.getUTCMonth() + 1, 0)).getUTCDate();
  return costUsd < XAI_MONTHLY_CAP_USD * (hkt.getUTCDate() / days);
}

/** A MiniMax piece that has finished its own stages but not Grok's pass. */
function awaitingVerify(doc: ContentDoc): boolean {
  return doc.provider === 'minimax' && doc.mode === 'ai' && doc.verified !== 'grok' && (!doc.stage || doc.stage === 'verify');
}

interface Verified { doc: ContentDoc; input: number; output: number; requests: number; step: string; error?: string }

/**
 * Grok's final pass over a finished MiniMax piece: MiniMax text plus source extracts in, corrected
 * sentences out. Applied, tidied, then the normal publish checks decide. Without a key, past the
 * cap pace, out of time, or on a failed call the piece stays held (stage 'verify'); it never goes
 * out unverified.
 */
async function grokVerify(env: ContentEnv, doc: ContentDoc, deadline: number, costUsd: number): Promise<Verified> {
  const held = (step: string, extra: Partial<Verified> = {}): Verified => ({ doc: { ...doc, stage: 'verify' }, input: 0, output: 0, requests: 0, step, ...extra });
  const key = apiKey(env);
  if (!key) return held('verify-no-key');
  if (costUsd >= XAI_MONTHLY_CAP_USD || !verifyPaceOk(costUsd)) return held('verify-pace');
  const prompt = verifyPrompt(doc);
  if (!prompt) return held('verify-no-sources');
  const left = deadline - Date.now();
  if (left < 10_000) return held('verify-no-time');
  const result = await completeWith(key, VERIFY_MODEL, prompt.system, prompt.user, VERIFY_MAX_TOKENS, Math.min(30_000, left - 1_000));
  const spent = { input: result.input, output: result.output, requests: result.status ? 1 : 0 };
  const parsed = result.text ? parseVerify(result.text) : null;
  if (!parsed) return held(result.error ? 'verify-failed' : 'verify-unparsed', { ...spent, ...(result.error ? { error: result.error } : {}) });
  const applied = applyVerify(doc, parsed);
  const usd = callCostUsd(result.input, result.output, 0);
  const next: ContentDoc = { ...cleanMiniMax(applied.doc), verified: 'grok', verifyUsd: usd };
  delete next.stage;
  return { doc: next, ...spent, step: `verify:${applied.changed}:${bodyChars(next)}:$${usd.toFixed(4)}` };
}

/** Rest of the MiniMax pipeline for a stored piece: its own stages, then Grok's pass when time allows. */
async function resumeMiniMax(env: ContentEnv, stored: ContentDoc, requestStart: number, costUsd: number): Promise<{ doc: ContentDoc; steps: string[]; errors: string[]; input: number; output: number; requests: number }> {
  let doc = stored;
  const steps: string[] = [];
  const errors: string[] = [];
  const mini = minimaxKey(env);
  if (doc.stage === 'drafted' || doc.stage === 'checked') {
    if (!mini) return { doc, steps, errors, input: 0, output: 0, requests: 0 };
    const expanded = await expandMiniMax(mini, doc, requestStart + MINIMAX_DEADLINE_MS);
    steps.push(...expanded.steps);
    errors.push(...expanded.errors);
    doc = expanded.doc;
  }
  if (!awaitingVerify(doc)) return { doc, steps, errors, input: 0, output: 0, requests: 0 };
  const verified = await grokVerify(env, doc, requestStart + VERIFY_DEADLINE_MS, costUsd);
  steps.push(verified.step);
  if (verified.error) errors.push(verified.error);
  return { doc: verified.doc, steps, errors, input: verified.input, output: verified.output, requests: verified.requests };
}

/** Adds verification tokens to the month's usage. */
async function chargeVerify(env: ContentEnv, input: number, output: number, requests: number): Promise<void> {
  if (!requests) return;
  await saveUsage(env, withTokens(await monthUsage(env), input, output, requests, 0));
}

async function composeBatch(env: ContentEnv, jobs: Job[], started = Date.now(), miniDeadline = started + MINIMAX_DEADLINE_MS): Promise<{ docs: ContentDoc[]; usage: MonthUsage; grokStatus: number[]; grokError: string[]; capped: boolean; costs: ArticleCost[]; steps: string[] }> {
  let usage = await monthUsage(env);
  const key = apiKey(env);
  const mini = minimaxKey(env);
  const capped = capReached(usage) || !key;
  const statuses: number[] = [];
  const errors: string[] = [];
  const steps: string[] = [];
  const grok = await Promise.all(jobs.map(async (job) => {
    const priorInput = job.priorInput ?? 0;
    const priorOutput = job.priorOutput ?? 0;
    const writer = job.writer ?? 'grok';
    let grokDoc: ContentDoc | null = null;
    // MiniMax desks: draft → fact-check → facts-only rewrite → fact-check. No Grok fallback,
    // so the Grok budget stays with Hong Kong and mainland desks.
    if (writer === 'minimax') {
      let verifyInput = 0;
      let verifyOutput = 0;
      let verifyRequests = 0;
      if (mini) {
        const piped = await pipelineMiniMax(mini, job.draft, miniDeadline);
        errors.push(...piped.errors);
        const pipeSteps = [...piped.steps];
        grokDoc = piped.doc ? { ...piped.doc, provider: 'minimax' } : null;
        // Grok verifies every finished MiniMax piece before it can be listed.
        if (grokDoc && awaitingVerify(grokDoc)) {
          const verified = await grokVerify(env, grokDoc, started + VERIFY_DEADLINE_MS, usage.costUsd);
          pipeSteps.push(verified.step);
          if (verified.error) errors.push(verified.error);
          grokDoc = verified.doc;
          verifyInput = verified.input;
          verifyOutput = verified.output;
          verifyRequests = verified.requests;
        }
        steps.push(`${job.draft.key}:${pipeSteps.join(',')}`);
      }
      return { job, grokDoc, input: priorInput + verifyInput, output: priorOutput + verifyOutput, requests: verifyRequests, searchCalls: 0 };
    }
    if (writerFor({ route: job.route, costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
      return { job, grokDoc, input: priorInput, output: priorOutput, requests: 0, searchCalls: 0 };
    }
    let input = 0;
    let output = 0;
    let requests = 0;
    let searchCalls = 0;
    // Material drafts get one more try: a strict rewrite when the first draft is close to the
    // floor, or the web_search fallback when the fetched text was not enough to write from.
    // A Hong Kong story whose strict rewrite is still thin gets web search as a last resort.
    const attempts = job.search ? 1 : job.hk && job.material ? 3 : 2;
    let searched = Boolean(job.search);
    for (let attempt = 0; attempt < attempts && !(grokDoc && pieceReady(grokDoc) && grokDoc.provider === 'grok'); attempt += 1) {
      if (attempt >= 1 && Date.now() - started > RETRY_BEFORE_MS) break;
      if (attempt === 2 && searched) break;
      const searchRetry = attempt >= 1 && Boolean(job.material) && !capReached(usage)
        && (attempt === 2 || !grokDoc || bodyChars(grokDoc) < MATERIAL_RETRY_CHARS);
      if (searchRetry) searched = true;
      // The search retry uses the normal researched prompt; strict + search dropped commas in live output.
      const result = await completeGrok(key, job.draft, attempt >= 1 && !searchRetry, XAI_TIMEOUT_MS, {
        search: Boolean(job.search) || searchRetry,
        material: Boolean(job.material) && !searchRetry,
      });
      statuses.push(result.status);
      if (result.error) errors.push(result.error);
      if (!result.status) break;
      input += result.input;
      output += result.output;
      searchCalls += result.searchCalls;
      requests += 1;
      const researched = result.searchCalls > 0 || result.citations.length > 0;
      const applied = result.text ? applyModelText(job.draft, result.text, GROK_MODEL, { researched }) : null;
      const cited = applied ? attachCitations(applied, result.citations) : null;
      const stamped = cited ? { ...cited, provider: 'grok' as const } : null;
      if (stamped && (!grokDoc || richness(stamped) > richness(grokDoc))) grokDoc = stamped;
    }
    return { job, grokDoc, input: input + priorInput, output: output + priorOutput, requests, searchCalls };
  }));
  // Web citations arrive with a URL slug (or only a domain) as the title. Read the real headline.
  await Promise.all(grok.map(async (row) => {
    const citations = row.grokDoc?.citations;
    if (!row.grokDoc || !citations?.length) return;
    const known = new Set(row.grokDoc.blocks.flatMap((block) => block.sources.map((source) => source.url)));
    const bare = citations.filter((source) => !known.has(source.url) && (/^[a-z0-9\s'’….-]+$/.test(source.title || '') || source.title === source.source));
    if (!bare.length) return;
    const titles = await fetchTitles(env, bare.map((source) => source.url), fetch, 4).catch(() => new Map<string, string>());
    if (!titles.size) return;
    row.grokDoc = { ...row.grokDoc, citations: citations.map((source) => (titles.has(source.url) ? { ...source, title: titles.get(source.url)! } : source)) };
  }));
  for (const row of grok) {
    if (row.requests) usage = withTokens(usage, row.input - (row.job.priorInput ?? 0), row.output - (row.job.priorOutput ?? 0), row.requests, row.searchCalls);
  }
  if (grok.some((row) => row.requests)) await saveUsage(env, usage);

  const docs = (await Promise.all(grok.map(async (row) => {
    if (row.grokDoc) return row.grokDoc;
    // A MiniMax desk without a checked piece keeps the source list; no other writer.
    if (row.job.writer === 'minimax') return row.job.draft;
    if (Date.now() - started > WALL_MS) return row.job.draft;
    try {
      const polished = await polish(env, row.job.draft, false, Boolean(row.job.material));
      return preferWritten(null, polished);
    } catch {
      return row.job.draft;
    }
  }))).map(stampProvider);
  for (const doc of docs) {
    if (doc.mode !== 'ai' || (doc.kind !== 'briefing' && doc.kind !== 'compare')) continue;
    const route = doc.provider === 'minimax' ? 'minimax' : doc.provider === 'grok' || doc.model?.includes('grok') ? 'grok' : 'workers';
    usage = withArticle(usage, route, doc.kind);
  }
  await saveUsage(env, usage);
  const costs = grok.map((row) => {
    const miniOnly = row.job.writer === 'minimax' && row.requests === 0;
    return {
      key: row.grokDoc?.key || row.job.draft.key,
      inputTokens: miniOnly ? 0 : row.input,
      outputTokens: miniOnly ? 0 : row.output,
      searchCalls: row.searchCalls,
      fetchedSources: row.job.fetchedSources ?? 0,
      costUsd: miniOnly ? 0 : callCostUsd(row.input, row.output, row.searchCalls),
    };
  });
  return { docs, usage, grokStatus: statuses, grokError: [...new Set(errors)], capped, costs, steps };
}

/** The cached board only. A cold cache returns null so the caller can answer 503 without crawling feeds. */
async function loadMaterial(env: ContentEnv): Promise<{ items: NewsItem[]; clusters: StoryCluster[] } | null> {
  const board = await readBoard(env).catch(() => null);
  return materialFromBoard(board);
}

function delivered(delivery: ColumnDelivery, extra: Record<string, unknown>): Record<string, unknown> {
  return { ...extra, ...delivery };
}

export async function columnStatus(env: ContentEnv, now = new Date()): Promise<ReturnType<typeof statusFrom>> {
  const usage = await monthUsage(env, now).catch(() => emptyUsage(hktMonth(now)));
  return statusFrom(usage);
}

/** Article text per briefing side below this many characters is topped up from the source pages. */
const BRIEFING_SIDE_FLOOR = 1_200;

async function fillBriefing(
  env: ContentEnv,
  hk: NewsItem[],
  china: NewsItem[],
  now: Date,
): Promise<{ hk: NewsItem[]; china: NewsItem[]; search: boolean; fetchedSources: number }> {
  const bundles = await readBundles(env, hktParts(now).date);
  let nextHk = applyBundles(hk, bundles);
  let nextChina = applyBundles(china, bundles);
  // Each side needs its own article text. With only bare 內地 headlines next to rich Hong Kong
  // excerpts, Grok drops the 內地 section, so a thin side is fetched even when the total is enough.
  const missingOf = (rows: NewsItem[]) => rows.filter((item) => (item.excerpt || '').length < 200 && /^https?:\/\//.test(item.link));
  const wanted: string[] = [];
  for (const rows of [nextHk, nextChina]) {
    if (rows.length && excerptChars(rows) < BRIEFING_SIDE_FLOOR) wanted.push(...missingOf(rows).slice(0, 4).map((item) => item.link));
  }
  if (!wanted.length && needsSearch(excerptChars([...nextHk, ...nextChina]))) {
    wanted.push(...missingOf([...nextHk, ...nextChina]).slice(0, 4).map((item) => item.link));
  }
  if (wanted.length) {
    const fetched = await fetchArticleTexts(env, wanted, fetch, wanted.length);
    nextHk = stampExcerpts(nextHk, fetched.texts);
    nextChina = stampExcerpts(nextChina, fetched.texts);
  }
  const rows = [...nextHk, ...nextChina];
  return {
    hk: nextHk,
    china: nextChina,
    search: needsSearch(excerptChars(rows)),
    fetchedSources: rows.filter((item) => (item.excerpt || '').length >= 80).length,
  };
}

function summedCost(rows: ArticleCost[], key: string): ArticleCost {
  const picked = rows.filter((row) => row.key === key);
  const inputTokens = picked.reduce((sum, row) => sum + row.inputTokens, 0);
  const outputTokens = picked.reduce((sum, row) => sum + row.outputTokens, 0);
  const searchCalls = picked.reduce((sum, row) => sum + row.searchCalls, 0);
  const fetchedSources = picked.reduce((sum, row) => sum + (row.fetchedSources ?? 0), 0);
  return { key, inputTokens, outputTokens, searchCalls, fetchedSources, costUsd: callCostUsd(inputTokens, outputTokens, searchCalls) };
}

function settledPiece(doc: ContentDoc | undefined): boolean {
  if (!doc || doc.mode !== 'ai' || !pieceReady(doc)) return false;
  if (doc.provider === 'grok' || doc.provider === 'minimax') return true;
  const model = (doc.model || '').toLowerCase();
  return model.includes('grok') || model.includes('minimax');
}

/** A brief still mid-pipeline answers 503 + fallback so the warm run's retry finishes it. */
function withPending(doc: ContentDoc, body: Record<string, unknown>): Record<string, unknown> {
  return doc.stage ? { ...body, stage: doc.stage, status: 503, ok: false, fallback: true } : body;
}

async function generateScopedBriefing(env: ContentEnv, scope: Exclude<BriefingScope, 'hk'>, now: Date, options: { force?: boolean }): Promise<Record<string, unknown>> {
  const key = scopedBriefingKey(scope, now);
  const existing = await readDoc(env, docKey('briefing', key));
  if (!options.force && existing?.doc && (existing.doc.stage || awaitingVerify(existing.doc))) {
    const requestStart = Date.now();
    const usageNow = await monthUsage(env);
    const expanded = await resumeMiniMax(env, existing.doc, requestStart, usageNow.costUsd);
    await chargeVerify(env, expanded.input, expanded.output, expanded.requests);
    await writeDoc(env, expanded.doc);
    const doc = expanded.doc;
    const chars = bodyChars(doc);
    const ready = doc.mode === 'ai' && pieceReady(doc);
    return withPending(doc, delivered(columnDelivery({ docs: [{ mode: doc.mode, model: doc.model, provider: doc.provider, chars, key: doc.key, ready }] }), {
      kind: 'briefing',
      scope,
      key,
      mode: doc.mode,
      provider: doc.provider ?? '',
      chars,
      ready,
      public: briefingPublic(doc),
      expanded: true,
      steps: expanded.steps,
      grokError: [...new Set(expanded.errors)],
    }));
  }
  // A listed brief (400-character floor) is settled for idempotent warm calls.
  if (!options.force && existing?.doc && existing.doc.mode === 'ai' && !existing.doc.stage && !heldMiniMax(existing.doc) && (settledPiece(existing.doc) || briefingPublic(existing.doc))) {
    return delivered(columnDelivery({ skipped: 'exists' }), { kind: 'briefing', scope, key, mode: 'ai', provider: existing?.doc.provider ?? 'minimax', skipped: 'exists' });
  }
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'briefing', scope, key });
  const started = Date.now();
  // Each section is written only from articles whose text was read: two or more per section.
  const skeleton = briefingDraft(material.items, scope, now, 8);
  if (!skeleton) return delivered(columnDelivery({ skipped: 'no-headlines' }), { kind: 'briefing', scope, key, skipped: 'no-headlines' });
  const sections = skeleton.blocks.filter((block) => block.title !== '今日值得留意').map((block) => block.sources);
  const longest = Math.max(0, ...sections.map((rows) => rows.length));
  const order: string[] = [];
  for (let i = 0; i < longest; i += 1) for (const rows of sections) if (rows[i]) order.push(rows[i].url);
  const byLink = new Map(material.items.map((item) => [item.link, item]));
  const picked = order.map((link) => byLink.get(link)).filter((item): item is NewsItem => Boolean(item));
  const fetched = await fetchArticleTexts(env, picked.map((item) => item.link), fetch, SCOPED_FETCH);
  const stamped = stampExcerpts(picked, fetched.texts, ARTICLE_CHARS_LONG);
  const built = briefingDraft(stamped, scope, now, 8);
  const draft = built ? {
    ...built,
    blocks: built.blocks
      .map((block) => (block.title === '今日值得留意' ? block : { ...block, sources: block.sources.filter((ref) => (ref.excerpt || '').trim().length >= 300) }))
      .filter((block) => block.title === '今日值得留意' || block.sources.length >= 2),
  } : null;
  const fetchedSources = stamped.filter((item) => (item.excerpt || '').length >= 300).length;
  if (!draft || !draft.blocks.some((block) => block.title !== '今日值得留意')) {
    return delivered(columnDelivery({ skipped: 'thin-material' }), { kind: 'briefing', scope, key, skipped: 'thin-material', fetchedSources });
  }
  const first = await composeBatch(env, [{
    draft,
    route: 'grok',
    writer: 'minimax',
    search: false,
    material: true,
    fetchedSources,
  }], started);
  const written = first.docs[0] ?? draft;
  // Never replace a listed brief with a failed or thinner run.
  const prior = existing?.doc && existing.doc.mode === 'ai' && !existing.doc.stage ? existing.doc : undefined;
  const keep = Boolean(prior && !briefingPublic(written) && (briefingPublic(prior) || narrativeChars(prior) > narrativeChars(written)));
  const doc = keep && existing ? existing.doc : written;
  const costs = first.costs;
  const grokStatus = first.grokStatus;
  const grokError = first.grokError;
  const steps = first.steps;
  if (!keep) await writeDoc(env, doc);
  const chars = bodyChars(doc);
  const ready = doc.mode === 'ai' && pieceReady(doc);
  return withPending(doc, delivered(columnDelivery({ capped: first.capped, docs: [{ mode: doc.mode, model: doc.model, provider: doc.provider, chars, key: doc.key, ready }] }), {
    kind: 'briefing',
    scope,
    key: doc.key,
    mode: doc.mode,
    model: doc.model ?? '',
    provider: doc.provider ?? '',
    chars,
    ready,
    public: briefingPublic(doc),
    grokStatus,
    grokError,
    steps,
    ...(keep ? { kept: true } : {}),
    cost: summedCost(costs, doc.key),
  }));
}

export async function generateBriefing(env: ContentEnv, now = new Date(), options: { force?: boolean; scope?: BriefingScope } = {}): Promise<Record<string, unknown>> {
  const scope = options.scope ?? 'hk';
  if (scope !== 'hk') return generateScopedBriefing(env, scope, now, options);
  const key = briefingKey(now);
  const existing = await readDoc(env, docKey('briefing', key));
  if (!options.force && settledPiece(existing?.doc)) {
    return delivered(columnDelivery({ skipped: 'exists' }), { kind: 'briefing', scope: 'hk', key, mode: 'ai', provider: existing?.doc.provider ?? 'grok', skipped: 'exists' });
  }
  const spent = await monthUsage(env, now);
  if (!options.force && overPace(spent.costUsd, now)) {
    return delivered(columnDelivery({ skipped: 'pace' }), { kind: 'briefing', key, skipped: 'pace' });
  }
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'briefing', key });
  const started = Date.now();
  const selected = selectBriefingItems(material.items, now);
  const filled = await fillBriefing(env, selected.hk, selected.china, now);
  const draft = briefingFromItems(filled.hk, filled.china, key, now);
  if (!draft) return delivered(columnDelivery({ skipped: 'no-headlines' }), { kind: 'briefing', key, skipped: 'no-headlines' });
  const first = await composeBatch(env, [{
    draft,
    route: 'grok',
    search: filled.search,
    material: !filled.search,
    fetchedSources: filled.fetchedSources,
  }], started);
  let doc = first.docs[0] ?? draft;
  let costs = first.costs;
  let grokStatus = first.grokStatus;
  let grokError = first.grokError;
  const capped = first.capped;
  if (doc.mode === 'ai' && !pieceReady(doc) && Date.now() - started < RETRY_BEFORE_MS) {
    const more = selectBriefingItems(material.items, now, 14);
    const widerFilled = await fillBriefing(env, more.hk, more.china, now);
    const wider = briefingFromItems(widerFilled.hk, widerFilled.china, key, now);
    if (wider) {
      const again = await composeBatch(env, [{
        draft: wider,
        route: 'grok',
        search: widerFilled.search,
        material: !widerFilled.search,
        fetchedSources: widerFilled.fetchedSources,
      }], started);
      costs = [...costs, ...again.costs];
      grokStatus = [...grokStatus, ...again.grokStatus];
      grokError = [...new Set([...grokError, ...again.grokError])];
      const next = again.docs[0];
      if (next && bodyChars(next) > bodyChars(doc)) doc = next;
    }
  }
  await writeDoc(env, doc);
  const chars = bodyChars(doc);
  const ready = doc.mode === 'ai' && pieceReady(doc);
  const cost = summedCost(costs, doc.key);
  return delivered(columnDelivery({ capped, docs: [{ mode: doc.mode, model: doc.model, provider: doc.provider, chars, key, ready }] }), {
    kind: 'briefing',
    scope: 'hk',
    key,
    mode: doc.mode,
    model: doc.model ?? '',
    provider: doc.provider ?? '',
    chars,
    ready,
    grokStatus,
    grokError,
    cost,
  });
}

function clusterFromDoc(doc: ContentDoc): StoryCluster | null {
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const block of doc.blocks) {
    for (const source of block.sources) {
      if (!source.url || seen.has(source.url)) continue;
      seen.add(source.url);
      items.push({
        id: source.url,
        title: source.title,
        link: source.url,
        source: source.source,
        sourceUrl: source.url,
        regions: [],
        pubDate: source.pubDate || doc.publishedAt,
        category: source.category || 'world',
        ...(source.excerpt ? { excerpt: source.excerpt } : {}),
      });
    }
  }
  if (items.length < 2) return null;
  const lead = items[0]!;
  return {
    id: doc.key,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
    latest: Date.parse(doc.publishedAt) || Date.now(),
  };
}

function matchCluster(doc: ContentDoc, clusters: StoryCluster[]): StoryCluster | undefined {
  const links = new Set(doc.blocks.flatMap((block) => block.sources.map((source) => source.url)));
  return clusters.find((cluster) => cluster.items.filter((item) => links.has(item.link)).length >= 2);
}

async function legacyCompareDocs(env: ContentEnv, onlyKey = ''): Promise<ContentDoc[]> {
  const entries = await readIndex(env, 'compare').catch(() => []);
  const chosen = onlyKey ? entries.filter((entry) => entry.key === onlyKey) : entries;
  const saved = await Promise.all(chosen.map((entry) => readDoc(env, docKey('compare', entry.key)).catch(() => null)));
  return saved
    .map((row) => row?.doc)
    .filter((doc): doc is ContentDoc => Boolean(doc))
    .filter((doc) => (onlyKey ? doc.key === onlyKey : !explainerCurrent(doc)));
}

/** MiniMax desks: outlets read per story, and the material bar before a piece is attempted. */
const MINIMAX_FETCH_PER_CLUSTER = 6;
const MINIMAX_MIN_OUTLETS = 2;
const MINIMAX_MIN_TEXT = 2_500;

export function miniMaterialOk(items: NewsItem[]): boolean {
  const withText = items.filter((item) => (item.excerpt || '').trim().length >= 200);
  return new Set(withText.map((item) => item.source)).size >= MINIMAX_MIN_OUTLETS && excerptChars(items) >= MINIMAX_MIN_TEXT;
}

/** One article per outlet first, so six reads cover as many outlets as possible. */
function outletSpread(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const first: NewsItem[] = [];
  const rest: NewsItem[] = [];
  for (const item of items) {
    if (seen.has(item.source)) rest.push(item);
    else {
      seen.add(item.source);
      first.push(item);
    }
  }
  return [...first, ...rest];
}

/** Local outlets read for a Hong Kong story before web search. */
const HK_FETCH_PER_CLUSTER = 6;

/** Fuller local text first: the press release, then TV and radio desks, then papers and portals. */
const OUTLET_ORDER = ['新聞公報', '有線新聞', 'Now 新聞', '香港01', '無線新聞', '香港電台', '星島頭條', 'Yahoo 新聞'];

function outletRank(source: string): number {
  const index = OUTLET_ORDER.indexOf(source);
  return index < 0 ? OUTLET_ORDER.length : index;
}

function hkCluster(cluster: StoryCluster): boolean {
  return cluster.items.some((item) => item.category === 'hk' || item.regions?.includes('HKG'));
}

const DEPARTMENT_RE = /署|處|局|部門|委員會|警方|警務|消防|政府|法院|醫管局|選舉|運輸|房屋|社會福利|勞工|教育/;

/** Board items on the same Hong Kong event that the cluster missed: other desks and, when a department is involved, the press release. */
export function rescueItems(cluster: StoryCluster, items: NewsItem[]): NewsItem[] {
  const have = new Set(cluster.items.map((item) => item.link));
  const sources = new Set(cluster.items.map((item) => item.source));
  const room = Math.max(0, HK_FETCH_PER_CLUSTER - cluster.items.length);
  const related = items.filter((item) => !have.has(item.link)
    && (item.category === 'hk' || item.regions?.includes('HKG'))
    && (titlesAreSameEvent(cluster.lead.title, item.title) || sameEvent(cluster.lead, item)));
  const out: NewsItem[] = [];
  const headlines = cluster.items.map((item) => item.title).join(' ');
  if (DEPARTMENT_RE.test(headlines)) {
    const release = related.find((item) => item.source === '新聞公報');
    if (release) out.push(release);
  }
  const limit = Math.max(room, out.length);
  for (const item of related.sort((a, b) => outletRank(a.source) - outletRank(b.source))) {
    if (out.length >= limit) break;
    if (out.includes(item) || sources.has(item.source)) continue;
    sources.add(item.source);
    out.push(item);
  }
  return out;
}

interface Prepared {
  draft: ContentDoc;
  route: 'grok' | 'workers';
  writer?: ArticleWriter;
  cluster: StoryCluster;
  /** Hong Kong story: a strict retry that is still thin gets one web-search attempt. */
  hk?: boolean;
  keepKey?: string;
  search: boolean;
  material: boolean;
  fetchedSources: number;
  priorInput: number;
  priorOutput: number;
}

/** Drop headlines that are not the lead's event, then ask Grok which of the rest are the same story. */
async function narrowCluster(cluster: StoryCluster, key: string, capped: boolean): Promise<{ cluster: StoryCluster | null; input: number; output: number; requests: number }> {
  const strict = coherentCluster(cluster);
  if (!strict) return { cluster: null, input: 0, output: 0, requests: 0 };
  if (strict.items.length < 3 || !key || capped) return { cluster: strict, input: 0, output: 0, requests: 0 };
  const prompt = coherencePrompt(strict.items.map((item) => ({ source: item.source, title: item.title })));
  const result = await completeText(key, prompt.system, prompt.user, 200, 12_000);
  const spent = { input: result.input, output: result.output, requests: result.status ? 1 : 0 };
  const keep = result.text ? parseCoherence(result.text, strict.items.length) : null;
  if (!keep) return { cluster: strict, ...spent };
  if (keep.length < 2) return { cluster: null, ...spent };
  const items = keepItems(strict.items, keep);
  const lead = items.find((item) => item.id === strict.lead.id) ?? items[0];
  if (!lead) return { cluster: null, ...spent };
  const next = coherentCluster({
    ...strict,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
  });
  return { cluster: next, ...spent };
}

async function prepareExplainers(
  env: ContentEnv,
  candidates: { cluster: StoryCluster; keepKey?: string }[],
  items: NewsItem[],
  take: number,
  now: Date,
  held?: string[],
): Promise<Prepared[]> {
  const usage = await monthUsage(env);
  const key = apiKey(env);
  const capped = capReached(usage) || !key;
  const narrowed = await Promise.all(candidates.map((row) => narrowCluster(row.cluster, key, capped)));
  const requests = narrowed.reduce((sum, row) => sum + row.requests, 0);
  if (requests) {
    const input = narrowed.reduce((sum, row) => sum + row.input, 0);
    const output = narrowed.reduce((sum, row) => sum + row.output, 0);
    await saveUsage(env, withTokens(usage, input, output, requests, 0));
  }
  const chosen: { cluster: StoryCluster; source: { cluster: StoryCluster; keepKey?: string }; priorInput: number; priorOutput: number }[] = [];
  for (const [index, row] of narrowed.entries()) {
    if (chosen.length >= take) break;
    const cluster = row.cluster;
    const source = candidates[index];
    if (!cluster || !source) continue;
    chosen.push({ cluster, source, priorInput: row.input, priorOutput: row.output });
  }
  // Hong Kong desks publish short pieces. Widen a local story to up to six outlets (plus the
  // government press release when a department is involved) before any web search.
  for (const row of chosen) {
    if (!hkCluster(row.cluster)) continue;
    const extra = rescueItems(row.cluster, items);
    if (!extra.length) continue;
    const merged = [...row.cluster.items, ...extra];
    row.cluster = {
      ...row.cluster,
      items: merged,
      sources: [...new Set(merged.map((item) => item.source))],
      count: new Set(merged.map((item) => item.source)).size,
    };
  }
  const urls: string[] = [];
  for (const row of chosen) {
    let added = 0;
    const mini = clusterWriter(row.cluster) === 'minimax';
    const cap = hkCluster(row.cluster) ? HK_FETCH_PER_CLUSTER : mini ? MINIMAX_FETCH_PER_CLUSTER : 4;
    for (const item of mini ? outletSpread(row.cluster.items) : [...row.cluster.items].sort((a, b) => outletRank(a.source) - outletRank(b.source))) {
      if (added >= cap) break;
      if (!/^https?:\/\//.test(item.link) || urls.includes(item.link)) continue;
      urls.push(item.link);
      added += 1;
    }
  }
  const fetched = urls.length
    ? await fetchArticleTexts(env, urls, fetch, urls.length)
    : { texts: new Map<string, string>(), fetchedSources: 0 };
  const date = hktParts(now).date;
  const jobs: Prepared[] = [];
  for (const row of chosen) {
    const miniDesk = clusterWriter(row.cluster) === 'minimax';
    const stamped = stampExcerpts(row.cluster.items, fetched.texts, miniDesk ? ARTICLE_CHARS_LONG : ARTICLE_CHARS);
    if (miniDesk && !miniMaterialOk(stamped)) {
      held?.push(row.source.keepKey || row.cluster.lead.title);
      // A forced MiniMax piece below the bar goes back to the source list, not an unchecked draft.
      if (row.source.keepKey) {
        const listed = compareFromCluster({ ...row.cluster, items: stamped }, now, relatedEarlier(row.cluster, items));
        listed.key = row.source.keepKey;
        await writeDoc(env, listed, false).catch(() => undefined);
      }
      continue;
    }
    const lead = stamped.find((item) => item.id === row.cluster.lead.id) ?? stamped[0];
    if (!lead) continue;
    const cluster: StoryCluster = {
      ...row.cluster,
      lead,
      items: stamped,
      sources: [...new Set(stamped.map((item) => item.source))],
      count: new Set(stamped.map((item) => item.source)).size,
    };
    const chars = excerptChars(stamped);
    const search = needsSearch(chars) && !capped;
    await writeBundle(env, bundleFrom(date, storySignature(cluster), cluster.lead.title, stamped)).catch(() => undefined);
    const draft = compareFromCluster(cluster, now, relatedEarlier(cluster, items));
    if (row.source.keepKey) draft.key = row.source.keepKey;
    const writer = clusterWriter(cluster);
    jobs.push({
      draft,
      route: routeForCluster(cluster),
      writer,
      cluster,
      search: writer === 'minimax' ? false : search,
      material: writer === 'minimax' ? true : !search,
      hk: writer !== 'minimax' && hkCluster(cluster),
      fetchedSources: stamped.filter((item) => (item.excerpt || '').length >= 80).length,
      priorInput: row.priorInput,
      priorOutput: row.priorOutput,
      ...(row.source.keepKey ? { keepKey: row.source.keepKey } : {}),
    });
  }
  return jobs;
}

async function runUpdates(
  env: ContentEnv,
  clusters: StoryCluster[],
  events: StoredEvent[],
  now: Date,
): Promise<{ keys: string[]; costs: ArticleCost[]; events: StoredEvent[] }> {
  const key = apiKey(env);
  const usage = await monthUsage(env, now);
  if (capReached(usage) || !key || writerFor({ costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
    return { keys: [], costs: [], events };
  }
  const ranked = [...clusters].filter((cluster) => cluster.count >= 2).sort((a, b) => b.count - a.count || b.latest - a.latest);
  const picked: { cluster: StoryCluster; event: StoredEvent; links: string[] }[] = [];
  for (const cluster of ranked) {
    const event = matchEvent(cluster, events, now.getTime());
    if (!event) continue;
    const links = newLinks(cluster, event);
    if (!links.length) continue;
    picked.push({ cluster, event, links });
    if (picked.length >= UPDATES_PER_CALL) break;
  }
  if (!picked.length) return { keys: [], costs: [], events };
  const urls = [...new Set(picked.flatMap((row) => row.links))].slice(0, 4);
  const fetched = await fetchArticleTexts(env, urls, fetch, urls.length || 1);
  const keys: string[] = [];
  const costs: ArticleCost[] = [];
  const saved: ContentDoc[] = [];
  let nextUsage = usage;
  for (const row of picked) {
    const existing = await readDoc(env, docKey('compare', row.event.key));
    if (!existing) continue;
    const material = row.cluster.items.filter((item) => row.links.includes(item.link)).map((item) => ({
      source: item.source,
      title: item.title,
      url: item.link,
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      excerpt: (fetched.texts.get(item.link) || item.excerpt || '').slice(0, 1_200),
    }));
    const prompt = deltaPrompt(existing.doc, material);
    const result = await completeText(key, prompt.system, prompt.user, prompt.maxTokens, 20_000);
    if (result.status) nextUsage = withTokens(nextUsage, result.input, result.output, 1, 0);
    const delta = result.text ? parseDelta(result.text) : null;
    const applied = delta ? applyDelta(existing.doc, delta, material, now) : { doc: existing.doc, changed: false };
    if (applied.changed) {
      await writeDoc(env, applied.doc, false);
      saved.push(applied.doc);
      keys.push(applied.doc.key);
    }
    row.event.links = [...new Set([...row.event.links, ...row.links])];
    row.event.at = now.getTime();
    costs.push({
      key: row.event.key,
      inputTokens: result.input,
      outputTokens: result.output,
      searchCalls: 0,
      fetchedSources: material.filter((item) => (item.excerpt || '').length >= 80).length,
      costUsd: callCostUsd(result.input, result.output, 0),
    });
  }
  if (costs.length) await saveUsage(env, nextUsage);
  if (saved.length) await rememberIndexMany(env, saved).catch(() => undefined);
  return { keys, costs, events };
}

/** Rejected explainer rewrites, kept hidden for a week for debugging. */
const REJECTED_TTL_SECONDS = 7 * 24 * 60 * 60;

export function rejectedKey(key: string): string {
  return `rejected:compare:${key}`;
}

/**
 * True when the stored explainer should stay: it is listed, and the new version is either not
 * listable or more than 15% shorter. Applies to every writer.
 */
export function keepStoredExplainer(stored: ContentDoc, next: ContentDoc): boolean {
  if (!explainerCurrent(stored)) return false;
  if (!explainerCurrent(next)) return true;
  return narrativeChars(next) < narrativeChars(stored) * 0.85;
}

const PENDING_KEY = 'minimax-pending';

async function readPending(env: ContentEnv): Promise<string[]> {
  try {
    const parsed = JSON.parse((await readValue(env, PENDING_KEY)) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

async function writePending(env: ContentEnv, keys: string[]): Promise<void> {
  await writeValue(env, PENDING_KEY, JSON.stringify([...new Set(keys)].slice(-30)));
}

/** Second drafts for MiniMax explainers checked once on an earlier call. */
async function expandPending(env: ContentEnv, pending: string[], requestStart: number): Promise<{ keys: string[]; steps: string[]; errors: string[] }> {
  const mini = minimaxKey(env);
  const batch = pending.slice(0, MINIMAX_PER_CALL);
  const steps: string[] = [];
  const errors: string[] = [];
  const keys: string[] = [];
  const requeue: string[] = [];
  const costUsd = (await monthUsage(env)).costUsd;
  const spent = { input: 0, output: 0, requests: 0 };
  await Promise.all(batch.map(async (key) => {
    const saved = await readDoc(env, docKey('compare', key)).catch(() => null);
    const doc = saved?.doc;
    if (!doc || !mini || !(doc.stage || awaitingVerify(doc))) return;
    const expanded = await resumeMiniMax(env, doc, requestStart, costUsd);
    spent.input += expanded.input;
    spent.output += expanded.output;
    spent.requests += expanded.requests;
    errors.push(...expanded.errors);
    steps.push(`${key}:${expanded.steps.join(',')}`);
    await writeDoc(env, expanded.doc, !heldMiniMax(expanded.doc));
    keys.push(key);
    // Re-queue only when the piece moved forward (drafted → checked); a stuck one stays hidden.
    if (expanded.doc.stage && expanded.doc.stage !== doc.stage) requeue.push(key);
  }));
  await chargeVerify(env, spent.input, spent.output, spent.requests);
  await writePending(env, [...pending.filter((key) => !batch.includes(key)), ...requeue]);
  return { keys, steps, errors };
}

export async function generateCompare(
  env: ContentEnv,
  limit = COMPARE_BATCH,
  now = new Date(),
  options: { force?: boolean; key?: string; minimaxOnly?: boolean } = {},
): Promise<Record<string, unknown>> {
  const requestStart = Date.now();
  // Finish once-checked MiniMax pieces before writing new ones; one call cannot fit both.
  if (!options.force) {
    const pending = await readPending(env);
    if (pending.length && minimaxKey(env)) {
      const expanded = await expandPending(env, pending, requestStart);
      return delivered(columnDelivery({}), {
        kind: 'compare',
        keys: expanded.keys,
        expanded: expanded.keys,
        steps: expanded.steps,
        grokError: [...new Set(expanded.errors)],
      });
    }
  }
  const take = Math.max(1, Math.min(COMPARE_BATCH, limit));
  const written = parseWritten(await readValue(env, writtenKey(now)).catch(() => null));
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'compare', keys: [] });

  let events = await readEvents(env);
  const update = options.force || options.minimaxOnly
    ? { keys: [] as string[], costs: [] as ArticleCost[], events }
    : await runUpdates(env, material.clusters, events, now);
  events = update.events;

  const spent = await monthUsage(env, now);
  const room = options.force ? take : options.minimaxOnly ? 0 : Math.min(take, articleRoom(spent.costUsd, now));
  const miniTake = options.force ? 0 : Math.min(MINIMAX_PER_CALL, pickMiniMaxBatch(material.clusters, written, MINIMAX_PER_CALL, now).length > 0 ? MINIMAX_PER_CALL : 0);
  if (!options.force && room <= 0 && miniTake <= 0) {
    await writeEvents(env, events, now.getTime());
    return delivered(columnDelivery({ skipped: 'pace' }), {
      kind: 'compare',
      keys: [],
      updates: update.keys,
      costs: update.costs,
      skipped: 'pace',
    });
  }

  let candidates: { cluster: StoryCluster; keepKey?: string }[];
  if (options.force) {
    const legacy = await legacyCompareDocs(env, options.key || '');
    if (options.key && !legacy.length) {
      return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'missing', key: options.key });
    }
    const forced = legacy.slice(0, take);
    if (!forced.length) return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'none' });
    candidates = forced.flatMap((doc) => {
      const cluster = matchCluster(doc, material.clusters) ?? clusterFromDoc(doc);
      return cluster ? [{ cluster, keepKey: doc.key }] : [];
    });
  } else {
    const fresh = material.clusters.filter((cluster) => !matchEvent(cluster, events, now.getTime()));
    // Only clusters that pass the same-event check, so a call is not spent re-picking ones prepareExplainers drops.
    const miniPool = fresh.filter((cluster) => cluster.count >= MINIMAX_MIN_OUTLETS && clusterWriter(cluster) === 'minimax' && coherentCluster(cluster));
    // One spare candidate: a story below the material bar is skipped without a MiniMax call.
    const miniPicked = miniTake > 0 ? pickMiniMaxBatch(miniPool, written, miniTake + 1, now) : [];
    const grokFresh = fresh.filter((cluster) => clusterWriter(cluster) === 'grok');
    const grokWritten = written.filter((row) => row.provider !== 'minimax');
    const grokPicked = room > 0 ? pickCompareBatch(grokFresh, grokWritten, room, now) : [];
    const picked = [...miniPicked, ...grokPicked];
    if (!picked.length) {
      await writeEvents(env, events, now.getTime());
      return delivered(columnDelivery({ skipped: 'none' }), {
        kind: 'compare',
        keys: [],
        updates: update.keys,
        costs: update.costs,
        skipped: 'none',
      });
    }
    candidates = picked.map((cluster) => ({ cluster }));
  }
  const held: string[] = [];
  const prepared = await prepareExplainers(env, candidates, material.items, candidates.length, now, held);
  let miniJobs = 0;
  const jobs = prepared.filter((job) => job.writer !== 'minimax' || options.force || (miniJobs += 1) <= miniTake);
  if (!jobs.length) {
    await writeEvents(env, events, now.getTime());
    return delivered(columnDelivery({ skipped: 'none' }), {
      kind: 'compare',
      keys: [],
      updates: update.keys,
      costs: update.costs,
      skipped: 'none',
      held,
    });
  }

  const { docs, grokStatus, grokError, capped, costs, steps } = await composeBatch(env, jobs, Date.now(), requestStart + MINIMAX_DEADLINE_MS);
  const saved: ContentDoc[] = [];
  const kept: string[] = [];
  let nextWritten: WrittenStory[] = [...written];
  for (const [index, doc] of docs.entries()) {
    const job = jobs[index];
    if (!job || !doc) continue;
    if (job.keepKey) doc.key = job.keepKey;
    // MiniMax pieces from English leads take a Chinese slug from their written headline.
    if (job.writer === 'minimax' && doc.mode === 'ai' && !/[\u3400-\u9fff]/.test(doc.key) && /[\u3400-\u9fff]/.test(doc.title)) {
      const oldKey = doc.key;
      doc.key = `${oldKey.slice(0, 10)}-${analysisSlug(doc.title)}`;
      events = events.filter((event) => event.key !== oldKey);
    }
    // Keep the better version: a rewrite replaces a listed piece only if it is listed too and not
    // more than 15% shorter. A rejected draft is kept hidden for debugging.
    const stored = (await readDoc(env, docKey('compare', doc.key)).catch(() => null))?.doc;
    if (stored && keepStoredExplainer(stored, doc)) {
      await writeValue(env, rejectedKey(doc.key), JSON.stringify({ doc, rejectedAt: now.getTime(), keptChars: narrativeChars(stored) }), REJECTED_TTL_SECONDS);
      kept.push(doc.key);
      saved.push(stored);
      continue;
    }
    await writeDoc(env, doc, false);
    saved.push(doc);
    const ready = doc.mode === 'ai' && pieceReady(doc);
    nextWritten = upsertWritten(nextWritten, {
      key: doc.key,
      signature: storySignature(job.cluster),
      links: [...new Set(job.cluster.items.map((item) => item.link))],
      mode: doc.mode,
      at: now.getTime(),
      chars: bodyChars(doc),
      provider: doc.provider === 'minimax' ? 'minimax' : doc.provider === 'workers-ai' ? 'workers-ai' : 'grok',
      ready,
    }, job.cluster, now);
    await writeValue(env, writtenKey(now), JSON.stringify(nextWritten));
    const previous = events.find((event) => event.key === doc.key);
    const row: StoredEvent = {
      key: doc.key,
      title: doc.title,
      leadTitle: job.cluster.lead.title,
      links: [...new Set([...(previous?.links ?? []), ...job.cluster.items.map((item) => item.link)])],
      at: now.getTime(),
      signature: storySignature(job.cluster),
    };
    events = [row, ...events.filter((event) => event.key !== doc.key)];
  }
  await writeEvents(env, events, now.getTime());
  if (saved.length) await rememberIndexMany(env, saved).catch(() => undefined);
  const checked = saved.filter((doc) => !kept.includes(doc.key) && (Boolean(doc.stage) || awaitingVerify(doc))).map((doc) => doc.key);
  if (checked.length) await writePending(env, [...(await readPending(env)), ...checked]);
  return delivered(columnDelivery({
    capped,
    docs: saved.map((doc) => ({
      mode: doc.mode,
      model: doc.model,
      chars: bodyChars(doc),
      key: doc.key,
      ready: doc.mode === 'ai' && pieceReady(doc),
    })),
  }), {
    kind: 'compare',
    keys: saved.map((doc) => doc.key),
    ...(kept.length ? { kept } : {}),
    updates: update.keys,
    modes: saved.map((doc) => doc.mode),
    routes: jobs.map((job) => job.route),
    providers: saved.map((doc) => doc.provider ?? ''),
    models: saved.map((doc) => doc.model ?? ''),
    grokStatus,
    grokError,
    held,
    steps,
    costs: [...update.costs, ...saved.map((doc) => summedCost(costs, doc.key))],
  });
}

function slotOk(slot: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(am|pm)(-(world|techfin))?$/.test(slot);
}

function compareOk(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-.+-[0-9a-f]{12}$/.test(key);
}

async function visibleBriefings(env: ContentEnv, entries: Awaited<ReturnType<typeof readIndex>>): Promise<Awaited<ReturnType<typeof readIndex>>> {
  const saved = await Promise.all(entries.map((entry) => readDoc(env, docKey('briefing', entry.key)).catch(() => null)));
  return entries.filter((_entry, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && briefingPublic(doc));
  });
}

export async function serveBriefingIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'briefing').catch(() => []);
  const visible = await visibleBriefings(env, entries);
  const canonical = `${siteUrl(env)}/briefing/`;
  return new Response(renderColumnIndex('briefing', visible, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

async function visibleExplainers(env: ContentEnv, entries: Awaited<ReturnType<typeof readIndex>>): Promise<Awaited<ReturnType<typeof readIndex>>> {
  const saved = await Promise.all(entries.map((entry) => readDoc(env, docKey('compare', entry.key)).catch(() => null)));
  return entries.filter((_entry, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && explainerCurrent(doc));
  });
}

export async function serveCompareIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'compare').catch(() => []);
  const visible = await visibleExplainers(env, entries);
  const canonical = `${siteUrl(env)}/explainer/`;
  return new Response(renderColumnIndex('compare', visible, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

export async function serveBriefing(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const slot = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/briefing/${slot}`;
  const archive = await visibleBriefings(env, await readIndex(env, 'briefing').catch(() => []));
  const day = slot.slice(0, 10);
  const explainers = await visibleExplainers(env, (await readIndex(env, 'compare').catch(() => [])).filter((entry) => entry.key.startsWith(day)));
  if (!slotOk(slot)) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404, explainers);
  const saved = await readDoc(env, docKey('briefing', slot)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404, explainers);
  return htmlPage(saved.doc, canonical, env, archive, 200, explainers);
}

export async function serveCompare(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const key = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/explainer/${encodeURIComponent(key)}`;
  const archive = await visibleExplainers(env, await readIndex(env, 'compare').catch(() => []));
  if (!compareOk(key)) return htmlPage(emptyDoc('compare', key, '未有這則懶人包'), canonical, env, archive, 404);
  const saved = await readDoc(env, docKey('compare', key)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('compare', key, '未有這則懶人包'), canonical, env, archive, 404);
  return htmlPage(saved.doc, canonical, env, archive);
}

export async function warmColumns(context: PagesContext): Promise<Response> {
  try {
    applyRuntimeEnv(context.env);
    const env = context.env as ContentEnv;
    const header = context.request.headers.get('x-generate-secret');
    const secret = typeof env.GENERATE_SECRET === 'string' ? env.GENERATE_SECRET : '';
    if (!secret || header !== secret) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
    }
    const kind = new URL(context.request.url).searchParams.get('kind') || '';
    if (kind === 'status') return Response.json(await columnStatus(env));
    const url = new URL(context.request.url);
    const force = url.searchParams.get('force') === '1';
    if (kind === 'briefing') {
      const slot = url.searchParams.get('slot') || '';
      const when = force && slot ? slotInstant(slot) : null;
      if (force && slot && !when) {
        return Response.json({ error: 'slot' }, { status: 400, headers: { 'cache-control': 'no-store' } });
      }
      const scopeRaw = url.searchParams.get('scope') || '';
      if (scopeRaw && !isBriefingScope(scopeRaw)) {
        return Response.json({ error: 'scope' }, { status: 400, headers: { 'cache-control': 'no-store' } });
      }
      // Unscoped is the Hong Kong edition only: each MiniMax edition needs most of a request, and the
      // warm run calls scope=world and scope=techfin separately right after.
      const scopes: BriefingScope[] = isBriefingScope(scopeRaw) ? [scopeRaw] : ['hk'];
      const rows = [];
      for (const scope of scopes) {
        rows.push(await generateBriefing(env, when ?? new Date(), { force, scope }));
      }
      const failed = rows.some((row) => row.fallback === true || row.status === 503);
      const hk = rows.find((row) => row.scope === 'hk') ?? rows[0] ?? {};
      const result = scopes.length === 1 ? rows[0] : { ...hk, scopes: rows, ...(failed ? { status: 503, ok: false, fallback: true } : {}) };
      const status = typeof result?.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    if (kind === 'compare' || kind === 'explainer') {
      const requested = Number(url.searchParams.get('limit') || COMPARE_BATCH);
      const limit = Number.isFinite(requested) ? requested : COMPARE_BATCH;
      const key = url.searchParams.get('key') || '';
      const minimaxOnly = url.searchParams.get('only') === 'minimax';
      const result = await generateCompare(env, limit, new Date(), { force, ...(key ? { key } : {}), ...(minimaxOnly ? { minimaxOnly } : {}) });
      const status = typeof result.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    if (kind === 'focus') {
      const requested = Number(url.searchParams.get('limit') || '');
      const result = await generateFocus(env, Number.isFinite(requested) ? requested : undefined, new Date(), {
        force,
        scope: url.searchParams.get('scope') || '',
        id: url.searchParams.get('id') || '',
      });
      const status = typeof result.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ error: 'kind' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
