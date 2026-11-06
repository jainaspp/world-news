import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderLearnPath } from '../shared/learnPage';

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

const PHONE = '@media (max-width: 700px) {\n  /* Learn paragraph returns.';
const RETURN = '.learn-main > p > a[href="/learn/"],\n  .learn-article > p > a[href^="/learn/"] {';

function pageHtml(rest: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  const html = renderLearnPath(rest).html;
  return html.replace('</head>', `<link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head>`);
}

const MEASURE = `(() => {
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
      parent: el.parentElement ? String(el.parentElement.className || el.parentElement.tagName) : '',
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
    returns: Array.from(document.querySelectorAll('.learn-main > p > a[href="/learn/"], .learn-article > p > a[href^="/learn/"]')).map(box),
    prose: Array.from(document.querySelectorAll('.learn-soft a')).map(box),
    crumbs: Array.from(document.querySelectorAll('nav.crumb a')).map(box),
    titles: Array.from(document.querySelectorAll('.learn-leaf h2 a')).map(box),
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

interface LearnBox {
  innerW: number;
  returns: ControlBox[];
  prose: ControlBox[];
  crumbs: ControlBox[];
  titles: ControlBox[];
}

const PAGES = [
  { rest: 'zh', file: 'zh.html', returns: ['返回萬有地圖'], prose: 0, titles: 1 },
  { rest: 'phy', file: 'phy.html', returns: ['返回萬有地圖'], prose: 0, titles: 0 },
  { rest: 'zh/glyph', file: 'glyph.html', returns: ['返回漢語與文字'], prose: 1, titles: 0 },
  { rest: 'missing-leaf', file: 'miss.html', returns: ['返回萬有地圖'], prose: 0, titles: 0 },
] as const;

describe('phone learn paragraph return tap target', () => {
  it('lifts paragraph returns to 44px and leaves the desktop sizes, prose links, and the focus ring', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const phoneAt = app.indexOf(PHONE);
    const phone = mediaBlock(app, PHONE);
    const returns = rule(phone, RETURN);
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('learn-door');
    expect(phone).not.toContain('learn-edge');
    expect(phone).not.toContain('.crumb');
    expect(phone).not.toContain('.learn-leaf');
    expect(phone).not.toContain('.learn-soft');
    expect(returns).toContain('display: inline-flex');
    expect(returns).toContain('min-width: 44px');
    expect(returns).toContain('min-height: 44px');
    expect(returns).not.toContain('width: 100%');
    expect(app.indexOf(RETURN)).toBeGreaterThan(phoneAt);
    expect(app.indexOf(RETURN, phoneAt + PHONE.length)).toBe(app.lastIndexOf(RETURN));
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(rule(app, '.learn-door:focus-visible {')).toContain('outline: 3px solid var(--accent)');
    expect(rule(app, '.learn-actions button:focus-visible {')).toContain('outline: 3px solid var(--accent)');
    expect(rule(app, '.learn-edge a:focus-visible {')).toContain('outline: 3px solid var(--accent)');
    expect(app).toContain('@media (min-width: 720px) {\n  .learn-map { grid-template-columns: repeat(3, 1fr); }');

    expect(renderLearnPath('zh').html).toContain('<p><a href="/learn/">返回萬有地圖</a></p>');
    expect(renderLearnPath('phy').html).toContain('<p><a href="/learn/">返回萬有地圖</a></p>');
    expect(renderLearnPath('phy').html).toContain('尚未開啓之路');
    expect(renderLearnPath('zh/glyph').html).toContain('<p><a href="/learn/zh/">返回漢語與文字</a></p>');
    expect(renderLearnPath('zh/glyph').html).toContain('<p class="learn-soft">');
    expect(renderLearnPath('math/count').html).toContain('<p><a href="/learn/math/">返回數量與形式</a></p>');
    expect(renderLearnPath('en/script').html).toContain('<p><a href="/learn/en/">返回英語與世界語文門徑</a></p>');
    expect(renderLearnPath('missing-leaf').html).toContain('<p><a href="/learn/">返回萬有地圖</a></p>');
    expect(renderLearnPath('').html).not.toContain('返回萬有地圖');
  });

  it.skipIf(!chromeBin())('measures paragraph returns at 390px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'learn-back-tap-'));
    for (const page of PAGES) await writeFile(path.join(dir, page.file), pageHtml(page.rest));
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'learn-back-tap-user-'));
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
      async function read(width: number, dark: boolean): Promise<LearnBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 1400, deviceScaleFactor: 1, mobile: width <= 700 });
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelector', {
          nodeId: root.root.nodeId,
          selector: '.learn-main > p > a[href="/learn/"], .learn-article > p > a[href^="/learn/"]',
        }) as { nodeId: number };
        if (found.nodeId) await rpc('CSS.forcePseudoState', { nodeId: found.nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      async function open(file: string): Promise<void> {
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, file)).href });
        const start = Date.now();
        let opened = false;
        while (Date.now() - start < 15000) {
          opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector("main")').catch(() => false);
          if (opened) break;
          await sleep(30);
        }
        if (!opened) throw new Error(`navigation timed out ${file}`);
      }

      for (const spec of PAGES) {
        await open(spec.file);
        for (const dark of [false, true]) {
          const box = await read(390, dark);
          const label = `${spec.rest} ${dark ? 'dark' : 'light'}`;
          expect(box.innerW, label).toBe(390);
          expect(box.returns.map((control) => control.text), label).toEqual([...spec.returns]);
          expect(box.prose, label).toHaveLength(spec.prose);
          expect(box.titles, label).toHaveLength(spec.titles);
          for (const control of box.returns) {
            const name = `${label} ${control.text}`;
            expect(control.h, name).toBeGreaterThanOrEqual(44);
            expect(control.w, name).toBeGreaterThanOrEqual(44);
            expect(control.w, name).toBeLessThan(200);
            expect(control.hitH, name).toBeGreaterThanOrEqual(44);
            expect(control.hitW, name).toBeGreaterThanOrEqual(44);
            expect(control.minH, name).toBe('44px');
            expect(control.display, name).toBe('inline-flex');
            expect(control.outline, name).toContain('solid');
            expect(control.outline, name).toContain('3px');
            expect(control.outline, name).toContain('2px');
          }
          for (const control of box.prose) {
            const name = `${label} prose ${control.text}`;
            expect(control.h, name).toBeLessThan(44);
            expect(control.minH, name).toBe('0px');
            expect(control.display, name).toBe('inline');
          }
          for (const control of [...box.crumbs, ...box.titles]) {
            const name = `${label} kept ${control.text}`;
            expect(control.h, name).toBeGreaterThanOrEqual(44);
            expect(control.hitH, name).toBeGreaterThanOrEqual(44);
            expect(control.minH, name).toBe('44px');
          }
        }

        const desktop = await read(1100, false);
        const desk = `${spec.rest} desktop`;
        expect(desktop.innerW, desk).toBe(1100);
        expect(desktop.returns.map((control) => control.text), desk).toEqual([...spec.returns]);
        for (const control of desktop.returns) {
          const name = `${desk} ${control.text}`;
          expect(control.h, name).toBeLessThan(44);
          expect(control.minH, name).toBe('0px');
          expect(control.display, name).toBe('inline');
        }
        for (const control of desktop.prose) {
          const name = `${desk} prose ${control.text}`;
          expect(control.h, name).toBeLessThan(44);
          expect(control.display, name).toBe('inline');
        }
        for (const control of [...desktop.crumbs, ...desktop.titles]) {
          const name = `${desk} kept ${control.text}`;
          expect(control.h, name).toBeLessThan(44);
          expect(control.minH, name).toBe('0px');
          expect(control.display, name).toBe('inline');
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
