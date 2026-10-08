import { briefingPublic, briefingScopeOf, type ContentDoc } from './content.js';
import { pieceReady } from './grok.js';

export interface TelegramTarget {
  token: string;
  chatId: string;
}

export function telegramTarget(env: { TELEGRAM_BOT_TOKEN?: unknown; TELEGRAM_CHAT_ID?: unknown }): TelegramTarget | null {
  const token = typeof env.TELEGRAM_BOT_TOKEN === 'string' ? env.TELEGRAM_BOT_TOKEN.trim() : '';
  const chatId = typeof env.TELEGRAM_CHAT_ID === 'string' ? env.TELEGRAM_CHAT_ID.trim() : '';
  if (!token || !chatId || /\s/.test(token) || /\s/.test(chatId)) return null;
  if (token.length < 20 || token.length > 200 || !/^\d+:/.test(token)) return null;
  if (chatId.length < 2 || chatId.length > 64) return null;
  return { token, chatId };
}

export function channelUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return '';
    if (!['t.me', 'telegram.me', 'telegram.dog'].includes(url.hostname)) return '';
    if (url.pathname.length < 2) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function pushRecordKey(edition: string): string {
  return `push:telegram:${edition}`;
}

export function summaryLines(doc: Pick<ContentDoc, 'points' | 'description' | 'blocks'>): string[] {
  const points = (doc.points ?? []).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (points.length >= 1) return points.slice(0, 3);
  const fromDescription = doc.description.split(/[。！？]/).map((line) => line.trim()).filter((line) => line.length > 1);
  if (fromDescription.length) return fromDescription.slice(0, 3).map((line) => (line.endsWith('。') ? line : `${line}。`));
  const sentences = doc.blocks.flatMap((block) => block.sentences).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return sentences.slice(0, 3);
}

/** Hong Kong morning and evening editions only, so the day stays at two pushes. */
export function briefingPushable(doc: ContentDoc): boolean {
  if (doc.kind !== 'briefing') return false;
  if (briefingScopeOf(doc.key) !== 'hk') return false;
  if (!doc.title.trim() || doc.title.includes('未有')) return false;
  return summaryLines(doc).length > 0;
}

/**
 * The edition readers should see: an AI Hong Kong morning or evening briefing that is
 * ready (`pieceReady`) and public (`briefingPublic`) the same way the site lists it.
 * A sources list or a thin draft stays off the channel so a later finished write can post.
 */
export function briefingReadyToPush(doc: ContentDoc): boolean {
  if (doc.mode !== 'ai' || !briefingPushable(doc)) return false;
  return pieceReady(doc) && briefingPublic(doc);
}

/** Each summary line is a sentence: full-width stop at the end, no stray spaces. */
export function sentenceLine(line: string): string {
  const text = line.replace(/\s+/g, ' ').trim().replace(/[，、；：,;:]+$/, '');
  if (!text) return '';
  return /[。！？」』）]$/.test(text) ? text : `${text}。`;
}

export function formatTelegramPost(doc: ContentDoc, origin = 'https://world-news.xyz'): string {
  const lines = summaryLines(doc).slice(0, 3).map(sentenceLine).filter(Boolean);
  const link = `${origin.replace(/\/$/, '')}/briefing/${encodeURIComponent(doc.key)}/`;
  return [`《${doc.title.trim()}》`, '', ...lines, '', link].join('\n');
}

export function sendMessageUrl(token: string): string {
  return `https://api.telegram.org/bot${token}/sendMessage`;
}
