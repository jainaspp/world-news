/**
 * Phone spine geometry. CSS mirrors this with
 * `width: calc((100cqi - gap*(visible-1)) / visible)` inside the scrollport,
 * so a resting scroll of 0 ends on a slot boundary instead of through a label.
 */

export interface SpineSlot {
  index: number;
  left: number;
  right: number;
}

export function phoneSpineSlots(scrollport: number, visible: number, gap: number, count = 7): SpineSlot[] {
  const width = (scrollport - (visible - 1) * gap) / visible;
  const stride = width + gap;
  return Array.from({ length: count }, (_, index) => ({
    index,
    left: index * stride,
    right: index * stride + width,
  }));
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
