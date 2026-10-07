import { GROK_MODEL, XAI_URL, usageTokens } from '../../shared/grok.js';
import { promptFor, textFromAi, type ContentDoc } from '../../shared/content.js';

export interface GrokCompletion {
  text: string;
  input: number;
  output: number;
}

/**
 * One xAI chat completion. A 429 or 5xx is retried once. The bearer token is never logged.
 * Token counts come from the response usage field; a failed parse still returns them.
 */
export async function completeGrok(apiKey: string, doc: ContentDoc, strict = false): Promise<GrokCompletion | null> {
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
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(XAI_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(12_000),
      });
      const payload = await response.json().catch(() => null);
      const tokens = usageTokens(payload);
      const text = textFromAi(payload);
      if (response.ok) return { text, input: tokens.input, output: tokens.output };
      if (response.status === 401 || response.status === 403) return { text: '', input: tokens.input, output: tokens.output };
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
      return { text: '', input: tokens.input, output: tokens.output };
    } catch {
      if (attempt === 0) continue;
    }
  }
  return null;
}
