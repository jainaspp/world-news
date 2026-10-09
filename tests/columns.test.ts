import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  analysisFromCluster,
  applyModelText,
  cleanHighlight,
  digestFromClusters,
  mergeIndex,
  renderAnalysisIndex,
  renderContentPage,
  weeklyFromHeadlines,
} from '../shared/content';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

function story(id: string, title: string, source: string, image?: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-06T01:00:00Z',
    category: 'hk',
    excerpt: `${title}，涉及 1100 億元`,
    ...(image ? { image } : {}),
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0]!;
  return { id: lead.id, lead, items, sources: [...new Set(items.map((i) => i.source))], count: items.length, latest: 0 };
}

const digest = () => digestFromClusters([
  cluster([story('a', '港鐵加價建議', '香港電台', 'https://img.example.com/a.jpg'), story('b', '港鐵加價建議交諮詢', 'SCMP')]),
  cluster([story('c', '天文台發出熱帶氣旋警告', '香港電台'), story('d', '颱風逼近', 'SCMP')]),
], '2026-10-06-am', new Date('2026-10-06T00:00:00Z'));

function finishedDigest() {
  const line = `港鐵建議加價並交諮詢，兩間媒體都有報道。${'這次加價仍待諮詢結果。'.repeat(40)}`;
  const doc = digest();
  return { ...doc, mode: 'ai' as const, blocks: doc.blocks.map((block) => ({ ...block, sentences: [line] })) };
}

describe('column pages', () => {
  it('uses the main site stylesheet and does not load AdSense on a failed digest', () => {
    const html = renderContentPage(digest(), 'https://world-news.xyz/digest/2026-10-06-am');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain('class="masthead"');
    expect(html).toContain('class="chip active" href="/digest/"');
    expect(html).toContain('href="/analysis/"');
    expect(html).toContain('class="app-footer"');
    expect(html).toContain('模型暫時未能完成');
    expect(html).toContain('noindex,follow');
    expect(html).not.toContain('adsbygoogle');
    expect(html).not.toContain('ca-pub');
    expect(html).not.toContain('詳情只以來源原文為準');
    expect(html).toContain('https://img.example.com/a.jpg');
    expect(html).toContain('thumb-fallback');
    expect(html).toContain('wa.me');
    expect(html).toContain('閱讀約');
    expect(html).toContain('s2/favicons');
    expect(html).toContain('id="related"');
    expect(html).toContain('https://example.com/a');
  });

  it('loads AdSense on a finished AI digest and skips empty manual units', () => {
    const html = renderContentPage(finishedDigest(), 'https://world-news.xyz/digest/2026-10-06-am');
    expect(html).toContain('adsbygoogle.js?client=ca-pub-8392975944327076');
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).toContain('2 間媒體報道');
    expect(html).not.toContain('模型暫時未能完成');
    expect(html).not.toContain('<ins class="adsbygoogle"');
  });

  it('renders top, mid and bottom units only when slot ids are set on a real body', () => {
    const denied = renderContentPage(digest(), 'https://world-news.xyz/digest/x', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(denied).not.toContain('adsbygoogle');
    expect(denied).not.toContain('ca-pub');
    const html = renderContentPage(finishedDigest(), 'https://world-news.xyz/digest/x', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(html).toContain('data-ad-position="top"');
    expect(html).toContain('data-ad-slot="2222222222"');
    expect(html).toContain('data-ad-layout="in-article"');
    expect(html).toContain('data-ad-position="bottom"');
  });

  it('keeps a highlight only when its numbers come from the sources', () => {
    const doc = digest();
    expect(cleanHighlight(doc, { label: '重點數字', items: ['1100 億元', '999 人'] })?.items).toEqual(['1100 億元']);
    expect(cleanHighlight(doc, { label: '關鍵詞', items: ['港鐵', '颱風'] })?.label).toBe('關鍵詞');
    expect(cleanHighlight(doc, { label: 'x', items: ['港鐵'] })).toBeUndefined();
    const updated = applyModelText(doc, JSON.stringify({
      items: [{ n: 1, sentences: ['港鐵建議加價。', '建議已交諮詢。', '兩間媒體都有報道。'] }, { n: 2, sentences: ['天文台發出警告。', '颱風正逼近香港。', '兩間媒體都有報道。'] }],
      highlight: { label: '重點數字', items: ['1100 億元'] },
    }));
    expect(updated?.highlight?.items).toEqual(['1100 億元']);
    expect(renderContentPage(updated!, 'https://world-news.xyz/digest/x')).toContain('highlight-box');
  });

  it('keeps an archive index and renders the analysis index as image cards', () => {
    const first = digest();
    const later = { ...digest(), key: '2026-10-06-pm', publishedAt: '2026-10-06T10:00:00Z' };
    const index = mergeIndex(mergeIndex([], first), later);
    expect(index.map((entry) => entry.key)).toEqual(['2026-10-06-pm', '2026-10-06-am']);
    expect(index[0]?.image).toBe('https://img.example.com/a.jpg');
    const html = renderContentPage(later, 'https://world-news.xyz/digest/2026-10-06-pm', { archive: index });
    expect(html).toContain('/digest/2026-10-06-am');
    const list = renderAnalysisIndex([{ ...index[0]!, key: 'demo-0123456789ab', title: '示範分析' }], 'https://world-news.xyz/analysis/');
    expect(list).toContain('/analysis/demo-0123456789ab/');
    expect(list).toContain('class="thumb"');
    expect(list).toContain('adsbygoogle.js');
  });

  it('weekly blocks carry category chips', () => {
    const doc = weeklyFromHeadlines([{ title: '晶片', url: 'https://e.com/t', source: 'BBC' }], [], '2026-10-04');
    expect(renderContentPage(doc, 'https://world-news.xyz/weekly/2026-10-04')).toContain('/category/tech');
  });

  it('copies the homepage stylesheet for the column pages at build time', () => {
    expect(readFileSync('scripts/prerender.mjs', 'utf8')).toContain("copyFileSync('src/App.css', 'dist/site.css')");
  });
});

import { analysisFromCluster as fromCluster, pickAnalysisClusters, bestImage, imageScore, promptFor as prompt, ANALYSIS_PER_RUN } from '../shared/content';
import { sortByHeat } from '../shared/contentPage';
import { toHK, isMostlyEnglish } from '../shared/zh';

function hkCluster(id: string, n: number, category = 'world'): StoryCluster {
  const items = Array.from({ length: n }, (_, i) => ({ ...story(`${id}${i}`, `${id} headline ${i}`, `Outlet ${i}`), category, pubDate: `2026-10-06T0${i}:00:00Z` }));
  return cluster(items);
}

describe('analysis v3', () => {
  it('converts Simplified to Traditional (HK) deterministically and leaves Traditional alone', () => {
    expect(toHK('数据泄露事件可能涉及超过3,600人，关系、以后、头发')).toBe('數據泄露事件可能涉及超過3,600人，關係、以後、頭髮');
    expect(toHK('香港電台報道，皇后像廣場')).toBe('香港電台報道，皇后像廣場');
    expect(isMostlyEnglish('Paramount has faced competing bids')).toBe(true);
    expect(isMostlyEnglish('BBC 報道指港鐵加價')).toBe(false);
  });

  it('keeps only grounded, non-empty sections, outlet angles, a Chinese title, and converts to Traditional', () => {
    const draft = fromCluster(hkCluster('a', 4));
    expect(draft.blocks.map((b) => b.title)).toEqual(['背景']);
    const raw = JSON.stringify({
      title: '物理学奖颁给南极观测站',
      sections: [
        { heading: '背景', text: '多间媒体报道物理学奖。' },
        { heading: '各方說法', text: '來源未有提及。' },
        { heading: '點解要關心', text: '研究有助了解宇宙。' },
        { heading: '接落嚟留意咩', text: '颁奖礼稍后举行。' },
        { heading: '亂寫', text: '不應出現。' },
      ],
      outlets: [{ n: 1, angle: '着重研究团队背景' }, { n: 2, angle: '來源未有提及' }],
    });
    const doc = applyModelText(draft, raw);
    expect(doc?.title).toBe('物理學獎頒給南極觀測站');
    expect(doc?.originalTitle).toBe('a headline 0');
    expect(doc?.blocks.map((b) => b.title)).toEqual(['背景', '點解要關心', '接落嚟留意咩']);
    expect(doc?.blocks[0]?.sentences[0]).toBe('多間媒體報道物理學獎。');
    expect(doc?.blocks[0]?.sources[0]?.angle).toBe('着重研究團隊背景');
    expect(doc?.blocks[0]?.sources[1]?.angle).toBeUndefined();
    const html = renderContentPage(doc!, 'https://world-news.xyz/analysis/x');
    expect(html).toContain('各媒體角度');
    expect(html).toContain('報道時間線');
    expect(html).toContain('4 間媒體報道');
    expect(html).toContain('原文標題');
    expect(html).not.toContain('來源未有提及');
  });

  it('rejects mostly-English model output', () => {
    const draft = fromCluster(hkCluster('b', 3));
    expect(applyModelText(draft, JSON.stringify({ sections: [{ heading: '背景', text: 'The prize went to a physicist for neutrino work at the South Pole.' }] }))).toBeNull();
  });

  it('picks up to six pieces with at least one Hong Kong story', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => hkCluster(id, 3));
    const local = hkCluster('h', 2, 'hk');
    const picked = pickAnalysisClusters([...many, local]);
    expect(picked).toHaveLength(ANALYSIS_PER_RUN);
    expect(picked).toContain(local);
    expect(prompt(fromCluster(many[0]!)).user).toContain('excerpt');
  });

  it('prefers the largest image and sorts the index by heat', () => {
    expect(imageScore('https://i.example.com/1024/x.jpg')).toBeGreaterThan(imageScore('https://i.example.com/240/x.jpg'));
    expect(bestImage([{ image: 'https://i.example.com/240/x.jpg' }, { image: 'https://i.example.com/1024/x.jpg' }])).toContain('1024');
    const rows = sortByHeat([
      { key: 'a', title: 'a', description: '', publishedAt: '2026-10-06T10:00:00Z', sources: 3, outlets: 3 },
      { key: 'b', title: 'b', description: '', publishedAt: '2026-10-06T09:00:00Z', sources: 6, outlets: 5 },
      { key: 'c', title: 'c', description: '', publishedAt: '2026-10-01T09:00:00Z', sources: 9, outlets: 9 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(['b', 'a', 'c']);
  });
});

describe('original titles', () => {
  it('does not show a Chinese source headline as the original title', () => {
    const draft = analysisFromCluster(cluster([story('a', '旺角大廈天台起火', '香港電台'), story('b', '旺角大廈火警', 'Yahoo'), story('c', '旺角火警救熄', 'HK01')]));
    const doc = applyModelText(draft, JSON.stringify({ title: '旺角大廈天台火警', sections: [{ heading: '背景', text: '旺角大廈天台起火。' }] }));
    expect(doc?.title).toBe('旺角大廈天台起火');
    expect(renderContentPage(doc!, 'https://world-news.xyz/analysis/x')).not.toContain('原文標題');
  });
});
