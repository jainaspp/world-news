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

function lin(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return 0.2126 * lin((value >> 16) & 255) + 0.7152 * lin((value >> 8) & 255) + 0.0722 * lin(value & 255);
  };
  const [hi, lo] = [lum(foreground), lum(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

function declared(block: string, prop: string): string {
  const match = block.match(new RegExp(`${prop}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match, prop).toBeTruthy();
  return match![1].toLowerCase();
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

  it('gives each edge-note link a 44px target and an AA focus ring on learn chrome', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const link = rule(css, '.learn-edge a {');
    const focus = rule(css, '.learn-edge a:focus-visible {');
    const lightAccent = declared(rule(css, ':root {'), '--color-primary');
    const darkAccent = declared(rule(css, 'html.dark {'), '--color-primary');
    const lightCard = declared(rule(css, '.learn-edge {'), 'background');
    const darkCard = declared(rule(css, 'html.dark .learn-edge {'), 'background');
    const lightPage = declared(rule(css, '.learn-page {'), 'background');
    const darkPage = declared(rule(css, 'html.dark .learn-page {'), 'background');

    expect(link).toContain('min-width: 44px');
    expect(link).toContain('min-height: 44px');
    expect(link).toContain('color: var(--accent)');
    expect(rule(css, ':root {')).toContain('--accent: var(--color-primary)');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(contrast(lightAccent, lightCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkAccent, darkCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(lightAccent, lightPage)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkPage)).toBeGreaterThanOrEqual(3);

    const hub = renderLearnPath('');
    for (const note of LEARN_EDGE_NOTES) {
      const idAt = hub.html.indexOf(`id="edge-${note.id}"`);
      const article = hub.html.slice(idAt, hub.html.indexOf('</article>', idAt));
      expect(article.match(/<a /g)).toHaveLength(1);
      expect(article).toContain(`href="${note.href}"`);
    }
  });
});

describe('learn map doors', () => {
  it('gives each hub door a 44px target and an AA focus ring on the door surface', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const door = rule(css, '.learn-door {');
    const focus = rule(css, '.learn-door:focus-visible {');
    const lightAccent = declared(rule(css, ':root {'), '--color-primary');
    const darkAccent = declared(rule(css, 'html.dark {'), '--color-primary');
    const lightOpen = declared(door, 'background');
    const lightLocked = declared(rule(css, '.learn-door.is-locked {'), 'background');
    const darkOpen = declared(rule(css, 'html.dark .learn-door {'), 'background');
    const darkLocked = declared(rule(css, 'html.dark .learn-door.is-locked {'), 'background');
    const lightPage = declared(rule(css, '.learn-page {'), 'background');
    const darkPage = declared(rule(css, 'html.dark .learn-page {'), 'background');

    expect(door).toContain('min-width: 44px');
    expect(door).toContain('min-height: 96px');
    expect(door).not.toContain('outline');
    expect(rule(css, '.learn-map {')).toContain('grid-template-columns: 1fr');
    expect(css).toContain('@media (min-width: 720px) {\n  .learn-map { grid-template-columns: repeat(3, 1fr); }');
    expect(rule(css, ':root {')).toContain('--accent: var(--color-primary)');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(contrast(lightAccent, lightOpen)).toBeGreaterThanOrEqual(3);
    expect(contrast(lightAccent, lightLocked)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkOpen)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkLocked)).toBeGreaterThanOrEqual(3);
    expect(contrast(lightAccent, lightPage)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkPage)).toBeGreaterThanOrEqual(3);

    const hub = renderLearnPath('').html;
    const mapAt = hub.indexOf('<div class="learn-map">');
    const map = hub.slice(mapAt, hub.indexOf('</div>', mapAt));
    expect(map.match(/<a class="learn-door /g)).toHaveLength(12);
    expect(LEARN_SUBJECTS).toHaveLength(12);
  });
});

describe('learn progress buttons', () => {
  it('gives the read-done and reset controls a 44px target and an AA focus ring', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const button = rule(css, '.learn-actions button {');
    const focus = rule(css, '.learn-actions button:focus-visible {');
    const lightAccent = declared(rule(css, ':root {'), '--color-primary');
    const darkAccent = declared(rule(css, 'html.dark {'), '--color-primary');
    const lightPage = declared(rule(css, '.learn-page {'), 'background');
    const darkPage = declared(rule(css, 'html.dark .learn-page {'), 'background');

    expect(button).toContain('min-width: 44px');
    expect(button).toContain('min-height: 44px');
    expect(button).not.toContain('outline');
    expect(rule(css, ':root {')).toContain('--accent: var(--color-primary)');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(contrast(lightAccent, lightPage)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkPage)).toBeGreaterThanOrEqual(3);

    const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const hub = main(renderLearnPath('').html);
    expect(hub).toContain('<button type="button" data-learn-reset>重設本機進度</button>');
    expect(hub).not.toContain('data-learn-done');
    expect(hub.match(/<button /g)).toHaveLength(1);
    for (const lesson of LEARN_LESSONS) {
      const page = main(renderLearnPath(`${lesson.subjectId}/${lesson.id}`).html);
      expect(page).toContain(`<button type="button" data-learn-done="${lesson.subjectId}:${lesson.id}">本節讀完</button>`);
      expect(page).not.toContain('data-learn-reset');
      expect(page.match(/<button /g)).toHaveLength(1);
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
