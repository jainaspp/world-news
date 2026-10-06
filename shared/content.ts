import { stableId } from './rss.js';
import type { StoryCluster } from './trending';

/** Cheap Qwen MoE on Workers AI. Traditional Chinese is strong, and the neuron rate stays inside the free 10k/day. */
export const AI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';

/** Cloudflare list price, neurons per 1,000,000 tokens. */
export const MODEL_NEURONS = { inputPerMillion: 4625, outputPerMillion: 30475 };

export const DAILY_AI_CALLS = 12;

export interface SourceRef {
  title: string;
  url: string;
  source: string;
  excerpt?: string;
}

export interface DigestBlock {
  title: string;
  sentences: string[];
  sources: SourceRef[];
}

export interface ContentDoc {
  kind: 'digest' | 'analysis' | 'weekly';
  key: string;
  title: string;
  description: string;
  blocks: DigestBlock[];
  publishedAt: string;
  hkt: string;
  mode: 'ai' | 'sources';
  model?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function hktParts(now = new Date()): { date: string; hour: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat('en-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: parts.weekday || 'Sun',
  };
}

export function slotId(now = new Date()): string {
  const { date, hour } = hktParts(now);
  return `${date}-${hour < 12 ? 'am' : 'pm'}`;
}

export function recentSlots(now = new Date()): string[] {
  return [slotId(now), slotId(new Date(now.getTime() - 12 * 60 * 60 * 1000))];
}

export function weeklyEdition(now = new Date()): string {
  const { date, weekday } = hktParts(now);
  const index = Math.max(0, WEEKDAYS.indexOf(weekday));
  const [year, month, day] = date.split('-').map(Number);
  const sunday = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1) - index * 86400000);
  return sunday.toISOString().slice(0, 10);
}

export function formatHkt(iso: string): string {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return '';
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(time);
}

export function analysisSlug(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return `${words || 'story'}-${stableId(title)}`;
}

export function isGenerateAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return header === secret;
}

export function sourcesFromCluster(cluster: StoryCluster): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const item of cluster.items) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    sources.push({
      title: item.title,
      url: item.link,
      source: item.source,
      excerpt: item.excerpt?.slice(0, 160),
    });
    if (sources.length >= 6) break;
  }
  return sources;
}

export function draftSentences(sources: SourceRef[]): string[] {
  const names = [...new Set(sources.map((source) => source.source))].slice(0, 4).join('、');
  const lead = sources[0]?.title ?? '';
  const rest = sources.slice(1, 3).map((source) => source.title).filter(Boolean).join('；');
  return [
    `${names}報道：${lead}`,
    rest ? `相關標題還有：${rest}。` : '其他來源未有另列標題。',
    '詳情只以來源原文為準。來源沒有寫出的數字、引言同背景，這裡都不補充。',
  ];
}

export function digestFromClusters(clusters: StoryCluster[], key: string, now = new Date()): ContentDoc {
  const blocks = clusters.slice(0, 10).filter((cluster) => cluster.count >= 2).map((cluster) => {
    const sources = sourcesFromCluster(cluster);
    return { title: cluster.lead.title, sentences: draftSentences(sources), sources };
  });
  return {
    kind: 'digest',
    key,
    title: `世界頭條精選 ${key}`,
    description: blocks[0] ? `綜合多個來源：${blocks[0].title}` : '這一期暫時沒有足夠來源。',
    blocks,
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function analysisFromCluster(cluster: StoryCluster, now = new Date()): ContentDoc {
  const sources = sourcesFromCluster(cluster);
  const slug = analysisSlug(cluster.lead.title);
  const lines = draftSentences(sources);
  return {
    kind: 'analysis',
    key: slug,
    title: cluster.lead.title,
    description: `${cluster.count} 個來源報道：${cluster.lead.title}`,
    blocks: [
      { title: '背景', sentences: [lines[0] || '來源未有提及背景。'], sources },
      { title: '各方說法', sentences: [lines[1] || '來源未有提及各方說法。'], sources: [] },
      { title: '與香港的關係', sentences: ['對香港讀者，目前只看到各來源的標題，未有足夠描述可以判斷對本地的影響。'], sources: [] },
    ],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function weeklyFromHeadlines(tech: SourceRef[], business: SourceRef[], key: string, now = new Date()): ContentDoc {
  const block = (title: string, sources: SourceRef[]): DigestBlock => ({
    title,
    sentences: sources.length ? draftSentences(sources) : ['這一週未有足夠標題。', '來源未有提及更多。', '有新標題後會再更新。'],
    sources,
  });
  return {
    kind: 'weekly',
    key,
    title: `一週回顧 ${key}`,
    description: '一週科技同一週財經，只根據已收錄的標題。',
    blocks: [block('一週科技', tech.slice(0, 8)), block('一週財經', business.slice(0, 8))],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function promptFor(doc: ContentDoc): { system: string; user: string; maxTokens: number } {
  const system = [
    '你是世界頭條的編輯。用香港書面語，可以有輕微本地語氣，不要堆砌俚語。',
    '只可使用提供的標題同短描述。禁止添加來源沒有寫的事實、數字、引言、人名、地點或因果。',
    '不肯定就寫「來源未有提及」。不要用 Markdown。回覆必須是 JSON。',
  ].join('');
  const payload = doc.blocks.map((block, index) => ({
    n: index + 1,
    title: block.title,
    sources: block.sources.map((source) => ({
      source: source.source,
      title: source.title,
      excerpt: source.excerpt || '',
    })),
  }));
  const shape = doc.kind === 'analysis'
    ? '回傳 {"sections":[{"heading":"背景"|"各方說法"|"與香港的關係","text":"..."}]}，三段都要有，每段兩句以內。'
    : doc.kind === 'weekly'
      ? '回傳 {"sections":[{"heading":"一週科技"|"一週財經","text":"..."}]}。每段三至五句，只回顧列出的標題。'
      : '回傳 {"items":[{"n":1,"sentences":["...","...","..."]}]}。每一則剛好三句，綜合至少兩個來源。';
  return {
    system,
    user: `${shape}\n資料：${JSON.stringify(payload)}`,
    maxTokens: doc.kind === 'digest' ? 1400 : 800,
  };
}

export function applyModelText(doc: ContentDoc, raw: string, model = AI_MODEL): ContentDoc | null {
  const fenced = raw.replace(/```json|```/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as { items?: { n?: number; sentences?: unknown }[]; sections?: { heading?: string; text?: string }[] };
  if (doc.kind === 'digest' && Array.isArray(record.items)) {
    const blocks = doc.blocks.map((block, index) => {
      const match = record.items?.find((item) => item.n === index + 1) ?? record.items?.[index];
      const sentences = Array.isArray(match?.sentences) ? match.sentences.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).slice(0, 3) : [];
      if (sentences.length < 3) return block;
      return { ...block, sentences };
    });
    if (blocks.every((block, index) => block.sentences === doc.blocks[index]?.sentences)) return null;
    return { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description };
  }
  if (doc.kind === 'analysis' && Array.isArray(record.sections)) {
    const blocks = record.sections.slice(0, 3).map((section) => ({
      title: String(section.heading || doc.title),
      sentences: String(section.text || '').split(/(?<=。)/).map((line) => line.trim()).filter(Boolean).slice(0, 4),
      sources: doc.blocks[0]?.sources ?? [],
    })).filter((block) => block.sentences.length > 0);
    if (!blocks.length) return null;
    return { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description };
  }
  if (doc.kind === 'weekly' && Array.isArray(record.sections)) {
    const blocks = doc.blocks.map((block) => {
      const section = record.sections?.find((item) => item.heading === block.title);
      const sentences = String(section?.text || '').split(/(?<=。)/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
      return sentences.length ? { ...block, sentences } : block;
    });
    if (blocks.every((block, index) => block === doc.blocks[index])) return null;
    return { ...doc, blocks, mode: 'ai', model, description: blocks[0]?.sentences[0] || doc.description };
  }
  return null;
}

export function textFromAi(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const row = result as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  if (typeof row.response === 'string') return row.response;
  const content = row.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

export function estimateNeurons(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * MODEL_NEURONS.inputPerMillion + (outputTokens / 1_000_000) * MODEL_NEURONS.outputPerMillion;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

export function renderContentPage(doc: ContentDoc, canonical: string, adSlot = '', adClient = 'ca-pub-8392975944327076'): string {
  const description = escapeHtml(doc.description.slice(0, 180));
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: doc.title,
        datePublished: doc.publishedAt,
        inLanguage: 'zh-HK',
        mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: '世界頭條' },
        isBasedOn: doc.blocks.flatMap((block) => block.sources.map((source) => ({
          '@type': 'NewsArticle',
          headline: source.title,
          url: source.url,
        }))),
      },
      {
        '@type': 'Article',
        headline: doc.title,
        datePublished: doc.publishedAt,
        inLanguage: 'zh-HK',
        mainEntityOfPage: canonical,
      },
    ],
  };
  const sourceList = (sources: SourceRef[]) => `<ul>${sources.map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.source)}：${escapeHtml(source.title)}</a></li>`).join('')}</ul>`;
  const sharedSources = doc.kind === 'analysis'
    ? [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()]
    : [];
  const blocks = doc.blocks.map((block) => `
    <section>
      <h2>${escapeHtml(block.title)}</h2>
      ${block.sentences.map((sentence) => `<p>${escapeHtml(sentence)}</p>`).join('')}
      ${doc.kind === 'analysis' ? '' : sourceList(block.sources)}
    </section>`).join('') + (sharedSources.length ? `<section><h2>來源</h2>${sourceList(sharedSources)}</section>` : '');
  const note = doc.mode === 'ai'
    ? ''
    : '<p class="note">模型暫時未能完成。這一版只列出來源標題，沒有加寫情節。</p>';
  const ad = adSlot
    ? `<div class="ad" aria-label="廣告"><ins class="adsbygoogle" data-ad-client="${escapeHtml(adClient)}" data-ad-slot="${escapeHtml(adSlot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`
    : '';
  return `<!doctype html>
<html lang="zh-HK">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)} — 世界頭條</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(doc.title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>
  <style>
    body { margin: 0; font-family: "Noto Sans TC", sans-serif; background: #f4f6f8; color: #142033; }
    main { width: min(760px, calc(100% - 32px)); margin: 24px auto 48px; }
    a { color: #1d4f91; }
    article { background: #fff; border: 1px solid #d5dde6; border-radius: 16px; padding: 20px; }
    h1, h2 { font-family: "Noto Serif TC", serif; line-height: 1.35; }
    .badge { display: inline-block; background: #1d4f91; color: #fff; border-radius: 999px; padding: 2px 10px; font-size: 0.85rem; }
    .meta, .note, li { color: #3d4c5f; }
    .nav { display: flex; gap: 12px; margin-bottom: 12px; }
    .ad { min-height: 90px; margin: 16px 0; }
  </style>
</head>
<body>
  <main>
    <nav class="nav"><a href="/">世界頭條</a><a href="/digest/">日報</a><a href="/weekly/">週報</a></nav>
    <article>
      <p class="badge">AI 整合</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="meta">刊登時間（香港時間）：${escapeHtml(doc.hkt || formatHkt(doc.publishedAt))}</p>
      ${note}
      ${ad}
      ${blocks || '<p>這一期暫時沒有足夠的多方來源。</p>'}
    </article>
  </main>
</body>
</html>`;
}
