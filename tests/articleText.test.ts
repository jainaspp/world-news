import { describe, expect, it, vi } from 'vitest';
import {
  ARTICLE_CHARS,

  blockedOutlet,
  extractArticle,
  needsSearch,
} from '../shared/articleText';
import { fetchArticleTexts, articleCacheKey } from '../functions/content/material';
import type { ContentEnv } from '../functions/content/store';

const paragraph = '香港電台報道，港鐵把票價建議交予諮詢，加幅寫成百分之三點二，並說明諮詢仍在進行，預計下月公布結果。';

describe('article text', () => {
  it('keeps the description and the article paragraphs, and drops the nav', () => {
    const html = `<html><meta property="og:description" content="港鐵公布票價建議，加幅為百分之三點二，諮詢期仍然開放，市民可以在期限前提交意見。">
      <nav><p>這是導覽列的一段很長的文字，不應該被抽進正文，因為它在導覽裡面，長度也超過四十個字。</p></nav>
      <article><p>短</p><p>${paragraph}</p><p>第二段補充背景，說明去年的加幅與今年建議的差別，以及受影響的車程類別，供讀者了解事件經過。</p></article>
      </html>`;
    const text = extractArticle(html);
    expect(text).toContain('港鐵公布票價建議');
    expect(text).toContain('百分之三點二');
    expect(text).toContain('第二段補充背景');
    expect(text).not.toContain('導覽列');
    expect(text.length).toBeLessThanOrEqual(ARTICLE_CHARS);
  });

  it('reads a body div that uses line breaks instead of paragraphs', () => {
    const html = `<html><meta property="og:description" content="勞工處高度關注東涌地盤致命意外。">
      <div class="itemFullText">勞工處高度關注下午在東涌一個建築地盤內發生的致命工作意外，一名男工從高處墮下。<br />發言人說，勞工處已即時派員到意外現場展開調查，並向承建商發出暫時停工通知書。<br />編輯：測試</div>
      </html>`;
    const text = extractArticle(html);
    expect(text).toContain('暫時停工通知書');
    expect(text.length).toBeGreaterThan(80);
  });

  it('trims a long article to the cap', () => {
    const html = `<article>${Array.from({ length: 30 }, (_, index) => `<p>${'甲'.repeat(40)}${index}段補充說明這則報道的經過與數字，方便讀者了解事件本身。</p>`).join('')}</article>`;
    expect(extractArticle(html)).toHaveLength(ARTICLE_CHARS);
  });

  it('skips paywalled hosts and asks for search only when the text is short', () => {
    expect(blockedOutlet('https://www.scmp.com/news/hong-kong/society/article/1')).toBe(true);
    expect(blockedOutlet('https://news.mingpao.com/pns/a.htm')).toBe(true);
    expect(blockedOutlet('https://news.rthk.hk/rthk/ch/component/k2/1.htm')).toBe(false);
    expect(needsSearch(1_499)).toBe(true);
    expect(needsSearch(1_500)).toBe(false);
  });

  it('caches extracted text and does not refetch a 403', async () => {
    const store = new Map<string, { value: string; ttl?: number }>();
    const env = {
      CONTENT: {
        get: async (key: string) => store.get(key)?.value ?? null,
        put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
          store.set(key, { value, ttl: options?.expirationTtl });
        },
      },
    } as ContentEnv;
    const html = `<article><p>${paragraph}</p><p>第二段補充背景，說明去年的加幅與今年建議的差別，以及受影響的車程類別，供讀者了解事件經過。</p></article>`;
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('blocked')) return new Response('no', { status: 403 });
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
    });
    const open = 'https://news.rthk.hk/rthk/ch/component/k2/1.htm';
    const denied = 'https://news.example.com/blocked';
    const first = await fetchArticleTexts(env, [open, denied, 'https://www.scmp.com/a'], fetchImpl as typeof fetch, 4);
    expect(first.texts.get(open)).toContain('港鐵');
    expect(first.texts.has(denied)).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Article text is a cache: memory and the edge cache, never a KV put.
    expect(store.has(articleCacheKey(open))).toBe(false);
    fetchImpl.mockClear();
    const second = await fetchArticleTexts(env, [open], fetchImpl as typeof fetch, 4);
    expect(second.texts.get(open)).toContain('港鐵');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
