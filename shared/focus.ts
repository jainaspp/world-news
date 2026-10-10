import { CATEGORIES, CATEGORY_IDS } from './categories.js';
import { hktParts } from './content.js';
import { REGIONS, blockedHkChinaStory, removedFromTaiwanPage } from './feeds.js';
import { hanCount } from './grok.js';
import { cantoneseLeft, polishProse } from './prose.js';
import type { NewsItem } from './types.js';

/** Pages written per generate call. Nineteen region and category pages finish in one evening. */
export const FOCUS_BATCH = 3;

export const FOCUS_MIN_CHARS = 250;
export const FOCUS_MAX_CHARS = 400;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface FocusPage {
  scope: 'region' | 'category';
  id: string;
  label: string;
}

export interface FocusIntro {
  text: string;
  model: string;
  at: number;
  provider?: 'grok' | 'minimax' | 'workers-ai';
}

export function focusPages(): FocusPage[] {
  const regions = REGIONS
    .filter((region) => region.code !== 'ALL')
    .map((region) => ({ scope: 'region' as const, id: region.code.toLowerCase(), label: region.label }));
  const categories = CATEGORY_IDS.map((id) => ({
    scope: 'category' as const,
    id,
    label: CATEGORIES.find((category) => category.id === id)?.label ?? id,
  }));
  return [...regions, ...categories];
}

export function focusKey(page: Pick<FocusPage, 'scope' | 'id'>, now = new Date()): string {
  return `focus:${page.scope}:${page.id}:${hktParts(now).date}`;
}

export function parseFocus(raw: string | null): FocusIntro | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FocusIntro>;
    if (!parsed || typeof parsed.text !== 'string' || !parsed.text.trim()) return null;
    const provider = parsed.provider === 'grok' || parsed.provider === 'minimax' || parsed.provider === 'workers-ai' ? parsed.provider : undefined;
    return {
      text: parsed.text.trim(),
      model: typeof parsed.model === 'string' ? parsed.model : '',
      at: Number.isFinite(parsed.at) ? Number(parsed.at) : 0,
      ...(provider ? { provider } : {}),
    };
  } catch {
    return null;
  }
}

/** A stored intro counts for today when Grok or MiniMax wrote it, or when the cap forced Workers AI. */
export function focusSatisfied(raw: string | null, capped: boolean): boolean {
  const saved = parseFocus(raw);
  if (!saved) return false;
  const chars = hanCount(saved.text);
  if (chars < FOCUS_MIN_CHARS || chars > FOCUS_MAX_CHARS) return false;
  if (saved.provider === 'workers-ai') return capped;
  if (saved.provider === 'grok' || saved.provider === 'minimax') return true;
  if (saved.model.includes('grok') || saved.model.toLowerCase().includes('minimax')) return true;
  return capped && saved.model.length > 0;
}

export function itemsForFocus(items: NewsItem[], page: FocusPage, now = new Date()): NewsItem[] {
  const cutoff = now.getTime() - WEEK_MS;
  const code = page.id.toUpperCase();
  return items
    .filter((item) => {
      const time = Date.parse(item.pubDate);
      if (!Number.isFinite(time) || time < cutoff) return false;
      if (page.scope === 'region') {
        if (!item.regions.includes(code)) return false;
        if (code === 'TWN' && removedFromTaiwanPage(item)) return false;
        if (code === 'HKG' && blockedHkChinaStory(item)) return false;
        return true;
      }
      if ((page.id === 'hk' || page.id === 'china') && blockedHkChinaStory(item)) return false;
      return item.category === page.id;
    })
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, 12);
}

export function focusPrompt(page: FocusPage, items: NewsItem[]): { system: string; user: string } {
  const system = [
    '你是香港報紙的編輯，用繁體中文正式新聞書面語寫「本週重點」。不要用粵語口語，不要用簡體字。判斷用「是」。',
    '只回傳一段正文，不要標題，不要 JSON，不要 Markdown。使用全形標點。數字和年份用阿拉伯數字，例如 2026、307、21.44億、57.7%。',
    '只可根據提供的標題和摘錄。同一事實只寫一次，不要按媒體各寫一遍。禁止添加來源沒有的事實、數字、引言或形容。不要添加資料以外的背景事實。',
    '不要寫免責聲明，也不要寫說教或呼籲句。',
    '點名報道的媒體，寫出帶名稱和單位的關鍵數字，並說明為何值得留意。正文 280 至 360 個中文字。短於 250 或長於 400 會被捨棄。',
  ].join('');
  const data = items.slice(0, 12).map((item) => ({
    source: item.source,
    title: item.title,
    excerpt: (item.excerpt || '').slice(0, 160),
  }));
  const user = `為「${page.label}」寫一段本週重點。說明這組新聞為何重要、來源列出的關鍵數字，以及讀者可以留意的具體事項。\n資料：${JSON.stringify(data)}`;
  return { system, user };
}

/** Keeps a model reply only when it is written Chinese of the expected length. */
export function focusBody(raw: string): string | null {
  const trimmed = raw.trim();
  let text = trimmed;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { text?: unknown; body?: unknown };
      if (typeof parsed.text === 'string') text = parsed.text;
      else if (typeof parsed.body === 'string') text = parsed.body;
    } catch {
      text = trimmed;
    }
  }
  let polished = polishProse(text).trim();
  if (/標題同描述|標題和描述|短描述/.test(polished) || cantoneseLeft(polished)) return null;
  if (hanCount(polished) > FOCUS_MAX_CHARS) {
    let kept = '';
    for (const sentence of polished.split(/(?<=[。！？])/)) {
      if (hanCount(kept + sentence) > FOCUS_MAX_CHARS) break;
      kept += sentence;
    }
    polished = kept.trim();
  }
  const chars = hanCount(polished);
  if (chars < FOCUS_MIN_CHARS || chars > FOCUS_MAX_CHARS) return null;
  return polished;
}

export function renderWeekFocus(text: string): string {
  const body = text.trim();
  if (!body) return '';
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<section class="week-focus" aria-label="本週重點"><div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">本週重點</span></div><p>${safe}</p></section>`;
}
