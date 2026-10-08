import { CATEGORIES, categoryLabel } from './categories.js';
import { chrome, esc, footer, head } from './contentPage.js';
import { REGIONS } from './feeds.js';
import type { QuizDoc } from './quiz.js';
import { highlight, type SearchHit } from './siteSearch.js';

function page(title: string, description: string, path: string, body: string, robots = ''): string {
  const canonical = `https://world-news.xyz${path}`;
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, '', 'website', robots, '', false)}
<body>
  <div class="page column-page">
  ${chrome(path.startsWith('/quiz') ? 'quiz' : path.startsWith('/saved') ? 'saved' : 'search')}
  <main id="content" class="column-index">
    ${body}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

function searchHref(q: string, region: string, category: string): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (region && region !== 'ALL') params.set('region', region);
  if (category && category !== 'all') params.set('category', category);
  const query = params.toString();
  return query ? `/search/?${query}` : '/search/';
}

function hitCard(hit: SearchHit, query: string): string {
  const external = /^https?:\/\//i.test(hit.href);
  const title = highlight(hit.title, query);
  const meta = highlight(hit.kind === 'article' ? hit.meta : hit.source, query);
  return `<article class="story">
      <div class="story-body">
        <div class="story-kicker"><span class="kicker-region">${esc(hit.kind === 'article' ? hit.source : '頭條')}</span>${hit.category ? `<span class="chip cat-chip">${esc(categoryLabel(hit.category))}</span>` : ''}</div>
        <h2 class="story-title"><a href="${esc(hit.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${title}</a></h2>
        <p class="dek">${meta}</p>
      </div>
    </article>`;
}

export function renderSearchPage(input: { q: string; region: string; category: string; hits: SearchHit[] }): string {
  const q = input.q.trim().slice(0, 80);
  const regions = REGIONS.map((region) => {
    const on = region.code === input.region;
    return `<a class="chip${on ? ' active' : ''}" href="${esc(searchHref(q, region.code, input.category))}"${on ? ' aria-current="true"' : ''}>${esc(region.label)}</a>`;
  }).join('');
  const categories = CATEGORIES.map((category) => {
    const on = category.id === input.category;
    return `<a class="chip${on ? ' active' : ''}" href="${esc(searchHref(q, input.region, category.id))}"${on ? ' aria-current="true"' : ''}>${esc(category.label)}</a>`;
  }).join('');
  const status = q
    ? (input.hits.length ? `共 ${input.hits.length} 則` : '沒有符合的結果。')
    : (input.hits.length ? `近期 ${input.hits.length} 則` : '輸入關鍵詞，搜尋今日及近數日的標題，以及導讀、懶人包與分析。');
  const cards = input.hits.map((hit) => hitCard(hit, q)).join('');
  const body = `
    <header class="index-head">
      <h1 class="column-title">站內搜尋</h1>
      <p class="dek">搜尋今日及近數日已收錄的標題，以及導讀、懶人包與分析。</p>
    </header>
    <form class="search-page-form" role="search" action="/search/" method="get">
      <label class="sr-only" for="site-search">關鍵詞</label>
      <input id="site-search" name="q" value="${esc(q)}" placeholder="搜尋" maxlength="80" />
      ${input.region !== 'ALL' ? `<input type="hidden" name="region" value="${esc(input.region)}" />` : ''}
      ${input.category !== 'all' ? `<input type="hidden" name="category" value="${esc(input.category)}" />` : ''}
      <button type="submit" class="primary">搜尋</button>
    </form>
    <p class="filter-label">地區</p>
    <nav class="filters" aria-label="地區">${regions}</nav>
    <p class="filter-label">分類</p>
    <nav class="filters" aria-label="分類">${categories}</nav>
    <p class="search-status" role="status">${esc(status)}</p>
    <div id="search-results" class="news-grid" data-ready="1">${cards}</div>`;
  return page('站內搜尋', '搜尋今日及近數日的標題，以及導讀與懶人包。', '/search/', body, '<meta name="robots" content="noindex,follow" />');
}

export function renderSavedPage(): string {
  const body = `
    <header class="index-head">
      <h1 class="column-title">收藏</h1>
      <p class="dek">收藏的頭條與文章只保存在這部瀏覽器，不會上傳，也沒有帳號。</p>
    </header>
    <p id="saved-empty" class="notice" hidden>尚未收藏頭條或文章。</p>
    <div id="saved-list" class="news-grid" aria-live="polite"></div>
    <script src="/saved.js" defer></script>`;
  return page('收藏', '保存在這部瀏覽器的頭條與文章。', '/saved/', body, '<meta name="robots" content="noindex,follow" />');
}

export function renderQuizPage(doc: QuizDoc | null): string {
  const questions = doc?.questions ?? [];
  const fields = questions.map((question, index) => {
    const name = `q${index}`;
    const options = question.choices.map((choice, choiceIndex) => (
      `<label class="quiz-option"><input type="radio" name="${name}" value="${choiceIndex}" /> <span>${esc(choice)}</span></label>`
    )).join('');
    return `<fieldset class="quiz-question">
        <legend>${index + 1}. ${esc(question.prompt)}</legend>
        <div class="quiz-options">${options}</div>
        <p class="quiz-reveal" hidden data-answer="${esc(question.answer)}">答案：<strong>${esc(question.answer)}</strong> <a href="${esc(question.sourceUrl)}" target="_blank" rel="noopener noreferrer">閱讀相關報道</a></p>
      </fieldset>`;
  }).join('');
  const body = `
    <header class="index-head">
      <h1 class="column-title">每日新聞小測</h1>
      <p class="dek">題目只根據當日公開標題與短述整理，用正式書面中文，不加入來源沒有的事實。每日 07:30 與 18:30（香港時間）更新。</p>
    </header>
    ${questions.length ? `<form class="quiz-form" id="quiz">
        ${fields}
        <button type="submit" class="primary">核對答案</button>
        <p class="quiz-score" aria-live="polite" hidden></p>
        <button type="button" class="chip quiz-share" hidden>分享成績</button>
      </form>
      <script src="/quiz.js" defer></script>` : '<p class="notice">今日試題尚未整理。請於 07:30 或 18:30（香港時間）之後再來。</p>'}`;
  return page('每日新聞小測', '根據當日公開標題整理的選擇題。', '/quiz/', body);
}
