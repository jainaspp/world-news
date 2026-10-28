import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { renderCivilizationHub } from '../shared/civilizationPage';
import {
  HOME_HASH_RETRY_MS,
  hashFromHref,
  headingClearance,
  homeAnchorId,
  homeAnchorScrollTop,
  placeHomeHash,
  shouldRecorrect,
} from '../src/homeHash';

function block(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

describe('R2 critical CSS', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const columns = readFileSync('public/columns.css', 'utf8');

  it('keeps wide axis nodes and narrow line-filter chips at least 8px apart', () => {
    const milestones = block(css, '.milestones {');
    expect(milestones).toContain('gap: 8px');
    expect(milestones).not.toContain('gap: 4px');
    const phone = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    expect(block(phone, '.milestones {')).toContain('gap: 12px');
    const row = block(css, '.line-filter-row {');
    expect(row).toContain('gap: 8px');
    expect(row).not.toContain('gap: 6px');
    expect(block(css.slice(css.indexOf('@media (min-width: 640px)')), '.line-filter-row {')).toContain('gap: 8px');
  });

  it('gives the desktop search field and news primary a 44px box', () => {
    expect(css).toContain('@media (min-width: 701px) {\n  .search-bar input { min-height: 44px; }\n}');
    expect(css).toContain('.primary { min-height: 44px; min-width: 44px; }');
    expect(columns).toContain('.story-actions .primary { text-decoration: none; min-height: 44px; min-width: 44px; }');
    expect(columns).toContain('.search-page-form .primary { min-height: 44px; min-width: 44px; }');
  });

  it('points the overview CTA at /#slice and arms the homepage hash scroll', () => {
    const hub = renderCivilizationHub(new Date('2026-10-22T02:00:00.000Z')).html;
    expect(hub).toContain('>跳到今日切片</a>');
    expect(hub).toContain('class="btn btn-ghost" href="/#slice"');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('bindHomeHashScroll');
    const shell = readFileSync('index.html', 'utf8');
    expect(shell).toContain("location.hash === '#slice'");
    expect(shell).toContain("location.hash === '#civ'");
    expect(shell).toContain("history.scrollRestoration = 'manual'");
    expect(HOME_HASH_RETRY_MS[HOME_HASH_RETRY_MS.length - 1]).toBeLessThanOrEqual(2400);
    expect(HOME_HASH_RETRY_MS[HOME_HASH_RETRY_MS.length - 1]).toBeGreaterThanOrEqual(1800);
  });
});

describe('homepage #slice landing math', () => {
  it('scrolls the reported 2104px miss up under the raised anchor offset', () => {
    const chromeBottom = 111;
    const offset = 127;
    const headingInset = 15;
    const sectionTop = chromeBottom + 2104 - headingInset;
    const top = homeAnchorScrollTop(sectionTop, offset);
    expect(top).toBeGreaterThan(1500);
    const headingTop = sectionTop + headingInset - top;
    const clearance = headingClearance(headingTop, chromeBottom);
    expect(clearance).toBeGreaterThanOrEqual(8);
    expect(clearance).toBeLessThanOrEqual(48);
    expect(shouldRecorrect({
      scrollY: 0,
      desired: top,
      programmed: -1,
      headingTop: sectionTop + headingInset,
      headingBottom: sectionTop + headingInset + 28,
      chromeBottom,
    })).toBe(true);
  });

  it('uses the phone offset and does not pull a reader back', () => {
    const chromeBottom = 161;
    const offset = 177;
    const headingInset = 15;
    const sectionTop = 2400;
    const top = homeAnchorScrollTop(sectionTop, offset);
    const clearance = headingClearance(sectionTop + headingInset - top, chromeBottom);
    expect(clearance).toBeGreaterThanOrEqual(8);
    expect(clearance).toBeLessThanOrEqual(48);
    let scrolled = -1;
    const placed = placeHomeHash({
      hash: '#slice',
      scrollY: top,
      offsetPx: offset,
      target: { documentTop: sectionTop },
      scrollTo(next) { scrolled = next; },
    });
    expect(placed).toBe(top);
    expect(scrolled).toBe(-1);
    expect(shouldRecorrect({
      scrollY: 800,
      desired: top,
      programmed: top,
      headingTop: -400,
      headingBottom: -370,
      chromeBottom,
    })).toBe(false);
    expect(homeAnchorId(hashFromHref('/#slice'))).toBe('slice');
    expect(homeAnchorId(hashFromHref('/civilization/#future'))).toBe('');
    expect(homeAnchorId('#civ')).toBe('civ');
  });

  it('re-places when restoration returns to 0 or the layout grows under our scroll', () => {
    expect(shouldRecorrect({
      scrollY: 0,
      desired: 1977,
      programmed: 1977,
      headingTop: 2104,
      headingBottom: 2132,
      chromeBottom: 111,
    })).toBe(true);
    expect(shouldRecorrect({
      scrollY: 1977,
      desired: 2200,
      programmed: 1977,
      headingTop: 400,
      headingBottom: 428,
      chromeBottom: 111,
    })).toBe(true);
    expect(shouldRecorrect({
      scrollY: 1977,
      desired: 1977,
      programmed: 1977,
      headingTop: 142,
      headingBottom: 170,
      chromeBottom: 111,
    })).toBe(false);
  });
});

interface Probe {
  evaluate<T>(expression: string): Promise<T>;
  navigate(url: string): Promise<void>;
  viewport(width: number, height: number): Promise<void>;
  close(): Promise<void>;
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
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopChrome(chrome: ChildProcess, dir: string): Promise<void> {
  if (chrome.exitCode == null) chrome.kill('SIGKILL');
  await sleep(80);
  await rm(dir, { recursive: true, force: true }).catch(async () => {
    await sleep(150);
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  });
}

async function launchChrome(): Promise<Probe> {
  const port = await freePort();
  const dir = await mkdtemp(path.join(tmpdir(), 'r2-chrome-'));
  const bin = chromeBin();
  if (!bin) throw new Error('chrome is not installed');
  const chrome: ChildProcess = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--disable-background-networking',
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
    await stopChrome(chrome, dir);
    throw new Error(`chrome did not start\n${stderr.slice(-800)}`);
  }
  try {
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
    const started = Date.now();
    let last = 'evaluate failed';
    while (Date.now() - started < 5000) {
      try {
        const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }) as {
          result?: { value?: T };
          exceptionDetails?: unknown;
        };
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result?.value as T;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
        if (!/context|destroyed|closed/i.test(last)) throw error;
        await sleep(30);
      }
    }
    throw new Error(last);
  }
  return {
    evaluate,
    async navigate(url: string) {
      const want = new URL(url);
      await rpc('Page.navigate', { url });
      const start = Date.now();
      while (Date.now() - start < 8000) {
        let href = '';
        try { href = await evaluate<string>('location.href'); } catch { href = ''; }
        if (!href) { await sleep(30); continue; }
        const got = new URL(href);
        const same = got.pathname === want.pathname && got.search === want.search && got.hash === want.hash;
        if (!same) { await sleep(30); continue; }
        const ready = await evaluate<boolean>(`document.readyState === 'complete'`);
        if (ready) {
          await evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
          return;
        }
        await sleep(30);
      }
      throw new Error(`navigation timed out: ${url}`);
    },
    async viewport(width: number, height: number) {
      await rpc('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    },
    async close() {
      ws.close();
      await stopChrome(chrome, dir);
    },
  };
  } catch (error) {
    await stopChrome(chrome, dir);
    throw error;
  }
}

function homeFixture(cssHref: string, binder: string): string {
  return `<!doctype html>
<html lang="zh-HK">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${cssHref}" />
<style>.fixture-chrome { height: 111px; min-height: 111px; max-height: 111px; overflow: hidden; }</style>
<script>
try {
  if ((location.hash === '#slice' || location.hash === '#civ') && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
} catch (e) {}
</script>
</head>
<body>
<div class="page">
  <div class="chrome fixture-chrome"><a id="same-slice" href="#slice">跳到今日切片</a></div>
  <div class="civ-home">
    <div style="height:2104px"></div>
    <section class="today-slice" id="slice" aria-label="今日切片">
      <div class="slice-head"><h2>今日切片</h2></div>
    </section>
    <div style="height:800px"></div>
  </div>
</div>
<script>
  if (new URLSearchParams(location.search).get('bug') === '1') {
    window.addEventListener('load', function () {
      setTimeout(function () { window.scrollTo(0, 0); }, 400);
    });
  }
</script>
<script type="module">
${binder}
bindHomeHashScroll();
</script>
</body>
</html>`;
}

function measureFixture(appCss: string, columnsCss: string): string {
  const nodes = ['宇宙', '地球', '起源', '技術', '城市', '今天', '未來'].map((label) => (
    `<li><a class="axis-node" href="/civilization/"><span class="dot"></span><span class="lab">${label}</span><span class="yr">年</span></a></li>`
  )).join('');
  const chips = ['全部', '能量', '信息', '制度', '貨幣'].map((label) => `<button type="button" class="chip">${label}</button>`).join('');
  return `<!doctype html>
<html lang="zh-HK">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${appCss}" />
<link rel="stylesheet" href="${columnsCss}" />
</head>
<body>
<div class="page">
  <form class="search-bar" role="search"><input id="news-search" placeholder="搜尋" /></form>
  <div class="deep-axis"><ol class="milestones">${nodes}</ol></div>
  <div class="line-filter"><div class="line-filter-row">${chips}</div></div>
  <div class="story-actions"><a class="primary" href="https://example.com/story">閱讀原文</a></div>
  <form class="search-page-form"><button class="primary" type="submit">搜尋</button></form>
  <section class="hero-opening"><p class="hero-kicker">文明編年史 · 開場</p></section>
  <p class="learn-actions"><button type="button" data-learn-reset>重設本機進度</button></p>
</div>
</body>
</html>`;
}

const EDGE_GAPS = `(() => {
  function gaps(selector) {
    const nodes = Array.from(document.querySelectorAll(selector));
    const found = [];
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1].getBoundingClientRect();
      const b = nodes[i].getBoundingClientRect();
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlap < 8) continue;
      found.push(b.left - a.right);
    }
    return found;
  }
  function lin(channel) {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }
  function lum(rgb) {
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }
  function contrast(fg, bg) {
    const hi = Math.max(lum(fg), lum(bg));
    const lo = Math.min(lum(fg), lum(bg));
    return (hi + 0.05) / (lo + 0.05);
  }
  function parseColor(value) {
    const match = String(value).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (!match) return null;
    return { rgb: [Number(match[1]), Number(match[2]), Number(match[3])], alpha: match[4] == null ? 1 : Number(match[4]) };
  }
  function opaqueBackground(el) {
    for (let node = el; node; node = node.parentElement) {
      const parsed = parseColor(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.alpha >= 0.99) return parsed.rgb;
    }
    return null;
  }
  const search = document.querySelector('.search-bar input');
  const story = document.querySelector('.story-actions .primary');
  const submit = document.querySelector('.search-page-form .primary');
  const learn = document.querySelector('.learn-actions button');
  const learnBox = learn ? learn.getBoundingClientRect() : { width: 0, height: 0 };
  const kicker = document.querySelector('.hero-kicker');
  const kickerFg = kicker ? parseColor(getComputedStyle(kicker).color) : null;
  const kickerBg = kicker ? opaqueBackground(kicker) : null;
  const axisNodes = Array.from(document.querySelectorAll('.milestones > li > .axis-node')).map((node) => {
    const box = node.getBoundingClientRect();
    return { t: Math.round(box.top), l: Math.round(box.left), w: Math.round(box.width) };
  });
  return JSON.stringify({
    width: window.innerWidth,
    axisNodes,
    axis: gaps('.milestones > li > .axis-node'),
    lines: gaps('.line-filter-row > .chip'),
    search: search ? search.getBoundingClientRect().height : 0,
    searchDisplay: search ? getComputedStyle(search).display : '',
    story: story ? story.getBoundingClientRect().height : 0,
    submit: submit ? submit.getBoundingClientRect().height : 0,
    learnW: learnBox.width,
    learnH: learnBox.height,
    kicker: kickerFg && kickerBg ? contrast(kickerFg.rgb, kickerBg) : 0,
  });
})()`;

const LANDING = `(() => {
  const chrome = document.querySelector('.chrome').getBoundingClientRect();
  const heading = document.querySelector('#slice h2').getBoundingClientRect();
  return JSON.stringify({
    scrollY: window.scrollY,
    hash: location.hash,
    clearance: heading.top - chrome.bottom,
  });
})()`;

describe('headless R2 measurements', () => {
  it.skipIf(!chromeBin())('measures 768/1024 axis gaps, line-filter gaps, control heights, and the overview jump', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'r2-fix-'));
    const appCss = pathToFileURL(path.resolve('src/App.css')).href;
    const columnsCss = pathToFileURL(path.resolve('public/columns.css')).href;
    const source = readFileSync('src/homeHash.ts', 'utf8');
    const binder = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText;
    await writeFile(path.join(dir, 'measure.html'), measureFixture(appCss, columnsCss));
    await writeFile(path.join(dir, 'home.html'), homeFixture(appCss, binder));
    await writeFile(path.join(dir, 'hub.html'), `<!doctype html><meta charset="utf-8" /><p><a class="btn btn-ghost" id="jump" href="home.html?bug=1#slice">跳到今日切片</a></p>`);
    const probe = await launchChrome();
    try {
      await probe.viewport(768, 900);
      await probe.navigate(pathToFileURL(path.join(dir, 'measure.html')).href);
      expect(await probe.evaluate<number>('window.innerWidth')).toBe(768);
      const at768 = JSON.parse(await probe.evaluate<string>(EDGE_GAPS)) as { axis: number[]; lines: number[]; search: number; story: number; submit: number; learnW: number; learnH: number; kicker: number };
      expect(at768.axis.length, JSON.stringify(at768)).toBeGreaterThanOrEqual(6);
      expect(at768.lines.length, JSON.stringify(at768)).toBeGreaterThanOrEqual(4);
      expect(Math.min(...at768.axis), JSON.stringify(at768)).toBeGreaterThanOrEqual(7.5);
      expect(Math.min(...at768.lines), JSON.stringify(at768)).toBeGreaterThanOrEqual(7.5);
      expect(at768.search, JSON.stringify(at768)).toBeGreaterThanOrEqual(44);
      expect(at768.story, JSON.stringify(at768)).toBeGreaterThanOrEqual(44);
      expect(at768.submit, JSON.stringify(at768)).toBeGreaterThanOrEqual(44);
      expect(at768.learnW, JSON.stringify(at768)).toBeGreaterThanOrEqual(44);
      expect(at768.learnH, JSON.stringify(at768)).toBeGreaterThanOrEqual(44);
      expect(at768.kicker, JSON.stringify(at768)).toBeGreaterThanOrEqual(4.5);

      await probe.viewport(1024, 900);
      await probe.evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      expect(await probe.evaluate<number>('window.innerWidth')).toBe(1024);
      const at1024 = JSON.parse(await probe.evaluate<string>(EDGE_GAPS)) as { axis: number[]; search: number };
      expect(at1024.axis.length, JSON.stringify(at1024)).toBeGreaterThanOrEqual(6);
      expect(Math.min(...at1024.axis), JSON.stringify(at1024)).toBeGreaterThanOrEqual(7.5);
      expect(at1024.search, JSON.stringify(at1024)).toBeGreaterThanOrEqual(44);

      await probe.viewport(390, 800);
      await probe.evaluate<void>('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      expect(await probe.evaluate<number>('window.innerWidth')).toBe(390);
      const narrow = JSON.parse(await probe.evaluate<string>(EDGE_GAPS)) as { lines: number[]; story: number; searchDisplay: string; learnW: number; learnH: number; kicker: number };
      expect(narrow.lines.length, JSON.stringify(narrow)).toBeGreaterThanOrEqual(4);
      expect(Math.min(...narrow.lines), JSON.stringify(narrow)).toBeGreaterThanOrEqual(7.5);
      expect(narrow.story, JSON.stringify(narrow)).toBeGreaterThanOrEqual(44);
      expect(narrow.learnW, JSON.stringify(narrow)).toBeGreaterThanOrEqual(44);
      expect(narrow.learnH, JSON.stringify(narrow)).toBeGreaterThanOrEqual(44);
      expect(narrow.kicker, JSON.stringify(narrow)).toBeGreaterThanOrEqual(4.5);
      expect(narrow.searchDisplay).toBe('none');

      await probe.viewport(1280, 900);
      await probe.navigate(pathToFileURL(path.join(dir, 'home.html')).href + '#slice');
      await sleep(400);
      const direct = JSON.parse(await probe.evaluate<string>(LANDING)) as { scrollY: number; hash: string; clearance: number };
      expect(direct.hash).toBe('#slice');
      expect(direct.scrollY, JSON.stringify(direct)).toBeGreaterThan(500);
      expect(direct.clearance, JSON.stringify(direct)).toBeGreaterThanOrEqual(8);
      expect(direct.clearance, JSON.stringify(direct)).toBeLessThanOrEqual(80);

      await probe.navigate(pathToFileURL(path.join(dir, 'home.html')).href);
      await probe.evaluate<void>(`document.querySelector('#same-slice').click()`);
      await sleep(400);
      const same = JSON.parse(await probe.evaluate<string>(LANDING)) as { scrollY: number; hash: string; clearance: number };
      expect(same.hash).toBe('#slice');
      expect(same.scrollY, JSON.stringify(same)).toBeGreaterThan(500);
      expect(same.clearance, JSON.stringify(same)).toBeGreaterThanOrEqual(8);
      expect(same.clearance, JSON.stringify(same)).toBeLessThanOrEqual(80);

      await probe.navigate(pathToFileURL(path.join(dir, 'hub.html')).href);
      const jumpedAt = Date.now();
      await probe.evaluate<void>(`document.querySelector('#jump').click()`);
      const start = Date.now();
      let landed = false;
      while (Date.now() - start < 4000) {
        const href = await probe.evaluate<string>('location.href');
        if (href.includes('home.html') && href.includes('#slice')) {
          landed = true;
          break;
        }
        await sleep(30);
      }
      expect(landed).toBe(true);
      const remain = 2500 - (Date.now() - jumpedAt);
      if (remain > 0) await sleep(remain);
      const cross = JSON.parse(await probe.evaluate<string>(LANDING)) as { scrollY: number; hash: string; clearance: number };
      expect(cross.hash).toBe('#slice');
      expect(cross.scrollY, JSON.stringify(cross)).toBeGreaterThan(500);
      expect(cross.clearance, JSON.stringify(cross)).toBeGreaterThanOrEqual(8);
      expect(cross.clearance, JSON.stringify(cross)).toBeLessThanOrEqual(80);
    } finally {
      await probe.close();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 45_000);
});
