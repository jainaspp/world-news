/**
 * Phone spine at ≤640px. CSS puts `.deep-axis` on the viewport edges
 * (`margin-inline: -16px` cancels the hero's 16px padding) and lays seven
 * stops in one row with an 8px gap. A resting view keeps every label inside
 * the viewport, which is what `clipped()` requires. Horizontal scroll that
 * parks later labels past the scrollport fails that check.
 */

export interface SpineSlot {
  index: number;
  left: number;
  right: number;
}

export function phoneSpineSlots(viewport: number, count = 7, gap = 8): SpineSlot[] {
  const width = (viewport - (count - 1) * gap) / count;
  const stride = width + gap;
  return Array.from({ length: count }, (_, index) => ({
    index,
    left: index * stride,
    right: index * stride + width,
  }));
}

/** Labels whose border box leaves the viewport by more than the gate's 1px. */
export function slotsPastViewport(viewport: number, slots: readonly SpineSlot[]): number[] {
  return slots.filter((slot) => slot.left < -1 || slot.right > viewport + 1).map((slot) => slot.index);
}
