import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { chrome, renderColumnIndex } from '../shared/contentPage';
import { revealActiveChannelChip } from '../shared/primaryNav';

function chromeBin(): string {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return '';
}

function withLocalCss(html: string): string {
  const appCss = pathToFileURL(path.resolve('src/App.css')).href;
  const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
  const brand = (file: string) => pathToFileURL(path.resolve('public/brand', file)).href;
  return html
    .replaceAll('href="/site.css"', `href="${appCss}"`)
    .replaceAll('href="/columns.css"', `href="${columnsCss}"`)
    .replaceAll('src="/brand/logo.svg', `src="${brand('logo.svg')}`)
    .replaceAll('src="/brand/logo-dark.svg', `src="${brand('logo-dark.svg')}`)
    .replaceAll('src="/brand/logo-compact.svg', `src="${brand('logo-compact.svg')}`)
    .replaceAll('src="/brand/logo-compact-dark.svg', `src="${brand('logo-compact-dark.svg')}`)
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
}

const MEASURE = `(() => {
  const scroller = document.querySelector('.masthead .chip-scroller');
  if (!scroller) return JSON.stringify({ missing: true });
  const port = scroller.getBoundingClientRect();
  const chips = Array.from(scroller.querySelectorAll('.chip')).map((chip) => {
    const box = chip.getBoundingClientRect();
    const inside = box.width > 1 && box.left >= port.left - 1 && box.right <= port.right + 1;
    return { text: (chip.textContent || '').trim(), active: chip.classList.contains('active'), inside };
  });
  const active = chips.find((chip) => chip.active) || null;
  return JSON.stringify({
    portW: Math.round(port.width * 10) / 10,
    scroll: scroller.scrollLeft,
    pageScroll: (document.scrollingElement && document.scrollingElement.scrollTop) || 0,
    active,
    chips,
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

describe('active channel pill', () => {
  it('marks 今天 and 編年 in the primary row and scrolls that row from the document', () => {
    const briefing = chrome('briefing');
    expect(briefing).toContain('id="wn-channel-chip"');
    expect(briefing).not.toContain('class="chip active" href="/#slice"');
    expect(briefing).toContain('class="chip active" href="/briefing/" aria-current="page"');
    expect(briefing).toContain('class="chip civ-chip active" href="/civilization/earth/" aria-current="location"');
    expect(briefing).toContain('scroller.scrollLeft=target');
    expect(briefing).not.toContain('scrollIntoView');
    const chronicle = chrome('chronicle');
    expect(chronicle).not.toContain('class="chip active" href="/civilization/chronicle/"');
    expect(chronicle).toContain('class="chip civ-chip active" href="/civilization/earth/" aria-current="location"');
    expect(chronicle).toContain('id="wn-channel-chip"');
    const civ = chrome('civilization');
    expect(civ).not.toMatch(/class="[^"]*\bciv-chip\b/);
    expect(civ).toContain('>文明總覽</a>');
    expect(civ).toContain('href="/civilization/" aria-current="page"');
    const home = chrome('home');
    expect(home).toContain('class="chip civ-chip active" href="/civilization/earth/" aria-current="location"');
    expect(home).toContain('class="chip active" href="/#slice" aria-current="page"');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('bindChannelChipScroll()');
    expect(revealActiveChannelChip.toString()).toContain('scrollLeft = target');
    expect(revealActiveChannelChip.toString()).not.toContain('scrollIntoView');
  });

  it.skipIf(!chromeBin())('shows the active masthead pill inside the 390px track without scrolling the page', async () => {
    const entry = {
      key: '2026-10-25-pm',
      title: '每日香港導讀',
      description: '傍晚導讀。',
      publishedAt: '2026-10-25T10:00:00.000Z',
      sources: 4,
      outlets: 3,
      category: 'hk',
    };
    const dir = await mkdtemp(path.join(tmpdir(), 'channel-chip-'));
    const pages = {
      briefing: withLocalCss(renderColumnIndex('briefing', [entry], 'https://world-news.xyz/briefing/')),
      chronicle: withLocalCss(renderChroniclePage().html),
      hub: withLocalCss(renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html),
    };
    await writeFile(path.join(dir, 'briefing.html'), pages.briefing);
    await writeFile(path.join(dir, 'chronicle.html'), pages.chronicle);
    await writeFile(path.join(dir, 'hub.html'), pages.hub);
    const port = await freePort();
    const userDir = await mkdtemp(path.join(tmpdir(), 'channel-chip-chrome-'));
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
          const ready = await evaluate<boolean>('document.readyState === "complete" && !!document.querySelector(".masthead .chip-scroller")').catch(() => false);
          if (ready) return;
          await sleep(30);
        }
        throw new Error(`navigation timed out: ${file}`);
      }
      async function read(): Promise<{ portW: number; scroll: number; pageScroll: number; active: { text: string; inside: boolean } | null; chips: { text: string; active: boolean; inside: boolean }[] }> {
        await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return JSON.parse(await evaluate<string>(MEASURE));
      }
      await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

      await open('briefing.html');
      const briefing = await read();
      expect(briefing.active?.text, JSON.stringify(briefing)).toBe('地球生物');
      expect(briefing.active?.inside, JSON.stringify(briefing)).toBe(true);
      expect(briefing.pageScroll, JSON.stringify(briefing)).toBeLessThan(2);
      expect(briefing.portW, JSON.stringify(briefing)).toBeGreaterThan(160);
      const restored = JSON.parse(await evaluate<string>(`(() => {
        ${revealActiveChannelChip.toString()}
        const scroller = document.querySelector('.masthead .chip-scroller');
        scroller.scrollLeft = 0;
        const port = scroller.getBoundingClientRect();
        const active = scroller.querySelector('.chip.active');
        const before = active.getBoundingClientRect();
        const clipped = before.left < port.left - 1 || before.right > port.right + 1;
        revealActiveChannelChip(document);
        const after = active.getBoundingClientRect();
        const next = scroller.getBoundingClientRect();
        return JSON.stringify({
          clipped,
          inside: after.left >= next.left - 1 && after.right <= next.right + 1,
          scroll: scroller.scrollLeft,
          text: (active.textContent || '').trim(),
        });
      })()`)) as { clipped: boolean; inside: boolean; scroll: number; text: string };
      expect(restored.text).toBe('地球生物');
      expect(restored.inside, JSON.stringify(restored)).toBe(true);
      if (restored.clipped) expect(restored.scroll, JSON.stringify(restored)).toBeGreaterThan(0);

      await open('chronicle.html');
      const chronicle = await read();
      expect(chronicle.active?.text, JSON.stringify(chronicle)).toBe('地球生物');
      expect(chronicle.active?.inside, JSON.stringify(chronicle)).toBe(true);
      expect(chronicle.pageScroll, JSON.stringify(chronicle)).toBeLessThan(2);

      await open('hub.html');
      const hub = await read();
      expect(hub.active, JSON.stringify(hub)).toBeNull();
      expect(hub.chips.map((chip) => chip.text), JSON.stringify(hub)).toEqual(expect.arrayContaining(['宇宙起源', '銀河系誕生', '地球生物']));
      expect(hub.chips.some((chip) => chip.text === '文明' || chip.text === '編年' || chip.text === '今天' || chip.text === '開蒙'), JSON.stringify(hub)).toBe(false);
      expect(hub.pageScroll, JSON.stringify(hub)).toBeLessThan(2);
      ws.close();
    } finally {
      browser.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await rm(userDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 40_000);
});
