import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { igDotsScript } from '../shared/contentPage';

interface Fake {
  className: string;
  parentElement: Fake | null;
  children: Fake[];
  clientHeight: number;
  attrs: Record<string, string>;
  classList: {
    contains: (name: string) => boolean;
    add: (name: string) => void;
    toggle: (name: string, force?: boolean) => boolean;
  };
  names: Set<string>;
  setAttribute: (key: string, value: string) => void;
  getAttribute: (key: string) => string | null;
  querySelectorAll: (selector: string) => Fake[];
  appendChild: (child: Fake) => Fake;
  textContent: string;
}

function make(className: string, children: Fake[] = []): Fake {
  const names = new Set(className.split(/\s+/).filter(Boolean));
  const el = {
    className,
    parentElement: null as Fake | null,
    children,
    clientHeight: 800,
    attrs: {} as Record<string, string>,
    names,
    classList: {
      contains: (name: string) => names.has(name),
      add: (name: string) => { names.add(name); },
      toggle: (name: string, force?: boolean) => {
        const on = force === undefined ? !names.has(name) : force;
        if (on) names.add(name);
        else names.delete(name);
        return on;
      },
    },
    setAttribute(key: string, value: string) { this.attrs[key] = String(value); },
    getAttribute(key: string) { return Object.prototype.hasOwnProperty.call(this.attrs, key) ? this.attrs[key] : null; },
    querySelectorAll(selector: string) {
      const out: Fake[] = [];
      const walk = (node: Fake) => {
        if (selector === '.ig-card' && node.classList.contains('ig-card')) out.push(node);
        for (const child of node.children) walk(child);
      };
      for (const child of this.children) walk(child);
      return out;
    },
    appendChild(child: Fake) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    },
    textContent: '',
  };
  Object.defineProperty(el, 'textContent', {
    set(value: string) {
      if (value === '') this.children.length = 0;
    },
  });
  for (const child of children) child.parentElement = el;
  return el;
}

function sliceFn(script: string, name: string, next: string): string {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf(`function ${next}(`);
  if (start < 0 || end <= start) throw new Error(`missing ${name} before ${next}`);
  return script.slice(start, end);
}

function load(deck: Fake, nav: Fake) {
  const script = igDotsScript();
  const document = { createElement: () => make('') };
  return new Function('deck', 'nav', 'document', `
    ${sliceFn(script, 'cards', 'sheetOf')}
    ${sliceFn(script, 'dotWindow', 'paint')}
    ${sliceFn(script, 'paint', 'build')}
    return { cards: cards, dotWindow: dotWindow, paint: paint };
  `)(deck, nav, document) as {
    cards: () => Fake[];
    dotWindow: (n: number, idx: number) => { start: number; end: number; n: number; windowed: boolean };
    paint: (list: Fake[], idx: number) => void;
  };
}

function homeDeck(): Fake {
  const story = (name: string) => make(`ig-card ig-card-story ${name}`);
  const nested = make('ig-card ig-card-nested');
  const close = make('ig-card ig-card-close', [make('ig-sheet', [nested])]);
  return make('ig-deck', [
    make('ig-card ig-card-lead'),
    make('home-list', [
      make('rank-chunk', [
        make('rank-list', [story('a'), story('b')]),
      ]),
    ]),
    close,
  ]);
}

describe('T7 snap dot count', () => {
  it('counts snap pages and ignores cards nested inside a card', () => {
    const script = igDotsScript();
    expect(script).not.toContain('function cards(){return Array.prototype.slice.call(deck.querySelectorAll(".ig-card"));}');
    expect(script).toContain('node.classList.contains("ig-card")');
    const deck = homeDeck();
    const nav = make('ig-dots');
    const api = load(deck, nav);
    const all = deck.querySelectorAll('.ig-card');
    expect(all).toHaveLength(5);
    expect(api.cards()).toHaveLength(4);
    closeNested(deck).appendChild(make('ig-card ig-card-extra'));
    expect(deck.querySelectorAll('.ig-card')).toHaveLength(6);
    expect(api.cards()).toHaveLength(4);
  });

  it('paints one dot per snap page below the window threshold', () => {
    const deck = homeDeck();
    const nav = make('ig-dots');
    const api = load(deck, nav);
    const list = api.cards();
    api.paint(list, 1);
    expect(nav.getAttribute('data-ig-count')).toBe('4');
    expect(nav.classList.contains('ig-dots-window')).toBe(false);
    expect(nav.children).toHaveLength(4);
    expect(nav.children.filter((dot) => dot.classList.contains('on')).map((dot) => dot.getAttribute('data-i'))).toEqual(['1']);
  });

  it('windows the dots when there are 12 or more snap pages', () => {
    const deck = make('ig-deck', Array.from({ length: 12 }, (_, index) => make(`ig-card c${index}`)));
    const nav = make('ig-dots');
    const api = load(deck, nav);
    expect(api.dotWindow(12, 0)).toMatchObject({ start: 0, end: 7, n: 12, windowed: true });
    expect(api.dotWindow(12, 11)).toMatchObject({ start: 5, end: 12, windowed: true });
    expect(api.dotWindow(11, 4).windowed).toBe(false);
    api.paint(api.cards(), 11);
    expect(nav.getAttribute('data-ig-count')).toBe('12');
    expect(nav.classList.contains('ig-dots-window')).toBe(true);
    expect(nav.children).toHaveLength(7);
    expect(nav.children.map((dot) => dot.getAttribute('data-i'))).toEqual(['5', '6', '7', '8', '9', '10', '11']);
    expect(nav.children.filter((dot) => dot.classList.contains('on')).map((dot) => dot.getAttribute('data-i'))).toEqual(['11']);
    expect(nav.children[0]?.classList.contains('edge')).toBe(true);
    expect(nav.children[6]?.classList.contains('edge')).toBe(false);
  });

  it('windows a short column that would overflow the deck', () => {
    const deck = make('ig-deck', Array.from({ length: 8 }, (_, index) => make(`ig-card c${index}`)));
    deck.clientHeight = 80;
    const nav = make('ig-dots');
    const api = load(deck, nav);
    api.paint(api.cards(), 3);
    expect(nav.classList.contains('ig-dots-window')).toBe(true);
    expect(nav.children).toHaveLength(7);
    expect(nav.getAttribute('data-ig-count')).toBe('8');
    expect(nav.children.some((dot) => dot.classList.contains('on') && dot.getAttribute('data-i') === '3')).toBe(true);
  });

  it('keeps the 100% snap contract and the de-emphasized indicator styles', () => {
    const app = readFileSync('src/App.css', 'utf8');
    const ig = app.slice(app.indexOf('T4 always-snap'));
    expect(ig).toContain('flex: 0 0 100%');
    expect(ig).toContain('scroll-snap-stop: always');
    expect(ig).toContain('height: 100%');
    expect(ig).not.toContain('86%');
    expect(ig).toContain('scrollbar-width: none');
    expect(ig).toContain('.ig-deck::-webkit-scrollbar { width: 0; height: 0; display: none; }');
    expect(ig).toContain('word-break: normal');
    expect(ig).not.toContain('word-break: break-all');
  });
});

function closeNested(deck: Fake): Fake {
  const close = deck.children.find((child) => child.classList.contains('ig-card-close'));
  if (!close) throw new Error('missing close card');
  const sheet = close.children[0];
  if (!sheet) throw new Error('missing sheet');
  return sheet;
}
