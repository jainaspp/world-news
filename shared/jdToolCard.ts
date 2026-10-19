/**
 * Footer tool cards.
 * The seven 2026-10-17 reel cards stay in JD_TOOL_CARDS.
 * Same-topic soft-bridge pairs live in softBridgePairs.ts so weekly ops
 * can append a row without forking the renderer.
 * UTM follows COMPANION-TRACKING-SPEC Concept B (worldnews / referral / toolcard).
 */

import { SOFT_BRIDGE_PAIRS, type SoftBridgePair } from './softBridgePairs.js';

export type { SoftBridgePair };
export { SOFT_BRIDGE_PAIRS };

const JD_REEL = 'https://jainaspp.github.io/jd-tech-landing/reels/';

export interface JdToolCard {
  /** Explainer key under /explainer/<key>/. */
  key: string;
  /** JD Tech reel slug. Also the utm_term. */
  slug: string;
  cta: string;
}

export const JD_TOOL_CARDS: readonly JdToolCard[] = [
  {
    key: '2026-10-17-adobe-firefly-ai-assistant-22eb3283823e',
    slug: 'adobe-express-insert-object',
    cta: '唔使等 Firefly？3 步用 Adobe Express 幫產品相加配件',
  },
  {
    key: '2026-10-17-adobe-firefly-audio-studio-396ca03f03bc',
    slug: 'notebooklm-pdf-podcast',
    cta: '厚 PDF／長料想聽重點？NotebookLM 3 步變 Podcast 式摘要',
  },
  {
    key: '2026-10-17-openai-teens-college-planner-c9294bc79b28',
    slug: 'chatgpt-custom-instructions',
    cta: '想 ChatGPT 跟你規則自動排優先？自訂指令 3 步設定',
  },
  {
    key: '2026-10-17-nvidia-nemotron-speech-skills-asr-ed30994dfcf2',
    slug: 'notta-minutes',
    cta: '開會錄音即變紀要：Notta 3 步落地',
  },
  {
    key: '2026-10-17-kiro-kimi-k3-6158c7fd4cf1',
    slug: 'free-ai-division',
    cta: '唔知寫嘢／長文／查料揀邊個免費 AI？3 分工對照即用',
  },
  {
    key: '2026-10-17-huggingface-llama-windows-0d4a780afe2e',
    slug: 'microllm-browser-chat',
    cta: '想喺瀏覽器即試本地細模型傾偈？MicroLLM 3 步上手',
  },
  {
    key: '2026-10-17-bedrock-agentcore-new-features-e0e39b1126ba',
    slug: 'claude-rewrite',
    cta: '長文亂？先用 AI 改稿 3 步改到清晰再談 Agent',
  },
];

const BY_KEY = new Map(JD_TOOL_CARDS.map((card) => [card.key, card]));
/** Later pair wins when two rows share an explainer key. One page, one card. */
const BRIDGE_BY_KEY = new Map(SOFT_BRIDGE_PAIRS.map((pair) => [pair.explainerKey, pair]));

function conceptB(term: string): URLSearchParams {
  return new URLSearchParams({
    utm_source: 'worldnews',
    utm_medium: 'referral',
    utm_campaign: 'toolcard',
    utm_content: 'card-footer',
    utm_term: term,
  });
}

export function jdToolHref(slug: string): string {
  return `${JD_REEL}${slug}/?${conceptB(slug).toString()}`;
}

function parseJdUrl(jdUrl: string): URL | null {
  try {
    return new URL(jdUrl);
  } catch {
    return null;
  }
}

/** Empty when every jdUrl parses. A bad jdUrl is `${slug}:jdUrl` and is never thrown. */
export function softBridgeIssues(pairs: readonly SoftBridgePair[] = SOFT_BRIDGE_PAIRS): string[] {
  const issues: string[] = [];
  for (const pair of pairs) {
    if (!parseJdUrl(pair.jdUrl)) issues.push(`${pair.slug}:jdUrl`);
  }
  return issues;
}

/** Tool or reel URL for one soft-bridge pair. Query is Concept B.
 * A malformed jdUrl returns '' so server render does not throw. */
export function softBridgeHref(pair: SoftBridgePair): string {
  try {
    if (softBridgeIssues([pair]).length > 0) return '';
    const url = new URL(pair.jdUrl);
    const params = conceptB(pair.utmTerm);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    return '';
  }
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function cardHtml(cta: string, href: string, disclosure = ''): string {
  const note = disclosure ? `<p class="jd-tool-note">${esc(disclosure)}</p>` : '';
  return `<aside class="jd-tool-card" aria-label="教學：JD Tech"><p class="jd-tool-label">教學：JD Tech</p><a class="jd-tool-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(cta)}</a>${note}</aside>`;
}

/** One compact card, or empty when this explainer is not in either map. */
export function jdToolCardMarkup(key: string): string {
  const pair = BRIDGE_BY_KEY.get(key);
  if (pair) {
    const href = softBridgeHref(pair);
    if (!href) return '';
    return cardHtml(pair.cta, href, pair.disclosure);
  }
  const card = BY_KEY.get(key);
  if (!card) return '';
  return cardHtml(card.cta, jdToolHref(card.slug));
}
