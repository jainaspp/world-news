import { esc } from './contentPage.js';
import type { IndexEntry } from './content.js';
import type { NewsItem } from './types.js';

export interface MustReadLink {
  href: string;
  title: string;
  description: string;
  category?: string;
}

const GRAPHIC = /直播處決|直播行刑|斬首|公開處決|firing squad|livestream execution|beheading|execution by/i;

/** Extreme-violence headlines stay off the hero and the first ad gap. */
export function demoteGraphic(items: NewsItem[]): NewsItem[] {
  const safe: NewsItem[] = [];
  const later: NewsItem[] = [];
  for (const item of items) {
    if (GRAPHIC.test(item.title) && safe.length < 8) later.push(item);
    else safe.push(item);
  }
  if (!later.length) return items;
  return [...safe.slice(0, 8), ...later, ...safe.slice(8)];
}

export function mustReadLink(row: IndexEntry): MustReadLink {
  return {
    href: `/explainer/${encodeURIComponent(row.key)}/`,
    title: row.title,
    description: (row.description || '').slice(0, 140),
    ...(row.category ? { category: row.category } : {}),
  };
}

/** Category pages prefer a matching pack, and still show the homepage set when none match. */
export function mustReadForSurface(links: MustReadLink[], category?: string): MustReadLink[] {
  const rows = links.slice(0, 5);
  if (!category || category === 'all') return rows;
  const matched = rows.filter((link) => link.category === category);
  return matched.length ? matched : rows;
}

/** Server HTML for the homepage review block. Titles and deks only. */
export function renderMustRead(links: MustReadLink[]): string {
  const rows = links.slice(0, 5);
  if (!rows.length) return '';
  const cards = rows.map((link) => `<article class="story">
      <div class="story-body">
        <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">新聞懶人包</span></div>
        <h2 class="story-title"><a href="${esc(link.href)}">${esc(link.title)}</a></h2>
        ${link.description ? `<p class="dek">${esc(link.description)}</p>` : ''}
      </div>
    </article>`).join('');
  return `<section class="must-read" aria-label="今日必讀"><h2 class="section-title">今日必讀</h2><div class="news-grid">${cards}</div></section>`;
}

export function mustReadBootstrap(links: MustReadLink[]): string {
  return `<script id="wn-must-read" type="application/json">${JSON.stringify(links.slice(0, 5)).replace(/</g, '\\u003c')}</script>`;
}
