import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderAxisBand, renderCivilizationHub } from '../shared/civilizationPage';
import { chrome as renderChrome } from '../shared/contentPage';
import { renderHomeFeed } from '../shared/homePage';

function lin(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return 0.2126 * lin((value >> 16) & 255) + 0.7152 * lin((value >> 8) & 255) + 0.0722 * lin(value & 255);
  };
  const [hi, lo] = [lum(foreground), lum(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

function withLocalCss(html: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  return html
    .replaceAll('href="/site.css"', `href="${appCss}"`)
    .replaceAll('href="/columns.css"', `href="${columnsCss}"`)
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
}

interface MicroBox {
  missing?: boolean;
  w: number;
  h: number;
  left: number;
  right: number;
  color: string;
  bg: string;
  ink: string;
  outline: string;
  outlineWidth: string;
  outlineOffset: string;
  heroOverlap: boolean;
  gap: number;
  inDeck: boolean;
  nodes: string[];
  chips: string[];
  scrollW: number;
  clientW: number;
  innerW: number;
}

const MEASURE = `(() => {
  document.body.classList.add('static');
  const link = document.querySelector('.axis-micro a');
  if (!link) return JSON.stringify({ missing: true });
  const card = link.closest('.ig-card');
  const deck = document.querySelector('.ig-deck');
  if (deck && card) {
    deck.style.scrollBehavior = 'auto';
    const deckBox = deck.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    deck.scrollTop += cardBox.top - deckBox.top;
  }
  const linkBox = link.getBoundingClientRect();
  const hero = (card || document).querySelector('.axis-hero');
  const heroBox = hero ? hero.getBoundingClientRect() : null;
  const deckBox = deck ? deck.getBoundingClientRect() : null;
  function overlap(a, b) {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 0.5 && y > 0.5;
  }
  const nodes = Array.from(document.querySelectorAll('.axis-node'))
    .filter((node) => overlap(linkBox, node.getBoundingClientRect()))
    .map((node) => (node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24));
  const chips = Array.from(document.querySelectorAll('.chip'))
    .filter((chip) => overlap(linkBox, chip.getBoundingClientRect()))
    .map((chip) => (chip.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24));
  const cs = getComputedStyle(link);
  return JSON.stringify({
    w: Math.round(linkBox.width * 10) / 10,
    h: Math.round(linkBox.height * 10) / 10,
    left: Math.round(linkBox.left * 10) / 10,
    right: Math.round(linkBox.right * 10) / 10,
    color: cs.color,
    bg: cs.backgroundColor,
    ink: getComputedStyle(document.documentElement).getPropertyValue('--civ-link-on-ink').trim(),
    outline: cs.outlineColor,
    outlineWidth: cs.outlineWidth,
    outlineOffset: cs.outlineOffset,
    heroOverlap: heroBox ? overlap(linkBox, heroBox) : true,
    gap: heroBox ? Math.round((linkBox.top - heroBox.bottom) * 10) / 10 : 0,
    inDeck: deckBox
      ? linkBox.top >= deckBox.top - 1 && linkBox.bottom <= deckBox.bottom + 1 && linkBox.left >= deckBox.left - 1 && linkBox.right <= deckBox.right + 1
      : false,
    nodes,
    chips,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    innerW: window.innerWidth,
  });
})()`;

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

describe('axis 開蒙 microlink focus', () => {
  it('keeps the focus ring on the axis plate and the 44px target clear at 390', async () => {
    const css = readFileSync('src/App.css', 'utf8');
    const link = rule(css, '.axis-micro a {');
    const focus = rule(css, '.axis-micro a:focus-visible {');
    const plate = '#161c24';
    const lightPage = '#f4f6f8';
    const darkPage = '#0e141c';
    expect(link).toContain('min-width: 44px');
    expect(link).toContain('min-height: 44px');
    expect(link).toContain(`color: #c4a572`);
    expect(link).toContain(`background: ${plate}`);
    expect(contrast('#c4a572', plate)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#c4a572', lightPage)).toBeLessThan(4.5);
    expect(contrast('#c4a572', darkPage)).toBeGreaterThanOrEqual(4.5);
    expect(focus).toContain('outline: 3px solid var(--civ-link-on-ink)');
    expect(focus).toContain('outline-offset: -3px');
    expect(contrast('#9ec0ef', plate)).toBeGreaterThanOrEqual(3);
    expect(contrast('#9ec0ef', darkPage)).toBeGreaterThanOrEqual(3);
    expect(contrast('#1d4f91', plate)).toBeLessThan(3);
    expect(contrast('#1d4f91', darkPage)).toBeLessThan(3);
    expect(contrast('#9ec0ef', lightPage)).toBeLessThan(3);
    expect(rule(css, '.axis-micro {')).toContain('padding: 18px 16px 0');
    expect(css).toContain('.page.ig-snap .ig-sheet > .axis-micro { margin-top: -12px; }');
    expect(css).toContain('.page.ig-snap .ig-card .axis-micro {\n  flex: 0 0 auto;\n  min-height: 44px;');
    if (!chromeBin()) return;

    const appCss = pathToFileURL(path.resolve('src/App.css')).href;
    const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
    const head = `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${appCss}"><link rel="stylesheet" href="${columnsCss}"></head><body class="static">`;
    const home = `${head}${renderHomeFeed([])}</body></html>`;
    const mount = `${head}<div class="page ig-snap">${renderChrome('home')}<main class="ig-frame"><div class="ig-deck civ-home" id="ig-deck"><div class="ig-card ig-card-axis"><div class="axis-mount">${renderAxisBand({ asHeading: true, strip: false, rails: false })}</div></div></div></main></div></body></html>`;
    const hub = withLocalCss(renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html).replace('<body>', '<body class="static">');
    const dir = await mkdtemp(path.join(tmpdir(), 'axis-micro-'));
    await writeFile(path.join(dir, 'home.html'), home);
    await writeFile(path.join(dir, 'mount.html'), mount);
    await writeFile(path.join(dir, 'hub.html'), hub);
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'axis-micro-chrome-'));
    const browser: ChildProcess = spawn(chromeBin(), [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      `--user-data-dir=${userDir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const started = Date.now();
      let version = '';
      while (Date.now() - started < 12000) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/json/version`);
          if (response.ok) { version = await response.text(); break; }
        } catch { /* devtools not up yet */ }
        await sleep(40);
      }
      if (!version) throw new Error('chrome did not start');
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
      async function evaluate<T>(expression: string): Promise<T> {
        const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }) as {
          result?: { value?: T };
          exceptionDetails?: unknown;
        };
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result?.value as T;
      }
      async function applyWidth() {
        await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      }
      async function open(file: string) {
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, file)).href });
        const start = Date.now();
        while (Date.now() - start < 15000) {
          await applyWidth();
          const ready = await evaluate<boolean>(`(() => {
            const node = document.querySelector('.axis-micro a');
            return document.readyState === 'complete' && window.innerWidth === 390 && !!node && getComputedStyle(node).backgroundColor === 'rgb(22, 28, 36)';
          })()`).catch(() => false);
          if (ready) return;
          await sleep(30);
        }
        throw new Error(`navigation timed out: ${file}`);
      }
      async function read(dark: boolean): Promise<MicroBox> {
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark})`);
        await rpc('DOM.enable');
        await rpc('CSS.enable');
        const doc = await rpc('DOM.getDocument', { depth: 1 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.axis-micro a' }) as { nodeId: number };
        if (!found.nodeId) throw new Error('axis microlink is missing from the document');
        await rpc('CSS.forcePseudoState', { nodeId: found.nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      await applyWidth();
      for (const file of ['home.html', 'mount.html', 'hub.html']) {
        await open(file);
        for (const dark of [false, true]) {
          const box = await read(dark);
          const label = `${file} ${dark ? 'dark' : 'light'}`;
          expect(box.missing, label).toBeUndefined();
          expect(box.innerW, label).toBe(390);
          expect(box.w, JSON.stringify(box)).toBeGreaterThanOrEqual(44);
          expect(box.h, JSON.stringify(box)).toBeGreaterThanOrEqual(44);
          expect(box.left, label).toBeGreaterThanOrEqual(-1);
          expect(box.right, label).toBeLessThanOrEqual(391);
          expect(box.color, label).toBe('rgb(196, 165, 114)');
          expect(box.bg, label).toBe('rgb(22, 28, 36)');
          expect(box.ink.toLowerCase(), label).toBe('#9ec0ef');
          expect(box.outline, label).toBe('rgb(158, 192, 239)');
          expect(box.outlineWidth, label).toBe('3px');
          expect(box.outlineOffset, label).toBe('-3px');
          expect(box.gap, JSON.stringify(box)).toBeGreaterThanOrEqual(18);
          expect(box.heroOverlap, JSON.stringify(box)).toBe(false);
          expect(box.inDeck, JSON.stringify(box)).toBe(true);
          expect(box.nodes, JSON.stringify(box)).toEqual([]);
          expect(box.chips, JSON.stringify(box)).toEqual([]);
          expect(box.scrollW, label).toBeLessThanOrEqual(box.clientW + 1);
        }
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
