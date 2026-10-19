import { esc } from '../contentPage.js';
import { COSMOS_STAGES, cosmoCoverImg } from './cosmos.js';
import { EARTH_STAGES, earthCoverImg } from './earth.js';

const CIV = '/static/civilization';

export interface SpineLink {
  href: string;
  label: string;
}

export interface SpineBoard {
  cardClass: string;
  seal: string;
  aria: string;
  era: string;
  title: string;
  meaning: string;
  links: SpineLink[];
  /** Cosmos and earth covers carry data-stage. Origins does not. */
  dataStage?: boolean;
  cover: () => string;
}

/** One axis stop. A new node is a new object. Set `board` to also show a deep-time card. */
export interface SpineNode {
  id: string;
  label: string;
  year: string;
  href: string;
  now?: boolean;
  board?: SpineBoard;
}

function originsCover(): string {
  return `<img src="${CIV}/civ-layer-origins-640w.webp" srcset="${CIV}/civ-layer-origins-400w.webp 400w, ${CIV}/civ-layer-origins-640w.webp 640w" sizes="(max-width: 600px) 100vw, 360px" width="640" height="480" alt="人類起源：深時間溫和示意" loading="lazy" decoding="async" onerror="this.hidden=true" />`;
}

/**
 * Axis order is this list. Deep-time cards are the same objects that set `board`,
 * so inserting a node between cosmos and origins is one entry, not a new template.
 */
export const SPINE: SpineNode[] = [
  {
    id: 'cosmos',
    label: '宇宙',
    year: '~138億',
    href: '/civilization/cosmos/',
    board: {
      cardClass: 'cosmo-card',
      seal: '宇宙',
      aria: '宇宙長河',
      era: '宇宙長河',
      title: '宇宙長河・深時間',
      meaning: '約一百三十八億年前至約七百萬年前。能量、物質、信息與時間。',
      links: [{ href: '/civilization/cosmos/', label: '閱讀宇宙長河' }],
      dataStage: true,
      cover: () => {
        const first = COSMOS_STAGES[0];
        return first ? cosmoCoverImg(first, true) : '';
      },
    },
  },
  {
    id: 'earth',
    label: '地球',
    year: '~40億',
    href: '/civilization/earth/',
    board: {
      cardClass: 'earth-card',
      seal: '地球',
      aria: '地球生命',
      era: '地球生命',
      title: '地球生命・深時間',
      meaning: '約四十億年前的早期生命，至約七百萬年前。侏羅紀等中生代在此展開。',
      links: [
        { href: '/civilization/earth/', label: '閱讀地球生命' },
        { href: '/civilization/earth/#jurassic', label: '侏羅紀' },
      ],
      dataStage: true,
      cover: () => {
        const first = EARTH_STAGES[0];
        return first ? earthCoverImg(first, false) : '';
      },
    },
  },
  {
    id: 'origins',
    label: '起源',
    year: '~300ka',
    href: '/civilization/origins/',
    board: {
      cardClass: '',
      seal: '起源',
      aria: '人類起源',
      era: '人類起源',
      title: '人類起源',
      meaning: '約七百萬年前人族至智人。宇宙長河在此交接。',
      links: [{ href: '/civilization/origins/', label: '閱讀人類起源' }],
      cover: originsCover,
    },
  },
  {
    id: 'tech',
    label: '技術',
    year: '發現',
    href: '/civilization/tech/',
  },
  {
    id: 'city',
    label: '城市',
    year: '基建',
    href: '/civilization/city/',
  },
  {
    id: 'future',
    label: '未來',
    year: '展望',
    href: '/civilization/#future',
  },
  {
    id: 'today',
    label: '今天',
    year: '切片',
    href: '#slice',
    now: true,
  },
];

export function renderSpineAxis(todayHref: string): string {
  const items = SPINE.map((node) => {
    const href = node.now ? todayHref : node.href;
    const cls = node.now ? 'axis-node axis-now' : 'axis-node';
    const dot = node.now ? 'dot now' : 'dot';
    return `<li><a class="${cls}" href="${esc(href)}"><span class="${dot}"></span><span class="lab">${esc(node.label)}</span><span class="yr">${esc(node.year)}</span></a></li>`;
  }).join('');
  return `<ol class="milestones">${items}</ol>`;
}

function boardCard(node: SpineNode): string {
  const board = node.board;
  if (!board) return '';
  const cardClass = board.cardClass ? `deep-time-card ${board.cardClass}` : 'deep-time-card';
  const links = board.links.map((link) => `<a href="${esc(link.href)}">${esc(link.label)}</a>`).join('');
  const stageAttr = board.dataStage ? ' data-stage="1"' : '';
  return `<article class="${cardClass}">
        <a class="stage-cover"${stageAttr} href="${esc(node.href)}" aria-label="${esc(board.aria)}">${board.cover()}<span class="stage-seal">${esc(board.seal)}</span></a>
        <div class="stage-body">
          <p class="era">${esc(board.era)}</p>
          <h3><a href="${esc(node.href)}">${esc(board.title)}</a></h3>
          <p class="stage-meaning">${esc(board.meaning)}</p>
          <p class="stage-links">${links}</p>
        </div>
      </article>`;
}

export function renderDeepTimeBoardFromSpine(): string {
  const cards = SPINE.filter((node) => node.board).map(boardCard).join('');
  return `<section class="deep-time" aria-label="深時間">
    <div class="chronicle-board-head">
      <h2>深時間</h2>
    </div>
    <p class="chronicle-board-note">宇宙長河接到地球生命，再交接入類起源。約七百萬年前，演化進入人族階段。下方編年仍是文明十階段。</p>
    <div class="deep-time-grid">
      ${cards}
    </div>
  </section>`;
}
