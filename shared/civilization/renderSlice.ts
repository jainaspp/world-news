import { coordinateFor, nearSlot, SLICE_THEMES, sliceForQuery, type SliceAxis, type SliceQuery, type SliceSlot, type SliceTheme } from './slices.js';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function slotAttrs(slot: SliceSlot): string {
  const ref = slot.precedentRef;
  if (!ref) return '';
  return ` data-pattern-card="${esc(ref.patternCardId)}" data-axis="${esc(ref.axis)}" data-anchor="${esc(ref.anchor)}"`;
}

function slotHtml(slot: SliceSlot, question?: string): string {
  const title = slot.href
    ? `<a href="${esc(slot.href)}">${esc(slot.title)}</a>`
    : esc(slot.title);
  const year = slot.year ? `<span class="civ-slot-year">${esc(slot.year)}</span>` : '';
  const ask = slot.label === '近' && question ? `<p class="civ-slot-question">${esc(question)}</p>` : '';
  return `<article class="civ-slot"${slotAttrs(slot)}>
    <p class="civ-slot-label">${esc(slot.label)}</p>
    ${ask}
    <h3>${year}${title}</h3>
    <p>${esc(slot.blurb)}</p>
  </article>`;
}

function filledSlots(theme: SliceTheme): SliceSlot[] {
  return theme.slots.filter((slot) => slot.title.trim() && slot.blurb.trim());
}

/**
 * Filled slots only. A 近 slot without title or blurb stays omitted.
 * No match, or a match with no filled slots, returns an empty string.
 */
export function renderCivilizationSlice(input: string | SliceQuery): string {
  const query = typeof input === 'string' ? { key: input } : input;
  const row = sliceForQuery(query);
  if (!row) return '';
  const slots = filledSlots(row);
  if (!slots.length) return '';
  const cells = slots.map((slot) => slotHtml(slot, row.civQuestion)).join('');
  const labels = slots.map((slot) => slot.label).join('、');
  return `<section class="civ-slice" data-slots="${slots.length}" aria-label="在文明軸上：${esc(labels)}"><p class="civ-slice-kicker">${esc(row.line)}</p><div class="civ-slice-slots">${cells}</div></section>`;
}

/** Homepage and hub list of today's question paired with its axis precedent. */
export function renderNearBridge(): string {
  const cards = SLICE_THEMES.map((theme) => {
    const near = nearSlot(theme);
    if (!near?.precedentRef || !theme.civQuestion.trim()) return '';
    const year = near.year ? `<span class="civ-slot-year">${esc(near.year)}</span>` : '';
    return `<article class="civ-slot" id="near-${esc(theme.id)}"${slotAttrs(near)}>
      <p class="civ-slot-label">近 · ${esc(theme.line)}</p>
      <p class="civ-slot-question">${esc(theme.civQuestion)}</p>
      <h3>${year}<a href="${esc(near.href || near.precedentRef.href)}">${esc(near.title)}</a></h3>
      <p>${esc(near.blurb)}</p>
    </article>`;
  }).filter(Boolean);
  if (!cards.length) return '';
  return `<section class="civ-near" aria-label="近層先例"><p class="civ-slice-kicker">近層 · 今日問題與軸上先例</p><div class="civ-slice-slots">${cards.join('')}</div></section>`;
}

/** Questions that point at this axis, linking back to the home near card. */
export function renderSliceReturns(axis: SliceAxis): string {
  const rows = SLICE_THEMES.filter((theme) => (
    theme.civQuestion.trim()
    && theme.slots.some((slot) => slot.precedentRef?.axis === axis && slot.title.trim() && slot.blurb.trim())
  ));
  if (!rows.length) return '';
  const items = rows.map((theme) => `<li><a href="/#near-${esc(theme.id)}">${esc(theme.civQuestion)}</a></li>`).join('');
  return `<section class="civ-slice-return" aria-label="今日可問"><h2>今日可問</h2><p>這些問題從今日切片連回本頁，方便對照軸上的先例。</p><ul>${items}</ul></section>`;
}

/** Homepage coordinate. Empty string when nothing matches, so the node is absent. */
export function coordinateChipHtml(input: string | SliceQuery): string {
  const chip = coordinateFor(input);
  if (!chip) return '';
  return `<span class="coord-chip">${esc(chip.layer)} · ${esc(chip.year)}</span>`;
}
