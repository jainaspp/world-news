/**
 * Phone spine geometry. CSS mirrors this with
 * `width: calc((100cqi - gap*(visible-1)) / visible)` inside the content box,
 * plus an optional inline inset on the scrollport. `tail` is the extra
 * margin before the first off-screen label (城市), so that border box starts
 * past the viewport, not only past the scrollport. A resting scroll of 0
 * ends in the gap before the next label, not through a glyph.
 */

export interface SpineSlot {
  index: number;
  left: number;
  right: number;
}

export function phoneSpineSlots(scrollport: number, visible: number, gap: number, count = 7, inset = 0, tail = 0): SpineSlot[] {
  const inner = scrollport - inset * 2;
  const width = (inner - (visible - 1) * gap) / visible;
  const stride = width + gap;
  return Array.from({ length: count }, (_, index) => {
    const shift = index >= visible ? tail : 0;
    const left = inset + index * stride + shift;
    return { index, left, right: left + width };
  });
}

/** Slots that intersect the resting scrollport (scrollLeft 0) but are not fully inside it. */
export function restingPartialSlots(scrollport: number, slots: readonly SpineSlot[]): number[] {
  const partial: number[] = [];
  for (const slot of slots) {
    const shown = Math.min(slot.right, scrollport) - Math.max(slot.left, 0);
    if (shown > 0.5 && shown < slot.right - slot.left - 0.5) partial.push(slot.index);
  }
  return partial;
}

/** True when some legal scrollLeft shows the whole slot inside the scrollport. */
export function slotFullyReachable(scrollport: number, slots: readonly SpineSlot[], index: number): boolean {
  const slot = slots[index];
  if (!slot) return false;
  const width = slot.right - slot.left;
  const last = slots[slots.length - 1];
  const track = last ? last.right : 0;
  const maxScroll = Math.max(0, track - scrollport);
  const scrollLeft = Math.min(Math.max(0, slot.right - scrollport), maxScroll);
  return scrollLeft <= slot.left + 0.5 && scrollLeft + scrollport >= slot.left + width - 0.5;
}
