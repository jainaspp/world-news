import { esc, safeHttp } from '../contentPage.js';
import type { CivDriver, CivProduct, CivSource } from './contract.js';

export type BlockItem = CivProduct;

/**
 * One expandable deep-read block. A new page adds data; this file does not grow.
 * Anchors are `${anchor}-product` and `${anchor}-driver`.
 * `cover` is a path base without the size suffix. Null keeps a paper seal.
 */
export interface ReadingBlock {
  anchor: string;
  event: string;
  eventDetail: string;
  products: CivProduct[];
  drivers: CivDriver[];
  impact: string;
  cover: string | null;
  coverAlt?: string;
  lines?: readonly string[];
  /** Pattern cards set this. Ordinary reading blocks leave it unset. */
  frame?: 'pattern';
  domId?: string;
  kicker?: string;
  captionNote?: string;
  problem?: string;
  mechanism?: string;
  boundary?: string;
  maintenance?: string;
  ask?: string;
  sources?: readonly CivSource[];
  stageHref?: string;
}

function lineChips(lines: readonly string[]): string {
  return lines.length
    ? `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`
    : '';
}

/** Paper seal when there is no cover. A real file hides itself on error and the seal returns. */
function coverSlot(block: ReadingBlock): string {
  if (!block.cover) {
    return `<div class="civ-block-frame"><span class="civ-block-seal" aria-hidden="true">產</span></div>`;
  }
  const alt = block.coverAlt ?? `${block.event}：溫和示意，年代為約數`;
  const img = `<img src="${esc(block.cover)}-640w.webp" srcset="${esc(block.cover)}-400w.webp 400w, ${esc(block.cover)}-640w.webp 640w, ${esc(block.cover)}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 320px" width="640" height="400" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.hidden=true" />`;
  return `<div class="civ-block-frame">${img}<span class="civ-block-seal" aria-hidden="true">產</span></div>`;
}

function patternSection(title: string, text: string | undefined, className = ''): string {
  const body = text?.trim();
  if (!body) return '';
  const klass = className ? ` class="${className}"` : '';
  return `<h3 class="civ-block-h">${esc(title)}</h3><p${klass}>${esc(body)}</p>`;
}

function mechanismSection(block: ReadingBlock): string {
  const text = block.mechanism?.trim();
  if (!text) return '';
  const cited = block.sources?.find((source) => source.supports === 'mechanism');
  const href = cited ? safeHttp(cited.url) : '';
  const cite = href && cited ? `<a href="${esc(href)}">（依據：${esc(cited.name)}）</a>` : '';
  return `<h3 class="civ-block-h">機制</h3><p>${esc(text)}${cite}</p>`;
}

function sourceSection(block: ReadingBlock): string {
  const rows = (block.sources ?? []).flatMap((source) => {
    const href = safeHttp(source.url);
    if (!href || !source.name.trim()) return [];
    return [`<li><a href="${esc(href)}">${esc(source.name)}</a></li>`];
  });
  if (!rows.length) return '';
  return `<h3 class="civ-block-h">來源</h3><ul class="pattern-source-list">${rows.join('')}</ul>`;
}

function stageLink(href: string | undefined): string {
  if (!href || !href.startsWith('/civilization/') || /["<>]/.test(href)) return '';
  return `<p class="stage-links"><a href="${esc(href)}">回到所在階段</a></p>`;
}

export function renderReadingBlock(block: ReadingBlock): string {
  const products = block.products.map((item) => {
    const kind = item.kind ? `<span class="product-kind">${esc(item.kind)}</span>` : '';
    return `<li>${kind}<strong>${esc(item.name)}</strong>：${esc(item.detail)}</li>`;
  }).join('');
  const drivers = block.drivers.map((item) => `<li><strong>${esc(item.name)}</strong>：${esc(item.detail)}</li>`).join('');
  const pattern = block.frame === 'pattern';
  const captionKind = block.captionNote ?? (block.cover ? '示意' : '紙感佔位');
  const klass = pattern ? 'civ-block pattern-card' : 'civ-block';
  const domId = pattern && block.domId ? block.domId : `${block.anchor}-reading`;
  const kicker = pattern ? (block.kicker ?? '模式卡') : '深讀';
  const problem = block.problem?.trim() ? `\n    <p class="pattern-problem">${esc(block.problem.trim())}</p>` : '';
  const dataPattern = pattern ? ` data-pattern="${esc(block.anchor.replace(/^pattern-/, ''))}"` : '';
  const extra = [
    mechanismSection(block),
    patternSection('不適用邊界', block.boundary),
    patternSection('維修／傳承條件', block.maintenance),
    patternSection('今日可問', block.ask, 'pattern-ask'),
    sourceSection(block),
    stageLink(block.stageHref),
  ].join('');
  return `<details class="${klass}" id="${esc(domId)}"${dataPattern} open>
    <summary><span class="civ-block-kicker">${esc(kicker)}</span><span class="civ-block-event">${esc(block.event)}</span></summary>${problem}
    <div class="civ-block-body">
      <figure class="civ-block-figure">${coverSlot(block)}<figcaption>${esc(block.event)} · ${captionKind} · 約數</figcaption></figure>
      <h3 class="civ-block-h">界定事件</h3>
      <p>${esc(block.eventDetail)}</p>
      <h3 class="civ-block-h" id="${esc(block.anchor)}-product">關鍵產物</h3>
      <ul class="product-list">${products}</ul>
      <h3 class="civ-block-h" id="${esc(block.anchor)}-driver">推動力</h3>
      <ul class="driver-list">${drivers}</ul>
      <h3 class="civ-block-h">溫和影響</h3>
      <p>${esc(block.impact)}</p>
      ${lineChips(block.lines ?? [])}${extra}
    </div>
  </details>`;
}
