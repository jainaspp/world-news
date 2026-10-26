import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { indexEntry, renderAnalysisIndex, renderColumnIndex, renderContentPage, type ContentDoc } from '../shared/content';
import { renderHomeFeed } from '../shared/homePage';
import { renderLandmarkHub, renderOnThisDayPage, renderOnThisDaySection } from '../shared/heritagePage';
import { renderTopicIndex, renderTopicPage, topicIndexCards } from '../shared/topicPage';
import { topicBySlug, type TopicPack } from '../shared/topicPack';
import type { NewsItem } from '../shared/types';

function doc(partial: Partial<ContentDoc> & Pick<ContentDoc, 'kind'>): ContentDoc {
  return {
    key: 'demo',
    title: '港鐵票價檢討',
    description: '多間媒體報道港鐵建議調整票價。',
    blocks: [
      { title: '事件經過', sentences: ['港鐵建議調整票價。', '調整仍待公布。'], sources: [] },
      { title: '各方回應', sentences: ['議員要求交代加幅。'], sources: [] },
      { title: '後續關注', sentences: ['下月公布結果。'], sources: [] },
    ],
    publishedAt: '2026-10-11T00:00:00.000Z',
    hkt: '2026-10-11 08:00',
    mode: 'ai',
    points: ['港鐵建議調整票價。', '議員要求交代加幅。'],
    ...partial,
  };
}

describe('pack shell columns', () => {
  const columns = readFileSync('public/columns.css', 'utf8');
  const app = readFileSync('src/App.css', 'utf8');

  it('shares one card shell and keeps motion off when reduced', () => {
    expect(columns).toContain('.pack-shell');
    expect(columns).toContain('background: var(--card)');
    expect(columns).toContain('border: 1px solid var(--line)');
    expect(columns).toContain('linear-gradient(180deg, var(--accent), #5b8def)');
    expect(columns).toContain('linear-gradient(180deg, #9a7b4f, var(--accent))');
    expect(columns).toContain('@media (prefers-reduced-motion: reduce)');
    expect(app).not.toMatch(/body:has\(\.heritage[^)]*\)\s*\{/);
    expect(app).not.toContain('heritage-rise');
    expect(app).not.toContain('aged-paper');
    expect(app).toContain('@keyframes fade-rise');
    const reduceAt = app.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(app.slice(reduceAt)).toContain('.pack-shell');
    expect(app.slice(reduceAt)).toContain('.otd-pack');
  });

  it('lists explainer and analysis cards with a dek and two preview lines', () => {
    const entry = indexEntry(doc({ kind: 'compare' }));
    expect(entry.preview).toEqual(['港鐵建議調整票價。', '議員要求交代加幅。']);
    const index = renderColumnIndex('compare', [entry], 'https://world-news.xyz/explainer/');
    expect(index).toContain('class="pack-kicker">新聞懶人包');
    expect(index).toContain('class="dek"');
    expect(index).toContain('class="pack-preview"');
    expect(index).toContain('AI 整合');
    expect(index.match(/class="pack-preview"[\s\S]*?<\/ol>/)?.[0]).toContain('港鐵建議調整票價');
    const analysis = renderAnalysisIndex([indexEntry(doc({ kind: 'analysis', blocks: [
      { title: '背景', sentences: ['港鐵建議調整票價。'], sources: [] },
      { title: '各方說法', sentences: ['議員要求交代加幅。'], sources: [] },
    ] }))], 'https://world-news.xyz/analysis/');
    expect(analysis).toContain('class="story pack-shell"');
    expect(analysis).toContain('class="pack-kicker">熱門分析');
    expect(analysis).toContain('class="dek"');
    expect(analysis).toContain('class="pack-preview"');
  });

  it('folds secondary explainer and analysis blocks and leaves the timeline open', () => {
    const explainer = renderContentPage(doc({ kind: 'compare' }), 'https://world-news.xyz/explainer/demo');
    expect(explainer).toContain('class="story story-hero column-hero pack-shell pack-article"');
    expect(explainer).toContain('class="pack-body"');
    expect(explainer).toContain('class="pack-toolbar"');
    expect(explainer).toContain('<h2 class="column-h2">事件經過</h2>');
    expect(explainer).toContain('<h2 class="column-h2">各方回應</h2>');
    expect(explainer).toContain('<h2 class="column-h2">後續關注</h2>');
    expect(explainer).not.toContain('<details class="topic-fold pack-fold"><summary>各方回應</summary>');
    expect(explainer).not.toContain('<details class="topic-fold pack-fold"><summary>後續關注</summary>');
    expect(explainer).not.toContain('class="key-points');
    expect(explainer).not.toContain('highlight-box');
    expect(explainer).not.toContain('ai-footnote');
    const analysis = renderContentPage(doc({
      kind: 'analysis',
      blocks: [
        { title: '背景', sentences: ['港鐵建議調整票價。'], sources: [] },
        { title: '各方說法', sentences: ['議員要求交代加幅。'], sources: [] },
      ],
    }), 'https://world-news.xyz/analysis/demo');
    expect(analysis).toContain('column-hero pack-shell');
    expect(analysis).toContain('<details class="topic-fold pack-fold"><summary>背景</summary>');
    expect(analysis).toContain('<details class="topic-fold pack-fold"><summary>各方說法</summary>');
    expect(analysis).toContain('class="key-points pack-shell"');
  });

  it('keeps the topic hero on the site card and folds wires', () => {
    const pack = {
      slug: 'policy-address',
      title: '施政報告',
      description: '行政長官發表施政報告。',
      points: ['行政長官發表施政報告。', '公屋供應有新目標。'],
      timeline: [
        { date: '2026-09-01', text: '政府預告施政報告。' },
        { date: '2026-10-07', text: '行政長官發表施政報告。' },
      ],
      figures: [{ area: '房屋', label: '公屋供應目標', value: '30000個單位' }],
      impact: ['差餉寬免會在徵收時扣減。'],
      reactions: ['政黨表示會審視措施。'],
      sources: [{ title: '施政報告', url: 'https://example.com/a', source: '香港電台', pubDate: '2026-10-07T01:00:00.000Z' }],
      seenLinks: ['https://example.com/a'],
      publishedAt: '2026-10-07T01:00:00.000Z',
      updatedAt: '2026-10-07T12:00:00.000Z',
      mode: 'ai',
      provider: 'grok',
    } as TopicPack;
    const page = renderTopicPage({
      topic: topicBySlug('policy-address')!,
      pack,
      headlines: [item('a', '行政長官發表施政報告')],
      others: [],
    }, 'https://world-news.xyz/topic/policy-address/');
    expect(page).toContain('pack-shell pack-topic');
    expect(page).toContain('class="topic-area pack-shell pack-topic"');
    expect(page).toContain('class="topic-figure"');
    expect(page).toContain('id="impact"');
    expect(page).not.toContain('id="impact" open');
    expect(page).toContain('<details class="topic-fold pack-fold" id="headlines"><summary>相關頭條</summary>');
    expect(page).toContain('<details class="topic-fold pack-fold" id="sources"><summary>來源（1）</summary>');
    const index = renderTopicIndex(topicIndexCards(new Map([['policy-address', pack]])), 'https://world-news.xyz/topic/', undefined, 'hk');
    expect(index).toContain('class="topic-filters"');
    expect(index).toContain('href="/topic/?cat=hk"');
    expect(index).toContain('href="/topic/policy-address/"');
    expect(index).not.toContain('href="/topic/budget/"');
  });

  it('keeps heritage on the site surface and the homepage pack collapsed', () => {
    const home = renderOnThisDaySection(new Date('2026-10-09T04:00:00Z'));
    expect(home).toContain('pack-shell pack-heritage');
    expect(home).not.toContain(' open');
    expect(home).toContain('展開查看');
    const day = renderOnThisDayPage('02-03');
    expect(day.html).toContain('class="notice"');
    expect(day.html).not.toContain('heritage-empty');
    const filled = renderOnThisDayPage('10-09');
    expect(filled.html).toContain('pack-shell pack-heritage');
    expect(filled.html).not.toContain('otd-pack');
    const hub = renderLandmarkHub('');
    expect(hub.html).toContain('class="lm-grid"');
    expect(hub.html).toContain('pack-shell pack-heritage');
    const feed = renderHomeFeed([item('home', '港鐵公布票價檢討')], new Map(), null, '', null, '', [], [
      { href: '/explainer/a/', title: '港鐵票價', description: '建議仍待公布。' },
    ], new Date('2026-10-09T04:00:00Z'));
    expect(feed).toContain('class="digest-strip"');
    expect(feed).toContain('今日落點');
    expect(feed).toContain('id="slice"');
    expect(feed).not.toContain('otd-pack');
    expect(feed.indexOf('digest-strip')).toBeLessThan(feed.indexOf('今日落點'));
    expect(feed).not.toContain('今日必讀');
    expect(feed).not.toContain('story-hero');
  });
});

function item(id: string, title: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00.000Z',
    category: 'hk',
  };
}
