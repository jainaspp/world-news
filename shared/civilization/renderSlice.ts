import { coordinateFor, sliceForQuery, type SliceQuery, type SliceSlot } from './slices.js';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function slotHtml(slot: SliceSlot): string {
  const title = slot.href
    ? `<a href="${esc(slot.href)}">${esc(slot.title)}</a>`
    : esc(slot.title);
  const year = slot.year ? `<span class="civ-slot-year">${esc(slot.year)}</span>` : '';
  return `<article class="civ-slot">
    <p class="civ-slot-label">${esc(slot.label)}</p>
    <h3>${year}${title}</h3>
    <p>${esc(slot.blurb)}</p>
  </article>`;
}

/**
 * Filled slots only. 近 is omitted while that bridge is empty, so the section
 * does not advertise a third slot.
 * No match, or a match with no filled slots, returns an empty string.
 */
export function renderCivilizationSlice(input: string | SliceQuery): string {
  const query = typeof input === 'string' ? { key: input } : input;
  const row = sliceForQuery(query);
  if (!row) return '';
  const slots = row.slots.filter((slot) => slot.title.trim() && slot.blurb.trim());
  if (!slots.length) return '';
  const cells = slots.map((slot) => slotHtml(slot)).join('');
  const labels = slots.map((slot) => slot.label).join('、');
  return `<section class="civ-slice" data-slots="${slots.length}" aria-label="在文明軸上：${esc(labels)}"><p class="civ-slice-kicker">${esc(row.line)}</p><div class="civ-slice-slots">${cells}</div></section>`;
}

/** Homepage coordinate. Empty string when nothing matches, so the node is absent. */
export function coordinateChipHtml(input: string | SliceQuery): string {
  const chip = coordinateFor(input);
  if (!chip) return '';
  return `<span class="coord-chip">${esc(chip.layer)} · ${esc(chip.year)}</span>`;
}
