/**
 * Phone spine geometry. At widths ≤640 the milestones wrap into a 4-column
 * grid with an 8px gap, so 城市／今天／未來 sit inside the resting frame.
 * Column width is (scrollport - (columns-1)*gap) / columns.
 */

export interface SpineSlot {
  index: number;
  left: number;
  right: number;
}

export function phoneSpineSlots(scrollport: number, columns = 4, gap = 8, count = 7): SpineSlot[] {
  const width = (scrollport - (columns - 1) * gap) / columns;
  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const left = col * (width + gap);
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
