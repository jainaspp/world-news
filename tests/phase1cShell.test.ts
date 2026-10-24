import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { footer } from '../shared/contentPage';
import { renderAxisBand } from '../shared/civilizationPage';

describe('Phase1c shell CSS', () => {
  const css = readFileSync('src/App.css', 'utf8');

  it('does not cap the slim hero at 300px', () => {
    const at = css.indexOf('.axis-hero.axis-slim {');
    expect(at).toBeGreaterThanOrEqual(0);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('max-height: none');
    expect(rule).not.toContain('300px');
  });

  it('gives shared footer links a 44px box and an 8px gap', () => {
    const nav = css.slice(css.indexOf('.footer-nav {'), css.indexOf('}', css.indexOf('.footer-nav {')));
    expect(nav).toContain('gap: 8px 16px');
    expect(nav).not.toContain('gap: 4px');
    const link = css.slice(css.indexOf('.footer-nav a {'), css.indexOf('}', css.indexOf('.footer-nav a {')));
    expect(link).toContain('min-width: 44px');
    expect(link).toContain('min-height: 44px');
    expect(link).toContain('display: inline-flex');
  });

  it('draws a brass segment on every wrapped axis row', () => {
    const phone = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    expect(phone).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(phone).not.toContain('.milestones::before');
    const line = phone.slice(phone.indexOf('.milestones li::before {'), phone.indexOf('}', phone.indexOf('.milestones li::before {')));
    expect(line).toContain('top: 6px');
    expect(line).toContain('height: 2px');
    expect(line).toContain('background: #c4a572');
    expect(line).toContain('pointer-events: none');
    // 7×44px nodes and 6×8px gaps do not fit the 360 content box (~328px).
    expect(7 * 44 + 6 * 8).toBeGreaterThan(360 - 32);
    expect(4 * 44 + 3 * 8).toBeLessThanOrEqual(360 - 32);
  });
});

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MEASURE = `(() => {
  function box(el) {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }
  function hides(value) { return value === 'hidden' || value === 'clip' || value === 'scroll' || value === 'auto'; }
  function clipped(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 0.5 || rect.height < 0.5) return true;
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const host = node.getBoundingClientRect();
      if (hides(style.overflowX) && (rect.left < host.left - 0.5 || rect.right > host.right + 0.5)) return true;
      if (hides(style.overflowY) && (rect.top < host.top - 0.5 || rect.bottom > host.bottom + 0.5)) return true;
    }
    return false;
  }
  function visibleHeight(el) {
    const rect = el.getBoundingClientRect();
    let top = rect.top;
    let bottom = rect.bottom;
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (!hides(style.overflowY)) continue;
      const host = node.getBoundingClientRect();
      top = Math.max(top, host.top);
      bottom = Math.min(bottom, host.bottom);
    }
    return Math.max(0, bottom - top);
  }
  function gaps(rects) {
    let minEdge = Infinity;
    let minCenter = Infinity;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const dx = Math.max(0, Math.max(a.l, b.l) - Math.min(a.r, b.r));
        const dy = Math.max(0, Math.max(a.t, b.t) - Math.min(a.b, b.b));
        const edge = dx === 0 && dy === 0 ? 0 : Math.hypot(dx, dy);
        const center = Math.hypot((a.l + a.r) / 2 - (b.l + b.r) / 2, (a.t + a.b) / 2 - (b.t + b.b) / 2);
        if (edge < minEdge) minEdge = edge;
        if (center < minCenter) minCenter = center;
      }
    }
    return {
      minEdge: Number.isFinite(minEdge) ? Math.round(minEdge * 10) / 10 : null,
      minCenter: Number.isFinite(minCenter) ? Math.round(minCenter * 10) / 10 : null,
    };
  }
  function round(n) { return Math.round(n * 10) / 10; }
  const heroes = Array.from(document.querySelectorAll('.axis-hero')).map((hero) => {
    const ctas = Array.from(hero.querySelectorAll('.axis-cta a')).map((node) => {
      const rect = box(node);
      return { text: node.textContent || '', w: round(rect.w), h: round(rect.h), visible: round(visibleHeight(node)), clipped: clipped(node) };
    });
    const nodes = Array.from(hero.querySelectorAll('.milestones > li')).map((li) => {
      const anchor = li.querySelector('.axis-node');
      const dot = li.querySelector('.dot');
      const lab = li.querySelector('.lab');
      const yr = li.querySelector('.yr');
      const rect = box(anchor);
      const before = getComputedStyle(li, '::before');
      let off = null;
      if (before.content !== 'none' && before.display !== 'none' && dot) {
        const dotBox = dot.getBoundingClientRect();
        const lineCenter = li.getBoundingClientRect().top + parseFloat(before.top) + parseFloat(before.height) / 2;
        off = round(Math.abs((dotBox.top + dotBox.bottom) / 2 - lineCenter));
      }
      const rail = hero.querySelector('.rail');
      const railBox = rail ? rail.getBoundingClientRect() : null;
      const dotBox = dot ? dot.getBoundingClientRect() : null;
      const onRail = !railBox || railBox.height < 0.5 || !dotBox
        ? null
        : dotBox.top <= railBox.bottom + 0.5 && dotBox.bottom >= railBox.top - 0.5;
      return {
        text: lab ? lab.textContent : '',
        w: round(rect.w),
        h: round(rect.h),
        clipped: clipped(lab) || clipped(yr),
        outside: rect.l < -0.5 || rect.r > window.innerWidth + 0.5,
        off,
        onRail,
      };
    });
    const style = getComputedStyle(hero);
    return {
      slim: hero.classList.contains('axis-slim'),
      maxHeight: style.maxHeight,
      scrollGap: hero.scrollHeight - hero.clientHeight,
      ctas,
      nodes,
      nodeGaps: gaps(nodes.map((_, index) => box(hero.querySelectorAll('.milestones > li > .axis-node')[index]))),
    };
  });
  const footerLinks = Array.from(document.querySelectorAll('.footer-nav a')).filter((node) => getComputedStyle(node).display !== 'none');
  const footerBoxes = footerLinks.map(box);
  return JSON.stringify({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    heroes,
    footer: footerLinks.map((node, index) => ({ text: node.textContent, w: round(footerBoxes[index].w), h: round(footerBoxes[index].h) })),
    footerGaps: gaps(footerBoxes),
  });
})()`;

describe('Phase1c shell geometry', () => {
  it.skipIf(!chromeBin())('keeps slim CTAs, footer targets, and wrapped dots on the brass track', async () => {
    const port = await freePort();
    const dir = await mkdtemp(path.join(tmpdir(), 'phase1c-chrome-'));
    const bin = chromeBin();
    const chrome: ChildProcess = spawn(bin, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-background-networking',
      `--user-data-dir=${dir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    chrome.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    const started = Date.now();
    let version = '';
    while (Date.now() - started < 12000) {
      if (chrome.exitCode != null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (response.ok) {
          version = await response.text();
          break;
        }
      } catch { /* devtools not up yet */ }
      await sleep(40);
    }
    if (!version) {
      chrome.kill('SIGKILL');
      throw new Error(`chrome did not start\n${stderr.slice(-800)}`);
    }
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()) as { type: string; webSocketDebuggerUrl: string }[];
      const page = targets.find((target) => target.type === 'page');
      if (!page) throw new Error('chrome has no page target');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener('open', () => resolve());
        ws.addEventListener('error', () => reject(new Error('devtools websocket failed')));
      });
      let seq = 0;
      const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
      ws.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: unknown };
        if (!message.id || !pending.has(message.id)) return;
        const waiter = pending.get(message.id)!;
        pending.delete(message.id);
        if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
        else waiter.resolve(message.result);
      });
      function rpc(method: string, params: object = {}): Promise<unknown> {
        const id = ++seq;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          ws.send(JSON.stringify({ id, method, params }));
        });
      }
      await rpc('Runtime.enable');
      await rpc('Page.enable');
      const appCss = pathToFileURL(path.resolve('src/App.css')).href;
      const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
      const nav = footer(false).replace('class="subscribe-telegram" hidden', 'class="subscribe-telegram" href="https://t.me/world_news_channel_forever"');
      const html = `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8" /><link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head><body class="static"><div class="page">${renderAxisBand({ rails: false, asHeading: false })}${renderAxisBand({ asHeading: false })}${nav}</div></body></html>`;
      await writeFile(path.join(dir, 'shell.html'), html);
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'shell.html')).href });
      const readyAt = Date.now();
      while (Date.now() - readyAt < 8000) {
        const result = await rpc('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }) as { result?: { value?: string } };
        if (result.result?.value === 'complete') break;
        await sleep(30);
      }
      async function read(width: number, height: number, dark: boolean) {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await rpc('Runtime.evaluate', {
          expression: `document.documentElement.classList.toggle('dark', ${dark})`,
          returnByValue: true,
        });
        await rpc('Runtime.evaluate', {
          expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
          awaitPromise: true,
        });
        const result = await rpc('Runtime.evaluate', { expression: MEASURE, returnByValue: true }) as {
          result?: { value?: string };
          exceptionDetails?: unknown;
        };
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return JSON.parse(result.result?.value || '{}') as Measure;
      }
      for (const width of [360, 390, 414, 640, 720, 768, 1024]) {
        for (const dark of width === 390 || width === 360 ? [false, true] : [false]) {
          const height = width === 640 ? 360 : 900;
          const sample = await read(width, height, dark);
          const where = `${width}${dark ? ' dark' : ' light'}`;
          expect(sample.scrollWidth, where).toBe(sample.clientWidth);
          expect(sample.footer.length, where).toBeGreaterThanOrEqual(13);
          for (const link of sample.footer) {
            expect(link.w, `${where} ${link.text}`).toBeGreaterThanOrEqual(44);
            expect(link.h, `${where} ${link.text}`).toBeGreaterThanOrEqual(44);
          }
          expect(sample.footerGaps.minEdge ?? 0, where).toBeGreaterThanOrEqual(8);
          expect(sample.footerGaps.minCenter ?? 0, where).toBeGreaterThanOrEqual(44);
          expect(sample.heroes, where).toHaveLength(2);
          for (const hero of sample.heroes) {
            expect(hero.scrollGap, `${where} slim=${hero.slim}`).toBeLessThanOrEqual(1);
            if (hero.slim) expect(hero.maxHeight, where).toBe('none');
            for (const cta of hero.ctas) {
              expect(cta.h, `${where} ${cta.text}`).toBeGreaterThanOrEqual(44);
              expect(cta.visible, `${where} ${cta.text}`).toBeGreaterThanOrEqual(cta.h - 0.5);
              expect(cta.clipped, `${where} ${cta.text}`).toBe(false);
            }
            expect(hero.nodes.map((node) => node.text), where).toEqual(['宇宙', '地球', '起源', '技術', '城市', '今天', '未來']);
            for (const node of hero.nodes) {
              expect(node.w, `${where} ${node.text}`).toBeGreaterThanOrEqual(44);
              expect(node.h, `${where} ${node.text}`).toBeGreaterThanOrEqual(44);
              expect(node.clipped, `${where} ${node.text}`).toBe(false);
              expect(node.outside, `${where} ${node.text}`).toBe(false);
              if (width <= 640) expect(node.off, `${where} ${node.text}`).toBeLessThanOrEqual(1);
              else expect(node.onRail, `${where} ${node.text}`).toBe(true);
            }
            if (width <= 640) {
              expect(hero.nodeGaps.minEdge ?? 0, where).toBeGreaterThanOrEqual(8);
              expect(hero.nodeGaps.minCenter ?? 0, where).toBeGreaterThanOrEqual(44);
            }
          }
        }
      }
      ws.close();
    } finally {
      if (chrome.exitCode == null) chrome.kill('SIGKILL');
      await sleep(50);
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 40_000);
});

interface Measure {
  width: number;
  scrollWidth: number;
  clientWidth: number;
  heroes: Array<{
    slim: boolean;
    maxHeight: string;
    scrollGap: number;
    ctas: Array<{ text: string; w: number; h: number; visible: number; clipped: boolean }>;
    nodes: Array<{ text: string; w: number; h: number; clipped: boolean; outside: boolean; off: number | null; onRail: boolean | null }>;
    nodeGaps: { minEdge: number | null; minCenter: number | null };
  }>;
  footer: Array<{ text: string; w: number; h: number }>;
  footerGaps: { minEdge: number | null; minCenter: number | null };
}
