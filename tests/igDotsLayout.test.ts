import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { renderColumnIndex } from '../shared/contentPage';
import { renderHomeFeed } from '../shared/homePage';
import type { NewsItem } from '../shared/types';

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

const story: NewsItem = {
  id: 't7-story',
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

const MEASURE = `(() => {
  const deck = document.getElementById('ig-deck');
  const nav = document.getElementById('ig-dots');
  if (!deck || !nav) return JSON.stringify({ missing: true });
  const snap = Array.from(deck.querySelectorAll('.ig-card')).filter((card) => {
    let node = card.parentElement;
    while (node && node !== deck) {
      if (node.classList.contains('ig-card')) return false;
      node = node.parentElement;
    }
    return node === deck;
  });
  const style = getComputedStyle(deck);
  const card = snap[0];
  const cardStyle = card ? getComputedStyle(card) : null;
  const dots = Array.from(nav.querySelectorAll('i'));
  const on = dots.filter((dot) => dot.classList.contains('on')).map((dot) => dot.getAttribute('data-i'));
  function orphans(root) {
    const found = [];
    const nodes = root.querySelectorAll('h1, h2, h3, .story-title, .rank-title, .column-title, .hero-title, .dek, p');
    for (const el of nodes) {
      const text = (el.innerText || '').replace(/\\s+/g, '');
      const cjk = (text.match(/[\\u3400-\\u9fff]/g) || []).length;
      if (cjk < 8 || cjk / text.length < 0.6) continue;
      const host = getComputedStyle(el);
      if (host.display === 'none' || host.visibility === 'hidden') continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1);
      if (rects.length < 2) continue;
      const size = parseFloat(host.fontSize) || 16;
      const last = rects[rects.length - 1];
      if (last.width <= size * 1.2 && found.length < 6) {
        found.push((el.innerText || '').trim().slice(0, 36) + ' @' + Math.round(last.width) + '/' + Math.round(size));
      }
    }
    return found;
  }
  const hint = card ? getComputedStyle(card, '::after') : null;
  return JSON.stringify({
    missing: false,
    snap: snap.length,
    nested: deck.querySelectorAll('.ig-card').length,
    count: nav.getAttribute('data-ig-count'),
    dots: dots.length,
    windowed: nav.classList.contains('ig-dots-window'),
    on,
    scrollbar: style.scrollbarWidth,
    gutter: deck.offsetWidth - deck.clientWidth,
    snapType: style.scrollSnapType,
    snapStop: cardStyle ? cardStyle.scrollSnapStop : '',
    flexGrow: cardStyle ? cardStyle.flexGrow : '',
    flexShrink: cardStyle ? cardStyle.flexShrink : '',
    cardH: card ? card.offsetHeight : 0,
    deckH: deck.clientHeight,
    deckW: deck.clientWidth,
    orphans: orphans(deck),
    hint: hint ? hint.content : '',
    hintSize: hint ? hint.fontSize : '',
    dotSize: dots[0] ? getComputedStyle(dots[0]).width : '',
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

describe('T7 snap indicator layout', () => {
  it.skipIf(!chromeBin())('counts snap pages, hides the deck scrollbar, and avoids a one-character last line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 't7-pages-'));
    const appCss = pathToFileURL(path.resolve('src/App.css')).href;
    const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
    const when = new Date('2026-10-22T02:00:00.000Z');
    const entry = {
      key: '2026-10-25-pm',
      title: '每日香港導讀把傍晚要聞收成一段可以整段讀完的說明',
      description: '傍晚導讀把天氣、交通同議會消息放在同一段，避免行末剩下單字。',
      publishedAt: '2026-10-25T10:00:00.000Z',
      sources: 4,
      outlets: 3,
      category: 'hk',
    };
    const pages: Record<string, string> = {
      home: withLocalCss(renderHomeFeed([
        story,
        { ...story, id: 't7-b', title: '立法會恢復二讀並審議多項與民生有關的修訂' },
      ], new Map(), null, '', null, '', [], [], when, true), appCss, columnsCss),
      briefing: withLocalCss(renderColumnIndex('briefing', [
        entry,
        { ...entry, key: '2026-10-25-am', title: '早上導讀先列交通消息再接到天氣提示' },
      ], 'https://world-news.xyz/briefing/'), appCss, columnsCss),
      hub: withLocalCss(renderCivilizationHub(when).html, appCss, columnsCss),
      chronicle: withLocalCss(renderChroniclePage().html, appCss, columnsCss),
    };
    for (const [name, html] of Object.entries(pages)) {
      await writeFile(path.join(dir, `${name}.html`), html);
    }
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 't7-chrome-'));
    const chrome: ChildProcess = spawn(chromeBin(), [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      `--user-data-dir=${userDir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    const started = Date.now();
    while (Date.now() - started < 12000) {
      if (chrome.exitCode != null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (response.ok) break;
      } catch { /* devtools not up yet */ }
      await sleep(40);
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
    const failures: string[] = [];
    try {
      for (const viewport of [{ name: 'phone', width: 390, height: 844 }, { name: 'wide', width: 1280, height: 800 }]) {
        await rpc('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 });
        for (const name of ['home', 'briefing', 'hub', 'chronicle']) {
          await evaluate<void>('try{sessionStorage.removeItem("wn_ig_hint")}catch(e){}');
          await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, `${name}.html`)).href });
          const readyAt = Date.now();
          let ready = false;
          while (Date.now() - readyAt < 8000) {
            ready = await evaluate<boolean>('!!document.getElementById("ig-dots") && document.getElementById("ig-dots").getAttribute("data-ig-count") != null').catch(() => false);
            if (ready) break;
            await sleep(30);
          }
          if (!ready) {
            failures.push(`${viewport.name} ${name} dots did not boot`);
            continue;
          }
          await evaluate<void>('document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()');
          await sleep(40);
          const sample = JSON.parse(await evaluate<string>(MEASURE)) as {
            missing: boolean;
            snap: number;
            nested: number;
            count: string | null;
            dots: number;
            windowed: boolean;
            on: string[];
            scrollbar: string;
            gutter: number;
            snapType: string;
            snapStop: string;
            flexGrow: string;
            flexShrink: string;
            cardH: number;
            deckH: number;
            deckW: number;
            orphans: string[];
            hint: string;
            hintSize: string;
            dotSize: string;
          };
          const label = `${viewport.name} ${name}`;
          if (sample.missing) failures.push(`${label} missing deck`);
          if (sample.count !== String(sample.snap)) failures.push(`${label} count ${sample.count} snap ${sample.snap} nested ${sample.nested}`);
          if (sample.snap >= 12) {
            if (!sample.windowed || sample.dots > 7 || sample.dots < 1) failures.push(`${label} window dots ${sample.dots} windowed ${sample.windowed}`);
          } else if (sample.dots !== sample.snap) {
            failures.push(`${label} dots ${sample.dots} snap ${sample.snap}`);
          }
          if (sample.on.length !== 1) failures.push(`${label} active dots ${sample.on.join(',')}`);
          if (sample.scrollbar !== 'none') failures.push(`${label} scrollbar ${sample.scrollbar}`);
          if (sample.gutter > 1) failures.push(`${label} gutter ${sample.gutter}`);
          if (!sample.snapType.includes('mandatory')) failures.push(`${label} snap ${sample.snapType}`);
          if (sample.snapStop !== 'always') failures.push(`${label} snap-stop ${sample.snapStop}`);
          if (sample.flexGrow !== '0' || sample.flexShrink !== '0') failures.push(`${label} flex ${sample.flexGrow} ${sample.flexShrink}`);
          if (Math.abs(sample.cardH - sample.deckH) > 1) failures.push(`${label} card height ${sample.cardH} deck ${sample.deckH}`);
          if (!sample.hint.includes('上滑')) failures.push(`${label} hint ${sample.hint}`);
          if (sample.hintSize !== '12px') failures.push(`${label} hint size ${sample.hintSize}`);
          if (sample.dotSize !== '5px' && sample.dotSize !== '3px') failures.push(`${label} dot size ${sample.dotSize}`);
          if (viewport.name === 'wide' && sample.orphans.length) failures.push(`${label} orphans ${sample.orphans.join(' | ')}`);
          const widthBefore = sample.deckW;
          const moved = await evaluate<string>(`(() => {
            const deck = document.getElementById('ig-deck');
            const nav = document.getElementById('ig-dots');
            const close = deck.querySelector('.ig-card-close .ig-sheet') || deck.querySelector('.ig-card-close');
            const extra = document.createElement('div');
            extra.className = 'ig-card ig-card-nested';
            extra.textContent = '巢狀';
            close.appendChild(extra);
            window.dispatchEvent(new Event('resize'));
            const before = deck.clientWidth;
            deck.style.scrollBehavior = 'auto';
            const cards = Array.from(deck.querySelectorAll('.ig-card')).filter((card) => {
              let node = card.parentElement;
              while (node && node !== deck) {
                if (node.classList.contains('ig-card')) return false;
                node = node.parentElement;
              }
              return node === deck;
            });
            deck.scrollTop = cards[1].offsetTop;
            return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
              const on = nav.querySelector('i.on');
              resolve(JSON.stringify({
                count: nav.getAttribute('data-ig-count'),
                width: deck.clientWidth,
                before,
                on: on ? on.getAttribute('data-i') : '',
              }));
            })));
          })()`);
          const after = JSON.parse(moved) as { count: string; width: number; before: number; on: string };
          if (after.count !== String(sample.snap)) failures.push(`${label} nested changed count to ${after.count}`);
          if (after.width !== widthBefore || after.width !== after.before) failures.push(`${label} width shift ${widthBefore} -> ${after.width}/${after.before}`);
          if (after.on !== '1') failures.push(`${label} scroll dot ${after.on}`);
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    } finally {
      ws.close();
      chrome.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 90_000);
});
