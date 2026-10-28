import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chrome } from '../shared/contentPage';
import {
  renderCivilizationHub,
  renderCosmosPage,
  renderEarthPage,
  renderGalaxyPage,
  renderOriginsPage,
  civilizationPublicPaths,
} from '../shared/civilizationPage';
import { IA_L1, IA_NEWS, iaStateFor, primaryNavHtml } from '../shared/primaryNav';

function level1(html: string): string[] {
  const start = html.indexOf('class="ia-shell"');
  const shell = html.slice(start, html.indexOf('aria-label="更多欄目"', start));
  return [...shell.matchAll(/data-ia-level="1"[^>]*>([^<]+)/g)].map((match) => match[1] ?? '');
}

function moreNav(html: string): string {
  const start = html.indexOf('aria-label="更多欄目"');
  return html.slice(start, html.indexOf('</nav>', start));
}

describe('IAa nav shell', () => {
  it('keeps L1 to the three locked labels on every chrome key', () => {
    for (const key of ['home', 'briefing', 'compare', 'cosmos', 'galaxy', 'earth', 'origins', 'tech', 'city', 'chronicle', 'civilization', 'learn', 'digest', 'today']) {
      const labels = level1(primaryNavHtml(key));
      expect(new Set(labels), key).toEqual(new Set(IA_L1.map((item) => item.label)));
      expect(labels, key).not.toContain('文明');
      expect(labels, key).not.toContain('編年');
      expect(labels, key).not.toContain('今天');
      expect(labels, key).not.toContain('開蒙');
    }
  });

  it('nests the three news entries under 今日 and drops the fake 今天 highlight', () => {
    const briefing = chrome('briefing');
    const l1 = briefing.slice(briefing.indexOf('aria-label="主欄目"'), briefing.indexOf('</nav>'));
    expect(l1).not.toContain('每日導讀');
    expect(l1).not.toContain('/briefing/');
    expect(briefing).toContain('今日 · 當下');
    expect(briefing).toContain('>新聞<');
    for (const item of IA_NEWS) {
      expect(briefing).toContain(`>${item.label}<`);
    }
    expect(briefing).toContain('<details class="ia-today" open>');
    expect(briefing).toContain('class="chip active" href="/briefing/" aria-current="page"');
    expect(briefing).not.toContain('class="chip active" href="/#slice"');
    expect(briefing).not.toContain('>今天<');
    const more = moreNav(briefing);
    expect(more).not.toContain('每日導讀');
    expect(more).not.toContain('>懶人包<');
    expect(more).toContain('>開蒙<');
    expect(more).toContain('>文明總覽<');
  });

  it('highlights 地球生物 and 今 on the slice, and leaves the overview without an L1 pill', () => {
    const home = primaryNavHtml('home');
    expect(home).toContain('data-ia-active="home"');
    expect(home).toContain('class="chip civ-chip active" href="/civilization/earth/" aria-current="location"');
    expect(home).toContain('data-ia-l2="now" aria-current="true"');
    expect(home).toContain('class="chip active" href="/#slice" aria-current="page"');
    expect(home).not.toContain(' hidden');
    const hub = primaryNavHtml('civilization');
    expect(hub).not.toMatch(/class="[^"]*\bciv-chip\b/);
    expect(hub).toContain('ia-l2-mobile ia-mobile-only" hidden');
    expect(renderCivilizationHub().html).not.toMatch(/class="[^"]*\bciv-chip\b/);
  });

  it('maps existing routes onto the earth tree and gives 銀河系誕生 its own stub', () => {
    expect(iaStateFor('cosmos')).toMatchObject({ l1: 'cosmos', l1Current: 'page', showL2: false });
    expect(iaStateFor('earth')).toMatchObject({ l1: 'earth', l1Current: 'page', l2: 'ancient', showL2: true, expandToday: false });
    expect(iaStateFor('origins')).toMatchObject({ l1: 'earth', l2: 'ancient', showL2: true });
    expect(iaStateFor('tech')).toMatchObject({ l1: 'earth', l2: 'now', expandToday: false, showL2: true });
    expect(iaStateFor('city')).toMatchObject({ l1: 'earth', l2: 'now', showL2: true });
    expect(iaStateFor('chronicle')).toMatchObject({ l1: 'earth', l2: '', showL2: true, expandToday: false });
    expect(iaStateFor('compare')).toMatchObject({ news: 'explainer', expandToday: true, l2: 'now' });
    expect(iaStateFor('learn')).toMatchObject({ l1: '', showL2: false });

    const cosmos = renderCosmosPage().html;
    expect(cosmos).toContain('aria-current="page" data-ia-level="1" data-ia-l1="cosmos">宇宙起源<');
    expect(cosmos).toContain('ia-l2-mobile ia-mobile-only" hidden');
    const earth = renderEarthPage().html;
    expect(earth).toContain('data-ia-l2="ancient" aria-current="true"');
    expect(earth).toContain('>古<');
    expect(earth).toContain('>今<');
    expect(earth).toContain('>未來<');
    const origins = renderOriginsPage().html;
    expect(origins).toContain('data-ia-active="origins"');
    expect(origins).toContain('data-ia-l2="ancient" aria-current="true"');

    const galaxy = renderGalaxyPage();
    expect(galaxy.status).toBe(200);
    expect(galaxy.indexable).toBe(false);
    expect(galaxy.html).toContain('noindex,follow');
    expect(galaxy.html).toContain('<h1>銀河系誕生</h1>');
    expect(galaxy.html).toContain('aria-current="page" data-ia-level="1" data-ia-l1="galaxy">銀河系誕生<');
    expect(galaxy.html).toContain('href="/civilization/galaxy/"');
    expect(galaxy.html).toContain('href="/civilization/cosmos/"');
    expect(civilizationPublicPaths()).not.toContain('/civilization/galaxy/');
    expect(readFileSync('functions/civilization/[[path]].ts', 'utf8')).toContain('galaxy: renderGalaxyPage');
  });

  it('puts 開蒙 on the learn side rail and arms the #future hook', () => {
    const learn = chrome('learn');
    const rail = moreNav(learn);
    expect(rail).toContain('class="chip active" href="/learn/" aria-current="page"');
    expect(level1(learn)).not.toContain('開蒙');
    expect(learn).not.toMatch(/class="[^"]*\bciv-chip\b/);
    expect(chrome('home')).toContain('location.hash!=="#future"');
  });
});
