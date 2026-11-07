import { esc, safeHttp } from '../../contentPage.js';
import { renderMildMarkdown } from '../markdown.js';
import { chronicleSeed as seed } from './seed.js';
import type { ChronicleDb, ChronicleD1, ChronicleEntry, ChronicleFigure, ChronicleThread } from './types.js';

const ARTICLE_CLASS: Record<string, string> = {
  cosmos: 'civ-article cosmos-page',
  galaxy: 'civ-article galaxy-page',
  earth: 'civ-article earth-page',
  origins: 'civ-article origins-page',
  chronicle: 'civ-article chronicle-page',
  tech: 'civ-article tech-page',
  city: 'civ-article city-page',
  future: 'civ-article future-page',
};

export function chronicleSeed(): ChronicleDb {
  return seed;
}

export function threadById(id: string): ChronicleThread | undefined {
  return seed.threads.find((thread) => thread.id === id);
}

export function threadsInOrder(): ChronicleThread[] {
  return [...seed.threads].sort((a, b) => a.sort_key - b.sort_key);
}

export function entriesFor(threadId: string): ChronicleEntry[] {
  return seed.entries.filter((entry) => entry.thread_id === threadId).sort((a, b) => a.sort_key - b.sort_key);
}

export function entryBySlug(threadId: string, slug: string): ChronicleEntry | undefined {
  return entriesFor(threadId).find((entry) => entry.slug === slug);
}

export function metaValue(key: string): string {
  return seed.meta.find((row) => row.key === key)?.value ?? '';
}

/** D1 when a binding is passed; otherwise the checked-in seed. */
export async function readThreads(db?: ChronicleD1): Promise<ChronicleThread[]> {
  if (!db) return threadsInOrder();
  const result = await db.prepare('SELECT id, slug, title, lede, sort_key, path, ai_note FROM threads ORDER BY sort_key').bind().all<ChronicleThread>();
  return result.results;
}

function ledeHtml(lede: string): string {
  return renderMildMarkdown(lede);
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function figureHtml(fig: ChronicleFigure): string {
  const href = safeHttp(fig.source_url);
  const link = href ? `<a href="${esc(href)}">${esc(fig.source_url)}</a>` : esc(fig.source_url);
  if (fig.kind === 'ai_illustration') {
    return `<figure class="ai-plate" data-kind="ai_illustration" data-figure="${esc(fig.id)}">
      <img src="${esc(fig.src)}" width="${fig.width}" height="${fig.height}" alt="${esc(fig.alt_zh)}" loading="lazy" decoding="async" />
      <figcaption><strong>示意</strong> ${esc(fig.caption_zh)} 此圖為生成圖像，不是觀測或文物照片。</figcaption>
    </figure>`;
  }
  return `<figure class="real-photo" id="fig-${esc(fig.id)}" data-kind="real_photo" data-figure="${esc(fig.id)}">
    <img src="${esc(fig.src)}" width="${fig.width}" height="${fig.height}" alt="${esc(fig.alt_zh)}" loading="lazy" decoding="async" />
    <figcaption>
      <span class="real-photo-kicker">真實照片</span>
      <span class="real-photo-caption">圖說：${esc(fig.caption_zh)}</span>
      <span class="real-photo-credit">來源：${esc(fig.credit)}。授權：${esc(fig.license)}。原始頁：${link}。檢索日：${esc(fig.retrieved)}。</span>
    </figcaption>
  </figure>`;
}

/** Volume-top list so the photographs are not only buried in the essay. */
export function realPhotoIndex(volume: string): string {
  const figs = (seed.figures ?? []).filter((fig) => fig.embed && fig.kind === 'real_photo' && fig.volume === volume);
  if (!figs.length) return '';
  const items = figs.map((fig) => {
    const label = (fig.caption_zh.split('。')[0] ?? fig.title).slice(0, 42);
    return `<a href="#fig-${esc(fig.id)}">${esc(label)}</a>`;
  }).join('、');
  return `<nav class="real-photo-index" aria-label="本卷真實照片"><p>本卷真實照片　${items}</p></nav>`;
}

/** Place real photos and labeled schematics for one entry. Real photos never use the schematic class. */
export function placeFigures(html: string, volume: string, entry: string): string {
  const figs = (seed.figures ?? []).filter((fig) => fig.embed && fig.volume === volume && fig.near_entry === entry);
  const ordered = [...figs.filter((fig) => fig.kind === 'real_photo'), ...figs.filter((fig) => fig.kind === 'ai_illustration')];
  let out = html;
  const pending: ChronicleFigure[] = [];
  for (const fig of ordered) {
    if (!fig.after_heading) {
      pending.push(fig);
      continue;
    }
    const re = new RegExp(`(<h[1-3][^>]*>[^<]*${escapeReg(fig.after_heading)}[^<]*</h[1-3]>)`);
    if (!re.test(out)) {
      pending.push(fig);
      continue;
    }
    out = out.replace(re, `$1\n${figureHtml(fig)}`);
  }
  return pending.length ? `${out}\n${pending.map(figureHtml).join('\n')}` : out;
}

function entryHtml(entry: ChronicleEntry): string {
  const also = entry.also_id ? `<a id="${esc(entry.also_id)}"></a>` : '';
  const body = placeFigures(renderMildMarkdown(entry.body), entry.thread_id, entry.slug);
  return `<section class="civ-reading-section">
    <h2 id="${esc(entry.slug)}">${esc(entry.title)}</h2>
    ${also}
    <p class="era">${esc(entry.time_label)}</p>
    ${body}
  </section>`;
}

function sourceTable(threadId: string): string {
  const seen = new Set<string>();
  const rows = seed.sources.filter((row) => {
    if (row.thread_id !== threadId || seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
  if (!rows.length) return '';
  const body = rows.map((row) => {
    const href = safeHttp(row.url);
    const link = href ? `<a href="${esc(href)}">${esc(row.url)}</a>` : esc(row.url);
    const note = row.note ? esc(row.note) : '';
    return `<tr><td>${esc(row.name)}</td><td>${note}</td><td>${link}</td></tr>`;
  }).join('');
  return `<section id="sources"><h2>來源</h2><table class="civ-table"><thead><tr><th>出處</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table></section>`;
}

export function renderThreadArticle(threadId: string): string {
  const thread = threadById(threadId);
  if (!thread) return '';
  const sections = entriesFor(threadId).map(entryHtml).join('\n');
  return `<article class="${ARTICLE_CLASS[threadId] ?? 'civ-article'}">
    <h1 class="column-title civ-page-title">${esc(thread.title)}</h1>
    ${ledeHtml(thread.lede)}
    ${realPhotoIndex(threadId)}
    ${sections}
    ${sourceTable(threadId)}
    <p class="civ-ai"><span class="badge">AI 整合</span> ${esc(thread.ai_note)}</p>
  </article>`;
}

/** Future essay for the hub. The outer id is the existing /civilization/#future anchor. */
export function renderFutureReading(): string {
  const thread = threadById('future');
  if (!thread) return '';
  const sections = entriesFor('future').filter((entry) => entry.slug !== 'future').map(entryHtml).join('\n');
  const opening = entriesFor('future').find((entry) => entry.slug === 'future');
  return `<section class="civ-reading" id="future" aria-label="展望">
    <h2>${esc(thread.title)}</h2>
    ${ledeHtml(thread.lede)}
    ${realPhotoIndex('future')}
    ${opening ? renderMildMarkdown(opening.body) : ''}
    ${sections}
    ${sourceTable('future')}
    <p class="civ-ai"><span class="badge">AI 整合</span> ${esc(thread.ai_note)}</p>
  </section>`;
}

export function renderReadingIndex(): string {
  const items = threadsInOrder().map((thread) => `<li><a href="${esc(thread.path)}">${esc(thread.title)}</a></li>`).join('');
  return `<section class="civ-reading-index" aria-label="文明長文">
    <h2>文明長文</h2>
    <p>各卷是連續文本。階段軸與卷次跳轉暫不使用。<a href="/civilization/chronicle/">打開完整編年</a>：<a href="/civilization/chronicle/#ch-ancient">古</a>、<a href="/civilization/chronicle/#ch-now">今</a>、<a href="/civilization/chronicle/#ch-future">未來</a>。</p>
    <ul>${items}</ul>
  </section>`;
}

export function originsSeedBody(): string {
  return entryBySlug('origins', 'body')?.body ?? '';
}

export function originsSeedSources(): string {
  return entryBySlug('origins', 'sources')?.body ?? '';
}
