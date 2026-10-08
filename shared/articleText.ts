/** Characters of article text kept as model input. The page itself is not republished. */
export const ARTICLE_CHARS = 1_200;

/** Longer extract kept for MiniMax desks (flat fee). Grok prompts still slice to ARTICLE_CHARS. */
export const ARTICLE_CHARS_LONG = 2_500;

/** Source URLs read for one cluster, inside the Workers subrequest budget. */
export const FETCH_PER_CLUSTER = 4;

export const FETCH_TIMEOUT_MS = 4_000;

export const HTML_CAP = 200_000;
/** Raw page bytes read before code is stripped; HTML_CAP then applies to the stripped page. */
export const RAW_HTML_CAP = 2_000_000;

/** Below this much extracted text, one article may fall back to web_search. */
export const MATERIAL_FLOOR = 1_500;

/** Parallel page reads. Kept small so a batch stays inside the subrequest cap. */
export const FETCH_CONCURRENCY = 3;

/** KV lifetime for extracted text. The URL is the key, via a short hash. */
export const ARTICLE_TTL_SECONDS = 3 * 24 * 60 * 60;

/**
 * Hosts that answer 401/403 or a paywall shell. Skipping them saves a subrequest.
 * SCMP and 明報 are the ones that showed up on the Hong Kong board.
 */
const PAYWALL_HOSTS = [
  'scmp.com',
  'mingpao.com',
  'mpfinance.com',
  'ft.com',
  'wsj.com',
  'nytimes.com',
  'bloomberg.com',
  'economist.com',
];

export function blockedOutlet(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (!host) return true;
    return PAYWALL_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

export function needsSearch(chars: number): boolean {
  return chars < MATERIAL_FLOOR;
}

function decode(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Inline tags (a drop-cap span, links) sit inside words: remove them without a space.
    .replace(/<\/?(?:span|a|em|strong|b|i|u|abbr|sup|sub)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_all, digits: string) => {
      const code = Number(digits);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_all, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, attr: string, key: string): string {
  const pattern = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const swapped = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  return decode(html.match(pattern)?.[1] || html.match(swapped)?.[1] || '');
}

/** Body containers, opened at their start tag and read forward (a lazy close would stop at the first nested </div>). */
const BODY_OPENERS = [
  /<[a-z]+\b[^>]*itemprop=["']articleBody["'][^>]*>/i,
  /<[a-z]+\b[^>]*class=["'][^"']*(?:itemFullText|article-body|articleBody|ArticleBody-articleBody|story-body|article__body|wysiwyg)[^"']*["'][^>]*>/i,
  /<[a-z]+\b[^>]*data-gu-name=["']body["'][^>]*>/i,
];

function regions(html: string): string[] {
  const found: string[] = [];
  for (const opener of BODY_OPENERS) {
    const match = opener.exec(html);
    if (match) found.push(html.slice(match.index + match[0].length, match.index + match[0].length + 120_000));
  }
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (article?.[1] && article[1].length > 200) found.push(article[1]);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main?.[1] && main[1].length > 200) found.push(main[1]);
  return found.length ? found : [html];
}

/** Script, style, template, svg and noscript blocks, including one left unclosed by a byte cap. */
export function stripCode(html: string): string {
  return html
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*$/i, ' ');
}

/** Leaked CSS or JavaScript, never article text. */
export function looksLikeCode(text: string): boolean {
  return /[{};]\s*[.#@a-z-]+\s*[{:]|@media|@charset|function\s*\(|=>|window\.|document\.|var\s+\w+\s*=/.test(text)
    && (text.match(/[{};]/g)?.length ?? 0) >= 3;
}

/** `articleBody` from JSON-LD (NewsArticle and friends), searched through @graph and arrays. */
export function jsonLdBody(html: string): string {
  let best = '';
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse((match[1] || '').trim());
    } catch {
      continue;
    }
    const stack: unknown[] = [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (Array.isArray(node)) stack.push(...node);
      else if (node && typeof node === 'object') {
        const record = node as Record<string, unknown>;
        if (typeof record.articleBody === 'string' && record.articleBody.length > best.length) best = record.articleBody;
        stack.push(...Object.values(record).filter((value) => value && typeof value === 'object'));
      }
    }
  }
  return decode(best);
}

function stripChrome(html: string): string {
  return stripCode(html)
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ');
}

function textFromRegion(region: string, summary: string, cap: number): string {
  const body = stripChrome(region);
  const paragraphs: string[] = [];
  let running = summary.length;
  for (const match of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decode(match[1] || '');
    if (text.length < 40 || looksLikeCode(text)) continue;
    paragraphs.push(text);
    running += text.length + 1;
    if (running >= cap) break;
  }
  // Some desks (RTHK, Now) put the story in a div and break lines with <br>, not <p>.
  if (paragraphs.join('').length < 200) {
    const plain = decode(body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|h\d|li|p)>/gi, '\n'));
    for (const line of plain.split(/\n+/)) {
      const text = line.trim();
      if (text.length < 40 || paragraphs.includes(text) || looksLikeCode(text)) continue;
      paragraphs.push(text);
      running += text.length + 1;
      if (running >= cap) break;
    }
  }
  const unique: string[] = [];
  for (const part of [summary, ...paragraphs]) {
    if (!part || unique.includes(part)) continue;
    unique.push(part);
  }
  return unique.join(' ').slice(0, cap);
}

/**
 * og:description plus the article text, trimmed to `cap`. JSON-LD articleBody wins when present;
 * otherwise the longest of the itemprop/class body, `<article>` or `<main>`, with script, style,
 * nav, footer and aside dropped first.
 */
export function extractArticle(html: string, cap = ARTICLE_CHARS): string {
  const summary = meta(html, 'property', 'og:description')
    || meta(html, 'name', 'description')
    || meta(html, 'name', 'twitter:description');
  const ld = jsonLdBody(html);
  if (ld.length >= 300 && !looksLikeCode(ld)) {
    return (ld.startsWith(summary.slice(0, 40)) || !summary ? ld : `${summary} ${ld}`).slice(0, cap);
  }
  const page = stripCode(html).slice(0, HTML_CAP);
  let best = '';
  for (const region of regions(page)) {
    const text = textFromRegion(region, summary, cap);
    if (text.length > best.length) best = text;
    if (best.length >= cap) break;
  }
  return best;
}

/** og:title or <title>, without a trailing " | Outlet" / " - Outlet" brand. */
export function extractTitle(html: string): string {
  const raw = meta(html, 'property', 'og:title')
    || meta(html, 'name', 'twitter:title')
    || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const parts = raw.split(/\s+[|\-–—]\s+/);
  const title = parts.length > 1 && (parts[parts.length - 1] || '').length <= 30 ? parts.slice(0, -1).join(' - ') : raw;
  return title.trim().slice(0, 160);
}

/** Whole page body as text (code and chrome dropped), for official pages with no article container. */
export function pageText(html: string, cap: number): string {
  const start = html.search(/<body\b/i);
  const body = start >= 0 ? html.slice(start) : html;
  return decode(stripChrome(body.slice(0, RAW_HTML_CAP))).slice(0, cap);
}

/**
 * Text of a pinned topic source: the article body when it covers most of the page, else the
 * whole page text (policy summaries and budget theme pages are lists, not paragraphs).
 */
export function anchorText(html: string, cap: number): string {
  const article = extractArticle(html, cap);
  const page = pageText(html, cap);
  return article.length >= Math.min(cap, page.length) * 0.6 ? article : page;
}
