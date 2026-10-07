import type { MajorEntry } from './angles.js';
import type { LiveAlert } from './alerts.js';
import { chrome, esc, footer, head, hkt } from './contentPage.js';

export function renderMajorBanner(entry: MajorEntry): string {
  return `<section class="major-banner" data-major-id="${esc(entry.id)}" role="region" aria-label="重大更新"><span class="major-kicker">重大更新</span><a href="${esc(entry.href)}">${esc(entry.title)}</a><button type="button" class="major-dismiss" aria-label="關閉">×</button></section>`;
}

export function renderAlertRow(alerts: LiveAlert[]): string {
  if (!alerts.length) return '';
  const pills = alerts.map((alert) => `<a class="alert-pill" href="${esc(alert.href)}" target="_blank" rel="noopener noreferrer">${esc(alert.name)}</a>`).join('');
  return `<section class="alert-row" aria-label="天氣及交通警告">${pills}</section>`;
}

/** 24-hour major timeline. Newest first. */
export function renderMajorPage(timeline: MajorEntry[], canonical: string): string {
  const newest = timeline[0]?.at ?? '';
  const rows = timeline.map((entry) => `<li id="m-${esc(entry.id)}"><time datetime="${esc(entry.at)}">${esc(hkt(entry.at, false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><a href="${esc(entry.href)}">${esc(entry.title)}</a><span class="cluster-badge">${entry.outlets} 間媒體</span></span></li>`).join('');
  const list = rows
    ? `<ol class="timeline">${rows}</ol>`
    : '<p class="notice">過去24小時未有重大更新。</p>';
  const description = '過去24小時的重大更新：約三小時內有四間或以上媒體報道，或標題帶有突發、快訊、Breaking。';
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '24小時重大更新',
    itemListElement: timeline.slice(0, 30).map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.title,
      url: entry.href.startsWith('/') ? `https://world-news.xyz${entry.href}` : entry.href,
    })),
  }).replace(/</g, '\\u003c')}</script>`;
  return `<!doctype html>
<html lang="zh-HK">
${head('24小時重大更新', description, canonical, '', 'website', ld, 'ca-pub-8392975944327076')}
<body>
  <div class="page column-page" data-kind="major">
  ${chrome('none')}
  <div class="layout">
    <main id="content" class="column-main">
      <article class="story story-hero column-hero">
        <div class="story-body">
          <div class="story-kicker"><span class="kicker-region">重大更新</span></div>
          <h1 class="story-title column-title">24小時重大更新</h1>
          <p class="dek">${esc(description)}</p>
          ${newest ? `<p class="story-meta"><time datetime="${esc(newest)}">更新至 ${esc(hkt(newest))} 香港時間</time></p>` : ''}
        </div>
      </article>
      <section class="story column-block timeline-card" aria-label="重大更新時間線"><div class="story-body">
        <h2 class="column-h2">時間線（香港時間，最新先）</h2>
        ${list}
      </div></section>
    </main>
    <aside class="sidebar" aria-label="側欄">
      <section class="side-card"><h2>點樣列入</h2><p>同一件事喺約三小時內有四間或以上媒體報道，又或者標題寫明突發、快訊、Breaking。只列標題同出處。</p><p><a href="/">返回頭條</a></p></section>
    </aside>
  </div>
  ${footer()}
  </div>
</body>
</html>`;
}
