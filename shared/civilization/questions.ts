import { esc } from '../contentPage.js';
import { CHRONICLE_STAGES } from './chronicle.js';
import { civChars } from './contract.js';
import { EARTH_STAGES } from './earth.js';
import { futureHrefAllowed } from './future.js';
import { PATTERN_CARDS } from './patterns.js';
import { SLICE_THEMES } from './slices.js';
import { TECH_STAGES } from './tech.js';

/**
 * Standing question → precedent index.
 * A new row is a new object in `CIV_QUESTIONS`. It must point at an anchor
 * that already exists: a pattern card, a chronicle / tech / earth stage,
 * the origins page, a home near-bridge card, or a hub `#future` anchor.
 * No new /civilization/ route.
 */

export interface CivQuestion {
  id: string;
  /** Mechanism question. At most 28 characters. Not a person ranking. */
  question: string;
  /** Existing precedent href. */
  href: string;
  /** Short name of that precedent, shown beside the question. */
  precedent: string;
  /**
   * Set when this row reuses a near-bridge question.
   * The row then also links to `/#near-{nearId}` on the home page.
   */
  nearId?: string;
}

const CHRONICLE_STAGE_IDS = new Set(CHRONICLE_STAGES.map((stage) => `stage-${stage.n}`));
const TECH_STAGE_IDS = new Set(TECH_STAGES.map((stage) => `tech-${stage.n}`));
const EARTH_STAGE_IDS = new Set(EARTH_STAGES.map((stage) => `earth-${stage.n}`));
const PATTERN_IDS = new Set(PATTERN_CARDS.map((card) => card.id));
const NEAR_IDS = new Set(SLICE_THEMES.map((theme) => theme.id));
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True only for anchors that already exist on the hub, the axis, or the home near bridge. */
export function questionHrefAllowed(href: string): boolean {
  if (futureHrefAllowed(href)) return true;
  const near = /^\/#near-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href);
  if (near) return NEAR_IDS.has(near[1] ?? '');
  const chroniclePattern = /^\/civilization\/chronicle\/#pattern-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href);
  if (chroniclePattern) return PATTERN_IDS.has(chroniclePattern[1] ?? '');
  const hubPattern = /^\/civilization\/#pattern-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href);
  if (hubPattern) return PATTERN_IDS.has(hubPattern[1] ?? '');
  const stage = /^\/civilization\/chronicle\/#(stage-\d+)$/.exec(href);
  if (stage) return CHRONICLE_STAGE_IDS.has(stage[1] ?? '');
  const tech = /^\/civilization\/tech\/#(tech-\d+)$/.exec(href);
  if (tech) return TECH_STAGE_IDS.has(tech[1] ?? '');
  const earth = /^\/civilization\/earth\/#(earth-\d+)$/.exec(href);
  if (earth) return EARTH_STAGE_IDS.has(earth[1] ?? '');
  return href === '/civilization/origins/';
}

/** The five near-bridge questions, then further standing mechanism questions. Order is the hub order. */
export const CIV_QUESTIONS: readonly CivQuestion[] = [
  {
    id: 'speech-record',
    question: '一段聲音如何留下可核對的紀錄？',
    href: '/civilization/chronicle/#pattern-copy-check',
    precedent: '複製與校驗',
    nearId: 'speech-image',
  },
  {
    id: 'check-note',
    question: '一份說明如何讓陌生人事後核對？',
    href: '/civilization/chronicle/#pattern-copy-check',
    precedent: '複製與校驗',
    nearId: 'learning',
  },
  {
    id: 'leave-machine',
    question: '計算步驟能否離開單一機器？',
    href: '/civilization/tech/#tech-9',
    precedent: '信息網絡',
    nearId: 'compute',
  },
  {
    id: 'same-unit',
    question: '異地的同一單位如何仍然可信？',
    href: '/civilization/chronicle/#pattern-measure-promise',
    precedent: '度量的互通',
    nearId: 'measure',
  },
  {
    id: 'store-energy',
    question: '能量如何被存住並送到別處？',
    href: '/civilization/chronicle/#pattern-power-store',
    precedent: '功率的儲存與維修',
    nearId: 'energy',
  },
  {
    id: 'repair-power',
    question: '功率提高之後，維修靠什麼維持？',
    href: '/civilization/chronicle/#stage-7',
    precedent: '工業革命',
  },
  {
    id: 'pass-craft',
    question: '沒有文字時，技藝如何向下傳遞？',
    href: '/civilization/tech/#tech-3',
    precedent: '口傳與共享知識',
  },
  {
    id: 'many-readers',
    question: '一份記錄如何到達許多讀者？',
    href: '/civilization/tech/#tech-7',
    precedent: '印刷與報刊',
  },
  {
    id: 'far-message',
    question: '消息如何在人不親至時送達？',
    href: '/civilization/tech/#tech-8',
    precedent: '電氣與遠距通訊',
  },
  {
    id: 'far-credit',
    question: '遠距結算靠什麼維持信用？',
    href: '/civilization/chronicle/#stage-8',
    precedent: '現代金融',
  },
  {
    id: 'planet-budget',
    question: '行星能量收支如何被核對？',
    href: '/civilization/#future-f1',
    precedent: '能量宜居',
  },
  {
    id: 'risk-record',
    question: '生存風險如何被事後核對？',
    href: '/civilization/#future-f6',
    precedent: '生存風險',
  },
  {
    id: 'factory-repair-rhythm',
    question: '工廠節奏如何把維修寫進日常？',
    href: '/civilization/chronicle/#stage-7',
    precedent: '工業革命',
  },
  {
    id: 'clearing-same-day',
    question: '跨國清算如何對上同一記帳日？',
    href: '/civilization/chronicle/#stage-8',
    precedent: '現代金融',
  },
  {
    id: 'packet-bypass-fault',
    question: '分組交換如何繞過單點故障？',
    href: '/civilization/chronicle/#stage-9',
    precedent: '信息革命',
  },
];

export function questionTargets(row: CivQuestion): string[] {
  const hrefs = [row.href];
  if (row.nearId) hrefs.push(`/#near-${row.nearId}`);
  return hrefs;
}

/** Empty array means the index satisfies the standing-question contract. */
export function questionIndexIssues(rows: readonly CivQuestion[] = CIV_QUESTIONS): string[] {
  const issues: string[] = [];
  if (rows.length < 8 || rows.length > 15) issues.push('count');
  const ids = new Set<string>();
  const questions = new Set<string>();
  for (const row of rows) {
    if (!SLUG.test(row.id)) issues.push(`id:${row.id}`);
    if (ids.has(row.id)) issues.push(`dup-id:${row.id}`);
    ids.add(row.id);
    if (!row.question.trim() || civChars(row.question) > 28) issues.push(`len:${row.id}`);
    if (questions.has(row.question)) issues.push(`dup-q:${row.id}`);
    questions.add(row.question);
    if (!/如何|能否|靠什麼/.test(row.question)) issues.push(`ask:${row.id}`);
    if (/誰最|排名|偉人|第一人|最偉大/.test(row.question)) issues.push(`rank:${row.id}`);
    if (!questionHrefAllowed(row.href)) issues.push(`href:${row.id}`);
    if (row.nearId && !SLUG.test(row.nearId)) issues.push(`near:${row.id}`);
    if (row.nearId && !questionHrefAllowed(`/#near-${row.nearId}`)) issues.push(`near-href:${row.id}`);
    if (!row.precedent.trim() || civChars(row.precedent) > 16) issues.push(`precedent:${row.id}`);
  }
  const asked = new Set(rows.map((row) => row.question));
  for (const theme of SLICE_THEMES) {
    if (!asked.has(theme.civQuestion)) issues.push(`reuse:${theme.id}`);
    const row = rows.find((item) => item.nearId === theme.id);
    if (!row || row.question !== theme.civQuestion) issues.push(`near-match:${theme.id}`);
  }
  return issues;
}

export function renderQuestionIndex(rows: readonly CivQuestion[] = CIV_QUESTIONS): string {
  const items = rows.map((row) => {
    const href = questionHrefAllowed(row.href) ? row.href : '';
    const line = href
      ? `<a class="question-line" href="${esc(href)}">${esc(row.question)}</a>`
      : `<span class="question-line">${esc(row.question)}</span>`;
    const nearHref = row.nearId && questionHrefAllowed(`/#near-${row.nearId}`) ? `/#near-${row.nearId}` : '';
    const near = nearHref ? `<a class="question-near" href="${esc(nearHref)}">今日近層</a>` : '';
    return `<li id="question-${esc(row.id)}">
      ${line}
      <p class="question-meta"><span class="question-precedent">先例 · ${esc(row.precedent)}</span>${near}</p>
    </li>`;
  }).join('');
  if (!items) return '';
  return `<section class="question-index" id="question-index" aria-label="問題索引">
    <h2>問題索引</h2>
    <p class="question-note">從常設問題進入先例。每一問對應既有的模式卡、階段，或首頁近層。</p>
    <ol class="question-list">${items}</ol>
  </section>`;
}
