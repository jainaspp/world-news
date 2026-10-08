import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  imageAllowed,
  pictureForTopic,
  pictureFromCommons,
  pictureFromItems,
  resolveTopicPicture,
  TOPIC_PICTURES,
} from '../shared/topicImage';
import { topicBySlug, topicPrompt, TOPIC_PACKS } from '../shared/topicPack';
import { renderTopicIndex, renderTopicPage, topicIndexCards } from '../shared/topicPage';
import type { NewsItem } from '../shared/types';

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title' | 'link'>): NewsItem {
  return {
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00.000Z',
    category: 'hk',
    ...partial,
  };
}

describe('topic pictures', () => {
  it('allows free hosts and our own files, and rejects news photos', () => {
    expect(imageAllowed('/topics/policy-address.jpg')).toBe(true);
    expect(imageAllowed('https://upload.wikimedia.org/wikipedia/commons/1/11/Example.jpg')).toBe(true);
    expect(imageAllowed('https://www.federalreserve.gov/images/eccles.jpg')).toBe(true);
    expect(imageAllowed('https://images.nasa.gov/cimon.jpg')).toBe(true);
    expect(imageAllowed('https://www.news.gov.hk/chi/photo.jpg')).toBe(false);
    expect(imageAllowed('https://img.example.com/story.jpg')).toBe(false);
    expect(imageAllowed('http://upload.wikimedia.org/wikipedia/commons/1/11/Example.jpg')).toBe(false);
  });

  it('prefers a free source image, otherwise the standing slot, and leaves 樓市 empty', () => {
    const policy = topicBySlug('policy-address')!;
    const source = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Example.jpg';
    const fromSource = resolveTopicPicture(policy, [
      item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a', image: 'https://news.rthk.hk/a.jpg' }),
      item({ id: 'b', title: '立法會會議廳', link: 'https://example.com/b', image: source }),
    ], null);
    expect(fromSource?.url).toBe(source);
    expect(fromSource?.credit).toBe('香港電台');
    expect(resolveTopicPicture(policy, [], null)?.url).toBe('/topics/policy-address.jpg');
    expect(pictureFromItems([
      item({ id: 'n', title: '新聞圖片', link: 'https://example.com/n', image: 'https://hk.news.yahoo.com/a.jpg' }),
    ], policy)).toBeNull();
    expect(pictureForTopic('property', null)).toBeNull();
    expect(TOPIC_PICTURES.property).toBeUndefined();
    for (const slug of ['policy-address', 'budget', 'weather', 'us-china', 'ai', 'mideast', 'us-rates']) {
      expect(TOPIC_PICTURES[slug]?.url).toBe(`/topics/${slug}.jpg`);
      expect(readFileSync(`public${TOPIC_PICTURES[slug].url}`).subarray(0, 3).toString('hex')).toBe('ffd8ff');
    }
  });

  it('takes a Commons photograph before a diagram', () => {
    const picture = pictureFromCommons({
      query: {
        pages: {
          a: {
            title: 'File:Middle East map.svg',
            index: 1,
            imageinfo: [{ mime: 'image/svg+xml', size: 80000, thumburl: 'https://upload.wikimedia.org/wikipedia/commons/a/a.svg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Mapmaker' } } }],
          },
          b: {
            title: 'File:Region diagram.png',
            index: 2,
            imageinfo: [{ mime: 'image/png', size: 80000, thumburl: 'https://upload.wikimedia.org/wikipedia/commons/b/b.png', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Drawer' }, ImageDescription: { value: 'A diagram' } } }],
          },
          c: {
            title: 'File:City photograph.jpg',
            index: 3,
            imageinfo: [{ mime: 'image/jpeg', size: 180000, thumburl: 'https://upload.wikimedia.org/wikipedia/commons/c/c.jpg?utm_source=commons', extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, Artist: { value: '<a href="https://example.com">Ada</a>' }, ImageDescription: { value: '耶路撒冷舊城' } } }],
          },
          d: {
            title: 'File:Paid photo.jpg',
            index: 0,
            imageinfo: [{ mime: 'image/jpeg', size: 180000, thumburl: 'https://upload.wikimedia.org/wikipedia/commons/d/d.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' }, Artist: { value: 'Someone' } } }],
          },
        },
      },
    }, '中東局勢');
    expect(picture?.url).toBe('https://upload.wikimedia.org/wikipedia/commons/c/c.jpg');
    expect(picture?.alt).toBe('耶路撒冷舊城');
    expect(picture?.credit).toContain('Ada');
    expect(picture?.sourceUrl).toContain('File:City_photograph.jpg');
  });

  it('shows the same picture on the page and the index, and does not invent a rates article', () => {
    const rates = topicBySlug('us-rates')!;
    expect(TOPIC_PACKS).toHaveLength(8);
    expect(topicPrompt(rates, [], null).user).toContain('不要把欄目名稱當成現況');
    expect(rates.blurb).not.toContain('正在加息');
    const page = renderTopicPage({ topic: rates, pack: null, headlines: [], others: [] }, 'https://world-news.xyz/topic/us-rates/');
    expect(page).toContain('src="/topics/us-rates.jpg"');
    expect(page).toContain('alt="美國聯邦儲備局總部大樓"');
    expect(page).toContain('圖片：美國聯邦儲備局，公有領域');
    expect(page).toContain('美國加息以及全球經濟影響');
    expect(page).not.toContain('class="key-points"');
    expect(page).not.toContain('class="timeline"');
    expect(page).not.toContain('免責');
    const cards = topicIndexCards(new Map());
    const index = renderTopicIndex(cards, 'https://world-news.xyz/topic/');
    expect(index).toContain('src="/topics/us-rates.jpg"');
    expect(index).toContain('src="/topics/weather.jpg"');
    const property = index.split('<article class="story">').slice(1).find((chunk) => chunk.includes('/topic/property/')) ?? '';
    expect(property).toContain('thumb-fallback');
    expect(property).not.toContain('<img class="thumb"');
  });
});
