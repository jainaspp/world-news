import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEARN_LESSONS,
  LEARN_SUBJECTS,
  learnCatalogIssues,
  learnLeafId,
  learnLesson,
  learnNextLeaf,
  learnPathGroups,
  learnPathPlan,
  learnPathWalked,
  learnSubject,
} from '../shared/learn/catalog';
import { renderLearnPath } from '../shared/learnPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderBulletinClock } from '../shared/civilization/clock';

const OPEN_SUBJECTS = LEARN_SUBJECTS.filter((subject) => subject.open);

describe('learn map shell', () => {
  it('draws twelve doors, six readable seeds, and leaves the rest closed', () => {
    expect(learnCatalogIssues()).toEqual([]);
    expect(LEARN_SUBJECTS).toHaveLength(12);
    expect(OPEN_SUBJECTS.map((subject) => subject.id)).toEqual(['zh', 'math', 'en', 'phy', 'bio', 'gen']);
    expect(LEARN_LESSONS).toHaveLength(9);
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
    expect(hub.html).toContain('不作兌換');
    expect(hub.html.match(/class="learn-door is-open"/g)).toHaveLength(6);
    expect(hub.html.match(/class="learn-door is-locked"/g)).toHaveLength(6);
    expect(hub.html).toContain('wn.edu.progress.v1');
    expect(hub.html).not.toContain('setInterval');
    expect(hub.html).not.toContain('adsbygoogle');
  });

  it('keeps locked doors as orientation only, with no fake syllabus', () => {
    for (const subject of LEARN_SUBJECTS.filter((item) => !item.open)) {
      const page = renderLearnPath(subject.id);
      expect(page.status).toBe(200);
      expect(page.html).toContain('尚未開啓之路');
      expect(page.html).toContain('返回萬有地圖');
      expect(page.html).toContain('noindex,follow');
      expect(page.html).not.toContain('class="learn-leaf"');
      expect(page.html).not.toContain('方位示意');
    }
  });

  it('draws L1→L2→L3 taxonomy on every open door', () => {
    for (const subject of OPEN_SUBJECTS) {
      const page = renderLearnPath(subject.id);
      expect(page.status).toBe(200);
      expect(page.html).toContain('noindex,follow');
      const plan = learnPathPlan(subject.id);
      expect(plan.length).toBeGreaterThanOrEqual(4);
      expect(page.html).toContain('方位：' + subject.bearing);
      for (const entry of plan) {
        expect(page.html).toContain(entry.path.name);
        for (const block of entry.path.blocks) {
          expect(page.html).toContain(block.name);
        }
      }
      expect(page.html).toContain('方位示意，正文未種');
      for (const lesson of LEARN_LESSONS.filter((item) => item.subjectId === subject.id)) {
        expect(page.html).toContain(lesson.title);
      }
    }
  });

  it('serves every ready leaf with its first paragraph and a thumb-sized done button', () => {
    for (const lesson of LEARN_LESSONS) {
      const page = renderLearnPath(`${lesson.subjectId}/${lesson.id}`);
      expect(page.status).toBe(200);
      expect(page.html).toContain(lesson.title);
      expect(page.html).toContain(lesson.body[0] ?? '');
      expect(page.html).toContain('本節讀完');
      expect(page.html).toContain('noindex,follow');
      expect(page.html).toContain(`<p class="learn-actions"><button type="button" data-learn-done="${learnLeafId(lesson.subjectId, lesson.id)}">`);
    }
  });

  it('keeps soft links to at most two civilization pointers, never pasted prose', () => {
    for (const lesson of LEARN_LESSONS) {
      const page = renderLearnPath(`${lesson.subjectId}/${lesson.id}`);
      const soft = page.html.match(/<p class="learn-soft">[\s\S]*?<\/p>/)?.[0] ?? '';
      const civLinks = soft.match(/href="\/civilization\//g) ?? [];
      expect(civLinks.length).toBeLessThanOrEqual(2);
      expect(soft).not.toContain('監測讀數');
      expect(soft).not.toContain('末日');
    }
  });

  it('locks the leaf contract: thickness, prereq chains, no marketing voice', () => {
    expect(learnCatalogIssues()).toEqual([]);
    for (const lesson of LEARN_LESSONS) {
      const thickness = lesson.body.join('').replace(/\s+/g, '').length;
      expect(thickness).toBeGreaterThanOrEqual(500);
      expect(lesson.title).not.toMatch(/必考|衝刺|名師|補習|選課中心/);
      if (lesson.prereq) {
        const prereq = learnLesson(lesson.subjectId, lesson.prereq);
        expect(prereq?.blockId).toBe(lesson.blockId);
      }
      for (const href of lesson.softLinks?.civilization ?? []) {
        expect(href.startsWith('/civilization/')).toBe(true);
      }
    }
    expect(learnNextLeaf('zh', 'glyph')?.id).toBe('part-hint');
    expect(learnNextLeaf('zh', 'part-hint')).toBeUndefined();
    expect(learnNextLeaf('math', 'count')?.id).toBe('reverse-check');
    expect(learnNextLeaf('en', 'script')?.id).toBe('word-build');
    const first = renderLearnPath('zh/glyph');
    expect(first.html).toContain('下一葉（建議）');
    expect(first.html).toContain('href="/learn/zh/part-hint/"');
    const second = renderLearnPath('zh/part-hint');
    expect(second.html).not.toContain('下一葉（建議）');
  });

  it('walks a path when one of its blocks is fully completed, without cross-subject locks', () => {
    const zh = learnSubject('zh');
    expect(zh?.open).toBe(true);
    const form = zh?.paths[0];
    expect(form?.name).toBe('字形與部件');
    const groups = learnPathGroups('zh', form!);
    expect(groups).toContainEqual([learnLeafId('zh', 'glyph'), learnLeafId('zh', 'part-hint')]);
    expect(learnPathWalked(groups, [])).toBe(false);
    expect(learnPathWalked(groups, [learnLeafId('zh', 'glyph')])).toBe(false);
    expect(learnPathWalked(groups, [learnLeafId('zh', 'glyph'), learnLeafId('zh', 'part-hint')])).toBe(true);
    expect(learnPathWalked(groups, [learnLeafId('math', 'count'), learnLeafId('math', 'reverse-check')])).toBe(false);
    const plan = learnPathPlan('zh');
    expect(plan.every((entry) => entry.path.blocks.every((block) => block.id.startsWith('zh.')))).toBe(true);
  });

  it('404s unknown paths, closed-door leaves, and over-deep slugs', () => {
    expect(renderLearnPath('nope').status).toBe(404);
    expect(renderLearnPath('chem/anything').status).toBe(404);
    expect(renderLearnPath('zh/glyph/extra').status).toBe(404);
    const miss = renderLearnPath('nope');
    expect(miss.html).toContain('找不到這一葉');
    expect(miss.html).toContain('返回萬有地圖');
  });

  it('keeps learn out of the sitemap and the home hero', () => {
    expect(readFileSync('shared/sitemap.ts', 'utf8')).not.toContain('/learn/');
    const home = renderHomeFeed([]);
    const hero = home.slice(home.indexOf('class="axis-hero"'), home.indexOf('class="bulletin-clock"'));
    expect(hero).not.toContain('/learn/');
    expect(home).toContain('href="/learn/"');
  });

  it('keeps action buttons at least 44px tall and the tree stacked for mobile', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const buttonBlock = css.slice(css.indexOf('.learn-actions button {'), css.indexOf('html.dark .learn-actions button'));
    expect(buttonBlock).toContain('min-height: 44px');
    const learnCss = css.slice(css.indexOf('.learn-page'), css.indexOf('.chip.civ-chip'));
    expect(learnCss).toContain('min-height: 44px');
    expect(learnCss).not.toMatch(/position:\s*(absolute|fixed)/);
    expect(learnCss).not.toMatch(/margin-left:\s*-/);
    expect(learnCss).not.toMatch(/margin-right:\s*-/);
    const hub = renderLearnPath('');
    const leaf = renderLearnPath('zh/glyph');
    for (const html of [hub.html, leaf.html]) {
      expect(html).toContain('跳到內容');
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
