import type { OpeningCue, SkyStar } from '../../shared/civilization/openingHero';

/**
 * One plate, one pass. No shadowBlur: it wrecks fill-rate on a phone.
 * The disc is a diagram — ocean, two paper-colored masses, a cloud — not a map.
 */

function paintEarth(ctx: CanvasRenderingContext2D, cx: number, cy: number, er: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const atmo = ctx.createRadialGradient(cx, cy, er * 0.86, cx, cy, er * 1.55);
  atmo.addColorStop(0, 'rgba(74, 127, 181, 0)');
  atmo.addColorStop(0.62, 'rgba(74, 127, 181, 0.38)');
  atmo.addColorStop(1, 'rgba(74, 127, 181, 0)');
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(cx, cy, er * 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, er, 0, Math.PI * 2);
  ctx.clip();

  const ocean = ctx.createRadialGradient(cx - er * 0.34, cy - er * 0.4, er * 0.08, cx, cy, er * 1.05);
  ocean.addColorStop(0, '#3c86a6');
  ocean.addColorStop(0.42, '#1a4a62');
  ocean.addColorStop(1, '#0c1e2a');
  ctx.fillStyle = ocean;
  ctx.fillRect(cx - er, cy - er, er * 2, er * 2);

  ctx.fillStyle = '#d2c09a';
  ctx.beginPath();
  ctx.ellipse(cx - er * 0.32, cy - er * 0.18, er * 0.2, er * 0.11, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + er * 0.18, cy + er * 0.26, er * 0.24, er * 0.1, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b79a6e';
  ctx.beginPath();
  ctx.ellipse(cx - er * 0.02, cy + er * 0.02, er * 0.11, er * 0.07, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(247, 241, 230, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx - er * 0.38, cy - er * 0.4, er * 0.12, er * 0.06, -0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(247, 241, 230, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx + er * 0.12, cy - er * 0.34, er * 0.26, er * 0.04, 0.25, 0, Math.PI * 2);
  ctx.fill();

  const night = ctx.createLinearGradient(cx - er * 0.2, cy - er, cx + er, cy + er * 0.4);
  night.addColorStop(0, 'rgba(6, 10, 16, 0)');
  night.addColorStop(0.58, 'rgba(6, 10, 16, 0.04)');
  night.addColorStop(1, 'rgba(6, 10, 16, 0.58)');
  ctx.fillStyle = night;
  ctx.fillRect(cx - er, cy - er, er * 2, er * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, er, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(232, 228, 220, 0.4)';
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();
}

export function paintSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cue: OpeningCue,
  stars: readonly SkyStar[],
): void {
  const w = width;
  const h = height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#161c24';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.46;
  const unit = Math.min(w, h);

  const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.78);
  wash.addColorStop(0, `rgba(196, 165, 114, ${0.16 * Math.max(cue.core, 0.25)})`);
  wash.addColorStop(0.5, `rgba(74, 127, 181, ${0.07 * cue.earth})`);
  wash.addColorStop(1, 'rgba(22, 28, 36, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  if (cue.spawn > 0.35) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.62);
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, unit * 0.5 * cue.spawn);
    haze.addColorStop(0, `rgba(196, 165, 114, ${0.13 * cue.spawn * (1 - cue.earth * 0.65)})`);
    haze.addColorStop(0.45, `rgba(74, 127, 181, ${0.05 * cue.spawn})`);
    haze.addColorStop(1, 'rgba(22, 28, 36, 0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(0, 0, unit * 0.5 * cue.spawn, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (cue.spawn > 0.02) {
    const shrink = unit < 220 ? 0.8 : 1;
    for (const star of stars) {
      const twist = star.radius * 3.35;
      const ang = star.angle + twist + cue.spin;
      const rad = star.radius * unit * 0.5 * cue.spawn;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.62;
      const fade = star.alpha * (1 - cue.earth * 0.62);
      let color = `rgba(158, 184, 212, ${fade})`;
      if (star.radius < 0.38) color = `rgba(196, 165, 114, ${fade})`;
      else if (star.radius < 0.68) color = `rgba(232, 228, 220, ${fade})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.4, star.size * shrink), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (cue.ring > 0.02 && cue.ring < 0.98 && cue.earth < 0.3) {
    const bloomReach = unit * (0.05 + cue.ring * 0.58);
    const bloomAlpha = Math.sin(Math.min(1, cue.ring) * Math.PI) * 0.1;
    const bloom = ctx.createRadialGradient(cx, cy, bloomReach * 0.15, cx, cy, bloomReach);
    bloom.addColorStop(0, `rgba(247, 241, 230, ${bloomAlpha})`);
    bloom.addColorStop(1, 'rgba(247, 241, 230, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(cx, cy, bloomReach, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const local = Math.max(0, Math.min(1, cue.ring * 1.2 - i * 0.14));
      if (local <= 0) continue;
      const radius = unit * (0.05 + local * (0.22 + i * 0.11));
      const alpha = (1 - local) * 0.5 * (1 - cue.earth);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = i === 1 ? `rgba(196, 165, 114, ${alpha})` : `rgba(247, 241, 230, ${alpha})`;
      ctx.lineWidth = i === 0 ? 1.6 : 1;
      ctx.stroke();
    }
  }

  if (cue.core > 0.04) {
    const breathe = cue.settled ? 1 : 1 + Math.sin(cue.elapsed / 420) * 0.045;
    const radius = Math.max(1.5, unit * 0.016 * breathe * (1 + cue.ring * 0.35));
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 9);
    glow.addColorStop(0, `rgba(247, 241, 230, ${0.95 * cue.core})`);
    glow.addColorStop(0.18, `rgba(196, 165, 114, ${0.5 * cue.core})`);
    glow.addColorStop(1, 'rgba(196, 165, 114, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(247, 241, 230, ${cue.core})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (cue.earth > 0.01) paintEarth(ctx, cx, cy, unit * 0.22, cue.earth);

  const vig = ctx.createRadialGradient(cx, cy, unit * 0.28, cx, cy, Math.max(w, h) * 0.68);
  vig.addColorStop(0, 'rgba(22, 28, 36, 0)');
  vig.addColorStop(1, 'rgba(22, 28, 36, 0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  if (cue.filament > 0.01) {
    const er = unit * 0.22;
    const y0 = cy + er * 0.9;
    const y1 = h - 12;
    const y = y0 + (y1 - y0) * cue.filament;
    const grad = ctx.createLinearGradient(cx, y0, cx, y1);
    grad.addColorStop(0, 'rgba(196, 165, 114, 0.05)');
    grad.addColorStop(1, `rgba(232, 228, 220, ${0.9 * cue.filament})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, y);
    ctx.stroke();
    ctx.fillStyle = '#f7f1e6';
    ctx.beginPath();
    ctx.arc(cx, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a572';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (cue.filament > 0.66) {
      ctx.strokeStyle = `rgba(141, 122, 170, ${0.45 * cue.filament})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 18, h - 8);
      ctx.lineTo(cx + 18, h - 8);
      ctx.stroke();
    }
  }
}
