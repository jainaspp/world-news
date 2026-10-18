import { esc } from '../contentPage.js';

export interface BlockItem {
  name: string;
  detail: string;
  kind?: string;
}

/**
 * One expandable deep-read block. A new page adds data; this file does not grow.
 * Anchors are `${anchor}-product` and `${anchor}-driver`.
 * `cover` is a path base without the size suffix. Null keeps a paper seal.
 */
export interface ReadingBlock {
  anchor: string;
  event: string;
  eventDetail: string;
  products: BlockItem[];
  drivers: BlockItem[];
  impact: string;
  cover: string | null;
  coverAlt?: string;
  lines?: readonly string[];
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

export function renderReadingBlock(block: ReadingBlock): string {
  const products = block.products.map((item) => {
    const kind = item.kind ? `<span class="product-kind">${esc(item.kind)}</span>` : '';
    return `<li>${kind}<strong>${esc(item.name)}</strong>：${esc(item.detail)}</li>`;
  }).join('');
  const drivers = block.drivers.map((item) => `<li><strong>${esc(item.name)}</strong>：${esc(item.detail)}</li>`).join('');
  const captionKind = block.cover ? '示意' : '紙感佔位';
  return `<details class="civ-block" id="${esc(block.anchor)}-reading" open>
    <summary><span class="civ-block-kicker">深讀</span><span class="civ-block-event">${esc(block.event)}</span></summary>
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
      ${lineChips(block.lines ?? [])}
    </div>
  </details>`;
}
