import { esc, safeHttp } from '../contentPage.js';
import { renderReadingBlock, type ReadingBlock } from './blocks.js';
import {
  EARTH_LEDE,
  EARTH_LINES,
  EARTH_SOURCES,
  EARTH_SOURCE_NOTE,
  EARTH_STAGES,
  EARTH_TITLE,
  HANDOFF_BACK_A,
  HANDOFF_BACK_B,
  HANDOFF_FWD_A,
  HANDOFF_FWD_B,
  HANDOFF_FWD_C,
  type EarthStage,
} from './content/earthStages.js';

export {
  EARTH_HANDOFF,
  EARTH_LEDE,
  EARTH_LINES,
  EARTH_MIN_CHARS,
  EARTH_SOURCE_NOTE,
  EARTH_SOURCES,
  EARTH_STAGES,
  EARTH_TITLE,
  earthIndexable,
  earthProse,
  earthStageHref,
  earthStageText,
} from './content/earthStages.js';
export type { EarthLine, EarthPart, EarthSource, EarthStage } from './content/earthStages.js';

const NARRATIVE_HEADINGS = new Set(['環境', '優勢類群']);

function ordinal(n: number): string {
  return String(n).padStart(2, '0');
}

function lineChips(lines: readonly string[]): string {
  return `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

const CIV = '/static/civilization';

function paperSeal(n: number): string {
  return `<span class="stage-seal">${ordinal(n)}</span>`;
}

/**
 * Cover slot for every stage. The paper ordinal is in the figure and stays hidden
 * while the WebP loads. 640 stays the src; 1280w is the high-DPR candidate.
 * onerror reveals the seal if a file is missing.
 */
export function earthCoverImg(stage: EarthStage, eager: boolean): string {
  const base = `${CIV}/earth-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

function sourceHref(url: string): string {
  const safe = safeHttp(url);
  return safe ? esc(safe) : '';
}

function partHtml(stage: EarthStage): string {
  return stage.parts.filter((part) => NARRATIVE_HEADINGS.has(part.heading)).map((part) => {
    const id = part.id ? ` id="${esc(part.id)}"` : '';
    return `<div class="earth-part"${id}><h3>${esc(part.heading)}</h3><p>${esc(part.text)}</p></div>`;
  }).join('');
}

/** Alt text for the Batch G product vignette on each earth deep-read block. */
const EARTH_PRODUCT_ALT: Record<number, string> = {
  1: '早期生命與大氧化：疊層石與淺海溫和示意，年代為約數',
  2: '寒武紀大爆發：三葉蟲與海洋生物溫和示意，年代為約數',
  3: '古生代海洋與陸地植物：鱗木森林與早期四足動物溫和示意，年代為約數',
  4: '三疊紀：主龍類與乾旱內陸溫和示意，年代為約數',
  5: '侏羅紀：蜥腳類與裸子植物林溫和示意，年代為約數',
  6: '白堊紀與末期更替：開花植物與白堊沉積溫和示意，年代為約數',
  7: '新生代哺乳動物輻射：食草哺乳動物與草地溫和示意，年代為約數',
  8: '交接人族：疏林與開闊地溫和示意，年代為約數',
};

/** 產物 and 推動力 stay in the stage data and render through the shared block. */
function readingBlock(stage: EarthStage): ReadingBlock {
  const product = stage.parts.find((part) => part.heading === '產物');
  const driver = stage.parts.find((part) => part.heading === '推動力');
  return {
    anchor: `earth-${stage.n}`,
    event: stage.name,
    eventDetail: stage.milestones.join('。'),
    products: [{ name: product?.heading ?? '產物', detail: product?.text ?? stage.meaning }],
    drivers: [{ name: driver?.heading ?? '推動力', detail: driver?.text ?? '' }],
    impact: stage.meaning,
    cover: `${CIV}/earth-stage-${stage.n}-product`,
    coverAlt: EARTH_PRODUCT_ALT[stage.n] ?? `${stage.name}：產物溫和示意，年代為約數`,
    lines: stage.lines,
  };
}

function stageSection(stage: EarthStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const jurassicId = stage.n === 5 ? ' id="jurassic"' : '';
  const jumps = stage.n === 5
    ? '<p class="stage-links"><a href="#jurassic">侏羅紀</a><a href="#earth-5-env">環境</a><a href="#earth-5-life">優勢類群</a><a href="#earth-5-product">關鍵產物</a><a href="#earth-5-driver">推動力</a></p>'
    : '';
  return `<section class="chronicle-stage earth-stage" id="earth-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2 tabindex="-1"${jurassicId}>${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${earthCoverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    <p>${esc(stage.prose)}</p>
    ${jumps}
    ${partHtml(stage)}
    ${renderReadingBlock(readingBlock(stage))}
    ${lineChips(stage.lines)}
  </section>`;
}

function sourceTable(): string {
  const body = EARTH_SOURCES.map((row, index) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.note)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>#</th><th>機構／入口</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderEarthArticle(): string {
  const nav = EARTH_STAGES.map((stage) => `<a class="chip" href="#earth-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  const jurassicChip = '<a class="chip" href="#jurassic">侏羅紀</a>';
  return `<article class="civ-article earth-page">
    <header class="earth-hero">
      <p class="kicker">Deep life · 地球生命</p>
      <h1 class="column-title civ-page-title">${esc(EARTH_TITLE)}</h1>
    </header>
    <p class="deep-time-return"><a href="/civilization/cosmos/">上一層：宇宙長河</a></p>
    <p>${esc(EARTH_LEDE.split('約七百萬年前交接入類起源。')[0] ?? '')}<a href="/civilization/origins/">約七百萬年前交接入類起源</a>。${esc(EARTH_LEDE.split('約七百萬年前交接入類起源。')[1] ?? '')}</p>
    ${lineChips(EARTH_LINES)}
    <nav class="chronicle-nav earth-nav" aria-label="跳到地球生命階段">${nav}${jurassicChip}</nav>
    ${EARTH_STAGES.map(stageSection).join('')}
    <h2>交接人類起源</h2>
    <p>${esc(HANDOFF_BACK_A)}<a href="/civilization/cosmos/">宇宙長河</a>${esc(HANDOFF_BACK_B)}</p>
    <p>${esc(HANDOFF_FWD_A)}<a href="/civilization/origins/">人類起源時間線</a>${esc(HANDOFF_FWD_B)}<a href="/civilization/chronicle/">文明編年</a>${esc(HANDOFF_FWD_C)}</p>
    <p class="stage-links"><a href="/civilization/cosmos/">返回宇宙長河</a><a href="/civilization/origins/">約七百萬年前，演化進入人族階段</a><a href="#earth-5">侏羅紀專節</a><a href="#jurassic">侏羅紀</a><a href="/civilization/">返回文明總覽</a></p>
    <h2>來源</h2>
    ${sourceTable()}
    <p class="stage-source">${esc(EARTH_SOURCE_NOTE)}</p>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。</p>
  </article>`;
}
