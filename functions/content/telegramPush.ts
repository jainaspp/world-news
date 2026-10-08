import type { ContentDoc } from '../../shared/content.js';
import {
  briefingReadyToPush,
  formatTelegramPost,
  pushRecordKey,
  sendMessageUrl,
  telegramTarget,
} from '../../shared/telegramPost.js';
import { putLimited, readValue, type ContentEnv } from './store.js';

const KEEP_S = 3 * 24 * 3600;

/** Same-isolate guard so two overlapping calls do not both pass the KV read. Cleared when the call ends. */
const sending = new Set<string>();

function origin(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

/**
 * After a finished Hong Kong morning or evening briefing. Missing env skips silently.
 * Telegram is called only for the public AI edition. The KV record is written after HTTP
 * success, so a thin draft or a failed send (non-OK, timeout, 429) does not block the retry.
 * A 429 is logged and not retried in the same request.
 */
export async function maybePushBriefing(env: ContentEnv, doc: ContentDoc): Promise<'sent' | 'skipped' | 'duplicate' | 'failed'> {
  if (!briefingReadyToPush(doc)) return 'skipped';
  const target = telegramTarget(env);
  if (!target) return 'skipped';
  const key = pushRecordKey(doc.key);
  if (sending.has(key)) return 'duplicate';
  sending.add(key);
  try {
    const existing = await readValue(env, key);
    if (existing) return 'duplicate';
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
    const stored = await putLimited(env, key, JSON.stringify({ edition: doc.key, sentAt: new Date().toISOString() }), KEEP_S);
    if (stored !== 'ok') console.error(`telegram push sent; record not stored (${stored})`);
    return 'sent';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`telegram push skipped: ${message}`);
    return 'failed';
  } finally {
    sending.delete(key);
  }
}
