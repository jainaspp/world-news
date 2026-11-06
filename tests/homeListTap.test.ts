import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderHomeFeed } from '../shared/homePage';
import type { NewsItem } from '../shared/types';

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

const PHONE = '@media (max-width: 700px) {\n  /* Home list links.';

function item(id: string, extra: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `標題 ${id}`,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T02:00:00.000Z',
    category: 'hk',
    ...extra,
  };
}

function pageHtml(): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  const html = renderHomeFeed(
    [
      item('a1', { title: '港鐵宣布加價' }),
      item('b2', { title: '立法會恢復二讀' }),
    ],
    new Map([['a1', 4]]),
    null,
    '',
    null,
    '',
    undefined,
    [],
    new Date('2026-10-15T04:00:00Z'),
    false,
    { digestHref: '/digest/2026-10-15-am', analysis: true, topic: true },
  );
  return `<!doctype html>
<html lang="zh-HK">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${appCss}" />
<link rel="stylesheet" href="${columnsCss}" />
</head>
<body>
${html}
</body>
</html>`;
}

const MEASURE = `(() => {
  const deck = document.querySelector('.ig-deck');
  function show(el) {
    const card = el.closest('.ig-card');
    if (!deck || !card) return;
    deck.style.scrollBehavior = 'auto';
    deck.scrollTop = card.getBoundingClientRect().top - deck.getBoundingClientRect().top + deck.scrollTop;
  }
  function box(el) {
    show(el);
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
  return JSON.stringify({
    innerW: window.innerWidth,
    titles: Array.from(document.querySelectorAll('.rank-title')).map(box),
    packs: Array.from(document.querySelectorAll('.rank-pack')).map(box),
    originals: Array.from(document.querySelectorAll('.rank-original')).map(box),
    heats: Array.from(document.querySelectorAll('.rank-heat')).map(box),
    pins: Array.from(document.querySelectorAll('.pin-links a, .more-today a')).map(box),
  });
})()`;

interface ControlBox {
  cls: string;
  text: string;
  h: number;
  w: number;
  hitH: number;
  hitW: number;
  minH: string;
  display: string;
  outline: string;
}

interface HomeBox {
  innerW: number;
  titles: ControlBox[];
  packs: ControlBox[];
  originals: ControlBox[];
  heats: ControlBox[];
  pins: ControlBox[];
}

describe('phone home list tap target', () => {
  it('lifts list titles and side links to 44px and leaves the desktop sizes and the focus ring', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const phoneAt = app.indexOf(PHONE);
    const phone = mediaBlock(app, PHONE);
    const side = rule(phone, '.rank-pack,');
    const title = rule(phone, '.rank-title {');
    const focus = rule(app, ':focus-visible {');
    const baseTitle = rule(app, '.rank-title {\n  flex: 1 0 100%;');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('pin-links');
    expect(phone).not.toContain('more-today');
    expect(phone).not.toContain('hero');
    expect(phone).not.toContain('digest-strip');
    expect(phone).toContain('.rank-main { align-items: center; }');
    expect(side).toContain('display: inline-flex');
    expect(side).toContain('min-width: 44px');
    expect(side).toContain('min-height: 44px');
    expect(side).toContain('.rank-original');
    expect(side).toContain('.rank-heat');
    expect(title).toContain('min-width: 44px');
    expect(title).toContain('min-height: 44px');
    expect(title).not.toContain('display');
    expect(app.indexOf('.rank-title {\n    box-sizing:')).toBeGreaterThan(phoneAt);
    expect(app.indexOf(PHONE, phoneAt + PHONE.length)).toBe(-1);
    expect(baseTitle).toContain('display: -webkit-box');
    expect(baseTitle).toContain('-webkit-line-clamp: 2');
    expect(baseTitle).not.toContain('44px');
    expect(rule(app, '.rank-pack {')).not.toContain('44px');
    expect(rule(app, '.rank-heat {')).not.toContain('44px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');

    const page = renderHomeFeed(
      [item('a1', { title: '港鐵宣布加價' })],
      new Map([['a1', 4]]),
    );
    expect(page).toContain('class="rank-title"');
    expect(page).toContain('class="rank-pack"');
    expect(page).toContain('class="rank-original"');
    expect(page).toContain('class="rank-heat"');
    expect(page).toContain('aria-label="4 間媒體報道"');
  });

  it.skipIf(!chromeBin())('measures list titles and side links at 390px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'home-list-tap-'));
    await writeFile(path.join(dir, 'home.html'), pageHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'home-list-tap-user-'));
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
      async function read(width: number, dark: boolean): Promise<HomeBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 700 });
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelectorAll', {
          nodeId: root.root.nodeId,
          selector: '.rank-title, .rank-pack, .rank-original, .rank-heat',
        }) as { nodeIds: number[] };
        for (const nodeId of found.nodeIds) {
          await rpc('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'home.html')).href });
      const start = Date.now();
      let opened = false;
      while (Date.now() - start < 15000) {
        opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".rank-title")').catch(() => false);
        if (opened) break;
        await sleep(30);
      }
      if (!opened) throw new Error('navigation timed out');

      function expectPhone(box: HomeBox, label: string) {
        expect(box.innerW, label).toBe(390);
        expect(box.titles.map((control) => control.text), label).toEqual(['港鐵宣布加價', '立法會恢復二讀']);
        expect(box.packs.map((control) => control.text), label).toEqual(['懶人包']);
        expect(box.originals.map((control) => control.text), label).toEqual(['原文', '原文']);
        expect(box.heats.map((control) => control.text), label).toEqual(['4 間媒體報道']);
        expect(box.pins.length, label).toBeGreaterThan(0);
        for (const control of [...box.titles, ...box.packs, ...box.originals, ...box.heats]) {
          const name = `${label} ${control.cls} ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
          expect(control.minH, name).toBe('44px');
          expect(control.outline, name).toContain('solid');
          expect(control.outline, name).toContain('3px');
          expect(control.outline, name).toContain('2px');
        }
        for (const control of box.titles) expect(control.display, `${label} title`).not.toBe('inline-flex');
        // inline-flex blockifies to flex once the link is a flex item.
        for (const control of [...box.packs, ...box.originals, ...box.heats]) {
          expect(control.display, `${label} ${control.cls}`).toBe('flex');
        }
        for (const control of box.pins) {
          expect(control.h, `${label} pin ${control.text}`).toBeLessThan(44);
          expect(control.minH, `${label} pin ${control.text}`).not.toBe('44px');
        }
      }

      for (const dark of [false, true]) {
        expectPhone(await read(390, dark), dark ? 'dark' : 'light');
      }

      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(desktop.titles.map((control) => control.text)).toEqual(['港鐵宣布加價', '立法會恢復二讀']);
      for (const control of [...desktop.titles, ...desktop.packs, ...desktop.originals, ...desktop.heats]) {
        const name = `desktop ${control.cls} ${control.text}`;
        expect(control.h, name).toBeLessThan(44);
        expect(control.minH, name).not.toBe('44px');
      }
      for (const control of [...desktop.packs, ...desktop.originals, ...desktop.heats]) {
        expect(control.display, `desktop ${control.cls}`).not.toBe('inline-flex');
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
