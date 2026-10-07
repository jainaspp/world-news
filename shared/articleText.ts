/** Characters of article text kept as model input. The page itself is not republished. */
export const ARTICLE_CHARS = 1_200;

/** Source URLs read for one cluster, inside the Workers subrequest budget. */
export const FETCH_PER_CLUSTER = 4;

export const FETCH_TIMEOUT_MS = 4_000;

export const HTML_CAP = 200_000;

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

function regions(html: string): string[] {
  const found: string[] = [];
  const named = html.match(/<(div|section|article)\b[^>]*class=["'][^"']*(?:itemFullText|article-body|articleBody|story-body|article__body)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i);
  if (named?.[2] && named[2].length > 80) found.push(named[2]);
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (article?.[1] && article[1].length > 200) found.push(article[1]);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main?.[1] && main[1].length > 200) found.push(main[1]);
  return found.length ? found : [html];
}

function stripChrome(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
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
    if (text.length < 40) continue;
    paragraphs.push(text);
    running += text.length + 1;
    if (running >= cap) break;
  }
  // Some desks (RTHK, Now) put the story in a div and break lines with <br>, not <p>.
  if (paragraphs.join('').length < 200) {
    const plain = decode(body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|h\d|li|p)>/gi, '\n'));
    for (const line of plain.split(/\n+/)) {
      const text = line.trim();
      if (text.length < 40 || paragraphs.includes(text)) continue;
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
 * og:description plus the main paragraphs, trimmed to about 1,200 characters.
 * Uses the longest of the article body, `<article>`, or `<main>`, and drops nav, footer, and aside.
 */
export function extractArticle(html: string, cap = ARTICLE_CHARS): string {
  const summary = meta(html, 'property', 'og:description')
    || meta(html, 'name', 'description')
    || meta(html, 'name', 'twitter:description');
  let best = '';
  for (const region of regions(html)) {
    const text = textFromRegion(region, summary, cap);
    if (text.length > best.length) best = text;
    if (best.length >= cap) break;
  }
  return best;
}
