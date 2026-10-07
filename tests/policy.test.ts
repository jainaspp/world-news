import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEED_AD_EVERY, homeAllowsAds } from '../shared/adPolicy';
import {
  CONTACT_RATE_LIMIT,
  CONTACT_TTL_SECONDS,
  acceptContact,
  normalizeContact,
  sameOrigin,
  type ContactKv,
} from '../shared/contact';
import { promptFor, weeklyFromHeadlines } from '../shared/content';
import {
  ANALYSIS_INDEX_NOTE,
  MIN_BODY_CHARS,
  cjkChars,
  editorNote,
  pageBodyChars,
  renderAnalysisIndex,
  renderContentPage,
} from '../shared/contentPage';
import { FEEDS } from '../shared/feeds';
import { renderHomeFeed } from '../shared/homePage';
import { renderAboutPage, renderContactPage, renderPrivacyPage, renderTermsPage } from '../shared/sitePages';
import { renderStoryPage } from '../shared/storyPage';
import type { NewsItem } from '../shared/types';

function memoryKv(): ContactKv & { rows: Map<string, { value: string; ttl?: number }> } {
  const rows = new Map<string, { value: string; ttl?: number }>();
  return {
    rows,
    async get(key) {
      return rows.get(key)?.value ?? null;
    },
    async put(key, value, options) {
      rows.set(key, { value, ttl: options?.expirationTtl });
    },
  };
}

function headline(id: string, title: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-06T01:00:00Z',
    category: 'hk',
  };
}

describe('policy pages', () => {
  it('renders about, privacy, terms and contact without ads or an invented email', () => {
    const about = renderAboutPage();
    const privacy = renderPrivacyPage();
    const terms = renderTermsPage();
    const contact = renderContactPage();
    for (const html of [about, privacy, terms, contact]) {
      expect(html).toContain('class="masthead"');
      expect(html).toContain('class="app-footer"');
      expect(html).toContain('href="/about/"');
      expect(html).toContain('href="/privacy/"');
      expect(html).toContain('href="/terms/"');
      expect(html).toContain('href="/contact/"');
      expect(html).not.toContain('adsbygoogle');
      expect(html).not.toContain('mailto:');
      expect(html).not.toContain('請點擊');
      expect(html).not.toContain('click here');
    }
    expect(about).toContain('不轉載');
    expect(about).toContain('AI 整合');
    expect(about).toContain('香港電台');
    expect(about).toContain('https://news.rthk.hk');
    expect(about.match(/<li><a href=/g)?.length).toBe(new Set(FEEDS.map((feed) => `${feed.label}|${feed.homepage}`)).size);
    expect(privacy).toContain('https://policies.google.com/technologies/partner-sites');
    expect(privacy).toContain('https://adssettings.google.com');
    expect(privacy).toContain('ca-pub-8392975944327076');
    expect(privacy).toContain('Cloudflare Web Analytics');
    expect(privacy).toContain('wn_bookmarks_v2');
    expect(privacy).toContain('wn_board_v1');
    expect(privacy).toContain('wn_wx_loc_v1');
    expect(privacy).toContain('Open-Meteo');
    expect(privacy).toContain('用我位置');
    expect(privacy).toContain('不會出售個人資料');
    expect(privacy).toContain('十三歲以下');
    expect(privacy).toContain('2026年10月7日');
    expect(terms).toContain('原來的出版者');
    expect(terms).toContain('只供參考');
    expect(terms).toContain('不保證');
    expect(terms).toContain('外部');
    expect(contact).toContain('name="message"');
    expect(contact).toContain('name="company"');
    expect(contact).toContain('action="/api/contact"');
    expect(contact).toContain('名字（可選）');
  });
});

describe('contact store', () => {
  it('stores a message under contact: for 90 days and rate limits the IP hash', async () => {
    const kv = memoryKv();
    const ok = await acceptContact(kv, 'abc123', { name: '  陳  ', message: '  想查詢廣告位  ' }, 1_700_000_000_000);
    expect(ok.status).toBe(200);
    const saved = [...kv.rows.entries()].find(([key]) => key.startsWith('contact:') && !key.startsWith('contact:rl:'));
    expect(saved?.[0].startsWith('contact:')).toBe(true);
    expect(saved?.[1].ttl).toBe(CONTACT_TTL_SECONDS);
    expect(JSON.parse(saved?.[1].value || '{}')).toMatchObject({ name: '陳', message: '想查詢廣告位' });
    expect(saved?.[1].value).not.toContain('abc123');
    expect(kv.rows.get('contact:rl:abc123')?.ttl).toBe(60 * 60);

    kv.rows.set('contact:rl:abc123', { value: String(CONTACT_RATE_LIMIT), ttl: 3600 });
    const limited = await acceptContact(kv, 'abc123', { message: '再一則' });
    expect(limited.status).toBe(429);

    const before = kv.rows.size;
    const honey = await acceptContact(kv, 'abc123', { message: '垃圾', company: 'spam llc' });
    expect(honey.status).toBe(200);
    expect(honey.code).toBe('honeypot');
    expect(kv.rows.size).toBe(before);
    expect((await acceptContact(kv, 'abc123', { message: ' ' })).status).toBe(400);
    expect((await acceptContact(undefined, 'abc123', { message: '有內容' })).status).toBe(503);
    expect(normalizeContact({ name: 'x'.repeat(200) }).name).toHaveLength(80);
    expect(sameOrigin('https://world-news.xyz/api/contact', 'https://world-news.xyz')).toBe(true);
    expect(sameOrigin('https://world-news.xyz/api/contact', 'https://evil.example')).toBe(false);
  });
});

describe('thin pages and original columns', () => {
  it('keeps story pages noindex and off AdSense, and gives columns a real body', () => {
    const story = renderStoryPage(headline('abc123', '港鐵加價'), null, [], 'https://world-news.xyz/story/abc123/');
    expect(story).toContain('<meta name="robots" content="noindex, follow" />');
    expect(story).not.toContain('adsbygoogle');
    expect(readFileSync('functions/story/[id].ts', 'utf8')).toContain("x-robots-tag': 'noindex, follow'");

    const weekly = weeklyFromHeadlines(
      [{ title: '晶片出口新規', url: 'https://example.com/t', source: 'BBC 科技' }],
      [{ title: '港股半日升', url: 'https://example.com/b', source: '港台財經' }],
      '2026-10-04',
    );
    expect(pageBodyChars(weekly)).toBeGreaterThanOrEqual(MIN_BODY_CHARS);
    const html = renderContentPage(weekly, 'https://world-news.xyz/weekly/2026-10-04');
    expect(html).toContain('編者按');
    expect(html).toContain('<h2 class="column-h2">一週科技</h2>');
    expect(html).toContain('AI 整合');
    expect(html).toContain('https://example.com/t');
    expect(html).toContain('adsbygoogle.js');
    const slotted = renderContentPage(weekly, 'https://world-news.xyz/weekly/2026-10-04', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111' },
    });
    expect(slotted).toContain('<span class="ad-label">廣告</span>');
    expect(slotted.indexOf('編者按')).toBeLessThan(slotted.indexOf('data-ad-position="top"'));
    expect(cjkChars(editorNote('digest'))).toBeGreaterThan(80);
    expect(cjkChars(ANALYSIS_INDEX_NOTE)).toBeGreaterThanOrEqual(MIN_BODY_CHARS);
    expect(renderAnalysisIndex([], 'https://world-news.xyz/analysis/')).toContain('編者按');

    const digestPrompt = promptFor({ ...weekly, kind: 'digest' });
    expect(digestPrompt.user).toContain('四十字');
    expect(digestPrompt.maxTokens).toBe(3200);
    const weeklyPrompt = promptFor(weekly);
    expect(weeklyPrompt.user).toContain('四百字');
    expect(weeklyPrompt.maxTokens).toBe(1400);
    const analysisPrompt = promptFor({ ...weekly, kind: 'analysis' });
    expect(analysisPrompt.user).toContain('四百字');
    expect(analysisPrompt.maxTokens).toBe(1500);
  });

  it('places at most one homepage ad per eight headlines and only on the unfiltered home', () => {
    expect(FEED_AD_EVERY).toBeGreaterThanOrEqual(6);
    expect(homeAllowsAds({ region: 'ALL', category: 'all', source: '', q: '', time: 'all' })).toBe(true);
    expect(homeAllowsAds({ region: 'HKG', category: 'all', source: '', q: '', time: 'all' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'hk', source: '', q: '', time: 'all' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'all', source: '', q: '港鐵', time: 'all' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'all', source: '香港電台', q: '', time: 'all' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'all', source: '', q: '', time: 'today' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'all', source: '', q: '', time: 'all', bookmarks: true })).toBe(false);

    const items = Array.from({ length: 12 }, (_, index) => headline(`a${index}`, `標題${index}`));
    const html = renderHomeFeed(items);
    expect(html).toContain('home-intro');
    expect(html).toContain('href="/privacy/"');
    const ads = html.match(/class="ad-slot/g) || [];
    expect(ads).toHaveLength(1);
    const adAt = html.indexOf('ad-slot');
    expect(html.slice(0, adAt).match(/class="story/g)?.length).toBeGreaterThanOrEqual(6);

    const shell = readFileSync('index.html', 'utf8');
    expect(shell.indexOf('location.pathname')).toBeLessThan(shell.indexOf('adsbygoogle.js'));
    expect(readFileSync('public/robots.txt', 'utf8')).toContain('User-agent: Mediapartners-Google\nAllow: /');
    const xml = readFileSync('public/sitemap.xml', 'utf8');
    for (const path of ['/about/', '/privacy/', '/terms/', '/contact/']) {
      expect(xml).toContain(`https://world-news.xyz${path}`);
    }
    expect(xml).not.toContain('/story/');
    const count = xml.match(/<loc>/g)?.length ?? 0;
    expect(count).toBe(28);
  });
});
