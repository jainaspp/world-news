import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderLearnHub } from '../shared/learnPage';
import { renderStoryPage } from '../shared/storyPage';
import type { NewsItem } from '../shared/types';

const ROOT_PX = 16;
const FLOOR_PX = 12;
/** Decorative dots and the axis rail are not text. */
const DECORATIVE = /(\.dot|\.rail|\.tl-dot|\.cosmo-star-dot|\.logo-word::before)(?![\w-])/;

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

function splitArgs(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function lengthPx(raw: string): number | null {
  const value = raw.trim();
  if (/^[\d.]+px$/.test(value)) return Number.parseFloat(value);
  if (/^[\d.]+rem$/.test(value)) return Number.parseFloat(value) * ROOT_PX;
  if (/^[\d.]+em$/.test(value)) return Number.parseFloat(value) * ROOT_PX;
  return null;
}

function floorPx(value: string, tokens: Map<string, string>, depth = 0): number | null {
  const raw = value.trim().replace(/\s*!important\s*$/, '').trim();
  if (depth > 6 || raw === 'inherit' || raw === 'unset' || raw === 'initial' || raw === 'medium') return null;
  const variable = raw.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/);
  if (variable) {
    const token = tokens.get(variable[1]);
    if (token) return floorPx(token, tokens, depth + 1);
    return variable[2] ? floorPx(variable[2], tokens, depth + 1) : null;
  }
  if (raw.startsWith('max(') && raw.endsWith(')')) {
    const hard = splitArgs(raw.slice(4, -1))
      .map((part) => (/^[\d.]+(?:px|rem)$/.test(part) ? lengthPx(part) : null))
      .filter((size): size is number => size != null);
    if (hard.length) return Math.max(...hard);
  }
  if (raw.startsWith('clamp(') && raw.endsWith(')')) {
    const [min] = splitArgs(raw.slice(6, -1));
    return min ? floorPx(min, tokens, depth + 1) : null;
  }
  return lengthPx(raw);
}

function cssTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens.set(match[1], match[2].trim());
  return tokens;
}

function fontDeclarations(css: string): { selector: string; value: string }[] {
  const found: { selector: string; value: string }[] = [];
  const re = /font-size:\s*([^;]+);/g;
  for (const match of css.matchAll(re)) {
    const at = match.index ?? 0;
    const open = css.lastIndexOf('{', at);
    const previous = css.lastIndexOf('}', open);
    const selector = css.slice(previous + 1, open).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();
    found.push({ selector, value: match[1].trim() });
  }
  return found;
}

function undersized(css: string): string[] {
  const tokens = cssTokens(css);
  const bad: string[] = [];
  for (const rule of fontDeclarations(css)) {
    if (DECORATIVE.test(rule.selector)) continue;
    const keyword = rule.value.replace(/\s*!important\s*$/, '').trim();
    if (/^(inherit|unset|initial|medium)$/.test(keyword)) continue;
    const floor = floorPx(rule.value, tokens);
    if (floor == null) bad.push(`${rule.selector} { font-size: ${rule.value} } (unresolved)`);
    else if (floor < FLOOR_PX - 0.01) bad.push(`${rule.selector} { font-size: ${rule.value} } = ${floor}px`);
  }
  return bad;
}

const story: NewsItem = {
  id: 'min-font-story',
  title: '本港天文台發出黃色暴雨警告信號並提醒市民留在室內',
  link: 'https://example.com/rain',
  source: '示例通訊社',
  sourceUrl: 'https://example.com',
  regions: ['hk'],
  pubDate: '2026-10-22T01:00:00.000Z',
  category: 'society',
};

function withLocalCss(html: string, appCss: string, columnsCss: string): string {
  const linked = html
    .replaceAll('href="/site.css"', `href="${appCss}"`)
    .replaceAll('href="/columns.css"', `href="${columnsCss}"`);
  if (linked.includes('<html')) return linked;
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head><body>${linked}</body></html>`;
}

function measureScript(scope: string): string {
  return `(() => {
    const scope = ${JSON.stringify(scope)};
    const roots = scope === 'body' ? [document.body] : Array.from(document.querySelectorAll(scope));
    document.querySelectorAll('details').forEach((node) => { node.open = true; });
    function hidden(el) {
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        if (node.hidden) return true;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
      }
      return el.getClientRects().length === 0;
    }
    function decorative(el) {
      return Boolean(el.closest('.dot, .rail, .tl-dot, .cosmo-star-dot, .logo-live'));
    }
    let styled = false;
    for (const sheet of document.styleSheets) {
      try { if (sheet.cssRules.length > 40) styled = true; } catch (error) { /* cross-origin */ }
    }
    const bad = [];
    let seen = 0;
    let min = 999;
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = (node.textContent || '').replace(/\\s+/g, '');
        if (!text) continue;
        const el = node.parentElement;
        if (!el || el.closest('script, style, noscript')) continue;
        if (decorative(el) || hidden(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        seen += 1;
        if (size < min) min = size;
        if (size < 11.95 && bad.length < 10) {
          bad.push({ size, tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 80), text: text.slice(0, 24) });
        }
      }
    }
    const pseudos = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!roots.some((root) => root === el || root.contains(el))) continue;
      if (decorative(el) || hidden(el)) continue;
      for (const pseudo of ['::before', '::after']) {
        const style = getComputedStyle(el, pseudo);
        const content = style.content;
        if (!content || content === 'none' || content === 'normal' || content === '""' || content === "''") continue;
        const size = parseFloat(style.fontSize);
        if (size < 11.95 && pseudos.length < 6) {
          pseudos.push({ size, cls: String(el.className).slice(0, 60), pseudo, content: content.slice(0, 24) });
        }
      }
    }
    const named = {};
    for (const selector of ['.axis-node', '.axis-node .lab', '.kicker', '.hero-kicker', '.hero-aside', '.line-filter-count', '.line-filter .chip', '.slice-head .tag', '.pin-seal', '.thumb-source', '.ad-label']) {
      const hits = [];
      for (const el of document.querySelectorAll(selector)) {
        if (!roots.some((root) => root === el || root.contains(el))) continue;
        if (hidden(el)) continue;
        hits.push(parseFloat(getComputedStyle(el).fontSize));
      }
      if (hits.length) named[selector] = Math.min(...hits);
    }
    return JSON.stringify({
      width: window.innerWidth,
      client: document.documentElement.clientWidth,
      href: location.href,
      meta: (document.querySelector('meta[name=viewport]') || {}).content || '',
      styled, roots: roots.length, seen, min: min === 999 ? null : min, bad, pseudos, named,
    });
  })()`;
}

interface Probe {
  evaluate<T>(expression: string): Promise<T>;
  navigate(url: string): Promise<void>;
  viewport(width: number, height: number): Promise<void>;
  close(): Promise<void>;
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchChrome(): Promise<Probe> {
  const port = await freePort();
  const dir = await mkdtemp(path.join(tmpdir(), 'min-font-chrome-'));
  const bin = chromeBin();
  if (!bin) throw new Error('chrome is not installed');
  const chrome: ChildProcess = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--allow-file-access-from-files',
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
    } catch {
      /* devtools not up yet */
    }
    await sleep(40);
  }
  if (!version) {
    chrome.kill('SIGKILL');
    throw new Error(`chrome did not start\n${stderr.slice(-800)}`);
  }
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
  return {
    evaluate,
    async navigate(url: string) {
      await rpc('Page.navigate', { url });
      const start = Date.now();
      while (Date.now() - start < 8000) {
        const ready = await evaluate<boolean>(`document.readyState !== 'loading' && document.body != null`).catch(() => false);
        if (ready) {
          await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
          return;
        }
        await sleep(30);
      }
      throw new Error(`navigation timed out: ${url}`);
    },
    async viewport(width: number, height: number) {
      await rpc('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    },
    async close() {
      ws.close();
      chrome.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

describe('P1-MIN-FONT declarations', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const columns = readFileSync('public/columns.css', 'utf8');

  it('declares no non-decorative font-size below 12px', () => {
    expect(undersized(css), undersized(css).join('\n')).toEqual([]);
    expect(undersized(columns), undersized(columns).join('\n')).toEqual([]);
  });

  it('raises the phone axis label, kickers, and the line filter to 12px', () => {
    expect(css).toContain('--civ-type-kicker: 0.75rem;');
    expect(css).not.toContain('0.6875rem');
    expect(css).not.toContain('font-size: 11px');
    expect(css).not.toContain('font-size: 10px');
    expect(columns).not.toContain('font-size: 11px');
    expect(columns).not.toContain('font-size: 10px');
    const phone = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    expect(phone).toContain('.axis-node { font-size: 12px; }');
    expect(css).toMatch(/\.line-filter-count \{[^}]*font-size:\s*12px/);
    expect(css).toContain('font-size: max(12px, 0.82em)');
    expect(floorPx('var(--civ-type-kicker)', cssTokens(css))).toBe(12);
  });
});

describe('P1-MIN-FONT computed sample at M', () => {
  it.skipIf(!chromeBin())('measures required pages at 360px and keeps visible text at least 12px', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'min-font-pages-'));
    const appCss = pathToFileURL(path.resolve('src/App.css')).href;
    const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
    const when = new Date('2026-10-22T02:00:00.000Z');
    const home = withLocalCss(renderHomeFeed([story], new Map(), null, '', null, '', [], [], when, true), appCss, columnsCss);
    await writeFile(path.join(dir, 'home.html'), home);
    await writeFile(path.join(dir, 'civ.html'), withLocalCss(renderCivilizationHub(when).html, appCss, columnsCss));
    await writeFile(path.join(dir, 'chronicle.html'), withLocalCss(renderChroniclePage().html, appCss, columnsCss));
    await writeFile(path.join(dir, 'learn.html'), withLocalCss(renderLearnHub().html, appCss, columnsCss));
    await writeFile(path.join(dir, 'story.html'), withLocalCss(renderStoryPage(story, null, [story], 'https://world-news.xyz/story/min-font-story/'), appCss, columnsCss));
    const pages = [
      { id: 'H', file: 'home.html', scope: 'body', minSeen: 30 },
      { id: 'S', file: 'home.html', scope: '#slice, .today-pin', minSeen: 8 },
      { id: 'C', file: 'civ.html', scope: 'body', minSeen: 30 },
      { id: 'N', file: 'chronicle.html', scope: 'body', minSeen: 30 },
      { id: 'L', file: 'learn.html', scope: 'body', minSeen: 12 },
      { id: 'A', file: 'story.html', scope: 'body', minSeen: 8 },
    ];
    const probe = await launchChrome();
    try {
      await probe.viewport(360, 800);
      const seenFiles = new Set<string>();
      for (const page of pages) {
        if (!seenFiles.has(page.file)) {
          await probe.navigate(pathToFileURL(path.join(dir, page.file)).href);
          seenFiles.add(page.file);
        }
        await probe.viewport(360, 800);
        await probe.evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        const raw = await probe.evaluate<string>(measureScript(page.scope));
        const sample = JSON.parse(raw) as {
          width: number;
          client: number;
          href: string;
          meta: string;
          styled: boolean;
          roots: number;
          seen: number;
          min: number | null;
          bad: { size: number; cls: string; text: string }[];
          pseudos: { size: number; cls: string; content: string }[];
          named: Record<string, number>;
        };
        expect(sample.width, `${page.id} ${sample.href} client=${sample.client} meta=${sample.meta}`).toBe(360);
        expect(sample.styled, `${page.id} stylesheet`).toBe(true);
        expect(sample.roots, page.id).toBeGreaterThan(0);
        expect(sample.seen, `${page.id} text nodes`).toBeGreaterThanOrEqual(page.minSeen);
        expect(sample.bad, `${page.id} ${JSON.stringify(sample.bad)}`).toEqual([]);
        expect(sample.pseudos, `${page.id} ${JSON.stringify(sample.pseudos)}`).toEqual([]);
        expect(sample.min ?? 0, page.id).toBeGreaterThanOrEqual(12);
        for (const [selector, size] of Object.entries(sample.named)) {
          expect(size, `${page.id} ${selector}`).toBeGreaterThanOrEqual(12);
        }
        if (page.id === 'H') {
          expect(sample.named['.axis-node'], 'phone axis label').toBeGreaterThanOrEqual(12);
          expect(sample.named['.kicker'], 'axis kicker').toBeGreaterThanOrEqual(12);
          expect(sample.named['.hero-kicker'], 'opening kicker').toBeGreaterThanOrEqual(12);
        }
        if (page.id === 'S') expect(sample.named['.slice-head .tag'], 'slice tag').toBeGreaterThanOrEqual(12);
        if (page.id === 'C') expect(sample.named['.line-filter-count'], 'line filter count').toBeGreaterThanOrEqual(12);
      }
    } finally {
      await probe.close();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60_000);
});
