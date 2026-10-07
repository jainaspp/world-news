import { CATEGORIES, CATEGORY_IDS } from './categories.js';
import { hktParts } from './content.js';
import { REGIONS } from './feeds.js';
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
    return {
      text: parsed.text.trim(),
      model: typeof parsed.model === 'string' ? parsed.model : '',
      at: Number.isFinite(parsed.at) ? Number(parsed.at) : 0,
    };
  } catch {
    return null;
  }
}

/** A stored intro counts for today when Grok wrote it, or when the cap forced Workers AI. */
export function focusSatisfied(raw: string | null, capped: boolean): boolean {
  const saved = parseFocus(raw);
  if (!saved) return false;
  const chars = hanCount(saved.text);
  if (chars < FOCUS_MIN_CHARS || chars > FOCUS_MAX_CHARS) return false;
  if (saved.model.includes('grok')) return true;
  return capped && saved.model.length > 0;
}

export function itemsForFocus(items: NewsItem[], page: FocusPage, now = new Date()): NewsItem[] {
  const cutoff = now.getTime() - WEEK_MS;
  const code = page.id.toUpperCase();
  return items
    .filter((item) => {
      const time = Date.parse(item.pubDate);
      if (!Number.isFinite(time) || time < cutoff) return false;
      if (page.scope === 'region') return item.regions.includes(code);
      return item.category === page.id;
    })
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, 12);
}

export function focusPrompt(page: FocusPage, items: NewsItem[]): { system: string; user: string } {
  const system = [
    '你是香港報紙的編輯，用繁體中文書面語寫「本週重點」。不要用粵語口語，不要用簡體字。',
    '用正式新聞書面語。不要使用粵語口語（嘅、係、喺、佢、咩、同埋、咗、嘢、咁）。判斷用「是」。',
    '使用全形標點，中文之間不要用空格分隔。數字用阿拉伯數字，例如 307、21.44億、57.7%。',
    '只可根據提供的標題和摘錄。禁止添加來源沒有寫的事實、數字、引言、人名或因果。',
    '不要稱呼資料欄位，也不要談論材料的格式或來源的樣子。',
    '點名報道的媒體，寫出關鍵數字，並說明為何值得留意。正文 250 至 400 個中文字。不要用 Markdown。',
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
  const polished = polishProse(text).trim();
  const chars = hanCount(polished);
  if (chars < FOCUS_MIN_CHARS || chars > FOCUS_MAX_CHARS) return null;
  if (/標題同描述|標題和描述|短描述/.test(polished) || cantoneseLeft(polished)) return null;
  return polished;
}

export function renderWeekFocus(text: string): string {
  const body = text.trim();
  if (!body) return '';
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<section class="week-focus" aria-label="本週重點"><div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">本週重點</span></div><p>${safe}</p></section>`;
}
