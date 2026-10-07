import { GROK_MODEL, XAI_URL, usageTokens } from '../../shared/grok.js';
import { promptFor, textFromAi, type ContentDoc } from '../../shared/content.js';
import { citationUrls, researchBody, stripInlineCitations, webSearchCalls } from '../../shared/search.js';

export interface GrokCompletion {
  text: string;
  input: number;
  output: number;
  /** HTTP status from xAI; 0 when the call timed out or the network failed. */
  status: number;
  /** Short error name and message when the call never got an HTTP answer. Never contains the key. */
  error?: string;
  /** Successful web_search calls reported on this response. */
  searchCalls: number;
  /** Citation URLs from this response, before the reputable-source filter. */
  citations: string[];
}

function describe(error: unknown, apiKey: string): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (apiKey ? text.split(apiKey).join('[key]') : text).replace(/Bearer\s+\S+/g, 'Bearer [key]').slice(0, 160);
}

/** grok-4.3 reasons before it writes; a full briefing takes 15–20 s, so 12 s always timed out. */
export const XAI_TIMEOUT_MS = 45_000;

const RESPONSES_URL = 'https://api.x.ai/v1/responses';

function completion(payload: unknown, status: number, search = false): GrokCompletion {
  const tokens = usageTokens(payload);
  const text = search ? stripInlineCitations(textFromAi(payload)) : textFromAi(payload);
  return {
    text,
    input: tokens.input,
    output: tokens.output,
    status,
    searchCalls: search ? webSearchCalls(payload) : 0,
    citations: search ? citationUrls(payload) : [],
  };
}

/**
 * One xAI chat completion. A 429 or 5xx is retried once. The bearer token is never logged.
 * Token counts come from the response usage field; a failed parse still returns them.
 */
export async function completeGrok(
  apiKey: string,
  doc: ContentDoc,
  strict = false,
  timeoutMs = XAI_TIMEOUT_MS,
  options?: { search?: boolean },
): Promise<GrokCompletion> {
  const prompt = promptFor(doc, strict, Boolean(options?.search));
  if (options?.search) return completeResearch(apiKey, prompt.system, prompt.user, prompt.maxTokens, timeoutMs);
  return completeText(apiKey, prompt.system, prompt.user, prompt.maxTokens, timeoutMs);
}

/** One xAI chat completion from an explicit prompt. Same retry and usage rules as completeGrok. */
export async function completeText(apiKey: string, system: string, user: string, maxTokens = 1200, timeoutMs = XAI_TIMEOUT_MS): Promise<GrokCompletion> {
  const body = JSON.stringify({
    model: GROK_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user.replace(/ \/no_think$/, '') },
    ],
    max_tokens: maxTokens,
    temperature: 0.4,
  });
  return postChat(apiKey, XAI_URL, body, timeoutMs, false);
}

/**
 * Responses API with server-side web_search. grok-4.3 stays the model.
 * A 400 that rejects max_turns is retried once without that field.
 */
export async function completeResearch(apiKey: string, system: string, user: string, maxTokens = 2000, timeoutMs = XAI_TIMEOUT_MS): Promise<GrokCompletion> {
  const first = researchBody(GROK_MODEL, system, user, maxTokens);
  const opened = await postChat(apiKey, RESPONSES_URL, JSON.stringify(first), timeoutMs, true);
  if (opened.status !== 400) return opened;
  const retry = { ...first };
  delete retry.max_turns;
  return postChat(apiKey, RESPONSES_URL, JSON.stringify(retry), timeoutMs, true);
}

async function postChat(apiKey: string, url: string, body: string, timeoutMs: number, search: boolean): Promise<GrokCompletion> {
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => null);
      const status = response.status;
      const result = completion(payload, status, search);
      if (response.ok) return result;
      if (status === 400 || status === 401 || status === 403) return result;
      if (attempt === 0 && (status === 429 || status >= 500)) continue;
      return result;
    } catch (error) {
      lastError = describe(error, apiKey);
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (attempt === 0 && !timedOut) continue;
      break;
    }
  }
  return { text: '', input: 0, output: 0, status: 0, error: lastError, searchCalls: 0, citations: [] };
}
