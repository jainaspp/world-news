import { readFileSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { igDotsScript } from '../shared/contentPage';
import { renderChroniclePage, renderOriginsPage } from '../shared/civilizationPage';
import { swCacheName } from '../shared/brand';

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

function withLocalCss(html: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  return html.replaceAll('href="/site.css"', `href="${appCss}"`).replaceAll('href="/columns.css"', `href="${columnsCss}"`);
}

const GAPS = `(() => {
  const deck = document.getElementById('ig-deck');
  const cards = Array.from(deck.querySelectorAll(':scope > .ig-card'));
  const range = document.createRange();
  const rows = [];
  for (let idx = 0; idx < Math.min(3, cards.length); idx++) {
    const box = cards[idx].firstElementChild.getBoundingClientRect();
    let worst = 999;
    let sample = '';
    const walker = document.createTreeWalker(cards[idx], NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent || !/\\S/.test(node.textContent)) continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        const gap = box.bottom - r.bottom;
        if (gap < worst) {
          worst = gap;
          sample = node.textContent.trim().replace(/\\s+/g, ' ').slice(-24);
        }
      }
    }
    const top = cards[idx].getBoundingClientRect().top - deck.getBoundingClientRect().top;
    rows.push({ idx, gap: Math.round(worst * 10) / 10, sample, top: Math.round(top * 10) / 10 });
  }
  return JSON.stringify({ scroll: deck.scrollTop, rows });
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

describe('chronicle snap clearance', () => {
  it('reflows the chronicle deck when a webfont finishes, and leaves other decks alone', () => {
    const script = igDotsScript();
    expect(script).toContain('var chronicle=!!deck.querySelector(".chronicle-page")');
    expect(script).toContain('document.fonts.addEventListener("loadingdone"');
    expect(script).toContain('visualViewport.addEventListener("resize"');
    expect(script).toContain('var restore=chronicle&&deck.scrollTop>1');
    expect(swCacheName).toBe('wn-v23');
    expect(renderChroniclePage().html).toContain('class="civ-article chronicle-page"');
    expect(renderOriginsPage().html).not.toContain('class="civ-article chronicle-page"');
    expect(readFileSync('src/App.css', 'utf8')).toContain('.page.ig-snap:has(.chronicle-page) .ig-deck { overflow-anchor: none; }');
  });

  it.skipIf(!chromeBin())('clears a late metric clip on the settled next chronicle card', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'chron-clear-'));
    await writeFile(path.join(dir, 'chronicle.html'), withLocalCss(renderChroniclePage().html));
    await writeFile(path.join(dir, 'origins.html'), withLocalCss(renderOriginsPage().html));
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'chron-clear-chrome-'));
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
    async function evaluate<T>(expression: string): Promise<T> {
      const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }) as {
        result?: { value?: T };
        exceptionDetails?: unknown;
      };
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result?.value as T;
    }
    async function open(file: string) {
      await rpc('Page.navigate', { url: pathToFileURL(path.join(dir, file)).href });
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const ready = await evaluate<boolean>('document.readyState === "complete" && document.getElementById("ig-deck") != null').catch(() => false);
        if (ready) return;
        await sleep(30);
      }
      throw new Error(`navigation timed out: ${file}`);
    }
    const swell = `(() => {
      const style = document.createElement('style');
      style.id = 'late-metrics';
      style.textContent = '.ig-card-flow, .ig-card-flow * { font-size: 22px !important; line-height: 36px !important; }';
      document.head.appendChild(style);
    })()`;
    try {
      await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await open('chronicle.html');
      await evaluate<void>(`(() => { const deck = document.getElementById('ig-deck'); const card = deck.querySelectorAll(':scope > .ig-card')[1]; deck.style.scrollBehavior = 'auto'; deck.scrollTop = card.offsetTop; })()`);
      await evaluate<void>(swell);
      await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const clipped = JSON.parse(await evaluate<string>(GAPS)) as { rows: { idx: number; gap: number }[] };
      expect(clipped.rows.some((row) => row.gap < -4)).toBe(true);
      await evaluate<void>('document.fonts.dispatchEvent(new Event("loadingdone"))');
      await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const healed = JSON.parse(await evaluate<string>(GAPS)) as { scroll: number; rows: { idx: number; gap: number; top: number; sample: string }[] };
      const stuck = healed.rows.filter((row) => row.gap < -1);
      expect(stuck, JSON.stringify(healed)).toEqual([]);
      const next = healed.rows.find((row) => row.idx === 1);
      expect(next && Math.abs(next.top) < 2, JSON.stringify(healed)).toBe(true);

      await open('origins.html');
      await evaluate<void>(swell);
      await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const originsBefore = JSON.parse(await evaluate<string>(GAPS)) as { rows: { gap: number }[] };
      expect(originsBefore.rows.some((row) => row.gap < -4)).toBe(true);
      await evaluate<void>('document.fonts.dispatchEvent(new Event("loadingdone"))');
      await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const originsAfter = JSON.parse(await evaluate<string>(GAPS)) as { rows: { gap: number }[] };
      expect(originsAfter.rows.some((row) => row.gap < -4)).toBe(true);
    } finally {
      ws.close();
      chrome.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 40_000);
});
