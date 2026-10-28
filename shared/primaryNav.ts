/**
 * Primary channel row: 文明｜編年｜今天｜開蒙.
 * `civ-chip` is only the current 文明 pill, so a later chrome pass can keep
 * `.chip.civ-chip` as the filled/underlined current state (T8 #287 tip
 * `0f844a8` underlines every `.masthead .chip.civ-chip`).
 * `/` and civilization pages highlight 文明. Briefing highlights 今天 in this
 * row, while 導讀 stays the aria-current page inside 更多. Chronicle
 * highlights 編年. Learn highlights 開蒙.
 */
export type PrimaryKey = 'civilization' | 'chronicle' | 'today' | 'learn';

export function primaryKeyFor(active: string): PrimaryKey | '' {
  if (active === 'chronicle') return 'chronicle';
  if (active === 'civilization') return 'civilization';
  if (active === 'learn') return 'learn';
  if (active === 'briefing') return 'today';
  if (active === 'home') return 'civilization';
  return '';
}

export function primaryChipClass(current: PrimaryKey | '', key: PrimaryKey): string {
  const on = current === key;
  const parts = ['chip'];
  if (on && key === 'civilization') parts.push('civ-chip');
  if (on) parts.push('active');
  return parts.join(' ');
}

/** aria-current="page" only when this pill is the document, not a related cue. */
export function primaryAriaCurrent(active: string, key: PrimaryKey): boolean {
  if (active === 'briefing' && key === 'today') return false;
  return primaryKeyFor(active) === key;
}

export function primaryNavHtml(active: string): string {
  const current = primaryKeyFor(active);
  const item = (href: string, label: string, key: PrimaryKey) => {
    const aria = primaryAriaCurrent(active, key) ? ' aria-current="page"' : '';
    return `<a class="${primaryChipClass(current, key)}" href="${href}"${aria}>${label}</a>`;
  };
  return `<nav class="civ-nav" aria-label="主欄目">${item('/civilization/', '文明', 'civilization')}${item('/civilization/chronicle/', '編年', 'chronicle')}${item('/#slice', '今天', 'today')}${item('/learn/', '開蒙', 'learn')}</nav>`;
}

/**
 * Bring `.chip.active` fully inside `.chip-scroller` by moving that scroller
 * only. `scrollIntoView` would also scroll the page and the snap deck.
 * A 390px masthead leaves about 58px for the track, so 編年 and 今天 start
 * past the first paint when scrollLeft is 0.
 */
export function revealActiveChannelChip(root: ParentNode = document): void {
  const scrollers = root.querySelectorAll<HTMLElement>('.chip-scroller');
  scrollers.forEach((scroller) => {
    const active = scroller.querySelector<HTMLElement>('.chip.active');
    if (!active) return;
    const port = scroller.getBoundingClientRect();
    const chip = active.getBoundingClientRect();
    if (port.width < 1 || chip.width < 1) return;
    const chipLeft = chip.left - port.left + scroller.scrollLeft;
    const chipRight = chipLeft + chip.width;
    const view = port.width;
    // Least scroll away from 0 that still shows the whole pill. A later resize
    // that widens the track pulls back instead of leaving the first pills clipped.
    let target = 0;
    if (chip.width > view + 0.5) target = chipLeft;
    else if (chipRight > view + 0.5) target = chipRight - view;
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
  function reveal(root){
    var scope=root||document;
    var scrollers=scope.querySelectorAll(".chip-scroller");
    var i;
    for(i=0;i<scrollers.length;i++){
      var scroller=scrollers[i];
      var active=scroller.querySelector(".chip.active");
      if(!active)continue;
      var port=scroller.getBoundingClientRect();
      var chip=active.getBoundingClientRect();
      if(port.width<1||chip.width<1)continue;
      var chipLeft=chip.left-port.left+scroller.scrollLeft;
      var chipRight=chipLeft+chip.width;
      var view=port.width;
      var target=0;
      if(chip.width>view+0.5)target=chipLeft;
      else if(chipRight>view+0.5)target=chipRight-view;
      var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
      if(target<0)target=0;
      if(target>max)target=max;
      if(Math.abs(scroller.scrollLeft-target)<0.5)continue;
      scroller.scrollLeft=target;
    }
  }
  var user=false;
  document.addEventListener("pointerdown",function(event){
    var node=event.target;
    if(node&&node.closest&&node.closest(".chip-scroller"))user=true;
  },true);
  function auto(){if(!user)reveal(document);}
  auto();
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
