import { chrome, esc, footer, head } from './contentPage.js';
import {
  LEARN_LESSONS,
  LEARN_PROGRESS_KEY,
  LEARN_SUBJECTS,
  learnLeafId,
  learnLesson,
  learnPathGroups,
  learnPathPlan,
  learnSubject,
  learnNextLeaf,
  type LearnLesson,
  type LearnPathPlanEntry,
  type LearnSubject,
} from './learn/catalog.js';

const ORIGIN = 'https://world-news.xyz';

const MOTTO = '開蒙——森羅萬象，由一葉始。';

/** P0→P1 過渡：樹尚在加厚，learn 全線維持 noindex，不進 sitemap。 */
export function learnIndexable(): boolean {
  return false;
}

/** 與文明／懶人包只走軟鏈：葉底 0–2 條，只列名，不貼正文。 */
const CIV_LABELS: Record<string, string> = {
  '/civilization/': '文明軸',
  '/civilization/chronicle/': '文明編年',
  '/civilization/origins/': '人類起源時間線',
  '/civilization/tech/': '科技與發現',
  '/civilization/city/': '城市・基建・民生',
  '/civilization/cosmos/': '宇宙與深時間',
  '/civilization/earth/': '地球與生命',
};

function civLabel(href: string): string {
  return CIV_LABELS[href] ?? '文明軸';
}

const PROGRESS_SCRIPT = `<script>
(function () {
  var key = ${JSON.stringify(LEARN_PROGRESS_KEY)};
  function read() {
    try {
      var data = JSON.parse(localStorage.getItem(key) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }
  function write(data) {
    data.updatedAt = new Date().toISOString();
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }
  function completed(data) {
    return Array.isArray(data.completed) ? data.completed.filter(function (id) { return typeof id === 'string'; }) : [];
  }
  function paint() {
    var data = read();
    var list = completed(data);
    var done = {};
    for (var i = 0; i < list.length; i++) done[list[i]] = true;
    var line = document.querySelector('[data-learn-progress]');
    if (line) {
      line.textContent = list.length
        ? ('本機已展開 ' + list.length + ' 葉 · 本機文明點 ' + list.length + '（記在本機，不作兌換）。')
        : '本機尚未記下進度。文明點只記本機，不作兌換。';
    }
    document.querySelectorAll('[data-learn-leaf]').forEach(function (card) {
      var id = card.getAttribute('data-learn-leaf');
      var state = card.querySelector('[data-learn-leaf-state]');
      if (!id || !state) return;
      if (done[id]) {
        card.classList.add('is-done');
        state.textContent = '本機已讀。';
        return;
      }
      card.classList.remove('is-done');
      var prereq = card.getAttribute('data-learn-prereq');
      if (prereq && !done[prereq]) {
        card.classList.add('is-pending');
        state.textContent = '建議先讀前一葉，再回來。';
      } else {
        card.classList.remove('is-pending');
        state.textContent = '可讀。';
      }
    });
    document.querySelectorAll('[data-learn-path]').forEach(function (section) {
      var groups = [];
      try { groups = JSON.parse(section.getAttribute('data-learn-path') || '[]'); } catch (e) {}
      var walked = false;
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g] || [];
        if (group.length) {
          var all = true;
          for (var k = 0; k < group.length; k++) {
            if (!done[group[k]]) { all = false; break; }
          }
          if (all) { walked = true; break; }
        }
      }
      var marker = section.querySelector('[data-learn-path-state]');
      if (walked) {
        section.classList.add('is-walked');
        if (marker) marker.textContent = '本機已走通一條區塊。';
      } else {
        section.classList.remove('is-walked');
        if (marker) marker.textContent = '';
      }
    });
  }
  document.querySelectorAll('[data-learn-done]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-learn-done');
      if (!id) return;
      var data = read();
      var list = completed(data);
      if (list.indexOf(id) < 0) list.push(id);
      data.completed = list;
      data.civPoints = list.length;
      write(data);
      var note = document.querySelector('[data-learn-status]');
      if (note) note.textContent = '本機已記下這一葉。文明點顯示＋1（記在本機，不作兌換）。';
      paint();
    });
  });
  var reset = document.querySelector('[data-learn-reset]');
  if (reset) {
    reset.addEventListener('click', function () {
      if (!window.confirm('清除本機開蒙進度？')) return;
      try { localStorage.removeItem(key); } catch (e) {}
      var note = document.querySelector('[data-learn-status]');
      if (note) note.textContent = '本機進度已清去。';
      paint();
    });
  }
  paint();
})();
</script>`;

function shell(options: { title: string; description: string; path: string; body: string; status?: number }): { html: string; status: number; indexable: boolean } {
  const canonical = `${ORIGIN}${options.path}`;
  const robots = '<meta name="robots" content="noindex,follow" />';
  const html = `<!doctype html>
<html lang="zh-HK">
${head(options.title, options.description, canonical, '', 'website', robots, '', false)}
<body>
  <div class="page column-page learn-page" data-kind="learn">
  ${chrome('learn')}
  <main id="content" class="column-index learn-main">
    ${options.body}
  </main>
  ${footer(false)}
  ${PROGRESS_SCRIPT}
  </div>
</body>
</html>`;
  return { html, status: options.status ?? 200, indexable: false };
}

function door(subject: LearnSubject): string {
  const state = subject.open ? '可讀' : '尚未開啓之路';
  const cls = subject.open ? 'learn-door is-open' : 'learn-door is-locked';
  return `<a class="${cls}" href="/learn/${esc(subject.id)}/">
    <span class="learn-bearing">${esc(subject.bearing)}</span>
    <strong>${esc(subject.name)}</strong>
    <span class="learn-state">${state}</span>
  </a>`;
}

export function renderLearnHub(): { html: string; status: number; indexable: boolean } {
  const legend = [...new Set(LEARN_SUBJECTS.map((subject) => subject.bearing))].map((bearing) => `<span>${esc(bearing)}</span>`).join('');
  const body = `<nav class="crumb"><a href="/">首頁</a> · 開蒙</nav>
    <header class="learn-hero">
      <h1>開蒙 · 森羅</h1>
      <p class="learn-motto">${esc(MOTTO)}</p>
      <p class="learn-progress" data-learn-progress>本機尚未記下進度。文明點只記本機，不作兌換。</p>
    </header>
    <section class="learn-map-section" aria-label="萬有地圖">
      <h2>萬有地圖</h2>
      <p class="learn-note">已開的門可以讀。其餘是淡門，只標方位，不假裝已有正文。地圖可以再長，這一版先把已登錄的門畫全。</p>
      <p class="learn-bearings" aria-label="方位">${legend}</p>
      <div class="learn-map">${LEARN_SUBJECTS.map(door).join('')}</div>
    </section>
    <p class="learn-bound">敘事見文明軸。今日事件見懶人包。此處是能力樹。</p>
    <p class="learn-actions"><button type="button" data-learn-reset>重設本機進度</button></p>`;
  return shell({
    title: '開蒙 · 森羅',
    description: '開蒙是宇宙級知識樹。萬有地圖由一葉始。',
    path: '/learn/',
    body,
  });
}

function leafCard(lesson: LearnLesson): string {
  const fullId = learnLeafId(lesson.subjectId, lesson.id);
  const prereqAttr = lesson.prereq ? ` data-learn-prereq="${esc(learnLeafId(lesson.subjectId, lesson.prereq))}"` : '';
  const state = lesson.prereq ? '建議先讀前一葉' : '可讀';
  return `<article class="learn-leaf" data-learn-leaf="${esc(fullId)}"${prereqAttr}>
    <h4><a href="/learn/${esc(lesson.subjectId)}/${esc(lesson.id)}/">${esc(lesson.title)}</a></h4>
    <p>${esc(lesson.summary)}</p>
    <span class="learn-state" data-learn-leaf-state>${state}</span>
  </article>`;
}

function blockSection(entry: { block: { id: string; name: string }; lessons: LearnLesson[] }): string {
  const inner = entry.lessons.length
    ? entry.lessons.map(leafCard).join('')
    : '<p class="learn-sprout">方位示意，正文未種。不假裝已有內容。</p>';
  const cls = entry.lessons.length ? 'learn-block' : 'learn-block is-sprout';
  return `<section class="${cls}">
    <h3>${esc(entry.block.name)}</h3>
    ${inner}
  </section>`;
}

function pathSection(subjectId: string, entry: LearnPathPlanEntry): string {
  const groups = learnPathGroups(subjectId, entry.path);
  const blocks = entry.blocks.map(blockSection).join('');
  const sprout = entry.path.blocks.length ? '' : '<p class="learn-sprout">方位示意，區塊與正文未種。</p>';
  return `<section class="learn-path" data-learn-path="${esc(JSON.stringify(groups))}">
    <h2>${esc(entry.path.name)}<span class="learn-path-state" data-learn-path-state></span></h2>
    ${blocks}
    ${sprout}
  </section>`;
}

export function renderLearnSubject(id: string): { html: string; status: number; indexable: boolean } {
  const subject = learnSubject(id);
  if (!subject) return renderLearnMiss();
  if (!subject.open) {
    const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · ${esc(subject.name)}</nav>
      <h1>${esc(subject.name)}</h1>
      <p class="learn-locked">${esc(subject.orientation)}</p>
      <p class="learn-state">尚未開啓之路</p>
      <p><a href="/learn/">返回萬有地圖</a></p>`;
    return shell({
      title: subject.name,
      description: subject.orientation,
      path: `/learn/${subject.id}/`,
      body,
    });
  }
  const tree = learnPathPlan(subject.id).map((entry) => pathSection(subject.id, entry)).join('');
  const growth = subject.growth ? `<p class="learn-growth">可再長（示意）：${esc(subject.growth)}。</p>` : '';
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · ${esc(subject.name)}</nav>
    <h1>${esc(subject.name)}</h1>
    <p class="learn-note">${esc(subject.orientation)} 方位：${esc(subject.bearing)}。</p>
    <section class="learn-tree" aria-label="${esc(subject.name)}門徑">
      ${tree}
    </section>
    ${growth}
    <p><a href="/learn/">返回萬有地圖</a></p>`;
  return shell({
    title: subject.name,
    description: subject.orientation,
    path: `/learn/${subject.id}/`,
    body,
  });
}

function softLinksParagraph(lesson: LearnLesson): string {
  const civilization = lesson.softLinks?.civilization ?? [];
  if (!civilization.length) return '';
  const links = civilization.map((href) => `<a href="${esc(href)}">${esc(civLabel(href))}</a>`).join('、');
  return `<p class="learn-soft">敘事上，見 ${links}。今日事件不在這一葉重寫。</p>`;
}

export function renderLearnLeaf(subjectId: string, lessonId: string): { html: string; status: number; indexable: boolean } {
  const subject = learnSubject(subjectId);
  const lesson = subject?.open ? learnLesson(subjectId, lessonId) : undefined;
  if (!subject || !lesson) return renderLearnMiss();
  const paragraphs = lesson.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const next = learnNextLeaf(subject.id, lesson.id);
  const nextLine = next
    ? `<p class="learn-next">下一葉（建議）：<a href="/learn/${esc(subject.id)}/${esc(next.id)}/">${esc(next.title)}</a></p>`
    : '';
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · <a href="/learn/${esc(subject.id)}/">${esc(subject.name)}</a> · ${esc(lesson.title)}</nav>
    <article class="learn-article">
      <h1>${esc(lesson.title)}</h1>
      <p class="learn-summary">${esc(lesson.summary)}</p>
      ${paragraphs}
      ${softLinksParagraph(lesson)}
      ${nextLine}
      <p class="learn-actions"><button type="button" data-learn-done="${esc(learnLeafId(subject.id, lesson.id))}">本節讀完</button> <span data-learn-status></span></p>
      <p><a href="/learn/${esc(subject.id)}/">返回${esc(subject.name)}</a></p>
    </article>`;
  return shell({
    title: lesson.title,
    description: lesson.summary,
    path: `/learn/${subject.id}/${lesson.id}/`,
    body,
  });
}

export function renderLearnMiss(): { html: string; status: number; indexable: boolean } {
  return shell({
    title: '找不到這一葉',
    description: '開蒙地圖上沒有這個地址。',
    path: '/learn/',
    body: '<h1>找不到這一葉</h1><p><a href="/learn/">返回萬有地圖</a></p>',
    status: 404,
  });
}

export function renderLearnPath(rest: string): { html: string; status: number; indexable: boolean } {
  if (!rest) return renderLearnHub();
  const parts = rest.split('/').filter(Boolean);
  if (parts.length === 1) return renderLearnSubject(parts[0] ?? '');
  if (parts.length === 2) return renderLearnLeaf(parts[0] ?? '', parts[1] ?? '');
  return renderLearnMiss();
}

export function learnLessonCount(): number {
  return LEARN_LESSONS.length;
}
