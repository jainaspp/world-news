import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderChroniclePage, renderCivilizationHub, renderOriginsPage } from '../shared/civilizationPage';
import { renderColumnIndex } from '../shared/contentPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderStoryPage } from '../shared/storyPage';
import type { NewsItem } from '../shared/types';

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

const story: NewsItem = {
  id: 't6a-story',
  title: '本港天文台發出黃色暴雨警告信號並提醒市民留在室內',
  link: 'https://example.com/rain',
  source: '示例通訊社',
  sourceUrl: 'https://example.com',
  regions: ['hk'],
  pubDate: '2026-10-22T01:00:00.000Z',
  category: 'society',
  excerpt: '天文台表示大雨會持續數小時。市民應留在室內，並留意山泥傾瀉警告。低窪地區可能出現水浸。',
};

function withLocalCss(html: string, appCss: string, columnsCss: string): string {
  const linked = html
    .replaceAll('href="/site.css"', `href="${appCss}"`)
    .replaceAll('href="/columns.css"', `href="${columnsCss}"`);
  if (linked.includes('<html')) return linked;
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head><body>${linked}</body></html>`;
}

const MEASURE = `(() => {
  const deck = document.getElementById('ig-deck');
  if (!deck) return JSON.stringify({ missing: true });
  const cards = Array.from(deck.querySelectorAll('.ig-card'));
  const deckH = deck.clientHeight;
  const scrollers = [];
  const nodes = [document.documentElement, document.body, ...document.querySelectorAll('body *')];
  for (const el of nodes) {
    const style = getComputedStyle(el);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const scrollsY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2;
    const scrollsX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2;
    if (!scrollsY && !scrollsX) continue;
    scrollers.push({
      id: el.id || '',
      cls: String(el.className).slice(0, 80),
      y: scrollsY,
      x: scrollsX,
    });
  }
  function lineCuts(card) {
    const box = card.getBoundingClientRect();
    const sheet = card.firstElementChild;
    const sheetBox = sheet ? sheet.getBoundingClientRect() : box;
    const limit = Math.min(box.bottom, sheetBox.bottom);
    const cuts = [];
    const lost = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent || !/\\S/.test(node.textContent)) continue;
      const host = node.parentElement;
      if (!host || host.closest('script, style')) continue;
      const hs = getComputedStyle(host);
      if (hs.display === 'none' || hs.visibility === 'hidden') continue;
      range.selectNodeContents(node);
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width < 1 || r.height < 1) continue;
        const straddles = r.top < limit - 1 && r.bottom > limit + 1;
        const below = r.top > limit + 1 && r.top < box.bottom + 8000;
        if (straddles && cuts.length < 4) cuts.push(node.textContent.trim().slice(0, 28));
        if (below && lost.length < 4) lost.push(node.textContent.trim().slice(0, 28));
        if (cuts.length >= 4 && lost.length >= 4) break;
      }
    }
    const pierces = [];
    for (const el of card.querySelectorAll('img, .chip, .line-chip, figure, .stage-frame')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (r.top < limit - 1 && r.bottom > limit + 1 && pierces.length < 4) {
        pierces.push(String(el.className || el.tagName).slice(0, 40));
      }
    }
    const sheetKids = sheet ? Array.from(sheet.children) : [];
    const host = sheetKids.find((el) => el.classList.contains('civ-article')) || sheet;
    const bad = [];
    if (host) {
      for (const el of host.children) {
        const r = el.getBoundingClientRect();
        if (r.bottom > limit + 0.5 && bad.length < 2) {
          bad.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 48),
            kept: el.getAttribute('data-ig-kept'),
            kids: el.children.length,
            top: Math.round(r.top - limit),
            bot: Math.round(r.bottom - limit),
            html: el.outerHTML.slice(0, 140),
          });
        }
      }
    }
    return {
      h: Math.round(box.height),
      ratio: deckH ? Math.round((box.height / deckH) * 1000) / 1000 : 0,
      cuts,
      lost,
      pierces,
      bad,
    };
  }
  const first = cards[0];
  const hint = first ? getComputedStyle(first, '::after') : null;
  const hintBox = hint && hint.content && hint.content !== 'none' ? {
    content: hint.content,
    bottom: parseFloat(hint.bottom) || 0,
    h: parseFloat(hint.height) || 0,
  } : { content: hint ? hint.content : 'none' };
  const overlaps = [];
  if (first && hint && hint.content && hint.content !== 'none') {
    const probe = first;
    const after = getComputedStyle(probe, '::after');
    const cardBox = probe.getBoundingClientRect();
    const hintTop = cardBox.bottom - (parseFloat(after.bottom) || 0) - (parseFloat(after.height) || 0);
    const hintBottom = cardBox.bottom - (parseFloat(after.bottom) || 0);
    const sheetBox = probe.firstElementChild ? probe.firstElementChild.getBoundingClientRect() : cardBox;
    for (const el of probe.querySelectorAll('a, button, h1, h2, h3, .hero-cta, .rank-title, .hero-title')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const visibleTop = Math.max(r.top, sheetBox.top);
      const visibleBottom = Math.min(r.bottom, sheetBox.bottom);
      if (visibleBottom - visibleTop < 2) continue;
      const hit = visibleTop < hintBottom - 1 && visibleBottom > hintTop + 1;
      if (hit && overlaps.length < 4) overlaps.push((el.innerText || el.className || el.tagName).toString().trim().slice(0, 24) + '@' + Math.round(visibleTop - cardBox.top));
    }
  }
  const others = cards.slice(1, 4).map((card) => getComputedStyle(card, '::after').content);
  return JSON.stringify({
    width: window.innerWidth,
    height: window.innerHeight,
    deckH,
    deckW: deck.clientWidth,
    frameW: Math.round((deck.parentElement && deck.parentElement.getBoundingClientRect().width) || 0),
    cards: cards.length,
    cont: deck.querySelectorAll('[data-ig-cont="1"]').length,
    stat: deck.getAttribute('data-ig-stat') || '',
    hint: deck.getAttribute('data-ig-hint') || '',
    hintBox,
    others,
    overlaps,
    scrollers: scrollers.slice(0, 8),
    docScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    samples: cards.slice(0, 6).map(lineCuts),
    worst: cards.map(lineCuts).reduce((acc, row) => {
      acc.cuts += row.cuts.length;
      acc.lost += row.lost.length;
      acc.pierces += row.pierces.length;
      acc.minRatio = Math.min(acc.minRatio, row.ratio);
      acc.maxRatio = Math.max(acc.maxRatio, row.ratio);
      if (row.cuts.length && acc.cutSample.length < 3) acc.cutSample.push(row.cuts[0]);
      if (row.lost.length && acc.lostSample.length < 3) acc.lostSample.push(row.lost[0]);
      if (row.pierces.length && acc.pierceSample.length < 3) acc.pierceSample.push(row.pierces[0]);
      if (row.bad.length && acc.bad.length < 3) acc.bad.push(row.bad[0]);
      return acc;
    }, { cuts: 0, lost: 0, pierces: 0, minRatio: 9, maxRatio: 0, cutSample: [], lostSample: [], pierceSample: [], bad: [] }),
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

interface Probe {
  evaluate<T>(expression: string): Promise<T>;
  navigate(url: string): Promise<void>;
  viewport(width: number, height: number): Promise<void>;
  close(): Promise<void>;
}

async function launchChrome(): Promise<Probe> {
  const port = await freePort();
  const dir = await mkdtemp(path.join(tmpdir(), 't6a-chrome-'));
  const bin = chromeBin();
  if (!bin) throw new Error('chrome is not installed');
  const chrome: ChildProcess = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
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
    } catch { /* devtools not up yet */ }
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
      while (Date.now() - start < 20000) {
        const ready = await evaluate<boolean>('document.readyState !== "loading" && document.getElementById("ig-deck") != null').catch(() => false);
        if (ready) {
          await evaluate<void>('document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()');
          await sleep(80);
          await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
          return;
        }
        await sleep(30);
      }
      throw new Error(`navigation timed out: ${url}`);
    },
    async viewport(width: number, height: number) {
      await rpc('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    },
    async close() {
      ws.close();
      chrome.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

interface Sample {
  missing?: boolean;
  width: number;
  deckH: number;
  deckW: number;
  frameW: number;
  cards: number;
  cont: number;
  stat: string;
  hint: string;
  hintBox: { content: string };
  others: string[];
  overlaps: string[];
  scrollers: { id: string; cls: string; y: boolean; x: boolean }[];
  docScroll: number;
  worst: {
    cuts: number;
    lost: number;
    pierces: number;
    minRatio: number;
    maxRatio: number;
    cutSample: string[];
    lostSample: string[];
    pierceSample: string[];
    bad: { tag: string; cls: string; kept: string | null; kids: number; top: number; bot: number; html: string }[];
  };
}

describe('T6a snap layout', () => {
  it.skipIf(!chromeBin())('keeps one full-height scroller at phone and wide widths', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 't6a-pages-'));
    const appCss = pathToFileURL(path.resolve('src/App.css')).href;
    const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
    const when = new Date('2026-10-22T02:00:00.000Z');
    const entry = {
      key: '2026-10-25-pm',
      title: '每日香港導讀',
      description: '傍晚導讀。',
      publishedAt: '2026-10-25T10:00:00.000Z',
      sources: 4,
      outlets: 3,
      category: 'hk',
    };
    const pages = {
      home: withLocalCss(renderHomeFeed([story, { ...story, id: 't6a-b', title: '立法會恢復二讀' }], new Map(), null, '', null, '', [], [], when, true), appCss, columnsCss),
      briefing: withLocalCss(renderColumnIndex('briefing', [entry, { ...entry, key: '2026-10-25-am', title: '早上導讀' }], 'https://world-news.xyz/briefing/'), appCss, columnsCss),
      hub: withLocalCss(renderCivilizationHub(when).html, appCss, columnsCss),
      story: withLocalCss(renderStoryPage(story, null, [story], 'https://world-news.xyz/story/t6a-story/'), appCss, columnsCss),
      chronicle: withLocalCss(renderChroniclePage().html, appCss, columnsCss),
      origins: withLocalCss(renderOriginsPage().html, appCss, columnsCss),
    };
    await writeFile(path.join(dir, 'home.html'), pages.home);
    await writeFile(path.join(dir, 'briefing.html'), pages.briefing);
    await writeFile(path.join(dir, 'hub.html'), pages.hub);
    await writeFile(path.join(dir, 'story.html'), pages.story);
    await writeFile(path.join(dir, 'chronicle.html'), pages.chronicle);
    await writeFile(path.join(dir, 'origins.html'), pages.origins);
    const probe = await launchChrome();
    const viewports = [
      { name: 'phone', width: 390, height: 844 },
      { name: 'wide', width: 1280, height: 800 },
    ];
    try {
      const failures: string[] = [];
      for (const viewport of viewports) {
        await probe.viewport(viewport.width, viewport.height);
        for (const [name, file] of Object.entries({
          home: 'home.html',
          briefing: 'briefing.html',
          hub: 'hub.html',
          story: 'story.html',
          chronicle: 'chronicle.html',
          origins: 'origins.html',
        })) {
          await probe.navigate(pathToFileURL(path.join(dir, file)).href);
          await probe.viewport(viewport.width, viewport.height);
          await sleep(120);
          const sample = JSON.parse(await probe.evaluate<string>(MEASURE)) as Sample;
          const label = `${viewport.name} ${name}`;
          if (sample.missing) failures.push(`${label} missing deck`);
          if (sample.cards < 2) failures.push(`${label} cards ${sample.cards}`);
          if (sample.worst.minRatio < 0.98 || sample.worst.maxRatio > 1.02) {
            failures.push(`${label} card ratio ${sample.worst.minRatio}-${sample.worst.maxRatio} deck ${sample.deckH}`);
          }
          const foreign = sample.scrollers.filter((row) => row.id !== 'ig-deck');
          if (foreign.length) failures.push(`${label} extra scrollers ${JSON.stringify(foreign)}`);
          if (!sample.scrollers.some((row) => row.id === 'ig-deck' && row.y)) failures.push(`${label} deck does not scroll`);
          if (sample.docScroll > 2) failures.push(`${label} document scroll ${sample.docScroll}`);
          const deep = name === 'chronicle' || name === 'origins';
          if (sample.worst.cuts || sample.worst.pierces || (deep && sample.worst.lost)) {
            failures.push(`${label} cards=${sample.cards} cont=${sample.cont} stat=${sample.stat} clip cuts=${sample.worst.cuts} lost=${sample.worst.lost} pierce=${sample.worst.pierces} ${JSON.stringify({ cut: sample.worst.cutSample, lost: sample.worst.lostSample, pierce: sample.worst.pierceSample, bad: sample.worst.bad })}`);
          }
          if (!sample.hintBox.content.includes('上滑')) failures.push(`${label} hint ${sample.hintBox.content}`);
          if (sample.others.some((content) => content.includes('上滑'))) failures.push(`${label} hint on later cards ${sample.others.join('|')}`);
          if (sample.overlaps.length) failures.push(`${label} hint overlaps ${sample.overlaps.join('|')}`);
          if (deep && sample.cont < 2) failures.push(`${label} continuations ${sample.cont}`);
          if (deep && sample.cards > 140) failures.push(`${label} too many cards ${sample.cards} stat ${sample.stat}`);
          if (viewport.name === 'wide' && (sample.deckW < 300 || sample.deckW > 440)) {
            failures.push(`${label} deck width ${sample.deckW} frame ${sample.frameW}`);
          }
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    } finally {
      await probe.close();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 90_000);
});
