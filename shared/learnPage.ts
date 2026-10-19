import { chrome, esc, footer, head } from './contentPage.js';
import {
  LEARN_LESSONS,
  LEARN_PROGRESS_KEY,
  LEARN_SUBJECTS,
  learnLesson,
  learnLessonsFor,
  learnSubject,
  type LearnLesson,
  type LearnSubject,
} from './learn/catalog.js';

const ORIGIN = 'https://world-news.xyz';

const MOTTO = '開蒙——森羅萬象，由一葉始。';

/** P0 shell stays out of the index until the tree is thick enough to stand alone. */
export function learnIndexable(): boolean {
  return false;
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
    var line = document.querySelector('[data-learn-progress]');
    if (line) line.textContent = list.length ? ('本機已展開 ' + list.length + ' 葉。') : '本機尚未記下進度。';
  }
  document.querySelectorAll('[data-learn-done]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-learn-done');
      if (!id) return;
      var data = read();
      var list = completed(data);
      if (list.indexOf(id) < 0) list.push(id);
      data.completed = list;
      write(data);
      var note = document.querySelector('[data-learn-status]');
      if (note) note.textContent = '本機已記下這一葉。';
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
      <p class="learn-progress" data-learn-progress>本機尚未記下進度。</p>
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

function lessonCard(lesson: LearnLesson): string {
  return `<article class="learn-leaf">
    <h2><a href="/learn/${esc(lesson.subjectId)}/${esc(lesson.id)}/">${esc(lesson.title)}</a></h2>
    <p>${esc(lesson.summary)}</p>
  </article>`;
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
  const lessons = learnLessonsFor(subject.id).map(lessonCard).join('');
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · ${esc(subject.name)}</nav>
    <h1>${esc(subject.name)}</h1>
    <p class="learn-note">${esc(subject.orientation)} 方位：${esc(subject.bearing)}。</p>
    ${lessons}
    <p><a href="/learn/">返回萬有地圖</a></p>`;
  return shell({
    title: subject.name,
    description: subject.orientation,
    path: `/learn/${subject.id}/`,
    body,
  });
}

export function renderLearnLeaf(subjectId: string, lessonId: string): { html: string; status: number; indexable: boolean } {
  const subject = learnSubject(subjectId);
  const lesson = subject?.open ? learnLesson(subjectId, lessonId) : undefined;
  if (!subject || !lesson) return renderLearnMiss();
  const paragraphs = lesson.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · <a href="/learn/${esc(subject.id)}/">${esc(subject.name)}</a> · ${esc(lesson.title)}</nav>
    <article class="learn-article">
      <h1>${esc(lesson.title)}</h1>
      <p class="learn-summary">${esc(lesson.summary)}</p>
      ${paragraphs}
      <p class="learn-soft">敘事上，見 <a href="/civilization/chronicle/">文明編年</a>。今日事件不在這一葉重寫。</p>
      <p class="learn-actions"><button type="button" data-learn-done="${esc(`${subject.id}:${lesson.id}`)}">本節讀完</button> <span data-learn-status></span></p>
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
