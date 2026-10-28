import { chrome, esc, footer, head } from './contentPage.js';
import {
  LEARN_LESSONS,
  LEARN_LICENSE,
  LEARN_PROGRESS_KEY,
  LEARN_SUBJECTS,
  learnLesson,
  learnLessonGate,
  learnLessonNext,
  learnLessonsFor,
  learnLevelLabel,
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
    document.querySelectorAll('[data-learn-leaf]').forEach(function (leaf) {
      var req = leaf.getAttribute('data-learn-requires') || '';
      var self = leaf.getAttribute('data-learn-leaf') || '';
      var unlocked = !req || list.indexOf(req) >= 0;
      var seen = list.indexOf(self) >= 0;
      leaf.classList.toggle('is-gated', !unlocked);
      leaf.classList.toggle('is-read', seen);
      var state = leaf.querySelector('[data-learn-gate-state]');
      if (state) state.textContent = seen ? '已展開' : (unlocked ? '可讀' : '待開啓');
      var link = leaf.querySelector('a');
      if (link) {
        if (unlocked) {
          link.removeAttribute('aria-disabled');
          link.removeAttribute('tabindex');
        } else {
          link.setAttribute('aria-disabled', 'true');
          link.setAttribute('tabindex', '-1');
        }
      }
    });
    document.querySelectorAll('[data-learn-gate-note]').forEach(function (note) {
      var req = note.getAttribute('data-learn-gate-note') || '';
      if (!req) return;
      if (list.indexOf(req) >= 0) {
        note.hidden = true;
      } else {
        note.hidden = false;
        note.textContent = '這一葉排在《' + (note.getAttribute('data-learn-gate-title') || '') + '》之後。本機尚未記下前一葉；順序而讀，脈絡更穩。';
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

function licenseLine(): string {
  const [before, after] = LEARN_LICENSE.note.split(LEARN_LICENSE.name);
  return `<p class="learn-license">${esc(before ?? '')}<a rel="license" href="${LEARN_LICENSE.url}">${esc(LEARN_LICENSE.name)}</a>${esc(after ?? '')}</p>`;
}

function door(subject: LearnSubject): string {
  const leaves = subject.open ? learnLessonsFor(subject.id).length : 0;
  const state = subject.open ? `可讀 · ${leaves} 葉` : '尚未開啓之路';
  const cls = subject.open ? 'learn-door is-open' : 'learn-door is-locked';
  return `<a class="${cls}" href="/learn/${esc(subject.id)}/">
    <span class="learn-bearing">${esc(subject.bearing)}</span>
    <strong>${esc(subject.name)}</strong>
    <span class="learn-state">${esc(state)}</span>
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
      <p class="learn-note">每門由一葉起，由淺入深。讀完一葉，下一葉在本機開啓；進度只記在這台機器上，不記名次。</p>
      <p class="learn-bearings" aria-label="方位">${legend}</p>
      <div class="learn-map">${LEARN_SUBJECTS.map(door).join('')}</div>
    </section>
    ${licenseLine()}
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
  const gate = learnLessonGate(lesson.subjectId, lesson.id);
  const condition = gate ? `先讀完《${esc(gate.title)}》後開啓` : '起點，可直接展開';
  return `<article class="learn-leaf" data-learn-leaf="${esc(`${lesson.subjectId}:${lesson.id}`)}" data-learn-requires="${esc(gate ? `${lesson.subjectId}:${gate.id}` : '')}">
    <h2><a href="/learn/${esc(lesson.subjectId)}/${esc(lesson.id)}/">${esc(lesson.title)}</a></h2>
    <p>${esc(lesson.summary)}</p>
    <p class="learn-gate"><span class="learn-level">${esc(learnLevelLabel(lesson.level))}</span> · ${condition} · <span data-learn-gate-state>可讀</span></p>
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
  const track = learnLessonsFor(subject.id);
  const lessons = track.map(lessonCard).join('');
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · ${esc(subject.name)}</nav>
    <h1>${esc(subject.name)}</h1>
    <p class="learn-note">${esc(subject.orientation)} 方位：${esc(subject.bearing)}。</p>
    <p class="learn-note">本門 ${track.length} 葉，由淺入深。讀完一葉，下一葉在本機開啓。</p>
    ${lessons}
    ${licenseLine()}
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
  const gate = learnLessonGate(subjectId, lessonId);
  const next = learnLessonNext(subjectId, lessonId);
  const paragraphs = lesson.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const gateNote = gate
    ? `<p class="learn-gate-note" data-learn-gate-note="${esc(`${subject.id}:${gate.id}`)}" data-learn-gate-title="${esc(gate.title)}" hidden></p>`
    : '';
  const nav = `<nav class="learn-nav" aria-label="葉序">
      ${gate ? `<a class="learn-nav-prev" rel="prev" href="/learn/${esc(subject.id)}/${esc(gate.id)}/">上一葉《${esc(gate.title)}》</a>` : ''}
      ${next ? `<a class="learn-nav-next" rel="next" href="/learn/${esc(subject.id)}/${esc(next.id)}/">下一葉《${esc(next.title)}》</a>` : '<span class="learn-nav-end">這一門的葉暫時讀到這裡。</span>'}
    </nav>`;
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/learn/">開蒙 · 森羅</a> · <a href="/learn/${esc(subject.id)}/">${esc(subject.name)}</a> · ${esc(lesson.title)}</nav>
    <article class="learn-article">
      <h1>${esc(lesson.title)}</h1>
      <p class="learn-summary">${esc(lesson.summary)}</p>
      ${gateNote}
      ${paragraphs}
      <p class="learn-soft">敘事上，見 <a href="/civilization/chronicle/">文明編年</a>。今日事件不在這一葉重寫。</p>
      ${licenseLine()}
      <p class="learn-actions"><button type="button" data-learn-done="${esc(`${subject.id}:${lesson.id}`)}">本節讀完</button> <span data-learn-status></span></p>
      ${nav}
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
