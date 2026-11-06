import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderSearchPage } from '../shared/readerPages';

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

const SHORT = '短題';
const LONG = '這是一則故意寫長的搜尋結果標題以便看換行後的觸控高度是否已經超過四十四';

function pageHtml(): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  const html = renderSearchPage({
    q: '港',
    region: 'ALL',
    category: 'all',
    hits: [
      { kind: 'headline', title: SHORT, href: '/story/a/', source: '甲報', meta: '甲報', category: 'hk', regions: ['HK'] },
      { kind: 'headline', title: LONG, href: '/story/b/', source: '乙報', meta: '乙報', regions: ['HK'] },
    ],
  });
  return html.replace('</head>', `<link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head>`);
}

const MEASURE = `(() => {
  document.querySelectorAll('.search-bar').forEach((node) => node.classList.add('open'));
  function box(el) {
    const rect = el.getBoundingClientRect();
    let hitH = rect.height;
    let hitW = rect.width;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if (!clipsY && !clipsX) continue;
      const parent = node.getBoundingClientRect();
      if (clipsY) {
        const top = Math.max(rect.top, parent.top);
        const bottom = Math.min(rect.bottom, parent.bottom);
        hitH = Math.min(hitH, Math.max(0, bottom - top));
      }
      if (clipsX) {
        const left = Math.max(rect.left, parent.left);
        const right = Math.min(rect.right, parent.right);
        hitW = Math.min(hitW, Math.max(0, right - left));
      }
    }
    const style = getComputedStyle(el);
    return {
      cls: String(el.className || ''),
      parent: el.parentElement ? String(el.parentElement.className || '') : '',
      text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim(),
      h: Math.round(rect.height),
      w: Math.round(rect.width),
      hitH: Math.round(hitH),
      hitW: Math.round(hitW),
      minH: style.minHeight,
      display: style.display,
      outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineOffset,
    };
  }
  const toggle = document.querySelector('.search-toggle');
  const openField = document.querySelector('.search-bar.open input');
  const pageField = document.querySelector('.search-page-form input');
  const titles = Array.from(document.querySelectorAll('#search-results .story-title a'));
  return JSON.stringify({
    innerW: window.innerWidth,
    toggle: toggle ? box(toggle) : null,
    openField: openField ? box(openField) : null,
    pageField: pageField ? box(pageField) : null,
    titles: titles.map(box),
  });
})()`;

interface ControlBox {
  cls: string;
  parent: string;
  text: string;
  h: number;
  w: number;
  hitH: number;
  hitW: number;
  minH: string;
  display: string;
  outline: string;
}

interface SearchBox {
  innerW: number;
  toggle: ControlBox | null;
  openField: ControlBox | null;
  pageField: ControlBox | null;
  titles: ControlBox[];
}

describe('phone search tap target', () => {
  it('lifts the open field and result titles to 44px and leaves the desktop sizes and the focus ring', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const columns = readFileSync('public/columns.css', 'utf8');
    const phone = mediaBlock(app, '@media (max-width: 700px) {\n  .chrome { padding-bottom: 0; }');
    const open = rule(phone, '.search-bar.open input {');
    const desktopField = rule(app, '.search-bar input {');
    const desktopGate = rule(app, '@media (min-width: 701px) {\n  .search-bar input { min-height: 44px; }');
    const pageField = rule(columns, '.listen-rate select, .search-page-form input {');
    const phoneAt = columns.indexOf('@media (max-width: 700px) {\n  .chip, .pack-fold > summary');
    const phonePage = rule(columns, '.search-page-form input {', phoneAt);
    const titles = rule(columns, '#search-results .story-title a {', phoneAt);
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(open).toContain('display: block');
    expect(open).toContain('min-height: 44px');
    expect(open).not.toContain('outline');
    expect(desktopField).toContain('min-height: 40px');
    expect(desktopField).not.toContain('44px');
    expect(desktopGate).toContain('min-height: 44px');
    expect(app.indexOf('.search-bar input {')).toBeLessThan(app.indexOf('@media (max-width: 700px)'));
    expect(pageField).toContain('min-height: 40px');
    expect(pageField).not.toContain('44px');
    expect(columns.indexOf('.listen-rate select, .search-page-form input {')).toBeLessThan(phoneAt);
    expect(phonePage).toContain('min-height: 44px');
    expect(phonePage).not.toContain('outline');
    expect(titles).toContain('display: block');
    expect(titles).toContain('min-width: 44px');
    expect(titles).toContain('min-height: 44px');
    expect(titles).not.toContain('outline');
    expect(columns.indexOf('#search-results .story-title a {')).toBeGreaterThan(phoneAt);
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
  });

  it.skipIf(!chromeBin())('measures the open field and result titles at 390px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'search-tap-'));
    await writeFile(path.join(dir, 'search.html'), pageHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'search-tap-user-'));
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
      async function read(width: number, dark: boolean): Promise<SearchBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 1400, deviceScaleFactor: 1, mobile: width <= 700 });
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark}); document.querySelectorAll('.search-bar').forEach((node) => node.classList.add('open'));`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        for (const selector of ['.search-bar.open input', '.search-page-form input', '#search-results .story-title a']) {
          const found = await rpc('DOM.querySelector', { nodeId: root.root.nodeId, selector }) as { nodeId: number };
          if (found.nodeId) await rpc('CSS.forcePseudoState', { nodeId: found.nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      function title(box: SearchBox, text: string): ControlBox {
        const found = box.titles.find((item) => item.text === text);
        expect(found, text).toBeTruthy();
        return found!;
      }
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'search.html')).href });
      const start = Date.now();
      let opened = false;
      while (Date.now() - start < 15000) {
        opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector("#search-results")').catch(() => false);
        if (opened) break;
        await sleep(30);
      }
      if (!opened) throw new Error('navigation timed out');

      for (const dark of [false, true]) {
        const box = await read(390, dark);
        const label = dark ? 'dark' : 'light';
        expect(box.innerW, label).toBe(390);
        expect(box.toggle, label).toBeTruthy();
        expect(box.openField, label).toBeTruthy();
        expect(box.pageField, label).toBeTruthy();
        for (const control of [box.toggle!, box.openField!, box.pageField!, ...box.titles]) {
          const name = `${label} ${control.parent} ${control.text || control.cls}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
        }
        expect(box.openField!.minH, label).toBe('44px');
        expect(box.pageField!.minH, label).toBe('44px');
        expect(title(box, SHORT).display, label).toBe('block');
        expect(title(box, LONG).h, label).toBeGreaterThan(44);
        expect(box.openField!.outline, label).toContain('solid');
        expect(box.openField!.outline, label).toContain('3px');
        expect(box.openField!.outline, label).toContain('2px');
        expect(title(box, SHORT).outline, label).toContain('solid');
        expect(title(box, SHORT).outline, label).toContain('3px');
        expect(title(box, SHORT).outline, label).toContain('2px');
      }

      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(desktop.openField!.minH).toBe('44px');
      expect(desktop.openField!.h).toBeGreaterThanOrEqual(44);
      expect(desktop.pageField!.minH).toBe('40px');
      expect(desktop.pageField!.h).toBe(40);
      expect(title(desktop, SHORT).h).toBeLessThan(44);
      expect(title(desktop, SHORT).display).not.toBe('block');
      expect(title(desktop, SHORT).minH).toBe('0px');
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
