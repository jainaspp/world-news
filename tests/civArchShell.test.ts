import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONITOR_READING } from '../shared/civilization/clock';
import {
  CIV_ARCH_CSS,
  civArchResponse,
  OPEN_TITLES,
  stayFace,
  wantsNewsSkin,
} from '../shared/civArch/document';
import { onRequest as homeRequest } from '../functions/index';
import type { PagesContext } from '../functions/env';

const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;

async function page(url: string): Promise<{ status: number; robots: string; body: string }> {
  const response = civArchResponse(url);
  if (!response) throw new Error(`missing ${url}`);
  return {
    status: response.status,
    robots: response.headers.get('x-robots-tag') || '',
    body: await response.text(),
  };
}

function context(url: string, nextBody = 'news-shell'): PagesContext {
  return {
    request: new Request(url),
    env: {},
    waitUntil() {},
    next: async () => new Response(nextBody, { status: 200 }),
  } as unknown as PagesContext;
}

describe('G01 phase-1 document shell', () => {
  it('keeps the news list off the bare home and leaves filtered home requests on that path', async () => {
    expect(wantsNewsSkin(new URL('https://world-news.xyz/'))).toBe(false);
    expect(wantsNewsSkin(new URL('https://world-news.xyz/?time=today'))).toBe(false);
    expect(wantsNewsSkin(new URL('https://world-news.xyz/?view=list'))).toBe(true);
    expect(wantsNewsSkin(new URL('https://world-news.xyz/?view=bookmarks'))).toBe(true);
    expect(wantsNewsSkin(new URL('https://world-news.xyz/?q=港'))).toBe(true);
    expect(wantsNewsSkin(new URL('https://world-news.xyz/?region=HKG'))).toBe(true);
    expect(civArchResponse('https://world-news.xyz/?view=list')).toBeNull();

    const home = await homeRequest(context('https://world-news.xyz/'));
    const homeHtml = await home.text();
    expect(home.status).toBe(200);
    expect(homeHtml).toContain('data-civ-arch="g01"');
    expect(homeHtml).not.toContain('news-shell');

    const listed = await homeRequest(context('https://world-news.xyz/?view=list'));
    expect(await listed.text()).toBe('news-shell');
    expect(readFileSync('functions/index.ts', 'utf8')).toContain('loadHkNow(');
  });

  it('renders the home shell in server HTML: brand, seven beats, vol2 stop, bookmark, margin, static clock', async () => {
    const home = await page('https://world-news.xyz/');
    const { body } = home;
    expect(home.status).toBe(200);
    expect(home.robots).toBe('index, follow');
    expect(body.match(/<h1[\s>]/g)).toHaveLength(1);
    const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '';
    expect(h1).toContain('文明編年史');
    expect(h1).not.toContain('今日');
    expect(h1).not.toContain('旁註');
    expect(body.indexOf('<h1')).toBeLessThan(body.indexOf('id="civ-open"'));
    expect(body).toContain('一卷，三段時間');
    expect(body).toContain('跳過開場');
    expect(body).not.toContain('<canvas');
    expect(body).not.toContain('setInterval');
    expect(body).not.toContain('adsbygoogle');
    expect(body).not.toContain('pagead');
    expect(body).not.toContain('新聞');
    expect(body).not.toContain('class="hero-opening"');
    expect(body).not.toContain('axis-hero');
    expect(body).not.toMatch(REDLINE);
    for (const title of OPEN_TITLES) expect(body).toContain(title);
    expect(body).toContain('prefers-reduced-motion: reduce');
    expect(body).toContain('data-at="600"');

    const ancient = body.indexOf('id="vol-ancient"');
    const present = body.indexOf('id="vol-present"');
    const ahead = body.indexOf('id="vol-ahead"');
    const method = body.indexOf('id="ch-method"');
    const bookmark = body.indexOf('id="bookmark"');
    const margin = body.indexOf('id="margin-strip"');
    const tools = body.indexOf('id="ch-tools"');
    const stay = body.indexOf('id="stay"');
    expect(ancient).toBeGreaterThan(body.indexOf('id="civ-open"'));
    expect(ancient).toBeLessThan(present);
    expect(present).toBeLessThan(ahead);
    expect(method).toBeLessThan(bookmark);
    expect(bookmark).toBeLessThan(margin);
    expect(margin).toBeLessThan(tools);
    expect(tools).toBeLessThan(stay);
    expect(stay).toBeLessThan(ahead);

    expect(body).toContain('本卷是「今」。');
    expect(body).toContain('向上為「古」。');
    expect(body).toContain('向下為「未來」。');
    expect(body).toContain('第一段。此處有正文。');
    expect(body).toContain('第二段。此處有正文。');
    expect(body).toContain('今日沒有可對照的切片');
    expect(body).toContain('href="/cut/"');
    expect(body).toContain('漢語與文字');
    expect(body).toContain('數量與形式');
    expect(body).toContain('英語與世界語文門徑');
    expect(body).toContain('href="/margin/"');
    expect(body).toContain(stayFace());
    expect(body).toContain(MONITOR_READING.asOf);
    expect(body).toContain('資料日期：');
    expect(body).toContain('此數不走動，亦非預報。');
    expect(body).toContain('停留刻度由編輯寫定。');
    expect(body).not.toContain('距午夜');
    expect(body).not.toContain('倒數');
    expect(body).not.toContain('剩餘');
    expect(body).toContain('依 ');
    expect(body).toContain('CC BY 4.0');
    expect(body).toContain('署名：文明編年史。');
    expect(body).toContain('href="/privacy/"');
    expect(body).toContain('href="/terms/"');
    expect(body).toContain('href="/contact/"');
    expect(body).toContain('vol-present');
    expect(body).not.toContain('autofocus');
  });

  it('styles a vertical 390 shell: 44px rows, no page-level horizontal scroll', () => {
    expect(CIV_ARCH_CSS).toContain('overflow-x: hidden');
    expect(CIV_ARCH_CSS).toContain('overscroll-behavior-x: contain');
    expect(CIV_ARCH_CSS).toContain('min-height: 44px');
    expect(CIV_ARCH_CSS).toContain('touch-action: pan-x pan-y');
    expect(CIV_ARCH_CSS).toContain('@media (max-width: 959px)');
    expect(CIV_ARCH_CSS).toContain('grid-template-columns: 11rem minmax(0, 40rem) 13rem');
    expect(CIV_ARCH_CSS).toContain('font-size: 22px');
    expect(CIV_ARCH_CSS).toContain('font-size: 28px');
    expect(CIV_ARCH_CSS).toContain('font-size: 32px');
    expect(CIV_ARCH_CSS).toContain('font-size: 17px');
    expect(CIV_ARCH_CSS).toContain('font-size: 18px');
    expect(CIV_ARCH_CSS).toContain('font-size: 12px');
    expect(CIV_ARCH_CSS).not.toContain('canvas');
  });

  it('opens /read/ on 卷一 and deep-links a chapter without replaying the opening', async () => {
    const read = await page('https://world-news.xyz/read/');
    expect(read.status).toBe(200);
    expect(read.robots).toBe('index, follow');
    expect(read.body).not.toContain('id="civ-open"');
    expect(read.body).not.toContain('跳過開場');
    expect(read.body).toContain('data-focus="vol-ancient"');
    expect(read.body).toContain('autofocus');
    expect(read.body.indexOf('id="vol-ancient"')).toBeLessThan(read.body.indexOf('id="vol-present"'));
    expect(read.body).toContain('本卷是「古」。向下為「今」，再下為「未來」。');
    expect(read.body).toContain('本卷是「未來」。向上為「今」，再上為「古」。');
    expect(read.body).toContain('其餘章尚未撰成。');
    expect(read.body).toContain('尚未撰成。');
    expect(read.body).not.toMatch(REDLINE);

    const chapter = await page('https://world-news.xyz/read/present/method/');
    expect(chapter.status).toBe(200);
    expect(chapter.robots).toBe('noindex, follow');
    expect(chapter.body).toContain('data-focus="ch-method"');
    expect(chapter.body).toContain('科學方法');
    expect(chapter.body).toContain('<h1 class="wordmark"');

    const missing = await page('https://world-news.xyz/read/ancient/not-a-chapter/');
    expect(missing.status).toBe(404);
    expect(missing.robots).toContain('noindex');
    expect(missing.body).toContain('沒有這一頁');
  });

  it('stubs /cut/, /margin/ and /colophon/ without a fake syllabus or a second clock', async () => {
    const cut = await page('https://world-news.xyz/cut/');
    expect(cut.status).toBe(200);
    expect(cut.robots).toContain('noindex');
    expect(cut.body).toContain('今日沒有可對照的切片');
    expect(cut.body).not.toContain('id="stay"');
    expect(cut.body).not.toContain('adsbygoogle');

    const day = await page('https://world-news.xyz/cut/2026-10-24/');
    expect(day.status).toBe(200);
    expect(day.body).toContain('今日沒有可對照的切片');
    expect(day.body).toContain('2026-10-24');

    const margin = await page('https://world-news.xyz/margin/');
    expect(margin.robots).toContain('noindex');
    expect(margin.body).toContain('href="/margin/script/"');
    expect(margin.body).toContain('尚未開啓');
    expect(margin.body).not.toContain('href="/margin/matter/"');

    const leaf = await page('https://world-news.xyz/margin/script/primer/');
    expect(leaf.robots).toContain('noindex');
    expect(leaf.body).toContain('這一葉尚未撰成。');

    const closed = await page('https://world-news.xyz/margin/matter/');
    expect(closed.body).toContain('尚未開啓。');
    expect(closed.body).not.toContain('課綱');

    const guessed = await page('https://world-news.xyz/margin/guessed/');
    expect(guessed.body).toContain('尚未開啓。');

    const colophon = await page('https://world-news.xyz/colophon/');
    expect(colophon.body).toContain('id="license"');
    expect(colophon.body).toContain('CC BY 4.0');
    expect(colophon.body).toContain('關於本書的長文尚未撰成。');
    expect(colophon.body).not.toMatch(REDLINE);
  });
});
