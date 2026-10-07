import { applyModelText, briefingHeadings, briefingScopeOf, promptFor, type ContentDoc, type ResearchMode } from '../../shared/content.js';
import { bodyChars, pieceReady } from '../../shared/grok.js';
import { toHK } from '../../shared/zh.js';

/** MiniMax China Coding Plan. Flat fee, so a call costs 0 USD. */
export const MINIMAX_URL = 'https://api.minimaxi.com/v1/text/chatcompletion_v2';
export const MINIMAX_MODEL = 'MiniMax-M2.5';
export const MINIMAX_FALLBACK_MODEL = 'MiniMax-M2';
export const MINIMAX_TIMEOUT_MS = 45_000;
export const MINIMAX_MAX_TOKENS = 8_000;
export const MINIMAX_RETRY_TOKENS = 10_000;

/** Source text per article handed to MiniMax (flat fee). */
export const MINIMAX_EXCERPT_CHARS = 2_500;

/** Rate-limit and balance codes on base_resp. A length finish is not one of these. */
const QUOTA_CODES = new Set([1002, 1008, 1041]);

export interface MiniMaxCompletion {
  text: string;
  input: number;
  output: number;
  status: number;
  model: string;
  /** HTTP 429 or a quota / rate-limit base_resp. The caller falls back to Grok. */
  quota: boolean;
  error?: string;
}

interface MiniMaxPayload {
  choices?: { finish_reason?: string; message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  base_resp?: { status_code?: number; status_msg?: string };
}

function describe(error: unknown, apiKey: string): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (apiKey ? text.split(apiKey).join('[key]') : text).replace(/Bearer\s+\S+/g, 'Bearer [key]').slice(0, 160);
}

function tokens(usage: MiniMaxPayload['usage']): { input: number; output: number } {
  const input = Number(usage?.prompt_tokens);
  const output = Number(usage?.completion_tokens);
  return {
    input: Number.isFinite(input) && input > 0 ? Math.floor(input) : 0,
    output: Number.isFinite(output) && output > 0 ? Math.floor(output) : 0,
  };
}

function stripFinish(result: MiniMaxCompletion & { finish: string }): MiniMaxCompletion {
  return {
    text: result.text,
    input: result.input,
    output: result.output,
    status: result.status,
    model: result.model,
    quota: result.quota,
    ...(result.error ? { error: result.error } : {}),
  };
}

function isQuota(status: number, payload: MiniMaxPayload | null): boolean {
  if (status === 429) return true;
  const code = payload?.base_resp?.status_code;
  if (typeof code === 'number' && code !== 0 && QUOTA_CODES.has(code)) return true;
  const msg = payload?.base_resp?.status_msg || '';
  return /quota|rate limit|余额|餘額|限流|额度|額度/i.test(msg);
}

async function postOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  timeoutMs: number,
): Promise<MiniMaxCompletion & { finish: string }> {
  try {
    const response = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json().catch(() => null) as MiniMaxPayload | null;
    const choice = payload?.choices?.[0];
    const raw = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
    const counted = tokens(payload?.usage);
    return {
      text: toHK(raw),
      input: counted.input,
      output: counted.output,
      status: response.status,
      model,
      quota: isQuota(response.status, payload),
      finish: choice?.finish_reason || '',
    };
  } catch (error) {
    return { text: '', input: 0, output: 0, status: 0, model, quota: false, finish: '', error: describe(error, apiKey) };
  }
}

async function completeModel(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  timeoutMs: number,
): Promise<MiniMaxCompletion> {
  const first = await postOnce(apiKey, model, system, user, MINIMAX_MAX_TOKENS, timeoutMs);
  if (first.quota || first.text || first.finish !== 'length' || timeoutMs < MINIMAX_TIMEOUT_MS) return stripFinish(first);
  const again = await postOnce(apiKey, model, system, user, MINIMAX_RETRY_TOKENS, timeoutMs);
  return {
    text: again.text,
    input: first.input + again.input,
    output: first.output + again.output,
    status: again.status || first.status,
    model,
    quota: again.quota,
    ...(again.error || first.error ? { error: again.error || first.error } : {}),
  };
}

/**
 * One MiniMax chat completion. MiniMax-M2.5 first; MiniMax-M2 if that model fails
 * for a reason other than quota. reasoning_content is ignored. Output is Traditional Chinese (HK).
 */
export async function completeMiniMax(
  apiKey: string,
  system: string,
  user: string,
  timeoutMs = MINIMAX_TIMEOUT_MS,
): Promise<MiniMaxCompletion> {
  const primary = await completeModel(apiKey, MINIMAX_MODEL, system, user, timeoutMs);
  // A timeout means the time budget is spent; a second model would double it.
  if (primary.text || primary.quota || primary.status === 401 || primary.status === 403 || /timeout|abort/i.test(primary.error || '')) return primary;
  const secondary = await completeModel(apiKey, MINIMAX_FALLBACK_MODEL, system, user, timeoutMs);
  if (!secondary.text && !secondary.error && primary.error) return { ...secondary, error: primary.error };
  return secondary;
}

/** MiniMax sometimes drops the `{` before a section or adds a stray closing bracket. */
export function repairJson(raw: string): string {
  const text = raw.replace(/```json|```/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return raw;
  const tryParse = (candidate: string): boolean => {
    try {
      JSON.parse(candidate);
      return true;
    } catch {
      return false;
    }
  };
  let body = text.slice(start, end + 1);
  if (tryParse(body)) return body;
  body = body.replace(/\}\s*,\s*"heading"/g, '},{"heading"');
  for (let cut = 0; cut <= 4; cut += 1) {
    const candidate = cut ? body.slice(0, -cut) : body;
    if (tryParse(candidate)) return candidate;
    if (tryParse(`${candidate}]}`)) return `${candidate}]}`;
  }
  return raw;
}

/** Writes one piece from supplied material only. Cost stays 0. Quota is reported for the Grok fallback. */
export async function writeMiniMax(
  apiKey: string,
  draft: ContentDoc,
  research: ResearchMode = 'material',
  strict = false,
  excerptCap?: number,
  timeoutMs = MINIMAX_TIMEOUT_MS,
): Promise<{ doc: ContentDoc | null; quota: boolean; input: number; output: number; model: string; error?: string }> {
  const prompt = promptFor(draft, strict, research === true ? 'material' : research, excerptCap);
  const result = await completeMiniMax(apiKey, `${prompt.system}${NAME_RULE}`, prompt.user.replace(/ \/no_think$/, ''), timeoutMs);
  if (!result.text) {
    return { doc: null, quota: result.quota, input: result.input, output: result.output, model: result.model, ...(result.error ? { error: result.error } : {}) };
  }
  const applied = applyModelText(draft, repairJson(result.text), result.model || MINIMAX_MODEL);
  if (!applied) {
    return { doc: null, quota: result.quota, input: result.input, output: result.output, model: result.model, ...(result.error ? { error: result.error } : {}) };
  }
  return {
    doc: { ...applied, provider: 'minimax', model: result.model || applied.model },
    quota: false,
    input: result.input,
    output: result.output,
    model: result.model,
  };
}

const VERIFY_SYSTEM = '你是新聞事實核查編輯，只根據提供的來源標題和摘錄判斷，不可以用自己的知識補充。回覆必須是 JSON。';

/** Indexes from {"drop":[...]} within 0..max-1, or null when the reply is not usable. */
export function parseDrop(text: string, max: number): number[] | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { drop?: unknown };
    if (!Array.isArray(parsed.drop)) return null;
    return [...new Set(parsed.drop.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < max))];
  } catch {
    return null;
  }
}

/**
 * Second MiniMax pass (flat fee): flags sentences and key points that add facts the sources do not
 * carry, or that are commentary, speculation, or preaching, and removes them. A thinner result is
 * held by the normal publish floor instead of going out with invented background.
 */
export async function verifyMiniMax(apiKey: string, draft: ContentDoc, doc: ContentDoc, timeoutMs = MINIMAX_TIMEOUT_MS): Promise<{ doc: ContentDoc; dropped: number; ok: boolean; error?: string }> {
  const seen = new Set<string>();
  const sources: { source: string; title: string; excerpt: string }[] = [];
  for (const block of draft.blocks) {
    for (const ref of block.sources) {
      if (seen.has(ref.url)) continue;
      seen.add(ref.url);
      sources.push({ source: ref.source, title: ref.title, excerpt: (ref.excerpt || '').slice(0, MINIMAX_EXCERPT_CHARS) });
    }
  }
  const rows: { block: number; index: number; text: string }[] = [];
  doc.blocks.forEach((block, b) => {
    if (block.title === '事件時間線') return;
    block.sentences.forEach((text, index) => rows.push({ block: b, index, text }));
  });
  (doc.points ?? []).forEach((text, index) => rows.push({ block: -1, index, text }));
  if (!sources.length || rows.length < 3) return { doc, dropped: 0, ok: rows.length < 3 };
  const user = [
    `來源：${JSON.stringify(sources)}`,
    `句子：${JSON.stringify(rows.map((row, n) => ({ n, text: row.text })))}`,
    '逐句對照來源，列出以下兩類句子的編號：',
    '1. 含有來源標題和摘錄都沒有的事實、數字、人名、地點、日期、引述、機構關係或因果，或把來源說的「調查是否」寫成已確定的結論；沒有附上來源英文原名的中文人名音譯，若來源沒有這個中文寫法，也列入；',
    '2. 評論、推測、預測、輿論概括或說教，例如「反映」「揭示」「顯示…態度」「可以預期」「值得關注」「輿論普遍」「建議」。',
    '來源有寫的事實，即使措辭不同也不要列入。回傳 {"drop":[編號]}，沒有就回傳 {"drop":[]}。',
  ].join('\n');
  const result = await completeMiniMax(apiKey, VERIFY_SYSTEM, user, timeoutMs);
  const drop = result.text ? parseDrop(result.text, rows.length) : null;
  if (!drop) return { doc, dropped: 0, ok: false, ...(result.error ? { error: result.error } : {}) };
  if (!drop.length) return { doc, dropped: 0, ok: true };
  const removed = new Set(drop.map((n) => rows[n]).filter(Boolean).map((row) => `${row!.block}:${row!.index}`));
  const blocks = doc.blocks.map((block, b) => (block.title === '事件時間線'
    ? block
    : { ...block, sentences: block.sentences.filter((_text, index) => !removed.has(`${b}:${index}`)) }))
    .filter((block) => block.title === '事件時間線' || block.sentences.length > 0);
  const points = (doc.points ?? []).filter((_text, index) => !removed.has(`-1:${index}`));
  const description = blocks.find((block) => block.title !== '事件時間線')?.sentences[0];
  const removedLead = doc.description && !blocks.some((block) => block.sentences.includes(doc.description)) && rows.some((row) => row.text === doc.description);
  return {
    doc: { ...doc, blocks, points, ...(removedLead && description ? { description } : {}) },
    dropped: removed.size,
    ok: true,
  };
}


/** Commentary and talk about the writing material. Sentences carrying these are dropped outright. */
const COMMENTARY_RE = /揭示|可以預期|可預期|輿論普遍|值得關注|凸顯|摘錄|提供的資料|資料中|資料未|來源未|未有進一步說明|未有提及/;

/** `中文（English gloss）`: lowercase glosses go; a capitalised proper noun keeps its first gloss only. */
export function stripGlosses(text: string, seen: Set<string>): string {
  return text.replace(/([\u3400-\u9fff」』”])\s*[（(]\s*([A-Za-z][A-Za-z0-9 .,'’&-]*?)\s*[）)]/g, (_whole, ch: string, inner: string) => {
    const key = inner.toLowerCase();
    if (/^[A-Z]/.test(inner) && !seen.has(key)) {
      seen.add(key);
      return `${ch}（${inner}）`;
    }
    return ch;
  });
}

/** Deterministic tidy for MiniMax pieces: glosses, commentary and material-talk sentences. */
export function cleanMiniMax(doc: ContentDoc): ContentDoc {
  const seen = new Set<string>();
  const blocks = doc.blocks.map((block) => (block.title === '事件時間線'
    ? block
    : { ...block, sentences: block.sentences.filter((text) => !COMMENTARY_RE.test(text)).map((text) => stripGlosses(text, seen)) }))
    .filter((block) => block.title === '事件時間線' || block.sentences.length > 0);
  const points = (doc.points ?? []).filter((text) => !COMMENTARY_RE.test(text)).map((text) => stripGlosses(text, new Set()));
  return {
    ...doc,
    title: stripGlosses(doc.title, new Set()),
    description: stripGlosses(doc.description, new Set()),
    blocks,
    points,
  };
}

/** Names from English sources: no invented Chinese transliterations. */
export const NAME_RULE = '來源是英文而沒有中文寫法的人名，直接用來源的英文原名（例如 Lee Gi-hyuk），不要自行音譯成中文；國家元首和常見機構可用香港通用譯名。';

const REWRITE_RULES = [
  '只可以使用「來源原文」中明確寫出的事實擴寫：更多經過細節、註明說話者的直接引述（每次不超過 30 字）、數字、日期和先後次序。',
  '已核實稿件的事實可以保留；不可以加入來源原文沒有的背景知識、人名、地點、數字、機構關係、因果或比較。來源說「調查是否」「據報」就照樣寫，不要寫成已確定的結論。',
  '不要寫評論、推測、預測、輿論概括或說教，不要用以下字詞：反映、揭示、可以預期、預料、輿論普遍、建議、值得關注、凸顯、意味著。',
  '不要提及「材料」「摘錄」「資料」「來源原文」或寫作過程；某方面沒有內容就整節不寫，不要寫「未有說明」。',
  '外文詞不要加括號附註，英文機構和公司名稱照用原文；專有名詞最多在第一次出現時附原文一次。',
  '相關的分句用「，」連接成完整句子，每句 25 至 45 字，不要寫成一連串短句。',
  NAME_RULE,
].join('');

function rewriteShape(draft: ContentDoc): string {
  if (draft.kind === 'briefing') {
    const scope = briefingScopeOf(draft.key);
    const headings = briefingHeadings(scope);
    const union = headings.map((heading) => `"${heading}"`).join('|');
    const length = scope === 'world'
      ? '國際段寫 400 至 650 字，涵蓋兩至三件事；'
      : '科技和財經兩段各寫 220 至 350 字，每段涵蓋兩件事；只有一類有來源就只寫那一段；';
    return `回傳 {"title":"中文導讀標題","description":"40字以內的摘要","sections":[{"heading":${union},"text":"..."}],"points":["重點","重點","重點"]}。每個 heading 只出現一次；${length}今日值得留意寫 60 至 120 字，只列來源寫明的下一步、日期或待決事項，沒有就不要輸出這一節。points 三項，每項 30 字以內，數字必須在來源出現過。`;
  }
  return '回傳 {"title":"中文標題","description":"40字以內的摘要","points":["重點","重點","重點"],"sections":[{"heading":"事件經過"|"各方回應"|"後續關注","text":"..."}]}。每個 heading 只出現一次。「事件經過」分兩至三段（段與段之間用換行），寫 350 至 550 字，按時間交代經過、數字和來源提到的較早發展；「各方回應」只寫來源點名的人或機構說了甚麼，120 至 220 字，沒有引述就不要輸出；「後續關注」只寫來源提到的下一步、日期或未決事項，沒有就不要輸出。points 剛好三行，每行 20 至 35 字。';
}

/**
 * Facts-only write from the source text. With `verified`, it is a second draft that keeps the
 * checked sentences and expands them from the sources alone.
 */
export async function rewriteMiniMax(apiKey: string, draft: ContentDoc, verified: ContentDoc | null, timeoutMs = MINIMAX_TIMEOUT_MS): Promise<{ doc: ContentDoc | null; error?: string }> {
  const seen = new Set<string>();
  const sources: { n: number; source: string; title: string; text: string }[] = [];
  for (const block of draft.blocks) {
    for (const ref of block.sources) {
      if (seen.has(ref.url) || !(ref.excerpt || '').trim()) continue;
      seen.add(ref.url);
      sources.push({ n: sources.length + 1, source: ref.source, title: ref.title, text: (ref.excerpt || '').slice(0, MINIMAX_EXCERPT_CHARS) });
    }
  }
  if (!sources.length) return { doc: null };
  const story = verified ? {
    title: verified.title,
    points: verified.points ?? [],
    sections: verified.blocks.filter((block) => block.title !== '事件時間線').map((block) => ({ heading: block.title, text: block.sentences.join('') })),
  } : null;
  const base = promptFor(draft, false, 'material').system;
  const lead = story
    ? '你現在做第二稿：把已核實的稿件擴寫得更詳細。'
    : `根據來源原文撰寫${draft.kind === 'briefing' ? '導讀' : `新聞懶人包，主事件是「${draft.title}」，與主事件無關的來源不要寫`}。`;
  const user = `${lead}${REWRITE_RULES}\n${rewriteShape(draft)}\n${story ? `已核實稿件：${JSON.stringify(story)}\n` : ''}來源原文：${JSON.stringify(sources)}`;
  const result = await completeMiniMax(apiKey, base, user, timeoutMs);
  if (!result.text) return { doc: null, ...(result.error ? { error: result.error } : {}) };
  const applied = applyModelText(draft, repairJson(result.text), result.model || MINIMAX_MODEL);
  if (!applied) return { doc: null, error: 'rewrite-unparsed' };
  return { doc: { ...applied, provider: 'minimax', model: result.model || applied.model } };
}

function better(next: ContentDoc, current: ContentDoc): boolean {
  const readyNext = pieceReady(next);
  const readyCurrent = pieceReady(current);
  if (readyNext !== readyCurrent) return readyNext;
  return bodyChars(next) > bodyChars(current);
}

/**
 * MiniMax desk pipeline: draft → fact-check → facts-only rewrite → fact-check. The rewrite is used
 * only when its own fact-check ran and it beats the checked draft. Never falls back to Grok.
 */
export async function pipelineMiniMax(apiKey: string, draft: ContentDoc, deadline: number): Promise<{ doc: ContentDoc | null; errors: string[]; steps: string[]; pending?: boolean }> {
  const errors: string[] = [];
  const steps: string[] = [];
  const left = () => deadline - Date.now();
  const timeout = (reserve: number) => Math.max(8_000, Math.min(MINIMAX_TIMEOUT_MS, left() - reserve));
  // One MiniMax call runs about 25 s (reasoning cannot be turned off), so the first draft is
  // already the facts-only write from the source text; the second draft runs when time allows.
  let first = await rewriteMiniMax(apiKey, draft, null, timeout(30_000));
  if (first.error) errors.push(first.error);
  if (!first.doc && left() > 60_000) {
    steps.push('draft-retry');
    first = await rewriteMiniMax(apiKey, draft, null, timeout(30_000));
    if (first.error) errors.push(first.error);
  }
  if (!first.doc) return { doc: null, errors, steps: [...steps, 'draft-failed'] };
  steps.push(`draft:${bodyChars(first.doc)}`);
  // Nothing goes out without a completed fact-check: an unchecked draft is saved hidden ('drafted')
  // and checked on the next call.
  if (left() < 12_000) return { doc: { ...cleanMiniMax(first.doc), stage: 'drafted' }, errors, steps: [...steps, 'no-time-check'], pending: true };
  const checked = await verifyMiniMax(apiKey, draft, cleanMiniMax(first.doc), timeout(5_000));
  if (checked.error) errors.push(checked.error);
  if (!checked.ok) return { doc: { ...cleanMiniMax(first.doc), stage: 'drafted' }, errors, steps: [...steps, 'check-failed'], pending: true };
  let doc = cleanMiniMax(checked.doc);
  steps.push(`check:-${checked.dropped}:${bodyChars(doc)}`);
  // Out of time for the second draft in this request: it runs on the next call (stage 'checked').
  if (left() < 35_000) return { doc: { ...doc, stage: 'checked' }, errors, steps: [...steps, 'no-time-rewrite'], pending: true };
  const second = await rewriteMiniMax(apiKey, draft, doc, timeout(15_000));
  if (second.error) errors.push(second.error);
  if (!second.doc) return { doc, errors, steps: [...steps, 'rewrite-failed'] };
  steps.push(`rewrite:${bodyChars(second.doc)}`);
  if (left() < 10_000) return { doc, errors, steps: [...steps, 'no-time-recheck'] };
  const rechecked = await verifyMiniMax(apiKey, draft, cleanMiniMax(second.doc), timeout(2_000));
  if (rechecked.error) errors.push(rechecked.error);
  if (!rechecked.ok) return { doc, errors, steps: [...steps, 'recheck-failed'] };
  const final = cleanMiniMax(rechecked.doc);
  steps.push(`recheck:-${rechecked.dropped}:${bodyChars(final)}`);
  if (better(final, doc)) doc = final;
  return { doc, errors, steps };
}

/** Second half of the pipeline for a stored, once-checked piece: facts-only rewrite, then fact-check. */
export async function expandMiniMax(apiKey: string, stored: ContentDoc, deadline: number): Promise<{ doc: ContentDoc; errors: string[]; steps: string[] }> {
  const errors: string[] = [];
  const steps: string[] = [];
  const left = () => deadline - Date.now();
  const timeout = (reserve: number) => Math.max(8_000, Math.min(MINIMAX_TIMEOUT_MS, left() - reserve));
  let doc: ContentDoc = { ...stored };
  delete doc.stage;
  if (stored.stage === 'drafted') {
    const checked = await verifyMiniMax(apiKey, doc, doc, timeout(5_000));
    if (checked.error) errors.push(checked.error);
    if (!checked.ok) return { doc: stored, errors, steps: ['check-failed'] };
    doc = cleanMiniMax(checked.doc);
    steps.push(`check:-${checked.dropped}:${bodyChars(doc)}`);
    if (left() < 35_000) return { doc: { ...doc, stage: 'checked' }, errors, steps: [...steps, 'no-time-rewrite'] };
  }
  const second = await rewriteMiniMax(apiKey, doc, doc, timeout(15_000));
  if (second.error) errors.push(second.error);
  if (!second.doc) return { doc, errors, steps: ['rewrite-failed'] };
  steps.push(`rewrite:${bodyChars(second.doc)}`);
  if (left() < 10_000) return { doc, errors, steps: [...steps, 'no-time-recheck'] };
  const rechecked = await verifyMiniMax(apiKey, doc, cleanMiniMax(second.doc), timeout(2_000));
  if (rechecked.error) errors.push(rechecked.error);
  if (!rechecked.ok) return { doc, errors, steps: [...steps, 'recheck-failed'] };
  const final = cleanMiniMax(rechecked.doc);
  steps.push(`recheck:-${rechecked.dropped}:${bodyChars(final)}`);
  if (better(final, doc)) doc = final;
  return { doc, errors, steps };
}
