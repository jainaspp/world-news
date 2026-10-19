import { esc } from '../contentPage.js';

/**
 * The seam at about seven million years ago.
 * Cosmos stage 10 and the origins milestone table already exist;
 * these ids only mark where a reader should land.
 */
export const COSMOS_HANDOFF_ID = 'cosmo-10';
export const ORIGINS_HANDOFF_ID = 'origins-7ma';

export const COSMOS_HANDOFF_HREF = `/civilization/cosmos/#${COSMOS_HANDOFF_ID}`;
export const ORIGINS_HANDOFF_HREF = `/civilization/origins/#${ORIGINS_HANDOFF_ID}`;

export interface BridgeChip {
  href: string;
  label: string;
}

/** Visible sentences on the cosmos page. Traditional Chinese; the seam is a handoff, not a new stage. */
export const COSMOS_HANDOFF_BEFORE = '本頁止於約七百萬年前。此前的能量、物質與生命信息，已鋪就宜居地球與複雜生物圈；人屬化石、石器與基因組不在此展開。';
export const COSMOS_HANDOFF_LEAD = '約七百萬年前，演化進入人族階段。請接讀';
export const COSMOS_HANDOFF_MID = '的同一年代。文明制度、技術與貨幣仍見';
export const COSMOS_HANDOFF_END = '。宇宙長河不併入文明編年，兩頁前後銜接，互不覆蓋。';
export const COSMOS_HANDOFF = `${COSMOS_HANDOFF_BEFORE}${COSMOS_HANDOFF_LEAD}人類起源時間線${COSMOS_HANDOFF_MID}文明編年${COSMOS_HANDOFF_END}`;

export const ORIGINS_BRIDGE_TITLE = '約七百萬年前的交接';
export const ORIGINS_BRIDGE_COPY = '宇宙長河在人族前生物圈收束，落點是約七百萬年前。本頁自同一約數接上：下表第一行即早期人族。此後只寫化石、石器與基因組，不重述暴脹、星系與含氧大氣。';

/** End of the cosmos page. Labels and hrefs stay in this list; the renderer does not invent a second set. */
export const COSMOS_HANDOFF_CHIPS: readonly BridgeChip[] = [
  { href: `#${COSMOS_HANDOFF_ID}`, label: '回到人族前生物圈' },
  { href: '/civilization/earth/', label: '地球生命' },
  { href: ORIGINS_HANDOFF_HREF, label: '約七百萬年前，演化進入人族階段' },
  { href: '/civilization/chronicle/', label: '文明編年' },
  { href: '/civilization/', label: '返回文明總覽' },
];

/** Origins landing at the same date. */
export const ORIGINS_BRIDGE_CHIPS: readonly BridgeChip[] = [
  { href: COSMOS_HANDOFF_HREF, label: '宇宙長河 · 人族前生物圈' },
  { href: '/civilization/earth/#earth-8', label: '地球生命 · 交接人族' },
  { href: '/civilization/chronicle/', label: '其後的文明編年' },
];

/** Spine board chips. The axis node still opens the page; these chips land on the seam. */
export const SPINE_COSMOS_LINKS: readonly BridgeChip[] = [
  { href: '/civilization/cosmos/', label: '閱讀宇宙長河' },
  { href: COSMOS_HANDOFF_HREF, label: '約七百萬年前收束' },
  { href: ORIGINS_HANDOFF_HREF, label: '交接入類起源' },
];

export const SPINE_ORIGINS_LINKS: readonly BridgeChip[] = [
  { href: '/civilization/origins/', label: '閱讀人類起源' },
  { href: ORIGINS_HANDOFF_HREF, label: '約七百萬年前接上' },
  { href: COSMOS_HANDOFF_HREF, label: '回看宇宙長河收束' },
];

export function renderLinkChips(chips: readonly BridgeChip[], label: string): string {
  const items = chips.map((chip) => `<a class="chip" href="${esc(chip.href)}">${esc(chip.label)}</a>`).join('');
  return `<nav class="stage-links ma-bridge-chips" aria-label="${esc(label)}">${items}</nav>`;
}

export function renderOriginsBridge(): string {
  return `<section class="ma-bridge" aria-label="${esc(ORIGINS_BRIDGE_TITLE)}">
    <h2 id="${ORIGINS_HANDOFF_ID}" tabindex="-1">${esc(ORIGINS_BRIDGE_TITLE)}</h2>
    <p>${esc(ORIGINS_BRIDGE_COPY)}</p>
    ${renderLinkChips(ORIGINS_BRIDGE_CHIPS, ORIGINS_BRIDGE_TITLE)}
  </section>`;
}

export function renderCosmosHandoff(): string {
  return `<section class="ma-bridge" aria-label="交接人類起源">
    <h2 id="cosmo-handoff" tabindex="-1">交接人類起源</h2>
    <p>${esc(COSMOS_HANDOFF_BEFORE)}</p>
    <p>${esc(COSMOS_HANDOFF_LEAD)}<a href="${ORIGINS_HANDOFF_HREF}">人類起源時間線</a>${esc(COSMOS_HANDOFF_MID)}<a href="/civilization/chronicle/">文明編年</a>${esc(COSMOS_HANDOFF_END)}</p>
    ${renderLinkChips(COSMOS_HANDOFF_CHIPS, '約七百萬年前的交接')}
  </section>`;
}
