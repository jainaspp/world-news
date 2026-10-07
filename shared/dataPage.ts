import type { AdConfig } from './contentPage.js';
import { chrome, esc, footer, head, hkt } from './contentPage.js';
import {
  DATA_HUB,
  DATA_PAGES,
  formatDay,
  formatReading,
  reading,
  summarise,
  trendSvg,
  type DataDay,
  type DataPageSpec,
  type DataSeries,
  type MetricSpec,
} from './dataSeries.js';

const DEFAULT_CLIENT = 'ca-pub-8392975944327076';

function adsOf(ads: AdConfig | undefined): AdConfig {
  return {
    client: ads?.client || DEFAULT_CLIENT,
    top: ads?.top,
    mid: ads?.mid,
    bottom: ads?.bottom,
  };
}

function manualAd(ads: AdConfig, position: 'top' | 'bottom'): string {
  const slot = (position === 'top' ? ads.top : ads.bottom) || '';
  if (!/^\d{6,}$/.test(slot)) return '';
  return `<div class="ad-slot ad-slot-banner" data-ad-position="${position}" aria-label="廣告"><span class="ad-label">廣告</span><ins class="adsbygoogle" data-ad-client="${esc(ads.client)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true" style="display:block"></ins></div>`;
}

function formatUpdated(value: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return value;
  return hkt(new Date(value).toISOString());
}

function direction(today: number, prior: number | null, digits: number): 'up' | 'down' | 'flat' {
  if (prior == null) return 'flat';
  const factor = 10 ** Math.max(0, digits);
  const diff = Math.round(today * factor) - Math.round(prior * factor);
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}

function deltaLabel(metric: MetricSpec, today: number, prior: number | null): string {
  if (prior == null) return '首日記錄';
  const factor = 10 ** Math.max(0, digitsOf(metric));
  const diff = Math.round(today * factor) / factor - Math.round(prior * factor) / factor;
  if (diff === 0) return '同上一筆持平';
  const unit = metric.unit ? ` ${metric.unit}` : '';
  return `較上一筆${diff > 0 ? '高' : '低'} ${formatReading(Math.abs(diff), metric.digits)}${unit}`;
}

function digitsOf(metric: MetricSpec): number {
  return metric.digits;
}

function statCards(spec: DataPageSpec, days: DataDay[]): string {
  const today = days[days.length - 1];
  const prior = days.length >= 2 ? days[days.length - 2]! : null;
  const cards = spec.metrics.flatMap((metric) => {
    const value = reading(today, metric.key);
    if (value == null) return [];
    const before = reading(prior, metric.key);
    const way = direction(value, before, metric.digits);
    const unit = metric.unit ? `<span class="data-unit">${esc(metric.unit)}</span>` : '';
    return [`<li class="data-stat data-${way}"><span class="data-stat-label">${esc(metric.label)}</span><strong>${esc(formatReading(value, metric.digits))}${unit}</strong><span class="data-delta">${esc(deltaLabel(metric, value, before))}</span></li>`];
  });
  if (!cards.length) {
    return '<p class="notice">今日讀數暫時取不到。頁面會在下一次成功讀到來源時開始記錄。</p>';
  }
  return `<ul class="data-stats">${cards.join('')}</ul>`;
}

function charts(spec: DataPageSpec, days: DataDay[]): string {
  const blocks = spec.chartKeys.map((key) => {
    const metric = spec.metrics.find((row) => row.key === key);
    if (!metric) return '';
    const points = days.flatMap((day) => {
      const value = reading(day, key);
      return value == null ? [] : [{ date: day.date, value }];
    });
    const note = points.length < 2 ? '<p class="data-chart-note">而家只有 1 日或未有記錄。第二日起會畫出折線，最多顯示 30 日。</p>' : '';
    return `<figure class="data-chart"><figcaption>${esc(metric.label)} · ${points.length} 日</figcaption>${trendSvg(points, metric.label, metric.unit, metric.digits)}${note}</figure>`;
  });
  return blocks.join('');
}

function historyTable(spec: DataPageSpec, days: DataDay[]): string {
  const headCells = ['日期', ...spec.metrics.map((metric) => metric.label)].map((label) => `<th scope="col">${esc(label)}</th>`).join('');
  const rows = [...days].reverse().map((day) => {
    const cells = spec.metrics.map((metric) => {
      const value = reading(day, metric.key);
      return `<td>${value == null ? '—' : esc(formatReading(value, metric.digits))}</td>`;
    }).join('');
    const extra = day.label ? `<td class="data-note-cell">${esc(day.label)}</td>` : '<td></td>';
    return `<tr><th scope="row"><time datetime="${esc(day.date)}">${esc(formatDay(day.date))}</time></th>${cells}${extra}</tr>`;
  });
  const body = rows.length ? rows.join('') : '<tr><td colspan="6">未有記錄。今日第一次成功讀到來源之後，呢一行就會出現。</td></tr>';
  return `<section class="data-table-wrap" aria-label="每日記錄"><h2 class="column-h2">近 ${Math.min(30, Math.max(days.length, 1))} 日</h2><div class="data-table-scroll"><table class="data-table"><caption>${esc(spec.title)}每日記錄，新的在上。</caption><thead><tr>${headCells}<th scope="col">備註</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function relatedNav(current: string): string {
  const links = DATA_PAGES.map((page) => (
    `<li><a class="data-side-link${page.path === current ? ' active' : ''}" href="${page.path}"${page.path === current ? ' aria-current="page"' : ''}><span>${esc(page.kicker)}</span><strong>${esc(page.title)}</strong></a></li>`
  )).join('');
  return `<section class="side-card" aria-label="其他數據"><h2>其他數據</h2><ul class="data-side-list">${links}</ul><a class="read-original" href="/data/">全部數據 →</a></section>`;
}

function sourceCard(spec: DataPageSpec, days: DataDay[]): string {
  const updated = days[days.length - 1]?.updated || '';
  const when = updated ? `<time datetime="${esc(updated)}">${esc(formatUpdated(updated))}</time>` : '未有更新時間';
  return `<section class="side-card" aria-label="來源"><h2>來源</h2><p>數字來自<a href="${esc(spec.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(spec.sourceName)}</a>。世界頭條每日記一筆，不經 AI 改寫。</p><p class="data-updated">更新時間：${when}</p></section>`;
}

function jsonLd(name: string, description: string, canonical: string, updated: string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: canonical,
    inLanguage: 'zh-HK',
    creator: { '@type': 'Organization', name: '世界頭條' },
    ...(updated ? { dateModified: updated } : {}),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function shell(title: string, description: string, path: string, body: string, ads: AdConfig, updated = ''): string {
  const canonical = `https://world-news.xyz${path}`;
  const robots = '<meta name="robots" content="index,follow" />';
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, '', 'website', `${robots}${jsonLd(title, description, canonical, updated)}`, ads.client)}
<body>
  <div class="page column-page" data-kind="data">
  ${chrome('data')}
  ${body}
  ${footer()}
  </div>
</body>
</html>`;
}

export function renderDataPage(spec: DataPageSpec, series: DataSeries, options: AdConfig = { client: DEFAULT_CLIENT }): string {
  const ads = adsOf(options);
  const days = series.days;
  const summary = summarise(spec, days);
  const updated = days[days.length - 1]?.updated || '';
  const when = updated ? formatUpdated(updated) : '';
  const body = `<div class="layout">
    <main id="content" class="column-main data-main">
      <header class="index-head">
        <div class="story-kicker"><span class="kicker-region">${esc(spec.kicker)}</span><span class="badge">每日記錄</span></div>
        <h1 class="column-title">${esc(spec.title)}</h1>
        <p class="dek">${esc(spec.description)}</p>
      </header>
      ${statCards(spec, days)}
      <section class="editor-note data-summary" aria-label="今日變化"><h2 class="column-h2">今日變化</h2><p>${esc(summary)}</p></section>
      ${manualAd(ads, 'top')}
      <section class="story column-block"><div class="story-body"><h2 class="column-h2">點樣讀呢頁</h2><p>${esc(spec.blurb)}</p></div></section>
      ${charts(spec, days)}
      ${historyTable(spec, days)}
      <section class="story column-block"><div class="story-body"><h2 class="column-h2">出處同更新</h2><p>來源：<a href="${esc(spec.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(spec.sourceName)}</a>。${when ? `本頁記錄更新於 <time datetime="${esc(updated)}">${esc(when)}</time>。` : '今日尚未寫入記錄。'}走勢由本站按每日快照畫成，沒有使用第三方圖表庫。</p></div></section>
      ${manualAd(ads, 'bottom')}
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${sourceCard(spec, days)}
      ${relatedNav(spec.path)}
    </aside>
  </div>`;
  return shell(spec.title, spec.description, spec.path, body, ads, updated);
}

function hubFigure(page: DataPageSpec, series: DataSeries | undefined): string {
  const today = series?.days[series.days.length - 1];
  const bits = page.metrics.flatMap((metric) => {
    const value = reading(today, metric.key);
    if (value == null) return [];
    const unit = metric.unit ? ` ${metric.unit}` : '';
    return [`${metric.label} ${formatReading(value, metric.digits)}${unit}`];
  });
  return bits.length ? bits.join(' · ') : '今日尚未記錄';
}

export function renderDataHub(series: DataSeries[], options: AdConfig = { client: DEFAULT_CLIENT }): string {
  const ads = adsOf(options);
  const byId = new Map(series.map((row) => [row.id, row]));
  const cards = DATA_PAGES.map((page) => {
    const row = byId.get(page.id);
    return `<a class="data-card" href="${page.path}"><span class="data-card-kicker">${esc(page.kicker)}</span><h2>${esc(page.title)}</h2><p class="data-figure">${esc(hubFigure(page, row))}</p><p>${esc(page.blurb.slice(0, 72))}…</p></a>`;
  }).join('');
  const updated = series.map((row) => row.days[row.days.length - 1]?.updated || '').filter(Boolean).sort().at(-1) || '';
  const body = `<div class="layout">
    <main id="content" class="column-main data-main">
      <header class="index-head">
        <div class="story-kicker"><span class="kicker-region">數據</span><span class="badge">每日記錄</span></div>
        <h1 class="column-title">${esc(DATA_HUB.title)}</h1>
        <p class="dek">${esc(DATA_HUB.description)}</p>
      </header>
      <section class="editor-note" aria-label="關於數據頁"><h2 class="column-h2">關於呢啲數字</h2><p>世界頭條把香港天氣、空氣質素、匯率、金價同油價每日記低一筆，方便同新聞放在一起睇。資料來自網站已經使用的公開來源，不經 AI 生成。每一欄都有今日數字、近 30 日表格同簡單走勢。市場價格只供參考，不是投資建議。</p></section>
      ${manualAd(ads, 'top')}
      <div class="data-hub-grid">${cards}</div>
      <section class="story column-block"><div class="story-body"><h2 class="column-h2">每日點樣記</h2><ul class="points"><li>香港時間每一日第一次有人打開頁面，先向來源取今日數字，然後寫入記錄。</li><li>同日之後的請求直接讀已記低的一筆，避免重複向天文台同報價來源查詢。</li><li>只有 1 日的時候，表格有一行，走勢是一個點。之後每日加一筆，最多 30 日。</li></ul></div></section>
      ${manualAd(ads, 'bottom')}
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${relatedNav('')}
      <section class="side-card"><h2>不是預測</h2><p>呢度沒有預報模型，亦沒有買賣建議。天氣同空氣質素請以來源網站的最新公布為準。</p></section>
    </aside>
  </div>`;
  return shell(DATA_HUB.title, DATA_HUB.description, DATA_HUB.path, body, ads, updated);
}

export function renderDataMissing(): string {
  const canonical = 'https://world-news.xyz/data/';
  return `<!doctype html>
<html lang="zh-HK">
${head('找不到數據頁', '這個數據頁不存在。可以返回香港數據首頁。', canonical, '', 'website', '<meta name="robots" content="noindex" />', '', false)}
<body>
  <div class="page column-page" data-kind="data">
  ${chrome('data')}
  <main id="content" class="column-index">
    <div class="status-panel"><h2>找不到這一頁</h2><p>數據欄只有天氣、空氣質素、匯率、金價同油價。</p><a class="primary" href="/data/">返回數據</a></div>
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}
