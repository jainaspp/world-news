/**
 * Homepage #slice / #civ landing.
 *
 * A full load of /#slice used to stay at scrollY 0: createRoot replaces the
 * server node the browser had already scrolled to, and history then restores
 * the previous visit's scroll position. Direct /#slice still lands, because
 * nothing restores over the fragment. Same-page #slice keeps working through
 * the browser; hashchange repeats the same offset.
 *
 * The offset is --home-anchor-offset (scroll-margin-top on .civ-home #slice).
 * Retries cover a restoration that arrives after the first paint, and stop
 * once the reader has moved away from the programmed position.
 */

export const HOME_ANCHOR_IDS = ['slice', 'civ'] as const;
export type HomeAnchorId = (typeof HOME_ANCHOR_IDS)[number];

/** Last retry stays inside the 2.5s gate window. */
export const HOME_HASH_RETRY_MS = [0, 80, 250, 500, 1000, 1600, 2200] as const;

const PLACE_EPSILON = 2;

export function homeAnchorId(hash: string): HomeAnchorId | '' {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const id = raw.split(/[?&]/)[0] ?? '';
  return id === 'slice' || id === 'civ' ? id : '';
}

export function hashFromHref(href: string): string {
  const at = href.indexOf('#');
  return at < 0 ? '' : href.slice(at);
}

export function parseCssPx(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Scroll top that puts the target's border edge `offsetPx` below the viewport top. */
export function homeAnchorScrollTop(documentTop: number, offsetPx: number): number {
  if (!Number.isFinite(documentTop) || !Number.isFinite(offsetPx)) return 0;
  const top = documentTop - offsetPx;
  return top > 0 ? Math.round(top) : 0;
}

/** Gap from the sticky chrome's bottom edge to the heading's top. */
export function headingClearance(headingViewportTop: number, chromeBottom: number): number {
  return headingViewportTop - chromeBottom;
}

export interface HomeHashReading {
  scrollY: number;
  desired: number;
  /** -1 until this page has programmed a scroll. */
  programmed: number;
  headingTop: number;
  headingBottom: number;
  chromeBottom: number;
}

/**
 * A late restoration back to 0, a layout shift under a scroll we just set,
 * or a heading sitting in the sticky chrome. A reader who has left that
 * position is not pulled back.
 */
export function shouldRecorrect(reading: HomeHashReading): boolean {
  const { scrollY, desired, programmed, headingTop, headingBottom, chromeBottom } = reading;
  if (!Number.isFinite(desired) || !Number.isFinite(scrollY)) return false;
  if (Math.abs(scrollY - desired) < PLACE_EPSILON) return false;
  if (scrollY < 4 && desired > 48) return true;
  if (programmed >= 0 && Math.abs(scrollY - programmed) < 4) return true;
  return headingTop < chromeBottom + 8 && headingBottom > chromeBottom;
}

export interface HomeHashView {
  hash: string;
  scrollY: number;
  offsetPx: number;
  target: { documentTop: number } | null;
  scrollTo(top: number): void;
}

/** Returns the programmed scroll top, or null when this hash is not a home anchor. */
export function placeHomeHash(view: HomeHashView): number | null {
  if (!homeAnchorId(view.hash) || !view.target) return null;
  const top = homeAnchorScrollTop(view.target.documentTop, view.offsetPx);
  if (Math.abs(view.scrollY - top) >= PLACE_EPSILON) view.scrollTo(top);
  return top;
}

/** Move the snap deck so the anchor's card sits at the top. Window scroll stays put. */
function scrollDeckTo(el: HTMLElement): void {
  const deck = el.closest('.ig-deck');
  if (!(deck instanceof HTMLElement)) return;
  const card = el.closest('.ig-card');
  const target = card instanceof HTMLElement ? card : el;
  const top = deck.scrollTop + target.getBoundingClientRect().top - deck.getBoundingClientRect().top;
  if (Math.abs(deck.scrollTop - top) < PLACE_EPSILON) return;
  deck.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
}

function readOffset(win: Window): number {
  const raw = win.getComputedStyle(win.document.documentElement).getPropertyValue('--home-anchor-offset');
  return parseCssPx(raw, 127);
}

export function bindHomeHashScroll(win: Window = window): () => void {
  let programmed = -1;
  const timers: number[] = [];

  function viewFor(id: string): HomeHashView | null {
    const el = win.document.getElementById(id);
    if (!el) return null;
    const scrollY = win.scrollY || win.pageYOffset || 0;
    const rect = el.getBoundingClientRect();
    return {
      hash: `#${id}`,
      scrollY,
      offsetPx: readOffset(win),
      target: { documentTop: rect.top + scrollY },
      scrollTo(top: number) {
        win.scrollTo({ top, behavior: 'auto' });
        programmed = top;
      },
    };
  }

  function place(): void {
    const id = homeAnchorId(win.location.hash);
    if (!id) return;
    const el = win.document.getElementById(id);
    if (el) scrollDeckTo(el);
    const view = viewFor(id);
    if (!view) return;
    const top = placeHomeHash(view);
    if (top != null) programmed = top;
  }

  function correct(): void {
    const id = homeAnchorId(win.location.hash);
    if (!id) return;
    const el = win.document.getElementById(id);
    if (!el) return;
    const deck = el.closest('.ig-deck');
    if (deck instanceof HTMLElement) {
      if (deck.scrollTop < 4) scrollDeckTo(el);
      return;
    }
    const scrollY = win.scrollY || win.pageYOffset || 0;
    const heading = el.querySelector('h1, h2') ?? el;
    const head = heading.getBoundingClientRect();
    const chrome = win.document.querySelector('.chrome');
    const chromeBottom = chrome ? chrome.getBoundingClientRect().bottom : 0;
    const desired = homeAnchorScrollTop(el.getBoundingClientRect().top + scrollY, readOffset(win));
    if (!shouldRecorrect({
      scrollY,
      desired,
      programmed,
      headingTop: head.top,
      headingBottom: head.bottom,
      chromeBottom,
    })) return;
    place();
  }

  function syncRestoration(): void {
    if (!('scrollRestoration' in win.history)) return;
    win.history.scrollRestoration = homeAnchorId(win.location.hash) ? 'manual' : 'auto';
  }

  function onHash(): void {
    syncRestoration();
    programmed = -1;
    place();
  }

  function onClick(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const node = event.target;
    if (!(node instanceof Element)) return;
    const link = node.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (!homeAnchorId(hashFromHref(href))) return;
    timers.push(win.setTimeout(() => {
      if (homeAnchorId(win.location.hash)) place();
    }, 0));
  }

  syncRestoration();
  place();
  for (const ms of HOME_HASH_RETRY_MS) timers.push(win.setTimeout(correct, ms));
  win.addEventListener('hashchange', onHash);
  win.addEventListener('pageshow', correct);
  win.addEventListener('load', correct);
  win.addEventListener('click', onClick);

  return () => {
    for (const id of timers) win.clearTimeout(id);
    win.removeEventListener('hashchange', onHash);
    win.removeEventListener('pageshow', correct);
    win.removeEventListener('load', correct);
    win.removeEventListener('click', onClick);
    if ('scrollRestoration' in win.history) win.history.scrollRestoration = 'auto';
  };
}
