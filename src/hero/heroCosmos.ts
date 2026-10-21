import { HERO_MAX_DPR, HERO_PHASES, HERO_TABLEAU_MS } from '../../shared/hero/heroNarrative';

/**
 * Ink-paper cosmos painter for the homepage prologue.
 *
 * Art direction — the bang is an ink drop blooming on paper, not a fireball:
 * paper-cream and antique-brass flecks over the site's ink ground (#161c24).
 * One fixed seed paints the same film on every visit, so the opening reads as
 * authored choreography, not as Perlin noise. The painter owns no clock: it
 * receives a playback time and draws exactly one frame, so the DOM reveal
 * and the scenery stay in lock-step and pause together off-screen or when
 * the tab is hidden.
 */

interface Mote {
  angle: number;
  distance: number;
  size: number;
  drift: number;
  arm: 0 | 1;
  tint: 0 | 1 | 2;
  twinklePhase: number;
  twinkleRate: number;
  lead: number;
}

interface Flare {
  angle: number;
  distance: number;
  period: number;
  lag: number;
}

/** rgb triplets: paper cream, antique brass, deep ink fleck. */
const TINTS: readonly string[] = ['232, 228, 220', '196, 165, 114', '122, 96, 62'];

const MAX_MOTES = 250;
const MIN_MOTES = 120;
/** The film's seed = the SPEC date. Same scene on every machine. */
const SEED = 20261021;
/** Longest allowed wake from a burst — ease-out cubic: fast press, soft halt. */
function easeOutCubic(p: number): number {
  const q = 1 - p;
  return 1 - q * q * q;
}

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/** Gentle overshoot for the earth stamping into its sky berth. */
function easeOutBack(p: number): number {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function staticCount(w: number, h: number): number {
  return clamp(Math.round((w * h) / 6200), MIN_MOTES, MAX_MOTES);
}

export class CosmosPainter {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private motes: Mote[] = [];
  private flares: Flare[] = [];
  private w = 0;
  private h = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Remap to a new viewport. Motes live in fractional space so a mobile URL
   * bar height change re-maps silently; only a real width change reseeds,
   * deterministically, because the seed is fixed.
   */
  resize(cssW: number, cssH: number, dpr: number): void {
    const widthRebuild = this.w > 0 && Math.abs(cssW - this.w) > this.w * 0.18;
    const scale = clamp(dpr, 1, HERO_MAX_DPR);
    this.canvas.width = Math.max(1, Math.round(cssW * scale));
    this.canvas.height = Math.max(1, Math.round(cssH * scale));
    this.ctx?.setTransform(scale, 0, 0, scale, 0, 0);
    this.w = cssW;
    this.h = cssH;
    if (this.motes.length === 0 || widthRebuild) this.seed(this.motes.length || staticCount(cssW, cssH));
  }

  private seed(count: number): void {
    const rand = mulberry32(SEED);
    this.motes = Array.from({ length: count }, () => {
      const roll = rand();
      return {
        angle: rand() * Math.PI * 2,
        distance: 0.08 + Math.sqrt(rand()) * 0.92,
        size: 0.45 + rand() * 1.55,
        drift: 0.35 + rand() * 0.65,
        arm: rand() < 0.5 ? 0 : 1,
        tint: roll < 0.68 ? 0 : roll < 0.9 ? 1 : 2,
        twinklePhase: rand() * Math.PI * 2,
        twinkleRate: 0.0009 + rand() * 0.0021,
        lead: rand(),
      };
    });
    this.flares = Array.from({ length: 7 }, (_, index) => ({
      angle: rand() * Math.PI * 2,
      distance: 0.3 + rand() * 0.5,
      period: 2400 + rand() * 900,
      lag: index * 520 + rand() * 200,
    }));
  }

  /** Reduced-motion and no-JS path: one late-stage frame, no loop, no rAF. */
  drawTableau(): void {
    this.drawFrame(HERO_TABLEAU_MS);
  }

  /** Draw one frame of the opening at playback time tMs (ms since mount). */
  drawFrame(tMs: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w, h } = this;
    if (w <= 0 || h <= 0) return;
    ctx.clearRect(0, 0, w, h);
    const minDim = Math.min(w, h);
    if (tMs < HERO_PHASES.bang) {
      this.drawVoid(ctx, tMs, w, h, minDim);
      return;
    }
    // The bang paints for every later frame too: rings fade, motes persist.
    const burstP = clamp((tMs - HERO_PHASES.bang) / 1800, 0, 1);
    this.drawBurstRings(ctx, burstP, w, h, minDim, tMs >= HERO_PHASES.drift);
    if (tMs < HERO_PHASES.drift) this.paintMotes(ctx, (mote) => this.burstAt(mote, burstP, w, h, minDim, tMs));
    else this.paintMotes(ctx, (mote) => this.flowAt(mote, tMs, w, h, minDim));
    if (tMs >= HERO_PHASES.drift) this.drawCore(ctx, tMs, w, h, minDim);
    if (tMs >= 14_600) this.drawFlares(ctx, tMs, w, h, minDim);
    if (tMs >= HERO_PHASES.earth) this.drawEarth(ctx, tMs, w, h, minDim);
    if (tMs >= HERO_PHASES.settle) this.drawHairline(ctx, tMs, w, h);
  }

  dispose(): void {
    this.motes = [];
    this.flares = [];
  }

  /** ~0–6.4s: blank ink paper, one brass seed breathing and tightening. */
  private drawVoid(ctx: CanvasRenderingContext2D, tMs: number, w: number, h: number, minDim: number): void {
    const cx = w * 0.5;
    const cy = h * 0.46;
    const wait = clamp(tMs / HERO_PHASES.bang, 0, 1);
    const breathe = 0.5 + 0.5 * Math.sin(tMs / 640);
    const radius = (2.6 - 1.7 * wait) * (1 + 0.2 * breathe);
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.15);
    halo.addColorStop(0, `rgba(196, 165, 114, ${0.14 + 0.12 * breathe + 0.12 * wait})`);
    halo.addColorStop(1, 'rgba(196, 165, 114, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(214, 188, 144, ${0.72 + 0.16 * breathe})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Ink-drop bloom rings. Cream leads, brass follows, ink shadows tail. */
  private drawBurstRings(
    ctx: CanvasRenderingContext2D,
    p: number,
    w: number,
    h: number,
    minDim: number,
    withFlash: boolean,
  ): void {
    const cx = w * 0.5;
    const cy = h * 0.46;
    if (withFlash) return;
    const flash = Math.max(0, 1 - p / 0.15);
    if (flash > 0) {
      // A brief breath of light on the paper — capped, never a white-out.
      ctx.fillStyle = `rgba(232, 228, 220, ${0.12 * flash})`;
      ctx.fillRect(0, 0, w, h);
    }
    const reach = minDim * 0.66;
    const rings = [0, 0.16, 0.34];
    for (let i = 0; i < rings.length; i += 1) {
      const lag = rings[i];
      const q = clamp((p - lag) / (1 - lag), 0, 1);
      if (q <= 0) continue;
      const alpha = 0.48 * (1 - q) * (1 - q);
      ctx.strokeStyle = `rgba(${TINTS[i]}, ${alpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, easeOutCubic(q) * reach, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Position of a mote while the ink drop is still blooming outward. */
  private burstAt(mote: Mote, p: number, w: number, h: number, minDim: number, tMs: number): { x: number; y: number; alpha: number } {
    const cx = w * 0.5;
    const cy = h * 0.46;
    const reach = minDim * 0.66;
    const q = easeOutCubic(clamp((p - mote.lead * 0.22) / 0.78, 0, 1));
    const dist = q * reach * mote.distance;
    return {
      x: cx + Math.cos(mote.angle) * dist,
      y: cy + Math.sin(mote.angle) * dist,
      alpha: q * this.twinkle(mote, tMs) * 0.8,
    };
  }

  /** Position from drift onward: coasting out, then reeled into a spiral berth. */
  private flowAt(mote: Mote, tMs: number, w: number, h: number, minDim: number): { x: number; y: number; alpha: number } {
    const cx = w * 0.5;
    const cy = h * 0.46;
    const reach = minDim * 0.66;
    const burst = easeOutCubic(clamp((tMs - HERO_PHASES.bang - mote.lead * 450) / 1350, 0, 1));
    const coastR = burst * reach * mote.distance + (tMs - HERO_PHASES.drift) * 0.006 * mote.drift;
    const galaxyP = easeInOut(clamp((tMs - HERO_PHASES.drift) / (HERO_PHASES.earth - HERO_PHASES.drift), 0, 1));
    const [sx, sy] = spiralAt(mote, tMs, minDim);
    const coastAngle = mote.angle * (1 - galaxyP);
    const x = cx + Math.cos(coastAngle) * coastR * (1 - galaxyP) + (sx - cx) * galaxyP;
    const y = cy + Math.sin(coastAngle) * coastR * (1 - galaxyP) + (sy - cy) * galaxyP;
    return { x, y, alpha: (0.4 + 0.45 * galaxyP) * this.twinkle(mote, tMs) };
  }

  /** The galaxy core: a slow brass breath at the centre. */
  private drawCore(ctx: CanvasRenderingContext2D, tMs: number, w: number, h: number, minDim: number): void {
    const cx = w * 0.5;
    const cy = h * 0.46;
    const ramp = clamp((tMs - HERO_PHASES.drift) / 2500, 0, 1);
    const alpha = ramp * (0.08 + 0.08 * (0.5 + 0.5 * Math.sin(tMs / 1700)));
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.22);
    core.addColorStop(0, `rgba(196, 165, 114, ${alpha})`);
    core.addColorStop(1, 'rgba(196, 165, 114, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  /** New stars flare on the arms like forges coming on shift. */
  private drawFlares(ctx: CanvasRenderingContext2D, tMs: number, w: number, h: number, minDim: number): void {
    const cx = w * 0.5;
    const cy = h * 0.46;
    for (const flare of this.flares) {
      const local = (tMs - 14_600 - flare.lag) / flare.period;
      if (local < 0) continue;
      const pulse = 0.5 + 0.5 * Math.sin(local * Math.PI * 2);
      const mote: Mote = {
        angle: flare.angle,
        distance: flare.distance,
        size: 1,
        drift: 0,
        arm: 0,
        tint: 1,
        twinklePhase: 0,
        twinkleRate: 0,
        lead: 0,
      };
      const [dx, dy] = spiralAt(mote, tMs, minDim);
      const x = cx + dx;
      const y = cy + dy;
      const alpha = (0.3 + 0.55 * pulse) * clamp((tMs - 14_600 - flare.lag) / 600, 0, 1);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 10 + 7 * pulse);
      glow.addColorStop(0, `rgba(196, 165, 114, ${alpha * 0.45})`);
      glow.addColorStop(1, 'rgba(196, 165, 114, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 10 + 7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(243, 234, 220, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + 0.8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(196, 165, 114, ${alpha * 0.35})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 4.5, y);
      ctx.lineTo(x + 4.5, y);
      ctx.moveTo(x, y - 4.5);
      ctx.lineTo(x, y + 4.5);
      ctx.stroke();
    }
  }

  /**
   * A paper-stamp earth. It rises from the lower-right corner like a lantern
   * into its sky berth at (0.78w, 0.26h): above the narration band, beside
   * the kicker, clear of the CTA row on every viewport, 360px included.
   */
  private drawEarth(ctx: CanvasRenderingContext2D, tMs: number, w: number, h: number, minDim: number): void {
    const enter = clamp((tMs - HERO_PHASES.earth) / 1800, 0, 1);
    const ease = easeOutBack(enter);
    const restX = w * 0.78;
    const restY = h * 0.26;
    const startX = w * 1.02;
    const startY = h * 1.08;
    const bob = enter >= 1 ? Math.sin((tMs - HERO_PHASES.earth - 1800) / 1600) * 1.6 : 0;
    const x = startX + (restX - startX) * ease;
    const y = startY + (restY - startY) * ease + bob;
    const r = clamp(minDim * 0.05, 13, 30);

    // Ink-blue wash body, deeper toward the rim.
    const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
    body.addColorStop(0, '#2e4159');
    body.addColorStop(0.72, '#1a2637');
    body.addColorStop(1, '#111823');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Land masses: three seeded ink-green blobs clipped inside the disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(88, 104, 74, 0.9)';
    for (let i = 0; i < 3; i += 1) {
      const a = 0.7 + i * 2.4;
      const d = r * (i === 0 ? 0.14 : i === 1 ? 0.52 : 0.34);
      const rx = r * (i === 1 ? 0.34 : 0.22);
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d - r * 0.08, rx, rx * 0.7, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // A dusk band across the disc for a hint of atmosphere.
    ctx.fillStyle = 'rgba(232, 228, 220, 0.06)';
    ctx.fillRect(x - r, y - r * 0.45, r * 2, r * 0.28);
    ctx.restore();

    // Crescent paper highlight, top-left, like light on a seal.
    ctx.strokeStyle = 'rgba(243, 234, 220, 0.5)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.7, Math.PI * 1.06, Math.PI * 1.58);
    ctx.stroke();
    // Brass rim — the same brass as the axis dots and the hairline.
    ctx.strokeStyle = 'rgba(196, 165, 114, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r + 1.6, 0, Math.PI * 2);
    ctx.stroke();
    // A tiny moon on a slow orbit.
    const moonAngle = (tMs - HERO_PHASES.earth) * 0.00055 - 0.5;
    ctx.fillStyle = 'rgba(214, 206, 192, 0.55)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(moonAngle) * r * 2.15, y + Math.sin(moonAngle) * r * 2.15 * 0.4, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** The hand-off brass hairline: the axis band draws the same rail below. */
  private drawHairline(ctx: CanvasRenderingContext2D, tMs: number, w: number, h: number): void {
    const p = easeInOut(clamp((tMs - HERO_PHASES.settle) / 900, 0, 1));
    if (p <= 0) return;
    const y = h * 0.875;
    const width = w * 0.86;
    const x0 = (w - width) / 2;
    const line = ctx.createLinearGradient(x0, y, x0 + width, y);
    line.addColorStop(0, 'rgba(196, 165, 114, 0)');
    line.addColorStop(0.5, `rgba(196, 165, 114, ${0.55 * p})`);
    line.addColorStop(1, 'rgba(196, 165, 114, 0)');
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + width, y);
    ctx.stroke();
  }

  private paintMotes(
    ctx: CanvasRenderingContext2D,
    place: (mote: Mote) => { x: number; y: number; alpha: number },
  ): void {
    for (const mote of this.motes) {
      const { x, y, alpha } = place(mote);
      if (alpha <= 0.02) continue;
      ctx.fillStyle = `rgba(${TINTS[mote.tint]}, ${clamp(alpha, 0, 1)})`;
      ctx.beginPath();
      ctx.arc(x, y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private twinkle(mote: Mote, tMs: number): number {
    return 0.72 + 0.28 * Math.sin(tMs * mote.twinkleRate + mote.twinklePhase);
  }
}

/**
 * Fractional-space spiral berth for a mote: two log-spiral arms, projected as
 * a slightly squashed ellipse around the galaxy centre, with differential
 * rotation (inner faster) shearing the arms over time, as real arms do.
 */
function spiralAt(mote: Mote, tMs: number, minDim: number): [number, number] {
  const settle = tMs >= HERO_PHASES.settle ? 0.55 : 1;
  const omega = 0.00009 / (1 + mote.distance * 1.35) * settle;
  const radius = minDim * (0.06 + mote.distance * 0.36);
  const wind = 5.2;
  const angle = mote.arm * Math.PI + Math.log(1 + radius / (minDim * 0.05)) * wind + omega * tMs + mote.twinklePhase * 0.4;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72 - minDim * 0.045];
}