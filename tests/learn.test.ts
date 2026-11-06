import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEARN_LESSONS, LEARN_SUBJECTS, learnCatalogIssues } from '../shared/learn/catalog';
import { LEARN_EDGE_NOTES } from '../shared/learn/edgeNotes';
import { renderLearnPath } from '../shared/learnPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderBulletinClock } from '../shared/civilization/clock';
import { renderCivilizationHub } from '../shared/civilizationPage';
import { SPINE } from '../shared/civilization/spine';

function hanCount(text: string): number {
  return [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;
}

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
    const nextHint = '下一葉尚未開啓。第二節只標方位：聲音如何按同一字形被再次讀出。正文未寫入，不另開一葉。';
    const glyph = renderLearnPath('zh/glyph');
    const zh = renderLearnPath('zh');
    expect(glyph.html).toContain(`class="learn-note learn-next">${nextHint}`);
    expect(zh.html).toContain(`class="learn-note learn-next">${nextHint}`);
    expect(renderLearnPath('math/count').html).not.toContain('learn-next');
    expect(renderLearnPath('en/script').html).not.toContain('learn-next');
    expect(hub.html).not.toContain('learn-next');
    expect(nextHint).not.toMatch(/我哋|嘅|喺|咗|台灣|臺灣|台湾|Taiwan/);
    const learnCss = readFileSync('src/App.css', 'utf8');
    expect(learnCss).toContain('.learn-actions button {\n  min-width: 44px;\n  min-height: 44px;');
    expect(renderLearnPath('nope').status).toBe(404);
    expect(readFileSync('shared/sitemap.ts', 'utf8')).not.toContain('/learn/');
    const home = renderHomeFeed([]);
    const hero = home.slice(home.indexOf('class="axis-hero"'), home.indexOf('class="bulletin-clock"'));
    expect(hero).not.toContain('/learn/');
    expect(home).toContain('href="/learn/"');
  });
});

describe('learn edge notes 04/05/08', () => {
  it('thickens the hub with three in-learn notes and leaves the tree locked', () => {
    expect(learnCatalogIssues()).toEqual([]);
    expect(LEARN_EDGE_NOTES.map((note) => note.id)).toEqual(['04', '05', '08']);
    expect(LEARN_EDGE_NOTES.map((note) => note.subjectId)).toEqual(['phy', 'chem', 'geo']);
    expect(LEARN_SUBJECTS.filter((subject) => subject.open).map((subject) => subject.id)).toEqual(['zh', 'math', 'en']);
    expect(LEARN_LESSONS).toHaveLength(3);
    expect(SPINE).toHaveLength(8);
    expect(SPINE.map((node) => node.label)).not.toContain('開蒙');

    const hub = renderLearnPath('');
    const edges = hub.html.slice(hub.html.indexOf('class="learn-edges"'), hub.html.indexOf('class="learn-bound"'));
    expect(edges).toContain('頁緣短箋');
    expect(edges).toContain('不開門，不加葉');
    expect(edges).not.toMatch(/href="(?!\/learn\/)/);
    expect(edges).not.toMatch(/我哋|嘅|喺|咗|台灣|臺灣|台湾|Taiwan|補習|選課|必考|衝刺|名師/);
    expect(hub.html.match(/class="learn-door is-open"/g)).toHaveLength(3);
    expect(hub.html.match(/class="learn-door is-locked"/g)).toHaveLength(9);
    expect(hub.html).not.toContain('learn-next');
    expect(hub.indexable).toBe(false);

    for (const note of LEARN_EDGE_NOTES) {
      expect(hanCount(note.body)).toBeGreaterThanOrEqual(145);
      expect(hanCount(note.body)).toBeLessThanOrEqual(165);
      expect(edges).toContain(`id="edge-${note.id}"`);
      expect(edges).toContain(note.title);
      expect(edges).toContain(note.body);
      expect(edges).toContain(`href="${note.href}"`);
      const door = renderLearnPath(note.subjectId);
      expect(door.status).toBe(200);
      expect(door.html).toContain('尚未開啓之路');
      expect(door.html).not.toContain(`id="edge-${note.id}"`);
    }

    const nextHint = '下一葉尚未開啓。第二節只標方位：聲音如何按同一字形被再次讀出。正文未寫入，不另開一葉。';
    expect(renderLearnPath('zh/glyph').html).toContain(`class="learn-note learn-next">${nextHint}`);
    expect(renderLearnPath('zh').html).toContain(`class="learn-note learn-next">${nextHint}`);
    expect(readFileSync('src/App.css', 'utf8')).toContain('.learn-edge {\n  max-width: 40rem;');
    expect(readFileSync('src/App.css', 'utf8')).toContain('scroll-margin-top: 128px;');
    expect(renderHomeFeed([])).not.toContain('頁緣短箋');
    expect(renderCivilizationHub().html).not.toContain('頁緣短箋');
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
