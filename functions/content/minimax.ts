import { applyModelText, promptFor, type ContentDoc, type ResearchMode } from '../../shared/content.js';
import { toHK } from '../../shared/zh.js';

/** MiniMax China Coding Plan. Flat fee, so a call costs 0 USD. */
export const MINIMAX_URL = 'https://api.minimaxi.com/v1/text/chatcompletion_v2';
export const MINIMAX_MODEL = 'MiniMax-M2.5';
export const MINIMAX_FALLBACK_MODEL = 'MiniMax-M2';
export const MINIMAX_TIMEOUT_MS = 45_000;
export const MINIMAX_MAX_TOKENS = 5_000;
export const MINIMAX_RETRY_TOKENS = 8_000;

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
  if (first.quota || first.text || first.finish !== 'length') return stripFinish(first);
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
  if (primary.text || primary.quota || primary.status === 401 || primary.status === 403) return primary;
  const secondary = await completeModel(apiKey, MINIMAX_FALLBACK_MODEL, system, user, timeoutMs);
  if (!secondary.text && !secondary.error && primary.error) return { ...secondary, error: primary.error };
  return secondary;
}

/** Writes one piece from supplied material only. Cost stays 0. Quota is reported for the Grok fallback. */
export async function writeMiniMax(
  apiKey: string,
  draft: ContentDoc,
  research: ResearchMode = 'material',
  strict = false,
): Promise<{ doc: ContentDoc | null; quota: boolean; input: number; output: number; model: string; error?: string }> {
  const prompt = promptFor(draft, strict, research === true ? 'material' : research);
  const result = await completeMiniMax(apiKey, prompt.system, prompt.user.replace(/ \/no_think$/, ''));
  if (!result.text) {
    return { doc: null, quota: result.quota, input: result.input, output: result.output, model: result.model, ...(result.error ? { error: result.error } : {}) };
  }
  const applied = applyModelText(draft, result.text, result.model || MINIMAX_MODEL);
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
export async function verifyMiniMax(apiKey: string, draft: ContentDoc, doc: ContentDoc): Promise<{ doc: ContentDoc; dropped: number; error?: string }> {
  const seen = new Set<string>();
  const sources: { source: string; title: string; excerpt: string }[] = [];
  for (const block of draft.blocks) {
    for (const ref of block.sources) {
      if (seen.has(ref.url)) continue;
      seen.add(ref.url);
      sources.push({ source: ref.source, title: ref.title, excerpt: (ref.excerpt || '').slice(0, 1800) });
    }
  }
  const rows: { block: number; index: number; text: string }[] = [];
  doc.blocks.forEach((block, b) => {
    if (block.title === '事件時間線') return;
    block.sentences.forEach((text, index) => rows.push({ block: b, index, text }));
  });
  (doc.points ?? []).forEach((text, index) => rows.push({ block: -1, index, text }));
  if (!sources.length || rows.length < 3) return { doc, dropped: 0 };
  const user = [
    `來源：${JSON.stringify(sources)}`,
    `句子：${JSON.stringify(rows.map((row, n) => ({ n, text: row.text })))}`,
    '逐句對照來源，列出以下兩類句子的編號：',
    '1. 含有來源標題和摘錄都沒有的事實、數字、人名、地點、日期、引述、機構關係或因果，或把來源說的「調查是否」寫成已確定的結論；',
    '2. 評論、推測、預測、輿論概括或說教，例如「反映」「揭示」「顯示…態度」「可以預期」「值得關注」「輿論普遍」「建議」。',
    '來源有寫的事實，即使措辭不同也不要列入。回傳 {"drop":[編號]}，沒有就回傳 {"drop":[]}。',
  ].join('\n');
  const result = await completeMiniMax(apiKey, VERIFY_SYSTEM, user);
  const drop = result.text ? parseDrop(result.text, rows.length) : null;
  if (!drop) return { doc, dropped: 0, ...(result.error ? { error: result.error } : {}) };
  if (!drop.length) return { doc, dropped: 0 };
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
  };
}
