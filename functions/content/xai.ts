import { GROK_MODEL, XAI_URL, usageTokens } from '../../shared/grok.js';
import { promptFor, textFromAi, type ContentDoc } from '../../shared/content.js';

export interface GrokCompletion {
  text: string;
  input: number;
  output: number;
  /** HTTP status from xAI; 0 when the call timed out or the network failed. */
  status: number;
  /** Short error name and message when the call never got an HTTP answer. Never contains the key. */
  error?: string;
}

function describe(error: unknown, apiKey: string): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (apiKey ? text.split(apiKey).join('[key]') : text).replace(/Bearer\s+\S+/g, 'Bearer [key]').slice(0, 160);
}

/** grok-4.3 reasons before it writes; a full briefing takes 15–20 s, so 12 s always timed out. */
export const XAI_TIMEOUT_MS = 45_000;

/**
 * One xAI chat completion. A 429 or 5xx is retried once. The bearer token is never logged.
 * Token counts come from the response usage field; a failed parse still returns them.
 */
export async function completeGrok(apiKey: string, doc: ContentDoc, strict = false, timeoutMs = XAI_TIMEOUT_MS): Promise<GrokCompletion> {
  const prompt = promptFor(doc, strict);
  const body = JSON.stringify({
    model: GROK_MODEL,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user.replace(/ \/no_think$/, '') },
    ],
    max_tokens: prompt.maxTokens,
    temperature: 0.4,
  });
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(XAI_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => null);
      const tokens = usageTokens(payload);
      const text = textFromAi(payload);
      const status = response.status;
      if (response.ok) return { text, input: tokens.input, output: tokens.output, status };
      if (status === 401 || status === 403) return { text: '', input: tokens.input, output: tokens.output, status };
      if (attempt === 0 && (status === 429 || status >= 500)) continue;
      return { text: '', input: tokens.input, output: tokens.output, status };
    } catch (error) {
      lastError = describe(error, apiKey);
      // A timeout already spent the budget; only a fast network failure is worth a second try.
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (attempt === 0 && !timedOut) continue;
      break;
    }
  }
  return { text: '', input: 0, output: 0, status: 0, error: lastError };
}
