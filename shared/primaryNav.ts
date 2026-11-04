/**
 * IAa masthead shell. L1 is only 宇宙起源｜銀河系誕生｜地球生物.
 * L2 古｜今｜未來 shows inside the 地球生物 tree. 今日 → 新聞
 * (今日切片｜每日導讀｜懶人包) opens from 今, never as an L1 peer.
 * 開蒙 stays in 更多 / footer (rendered by chrome, not here).
 *
 * Provisional slugs, preferring routes that already exist (BRIEF §2).
 * SA lock: /civilization/ is the site-root overview, not an L1 pill.
 * - 宇宙起源 → /civilization/cosmos/
 * - 銀河系誕生 → /civilization/galaxy/ (stub shell; full page is IAb)
 * - 地球生物 → /civilization/earth/
 * - 古 → /civilization/earth/ (natural-history shell)
 * - 未來 → /civilization/#future
 * - 今日切片 → /today/ （港聞時間線。/#slice 只可作軸內次級錨，唔做新聞入口）
 * - 每日導讀 → /briefing/
 * - 懶人包 → /explainer/
 * 今 is a disclosure, not its own URL. Home is the demo spine, not the news surface.
 */

export type IaL1 = 'cosmos' | 'galaxy' | 'earth';
export type IaL2 = 'ancient' | 'now' | 'future';
export type IaNews = 'slice' | 'briefing' | 'explainer';
export type IaCurrent = 'page' | 'location' | 'true';

export interface IaState {
  l1: IaL1 | '';
  l1Current: IaCurrent | '';
  l2: IaL2 | '';
  l2Current: IaCurrent | '';
  news: IaNews | '';
  /** Second-row L2 on narrow viewports. */
  showL2: boolean;
  /** 今日 sheet / wide 今日 row. News routes only. */
  expandToday: boolean;
  /** Wide 地球生物 menu, so 古→今→未來 is on screen inside that tree. */
  expandEarth: boolean;
}

export const IA_L1: readonly { key: IaL1; href: string; label: string }[] = [
  { key: 'cosmos', href: '/civilization/cosmos/', label: '宇宙起源' },
  { key: 'galaxy', href: '/civilization/galaxy/', label: '銀河系誕生' },
  { key: 'earth', href: '/civilization/earth/', label: '地球生物' },
];

export const IA_NEWS: readonly { key: IaNews; href: string; label: string }[] = [
  { key: 'slice', href: '/today/', label: '今日切片' },
  { key: 'briefing', href: '/briefing/', label: '每日導讀' },
  { key: 'explainer', href: '/explainer/', label: '懶人包' },
];

export const IA_ANCIENT_HREF = '/civilization/earth/';
export const IA_FUTURE_HREF = '/civilization/#future';

const NEWS_ROUTES: Record<string, IaNews> = {
  today: 'slice',
  briefing: 'briefing',
  compare: 'explainer',
};

const ANCIENT = new Set(['earth', 'origins']);
const NOW = new Set(['tech', 'city', 'home', 'briefing', 'compare', 'today']);
const EARTH_TREE = new Set(['earth', 'origins', 'tech', 'city', 'chronicle', 'home', 'briefing', 'compare', 'today']);

const EMPTY: IaState = {
  l1: '',
  l1Current: '',
  l2: '',
  l2Current: '',
  news: '',
  showL2: false,
  expandToday: false,
  expandEarth: false,
};

/** Active-state map for routes the chrome already names. Unknown keys stay quiet. */
export function iaStateFor(active: string): IaState {
  if (active === 'cosmos' || active === 'galaxy') {
    return { ...EMPTY, l1: active, l1Current: 'page' };
  }
  if (!EARTH_TREE.has(active)) return { ...EMPTY };
  const news = NEWS_ROUTES[active] ?? '';
  const l2: IaL2 | '' = ANCIENT.has(active) ? 'ancient' : NOW.has(active) ? 'now' : '';
  return {
    l1: 'earth',
    l1Current: active === 'earth' ? 'page' : 'location',
    l2,
    l2Current: l2 ? 'true' : '',
    news: news || '',
    showL2: true,
    expandToday: Boolean(news),
    expandEarth: true,
  };
}

function aria(current: IaCurrent | ''): string {
  return current ? ` aria-current="${current}"` : '';
}

function l1Class(on: boolean): string {
  return on ? 'chip civ-chip active' : 'chip';
}

function segClass(on: boolean): string {
  return on ? 'ia-seg active' : 'ia-seg';
}

function newsLinks(state: IaState): string {
  return IA_NEWS.map((item) => {
    const on = state.news === item.key;
    return `<a class="${on ? 'chip active' : 'chip'}" href="${item.href}"${on ? ' aria-current="page"' : ''} data-ia-news="${item.key}">${item.label}</a>`;
  }).join('');
}

export function primaryNavHtml(active: string): string {
  const state = iaStateFor(active);
  const earthOn = state.l1 === 'earth';
  const ancientOn = state.l2 === 'ancient';
  const nowOn = state.l2 === 'now';
  const futureOn = state.l2 === 'future';
  const l1 = IA_L1.filter((item) => item.key !== 'earth').map((item) => {
    const on = state.l1 === item.key;
    return `<a class="${l1Class(on)}" href="${item.href}"${aria(on ? state.l1Current : '')} data-ia-level="1" data-ia-l1="${item.key}">${item.label}</a>`;
  }).join('');
  const earthAria = aria(earthOn ? state.l1Current : '');
  const earthData = ' data-ia-level="1" data-ia-l1="earth"';
  const earthLink = `<a class="${l1Class(earthOn)}" href="${IA_L1[2].href}"${earthAria}${earthData}>地球生物</a>`;
  const todayOpen = state.expandToday ? ' open' : '';
  const links = newsLinks(state);
  const ancient = `<a class="${segClass(ancientOn)} ia-ancient" href="${IA_ANCIENT_HREF}" data-ia-l2="ancient"${aria(ancientOn ? state.l2Current : '')}>古</a>`;
  const future = `<a class="${segClass(futureOn)} ia-future" href="${IA_FUTURE_HREF}" data-ia-l2="future"${aria(futureOn ? state.l2Current : '')}>未來</a>`;
  return `<div class="ia-shell" data-ia-active="${active}">
    <div class="ia-l1-row">
      <div class="chip-scroller">
        <nav class="civ-nav ia-l1" aria-label="主欄目">${l1}${earthLink}</nav>
      </div>
    </div>
    <div class="ia-branch"${state.showL2 ? '' : ' hidden'}>
      <details class="ia-today"${todayOpen}>
        <summary class="ia-l2-summary">
          <span class="ia-l2">${ancient}<span class="${segClass(nowOn)} ia-now" data-ia-l2="now"${aria(nowOn ? state.l2Current : '')}>今</span>${future}</span>
        </summary>
        <div class="ia-today-panel" role="group" aria-label="新聞">
          <p class="ia-today-kicker">今日 · 當下</p>
          <p class="ia-news-label">新聞</p>
          <div class="ia-news">${links}</div>
        </div>
      </details>
    </div>
  </div>`;
}

/**
 * Bring the visible `.chip.active` fully inside `.chip-scroller` by moving
 * that scroller only. `scrollIntoView` would also scroll the page and the snap deck.
 * A hidden duplicate (the wide or narrow copy) is skipped.
 */
export function revealActiveChannelChip(root: ParentNode = document): void {
  const scrollers = root.querySelectorAll<HTMLElement>('.chip-scroller');
  scrollers.forEach((scroller) => {
    const candidates = Array.from(scroller.querySelectorAll<HTMLElement>('.chip.active'));
    const active = candidates.find((chip) => chip.getBoundingClientRect().width >= 1);
    if (!active) return;
    const port = scroller.getBoundingClientRect();
    const chip = active.getBoundingClientRect();
    if (port.width < 1 || chip.width < 1) return;
    const slack = 12;
    const chipLeft = chip.left - port.left + scroller.scrollLeft;
    const chipRight = chipLeft + chip.width;
    const view = port.width;
    let target = 0;
    if (chip.width > view - slack * 2) target = Math.max(0, chipLeft - slack);
    else if (chipRight + slack > view) target = chipRight + slack - view;
    else if (chipLeft < slack) target = 0;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    if (target < 0) target = 0;
    if (target > max) target = max;
    if (Math.abs(scroller.scrollLeft - target) < 0.5) return;
    scroller.scrollLeft = target;
  });
}

/** Static documents have no React commit. This runs as the masthead is parsed. */
export function channelChipScrollScript(): string {
  return `<script id="wn-channel-chip">(function(){
  function visibleActive(scroller){
    var nodes=scroller.querySelectorAll(".chip.active");
    var i;
    for(i=0;i<nodes.length;i++){
      if(nodes[i].getBoundingClientRect().width>=1)return nodes[i];
    }
    return null;
  }
  function reveal(root){
    var scope=root||document;
    var scrollers=scope.querySelectorAll(".chip-scroller");
    var i;
    for(i=0;i<scrollers.length;i++){
      var scroller=scrollers[i];
      var active=visibleActive(scroller);
      if(!active)continue;
      var port=scroller.getBoundingClientRect();
      var chip=active.getBoundingClientRect();
      if(port.width<1||chip.width<1)continue;
      var slack=12;
      var chipLeft=chip.left-port.left+scroller.scrollLeft;
      var chipRight=chipLeft+chip.width;
      var view=port.width;
      var target=0;
      if(chip.width>view-slack*2)target=Math.max(0,chipLeft-slack);
      else if(chipRight+slack>view)target=chipRight+slack-view;
      else if(chipLeft<slack)target=0;
      var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
      if(target<0)target=0;
      if(target>max)target=max;
      if(Math.abs(scroller.scrollLeft-target)<0.5)continue;
      scroller.scrollLeft=target;
    }
  }
  document.addEventListener("click",function(event){
    var node=event.target;
    var link=node&&node.closest?node.closest(".ia-l2 a"):null;
    if(!link)return;
    event.stopPropagation();
  },true);
  function markFuture(){
    var path=(location.pathname||"").replace(/\\/+$/,"");
    if(path!=="/civilization"||location.hash!=="#future")return;
    var row=document.querySelector(".ia-branch");
    if(row)row.hidden=false;
    var i;
    var l1=document.querySelectorAll("[data-ia-l1=\\"earth\\"]");
    for(i=0;i<l1.length;i++){
      l1[i].classList.add("civ-chip","active");
      l1[i].setAttribute("aria-current","location");
    }
    var future=document.querySelectorAll("[data-ia-l2=\\"future\\"]");
    for(i=0;i<future.length;i++){
      future[i].classList.add("active");
      future[i].setAttribute("aria-current","true");
    }
  }
  var user=false;
  document.addEventListener("pointerdown",function(event){
    var node=event.target;
    if(node&&node.closest&&node.closest(".chip-scroller"))user=true;
  },true);
  function auto(){if(!user)reveal(document);}
  auto();
  markFuture();
  window.addEventListener("hashchange",markFuture);
  requestAnimationFrame(function(){requestAnimationFrame(auto);});
  window.addEventListener("resize",auto);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(auto);
  if(window.ResizeObserver){
    var ro=new ResizeObserver(auto);
    var nodes=document.querySelectorAll(".chip-scroller");
    for(var n=0;n<nodes.length;n++)ro.observe(nodes[n]);
  }
  window.__wnRevealChannelChip=function(){reveal(document);};
})();</script>`;
}

/** Homepage masthead is React. Stop once the reader drags the track. */
export function bindChannelChipScroll(doc: Document = document): () => void {
  let user = false;
  const auto = () => {
    if (!user) revealActiveChannelChip(doc);
  };
  const onPointer = (event: Event) => {
    const node = event.target;
    if (node instanceof Element && node.closest('.chip-scroller')) user = true;
  };
  auto();
  const view = doc.defaultView;
  let inner = 0;
  const outer = view?.requestAnimationFrame(() => {
    inner = view.requestAnimationFrame(auto);
  }) ?? 0;
  view?.addEventListener('resize', auto);
  doc.addEventListener('pointerdown', onPointer, true);
  void doc.fonts?.ready.then(auto);
  let observer: ResizeObserver | undefined;
  if (view && typeof view.ResizeObserver === 'function') {
    observer = new view.ResizeObserver(auto);
    doc.querySelectorAll('.chip-scroller').forEach((node) => observer?.observe(node));
  }
  return () => {
    if (outer) view?.cancelAnimationFrame(outer);
    if (inner) view?.cancelAnimationFrame(inner);
    view?.removeEventListener('resize', auto);
    doc.removeEventListener('pointerdown', onPointer, true);
    observer?.disconnect();
  };
}
