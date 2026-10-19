/**
 * Reversible draft index for the future written /tools/<slug>/ layer.
 * No child routes, no ads, no sitemap entry. Pairs come from softBridgePairs.ts.
 * See docs/tools-layer-SCHEMA.md.
 */

import { chrome, esc, footer, head } from './contentPage.js';
import { SOFT_BRIDGE_PAIRS } from './softBridgePairs.js';

export const TOOLS_DRAFT_PATH = '/tools/';

export function toolsDraftHeaders(): Record<string, string> {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=300',
    'x-robots-tag': 'noindex, follow',
  };
}

function explainerPath(url: string): string {
  const path = new URL(url).pathname;
  return path.endsWith('/') ? path : `${path}/`;
}

function pairList(): string {
  const items = SOFT_BRIDGE_PAIRS.map((pair) => `<li><p>配對編號：${esc(pair.slug)}</p><p><a href="${esc(explainerPath(pair.lazyPackUrl))}">對應的新聞懶人包</a></p><p><a href="${esc(pair.jdUrl)}" rel="noopener noreferrer">${esc(pair.cta)}</a></p><p>${esc(pair.disclosure)}</p></li>`);
  return `<ul class="points">${items.join('')}</ul>`;
}

export function renderToolsDraftIndex(): string {
  const canonical = `https://world-news.xyz${TOOLS_DRAFT_PATH}`;
  const title = '實用說明';
  const description = '書面實用層的草稿索引。只列已配對的新聞懶人包與原站工具說明，不供索引，不載入廣告。';
  const body = `
    <header class="index-head">
      <h1 class="column-title">${title}</h1>
      <p class="dek">這是書面實用層的草稿索引，搜尋引擎不收錄。工具說明仍在原站。本頁不載入廣告。</p>
    </header>
    <section class="story column-block"><div class="story-body"><h2 class="column-h2">同題伴頁</h2><p>下面只列已經人工配對的同題伴頁。每一筆是一則新聞懶人包，加上一頁原站工具說明。短片目錄、工作流程、結帳頁，以及尚未配對的工具，都不在這裡。</p>${pairList()}</div></section>
    <section class="story column-block"><div class="story-body"><h2 class="column-h2">尚未寫入</h2><p>本站還沒有書面工具正文。日後若寫入「/tools/某編號/」，只用書面中文，並且維持零廣告。刪除本頁即可撤回。懶人包頁尾的教學卡不受影響。</p></div></section>`;
  const robots = '<meta name="robots" content="noindex, follow" />';
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, '', 'website', robots, '', false)}
<body>
  <div class="page column-page" data-kind="site" data-page="tools-draft">
  ${chrome('none')}
  <main id="content" class="column-index site-prose">
    ${body}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}
