import { bestImage } from './media.js';
import type { TopicConfig, TopicPicture } from './topicPack.js';
import type { NewsItem } from './types.js';

/**
 * Standing pictures for topic explainers whose cited pages do not include a free photo.
 * Hong Kong government news photos need prior approval before they can be shown on another
 * site, so these are self-hosted copies of freely licensed photographs.
 * 樓市 stays out: it is a headline list, not an explainer.
 */
export const TOPIC_PICTURES: Record<string, TopicPicture> = {
  'policy-address': {
    url: '/topics/policy-address.jpg',
    alt: '香港立法會綜合大樓會議廳',
    credit: 'Tksteven，維基共享資源（CC BY-SA 3.0）',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Legislative_Council_Complex_2011_Chamber.JPG',
  },
  budget: {
    url: '/topics/budget.jpg',
    alt: '2020年2月26日香港財政司司長記者會',
    credit: '獨立媒體，維基共享資源（CC BY-SA 2.0）',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hong_Kong_Financial_Secretary_press_conference_20200226.jpg',
  },
  weather: {
    url: '/topics/weather.jpg',
    alt: '香港天文台總部1883大樓',
    credit: 'Stewart，維基共享資源（CC BY-SA 2.5）',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1883_Building_(Main_Building)_-_TST_Observatory,_HK_-_2007-03-25.jpg',
  },
  'us-china': {
    url: '/topics/us-china.jpg',
    alt: '2025年10月30日美國總統特朗普在韓國釜山與中國國家主席習近平會面',
    credit: '白宮（Daniel Torok），公有領域',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:President_Donald_Trump_greets_Chinese_President_Xi_Jinping_before_a_bilateral_meeting_at_the_Gimhae_International_Airport_terminal_(54889568952).jpg',
  },
  ai: {
    url: '/topics/ai.jpg',
    alt: '國際太空站上的人工智能助手CIMON',
    credit: '美國國家航空航天局，公有領域',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:CIMON,_an_AI-powered_robotic_techology_assistant,_is_pictured_after_being_activated_(iss073e0384104).jpg',
  },
  mideast: {
    url: '/topics/mideast.jpg',
    alt: '耶路撒冷舊城天際線',
    credit: 'Jorge Láscar，維基共享資源（CC BY 2.0）',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Old_Jerusalem_skyline_(10350922156).jpg',
  },
  'us-rates': {
    url: '/topics/us-rates.jpg',
    alt: '美國聯邦儲備局總部大樓',
    credit: '美國聯邦儲備局，公有領域',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Eccles_Building_(26088200676).jpg',
  },
};

const FREE_HOST = /(^|\.)wikimedia\.org$|(^|\.)federalreserve\.gov$|(^|\.)nasa\.gov$/;

export function localTopicImage(url: string): boolean {
  return /^\/topics\/[a-z0-9-]+\.jpg$/.test(url);
}

/** A URL we may put on a topic page: our own file, or a free host. News CDNs are not. */
export function imageAllowed(url: string): boolean {
  if (localTopicImage(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'world-news.xyz' && localTopicImage(parsed.pathname)) return true;
    return FREE_HOST.test(host);
  } catch {
    return false;
  }
}

function clean(value: string, max: number): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validPicture(picture: TopicPicture | null | undefined): picture is TopicPicture {
  if (!picture || typeof picture.url !== 'string' || typeof picture.alt !== 'string') return false;
  if (typeof picture.credit !== 'string' || typeof picture.sourceUrl !== 'string') return false;
  const alt = clean(picture.alt, 120);
  const credit = clean(picture.credit, 80);
  if (!alt || !credit || !imageAllowed(picture.url)) return false;
  try {
    const source = new URL(picture.sourceUrl);
    return source.protocol === 'https:' || source.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

/** A free image already attached to one of this run's sources. Copyrighted news photos are skipped. */
export function pictureFromItems(items: NewsItem[], topic: { title: string }): TopicPicture | null {
  const usable = items.filter((item) => Boolean(item.image && item.link && item.source && imageAllowed(item.image)));
  const url = bestImage(usable);
  if (!url) return null;
  const item = usable.find((row) => row.image === url);
  if (!item) return null;
  const alt = hasChinese(item.title) ? clean(item.title, 80) : clean(`${topic.title}相關圖片`, 80);
  const picture: TopicPicture = {
    url,
    alt,
    credit: clean(item.source, 40),
    sourceUrl: item.link,
  };
  return validPicture(picture) ? picture : null;
}

/**
 * Source photo first, then the picture already stored on the pack, then the standing slot.
 * Null means this explainer must not be published yet.
 */
export function resolveTopicPicture(
  topic: TopicConfig,
  items: NewsItem[],
  stored?: TopicPicture | null,
): TopicPicture | null {
  return pictureFromItems(items, topic)
    ?? (stored && validPicture(stored) ? stored : null)
    ?? (validPicture(TOPIC_PICTURES[topic.slug]) ? TOPIC_PICTURES[topic.slug] : null);
}

/** What the page shows. A pack saved before pictures existed still gets its standing slot. */
export function pictureForTopic(slug: string, pack: { picture?: TopicPicture } | null | undefined): TopicPicture | null {
  if (pack?.picture && validPicture(pack.picture)) return pack.picture;
  const standing = TOPIC_PICTURES[slug];
  return validPicture(standing) ? standing : null;
}

function plainMeta(value: string | undefined): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function freeLicence(name: string): boolean {
  const text = name.toLowerCase();
  if (!text || /noncommercial|by-nc|by-nd/.test(text)) return false;
  return /public domain|^pd$|^cc0|^cc by$|^cc by |^cc by-sa/.test(text);
}

function diagramTitle(title: string): boolean {
  return /\b(map|diagram|chart|svg|schematic|icon|logo)\b/i.test(title);
}

interface CommonsInfo {
  thumburl?: string;
  url?: string;
  mime?: string;
  size?: number;
  extmetadata?: Record<string, { value?: string }>;
}

interface CommonsPage {
  title?: string;
  index?: number;
  imageinfo?: CommonsInfo[];
}

/** Pick one freely licensed Commons photograph. A diagram is used only when no photo qualifies. */
export function pictureFromCommons(payload: unknown, topicTitle: string): TopicPicture | null {
  const pages = (payload as { query?: { pages?: Record<string, CommonsPage> } })?.query?.pages;
  if (!pages) return null;
  const ordered = Object.values(pages).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const photos: TopicPicture[] = [];
  const diagrams: TopicPicture[] = [];
  for (const page of ordered) {
    const title = page.title || '';
    if (!title.startsWith('File:')) continue;
    const info = page.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || '')) continue;
    if (typeof info.size === 'number' && info.size < 15_000) continue;
    const licence = plainMeta(info.extmetadata?.LicenseShortName?.value);
    if (!freeLicence(licence)) continue;
    const rawUrl = info.thumburl || info.url || '';
    let url = '';
    try {
      const parsed = new URL(rawUrl);
      parsed.search = '';
      url = parsed.toString();
    } catch {
      continue;
    }
    if (!imageAllowed(url)) continue;
    const artist = plainMeta(info.extmetadata?.Artist?.value).slice(0, 36) || '維基共享資源';
    const description = plainMeta(info.extmetadata?.ImageDescription?.value);
    const alt = hasChinese(description) ? clean(description, 80) : clean(`與${topicTitle}相關的圖片`, 80);
    const picture: TopicPicture = {
      url,
      alt,
      credit: clean(`${artist}，維基共享資源（${licence.slice(0, 24)}）`, 80),
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/gi, ':')}`,
    };
    if (!validPicture(picture)) continue;
    (diagramTitle(title) ? diagrams : photos).push(picture);
  }
  return photos[0] ?? diagrams[0] ?? null;
}

/** Look up a free photograph when the sources and the standing slot have none. */
export async function findFreeTopicPicture(topicTitle: string, fetchImpl: typeof fetch = fetch): Promise<TopicPicture | null> {
  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  endpoint.searchParams.set('action', 'query');
  endpoint.searchParams.set('format', 'json');
  endpoint.searchParams.set('generator', 'search');
  endpoint.searchParams.set('gsrsearch', `${topicTitle} filetype:bitmap`);
  endpoint.searchParams.set('gsrnamespace', '6');
  endpoint.searchParams.set('gsrlimit', '8');
  endpoint.searchParams.set('prop', 'imageinfo');
  endpoint.searchParams.set('iiprop', 'url|mime|size|extmetadata');
  endpoint.searchParams.set('iiurlwidth', '960');
  const response = await fetchImpl(endpoint.toString(), {
    headers: { 'user-agent': 'world-news.xyz topic image (editorial@world-news.xyz)', accept: 'application/json' },
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) return null;
  return pictureFromCommons(await response.json(), topicTitle);
}
