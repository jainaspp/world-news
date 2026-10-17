import { coordinateFor, sliceForKey, type SliceSlot } from './slices.js';

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
 * Equal-weight 今｜近｜遠. Missing slots are omitted.
 * No match, or a match with no filled slots, returns an empty string.
 */
export function renderCivilizationSlice(key: string): string {
  const row = sliceForKey(key);
  if (!row) return '';
  const slots = row.slots.filter((slot) => slot.title.trim() && slot.blurb.trim());
  if (!slots.length) return '';
  const cells = slots.map((slot) => slotHtml(slot)).join('');
  return `<section class="civ-slice" data-slots="${slots.length}" aria-label="在文明軸上"><p class="civ-slice-kicker">${esc(row.line)}</p><div class="civ-slice-slots">${cells}</div></section>`;
}

/** Homepage coordinate. Empty string when nothing matches, so the node is absent. */
export function coordinateChipHtml(href: string): string {
  const chip = coordinateFor(href);
  if (!chip) return '';
  return `<span class="coord-chip">${esc(chip.layer)} · ${esc(chip.year)}</span>`;
}
