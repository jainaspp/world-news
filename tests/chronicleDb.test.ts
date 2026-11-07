import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chronicleSeed, metaValue, renderThreadArticle, threadsInOrder } from '../shared/civilization/db/render';
import { renderChroniclePage, renderCityPage, renderCivilizationHub, renderCosmosPage, renderEarthPage, renderGalaxyPage, renderOriginsPage, renderTechPage } from '../shared/civilizationPage';

const BANNED = /台灣|臺灣|台海|臺海|台湾|xAI|Grok/;

describe('chronicle content database', () => {
  it('ships threads, entries, sources, and a migration', () => {
    const db = chronicleSeed();
    expect(db.threads.map((thread) => thread.id)).toEqual([
      'cosmos', 'galaxy', 'earth', 'origins', 'chronicle', 'tech', 'city', 'future',
    ]);
    expect(db.entries.length).toBeGreaterThan(40);
    expect(db.sources.length).toBeGreaterThan(40);
    expect(db.figures.filter((fig) => fig.kind === 'real_photo')).toHaveLength(22);
    expect(db.figures.filter((fig) => fig.kind === 'ai_illustration').every((fig) => fig.caption_zh.includes('示意') && fig.not_ai === false)).toBe(true);
    expect(metaValue('version')).toContain('text-first');
    expect(readFileSync('migrations/0001_chronicle.sql', 'utf8')).toContain('CREATE TABLE IF NOT EXISTS entries');
    expect(readFileSync('shared/civilization/db/seed.sql', 'utf8')).toContain('INSERT INTO threads');
    for (const thread of threadsInOrder()) {
      const before = Number(metaValue(`before_${thread.id}`));
      const after = Number(metaValue(`after_${thread.id}`));
      expect(after, thread.id).toBeGreaterThan(before);
      expect(after, thread.id).toBeGreaterThanOrEqual(10000);
    }
    expect(JSON.stringify(db)).not.toMatch(BANNED);
  });

  it('renders the chronicle and the hub from the seed, without stage chrome', () => {
    const chronicle = renderChroniclePage();
    const hub = renderCivilizationHub();
    expect(chronicle.status).toBe(200);
    expect(hub.status).toBe(200);
    expect(chronicle.html).toContain('id="ch-ancient"');
    expect(chronicle.html).toContain('id="stage-1"');
    expect(chronicle.html).toContain('四線總結');
    expect(chronicle.html).not.toContain('跳到階段');
    expect(chronicle.html).not.toContain('aria-label="跳到卷"');
    expect(hub.html).toContain('id="future"');
    expect(hub.html).not.toContain('axis-hero');
    expect(renderThreadArticle('earth')).toContain('侏羅紀');
    expect(chronicle.html).not.toMatch(BANNED);
    expect(hub.html).not.toMatch(BANNED);
  });

  it('puts each real photo on its scale heading, not only at the end of the volume', () => {
    const pages: Record<string, string> = {
      cosmos: renderCosmosPage().html,
      galaxy: renderGalaxyPage().html,
      earth: renderEarthPage().html,
      origins: renderOriginsPage().html,
      chronicle: renderChroniclePage().html,
      tech: renderTechPage().html,
      city: renderCityPage().html,
      future: renderCivilizationHub().html,
    };
    const photos = chronicleSeed().figures.filter((fig) => fig.kind === 'real_photo' && fig.embed);
    expect(photos).toHaveLength(22);
    for (const fig of photos) {
      const html = pages[fig.volume] ?? '';
      const marker = `id="fig-${fig.id}"`;
      expect(html, fig.id).toContain('class="real-photo"');
      expect(html, fig.id).toContain(marker);
      expect(html, fig.id).toContain('真實照片');
      expect(html.slice(html.indexOf(marker), html.indexOf(marker) + 1200), fig.id).toContain(fig.license);
      expect(html, fig.id).toContain(fig.source_url);
      expect(fig.after_heading, fig.id).toBeTruthy();
      const heading = new RegExp(`<h[1-3][^>]*>[^<]*${fig.after_heading}[^<]*</h[1-3]>`).exec(html);
      expect(heading, fig.id).toBeTruthy();
      const figAt = html.indexOf(marker);
      expect(figAt, fig.id).toBeGreaterThan(heading?.index ?? -1);
      expect(figAt - (heading?.index ?? figAt), fig.id).toBeLessThan(600);
    }
    for (const plate of chronicleSeed().figures.filter((fig) => fig.kind === 'ai_illustration' && fig.embed)) {
      const html = pages[plate.volume] ?? '';
      expect(html, plate.id).toContain(`data-kind="ai_illustration" data-figure="${plate.id}"`);
      expect(html, plate.id).toContain('示意');
    }
  });
});
