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
    expect(hub.html).toContain('校驗成本由誰承擔');
    expect(hub.html).toContain('<a href="https://c2pa.org/">內容出處與真實性聯盟</a>');
    expect(hub.html).toContain('<a href="https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html">C2PA技術規範2.5</a>');
    expect(hub.html).toContain('<a href="https://iptc.org/standards/photo-metadata/iptc-standard/">IPTC照片元數據標準</a>');
    expect(hub.html).toContain('<a href="https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata-2025.1.html">IPTC照片元數據標準2025.1</a>');
    expect(hub.html).not.toContain('噤聲');
    const f5at = hub.html.indexOf('id="future-f5"');
    const f5html = hub.html.slice(f5at, hub.html.indexOf('id="future-f6"'));
    expect(f5html).toContain('條件帶另有一則文獻對照，仍不印合成分數，也不印文明等級。');
    expect(f5html).toContain('<a href="https://www.gao.gov/assets/gao-20-48g.pdf">美國政府問責局｜技術成熟度評估指南（GAO-20-48G）</a>');
    expect(f5html).not.toMatch(/總分|第[0-9一二三四五六七八九十]+[級级]文明/);
    expect(hub.html).not.toContain('axis-hero');
    expect(renderThreadArticle('earth')).toContain('侏羅紀');
    expect(chronicle.html).not.toMatch(BANNED);
    expect(hub.html).not.toMatch(BANNED);
  });

  it('renders the F3 measurement-commons paragraph from public sources', () => {
    const hub = renderCivilizationHub().html;
    expect(hub).toContain('維修成本在會議、表決、實驗室比對與清單的下一輪修訂');
    expect(hub).toContain('<a href="https://www.bipm.org/en/cgpm-2026">國際計量局｜第二十八屆國際計量大會</a>');
    expect(hub).toContain('<a href="https://www.iso.org/files/live/sites/isoorg/files/store/en/PUB100413.pdf">國際標準化組織｜系統複審指導</a>');
    expect(hub).toContain('<a href="https://unstats.un.org/unsdwebsite/statcom/">聯合國統計委員會</a>');
    expect(hub).toContain('<a href="https://unstats.un.org/sdgs/indicators/indicators-list">可持續發展目標全球指標清單</a>');
    expect(hub).toContain('<a href="https://mandates.un.org/mandate/A/RES/71/313?subject=Statistics">大會第71/313號決議</a>');
    const start = hub.indexOf('度量、標準與公開指標是同一類可維修的公共品');
    const end = hub.indexOf('標準與公共品維修', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(hub.slice(start, end)).not.toMatch(/末日|排名|臺灣|台灣|噤聲/);
  });

  it('renders the F1 energy-budget paragraph from public sources', () => {
    const hub = renderCivilizationHub().html;
    const start = hub.indexOf('id="future-f1"');
    const end = hub.indexOf('id="future-f2"', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const f1 = hub.slice(start, end);
    expect(f1).toContain('能量收支與宜居帶各自留在可核對的機構文本裡');
    expect(f1).toContain('不排列國家高下');
    expect(f1).toContain('<a href="https://www.ipcc.ch/report/ar6/wg1/downloads/faqs/IPCC_AR6_WGI_FAQ_Chapter_07.pdf">政府間氣候變化專門委員會｜第六次評估常見問題7.1</a>');
    expect(f1).toContain('<a href="https://wmo.int/publication-series/state-of-global-climate/state-of-global-climate-2025">世界氣象組織｜全球氣候狀況二〇二五</a>');
    expect(f1).toContain('<a href="https://wmo.int/publication-series/state-of-global-climate">世界氣象組織｜全球氣候狀況系列</a>');
    expect(f1).toContain('<a href="https://ceres.larc.nasa.gov/">美國國家航空航天局｜雲與地球輻射能量系統</a>');
    expect(f1).toContain('<a href="https://science.nasa.gov/exoplanets/habitable-zone/">美國國家航空航天局｜宜居帶</a>');
    expect(f1).toContain('不作國別排名');
    const paragraph = f1.slice(
      f1.indexOf('能量收支與宜居帶各自留在可核對的機構文本裡'),
      f1.indexOf('文明可用功率受行星能量收支與碳循環約束'),
    );
    expect(paragraph.length).toBeGreaterThan(80);
    expect(paragraph).not.toMatch(/末日|排名|臺灣|台灣|噤聲|只剩/);
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
