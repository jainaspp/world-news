/**
 * R8 §7.3 screenshot and geometry capture.
 *
 * Talks to the production renderer on http://127.0.0.1:4173.
 * Adds `body.static` (the stylesheet's screenshot freeze) and pulls
 * Noto in before the shot so full-length frames are readable.
 * Lighthouse is a separate cold load and does not use this freeze.
 *
 *   node capture.mjs --phase matrix|states|extra|all|report
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/tmp/r8tools/package.json');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');
const DATE = '2026-10-22';
const HOST = process.env.R8_HOST || 'http://127.0.0.1:4173';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const JSONL = join(OUT, 'measurements.jsonl');
const phase = (process.argv.find((arg) => arg.startsWith('--phase=')) || '--phase=all').split('=')[1];

mkdirSync(OUT, { recursive: true });

const CORE = [
  { vp: '360', width: 360, height: 800 },
  { vp: '390', width: 390, height: 844 },
  { vp: '768', width: 768, height: 1024 },
  { vp: '1280', width: 1280, height: 800 },
  { vp: '1440', width: 1440, height: 900 },
];
const EXTRA_HC = [
  { vp: '414', width: 414, height: 896 },
  { vp: '1024', width: 1024, height: 1366 },
];
const GRADES = [
  { vp: '360', width: 360, height: 800, grade: 'M' },
  { vp: '768', width: 768, height: 1024, grade: 'T' },
  { vp: '1280', width: 1280, height: 800, grade: 'D' },
];
const THEMES = ['light', 'dark'];

const FONT = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@700&display=swap';

function fileName(page, vp, theme, state) {
  const tail = state ? `-${state}` : '';
  return `${DATE}-${page}-${vp}-${theme}${tail}.png`;
}

function record(row) {
  appendFileSync(JSONL, `${JSON.stringify(row)}\n`);
}

async function meta() {
  const response = await fetch(`${HOST}/__r8/meta`);
  if (!response.ok) throw new Error(`meta ${response.status}`);
  return response.json();
}

function measureScript() {
  const sels = ['.chrome', '.axis-title', '.axis-lede', '.deep-axis', '.axis-cta', '.volume-card', '.chronicle-band', '.pattern-axis', '.case-axis', '.civ-nav'];
  const nodes = sels.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => ({ sel, el, r: el.getBoundingClientRect() }))).filter((n) => n.r.width > 0 && n.r.height > 0);
  const raw = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = a.r.left < b.r.right - 1 && a.r.right > b.r.left + 1;
      const y = a.r.top < b.r.bottom - 1 && a.r.bottom > b.r.top + 1;
      if (x && y) {
        raw.push({
          a: a.sel,
          b: b.sel,
          aBox: box(a.r),
          bBox: box(b.r),
        });
      }
    }
  }

  const leafSels = 'a, button, input, summary, h1, h2, h3, p, .lab, .yr, .chip, .axis-title, .axis-lede, .stage-dot, .dot, .rail';
  const leaves = [...document.querySelectorAll(leafSels)].map((el) => ({ el, r: el.getBoundingClientRect() })).filter((n) => n.r.width > 1 && n.r.height > 1);
  const second = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i];
      const b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = a.r.left < b.r.right - 1 && a.r.right > b.r.left + 1;
      const y = a.r.top < b.r.bottom - 1 && a.r.bottom > b.r.top + 1;
      if (!(x && y)) continue;
      const pair = [selOf(a.el), selOf(b.el)].sort().join(' | ');
      second.push({ pair, aBox: box(a.r), bBox: box(b.r) });
      if (second.length >= 40) break;
    }
    if (second.length >= 40) break;
  }

  function allowed(hit) {
    const names = `${hit.a || ''} ${hit.b || ''} ${hit.pair || ''}`;
    const dotRail = /\bdot\b/.test(names) && /\brail\b/.test(names);
    return dotRail;
  }

  const doc = document.documentElement;
  const scrolling = document.scrollingElement || doc;
  const overflows = [];
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.clientWidth <= 0) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const style = getComputedStyle(el);
    const internal = /(auto|scroll)/.test(style.overflowX);
    overflows.push({
      path: pathOf(el),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      delta: el.scrollWidth - el.clientWidth,
      overflowX: style.overflowX,
      internal,
    });
    if (overflows.length >= 30) break;
  }

  const gaps = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const gap = edgeGap(a.r, b.r);
      if (gap > 0 && gap < 8) {
        gaps.push({ a: a.sel, b: b.sel, gap: Math.round(gap * 10) / 10, aBox: box(a.r), bBox: box(b.r) });
      }
    }
  }

  const dom = {
    homeAxis: !!document.querySelector('.axis-hero.axis-slim, .axis-hero'),
    axisCta: document.querySelectorAll('.axis-cta').length,
    volumeCards: document.querySelectorAll('.volume-card').length,
    chronicleBand: document.querySelectorAll('.chronicle-band').length,
    axisRails: document.querySelectorAll('.axis-rails').length,
    patternAxis: document.querySelectorAll('.pattern-axis').length,
    caseAxis: document.querySelectorAll('.case-axis').length,
    slice: !!document.querySelector('#slice'),
    chAncient: !!document.querySelector('#ch-ancient'),
    chNow: !!document.querySelector('#ch-now'),
    chFuture: !!document.querySelector('#ch-future'),
    stages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => document.getElementById(`stage-${n}`)).length,
    dark: document.documentElement.classList.contains('dark'),
    title: document.title,
  };

  return {
    rawHits: raw,
    reviewedHits: raw.filter((hit) => !allowed(hit)),
    allowedHits: raw.filter(allowed),
    secondHits: second.filter((hit) => !(/\bdot\b/.test(hit.pair) && /\brail\b/.test(hit.pair))),
    scroll: {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      scrollingScrollWidth: scrolling.scrollWidth,
      innerWidth: window.innerWidth,
      pageOverflow: doc.scrollWidth > doc.clientWidth + 1 || scrolling.scrollWidth > window.innerWidth + 1,
    },
    overflows,
    gaps,
    dom,
  };

  function box(r) {
    return {
      left: Math.round(r.left),
      top: Math.round(r.top + window.scrollY),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom + window.scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }
  function edgeGap(a, b) {
    const xOverlap = a.left < b.right - 1 && a.right > b.left + 1;
    const yOverlap = a.top < b.bottom - 1 && a.bottom > b.top + 1;
    if (xOverlap && yOverlap) return 0;
    if (xOverlap) {
      if (a.bottom <= b.top) return b.top - a.bottom;
      if (b.bottom <= a.top) return a.top - b.bottom;
    }
    if (yOverlap) {
      if (a.right <= b.left) return b.left - a.right;
      if (b.right <= a.left) return a.left - b.right;
    }
    return Infinity;
  }
  function selOf(el) {
    if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
    const cls = [...el.classList].slice(0, 3).join('.');
    return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
  }
  function pathOf(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      if (node.classList.length) part += `.${[...node.classList].slice(0, 2).join('.')}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
}

async function shootFull(page, file) {
  const total = await page.evaluate(() => Math.max(
    document.documentElement.scrollHeight,
    document.body ? document.body.scrollHeight : 0,
  ));
  const width = page.viewport().width;
  if (total <= 14000) {
    await page.screenshot({ path: file, fullPage: true });
    return { total, mode: 'fullPage' };
  }
  const client = await page.createCDPSession();
  const chunks = [];
  const chunk = 7000;
  for (let y = 0; y < total; y += chunk) {
    const height = Math.min(chunk, total - y);
    const shot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      fromSurface: true,
      clip: { x: 0, y, width, height, scale: 1 },
    });
    chunks.push(PNG.sync.read(Buffer.from(shot.data, 'base64')));
  }
  await client.detach();
  const image = new PNG({ width: chunks[0].width, height: chunks.reduce((sum, item) => sum + item.height, 0) });
  let y = 0;
  for (const item of chunks) {
    PNG.bitblt(item, image, 0, 0, item.width, item.height, 0, y);
    y += item.height;
  }
  writeFileSync(file, PNG.sync.write(image));
  return { total, mode: 'cdp-stitch' };
}

async function regionShot(page, file, selectors) {
  const rect = await page.evaluate((list) => {
    const boxes = list.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => el.getBoundingClientRect())).filter((r) => r.width > 0 && r.height > 0);
    if (!boxes.length) return null;
    const top = Math.min(...boxes.map((r) => r.top));
    const bottom = Math.max(...boxes.map((r) => r.bottom));
    return { y: top + window.scrollY, height: Math.ceil(bottom - top) };
  }, selectors);
  if (!rect) return null;
  const current = page.viewport();
  const height = Math.max(current.height, Math.min(rect.height + 8, 6000));
  await page.setViewport({ ...current, height });
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, rect.y - 4));
  await page.screenshot({ path: file });
  await page.setViewport(current);
  return rect;
}

async function openPage(browser, spec, path) {
  const page = await browser.newPage();
  const logs = [];
  page.on('pageerror', (error) => {
    logs.push({ kind: 'pageerror', text: String(error && error.message ? error.message : error) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logs.push({ kind: msg.type(), text: msg.text().slice(0, 400) });
    }
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.startsWith('data:')) return;
    logs.push({ kind: 'requestfailed', text: `${req.failure()?.errorText || 'failed'} ${url.slice(0, 180)}` });
  });
  await page.evaluateOnNewDocument((theme) => {
    try {
      localStorage.setItem('darkMode', theme === 'dark' ? 'true' : 'false');
      localStorage.setItem('wn_lang', 'zh-HK');
      sessionStorage.setItem('wn_hero_seen', '1');
    } catch (error) {
      /* private */
    }
    const original = navigator.serviceWorker && navigator.serviceWorker.register;
    if (original) {
      navigator.serviceWorker.register = () => Promise.resolve();
    }
    void original;
  }, spec.theme);
  await page.setViewport({
    width: spec.width,
    height: spec.height,
    deviceScaleFactor: 1,
    isMobile: spec.width <= 640,
    hasTouch: spec.width <= 1024,
  });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: spec.theme },
  ]);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (/googletagmanager|google-analytics|pagead2|doubleclick/.test(url)) {
      req.respond({ status: 204, body: '' }).catch(() => req.abort());
      return;
    }
    req.continue().catch(() => {});
  });
  const target = path.startsWith('http') ? path : `${HOST}${path}`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  return { page, logs };
}

async function settle(page, ready, { scroll = true } = {}) {
  if (ready) await page.waitForSelector(ready, { timeout: 20000 });
  await page.evaluate(async (fontHref) => {
    const existing = document.querySelector('link[href*="fonts.googleapis.com"]');
    if (existing) existing.media = 'all';
    else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontHref;
      document.head.appendChild(link);
    }
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    }
  }, FONT);
  if (scroll) {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const step = Math.max(400, Math.floor(window.innerHeight * 0.85));
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += step) {
        window.scrollTo(0, y);
        await sleep(12);
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(40);
      window.scrollTo(0, 0);
    });
  }
  await page.evaluate(() => document.body && document.body.classList.add('static'));
  await new Promise((resolve) => setTimeout(resolve, 180));
}

function pagesFor(info) {
  return [
    { page: 'home', path: '/', ready: '.volume-card' },
    { page: 'civ', path: '/civilization/', ready: '.volume-card' },
    { page: 'chronicle', path: '/civilization/chronicle/', ready: '#stage-10' },
    { page: 'learn', path: '/learn/', ready: 'h1' },
    { page: 'slice', path: '/#slice', ready: '#slice' },
    { page: 'news', path: info.longest.href, ready: 'h1', article: 'longest', title: info.longest.title },
  ];
}

async function runMatrix(browser, info) {
  const jobs = [];
  for (const page of pagesFor(info)) {
    for (const theme of THEMES) {
      for (const vp of CORE) jobs.push({ page, theme, vp });
      if (page.page === 'home' || page.page === 'civ') {
        for (const vp of EXTRA_HC) jobs.push({ page, theme, vp });
      }
    }
  }
  console.log(`matrix jobs ${jobs.length}`);
  let done = 0;
  for (const job of jobs) {
    const name = fileName(job.page.page, job.vp.vp, job.theme, 'full');
    const dest = join(OUT, name);
    if (existsSync(dest)) {
      done += 1;
      continue;
    }
    const spec = { ...job.vp, theme: job.theme };
    let opened;
    try {
      opened = await openPage(browser, spec, job.page.path);
      await settle(opened.page, job.page.ready);
      const shot = await shootFull(opened.page, dest);
      const measured = await opened.page.evaluate(measureScript);
      record({
        kind: 'full',
        file: name,
        page: job.page.page,
        path: job.page.path,
        vp: job.vp.vp,
        width: job.vp.width,
        height: job.vp.height,
        theme: job.theme,
        article: job.page.article || '',
        title: job.page.title || '',
        shot,
        measured,
        logs: opened.logs,
      });
      done += 1;
      console.log(`full ${done}/${jobs.length} ${name} ${shot.mode} h=${shot.total} overflow=${measured.scroll.pageOverflow} hits=${measured.reviewedHits.length}+${measured.secondHits.length}`);
    } catch (error) {
      console.error(`FAIL ${name}: ${error instanceof Error ? error.stack : error}`);
    } finally {
      if (opened) await opened.page.close().catch(() => {});
    }
  }
}

async function runStates(browser) {
  const jobs = [];
  for (const page of ['home', 'civ']) {
    for (const theme of THEMES) {
      for (const vp of GRADES) {
        for (const state of ['mid', 'end', 'anchor']) jobs.push({ page, theme, vp, state });
      }
    }
  }
  console.log(`state jobs ${jobs.length}`);
  for (const job of jobs) {
    const name = fileName(job.page, job.vp.vp, job.theme, job.state);
    const dest = join(OUT, name);
    if (existsSync(dest)) continue;
    const path = job.state === 'anchor'
      ? (job.page === 'home' ? '/#slice' : '/civilization/#future')
      : (job.page === 'home' ? '/' : '/civilization/');
    const ready = job.page === 'home' ? '.volume-card' : '.volume-card';
    const spec = { ...job.vp, theme: job.theme };
    let opened;
    try {
      opened = await openPage(browser, spec, path);
      await settle(opened.page, ready, { scroll: job.state !== 'anchor' });
      if (job.state === 'mid' || job.state === 'end') {
        await opened.page.evaluate((state) => {
          const height = document.documentElement.scrollHeight - window.innerHeight;
          const top = state === 'end' ? height : Math.round(height * 0.5);
          window.scrollTo(0, Math.max(0, top));
        }, job.state);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (job.state === 'anchor') {
        await new Promise((resolve) => setTimeout(resolve, 2300));
        await opened.page.evaluate(() => document.body && document.body.classList.add('static'));
      }
      const anchor = await opened.page.evaluate(() => {
        const id = (location.hash || '').replace('#', '');
        const el = id ? document.getElementById(id) : null;
        const head = el ? (el.querySelector('h1, h2, h3') || el) : null;
        const chrome = document.querySelector('.chrome');
        if (!head) return { id, gap: null };
        const gap = head.getBoundingClientRect().top - (chrome ? chrome.getBoundingClientRect().bottom : 0);
        return { id, gap: Math.round(gap * 10) / 10, scrollY: Math.round(window.scrollY) };
      });
      await opened.page.screenshot({ path: dest });
      const measured = await opened.page.evaluate(measureScript);
      record({
        kind: job.state,
        file: name,
        page: job.page,
        path,
        vp: job.vp.vp,
        width: job.vp.width,
        height: job.vp.height,
        theme: job.theme,
        anchor,
        measured,
        logs: opened.logs,
      });
      console.log(`state ${name} gap=${anchor.gap}`);
    } catch (error) {
      console.error(`FAIL ${name}: ${error instanceof Error ? error.stack : error}`);
    } finally {
      if (opened) await opened.page.close().catch(() => {});
    }
  }
}

async function runExtra(browser, info) {
  const shots = [];

  function add(row) { shots.push(row); }

  for (const theme of THEMES) {
    for (const vp of [CORE[0], CORE[1]]) {
      add({
        page: 'civ',
        path: '/civilization/',
        ready: '.case-axis',
        theme,
        vp,
        state: 'sameframe',
        selectors: ['.axis-hero'],
      });
      add({
        page: 'home',
        path: '/',
        ready: '.case-axis',
        theme,
        vp,
        state: 'sameframe',
        selectors: ['.axis-hero', '.chronicle-band', '.pattern-axis', '.case-axis'],
      });
    }
  }

  add({
    page: 'civ',
    path: '/civilization/',
    ready: '.axis-cta .btn-ghost',
    theme: 'dark',
    vp: CORE[0],
    state: 'click-slice-P0-CTA-COVER',
    click: true,
  });

  add({
    page: 'chronicle',
    path: '/civilization/chronicle/',
    ready: '.pattern-card, .pattern-axis',
    theme: 'dark',
    vp: CORE[0],
    state: 'pattern-P0-CHRONICLE-PAGE',
    selectors: ['.pattern-card', '.pattern-axis'],
  });
  add({
    page: 'learn',
    path: '/learn/',
    ready: 'h1',
    theme: 'dark',
    vp: CORE[0],
    state: 'accident-P0-LEARN-STACK',
    viewport: true,
  });
  add({
    page: 'news',
    path: info.longest.href,
    ready: 'h1',
    theme: 'dark',
    vp: CORE[0],
    state: 'accident-P0-NEWS-CHROME',
    viewport: true,
    title: info.longest.title,
  });
  add({
    page: 'news',
    path: info.longest.href,
    ready: 'h1',
    theme: 'light',
    vp: CORE[3],
    state: 'accident',
    viewport: true,
    title: info.longest.title,
  });
  add({
    page: 'news',
    path: info.general.href,
    ready: 'h1',
    theme: 'dark',
    vp: CORE[0],
    state: 'general',
    viewport: true,
    title: info.general.title,
  });
  add({
    page: 'news',
    path: info.general.href,
    ready: 'h1',
    theme: 'light',
    vp: CORE[3],
    state: 'general',
    viewport: true,
    title: info.general.title,
  });

  for (const theme of THEMES) {
    add({
      page: 'civ',
      path: '/civilization/',
      ready: '.axis-hero',
      theme,
      vp: CORE[2],
      state: 'accident',
      viewport: true,
    });
  }
  for (const page of ['home', 'civ']) {
    for (const vp of [CORE[3], CORE[4]]) {
      add({
        page,
        path: page === 'home' ? '/' : '/civilization/',
        ready: '.axis-hero',
        theme: 'light',
        vp,
        state: 'accident',
        viewport: true,
      });
    }
  }

  add({
    page: 'home',
    path: '/',
    ready: '.logo-link',
    theme: 'dark',
    vp: CORE[0],
    state: 'wordmark-P0-BRAND',
    selectors: ['.masthead'],
  });

  const land = { vp: 'land', width: 640, height: 360 };
  for (const page of ['home', 'civ']) {
    add({
      page,
      path: page === 'home' ? '/' : '/civilization/',
      ready: '.deep-axis',
      theme: 'dark',
      vp: land,
      state: 'axis-P0-AXIS-NODES',
      selectors: ['.deep-axis'],
    });
  }

  const crops = [
    ['home', '/', 'dark', '360', 'P0-OVERLAP', ['.axis-hero', '.chronicle-band', '.axis-rails']],
    ['civ', '/civilization/', 'dark', '360', 'P0-CLIP', ['.axis-title', '.axis-lede', '.axis-cta']],
    ['home', '/', 'light', '360', 'P0-HSCROLL', null],
    ['home', '/', 'dark', '360', 'P0-HSCROLL-COLLIDE', ['.pattern-axis', '.case-axis']],
    ['civ', '/civilization/', 'light', '360', 'P0-FIXED-WIDTH', null],
    ['home', '/', 'dark', '360', 'P0-TOUCH-44', ['.masthead', '.axis-cta']],
    ['civ', '/civilization/', 'light', '360', 'P0-CTA-TARGET', ['.axis-cta']],
    ['civ', '/civilization/', 'dark', '360', 'P0-Z-STACK', ['.axis-hero']],
    ['home', '/', 'dark', '360', 'P0-NAV', ['.civ-nav', '.masthead']],
    ['civ', '/civilization/', 'dark', '390', 'P0-CONTRAST', ['.deep-axis', '.axis-title']],
    ['home', '/', 'dark', '360', 'P0-DARK-PAPER', ['.today-pin', '.axis-hero']],
    ['civ', '/civilization/', 'dark', '360', 'P0-INK-TOKEN', ['.axis-cta', '.chrome']],
    ['home', '/', 'dark', '360', 'P0-AXIS-NODES', ['.deep-axis']],
    ['chronicle', '/civilization/chronicle/', 'light', '360', 'P0-ROUTE', null],
    ['civ', '/civilization/', 'light', '360', 'P0-DOM-EXPECT', ['.volume-board', '.volume-card']],
    ['home', '/', 'light', '360', 'P0-DOM-EXPECT', ['.chronicle-band', '.axis-rails', '#slice']],
  ];
  for (const [page, path, theme, vpName, id, selectors] of crops) {
    const vp = [...CORE, ...EXTRA_HC, land].find((item) => item.vp === vpName);
    add({
      page,
      path,
      ready: 'body',
      theme,
      vp,
      state: id,
      selectors: selectors || null,
      viewport: !selectors,
    });
  }

  console.log(`extra jobs ${shots.length}`);
  for (const job of shots) {
    const name = fileName(job.page, job.vp.vp, job.theme, job.state);
    const dest = join(OUT, name);
    if (existsSync(dest)) continue;
    const spec = { width: job.vp.width, height: job.vp.height, theme: job.theme };
    let opened;
    try {
      opened = await openPage(browser, spec, job.path);
      await settle(opened.page, job.ready);
      let anchor = null;
      if (job.click) {
        await opened.page.click('.axis-cta .btn-ghost');
        await opened.page.waitForSelector('#slice', { timeout: 20000 });
        await new Promise((resolve) => setTimeout(resolve, 2400));
        await opened.page.evaluate(() => document.body && document.body.classList.add('static'));
        anchor = await opened.page.evaluate(() => {
          const el = document.getElementById('slice');
          const head = el ? (el.querySelector('h1, h2') || el) : null;
          const chrome = document.querySelector('.chrome');
          const gap = head ? head.getBoundingClientRect().top - (chrome ? chrome.getBoundingClientRect().bottom : 0) : null;
          return {
            href: location.pathname + location.hash,
            gap: gap == null ? null : Math.round(gap * 10) / 10,
            heading: head ? head.textContent.trim().slice(0, 40) : '',
          };
        });
        await opened.page.screenshot({ path: dest });
      } else if (job.selectors) {
        const region = await regionShot(opened.page, dest, job.selectors);
        if (!region) await opened.page.screenshot({ path: dest });
      } else {
        await opened.page.screenshot({ path: dest });
      }
      const measured = await opened.page.evaluate(measureScript);
      record({
        kind: 'extra',
        file: name,
        page: job.page,
        path: job.path,
        vp: job.vp.vp,
        width: job.vp.width,
        height: job.vp.height,
        theme: job.theme,
        state: job.state,
        title: job.title || '',
        anchor,
        measured,
        logs: opened.logs,
      });
      console.log(`extra ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}: ${error instanceof Error ? error.stack : error}`);
    } finally {
      if (opened) await opened.page.close().catch(() => {});
    }
  }

  await consoleBoard(browser);
  await outlineShot(browser);
}

async function consoleBoard(browser) {
  const name = fileName('home', '640', 'light', 'console-P0-RENDER-ERR');
  const dest = join(OUT, name);
  const targets = [
    ['home', '/'],
    ['civ', '/civilization/'],
    ['chronicle', '/civilization/chronicle/'],
    ['learn', '/learn/'],
    ['slice', '/#slice'],
    ['news', null],
  ];
  const info = await meta();
  const collected = [];
  for (const theme of THEMES) {
    for (const [page, path] of targets) {
      const href = page === 'news' ? info.longest.href : path;
      const opened = await openPage(browser, { width: 360, height: 800, theme }, href);
      try {
        const ready = page === 'chronicle' ? '#stage-1' : 'body';
        await opened.page.waitForSelector(ready, { timeout: 20000 });
        await new Promise((resolve) => setTimeout(resolve, 800));
        collected.push({ page, theme, href, logs: opened.logs });
      } finally {
        await opened.page.close();
      }
    }
  }
  const exceptions = collected.flatMap((row) => row.logs.filter((item) => item.kind === 'pageerror').map((item) => ({ ...item, page: row.page, theme: row.theme })));
  const warnings = collected.flatMap((row) => row.logs.filter((item) => item.kind !== 'pageerror'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #1e1e1e; color: #d4d4d4; font: 13px/1.45 ui-monospace, monospace; }
    header { background: #252526; padding: 12px 16px; border-bottom: 1px solid #333; }
    h1 { font: 600 16px/1.3 ui-sans-serif, sans-serif; margin: 0 0 4px; color: #fff; }
    p { margin: 0; color: #9cdcfe; }
    section { padding: 12px 16px 20px; }
    .ok { color: #6a9955; } .bad { color: #f48771; }
    li { margin: 4px 0; }
  </style></head><body>
    <header><h1>Console — P0-RENDER-ERR</h1>
    <p>CDP pageerror / console / requestfailed while loading H C N L S A at 360, light and dark. Production renderer, hero settled, service worker not installed.</p></header>
    <section>
      <h2 class="${exceptions.length ? 'bad' : 'ok'}">Uncaught exceptions: ${exceptions.length}</h2>
      ${exceptions.length ? `<ul>${exceptions.map((item) => `<li>${item.page} ${item.theme}: ${escapeHtml(item.text)}</li>`).join('')}</ul>` : '<p class="ok">None. No uncaught exception and no unhandled rejection surfaced as pageerror.</p>'}
      <h2>Other console rows (${warnings.length})</h2>
      <ul>${warnings.slice(0, 40).map((item) => `<li>${escapeHtml(item.kind)}: ${escapeHtml(item.text)}</li>`).join('') || '<li class="ok">none</li>'}</ul>
    </section>
  </body></html>`;
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 900, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: dest, fullPage: true });
  await page.close();
  writeFileSync(join(OUT, 'console-log.json'), JSON.stringify({ exceptions, warnings, pages: collected.map((row) => ({ page: row.page, theme: row.theme, href: row.href, logCount: row.logs.length })) }, null, 2));
  record({
    kind: 'console',
    file: name,
    page: 'home',
    vp: '640',
    width: 640,
    height: 900,
    theme: 'light',
    exceptions: exceptions.length,
    warningCount: warnings.length,
  });
  console.log(`console exceptions=${exceptions.length} other=${warnings.length}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

async function outlineShot(browser) {
  const name = fileName('civ', '360', 'light', 'gaps-outline');
  const dest = join(OUT, name);
  if (existsSync(dest)) return;
  const opened = await openPage(browser, { width: 360, height: 800, theme: 'light' }, '/civilization/');
  try {
    await settle(opened.page, '.volume-card');
    const gaps = await opened.page.evaluate(() => {
      const sels = ['.chrome', '.axis-title', '.axis-lede', '.deep-axis', '.axis-cta', '.volume-card', '.chronicle-band', '.pattern-axis', '.case-axis', '.civ-nav'];
      const nodes = sels.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => ({ sel, el, r: el.getBoundingClientRect() }))).filter((n) => n.r.width > 0 && n.r.height > 0);
      const paint = document.createElement('div');
      paint.id = 'r8-outlines';
      paint.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2147483646';
      document.body.appendChild(paint);
      for (const node of nodes) {
        const mark = document.createElement('div');
        mark.style.cssText = `position:absolute;left:${node.r.left + window.scrollX}px;top:${node.r.top + window.scrollY}px;width:${node.r.width}px;height:${node.r.height}px;outline:2px solid #c2410c;outline-offset:-1px`;
        paint.appendChild(mark);
      }
      return nodes.length;
    });
    await opened.page.screenshot({ path: dest, fullPage: false });
    record({ kind: 'outline', file: name, page: 'civ', vp: '360', theme: 'light', width: 360, height: 800, outlined: gaps });
    console.log(`outline ${name} boxes=${gaps}`);
  } finally {
    await opened.page.close();
  }
}

function loadRows() {
  if (!existsSync(JSONL)) return [];
  return readFileSync(JSONL, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function writeReport(info) {
  const rows = loadRows();
  const files = readdirSync(OUT).filter((name) => name.endsWith('.png'));
  const seat = 'Grok 4.7（R8 證據包，不是投票）';
  const lines = [];
  lines.push(`# PR #198 R8 證據表（§7.3 第 9 項）`);
  lines.push('');
  lines.push(`日期：2026-10-22`);
  lines.push(`分支：\`cursor/chronicle-three-volumes-p0-d5bd\``);
  lines.push(`對象：[#198](https://github.com/jainaspp/world-news/pull/198)`);
  lines.push(`量測：production \`dist/\`，渲染器同 Pages Functions，\`http://127.0.0.1:4173\`。不是 Vite dev。`);
  lines.push(`首頁 feed：\`loadFeeds()\` 前 16 則。頁 A 最長標題「${info.longest.title}」（${info.longest.chars} 字，\`${info.longest.href}\`）。一般稿「${info.general.title}」（${info.general.chars} 字，\`${info.general.href}\`）。`);
  lines.push(`截圖凍結：拍全長與幾何前加上樣式表既有的 \`body.static\`，並提早掛上 Noto。Lighthouse 冷啟動不走這條路。`);
  lines.push(`檢測席欄是量測者，不是三席投票。`);
  lines.push('');
  lines.push(`PNG 檔數：${files.length}。量測列：${rows.length}。`);
  lines.push('');
  lines.push('## 全長與狀態');
  lines.push('');
  lines.push('| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 檢測席 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    if (!row.file || !row.measured && row.kind === 'console') continue;
    if (row.kind === 'console' || row.kind === 'outline') continue;
    const overflow = row.measured?.scroll?.pageOverflow ? 'FAIL' : 'PASS';
    const hits = (row.measured?.reviewedHits?.length || 0) + (row.measured?.secondHits?.length || 0);
    const result = row.measured ? (overflow === 'FAIL' || hits ? 'FAIL' : 'PASS') : 'PASS';
    const id = row.kind === 'full' ? '§7.3.1' : `§7.3 ${row.kind}`;
    lines.push(`| ${id} | ${row.page} | ${row.vp} (${row.width}×${row.height}) | ${row.theme} | ${result} | \`${row.file}\` | ${seat} |`);
  }
  writeFileSync(join(OUT, 'EVIDENCE-TABLE.generated.md'), `${lines.join('\n')}\n`);
  console.log(`report rows ${rows.length} png ${files.length}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none'],
});

try {
  const info = await meta();
  writeFileSync(join(OUT, 'feed-meta.json'), JSON.stringify(info, null, 2));
  if (phase === 'matrix' || phase === 'all') await runMatrix(browser, info);
  if (phase === 'states' || phase === 'all') await runStates(browser);
  if (phase === 'extra' || phase === 'all') await runExtra(browser, info);
  if (phase === 'report' || phase === 'all' || phase === 'matrix' || phase === 'states' || phase === 'extra') writeReport(info);
} finally {
  await browser.close();
}
