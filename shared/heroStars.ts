/**
 * Seeded hero star field.
 *
 * Positions are rolled once per width. A height-only change (mobile URL bar,
 * svh) rescales the canvas buffer and maps the same u/v coordinates into the
 * new height. It does not call the generator again.
 */

export const HERO_STAR_SEED = 0xb17c0de;

export interface HeroStar {
  /** Horizontal position in the rolled field, 0..1. */
  u: number;
  /** Vertical position in the rolled field, 0..1. */
  v: number;
  r: number;
  born: number;
  speed: number;
  phase: number;
  gold: boolean;
}

export interface StarField {
  stars: readonly HeroStar[];
  width: number;
  height: number;
}

/** mulberry32. Same seed always yields the same sequence. */
export function heroStarRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function heroStarCount(width: number, height: number): number {
  return Math.max(90, Math.min(210, Math.round((width * height) / 8500)));
}

export function rollHeroStars(width: number, height: number, seed = HERO_STAR_SEED): HeroStar[] {
  const random = heroStarRng(seed);
  const count = heroStarCount(width, height);
  const stars: HeroStar[] = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      u: random(),
      v: random(),
      r: random() * 1.1 + 0.35,
      born: random(),
      speed: 0.4 + random() * 1.1,
      phase: random() * Math.PI * 2,
      gold: random() < 0.16,
    });
  }
  return stars;
}

/**
 * Width change (including the first measure) rebuilds the field.
 * Height-only change keeps the rolled stars and updates the buffer height.
 */
export function syncHeroStarField(
  field: StarField | null,
  width: number,
  height: number,
  seed = HERO_STAR_SEED,
): { field: StarField; rebuilt: boolean } {
  const nextWidth = Math.max(1, Math.round(width));
  const nextHeight = Math.max(1, Math.round(height));
  if (field && field.width === nextWidth) {
    if (field.height === nextHeight) return { field, rebuilt: false };
    return { field: { stars: field.stars, width: nextWidth, height: nextHeight }, rebuilt: false };
  }
  return {
    field: { stars: rollHeroStars(nextWidth, nextHeight, seed), width: nextWidth, height: nextHeight },
    rebuilt: true,
  };
}

/** Map a rolled star into the current canvas buffer. */
export function heroStarPoint(star: HeroStar, width: number, height: number): { x: number; y: number } {
  return { x: star.u * width, y: star.v * height };
}

/** Accepts #rgb, #rrggbb, and the rgb()/rgba() form getComputedStyle returns. */
export function cssColorToRgb(input: string): string | null {
  const text = input.trim();
  const long = /^#([0-9a-f]{6})$/i.exec(text);
  if (long) {
    const value = parseInt(long[1], 16);
    return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
  }
  const short = /^#([0-9a-f]{3})$/i.exec(text);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `${parseInt(r + r, 16)},${parseInt(g + g, 16)},${parseInt(b + b, 16)}`;
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(text);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  return null;
}
