import { siteBrand } from './brand.js';
import { analysisEligible, analysisSlug } from './content.js';
import { bookmarkButton, catChip, chrome, esc, favicon, footer, head, heatBadge, hkt, igBodyCards, igCloseCard, igDotsNav, igDotsScript, igPointList, listenControls, media, packToolbar, safeHttp, share, withLcpShell } from './contentPage.js';
import { bestImage } from './media.js';
import type { StoryCluster } from './trending';
import type { NewsItem } from './types';

/** Plain sentences from a coverage blurb. Tags are dropped; the title alone is not body text. */
function proseSentences(text: string, title: string): string[] {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return [];
  const parts = plain.split(/(?<=[。！？])\s*|(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  const sentences = parts.length ? parts : [plain];
  if (sentences.length === 1 && sentences[0].replace(/[。！？.!?]+$/g, '') === title.trim()) return [];
  return sentences;
}

/** Body card from coverage blurbs already on the item. Omitted when every item is title-only. */
function storyBody(coverage: NewsItem[]): string {
  const seen = new Set<string>();
  const blocks: { title: string; sentences: string[] }[] = [];
  for (const row of coverage) {
    const sentences = proseSentences(row.excerpt || '', row.title);
    if (!sentences.length) continue;
    const key = sentences.join('\n');
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push({ title: row.source, sentences });
  }
  return igBodyCards(blocks);
}

/**
 * /story/<id>/: one headline with every outlet's coverage of the same story, a reporting timeline
 * and related headlines. Noindex. The swipe body uses each outlet blurb when one is present.
 */
export function renderStoryPage(item: NewsItem, cluster: StoryCluster | null, related: NewsItem[], canonical: string): string {
  const coverage = (cluster?.items ?? [item]).slice().sort((a, b) => Date.parse(a.pubDate) - Date.parse(b.pubDate));
  const outlets = new Set(coverage.map((row) => row.source)).size;
  const image = safeHttp(bestImage(coverage)) || safeHttp(item.image);
  const url = safeHttp(item.link);
  const analysis = cluster && analysisEligible(cluster) ? `/analysis/${analysisSlug(cluster.lead.title)}/` : '';
  const description = outlets > 1 ? `${outlets} 間媒體報道：${item.title}` : `${item.source}：${item.title}`;
  const ld = `<meta name="robots" content="noindex, follow" />`;
  const seenTitles = new Set<string>([item.title.trim()]);
  const swipePoints: string[] = [];
  for (const row of coverage) {
    const title = row.title.trim();
    if (!title || seenTitles.has(title)) continue;
    seenTitles.add(title);
    swipePoints.push(`${row.source}：${title}`);
    if (swipePoints.length >= 3) break;
  }
  const timeline = coverage.length > 1 ? `<div class="ig-card ig-card-timeline"><section class="story column-block timeline-card" aria-label="各媒體報道"><div class="story-body">
        <h2 class="column-h2">各媒體報道（香港時間）</h2>
        <ol class="timeline" data-timeline="scroll">${coverage.map((row) => `<li data-story-id="${esc(row.id)}"><time datetime="${esc(row.pubDate)}">${esc(hkt(row.pubDate, false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong class="tl-phase">${esc(row.source)}</strong> ${esc(row.title)}</span></li>`).join('')}</ol>
      </div></section></div>` : '';
  const sourceRows = coverage.map((row) => {
    const href = safeHttp(row.link);
    if (!href) return '';
    return `<li><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${favicon(href)}<span class="source-name">${esc(row.source)}</span><span class="source-title">${esc(row.title)}</span></a></li>`;
  }).join('');
  const sources = sourceRows
    ? `<div class="ig-card ig-card-sources"><section class="pack-sources" aria-label="來源"><h2 class="column-h2">來源（${coverage.length}）</h2><ul class="source-list">${sourceRows}</ul></section></div>`
    : '';
  const cards = related.slice(0, 6).map((row) => `<article class="story">
          <a class="story-media" href="/story/${esc(row.id)}/" tabindex="-1" aria-hidden="true">${media(row.image, row.category, row.source)}</a>
          <div class="story-body">
            <div class="story-kicker">${catChip(row.category)}</div>
            <h3 class="story-title"><a href="/story/${esc(row.id)}/">${esc(row.title)}</a></h3>
            <div class="story-meta">${favicon(row.link)}<span class="source-tag">${esc(row.source)}</span></div>
          </div>
        </article>`).join('');
  const html = `<!doctype html>
<html lang="zh-HK">
${head(item.title, description, canonical, image, 'article', ld, '', false, { lcp: true, ...(image ? { imagePreload: image } : {}) })}
<body>
  <div class="page column-page" data-kind="story">
  ${chrome('none')}
  <div class="layout">
    <main id="content" class="column-main">
      ${igDotsNav()}
      <div class="ig-deck" id="ig-deck">
      <div class="ig-card ig-card-lead"><article class="story story-hero column-hero pack-article" data-story-id="${esc(item.id)}">
        <div class="story-media">${media(image, item.category, item.source, true, '', Boolean(image))}</div>
        <div class="story-body">
          <div class="story-kicker">${catChip(item.category)}${heatBadge(outlets)}</div>
          <h1 class="story-title column-title">${esc(item.title)}</h1>
          <p class="dek">${esc(description)}</p>
          ${igPointList(swipePoints)}
          <div class="story-meta">${favicon(item.link)}<strong>${esc(item.source)}</strong><time datetime="${esc(item.pubDate)}">· ${esc(hkt(item.pubDate))} 香港時間</time></div>
          ${packToolbar(`${url ? `<a class="chip" href="${esc(url)}" target="_blank" rel="noopener noreferrer">閱讀原文</a>` : ''}${analysis ? `<a class="chip analysis-chip" href="${analysis}"><span class="badge ai-badge">AI 整合</span> 背景與各方說法</a>` : ''}${share(item.title, canonical)}${listenControls()}${bookmarkButton({ page: 'story', key: item.id, title: item.title, link: `/story/${item.id}/`, publishedAt: item.pubDate, category: item.category })}`)}
        </div>
      </article></div>
      ${timeline}
      ${storyBody(coverage)}
      ${sources}
      ${igCloseCard(item.title, cards ? `<section class="related"><h2 class="section-title">相關頭條</h2><div class="news-grid related-grid">${cards}</div></section>` : '')}
      </div>
    </main>
  </div>
  ${footer(false)}
  </div>
  ${igDotsScript()}
</body>
</html>`;
  return withLcpShell(html, { imageId: image ? 'wn-lcp' : '' });
}

export function renderStoryMissing(canonical: string): string {
  return withLcpShell(`<!doctype html>
<html lang="zh-HK">
${head('此則頭條已經下架', '標題只保留一段時間。', canonical, '', 'website', '<meta name="robots" content="noindex" />', '', false, { lcp: true })}
<body><div class="page column-page" data-kind="story">${chrome('none')}<main id="content" class="column-index"><div class="status-panel"><h2>此則頭條已經下架</h2><p>${esc(siteBrand)}只保留最近的標題。可以返回首頁查看最新頭條。</p><a class="primary" href="/">返回首頁</a></div></main>${footer(false)}</div></body></html>`);
}

/** Same-category headlines first, newest first, excluding the story's own cluster. */
export function relatedItems(item: NewsItem, cluster: StoryCluster | null, items: NewsItem[], limit = 6): NewsItem[] {
  const own = new Set((cluster?.items ?? [item]).map((row) => row.id));
  const rest = items.filter((row) => !own.has(row.id));
  const same = rest.filter((row) => row.category === item.category);
  return [...same, ...rest.filter((row) => row.category !== item.category)].slice(0, limit);
}
