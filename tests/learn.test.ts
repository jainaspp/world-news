import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEARN_LESSONS,
  LEARN_LICENSE,
  LEARN_SUBJECTS,
  learnCatalogIssues,
  learnLessonGate,
  learnLessonNext,
  learnLessonsFor,
  learnLevelLabel,
} from '../shared/learn/catalog';
import { renderLearnPath } from '../shared/learnPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderBulletinClock } from '../shared/civilization/clock';

const OPEN_SEEDS = ['zh', 'math', 'en', 'phy', 'bio'] as const;
const TRACK_LENGTHS: Record<string, number> = { zh: 4, math: 4, en: 2, phy: 3, bio: 3 };

/** The progress script mentions gate attributes, so DOM assertions scope to the article body. */
function articleBody(html: string): string {
  const from = html.indexOf('<article');
  const to = html.indexOf('</article>');
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

describe('learn map shell', () => {
  it('draws twelve doors, five readable tracks, and leaves the rest closed', () => {
    expect(learnCatalogIssues()).toEqual([]);
    expect(LEARN_SUBJECTS).toHaveLength(12);
    expect(LEARN_SUBJECTS.filter((subject) => subject.open).map((subject) => subject.id)).toEqual([...OPEN_SEEDS]);
    expect(LEARN_LESSONS).toHaveLength(16);
    const hub = renderLearnPath('');
    expect(hub.status).toBe(200);
    expect(hub.indexable).toBe(false);
    expect(hub.html).toContain('noindex,follow');
    expect(hub.html).toContain('<h1>開蒙 · 森羅</h1>');
    expect(hub.html).toContain('開蒙——森羅萬象，由一葉始。');
    expect(hub.html).toContain('萬有地圖');
    expect(hub.html).toContain('尚未開啓之路');
    expect(hub.html).not.toContain('選課中心');
    expect(hub.html).not.toContain('補習');
    expect(hub.html.match(/class="learn-door is-open"/g)).toHaveLength(5);
    expect(hub.html.match(/class="learn-door is-locked"/g)).toHaveLength(7);
    expect(hub.html).toContain('漢語與文字');
    expect(hub.html).toContain('數量與形式');
    expect(hub.html).toContain('英語與世界語文門徑');
    expect(hub.html).toContain('物質');
    expect(hub.html).toContain('生命');
    expect(hub.html).toContain('可讀 · 4 葉');
    expect(hub.html).toContain('可讀 · 3 葉');
    expect(hub.html).toContain('可讀 · 2 葉');
    expect(hub.html).toContain('讀完一葉，下一葉在本機開啓');
    expect(hub.html).toContain('rel="license"');
    expect(hub.html).toContain(LEARN_LICENSE.url);
    expect(hub.html).toContain('CC BY 4.0');
    expect(hub.html).toContain('wn.edu.progress.v1');
    expect(hub.html).not.toContain('setInterval');
    for (const subject of LEARN_SUBJECTS.filter((item) => !item.open)) {
      const page = renderLearnPath(subject.id);
      expect(page.status).toBe(200);
      expect(page.html).toContain('尚未開啓之路');
      expect(page.html).toContain('返回萬有地圖');
      expect(page.html).toContain('noindex,follow');
    }
    for (const lesson of LEARN_LESSONS) {
      const page = renderLearnPath(`${lesson.subjectId}/${lesson.id}`);
      expect(page.status).toBe(200);
      expect(page.html).toContain(lesson.title);
      expect(page.html).toContain(lesson.body[0] ?? '');
      expect(page.html).toContain('本節讀完');
      expect(page.html).toContain('noindex,follow');
    }
    expect(renderLearnPath('nope').status).toBe(404);
    expect(readFileSync('shared/sitemap.ts', 'utf8')).not.toContain('/learn/');
    const home = renderHomeFeed([]);
    const hero = home.slice(home.indexOf('class="axis-hero"'), home.indexOf('class="bulletin-clock"'));
    expect(hero).not.toContain('/learn/');
    expect(home).toContain('href="/learn/"');
  });
});

describe('learn depth tracks', () => {
  it('orders every open door shallow to deep with an unbroken unlock chain', () => {
    for (const [subjectId, length] of Object.entries(TRACK_LENGTHS)) {
      const track = learnLessonsFor(subjectId);
      expect(track, subjectId).toHaveLength(length);
      track.forEach((lesson, index) => {
        expect(lesson.level, lesson.id).toBe(index + 1);
        expect(lesson.title.startsWith(`${learnLevelLabel(index + 1)}：`), lesson.id).toBe(true);
        if (index === 0) expect(lesson.requires, lesson.id).toBeUndefined();
        else expect(lesson.requires, lesson.id).toBe(track[index - 1]?.id);
      });
    }
  });

  it('keeps the two new doors on the 物質與自然 bearing with three-leaf tracks', () => {
    expect(learnLessonsFor('phy').map((lesson) => lesson.id)).toEqual(['matter', 'motion', 'force']);
    expect(learnLessonsFor('bio').map((lesson) => lesson.id)).toEqual(['life', 'kind', 'web']);
    for (const id of ['phy', 'bio']) {
      const subject = LEARN_SUBJECTS.find((item) => item.id === id);
      expect(subject?.open).toBe(true);
      expect(subject?.bearing).toBe('物質與自然');
    }
  });

  it('shows level, unlock condition, and local state on subject pages', () => {
    for (const subjectId of OPEN_SEEDS) {
      const page = renderLearnPath(subjectId);
      expect(page.status).toBe(200);
      const track = learnLessonsFor(subjectId);
      expect(page.html).toContain(`本門 ${track.length} 葉，由淺入深。讀完一葉，下一葉在本機開啓。`);
      expect(page.html).toContain('rel="license"');
      for (const lesson of track) {
        expect(page.html).toContain(`data-learn-leaf="${subjectId}:${lesson.id}"`);
        expect(page.html).toContain(`<span class="learn-level">${learnLevelLabel(lesson.level)}</span>`);
        const gate = learnLessonGate(subjectId, lesson.id);
        if (gate) {
          expect(page.html).toContain(`data-learn-requires="${subjectId}:${gate.id}"`);
          expect(page.html).toContain(`先讀完《${gate.title}》後開啓`);
        } else {
          expect(page.html).toContain('起點，可直接展開');
        }
      }
      expect(page.html).toContain('data-learn-gate-state');
    }
  });

  it('paints unlock state from local progress without any timer', () => {
    const page = renderLearnPath('zh');
    const script = page.html.slice(page.html.indexOf('<script>'));
    expect(script).toContain('data-learn-requires');
    expect(script).toContain('data-learn-gate-note');
    expect(script).toContain("'待開啓'");
    expect(script).toContain("'已展開'");
    expect(script).toContain('aria-disabled');
    expect(script).not.toContain('setInterval');
  });

  it('links each leaf to its parent and child and carries the CC BY 4.0 note', () => {
    for (const lesson of LEARN_LESSONS) {
      const page = renderLearnPath(`${lesson.subjectId}/${lesson.id}`);
      expect(page.status).toBe(200);
      const article = articleBody(page.html);
      expect(article).toContain('rel="license"');
      expect(article).toContain(LEARN_LICENSE.url);
      expect(article).toContain('CC BY 4.0');
      expect(article).toContain('文明編年史 · 開蒙');
      const gate = learnLessonGate(lesson.subjectId, lesson.id);
      const next = learnLessonNext(lesson.subjectId, lesson.id);
      if (gate) {
        expect(article).toContain('rel="prev"');
        expect(article).toContain(`/learn/${lesson.subjectId}/${gate.id}/`);
        expect(article).toContain(`data-learn-gate-note="${lesson.subjectId}:${gate.id}"`);
        expect(article).toContain(`data-learn-gate-title="${gate.title}"`);
      } else {
        expect(article).not.toContain('rel="prev"');
        expect(article).not.toContain('data-learn-gate-note');
      }
      if (next) {
        expect(article).toContain('rel="next"');
        expect(article).toContain(`/learn/${lesson.subjectId}/${next.id}/`);
      } else {
        expect(article).not.toContain('rel="next"');
        expect(article).toContain('這一門的葉暫時讀到這裡。');
      }
    }
  });
});

describe('learn copy register', () => {
  const PARTICLES = /我哋|嘅|喺|咗|點樣|决|嘢|咁|同埋|呢個|呢啲|呢|唔|冇|仲未|撳|睇/;
  const BARE_HAI = /(?<![關係干])係(?![數統列])/;
  const blob = [
    JSON.stringify(LEARN_SUBJECTS),
    JSON.stringify(LEARN_LESSONS),
    renderLearnPath('').html,
    renderLearnPath('zh').html,
    renderLearnPath('zh/text').html,
    renderLearnPath('phy').html,
    renderLearnPath('bio/web').html,
  ].join('\n');

  it('stays in formal written Chinese without Cantonese particles', () => {
    expect(blob.match(PARTICLES)).toBeNull();
    expect(blob.match(BARE_HAI)).toBeNull();
  });

  it('stays clear of sensitive political vocabulary', () => {
    expect(blob).not.toMatch(/台灣|臺灣|選舉|政黨|主權/);
  });

  it('gives every leaf at least two substantial paragraphs', () => {
    for (const lesson of LEARN_LESSONS) {
      expect(lesson.body.length, lesson.id).toBeGreaterThanOrEqual(2);
      for (const paragraph of lesson.body) {
        expect(paragraph.trim().length, lesson.id).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

describe('monitoring clock', () => {
  it('is a static ink reading that links to the future anchor', () => {
    const html = renderBulletinClock();
    expect(html).toContain('監測讀數');
    expect(html).toContain('href="/civilization/#future"');
    expect(html).not.toContain('setInterval');
    expect(html).not.toMatch(/末日|滅絕|秒針|紅色/);
    const css = readFileSync('src/App.css', 'utf8');
    const block = css.slice(css.indexOf('.bulletin-clock {'), css.indexOf('.learn-page'));
    expect(block).toContain('#f7f1e6');
    expect(block).toContain('#161c24');
    expect(block).toContain('#9a7b4f');
  });
});
