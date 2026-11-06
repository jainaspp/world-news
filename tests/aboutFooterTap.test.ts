import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderAboutPage, renderContactPage, renderPrivacyPage, renderTermsPage } from '../shared/sitePages';

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

const PHONE = '@media (max-width: 700px) {\n  /* Site footer sentence.';

function aboutHtml(): string {
  const html = renderAboutPage();
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
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
      h: Math.round(rect.height),
      w: Math.round(rect.width),
      hitH: Math.round(hitH),
      hitW: Math.round(hitW),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      minH: style.minHeight,
      minW: style.minWidth,
      display: style.display,
      outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineOffset,
      scrollH: el.scrollHeight,
    };
  }
  return JSON.stringify({
    innerW: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    footer: Array.from(document.querySelectorAll('.app-footer > p a')).map(box),
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
  scrollH: number;
}

interface PageBox {
  innerW: number;
  scrollW: number;
  footer: ControlBox[];
}

function separated(a: ControlBox, b: ControlBox): boolean {
  return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
}

describe('about footer sentence tap target', () => {
  it('lifts the short phone footer links to 44px and leaves the desktop line and the focus ring', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const phone = mediaBlock(columns, PHONE);
    const links = rule(phone, '.page.column-page[data-kind="site"] .app-footer > p a {');
    const baseFooter = rule(app, '.app-footer { display: grid;');
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(columns.indexOf(PHONE, columns.indexOf(PHONE) + PHONE.length)).toBe(-1);
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('data-kind="topic"');
    expect(phone).not.toContain('data-kind="analysis"');
    expect(phone).not.toContain('home-sections');
    expect(phone).not.toContain('civ-slot');
    expect(phone).not.toContain('hero');
    expect(phone).not.toContain('footer-nav');
    expect(phone).not.toContain('feed-sources');
    expect(phone).not.toContain('a[href=');
    expect(links).toContain('.page.column-page[data-kind="site"] .app-footer > p a');
    expect(links).toContain('display: inline-flex');
    expect(links).toContain('align-items: center');
    expect(links).toContain('box-sizing: border-box');
    expect(links).toContain('max-width: 100%');
    expect(links).toContain('min-width: 44px');
    expect(links).toContain('min-height: 44px');
    expect(links).not.toContain('outline');
    expect(baseFooter).toContain('gap: 8px');
    expect(baseFooter).not.toContain('44px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');

    for (const page of [renderAboutPage(), renderPrivacyPage(), renderTermsPage(), renderContactPage()]) {
      expect(page).toContain('data-kind="site"');
      expect(page).toContain('href="/data/">數據</a>');
      expect(page).toContain('href="/major/">重大更新</a>');
      expect(page).toContain('href="https://world-news.xyz">world-news.xyz</a>');
    }
  });

  it.skipIf(!chromeBin())('measures the about footer sentence at 390px and leaves the desktop line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'about-footer-tap-'));
    await writeFile(path.join(dir, 'about.html'), aboutHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'about-footer-tap-user-'));
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
      async function read(width: number, dark: boolean): Promise<PageBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 700 });
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'about.html')).href });
        const start = Date.now();
        let opened = false;
        while (Date.now() - start < 15000) {
          opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".app-footer > p a[href=\\"/major/\\"]")').catch(() => false);
          if (opened) break;
          await sleep(30);
        }
        if (!opened) throw new Error('navigation timed out');
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelectorAll', {
          nodeId: root.root.nodeId,
          selector: '.app-footer > p a',
        }) as { nodeIds: number[] };
        for (const nodeId of found.nodeIds) {
          await rpc('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }

      function expectPhone(box: PageBox, label: string) {
        expect(box.innerW, label).toBe(390);
        expect(box.scrollW, label).toBeLessThanOrEqual(390);
        expect(box.footer.map((control) => control.text), label).toEqual(['world-news.xyz', '數據', '重大更新']);
        const [site, data, major] = box.footer;
        for (const control of [site, data, major]) {
          const name = `${label} ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBe(control.h);
          expect(control.hitW, name).toBe(control.w);
          expect(control.minH, name).toBe('44px');
          expect(control.minW, name).toBe('44px');
          expect(control.display, name).toBe('inline-flex');
          expect(control.outline, name).toContain('solid');
          expect(control.outline, name).toContain('3px');
          expect(control.outline, name).toContain('2px');
          expect(control.scrollH, name).toBeLessThanOrEqual(control.h + 1);
        }
        expect(separated(site, data), `${label} site/data`).toBe(true);
        expect(separated(data, major), `${label} data/major`).toBe(true);
        expect(separated(site, major), `${label} site/major`).toBe(true);
      }

      for (const dark of [false, true]) {
        expectPhone(await read(390, dark), dark ? 'dark' : 'light');
      }
      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(desktop.footer.map((control) => control.text)).toEqual(['world-news.xyz', '數據', '重大更新']);
      for (const control of desktop.footer) {
        expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
        expect(control.minH, `desktop ${control.text}`).not.toBe('44px');
        expect(control.display, `desktop ${control.text}`).not.toBe('inline-flex');
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
