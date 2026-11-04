import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEARN_LESSONS, LEARN_SUBJECTS, learnCatalogIssues } from '../shared/learn/catalog';
import { renderLearnPath } from '../shared/learnPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderBulletinClock } from '../shared/civilization/clock';

describe('learn map shell', () => {
  it('draws twelve doors, three readable seeds, and leaves the rest closed', () => {
    expect(learnCatalogIssues()).toEqual([]);
    expect(LEARN_SUBJECTS).toHaveLength(12);
    expect(LEARN_SUBJECTS.filter((subject) => subject.open)).toHaveLength(3);
    expect(LEARN_LESSONS).toHaveLength(3);
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
    expect(hub.html.match(/class="learn-door is-open"/g)).toHaveLength(3);
    expect(hub.html.match(/class="learn-door is-locked"/g)).toHaveLength(9);
    expect(hub.html).toContain('漢語與文字');
    expect(hub.html).toContain('數量與形式');
    expect(hub.html).toContain('英語與世界語文門徑');
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

describe('learn controls', () => {
  it('gives the reset and done buttons a 44px ink-and-paper target', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const rule = css.slice(css.indexOf('.learn-actions button {'), css.indexOf('}', css.indexOf('.learn-actions button {')));
    expect(rule).toContain('min-height: 44px');
    expect(rule).toContain('min-width: 44px');
    expect(rule).toContain('background: #f7f1e6');
    expect(rule).toContain('color: #161c24');
    const dark = css.slice(css.indexOf('html.dark .learn-actions button {'), css.indexOf('}', css.indexOf('html.dark .learn-actions button {')));
    expect(dark).toContain('background: #161c24');
    expect(dark).toContain('color: #f7f1e6');
    const hub = renderLearnPath('');
    const lesson = LEARN_LESSONS[0];
    const leaf = renderLearnPath(`${lesson?.subjectId}/${lesson?.id}`);
    expect(hub.html).toContain('class="learn-actions"');
    expect(hub.html).toContain('重設本機進度');
    expect(leaf.html).toContain('本節讀完');
    expect(leaf.html).toContain('class="learn-actions"');
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
