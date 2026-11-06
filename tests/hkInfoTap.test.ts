import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderAboutPage } from '../shared/sitePages';

function rule(css: string, selector: string, from = 0): string {
  const at = css.indexOf(selector, from);
  expect(at, selector).toBeGreaterThanOrEqual(from);
  return css.slice(at, css.indexOf('}', at));
}

function mediaBlock(css: string, start: string): string {
  const at = css.indexOf(start);
  expect(at, start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = at; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(at, i + 1);
    }
  }
  expect(depth, start).toBe(0);
  return '';
}

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
      if (!address || typeof address === 'string') {
        reject(new Error('no port'));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PHONE = '@media (max-width: 700px) {\n  .chrome { padding-bottom: 0; }';
const EMPTY = '<div class="hk-info column-hk" id="hk-info" hidden aria-label="香港天氣與恒生指數"></div>';
const FILLED = '<div class="hk-info column-hk" id="hk-info" aria-label="香港天氣與恒生指數"><a class="hk-info-wx" href="https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm">26°C · 空氣質素 3</a><span class="hk-info-sep" aria-hidden="true">|</span><a class="hk-info-hsi hsi-up" href="https://finance.yahoo.com/quote/%5EHSI/">恒生 19,200.00  +1.20%</a><span class="hk-info-sep" aria-hidden="true">|</span><a class="hk-info-tick" href="https://example.com/oil">油 80.10</a></div>';

function pageHtml(): string {
  const html = renderAboutPage().replace(EMPTY, FILLED);
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  return html.replace('</head>', `<link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head>`);
}

const MEASURE = `(() => {
  function box(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = el.getBoundingClientRect();
    let hitH = rect.height;
    let hitW = rect.width;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if (!clipsY && !clipsX) continue;
      const parent = node.getBoundingClientRect();
      if (clipsY) hitH = Math.min(hitH, Math.max(0, Math.min(rect.bottom, parent.bottom) - Math.max(rect.top, parent.top)));
      if (clipsX) hitW = Math.min(hitW, Math.max(0, Math.min(rect.right, parent.right) - Math.max(rect.left, parent.left)));
    }
    const style = getComputedStyle(el);
    const bar = el.closest('.hk-info').getBoundingClientRect();
    return {
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
      h: Math.round(rect.height),
      w: Math.round(rect.width),
      hitH: Math.round(hitH),
      hitW: Math.round(hitW),
      top: Math.round(rect.top),
      left: Math.round(el.offsetLeft),
      right: Math.round(el.offsetLeft + el.offsetWidth),
      bottom: Math.round(rect.bottom),
      minH: style.minHeight,
      minW: style.minWidth,
      display: style.display,
      outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineOffset,
      barH: Math.round(bar.height),
    };
  }
  return JSON.stringify({
    innerW: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    links: Array.from(document.querySelectorAll('.hk-info a')).map(box),
  });
})()`;

interface ControlBox {
  text: string;
  h: number;
  w: number;
  hitH: number;
  hitW: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  minH: string;
  minW: string;
  display: string;
  outline: string;
  barH: number;
}

function separated(a: ControlBox, b: ControlBox): boolean {
  return a.right <= b.left || b.right <= a.left;
}

describe('weather strip tap target', () => {
  it('lifts the phone strip links to 44px and leaves the desktop line and the focus ring', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const phone = mediaBlock(app, PHONE);
    const links = rule(phone, '.hk-info a {');
    const base = rule(app, '.hk-info a { color: inherit;');
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(links).toContain('display: inline-flex');
    expect(links).toContain('align-items: center');
    expect(links).toContain('box-sizing: border-box');
    expect(links).toContain('min-width: 44px');
    expect(links).toContain('min-height: 44px');
    expect(links).not.toContain('outline');
    expect(links).not.toContain('hero');
    expect(links).not.toContain('home-sections');
    expect(links).not.toContain('civ-slot');
    expect(links).not.toContain('topic-wires');
    expect(base).not.toContain('44px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(renderAboutPage()).toContain(EMPTY);
  });

  it.skipIf(!chromeBin())('measures the weather strip at 390px and leaves the desktop line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hk-info-tap-'));
    await writeFile(path.join(dir, 'about.html'), pageHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'hk-info-tap-user-'));
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
      await rpc('DOM.enable');
      await rpc('CSS.enable');
      async function evaluate<T>(expression: string): Promise<T> {
        const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }) as {
          result?: { value?: T };
          exceptionDetails?: unknown;
        };
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result?.value as T;
      }
      async function read(width: number, dark: boolean): Promise<{ innerW: number; scrollW: number; links: ControlBox[] }> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 700 });
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'about.html')).href });
        const start = Date.now();
        let opened = false;
        while (Date.now() - start < 15000) {
          opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".hk-info a")').catch(() => false);
          if (opened) break;
          await sleep(30);
        }
        if (!opened) throw new Error('navigation timed out');
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelectorAll', { nodeId: root.root.nodeId, selector: '.hk-info a' }) as { nodeIds: number[] };
        for (const nodeId of found.nodeIds) {
          await rpc('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }

      for (const dark of [false, true]) {
        const box = await read(390, dark);
        const label = dark ? 'dark' : 'light';
        expect(box.innerW, label).toBe(390);
        expect(box.scrollW, label).toBeLessThanOrEqual(390);
        expect(box.links.map((link) => link.text), label).toEqual(['26°C · 空氣質素 3', '恒生 19,200.00 +1.20%', '油 80.10']);
        for (const link of box.links) {
          const name = `${label} ${link.text}`;
          expect(link.h, name).toBeGreaterThanOrEqual(44);
          expect(link.w, name).toBeGreaterThanOrEqual(44);
          expect(link.hitH, name).toBe(link.h);
          expect(link.hitW, name).toBe(link.w);
          expect(link.minH, name).toBe('44px');
          expect(link.minW, name).toBe('44px');
          expect(link.display, name).toBe('flex');
          expect(link.barH, name).toBeGreaterThanOrEqual(44);
          expect(link.outline, name).toContain('solid');
          expect(link.outline, name).toContain('3px');
          expect(link.outline, name).toContain('2px');
        }
        const [weather, index, tick] = box.links;
        expect(separated(weather, index), `${label} weather/index`).toBe(true);
        expect(separated(index, tick), `${label} index/tick`).toBe(true);
      }

      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(desktop.scrollW).toBeLessThanOrEqual(1100);
      expect(desktop.links.map((link) => link.text)).toEqual(['26°C · 空氣質素 3', '恒生 19,200.00 +1.20%', '油 80.10']);
      for (const link of desktop.links) {
        expect(link.h, `desktop ${link.text}`).toBeLessThan(44);
        expect(link.minH, `desktop ${link.text}`).not.toBe('44px');
        expect(link.display, `desktop ${link.text}`).not.toBe('flex');
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
