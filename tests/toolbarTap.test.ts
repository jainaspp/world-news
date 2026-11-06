import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';

function rule(css: string, selector: string, from = 0): string {
  const at = css.indexOf(selector, from);
  expect(at, selector).toBeGreaterThanOrEqual(from);
  return css.slice(at, css.indexOf('}', at));
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

function doc(): ContentDoc {
  return {
    kind: 'compare',
    key: '2026-10-07-fare',
    title: '港鐵建議票價加幅',
    description: '多間媒體報道同一項票價建議。',
    publishedAt: '2026-10-07T02:00:00.000Z',
    hkt: '2026-10-07 10:00',
    mode: 'ai',
    blocks: [{ title: '事件經過', sentences: ['港鐵建議調整票價，並交諮詢。'], sources: [] }],
  };
}

function withLocalCss(html: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  return html.replace('</head>', `<link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head>`);
}

const NAMES = ['複製連結', 'WhatsApp', '分享', '收聽', '停止', '收藏', '語速'];

const MEASURE = `(() => {
  document.querySelectorAll('.pack-toolbar [hidden]').forEach((node) => node.removeAttribute('hidden'));
  const toolbar = document.querySelector('.pack-toolbar');
  if (!toolbar) return JSON.stringify({ missing: true });
  const bar = getComputedStyle(toolbar);
  const controls = Array.from(toolbar.querySelectorAll('button, a, select')).map((el) => {
    const rect = el.getBoundingClientRect();
    let hit = rect.height;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowY !== 'hidden' && style.overflowY !== 'clip') continue;
      const box = node.getBoundingClientRect();
      const top = Math.max(rect.top, box.top);
      const bottom = Math.min(rect.bottom, box.bottom);
      hit = Math.min(hit, Math.max(0, bottom - top));
    }
    return {
      tag: el.tagName,
      text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim(),
      h: Math.round(rect.height),
      w: Math.round(rect.width),
      hit: Math.round(hit),
    };
  });
  const sample = toolbar.querySelector('.share-copy');
  const focus = sample ? getComputedStyle(sample) : null;
  return JSON.stringify({
    innerW: window.innerWidth,
    wrap: bar.flexWrap,
    overflowX: bar.overflowX,
    overflowY: bar.overflowY,
    barH: Math.round(toolbar.getBoundingClientRect().height),
    outline: focus ? focus.outlineStyle + ' ' + focus.outlineWidth + ' ' + focus.outlineOffset : '',
    controls,
  });
})()`;

interface ControlBox {
  tag: string;
  text: string;
  h: number;
  w: number;
  hit: number;
}

interface ToolbarBox {
  missing?: boolean;
  innerW: number;
  wrap: string;
  overflowX: string;
  overflowY: string;
  barH: number;
  outline: string;
  controls: ControlBox[];
}

describe('pack toolbar tap target', () => {
  it('lifts phone toolbar controls to 44px and leaves the desktop row and the focus ring', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const desktopAt = columns.indexOf('.pack-toolbar .share-buttons .chip,');
    const desktop = rule(columns, '.pack-toolbar .share-buttons .chip,');
    const phoneAt = columns.indexOf('.pack-toolbar .share-buttons .chip,', desktopAt + 1);
    const phone = rule(columns, '.pack-toolbar .share-buttons .chip,', phoneAt);
    const mediaAt = columns.lastIndexOf('@media (max-width: 700px)', phoneAt);
    const row = rule(columns, '.pack-toolbar {\n    height: auto;');
    const focus = rule(app, '.chip:focus-visible, .icon-btn:focus-visible, .bookmark:focus-visible, .primary:focus-visible, .follow-mini:focus-visible {');

    expect(desktopAt).toBeGreaterThanOrEqual(0);
    expect(desktopAt).toBeLessThan(mediaAt);
    expect(phoneAt).toBeGreaterThan(mediaAt);
    expect(desktop).toContain('min-height: 32px');
    expect(desktop).toContain('height: 32px');
    expect(desktop).toContain('max-height: 32px');
    expect(phone).toContain('min-height: 44px');
    expect(phone).toContain('height: auto');
    expect(phone).toContain('max-height: none');
    expect(phone).toContain('.pack-toolbar .listen-rate select');
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('32px');
    expect(row).toContain('height: auto');
    expect(row).toContain('max-height: none');
    expect(row).not.toContain('outline');
    expect(columns).toContain('flex-wrap: nowrap');
    expect(columns).toContain('overflow-x: auto');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(app).toContain(':focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }');
  });

  it.skipIf(!chromeBin())('measures toolbar buttons, links, and the speed select at 390px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'toolbar-tap-'));
    await writeFile(path.join(dir, 'compare.html'), withLocalCss(renderContentPage(doc(), 'https://world-news.xyz/explainer/2026-10-07-fare/')));
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'toolbar-tap-chrome-'));
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
      async function read(width: number, dark: boolean): Promise<ToolbarBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 700 });
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark})`);
        await rpc('DOM.getDocument', { depth: 1 });
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelector', { nodeId: root.root.nodeId, selector: '.pack-toolbar .share-copy' }) as { nodeId: number };
        if (found.nodeId) await rpc('CSS.forcePseudoState', { nodeId: found.nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'compare.html')).href });
      const start = Date.now();
      let opened = false;
      while (Date.now() - start < 15000) {
        opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".pack-toolbar")').catch(() => false);
        if (opened) break;
        await sleep(30);
      }
      if (!opened) throw new Error('navigation timed out');

      for (const dark of [false, true]) {
        const box = await read(390, dark);
        const label = dark ? 'dark' : 'light';
        expect(box.missing, label).toBeUndefined();
        expect(box.innerW, label).toBe(390);
        expect(box.wrap === 'wrap' || box.overflowX === 'auto' || box.overflowX === 'scroll', JSON.stringify(box)).toBe(true);
        expect(box.outline, label).toContain('solid');
        expect(box.outline, label).toContain('3px');
        expect(box.outline, label).toContain('2px');
        expect(box.controls.map((control) => control.text), JSON.stringify(box)).toEqual(expect.arrayContaining(NAMES));
        for (const control of box.controls) {
          expect(control.h, `${label} ${control.text}`).toBeGreaterThanOrEqual(44);
          expect(control.hit, `${label} ${control.text}`).toBeGreaterThanOrEqual(44);
          expect(control.w, `${label} ${control.text}`).toBeGreaterThanOrEqual(44);
        }
      }

      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      for (const control of desktop.controls) {
        expect(control.h, `desktop ${control.text}`).toBe(32);
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
