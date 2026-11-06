import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { StoryCluster } from '../shared/angles';
import { renderContentPage, type ContentDoc, type IndexEntry } from '../shared/content';
import { renderStoryPage } from '../shared/storyPage';
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

const PHONE = '@media (max-width: 700px) {\n  /* Analysis outlet links and timeline links.';

function source(id: string, name: string, title: string, angle: string | undefined, when: string) {
  return {
    source: name,
    title,
    url: `https://example.com/${id}`,
    pubDate: when,
    ...(angle ? { angle } : {}),
  };
}

function analysisDoc(): ContentDoc {
  return {
    kind: 'analysis',
    key: '2026-10-07-fare',
    title: '港鐵建議票價加幅',
    description: '多間媒體報道同一項票價建議。',
    publishedAt: '2026-10-07T02:00:00.000Z',
    hkt: '2026-10-07 10:00',
    mode: 'ai',
    blocks: [{
      title: '背景',
      sentences: ['港鐵建議調整票價，並交諮詢。'],
      sources: [
        source('rthk', '香港電台', '港鐵建議票價加幅', undefined, '2026-10-07T00:05:00.000Z'),
        source('ming', '明報', '明報報道港鐵票價', '加價', '2026-10-07T00:20:00.000Z'),
        source('hkej', '信報', '信報報道港鐵就票價調整展開諮詢並說明對日常通勤的影響', '信報把諮詢程序、票價建議與對乘客日常通勤的影響分開來寫', '2026-10-07T00:40:00.000Z'),
      ],
    }],
  };
}

function archive(): IndexEntry[] {
  return [{
    key: 'older',
    title: '早前港聞',
    description: '早前的一則分析。',
    publishedAt: '2026-10-06T02:00:00.000Z',
    sources: 2,
  }];
}

function item(id: string, title: string, name: string, when: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: name,
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: when,
    category: 'hk',
  };
}

function storyCluster(): { lead: NewsItem; cluster: StoryCluster } {
  const lead = item('s1', '港鐵建議票價加幅', '香港電台', '2026-10-07T02:00:00.000Z');
  const other = item('s2', '明報報道港鐵票價', '明報', '2026-10-07T03:00:00.000Z');
  return {
    lead,
    cluster: {
      id: 'fare',
      lead,
      items: [lead, other],
      sources: [lead.source, other.source],
      count: 2,
      latest: Date.parse(other.pubDate),
    },
  };
}

function withLocalCss(html: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  return html.replace('</head>', `<link rel="stylesheet" href="${appCss}" /><link rel="stylesheet" href="${columnsCss}" /></head>`);
}

const MEASURE = `(() => {
  document.querySelectorAll('details').forEach((node) => { node.open = true; });
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
      overflow: style.overflow,
      outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineOffset,
      scrollH: el.scrollHeight,
    };
  }
  return JSON.stringify({
    innerW: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    reads: Array.from(document.querySelectorAll('.angle-card .read-original')).map(box),
    timeline: Array.from(document.querySelectorAll('.timeline .tl-body a')).map(box),
    archive: Array.from(document.querySelectorAll('.side-card.archive > a.read-original')).map(box),
    titles: Array.from(document.querySelectorAll('.side-card.archive li a')).map(box),
    storyRead: Array.from(document.querySelectorAll('.pack-toolbar > a.chip')).filter((el) => (el.textContent || '').includes('閱讀原文')).map(box),
    storyTimelineLinks: document.querySelectorAll('.timeline a').length,
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
  overflow: string;
  outline: string;
  scrollH: number;
}

interface PageBox {
  innerW: number;
  scrollW: number;
  reads: ControlBox[];
  timeline: ControlBox[];
  archive: ControlBox[];
  titles: ControlBox[];
  storyRead: ControlBox[];
  storyTimelineLinks: number;
}

describe('analysis read-original and timeline tap target', () => {
  it('lifts the phone links to 44px and leaves the desktop sizes, the clamp, and the focus ring', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const phone = mediaBlock(columns, PHONE);
    const outlet = rule(phone, '.page.column-page[data-kind="analysis"] .angle-card .read-original {');
    const timeline = rule(phone, '.page.column-page[data-kind="analysis"] .timeline .tl-body a {');
    const archiveLink = rule(phone, '.page.column-page[data-kind="analysis"] .side-card.archive > a.read-original {');
    const archiveTitle = rule(phone, '.page.column-page[data-kind="analysis"] .side-card.archive li a {');
    const baseOutlet = rule(columns, '.angle-card .read-original {');
    const baseTimeline = rule(columns, '.tl-body a {');
    const baseTitle = rule(columns, '.archive li a {');
    const baseRead = rule(app, '.read-original { font-size:');
    const focus = rule(app, ':focus-visible {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(columns.indexOf(PHONE, columns.indexOf(PHONE) + PHONE.length)).toBe(-1);
    expect(phone).not.toContain('outline');
    expect(phone).not.toContain('pack-toolbar');
    expect(phone).not.toContain('.chip');
    expect(phone).not.toContain('story');
    expect(outlet).toContain('min-width: 44px');
    expect(outlet).toContain('min-height: 44px');
    expect(outlet).not.toContain('display');
    expect(timeline).toContain('display: inline-block');
    expect(timeline).toContain('min-width: 44px');
    expect(timeline).toContain('min-height: 44px');
    expect(archiveLink).toContain('display: inline-flex');
    expect(archiveLink).toContain('align-items: center');
    expect(archiveLink).toContain('min-width: 44px');
    expect(archiveLink).toContain('min-height: 44px');
    expect(archiveLink).not.toContain('outline');
    expect(archiveTitle).toContain('display: flex');
    expect(archiveTitle).toContain('align-items: center');
    expect(archiveTitle).toContain('min-width: 44px');
    expect(archiveTitle).toContain('min-height: 44px');
    expect(archiveTitle).not.toContain('outline');
    expect(baseOutlet).toContain('-webkit-line-clamp: 2');
    expect(baseOutlet).not.toContain('44px');
    expect(baseTimeline).not.toContain('44px');
    expect(baseTimeline).toContain('text-decoration: none');
    expect(baseTitle).not.toContain('44px');
    expect(baseTitle).toContain('font-weight: 700');
    expect(baseRead).not.toContain('44px');
    expect(baseRead).toContain('font-size: 0.92rem');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');

    const page = renderContentPage(analysisDoc(), 'https://world-news.xyz/analysis/2026-10-07-fare/', { archive: archive() });
    expect(page).toContain('>閱讀原文 →</a>');
    expect(page).toContain('>加價</a>');
    expect(page).toContain('全部分析 →');
    expect(page).toContain('>早前港聞</a>');
    expect(page).toContain('data-kind="analysis"');
    const timelineAt = page.indexOf('class="timeline"');
    expect(page.slice(timelineAt, page.indexOf('</ol>', timelineAt)).match(/<a /g)).toHaveLength(3);

    const explainer = renderContentPage({
      ...analysisDoc(),
      kind: 'compare',
      blocks: [
        { title: '事件經過', sentences: ['港鐵建議調整票價，並交諮詢。'], sources: analysisDoc().blocks[0]!.sources },
        { title: '事件時間線', sentences: ['港鐵交諮詢。'], sources: analysisDoc().blocks[0]!.sources },
      ],
    }, 'https://world-news.xyz/explainer/2026-10-07-fare/');
    const explainerAt = explainer.indexOf('class="timeline"');
    expect(explainerAt).toBeGreaterThanOrEqual(0);
    expect(explainer.slice(explainerAt, explainer.indexOf('</ol>', explainerAt))).not.toContain('<a');

    const story = storyCluster();
    const storyHtml = renderStoryPage(story.lead, story.cluster, [], 'https://world-news.xyz/story/s1/');
    expect(storyHtml).toContain('>閱讀原文</a>');
    const storyAt = storyHtml.indexOf('class="timeline"');
    expect(storyHtml.slice(storyAt, storyHtml.indexOf('</ol>', storyAt))).not.toContain('<a');
  });

  it.skipIf(!chromeBin())('measures analysis links at 390px and leaves the story chip and the desktop line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'analysis-tap-'));
    const story = storyCluster();
    await writeFile(path.join(dir, 'analysis.html'), withLocalCss(renderContentPage(analysisDoc(), 'https://world-news.xyz/analysis/2026-10-07-fare/', { archive: archive() })));
    await writeFile(path.join(dir, 'story.html'), withLocalCss(renderStoryPage(story.lead, story.cluster, [], 'https://world-news.xyz/story/s1/')));
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'analysis-tap-user-'));
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
      async function read(file: string, width: number, dark: boolean): Promise<PageBox> {
        await rpc('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 700 });
        await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, file)).href });
        const start = Date.now();
        let opened = false;
        while (Date.now() - start < 15000) {
          const needle = file.startsWith('story') ? '.pack-toolbar a.chip' : '.angle-card .read-original';
          opened = await evaluate<boolean>(`document.readyState === "complete" && !!document.querySelector(${JSON.stringify(needle)})`).catch(() => false);
          if (opened) break;
          await sleep(30);
        }
        if (!opened) throw new Error('navigation timed out');
        await evaluate<void>(`document.documentElement.classList.toggle('dark', ${dark});`);
        await evaluate<void>('document.querySelectorAll("details").forEach((node) => { node.open = true; })');
        const root = await rpc('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } };
        const selector = file.startsWith('story')
          ? '.pack-toolbar > a.chip'
          : '.angle-card .read-original, .timeline .tl-body a, .side-card.archive > a.read-original, .side-card.archive li a';
        const found = await rpc('DOM.querySelectorAll', { nodeId: root.root.nodeId, selector }) as { nodeIds: number[] };
        for (const nodeId of found.nodeIds) {
          await rpc('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
        }
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }

      function expectPhone(box: PageBox, label: string) {
        expect(box.innerW, label).toBe(390);
        expect(box.scrollW, label).toBeLessThanOrEqual(390);
        expect(box.reads.map((control) => control.text), label).toEqual([
          '閱讀原文 →',
          '明報報道港鐵票價 →',
          '信報報道港鐵就票價調整展開諮詢並說明對日常通勤的影響 →',
        ]);
        expect(box.timeline.map((control) => control.text), label).toEqual([
          '港鐵建議票價加幅',
          '加價',
          '信報把諮詢程序、票價建議與對乘客日常通勤的影響分開來寫',
        ]);
        expect(box.archive.map((control) => control.text), label).toEqual(['全部分析 →']);
        expect(box.titles.map((control) => control.text), label).toEqual(['早前港聞']);
        for (const control of [...box.reads, ...box.timeline]) {
          const name = `${label} ${control.text}`;
          expect(control.h, name).toBeGreaterThanOrEqual(44);
          expect(control.w, name).toBeGreaterThanOrEqual(44);
          expect(control.hitH, name).toBeGreaterThanOrEqual(44);
          expect(control.hitW, name).toBeGreaterThanOrEqual(44);
          expect(control.minH, name).toBe('44px');
          expect(control.minW, name).toBe('44px');
          expect(control.outline, name).toContain('solid');
          expect(control.outline, name).toContain('3px');
          expect(control.outline, name).toContain('2px');
          expect(control.scrollH, name).toBeLessThanOrEqual(control.h + 1);
        }
        for (const control of box.reads) expect(control.display, `${label} ${control.text}`).not.toBe('inline');
        for (const control of box.timeline) expect(control.display, `${label} ${control.text}`).toBe('inline-block');
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
        const theme = dark ? 'dark' : 'light';
        expectPhone(await read('analysis.html', 390, dark), theme);
      }
      const storyBox = await read('story.html', 390, false);
      expect(storyBox.innerW).toBe(390);
      expect(storyBox.storyRead.map((control) => control.text)).toEqual(['閱讀原文']);
      expect(storyBox.storyTimelineLinks).toBe(0);
      for (const control of storyBox.storyRead) {
        expect(control.h).toBeGreaterThanOrEqual(44);
        expect(control.w).toBeGreaterThanOrEqual(44);
        expect(control.hitH).toBeGreaterThanOrEqual(44);
        expect(control.minH).toBe('44px');
      }

      const desktop = await read('analysis.html', 1100, false);
      expect(desktop.innerW).toBe(1100);
      const short = [...desktop.reads, ...desktop.timeline].filter((control) => control.text === '閱讀原文 →' || control.text === '加價' || control.text === '港鐵建議票價加幅');
      expect(short.map((control) => control.text).sort()).toEqual(['加價', '港鐵建議票價加幅', '閱讀原文 →']);
      for (const control of [...desktop.reads, ...desktop.timeline, ...desktop.archive, ...desktop.titles]) {
        expect(control.minH, `desktop ${control.text}`).not.toBe('44px');
      }
      for (const control of short) expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
      for (const control of desktop.archive) {
        expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
        expect(control.display, `desktop ${control.text}`).not.toBe('inline-flex');
      }
      for (const control of desktop.titles) {
        expect(control.h, `desktop ${control.text}`).toBeLessThan(44);
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
