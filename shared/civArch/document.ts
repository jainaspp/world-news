import { esc } from '../contentPage.js';
import { MONITOR_READING } from '../civilization/clock.js';
import { HERO_BEATS } from '../heroOpening.js';

/**
 * G01 phase-1 document shell.
 * One article. 古 / 今 / 未來 are volumes inside it, not three sites.
 * Bare `/` stops wearing the news list. News routes and APIs stay where they are.
 * Site-major gate is still open: this is not a production cutover.
 */

export const OPEN_TITLES = [
  '奇點',
  '對聲響的誤認',
  '原子湯',
  '第一批恆星',
  '恆星撒下的元素',
  '會下雨的藍石',
  '故事交到讀者手上',
] as const;

export const MARGIN_OPEN = [
  { slug: 'script', name: '漢語與文字' },
  { slug: 'quantity', name: '數量與形式' },
  { slug: 'languages', name: '英語與世界語文門徑' },
] as const;

export const MARGIN_CLOSED = [
  { slug: 'matter', name: '物質' },
  { slug: 'change', name: '變化' },
  { slug: 'life', name: '生命' },
  { slug: 'humans', name: '時間中的人類' },
  { slug: 'surface', name: '地表' },
  { slug: 'sound', name: '聲音' },
  { slug: 'form', name: '形色' },
  { slug: 'body', name: '身體' },
  { slug: 'inquiry', name: '求知方法' },
] as const;

const PROOF = ['第一段。此處有正文。', '第二段。此處有正文。'] as const;
const UNWRITTEN = ['尚未撰成。'] as const;
const SITE = 'https://world-news.xyz';
const DESCRIPTION = '一卷可讀完的長文。古、今、未來是同一篇裡的三段。';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/deed.zh-hant';

interface Chapter {
  slug: string;
  name: string;
  state: 'proof' | 'unwritten';
  paragraphs: readonly string[];
}

interface Volume {
  id: 'ancient' | 'present' | 'ahead';
  name: string;
  print: string;
  lead: readonly string[];
  chapters: readonly Chapter[];
  tail?: string;
}

const VOLUMES: readonly Volume[] = [
  {
    id: 'ancient',
    name: '卷一 · 古',
    print: '暖金墨 · 暖金欄線',
    lead: ['本卷是「古」。向下為「今」，再下為「未來」。'],
    chapters: [
      { slug: 'deep-time', name: '深時間', state: 'unwritten', paragraphs: UNWRITTEN },
      { slug: 'origins', name: '起源', state: 'unwritten', paragraphs: UNWRITTEN },
      { slug: 'before-cities', name: '城市出現以前', state: 'unwritten', paragraphs: UNWRITTEN },
    ],
  },
  {
    id: 'present',
    name: '卷二 · 今',
    print: '冷藍欄線',
    lead: ['本卷是「今」。', '向上為「古」。', '向下為「未來」。'],
    chapters: [
      { slug: 'method', name: '科學方法', state: 'proof', paragraphs: PROOF },
      { slug: 'tools', name: '當代工具', state: 'unwritten', paragraphs: UNWRITTEN },
    ],
  },
  {
    id: 'ahead',
    name: '卷三 · 未來',
    print: '紙色底 · 章外緣紫黑光',
    lead: ['本卷是「未來」。向上為「今」，再上為「古」。'],
    chapters: [
      { slug: 'outlook-a', name: '展望甲', state: 'unwritten', paragraphs: ['尚未撰成。題目未定，此處不預寫推演。'] },
      { slug: 'outlook-b', name: '展望乙', state: 'unwritten', paragraphs: ['尚未撰成。題目未定，此處不預寫推演。'] },
    ],
    tail: '其餘章尚未撰成。',
  },
];

type Active = 'home' | 'ancient' | 'present' | 'ahead' | 'margin' | 'cut' | 'colophon';

interface Page {
  html: string;
  status: number;
  robots: string;
}

const NEWS_VIEWS = new Set(['bookmarks', 'following', 'mine', 'list']);

export function cleanPath(pathname: string): string | null {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\0')) return null;
    return decoded.replace(/\/+$/, '') || '/';
  } catch {
    return null;
  }
}

/** Query views that still belong to the demoted news list, not the document shell. */
export function wantsNewsSkin(url: URL): boolean {
  if (cleanPath(url.pathname) !== '/') return false;
  if ((url.searchParams.get('q') || '').trim()) return true;
  if ((url.searchParams.get('source') || '').trim()) return true;
  const region = (url.searchParams.get('region') || '').trim();
  if (region && region.toUpperCase() !== 'ALL') return true;
  const category = (url.searchParams.get('category') || '').trim();
  if (category && category.toLowerCase() !== 'all') return true;
  return NEWS_VIEWS.has((url.searchParams.get('view') || '').trim());
}

export function stayFace(): string {
  const seconds = String(MONITOR_READING.seconds).padStart(2, '0');
  return `${MONITOR_READING.minutes} 分 ${seconds} 秒`;
}

export const CIV_ARCH_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html { overflow-x: hidden; background: var(--paper); color: var(--ink); }
body {
  margin: 0;
  overflow-x: hidden;
  background: var(--paper);
  color: var(--ink);
  font-family: "Noto Sans TC", "PingFang TC", "Noto Sans CJK TC", sans-serif;
  font-size: 17px;
  line-height: 1.75;
}
:root {
  --paper: #f4efe6;
  --ink: #1b1714;
  --muted: #5e574c;
  --line: #ddd4c4;
  --gold-ink: #6a4514;
  --gold-line: #b5833a;
  --blue-ink: #163e5c;
  --blue-line: #3d6d97;
  --ahead-edge: #2a2038;
  --ahead-glow: rgba(58, 36, 82, 0.28);
  --link: #1a4468;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #12110f;
    --ink: #f4ecdf;
    --muted: #cbbfaa;
    --line: #3a342c;
    --gold-ink: #e4c48a;
    --gold-line: #c4924a;
    --blue-ink: #d5e4f2;
    --blue-line: #7ea4c9;
    --ahead-edge: #d9c7ee;
    --ahead-glow: rgba(180, 150, 210, 0.22);
    --link: #d5e4f2;
  }
}
a { color: var(--link); }
:focus-visible { outline: 2px solid var(--blue-line); outline-offset: 3px; }
[hidden] { display: none !important; }
.skip-link {
  position: absolute;
  left: 0.75rem;
  top: -3rem;
  background: var(--paper);
  color: var(--ink);
  padding: 0.4rem 0.7rem;
  z-index: 4;
}
.skip-link:focus { top: 0.5rem; }
.top {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.top-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0.35rem 1rem;
}
h1.wordmark {
  margin: 0;
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}
h1.wordmark a { color: var(--ink); text-decoration: none; }
.nav-desk { display: none; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
.nav-desk a { color: var(--ink); text-decoration: none; }
.nav-desk a[aria-current="page"] { box-shadow: inset 0 -2px 0 currentColor; }
.skip-open, .vol-toggle {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 1px solid var(--line);
  min-height: 44px;
  padding: 0 0.85rem;
  cursor: pointer;
}
.skip-open-bar, .vol-toggle { margin-left: auto; }
@media (max-width: 959px) {
  .skip-open-bar { display: none; }
}
.vol-menu { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
.vol-menu a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1rem;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
  white-space: normal;
}
.sheet { width: min(1120px, calc(100% - 2rem)); margin: 0 auto; }
.sheet-narrow { width: min(40rem, calc(100% - 2rem)); padding: 1.5rem 0 2rem; }
.subtitle { margin: 0.35rem 0 0; color: var(--muted); text-align: center; }
.read-lede { text-align: left; margin: 1.25rem 0 0; }
.open { padding: 2.5rem 0 2rem; }
.open-inner { width: min(36rem, 100%); margin: 0 auto; }
.open-brand {
  margin: 0;
  text-align: center;
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 2rem;
  font-weight: 700;
}
.skip-open-flow { display: inline-flex; margin: 1rem 0; }
.beat-status, .beat-dots { display: none; text-align: center; }
html[data-land="present"] #civ-open { display: none; }
html[data-play="1"] body { overflow: hidden; }
html[data-play="1"] .open {
  min-height: calc(100vh - 4.25rem);
  min-height: calc(100dvh - 4.25rem);
  display: grid;
  align-content: center;
}
html[data-play="1"] .beat { display: none; }
html[data-play="1"] .beat[data-on="true"] { display: list-item; }
html[data-play="1"] .beat-status, html[data-play="1"] .beat-dots { display: block; }
.beats { list-style: none; margin: 1rem 0 0; padding: 0; }
.beat { margin: 0 0 1.25rem; }
.beat-kicker, .volume-print, .rail-kicker, .kicker { margin: 0; color: var(--muted); font-size: 14px; }
.beat-name {
  margin: 0.15rem 0;
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 1.35rem;
  font-weight: 700;
}
.beat-aside { font-size: 14px; color: var(--muted); }
.beat-dots span { display: inline-block; margin: 0 0.3rem; }
.volume { margin-top: 2.5rem; padding-top: 1.1rem; scroll-margin-top: 4.75rem; }
.volume-ancient { border-top: 3px solid var(--gold-line); }
.volume-present { border-top: 3px solid var(--blue-line); }
.volume-ahead { border-top: 3px solid var(--ahead-edge); }
.volume-name {
  margin: 0.2rem 0 0.35rem;
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
  scroll-margin-top: 4.75rem;
}
.volume-ancient .volume-name { color: var(--gold-ink); }
.volume-present .volume-name { color: var(--blue-ink); }
.volume-lead p, .chapter p, .bookmark p, .stay p, .sheet-narrow p { margin: 0.35rem 0; }
.chapter { scroll-margin-top: 4.75rem; margin: 1.25rem 0; }
.chapter-name {
  margin: 0 0 0.35rem;
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  scroll-margin-top: 4.75rem;
}
.volume-ahead .chapter-ahead {
  box-shadow: 0 0 0 1px var(--ahead-edge), 0 0 28px var(--ahead-glow);
  padding: 0.85rem 1rem;
}
.chips {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  max-width: 100%;
  margin: 0.85rem 0 0.2rem;
  padding-bottom: 0.2rem;
  touch-action: pan-x pan-y;
}
.chips a {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.85rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.rail { display: none; }
.bookmark {
  margin: 1.35rem 0;
  padding: 0.9rem 1rem;
  border: 1px solid var(--blue-line);
  scroll-margin-top: 4.75rem;
}
.bookmark h3, .stay h3, .margin-rail .rail-kicker { margin: 0 0 0.25rem; font-size: 1rem; }
.bookmark a { color: inherit; }
.margin-rail { font-size: 14px; margin: 0.5rem 0 1rem; }
.margin-rail a, .door-list a, .door-list li {
  display: flex;
  align-items: center;
  min-height: 44px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
}
.door-list { list-style: none; margin: 1rem 0 0; padding: 0; }
.door-closed { margin-right: 0.75rem; }
.door-state { color: var(--muted); font-size: 14px; }
.stay {
  margin-top: 2.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
  scroll-margin-top: 4.75rem;
}
.stay-face {
  font-family: "Noto Serif TC", "Songti TC", serif;
  font-size: 1.75rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
}
.unwritten-note { color: var(--muted); }
.colophon-foot {
  width: min(1120px, calc(100% - 2rem));
  margin: 3rem auto 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}
.foot-nav, .legal { display: flex; flex-direction: column; gap: 0.15rem; }
.foot-nav a, .legal a {
  display: flex;
  align-items: center;
  min-height: 44px;
  color: var(--ink);
}
.license { margin: 0.6rem 0; font-size: 12px; line-height: 1.6; }
.legal { margin-top: 0.25rem; font-size: 12px; }
@media (min-width: 960px) {
  .nav-desk { display: flex; }
  .vol-toggle, .vol-menu, .skip-open-flow { display: none !important; }
  .volume-name { font-size: 32px; }
  .volume-lead p, .chapter p { font-size: 18px; }
  .volume-grid {
    display: grid;
    grid-template-columns: 11rem minmax(0, 40rem) 13rem;
    column-gap: 1.5rem;
    align-items: start;
  }
  .rail {
    display: block;
    grid-column: 1;
    grid-row: 1 / span 2;
    position: sticky;
    top: 4.75rem;
    font-size: 14px;
  }
  .rail a { display: block; padding: 0.4rem 0; color: var(--ink); text-decoration: none; }
  .landing, .volume-body { grid-column: 2; grid-row: 1; }
  .margin-rail { grid-column: 3; grid-row: 1; align-self: start; margin-top: 0; }
  .after { grid-column: 2; grid-row: 2; }
  .foot-nav, .legal { flex-direction: row; gap: 1.25rem; flex-wrap: wrap; }
  .foot-nav a, .legal a { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .beat { display: list-item !important; }
  .open, .top, .volume-name { transition: none; }
}
`.trim();

function homeHeadScript(): string {
  return `(function(){try{var reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}if(reduce)document.documentElement.setAttribute('data-motion','reduce');var seen=false;try{seen=sessionStorage.getItem('civ_arch_open_seen')==='1'}catch(e){}if(seen)document.documentElement.setAttribute('data-land','present');else if(!reduce)document.documentElement.setAttribute('data-play','1')}catch(e){}})();`;
}

function bootScript(): string {
  return `(function(){
  var page = document.body.getAttribute('data-page') || '';
  var focusId = document.body.getAttribute('data-focus') || '';
  var reduce = document.documentElement.getAttribute('data-motion') === 'reduce';
  function go(id, focusH1) {
    var node = id ? document.getElementById(id) : null;
    if (node && node.scrollIntoView) {
      try { node.scrollIntoView({ block: 'start' }); } catch (err) { node.scrollIntoView(); }
    }
    var target = null;
    if (focusH1) target = document.querySelector('h1');
    else if (node) target = node.querySelector('h2, h3') || node;
    if (target && target.focus) {
      try { target.focus({ preventScroll: true }); } catch (err) {}
    }
  }
  var volBtn = document.getElementById('vol-toggle');
  var volMenu = document.getElementById('vol-menu');
  if (volBtn && volMenu) {
    volBtn.addEventListener('click', function () {
      var willOpen = volMenu.hasAttribute('hidden');
      if (willOpen) volMenu.removeAttribute('hidden');
      else volMenu.setAttribute('hidden', '');
      volBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !volMenu.hasAttribute('hidden')) {
        volMenu.setAttribute('hidden', '');
        volBtn.setAttribute('aria-expanded', 'false');
        volBtn.focus();
      }
    });
  }
  if (page !== 'home') {
    if (focusId) go(focusId, false);
    return;
  }
  var open = document.getElementById('civ-open');
  var timer = 0;
  var done = false;
  function conceal() {
    if (open) open.setAttribute('hidden', '');
    var skips = document.querySelectorAll('[data-skip-open]');
    for (var i = 0; i < skips.length; i++) skips[i].setAttribute('hidden', '');
  }
  function finish() {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    try { sessionStorage.setItem('civ_arch_open_seen', '1'); } catch (err) {}
    document.documentElement.removeAttribute('data-play');
    document.documentElement.setAttribute('data-land', 'present');
    conceal();
    go('vol-present', true);
  }
  var skips = document.querySelectorAll('[data-skip-open]');
  for (var s = 0; s < skips.length; s++) skips[s].addEventListener('click', finish);
  if (document.documentElement.getAttribute('data-land') === 'present') {
    conceal();
    go('vol-present', true);
    return;
  }
  if (reduce || !open) return;
  var beats = open.querySelectorAll('[data-beat]');
  var status = document.getElementById('beat-status');
  var index = 0;
  function paint(n) {
    for (var i = 0; i < beats.length; i++) beats[i].setAttribute('data-on', i === n ? 'true' : 'false');
    if (status) status.textContent = '現為第 ' + (n + 1) + ' 拍／共 7 拍';
  }
  function tick() {
    if (done) return;
    if (index >= beats.length - 1) {
      timer = setTimeout(finish, 900);
      return;
    }
    var from = Number(beats[index].getAttribute('data-at') || '0');
    index += 1;
    var to = Number(beats[index].getAttribute('data-at') || '0');
    paint(index);
    var wait = to - from;
    if (!(wait > 0)) wait = 1600;
    timer = setTimeout(tick, wait);
  }
  if (!beats.length) return;
  paint(0);
  var firstWait = beats.length > 1 ? Number(beats[1].getAttribute('data-at') || '1600') - Number(beats[0].getAttribute('data-at') || '0') : 1600;
  if (!(firstWait > 0)) firstWait = 1600;
  timer = setTimeout(tick, firstWait);
})();`;
}

function navLink(href: string, label: string, on: boolean): string {
  return `<a href="${href}"${on ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
}

function header(active: Active, showSkip: boolean): string {
  const skip = showSkip
    ? '<button type="button" class="skip-open skip-open-bar" data-skip-open>跳過開場</button>'
    : '';
  return `<a class="skip-link" href="#content">跳到正文</a>
<header class="top">
  <div class="top-bar">
    <h1 class="wordmark" tabindex="-1"><a href="/">文明編年史</a></h1>
    <nav class="nav-desk" aria-label="卷次">
      ${navLink('/read/ancient/', '卷一', active === 'ancient')}
      ${navLink('/read/present/', '卷二', active === 'present')}
      ${navLink('/read/ahead/', '卷三', active === 'ahead')}
      ${navLink('/margin/', '旁註', active === 'margin')}
      ${navLink('/cut/', '書籤', active === 'cut')}
    </nav>
    ${skip}
    <button type="button" class="vol-toggle" id="vol-toggle" aria-expanded="false" aria-controls="vol-menu">卷</button>
  </div>
  <div id="vol-menu" class="vol-menu" hidden>
    <a href="/read/ancient/">卷一 · 古</a>
    <a href="/read/present/">卷二 · 今</a>
    <a href="/read/ahead/">卷三 · 未來</a>
  </div>
</header>`;
}

function footer(): string {
  return `<footer class="colophon-foot">
  <nav class="foot-nav" aria-label="卷末">
    <a href="/search/">搜尋</a>
    <a href="/colophon/#license">授權</a>
    <a href="/colophon/#about">關於</a>
  </nav>
  <p class="license">依 <a href="${LICENSE_URL}">CC BY 4.0</a> 授權。署名：文明編年史。</p>
  <nav class="legal" aria-label="法務">
    <a href="/privacy/">私隱政策</a>
    <a href="/terms/">使用條款</a>
    <a href="/contact/">聯絡我們</a>
  </nav>
</footer>`;
}

function frame(input: {
  title: string;
  description: string;
  path: string;
  robots: string;
  page: string;
  focus: string;
  active: Active;
  body: string;
  status?: number;
  home?: boolean;
}): Page {
  const canonical = `${SITE}${input.path}`;
  const homeScript = input.home ? `<script>${homeHeadScript()}</script>` : '';
  const html = `<!doctype html>
<html lang="zh-HK">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(input.title)}</title>
  <meta name="description" content="${esc(input.description)}" />
  <meta name="robots" content="${esc(input.robots)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="文明編年史" />
  <meta property="og:title" content="${esc(input.title)}" />
  <meta property="og:description" content="${esc(input.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:locale" content="zh_HK" />
  <meta name="theme-color" content="#f4efe6" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&amp;family=Noto+Serif+TC:wght@700&amp;display=swap" />
  ${homeScript}
  <style>${CIV_ARCH_CSS}</style>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"文明編年史","url":"${SITE}/","inLanguage":"zh-HK"}</script>
</head>
<body data-civ-arch="g01" data-page="${esc(input.page)}" data-focus="${esc(input.focus)}">
  ${header(input.active, Boolean(input.home))}
  ${input.body}
  ${footer()}
  <script>${bootScript()}</script>
</body>
</html>`;
  return { html, status: input.status ?? 200, robots: input.robots };
}

function openingHtml(): string {
  if (HERO_BEATS.length !== OPEN_TITLES.length) throw new Error('opening beat count drifted');
  const items = HERO_BEATS.map((beat, index) => {
    const title = OPEN_TITLES[index];
    if (!title) throw new Error('opening title missing');
    const aside = beat.aside ? `<p class="beat-aside">${esc(beat.aside)}</p>` : '';
    return `<li class="beat" data-beat="${beat.id}" data-at="${beat.at}" data-on="${index === 0 ? 'true' : 'false'}">
      <p class="beat-kicker">第 ${beat.id} 拍／共 ${OPEN_TITLES.length} 拍</p>
      <p class="beat-name">${esc(title)}</p>
      <p class="beat-sentence">${esc(beat.main)}</p>
      ${aside}
    </li>`;
  }).join('');
  const dots = OPEN_TITLES.map((_, index) => `<span>${index + 1}</span>`).join('');
  return `<section id="civ-open" class="open" aria-label="開場">
    <div class="open-inner">
      <p class="open-brand" aria-hidden="true">文明編年史</p>
      <p class="subtitle">一卷，三段時間</p>
      <button type="button" class="skip-open skip-open-flow" data-skip-open>跳過開場</button>
      <p id="beat-status" class="beat-status">現為第 1 拍／共 7 拍</p>
      <ol class="beats">${items}</ol>
      <p class="beat-dots" aria-hidden="true">${dots}</p>
      <noscript><p><a href="#vol-present">跳到卷二</a></p></noscript>
    </div>
  </section>`;
}

function chips(volume: Volume): string {
  const links = volume.chapters.map((chapter) => (
    `<a href="/read/${volume.id}/${chapter.slug}/">${esc(chapter.name)}</a>`
  )).join('');
  return `<div class="chips" aria-label="${esc(volume.name)}的章">${links}</div>`;
}

function rail(volume: Volume): string {
  const links = volume.chapters.map((chapter) => (
    `<a href="/read/${volume.id}/${chapter.slug}/">${esc(chapter.name)}</a>`
  )).join('');
  return `<nav class="rail" aria-label="${esc(volume.name)}的章"><p class="rail-kicker">${esc(volume.name)}</p>${links}</nav>`;
}

function chapterHtml(volume: Volume, chapter: Chapter, focus: string, allowAuto: boolean): string {
  const ahead = volume.id === 'ahead' ? ' chapter-ahead' : '';
  const thin = chapter.state === 'unwritten' ? ' is-unwritten' : '';
  const id = `ch-${chapter.slug}`;
  const auto = allowAuto && focus === id ? ' autofocus' : '';
  const paras = chapter.paragraphs.map((line) => `<p>${esc(line)}</p>`).join('');
  return `<section class="chapter${ahead}${thin}" id="${id}">
    <h3 class="chapter-name" tabindex="-1"${auto}>${esc(chapter.name)}</h3>
    ${paras}
  </section>`;
}

function volumeHeading(volume: Volume, focus: string, allowAuto: boolean): string {
  const id = `vol-${volume.id}`;
  const auto = allowAuto && focus === id ? ' autofocus' : '';
  const lead = volume.lead.map((line) => `<p>${esc(line)}</p>`).join('');
  return `<h2 class="volume-name" tabindex="-1"${auto}>${esc(volume.name)}</h2>
    <p class="volume-print">${esc(volume.print)}</p>
    <div class="volume-lead">${lead}</div>`;
}

function bookmarkHtml(): string {
  return `<aside class="bookmark" id="bookmark" aria-label="書籤">
    <h3><a href="/cut/">今日切片</a></h3>
    <p>今日沒有可對照的切片</p>
  </aside>`;
}

function marginStripHtml(): string {
  const links = MARGIN_OPEN.map((door) => `<a href="/margin/${door.slug}/">${esc(door.name)}</a>`).join('');
  return `<aside class="margin-rail" id="margin-strip" aria-label="旁註">
    <p class="rail-kicker">旁註</p>
    ${links}
    <a href="/margin/">旁註總目</a>
  </aside>`;
}

function stayHtml(): string {
  const face = stayFace();
  return `<section class="stay" id="stay" aria-label="停留刻度" data-static-clock="1">
    <h3>停留刻度</h3>
    <p class="stay-face">${esc(face)}</p>
    <p>停留刻度由編輯寫定。</p>
    <p>資料日期：<time datetime="${esc(MONITOR_READING.asOf)}">${esc(MONITOR_READING.asOf)}</time></p>
    <p>此數不走動，亦非預報。</p>
  </section>`;
}

function volumeHtml(volume: Volume, focus: string, allowAuto: boolean): string {
  if (volume.id === 'present') {
    const method = volume.chapters[0];
    const rest = volume.chapters.slice(1);
    if (!method) throw new Error('present volume has no chapter');
    return `<section class="volume volume-present" id="vol-present" data-volume="present">
      <div class="volume-grid">
        ${rail(volume)}
        <div class="landing">
          ${volumeHeading(volume, focus, allowAuto)}
          ${chips(volume)}
          ${chapterHtml(volume, method, focus, allowAuto)}
          ${bookmarkHtml()}
        </div>
        ${marginStripHtml()}
        <div class="after">
          ${rest.map((chapter) => chapterHtml(volume, chapter, focus, allowAuto)).join('')}
          ${stayHtml()}
        </div>
      </div>
    </section>`;
  }
  return `<section class="volume volume-${volume.id}" id="vol-${volume.id}" data-volume="${volume.id}">
    <div class="volume-grid">
      ${rail(volume)}
      <div class="volume-body">
        ${volumeHeading(volume, focus, allowAuto)}
        ${chips(volume)}
        ${volume.chapters.map((chapter) => chapterHtml(volume, chapter, focus, allowAuto)).join('')}
        ${volume.tail ? `<p class="unwritten-note">${esc(volume.tail)}</p>` : ''}
      </div>
    </div>
  </section>`;
}

function documentBody(focus: string, allowAuto: boolean, home: boolean): string {
  const volumes = VOLUMES.map((volume) => volumeHtml(volume, focus, allowAuto)).join('');
  const lede = home ? '' : '<p class="read-lede subtitle">一卷，三段時間</p>';
  const open = home ? openingHtml() : '';
  return `<main id="content">${open}${lede}<article class="sheet" id="document">${volumes}</article></main>`;
}

function documentPage(input: {
  title: string;
  path: string;
  robots: string;
  page: string;
  focus: string;
  active: Active;
  home?: boolean;
}): Page {
  return frame({
    ...input,
    description: DESCRIPTION,
    body: documentBody(input.focus, !input.home, Boolean(input.home)),
  });
}

function miss(path: string, back: string): Page {
  return frame({
    title: '沒有這一頁 — 文明編年史',
    description: '此址不是這一卷的章。',
    path,
    robots: 'noindex, follow',
    page: 'miss',
    focus: '',
    active: 'home',
    status: 404,
    body: `<main id="content" class="sheet sheet-narrow">
      <h2>沒有這一頁</h2>
      <p>此址不是這一卷的章。</p>
      <p><a href="${esc(back)}">回到長卷</a></p>
    </main>`,
  });
}

function renderHome(): Page {
  return documentPage({
    title: '文明編年史',
    path: '/',
    robots: 'index, follow',
    page: 'home',
    focus: 'vol-present',
    active: 'home',
    home: true,
  });
}

function renderRead(path: string): Page {
  const rest = path.split('/').filter(Boolean).slice(1);
  if (rest.length > 2) return miss(path.endsWith('/') ? path : `${path}/`, '/read/');
  if (rest.length === 0) {
    return documentPage({
      title: '文明編年史',
      path: '/read/',
      robots: 'index, follow',
      page: 'read',
      focus: 'vol-ancient',
      active: 'ancient',
    });
  }
  const volume = VOLUMES.find((item) => item.id === rest[0]);
  if (!volume || !rest[0]) return miss(`${path}/`, '/read/');
  if (rest.length === 1) {
    return documentPage({
      title: `${volume.name} — 文明編年史`,
      path: `/read/${volume.id}/`,
      robots: 'index, follow',
      page: 'read',
      focus: `vol-${volume.id}`,
      active: volume.id,
    });
  }
  const chapter = volume.chapters.find((item) => item.slug === rest[1]);
  if (!chapter || !rest[1]) return miss(`${path}/`, `/read/${volume.id}/`);
  return documentPage({
    title: `${chapter.name} — 文明編年史`,
    path: `/read/${volume.id}/${chapter.slug}/`,
    robots: 'noindex, follow',
    page: 'read',
    focus: `ch-${chapter.slug}`,
    active: volume.id,
  });
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function renderCut(path: string): Page {
  const rest = path.split('/').filter(Boolean).slice(1);
  if (rest.length > 1) return miss(`${path}/`, '/cut/');
  const date = rest[0] && DAY.test(rest[0]) ? rest[0] : '';
  const href = date ? `/cut/${date}/` : '/cut/';
  const when = date ? `<p class="kicker"><time datetime="${esc(date)}">${esc(date)}</time></p>` : '';
  return frame({
    title: '今日切片 — 文明編年史',
    description: '今日沒有可對照的切片',
    path: href,
    robots: 'noindex, follow',
    page: 'cut',
    focus: '',
    active: 'cut',
    body: `<main id="content" class="sheet sheet-narrow">
      <h2>今日切片</h2>
      ${when}
      <p>今日沒有可對照的切片</p>
    </main>`,
  });
}

function marginFrame(title: string, path: string, body: string): Page {
  return frame({
    title,
    description: '旁註是頁緣的側線，不是第四卷。',
    path,
    robots: 'noindex, follow',
    page: 'margin',
    focus: '',
    active: 'margin',
    body,
  });
}

function renderMargin(path: string): Page {
  const rest = path.split('/').filter(Boolean).slice(1);
  if (rest.length > 2) return miss(`${path}/`, '/margin/');
  if (rest.length === 0) {
    const open = MARGIN_OPEN.map((door) => `<li><a href="/margin/${door.slug}/">${esc(door.name)}</a></li>`).join('');
    const closed = MARGIN_CLOSED.map((door) => (
      `<li><span class="door-closed">${esc(door.name)}</span><span class="door-state">尚未開啓</span></li>`
    )).join('');
    return marginFrame(
      '旁註 — 文明編年史',
      '/margin/',
      `<main id="content" class="sheet sheet-narrow">
        <h2>旁註</h2>
        <p>已開三門。其餘只列名稱，不設空課。</p>
        <ul class="door-list">${open}${closed}</ul>
      </main>`,
    );
  }
  const slug = rest[0] || '';
  const leaf = rest[1] || '';
  const open = MARGIN_OPEN.find((door) => door.slug === slug);
  const closed = MARGIN_CLOSED.find((door) => door.slug === slug);
  if (!open) {
    const name = closed?.name || '旁註';
    return marginFrame(
      `${name} — 旁註 — 文明編年史`,
      closed ? `/margin/${closed.slug}/` : '/margin/',
      `<main id="content" class="sheet sheet-narrow">
        <h2>${esc(name)}</h2>
        <p>尚未開啓。</p>
        <p><a href="/margin/">旁註總目</a></p>
      </main>`,
    );
  }
  if (!leaf) {
    return marginFrame(
      `${open.name} — 旁註 — 文明編年史`,
      `/margin/${open.slug}/`,
      `<main id="content" class="sheet sheet-narrow">
        <p class="kicker">旁註</p>
        <h2>${esc(open.name)}</h2>
        <p>這一葉尚未撰成。</p>
        <p><a href="/margin/${open.slug}/primer/">第一葉</a></p>
        <p><a href="/margin/">旁註總目</a></p>
      </main>`,
    );
  }
  if (leaf === 'primer') {
    return marginFrame(
      `第一葉 — ${open.name} — 文明編年史`,
      `/margin/${open.slug}/primer/`,
      `<main id="content" class="sheet sheet-narrow">
        <p class="kicker">${esc(open.name)}</p>
        <h2>第一葉</h2>
        <p>這一葉尚未撰成。</p>
        <p><a href="/margin/${open.slug}/">回到這一門</a></p>
      </main>`,
    );
  }
  return marginFrame(
    `${open.name} — 旁註 — 文明編年史`,
    `/margin/${open.slug}/`,
    `<main id="content" class="sheet sheet-narrow">
      <h2>${esc(open.name)}</h2>
      <p>尚未開啓。</p>
      <p><a href="/margin/">旁註總目</a></p>
    </main>`,
  );
}

function renderColophon(): Page {
  return frame({
    title: '書後 — 文明編年史',
    description: '授權、來源體例與關於本書。',
    path: '/colophon/',
    robots: 'noindex, follow',
    page: 'colophon',
    focus: '',
    active: 'colophon',
    body: `<main id="content" class="sheet sheet-narrow">
      <h2 id="license" tabindex="-1">授權</h2>
      <p>依 <a href="${LICENSE_URL}">CC BY 4.0</a> 授權。署名：文明編年史。</p>
      <p>與 CC BY 4.0 不相容的圖檔會逐張標示授權，不混進可轉載組。</p>
      <h2 id="sources" tabindex="-1">來源體例</h2>
      <p>來源體例的長文尚未撰成。</p>
      <h2 id="about" tabindex="-1">關於本書</h2>
      <p>關於本書的長文尚未撰成。</p>
    </main>`,
  });
}

export function renderCivArch(pathname: string): Page | null {
  const path = cleanPath(pathname);
  if (path == null) return null;
  if (path === '/') return renderHome();
  if (path === '/colophon') return renderColophon();
  if (path === '/cut' || path.startsWith('/cut/')) return renderCut(path);
  if (path === '/margin' || path.startsWith('/margin/')) return renderMargin(path);
  if (path === '/read' || path.startsWith('/read/')) return renderRead(path);
  return null;
}

export function civArchResponse(rawUrl: string): Response | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (wantsNewsSkin(url)) return null;
  const page = renderCivArch(url.pathname);
  if (!page) return null;
  return new Response(page.html, {
    status: page.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': page.status === 200 ? 'public, max-age=60' : 'no-store',
      'x-robots-tag': page.robots,
    },
  });
}
