import { esc, safeHttp } from '../contentPage.js';
import type { ChronicleStage, ChronicleSource } from './chronicle.js';
import { CHRONICLE_MILESTONE_BLOCKS, milestoneBlockAnchor, type ChronicleMilestoneBlock } from './chronicleMilestones.js';

/**
 * 可重用的「產物｜推動力」深讀塊渲染器（擴容預備：卡片／詳解塊組件化）。
 *
 * 同一塊型可掛到任何以 `ChronicleStage` 為單位的長頁：渲染只讀
 * `CHRONICLE_MILESTONE_BLOCKS` 的資料，加新塊、新產物或新推動力
 * 都毋須改動本檔。錨點 `#stage-N-product` 由 `milestoneBlockAnchor`
 * 統一生成，穩定可增長。
 */

const CIV = '/static/civilization';

export function milestoneBlocksFor(stageN: number): ChronicleMilestoneBlock[] {
  return CHRONICLE_MILESTONE_BLOCKS[stageN] ?? [];
}

function blockChips(lines: readonly string[]): string {
  return `<p class="line-chips milestone-lines">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

/** Vignette slot: paper seal behind the art. A missing file hides itself and the paper stays. */
function blockVignette(block: ChronicleMilestoneBlock, stageN: number): string {
  if (!block.image) {
    return `<div class="milestone-frame" data-stage="${stageN}"><span class="milestone-seal" aria-hidden="true">產</span></div>`;
  }
  const base = `${CIV}/${block.image}`;
  const alt = block.imageAlt ?? `${block.event}：溫和示意，年代為約數`;
  const img = `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 320px" width="640" height="400" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.hidden=true" />`;
  return `<div class="milestone-frame" data-stage="${stageN}">${img}<span class="milestone-seal" aria-hidden="true">產</span></div>`;
}

function blockSource(block: ChronicleMilestoneBlock): string {
  if (!block.sourceName || !block.sourceUrl) return '';
  const href = safeHttp(block.sourceUrl);
  if (!href) return '';
  return `<p class="stage-source">來源：<a href="${esc(href)}">${esc(block.sourceName)}</a></p>`;
}

function renderBlock(stage: ChronicleStage, block: ChronicleMilestoneBlock, index: number): string {
  const anchor = milestoneBlockAnchor(stage.n, block, index);
  const products = block.products.map((product) =>
    `<li><span class="product-kind">${esc(product.kind)}</span><strong>${esc(product.name)}</strong>：${esc(product.detail)}</li>`,
  ).join('');
  const drivers = block.drivers.map((driver) =>
    `<li><strong>${esc(driver.name)}</strong>：${esc(driver.detail)}</li>`,
  ).join('');
  return `<details class="milestone-block" id="${esc(anchor)}" data-stage="${stage.n}" open>
    <summary><span class="milestone-kicker">里程碑深讀 · 產物與推動力</span><span class="milestone-event">${esc(block.event)}</span></summary>
    <div class="milestone-body">
      <figure class="milestone-figure">${blockVignette(block, stage.n)}<figcaption>${esc(block.event)} · 示意 · 約數</figcaption></figure>
      <h3 class="milestone-h">界定事件</h3>
      <p>${esc(block.eventDetail)}</p>
      <h3 class="milestone-h">關鍵產物</h3>
      <ul class="product-list">${products}</ul>
      <h3 class="milestone-h">推動力</h3>
      <ul class="driver-list">${drivers}</ul>
      <h3 class="milestone-h">溫和影響</h3>
      <p>${esc(block.impact)}</p>
      ${blockChips(block.lines)}
      ${blockSource(block)}
    </div>
  </details>`;
}

/** All deep-read blocks for one stage, in data order. */
export function renderMilestoneBlocks(stage: ChronicleStage): string {
  return milestoneBlocksFor(stage.n).map((block, index) => renderBlock(stage, block, index)).join('');
}

/** Block text counted toward the chronicle index floor. */
export function milestoneBlockProse(stageN: number): string {
  return milestoneBlocksFor(stageN).map((block) => [
    block.event,
    block.eventDetail,
    ...block.products.flatMap((product) => [product.kind, product.name, product.detail]),
    ...block.drivers.flatMap((driver) => [driver.name, driver.detail]),
    block.impact,
    ...block.lines,
  ].join('')).join('\n');
}

/** Block-level sources for the footer table, labelled by stage number. */
export function milestoneBlockSources(): ChronicleSource[] {
  const rows: ChronicleSource[] = [];
  for (const key of Object.keys(CHRONICLE_MILESTONE_BLOCKS)) {
    const stageN = Number(key);
    for (const block of milestoneBlocksFor(stageN)) {
      if (block.sourceName && block.sourceUrl) {
        rows.push({ stage: `${stageN} 深讀`, name: block.sourceName, url: block.sourceUrl });
      }
    }
  }
  return rows;
}
