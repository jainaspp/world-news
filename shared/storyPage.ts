import { analysisEligible, analysisSlug } from './content.js';
import { bookmarkButton, catChip, chrome, esc, favicon, footer, head, heatBadge, hkt, listenControls, media, safeHttp, share } from './contentPage.js';
import { bestImage } from './media.js';
import type { StoryCluster } from './trending';
import type { NewsItem } from './types';

/**
 * /story/<id>/: one headline with every outlet's coverage of the same story, a reporting timeline
 * and related headlines. Only headlines, sources and links (no article text), so it is noindex.
 */
export function renderStoryPage(item: NewsItem, cluster: StoryCluster | null, related: NewsItem[], canonical: string): string {
  const coverage = (cluster?.items ?? [item]).slice().sort((a, b) => Date.parse(a.pubDate) - Date.parse(b.pubDate));
  const outlets = new Set(coverage.map((row) => row.source)).size;
  const image = safeHttp(bestImage(coverage)) || safeHttp(item.image);
  const url = safeHttp(item.link);
  const analysis = cluster && analysisEligible(cluster) ? `/analysis/${analysisSlug(cluster.lead.title)}/` : '';
  const description = outlets > 1 ? `${outlets} 間媒體報道：${item.title}` : `${item.source}：${item.title}`;
  const ld = `<meta name="robots" content="noindex, follow" />`;
  const timeline = coverage.length > 1 ? `<section class="story column-block timeline-card" aria-label="各媒體報道"><div class="story-body">
        <h2 class="column-h2">各媒體報道（香港時間）</h2>
        <ol class="timeline">${coverage.map((row) => `<li data-story-id="${esc(row.id)}"><time datetime="${esc(row.pubDate)}">${esc(hkt(row.pubDate, false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body">${favicon(row.link)} <strong>${esc(row.source)}</strong> <a href="${esc(safeHttp(row.link))}" target="_blank" rel="noopener noreferrer">${esc(row.title)}</a></span></li>`).join('')}</ol>
      </div></section>` : '';
  const cards = related.slice(0, 6).map((row) => `<article class="story">
          <a class="story-media" href="/story/${esc(row.id)}/" tabindex="-1" aria-hidden="true">${media(row.image, row.category, row.source)}</a>
          <div class="story-body">
            <div class="story-kicker">${catChip(row.category)}</div>
            <h3 class="story-title"><a href="/story/${esc(row.id)}/">${esc(row.title)}</a></h3>
            <div class="story-meta">${favicon(row.link)}<span class="source-tag">${esc(row.source)}</span></div>
          </div>
        </article>`).join('');
  return `<!doctype html>
<html lang="zh-HK">
${head(item.title, description, canonical, image, 'article', ld, '', false)}
<body>
  <div class="page column-page" data-kind="story">
  ${chrome('none')}
  <div class="layout">
    <main id="content" class="column-main">
      <article class="story story-hero column-hero" data-story-id="${esc(item.id)}">
        <div class="story-media">${media(image, item.category, item.source, true)}</div>
        <div class="story-body">
          <div class="story-kicker">${catChip(item.category)}${heatBadge(outlets)}</div>
          <h1 class="story-title column-title">${esc(item.title)}</h1>
          <div class="story-meta">${favicon(item.link)}<strong>${esc(item.source)}</strong><time datetime="${esc(item.pubDate)}">· ${esc(hkt(item.pubDate))} 香港時間</time></div>
          <div class="story-actions">
            ${url ? `<a class="primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">閱讀 ${esc(item.source)} 原文 →</a>` : ''}
            ${analysis ? `<a class="chip analysis-chip" href="${analysis}"><span class="badge ai-badge">AI 整合</span> 背景與各方說法</a>` : ''}
          </div>
          ${share(item.title, canonical)}
          ${listenControls()}
          ${bookmarkButton({ page: 'story', key: item.id, title: item.title, link: `/story/${item.id}/`, publishedAt: item.pubDate, category: item.category })}
        </div>
      </article>
      ${timeline}
      ${cards ? `<section class="related"><h2 class="section-title">相關頭條</h2><div class="news-grid related-grid">${cards}</div></section>` : ''}
    </main>
    <aside class="sidebar" aria-label="側欄">
      <section class="side-card"><h2>關於此頁</h2><p>世界頭條只列出標題、來源與原文連結，不轉載內文。全文請到原文網站閱讀。</p></section>
    </aside>
  </div>
  ${footer()}
  </div>
</body>
</html>`;
}

export function renderStoryMissing(canonical: string): string {
  return `<!doctype html>
<html lang="zh-HK">
${head('此則頭條已經下架', '標題只保留一段時間。', canonical, '', 'website', '<meta name="robots" content="noindex" />', '', false)}
<body><div class="page column-page">${chrome('none')}<main id="content" class="column-index"><div class="status-panel"><h2>此則頭條已經下架</h2><p>世界頭條只保留最近的標題。可以返回首頁查看最新頭條。</p><a class="primary" href="/">返回首頁</a></div></main>${footer()}</div></body></html>`;
}

/** Same-category headlines first, newest first, excluding the story's own cluster. */
export function relatedItems(item: NewsItem, cluster: StoryCluster | null, items: NewsItem[], limit = 6): NewsItem[] {
  const own = new Set((cluster?.items ?? [item]).map((row) => row.id));
  const rest = items.filter((row) => !own.has(row.id));
  const same = rest.filter((row) => row.category === item.category);
  return [...same, ...rest.filter((row) => row.category !== item.category)].slice(0, limit);
}
