import type { ContentDoc } from '../../shared/content.js';
import {
  briefingPushable,
  formatTelegramPost,
  pushRecordKey,
  sendMessageUrl,
  telegramTarget,
} from '../../shared/telegramPost.js';
import { putLimited, readValue, type ContentEnv } from './store.js';

const KEEP_S = 3 * 24 * 3600;

function origin(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

/**
 * After the Hong Kong morning or evening briefing. Missing env skips silently.
 * One KV put records the edition before the send, so a retry does not post twice.
 * A 429 is logged and not retried.
 */
export async function maybePushBriefing(env: ContentEnv, doc: ContentDoc): Promise<'sent' | 'skipped' | 'duplicate' | 'failed'> {
  try {
    if (!briefingPushable(doc)) return 'skipped';
    const target = telegramTarget(env);
    if (!target) return 'skipped';
    const key = pushRecordKey(doc.key);
    const existing = await readValue(env, key);
    if (existing) return 'duplicate';
    const stored = await putLimited(env, key, JSON.stringify({ edition: doc.key, sentAt: new Date().toISOString() }), KEEP_S);
    if (stored !== 'ok') {
      console.error(`telegram push skipped; record not stored (${stored})`);
      return 'failed';
    }
    const response = await fetch(sendMessageUrl(target.token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: target.chatId,
        text: formatTelegramPost(doc, origin(env)),
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`telegram push failed: HTTP ${response.status}`);
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`telegram push skipped: ${message}`);
    return 'failed';
  }
}
