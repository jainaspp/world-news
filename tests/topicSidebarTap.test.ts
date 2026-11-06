import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { topicBySlug } from '../shared/topicPack';
import { renderTopicPage } from '../shared/topicPage';

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

const PHONE = '@media (max-width: 700px) {\n  /* Topic sidebar archive.';

function topicHtml(): string {
  const policy = topicBySlug('policy-address')!;
  const budget = topicBySlug('budget')!;
  const property = topicBySlug('property')!;
  const html = renderTopicPage({
    topic: policy,
    pack: null,
    headlines: [],
    others: [
      { slug: budget.slug, title: budget.title, description: budget.blurb },
      { slug: property.slug, title: property.title, description: property.blurb },
    ],
  }, 'https://world-news.xyz/topic/policy-address/');
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
    archive: Array.from(document.querySelectorAll('.side-card.archive > a.read-original')).map(box),
    titles: Array.from(document.querySelectorAll('.side-card.archive li a')).map(box),
  });
})()`;

interface ControlBox {
  text: string;
  h: number;
  w: number;
  hitH: number;
  hitW: number;
  minH: string;
  minW: string;
  display: string;
  outline: string;
  scrollH: number;
}

interface PageBox {
  innerW: number;
  scrollW: number;
  archive: ControlBox[];
  titles: ControlBox[];
}

describe('topic sidebar archive tap target', () => {
  it('lifts the phone archive link and titles to 44px and leaves the desktop line and the focus ring', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const phone = mediaBlock(columns, PHONE);
    const archiveLink = rule(phone, '.page.column-page[data-kind="topic"] .side-card.archive > a.read-original {');
    const archiveTitle = rule(phone, '.page.column-page[data-kind="topic"] .side-card.archive li a {');
    const baseTitle = rule(columns, '.archive li a {');
    const baseRead = rule(app, '.read-original { font-size:');
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(columns.indexOf(PHONE, columns.indexOf(PHONE) + PHONE.length)).toBe(-1);
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('data-kind="analysis"');
    expect(phone).not.toContain('home-sections');
    expect(phone).not.toContain('civ-slot');
    expect(phone).not.toContain('hero');
    expect(archiveLink).toContain('display: inline-flex');
    expect(archiveLink).toContain('align-items: center');
    expect(archiveLink).toContain('box-sizing: border-box');
    expect(archiveLink).toContain('min-width: 44px');
    expect(archiveLink).toContain('min-height: 44px');
    expect(archiveTitle).toContain('display: flex');
    expect(archiveTitle).toContain('align-items: center');
    expect(archiveTitle).toContain('box-sizing: border-box');
    expect(archiveTitle).toContain('min-width: 44px');
    expect(archiveTitle).toContain('min-height: 44px');
    expect(archiveTitle).not.toContain('outline');
    expect(baseTitle).not.toContain('44px');
    expect(baseTitle).toContain('font-weight: 700');
    expect(baseRead).not.toContain('44px');
    expect(baseRead).toContain('font-size: 0.92rem');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');

    const page = renderTopicPage({
      topic: topicBySlug('policy-address')!,
      pack: null,
      headlines: [],
      others: [{ slug: 'budget', title: '財政預算案', description: '稅務與津貼。' }],
    }, 'https://world-news.xyz/topic/policy-address/');
    expect(page).toContain('data-kind="topic"');
    expect(page).toContain('全部專題 →');
    expect(page).toContain('>財政預算案</a>');
    expect(page).not.toContain('data-kind="analysis"');
  });

  it.skipIf(!chromeBin())('measures the topic sidebar at 390px and leaves the desktop line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'topic-sidebar-tap-'));
    await writeFile(path.join(dir, 'topic.html'), topicHtml());
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'topic-sidebar-tap-user-'));
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
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, 'topic.html')).href });
        const start = Date.now();
        let opened = false;
        while (Date.now() - start < 15000) {
          opened = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".side-card.archive > a.read-original")').catch(() => false);
          if (opened) break;
          await sleep(30);
        }
        if (!opened) throw new Error('navigation timed out');
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const found = await rpc('DOM.querySelectorAll', {
          nodeId: root.root.nodeId,
          selector: '.side-card.archive > a.read-original, .side-card.archive li a',
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
        expect(box.archive.map((control) => control.text), label).toEqual(['全部專題 →']);
        expect(box.titles.map((control) => control.text), label).toEqual(['財政預算案', '樓市']);
        for (const control of box.archive) {
          const name = `${label} archive ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
          expect(control.minH, name).toBe('44px');
          expect(control.minW, name).toBe('44px');
          expect(control.display, name).toBe('inline-flex');
          expect(control.outline, name).toContain('solid');
          expect(control.outline, name).toContain('3px');
          expect(control.outline, name).toContain('2px');
          expect(control.scrollH, name).toBeLessThanOrEqual(control.h + 1);
        }
        for (const control of box.titles) {
          const name = `${label} title ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
          expect(control.minH, name).toBe('44px');
          expect(control.minW, name).toBe('44px');
          expect(control.display, name).toBe('flex');
          expect(control.outline, name).toContain('solid');
          expect(control.outline, name).toContain('3px');
          expect(control.outline, name).toContain('2px');
          expect(control.scrollH, name).toBeLessThanOrEqual(control.h + 1);
        }
      }

      for (const dark of [false, true]) {
        expectPhone(await read(390, dark), dark ? 'dark' : 'light');
      }
      const desktop = await read(1100, false);
      expect(desktop.innerW).toBe(1100);
      expect(desktop.archive.map((control) => control.text)).toEqual(['全部專題 →']);
      expect(desktop.titles.map((control) => control.text)).toEqual(['財政預算案', '樓市']);
      for (const control of desktop.archive) {
        expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
        expect(control.minH, `desktop ${control.text}`).not.toBe('44px');
        expect(control.display, `desktop ${control.text}`).not.toBe('inline-flex');
      }
      for (const control of desktop.titles) {
        expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
        expect(control.minH, `desktop ${control.text}`).not.toBe('44px');
        expect(control.display, `desktop ${control.text}`).toBe('block');
      }
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
