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
    const axisAt = home.indexOf('<section class="axis-hero');
    const axisSection = home.slice(axisAt, home.indexOf('</section>', axisAt));
    expect(axisSection).not.toContain('/learn/');
    const beside = home.slice(home.indexOf('</section>', axisAt), home.indexOf('class="bulletin-clock"'));
    expect(beside).toContain('<p class="axis-micro"><a href="/learn/">想由基礎立起來？</a></p>');
    expect(beside).not.toContain('learn-door');
    expect(home).toContain('href="/learn/"');
  });

  it('explains locked leaves in one written line under the hub map', () => {
    const line = '淡門沒有可讀的葉：入內只標方位，不記入本機進度，亦不另開一門。';
    const hub = renderLearnPath('');
    const heroEnd = hub.html.indexOf('</header>');
    const mapAt = hub.html.indexOf('<div class="learn-map">');
    const helpAt = hub.html.indexOf(`class="learn-note learn-map-help">${line}`);
    expect(heroEnd).toBeGreaterThan(0);
    expect(mapAt).toBeGreaterThan(heroEnd);
    expect(helpAt).toBeGreaterThan(mapAt);
    expect(hub.html.slice(0, heroEnd)).not.toContain('learn-map-help');
    expect(hub.html.slice(mapAt, helpAt)).not.toContain('learn-hero');
    expect(hub.html.match(/learn-map-help/g)).toHaveLength(1);
    expect(renderLearnPath('zh').html).not.toContain('learn-map-help');
    expect(renderLearnPath('phy').html).not.toContain('learn-map-help');
    expect(renderLearnPath('zh/glyph').html).not.toContain('learn-map-help');
    expect(line).not.toMatch(/我哋|嘅|喺|咗|台灣|臺灣|台湾|Taiwan/);
    expect(LEARN_SUBJECTS).toHaveLength(12);
    expect(LEARN_LESSONS).toHaveLength(3);
    expect(learnCatalogIssues()).toEqual([]);
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
