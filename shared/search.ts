/** Successful web_search calls kept on one explainer or briefing. */
export const MAX_SEARCH_TURNS = 3;

/** Citation URLs written into the article. The bottom list can also keep cluster links, up to SOURCE_LIST_CAP. */
export const MAX_RESEARCH_SOURCES = 8;

export const SOURCE_LIST_CAP = 10;

/**
 * Social and reference hosts. allowed_domains on the Responses API stops at five,
 * which cannot cover both wires and Hong Kong papers, so these are excluded and the
 * prompt asks for news outlets.
 */
export const EXCLUDED_DOMAINS = ['reddit.com', 'facebook.com', 'tiktok.com', 'instagram.com', 'youtube.com'];

const BLOCKED_HOSTS = [
  ...EXCLUDED_DOMAINS,
  'x.com',
  'twitter.com',
  'threads.net',
  'weibo.com',
  'linkedin.com',
  'pinterest.com',
  'quora.com',
  'wikipedia.org',
  'google.com',
  'bing.com',
  'yahoo.com',
  'baidu.com',
];

export interface ResearchUsage {
  input: number;
  output: number;
  searchCalls: number;
}

/** Responses API body for one researched article. Inline [[n]](url) links stay out of the JSON. */
export function researchBody(model: string, system: string, user: string, maxTokens: number): Record<string, unknown> {
  return {
    model,
    store: false,
    max_turns: MAX_SEARCH_TURNS,
    max_output_tokens: maxTokens,
    include: ['no_inline_citations'],
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user.replace(/ \/no_think$/, '') },
    ],
    tools: [{
      type: 'web_search',
      filters: { excluded_domains: EXCLUDED_DOMAINS },
    }],
  };
}

function countOf(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Billed web searches. Prefers usage.server_side_tool_usage_details.web_search_calls,
 * then SERVER_SIDE_TOOL_WEB_SEARCH. Failed attempts are not in those fields.
 */
export function webSearchCalls(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0;
  const root = payload as Record<string, unknown>;
  const usage = root.usage && typeof root.usage === 'object' ? root.usage as Record<string, unknown> : null;
  const details = usage?.server_side_tool_usage_details;
  if (details && typeof details === 'object') {
    const calls = countOf((details as Record<string, unknown>).web_search_calls);
    if (calls != null) return calls;
  }
  const maps = [usage?.server_side_tool_usage, root.server_side_tool_usage];
  for (const map of maps) {
    if (!map || typeof map !== 'object') continue;
    const calls = countOf((map as Record<string, unknown>).SERVER_SIDE_TOOL_WEB_SEARCH);
    if (calls != null) return calls;
  }
  const output = root.output;
  if (!Array.isArray(output)) return 0;
  return output.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { type?: string; status?: string };
    if (row.type !== 'web_search_call') return false;
    return row.status !== 'failed' && row.status !== 'error';
  }).length;
}

function pushUrl(found: string[], value: unknown): void {
  if (typeof value !== 'string') return;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url) || found.includes(url)) return;
  found.push(url);
}

/** URLs the response lists in citations and output annotations. */
export function citationUrls(payload: unknown): string[] {
  const found: string[] = [];
  if (!payload || typeof payload !== 'object') return found;
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.citations)) {
    for (const url of root.citations) pushUrl(found, url);
  }
  if (!Array.isArray(root.output)) return found;
  for (const item of root.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const annotations = (block as { annotations?: unknown }).annotations;
      if (!Array.isArray(annotations)) continue;
      for (const note of annotations) {
        if (note && typeof note === 'object') pushUrl(found, (note as { url?: unknown }).url);
      }
    }
  }
  return found;
}

export function reputableNewsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === 'localhost') return false;
    return !BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

export interface ResearchSource {
  title: string;
  url: string;
  source: string;
}

/** Last readable path segment, e.g. /world/nobel-chemistry-prize-2026 → nobel chemistry prize 2026. */
function pathTitle(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      let seg = parts[i]!;
      try { seg = decodeURIComponent(seg); } catch { /* keep raw */ }
      seg = seg.replace(/\.(html?|shtml|php|aspx?)$/i, '').replace(/[-_+]+/g, ' ').trim();
      if (/[a-z\u3400-\u9fff]{3,}/i.test(seg) && !/^[\d\s]+$/.test(seg) && seg.length >= 6) return seg.length > 60 ? `${seg.slice(0, 60)}…` : seg;
    }
  } catch { /* ignore */ }
  return '';
}

/** Citation rows for the source list. The host is the outlet name so we do not invent one. */
export function researchSources(urls: string[], limit = MAX_RESEARCH_SOURCES): ResearchSource[] {
  const sources: ResearchSource[] = [];
  for (const url of urls) {
    if (!reputableNewsUrl(url)) continue;
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    sources.push({ title: pathTitle(url) || host, url, source: host });
    if (sources.length >= limit) break;
  }
  return sources;
}

/** Drop [[n]](url) markers if the API still inlines them. */
export function stripInlineCitations(text: string): string {
  return text.replace(/\[\[\d+\]\]\((https?:\/\/[^)\s]+)\)/g, '');
}
