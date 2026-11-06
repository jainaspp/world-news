import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { siteBrand } from '../shared/brand';
import { chrome, footer } from '../shared/contentPage';
import { FOOTER_LINKS } from '../shared/siteNav';

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

const PHONE_START = '@media (max-width: 700px) {\n  .logo-link,';

const LANG = `<div class="lang-wrap">
  <button type="button" class="icon-btn" aria-expanded="true" aria-label="Language: 繁體中文">繁</button>
  <ul class="lang-menu" role="listbox" aria-label="Display language">
    <li><button type="button">繁體中文</button></li>
    <li><button type="button">简体中文</button></li>
    <li><button type="button">English</button></li>
  </ul>
</div>`;

function pageHtml(): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  let body = `${chrome('home')}${footer()}`;
  const themeAt = body.indexOf('class="icon-btn theme-toggle"');
  const close = body.indexOf('</div>', themeAt);
  body = `${body.slice(0, close)}${LANG}${body.slice(close)}`;
  body = body.replace(/src="\/brand\/([^"?]+)\?[^"]*"/g, (_match, file: string) => {
    return `src="${pathToFileURL(path.resolve('public/brand', file)).href}"`;
  });
  return `<!doctype html>
<html lang="zh-HK">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${appCss}" />
<link rel="stylesheet" href="${columnsCss}" />
</head>
<body>
<div class="page">${body}</div>
</body>
</html>`;
}

const MEASURE = `(() => {
  document.querySelectorAll('.chrome details').forEach((node) => { node.open = true; });
  document.querySelectorAll('.subscribe-telegram').forEach((node) => node.removeAttribute('hidden'));
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
      tag: el.tagName,
      cls: String(el.className || ''),
      parent: el.parentElement ? String(el.parentElement.className || '') : '',
      text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim(),
      h: Math.round(rect.height),
      w: Math.round(rect.width),
      hitH: Math.round(hitH),
      hitW: Math.round(hitW),
      minH: style.minHeight,
      minW: style.minWidth,
      outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineOffset,
    };
  }
  const nodes = Array.from(document.querySelectorAll('.skip-link, .chrome button, .chrome a, .chrome summary, .footer-nav a, .lang-menu button'));
  return JSON.stringify({ innerW: window.innerWidth, controls: nodes.map(box) });
})()`;

interface ControlBox {
  tag: string;
  cls: string;
  parent: string;
  text: string;
  h: number;
  w: number;
  hitH: number;
  hitW: number;
  minH: string;
  minW: string;
  outline: string;
}

interface ChromeBox {
  innerW: number;
  controls: ControlBox[];
}

const PHONE_TEXTS = [
  siteBrand,
  '跳到內容',
  '搜尋',
  '工具',
  '切換深淺色模式',
  'Language: 繁體中文',
  '繁體中文',
  '简体中文',
  'English',
  '宇宙起源',
  '銀河系誕生',
  '地球生物',
  '古',
  '未來',
  '今日切片',
  '每日導讀',
  '懶人包',
  'Telegram',
  ...FOOTER_LINKS.map((link) => link.label),
];

describe('phone chrome tap target', () => {
  it('lifts the short masthead controls to 44px and leaves the desktop sizes and the focus ring', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const columns = readFileSync('public/columns.css', 'utf8');
    const phone = mediaBlock(app, PHONE_START);
    const seg = rule(app, '.ia-seg {\n  display: inline-flex;');
    const lang = rule(app, '.lang-menu button {');
    const news = rule(app, '.ia-today-panel .ia-news .chip {\n  justify-content: flex-start;');
    const focus = rule(app, '.chip:focus-visible, .icon-btn:focus-visible, .bookmark:focus-visible, .primary:focus-visible, .follow-mini:focus-visible {');
    const phoneAt = app.indexOf(PHONE_START);

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(phone).toContain('min-width: 44px');
    expect(phone).toContain('min-height: 44px');
    expect(phone).toContain('.skip-link,');
    expect(phone).toContain('.ia-seg,');
    expect(phone).toContain('.ia-l2-summary,');
    expect(phone).toContain('.header-actions > a,');
    expect(phone).toContain('.lang-menu button,');
    expect(phone).toContain('.footer-nav a,');
    expect(phone).toContain('.ia-today-panel .ia-news .chip,');
    expect(phone).toContain('.header-actions > a:not([hidden])');
    expect(phone).toContain('.footer-nav a:not([hidden])');
    expect(phone).toContain('display: inline-flex;');
    expect(phone).not.toContain('outline');
    expect(app.indexOf('.ia-seg {\n  display: inline-flex;')).toBeLessThan(phoneAt);
    expect(app.indexOf('.ia-today-panel .ia-news .chip {\n  justify-content: flex-start;')).toBeLessThan(phoneAt);
    expect(app.indexOf('.lang-menu button {')).toBeLessThan(phoneAt);
    expect(seg).toContain('min-height: 40px');
    expect(seg).not.toContain('44px');
    expect(lang).toContain('min-height: 40px');
    expect(lang).not.toContain('44px');
    expect(news).toContain('min-height: 40px');
    expect(news).not.toContain('44px');
    expect(rule(app, '.header-actions .icon-btn { min-width: 44px; min-height: 44px;')).toContain('min-height: 44px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(app).toContain(':focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }');
    expect(columns).toContain('.chip,\n  .share-buttons .chip {\n    min-width: 44px;\n    min-height: 44px;');
    expect(columns).not.toContain('.ia-seg');
    expect(columns).not.toContain('.logo-link');
  });

  it.skipIf(!chromeBin())('measures masthead and footer controls at 390px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'chrome-tap-'));
    await writeFile(path.join(dir, 'chrome.html'), pageHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'chrome-tap-user-'));
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
      async function read(width: number, dark: boolean): Promise<ChromeBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 1400, deviceScaleFactor: 1, mobile: width <= 700 });
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark})`);
        await rpc('DOM.getDocument', { depth: 1 });
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        for (const selector of ['.theme-toggle', '.ia-ancient', '.logo-link', '.lang-menu button', '.footer-nav a', '.skip-link']) {
          const found = await rpc('DOM.querySelector', { nodeId: root.root.nodeId, selector }) as { nodeId: number };
          if (found.nodeId) await rpc('CSS.forcePseudoState', { nodeId: found.nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      function one(box: ChromeBox, text: string, parent = ''): ControlBox {
        const found = box.controls.find((control) => control.text === text && (!parent || control.parent === parent));
        expect(found, `${text} ${parent} ${JSON.stringify(box.controls.map((control) => control.text))}`).toBeTruthy();
        return found!;
      }
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'chrome.html')).href });
      const start = Date.now();
      let opened = false;
      while (Date.now() - start < 15000) {
        opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".theme-toggle")').catch(() => false);
        if (opened) break;
        await sleep(30);
      }
      if (!opened) throw new Error('navigation timed out');
      await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      const hiddenTelegram = await evaluate<string>(`(() => {
        const node = document.querySelector('.footer-nav .subscribe-telegram');
        return node ? getComputedStyle(node).display : 'missing';
      })()`);
      expect(hiddenTelegram).toBe('none');

      for (const dark of [false, true]) {
        const box = await read(390, dark);
        const label = dark ? 'dark' : 'light';
        expect(box.innerW, label).toBe(390);
        expect(box.controls.map((control) => control.text), label).toEqual(expect.arrayContaining(PHONE_TEXTS));
        for (const control of box.controls) {
          const name = `${label} ${control.parent} ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
        }
        for (const selector of ['.theme-toggle', '.ia-ancient', '.logo-link', '.skip-link']) {
          const control = box.controls.find((item) => item.cls.split(' ').includes(selector.slice(1)) || (selector === '.skip-link' && item.cls === 'skip-link'));
          expect(control, selector).toBeTruthy();
          expect(control!.outline, `${label} ${selector}`).toContain('solid');
          expect(control!.outline, `${label} ${selector}`).toContain('3px');
          expect(control!.outline, `${label} ${selector}`).toContain('2px');
        }
        const chip = one(box, '日報');
        expect(chip.minH, label).toBe('44px');
        expect(chip.h, label).toBeGreaterThanOrEqual(44);
      }

      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(one(desktop, '古').h).toBe(40);
      expect(one(desktop, '古').minH).toBe('40px');
      expect(one(desktop, '古').w).toBeLessThan(44);
      expect(one(desktop, '未來').h).toBe(40);
      expect(one(desktop, '繁體中文').h).toBe(40);
      expect(one(desktop, '繁體中文').minH).toBe('40px');
      expect(one(desktop, '今日切片').h).toBe(40);
      expect(one(desktop, '今日切片').minH).toBe('40px');
      expect(one(desktop, 'RSS', 'header-actions').h).toBeLessThan(44);
      expect(one(desktop, 'RSS', 'footer-nav').h).toBeLessThan(44);
      expect(one(desktop, '私隱政策').h).toBeLessThan(44);
      expect(one(desktop, siteBrand).minH).toBe('40px');
      expect(one(desktop, '切換深淺色模式').h).toBeGreaterThanOrEqual(44);
      expect(one(desktop, '宇宙起源').h).toBeGreaterThanOrEqual(44);
      expect(one(desktop, '日報').minH).toBe('36px');
      expect(one(desktop, '日報').h).toBeLessThan(44);
      const summary = desktop.controls.find((control) => control.cls.includes('ia-l2-summary'));
      expect(summary?.h).toBe(40);
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
