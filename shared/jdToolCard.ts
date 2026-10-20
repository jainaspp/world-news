/**
 * Footer tool cards.
 * The seven 2026-10-17 reel cards stay in JD_TOOL_CARDS.
 * Same-topic soft-bridge pairs live in softBridgePairs.ts so weekly ops
 * can append a row without forking the renderer.
 * UTM follows COMPANION-TRACKING-SPEC Concept B (worldnews / referral / toolcard).
 * A pair may set follow for one 90-second card. Other pairs stay a single link.
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

/** Empty when every jdUrl parses. A bad primary is `${slug}:jdUrl`.
 * A bad 90-second secondary is `${slug}:secondaryJdUrl`. Neither is thrown. */
export function softBridgeIssues(pairs: readonly SoftBridgePair[] = SOFT_BRIDGE_PAIRS): string[] {
  const issues: string[] = [];
  for (const pair of pairs) {
    if (!parseJdUrl(pair.jdUrl)) issues.push(`${pair.slug}:jdUrl`);
    const secondary = pair.follow?.secondary.jdUrl;
    if (secondary != null && !parseJdUrl(secondary)) issues.push(`${pair.slug}:secondaryJdUrl`);
  }
  return issues;
}

/** Concept B URL, or '' when jdUrl will not parse. Never throws. */
function conceptBHref(jdUrl: string, utmTerm: string): string {
  try {
    const url = parseJdUrl(jdUrl);
    if (!url) return '';
    const params = conceptB(utmTerm);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    return '';
  }
}

/** Primary tool or reel URL for one soft-bridge pair. Query is Concept B.
 * A malformed jdUrl returns '' so server render does not throw.
 * A bad secondary link does not blank this primary URL. */
export function softBridgeHref(pair: SoftBridgePair): string {
  return conceptBHref(pair.jdUrl, pair.utmTerm);
}

/** Second link on a 90-second card, or '' when the pair has none or the URL will not parse. */
export function softBridgeSecondaryHref(pair: SoftBridgePair): string {
  const secondary = pair.follow?.secondary;
  if (!secondary) return '';
  return conceptBHref(secondary.jdUrl, secondary.utmTerm);
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function linkHtml(label: string, href: string, secondary = false): string {
  const cls = secondary ? 'jd-tool-link jd-tool-link-secondary' : 'jd-tool-link';
  return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function cardHtml(cta: string, href: string, disclosure = ''): string {
  const note = disclosure ? `<p class="jd-tool-note">${esc(disclosure)}</p>` : '';
  return `<aside class="jd-tool-card" aria-label="教學：JD Tech"><p class="jd-tool-label">教學：JD Tech</p>${linkHtml(cta, href)}${note}</aside>`;
}

function block(className: string, text: string): string {
  const value = text.trim();
  return value ? `<p class="${className}">${esc(value)}</p>` : '';
}

/** 90-second card: receipt, heading, steps, primary link, optional reel link. */
function followCardHtml(pair: SoftBridgePair, href: string): string {
  const follow = pair.follow;
  if (!follow) return cardHtml(pair.cta, href, pair.disclosure);
  const steps = follow.steps.map((step) => step.trim()).filter(Boolean);
  const list = steps.length ? `<ol class="jd-tool-steps">${steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>` : '';
  const secondaryHref = softBridgeSecondaryHref(pair);
  const secondary = follow.secondary && secondaryHref ? linkHtml(follow.secondary.label, secondaryHref, true) : '';
  const note = pair.disclosure ? `<p class="jd-tool-note">${esc(pair.disclosure)}</p>` : '';
  return `<aside class="jd-tool-card" aria-label="教學：JD Tech"><p class="jd-tool-label">教學：JD Tech</p>${block('jd-tool-receipt', follow.receipt)}${block('jd-tool-title', follow.title)}${list}<p class="jd-tool-actions">${linkHtml(pair.cta, href)}${secondary}</p>${note}</aside>`;
}

/** One soft-bridge card. Empty when the primary URL will not parse. */
export function softBridgeCardMarkup(pair: SoftBridgePair): string {
  const href = softBridgeHref(pair);
  if (!href) return '';
  return pair.follow ? followCardHtml(pair, href) : cardHtml(pair.cta, href, pair.disclosure);
}

/** One compact card, or empty when this explainer is not in either map. */
export function jdToolCardMarkup(key: string): string {
  const pair = BRIDGE_BY_KEY.get(key);
  if (pair) return softBridgeCardMarkup(pair);
  const card = BY_KEY.get(key);
  if (!card) return '';
  return cardHtml(card.cta, jdToolHref(card.slug));
}
