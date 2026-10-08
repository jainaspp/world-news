import type { SourceRef } from './content.js';
import { cantoneseLeft, polishProse, preachySentence, proseSane, tidyDisplay } from './prose.js';
import { SOURCE_LIST_CAP } from './search.js';
import type { NewsItem } from './types.js';
import { hasChinese, isMostlyEnglish, toHK } from './zh.js';

/**
 * Evergreen topic packs. Facts are never stored here — only the desk, the match
 * keywords, and the figure groups a model may use when the sources support them.
 */
export interface TopicConfig {
  slug: string;
  title: string;
  /** Index blurb. Describes the column, not a news event. */
  blurb: string;
  desk: 'hk' | 'china' | 'other';
  category: string;
  keywords: readonly string[];
  areas: readonly string[];
  /**
   * Pinned sources (official pages and that day's coverage), fetched on every full build in
   * addition to matched headlines. Text is cached in the Cache API only, never in KV.
   */
  anchors?: readonly TopicAnchor[];
  /** Extra section for anchored packs, e.g. the five-year plan in brief. */
  background?: { label: string; ask: string };
  /**
   * Standing instruction for the model. Not shown on the page.
   * Use it when the column title must not be treated as the current fact.
   */
  note?: string;
  /**
   * Replaces the measure-by-measure instructions used for 施政報告 and 財政預算案.
   * For an anchored pack whose pinned pages are a decision and its explainers, not a list of measures.
   * Not shown on the page.
   */
  anchorAsk?: string;
}

export interface TopicAnchor {
  url: string;
  source: string;
  title: string;
  /** Publication date (YYYY-MM-DD, HKT), used as the item date and for timeline grounding. */
  date: string;
}

export const TOPIC_PACKS: readonly TopicConfig[] = [
  {
    slug: 'policy-address',
    title: '施政報告',
    blurb: '行政長官施政報告的措施、時間線，以及對市民的影響。',
    desk: 'hk',
    category: 'hk',
    keywords: ['施政報告', '行政長官', '李家超 施政', 'policy address'],
    areas: ['房屋', '經濟與產業', '民生與福利', '稅務與津貼', '教育與人才', '醫療', '交通與基建'],
    anchors: [
      { url: 'https://www.info.gov.hk/gia/general/202609/16/P2026091600337p.htm', source: '政府新聞公報', title: '《施政報告》：以長遠謀全局 以改革開新篇 促發展創機遇 惠民生向未來', date: '2026-09-16' },
      { url: 'https://www.policyaddress.gov.hk/2026/tc/highlight.html', source: '施政報告網站', title: '行政長官2026年施政報告：摘要', date: '2026-09-16' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1870296-20260916.htm', source: '香港電台', title: '施政報告2026｜一文看清民生福祉重點措施', date: '2026-09-16' },
      { url: 'https://www.news.gov.hk/chi/2026/09/20260916/20260916_100303_151.html', source: '香港政府新聞網', title: '完善安居體系 十措施支援中小企', date: '2026-09-16' },
      { url: 'https://www.info.gov.hk/gia/general/202609/16/P2026091600306.htm', source: '政府新聞公報', title: '政府公布《香港特別行政區經濟和社會發展第一個五年規劃（2026—2030年）》', date: '2026-09-16' },
      { url: 'https://app2.rthk.hk/special/cepolicy2026/', source: '香港電台', title: '香港第一個五年規劃及2026年施政報告 - 剖析最新政策及重點措施', date: '2026-09-16' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1860309-20260629.htm', source: '香港電台', title: '施政報告2026｜行政長官新一份施政報告即日起展開公眾諮詢', date: '2026-06-29' },
      { url: 'https://www.info.gov.hk/gia/general/202609/17/P2026091700430.htm', source: '政府新聞公報', title: '《香港第一個五年規劃》和二○二六年《施政報告》立法會行政長官互動交流答問會開場發言', date: '2026-09-17' },
      { url: 'https://www.news.gov.hk/chi/2026/09/20260917/20260917_120804_911.html', source: '香港政府新聞網', title: '特首：五年規劃讓香港進步更快', date: '2026-09-17' },
      { url: 'https://www.tkww.hk/epaper/view/newsDetail/2100300239675199488.html', source: '大公報', title: '政黨：宏觀與微觀部署兩兼顧', date: '2026-09-17' },
      { url: 'https://hkcd.com/hkcdweb/content/2026/09/16/content_8775412.html', source: '香港商報', title: '經民聯：高度肯定五年規劃與施政報告 能為港注入堅實動能', date: '2026-09-16' },
      { url: 'https://www.ftu.org.hk/zh-HK/counselingDetail?columnId=2006215394359046145&id=2100381844380975105&type=2', source: '工聯會', title: '工聯會回應《香港第一個五年規劃》及《行政長官2026年施政報告》', date: '2026-09-16' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1873049-20261007.htm', source: '香港電台', title: '立法會一連三日合併辯論五年規劃及施政報告', date: '2026-10-07' },
    ],
    background: {
      label: '《香港第一個五年規劃》重點',
      ask: 'background 寫三至五句，概括同日公布的《香港第一個五年規劃》的目標和主要指標，只用資料裡的內容。',
    },
  },
  {
    slug: 'budget',
    title: '財政預算案',
    blurb: '財政預算案和稅務、津貼變動的措施與時間線。',
    desk: 'hk',
    category: 'hk',
    keywords: ['財政預算案', '預算案', '財政司司長', '差餉寬免', '稅務寬免', '薪俸稅'],
    areas: ['稅務與差餉', '民生與福利', '經濟與產業', '房屋與土地', '公共財政'],
    anchors: [
      { url: 'https://www.budget.gov.hk/2026/chi/ui.html', source: '財政預算案網站', title: '2026-27年度財政預算案：創科驅動 金融賦能', date: '2026-02-25' },
      { url: 'https://www.budget.gov.hk/2026/chi/ti.html', source: '財政預算案網站', title: '2026-27年度財政預算案：多元發展', date: '2026-02-25' },
      { url: 'https://www.budget.gov.hk/2026/chi/sm.html', source: '財政預算案網站', title: '2026-27年度財政預算案：關愛惠民', date: '2026-02-25' },
      { url: 'https://www.budget.gov.hk/2026/chi/lh.html', source: '財政預算案網站', title: '2026-27年度財政預算案：土地房屋', date: '2026-02-25' },
      { url: 'https://www.budget.gov.hk/2026/chi/pf.html', source: '財政預算案網站', title: '2026-27年度財政預算案：公共財政', date: '2026-02-25' },
      { url: 'https://www.info.gov.hk/gia/general/202602/25/P2026022500779.htm', source: '政府新聞公報', title: '二零二六至二七年度《財政預算案》稅務措施建議', date: '2026-02-25' },
      { url: 'https://www.news.gov.hk/chi/2026/02/20260225/20260225_094241_053.html', source: '香港政府新聞網', title: '寬減稅項 免稅額增', date: '2026-02-25' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1845007-20260225.htm', source: '香港電台', title: '財政預算案｜本年度綜合帳目料由670億赤字轉為29億元盈餘', date: '2026-02-25' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1844999-20260225.htm', source: '香港電台', title: '財政預算案｜寬減薪俸稅上限3千元 寬減首兩季差餉上限5百元', date: '2026-02-25' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1845019-20260225.htm', source: '香港電台', title: '財政預算案｜消息形容一次性紓緩措施增至158億元', date: '2026-02-25' },
      { url: 'https://hkcd.com/hkcdweb/content/2026/02/25/content_8741605.html', source: '香港商報', title: '財政預算案 - 經民聯：對接「十五五」發揮優勢 破局立新投資未來', date: '2026-02-25' },
      { url: 'https://www.info.gov.hk/gia/general/202512/17/P2025121600744.htm', source: '政府新聞公報', title: '《財政預算案》公眾諮詢正式展開', date: '2025-12-17' },
      { url: 'https://www.news.gov.hk/chi/2026/04/20260429/20260429_133231_663.html', source: '香港政府新聞網', title: '立法會三讀通過撥款條例草案', date: '2026-04-29' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1852857-20260429.htm', source: '香港電台', title: '立法會三讀通過本年度撥款條例草案', date: '2026-04-29' },
    ],
    background: {
      label: '財政狀況',
      ask: 'background 寫三至五句，概括政府帳目、赤字或盈餘、儲備和開支控制，只用資料裡的數字。',
    },
  },
  {
    slug: 'property',
    title: '樓市',
    blurb: '樓價、供應、居屋公屋和按揭的最新變化。',
    desk: 'hk',
    category: 'hk',
    keywords: ['樓市', '樓價', '居屋', '公屋輪候', '公屋供應', '簡約公屋', '一手樓', '按揭', '差估署'],
    areas: ['樓價', '供應', '按揭'],
  },
  {
    slug: 'weather',
    title: '颱風與天氣警告',
    blurb: '熱帶氣旋、暴雨警告，以及對通勤和上課的影響。',
    desk: 'hk',
    category: 'hk',
    keywords: ['颱風', '熱帶氣旋', '黑色暴雨', '天文台', '八號風球', '天氣警告'],
    areas: ['警告', '影響'],
  },
  {
    slug: 'us-china',
    title: '中美關係',
    blurb: '中美關稅、談判和官方表態的時間線。',
    desk: 'china',
    category: 'china',
    keywords: ['中美', '中國 關稅', '中國 特朗普', '習近平 美國', '貿易戰'],
    areas: ['關稅', '談判'],
  },
  {
    slug: 'ai',
    title: '人工智能',
    blurb: '人工智能產品、晶片和監管的公開報道。',
    desk: 'other',
    category: 'tech',
    keywords: ['人工智能', '生成式人工智能', '大模型', '晶片 出口'],
    areas: ['產品', '監管'],
  },
  {
    slug: 'mideast',
    title: '中東局勢',
    blurb: '中東衝突和外交表態的時間線。',
    desk: 'other',
    category: 'world',
    keywords: ['加沙', '以色列', '伊朗', '中東'],
    areas: ['事態', '外交'],
  },
  {
    slug: 'us-rates',
    title: '美國加息以及全球經濟影響',
    blurb: '美國聯邦儲備局的利率決定，以及對各地經濟的影響。',
    desk: 'other',
    category: 'business',
    keywords: ['聯儲局', '聯邦儲備局', '聯邦基金利率', '美國 加息', '美國 減息', '美國 議息', 'FOMC'],
    areas: ['利率決定', '美國經濟', '全球影響'],
    note: '欄目名稱是「美國加息以及全球經濟影響」，只是題目。正文按資料裡每一次議息照資料寫：資料寫減息、維持利率或加息，就照資料寫，不要把欄目名稱當成現況。',
    anchors: [
      { url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260429a.htm', source: '美國聯邦儲備局', title: 'Federal Reserve issues FOMC statement（2026年4月29日）', date: '2026-04-29' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1852956-20260430.htm', source: '香港電台', title: '聯儲局維持利率不變　符合市場預期　4名委員投反對票', date: '2026-04-30' },
      { url: 'https://www.hkma.gov.hk/chi/news-and-media/press-releases/2026/04/20260430-3/', source: '香港金融管理局', title: '金管局回應美聯儲議息決定（2026年4月30日）', date: '2026-04-30' },
      { url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260617a.htm', source: '美國聯邦儲備局', title: 'Federal Reserve issues FOMC statement（2026年6月17日）', date: '2026-06-17' },
      { url: 'https://www.hkma.gov.hk/chi/news-and-media/press-releases/2026/06/20260618-3/', source: '香港金融管理局', title: '金管局回應美聯儲議息決定（2026年6月18日）', date: '2026-06-18' },
      { url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm', source: '美國聯邦儲備局', title: 'Federal Reserve issues FOMC statement（2026年7月29日）', date: '2026-07-29' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1864268-20260730.htm', source: '香港電台', title: '聯儲局按兵不動　3名委員支持加息　沃什重申通脹不存在軟性目標', date: '2026-07-30' },
      { url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm', source: '美國聯邦儲備局', title: 'Federal Reserve issues FOMC statement（2026年9月16日）', date: '2026-09-16' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1870362-20260917.htm', source: '香港電台', title: '聯儲局加息0.25厘　沃什：有助推動通脹更及時回到2%目標', date: '2026-09-17' },
      { url: 'https://news.rthk.hk/rthk/ch/component/k2/1870390-20260917.htm', source: '香港電台', title: '余偉文：美國息率變化仍不確定　影響香港利率環境', date: '2026-09-17' },
      { url: 'https://www.hkma.gov.hk/chi/news-and-media/press-releases/2026/09/20260917-3/', source: '香港金融管理局', title: '調整基本利率（2026年9月17日）', date: '2026-09-17' },
    ],
    anchorAsk: [
      '時間範圍是資料裡的每一次議息，由較早的一次寫到最新一次，不要只寫最後一次。',
      'timeline 為每一次議息各列一項，按日期由舊到新。date 用該次聲明或報道的 YYYY-MM-DD，必須是資料 date 欄或正文寫明的日期。text 一句，只可照該次資料寫減息、維持利率或加息，並寫上該次資料裡的利率數字。資料寫減息、維持利率或加息，就照資料寫。欄目名稱不是加息的證據，較早一次維持利率就不能寫成加息。',
      'points 寫三句，沿用資料中文裡已有的詞組，不要另寫一套新句子。第一句寫最新一次決定。第二句寫此前各次是減息、維持還是加息。第三句寫資料明確寫出的影響。',
      'impact 只寫資料明確寫出的全球或香港影響，包括匯率、拆息、基本利率和利率環境。資料沒有寫的影響不要推測，回傳空陣列。',
      'figures 只列資料原文出現過的數字，不要為了填滿而湊項。area 只可以是：利率決定、美國經濟、全球影響。label 寫這個數字指甚麼，25 字以內。value 用資料原文的阿拉伯數字和單位，原文有「約」「超過」等字眼必須保留。沒有數字的項目不要列。',
      'reactions 只寫資料裡點名的官員或機構，先寫名稱，再概述其說法。引用原話用「」並逐字照錄。資料沒有就回傳空陣列。',
      '英文聲明只用來核對每一次是減息、維持還是加息，不要把英文譯成資料中文裡沒有的說法。機構名稱寫「聯儲局」，不要寫「美聯儲」。若英文聲明與中文報道的決定不一致，以該次英文聲明為準，並且不要添加聲明和中文報道都沒有的事實。',
    ].join(''),
  },
] as const;

export interface TopicFigure {
  area: string;
  label: string;
  value: string;
}

export interface TopicEvent {
  date: string;
  text: string;
}

/** One picture for the explainer. url is a self-hosted path or an https URL we are allowed to show. */
export interface TopicPicture {
  url: string;
  alt: string;
  /** Who the picture is from, without the 「圖片：」 prefix. */
  credit: string;
  sourceUrl: string;
}

export interface TopicPack {
  slug: string;
  title: string;
  description: string;
  points: string[];
  timeline: TopicEvent[];
  figures: TopicFigure[];
  impact: string[];
  reactions: string[];
  /** Anchored packs only: the extra section named by TopicConfig.background. */
  background?: string[];
  sources: SourceRef[];
  /** Hero picture. Missing on packs saved before pictures were required; the page then uses the standing slot. */
  picture?: TopicPicture;
  /** Feed links already folded into this pack. New links are the only reason to call a model. */
  seenLinks: string[];
  publishedAt: string;
  updatedAt: string;
  mode: 'ai' | 'sources';
  provider?: 'grok' | 'minimax' | 'workers-ai';
  model?: string;
}

export interface TopicDraft {
  title: string;
  description: string;
  points: string[];
  timeline: TopicEvent[];
  figures: TopicFigure[];
  impact: string[];
  reactions: string[];
  background: string[];
}

const DISCLAIMER = /免責|僅供參考|只供參考|編者按|編者的話|AI 生成|人工智能生成|模型整理|本文由/;
const TIMELINE_CAP = 20;
const FIGURE_CAP = 12;
/** Anchored packs (施政報告, 財政預算案) list measures by area, so they keep more figures. */
export const ANCHORED_FIGURE_CAP = 28;
const LIST_CAP = 6;

export function topicBySlug(slug: string): TopicConfig | undefined {
  return TOPIC_PACKS.find((topic) => topic.slug === slug);
}

export function topicStorageKey(slug: string): string {
  return `topic:${slug}`;
}

/** 07:30 and 18:30 HKT warm runs, plus an hour of Actions delay. Sunday 20:00 is outside this. */
export function topicWarmWindow(now = new Date()): boolean {
  const hkt = new Date(now.getTime() + 8 * 3_600_000);
  const hour = hkt.getUTCHours();
  return hour === 7 || hour === 8 || hour === 18 || hour === 19;
}

export function keywordHits(text: string, keyword: string): boolean {
  const hay = text.toLowerCase();
  const parts = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return parts.length > 0 && parts.every((part) => hay.includes(part));
}

export function topicMatchesText(text: string, topic: TopicConfig): boolean {
  return topic.keywords.some((keyword) => keywordHits(text, keyword));
}

export function relatedTopics(text: string): TopicConfig[] {
  return TOPIC_PACKS.filter((topic) => topicMatchesText(text, topic));
}

export function matchTopicItems(items: NewsItem[], topic: TopicConfig): NewsItem[] {
  return items
    .filter((item) => topicMatchesText(`${item.title}\n${item.excerpt || ''}`, topic))
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate) || a.id.localeCompare(b.id));
}

export function newTopicLinks(items: NewsItem[], seen: readonly string[]): string[] {
  const known = new Set(seen);
  return items.map((item) => item.link).filter((link) => link && !known.has(link));
}

export function topicCorpus(items: NewsItem[]): string {
  const raw = items.map((item) => [item.title, item.excerpt || '', item.pubDate || '', item.source].join('\n')).join('\n');
  return `${raw}\n${tidyDisplay(toHK(raw))}`;
}

function han(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

export function topicRichness(pack: TopicPack): number {
  const text = [
    pack.title,
    pack.description,
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.flatMap((row) => [row.label, row.value]),
    ...pack.impact,
    ...pack.reactions,
    ...(pack.background ?? []),
  ].join('');
  return han(text);
}

function narrativeLines(pack: Pick<TopicPack, 'points' | 'timeline' | 'impact' | 'reactions' | 'figures'>): string[] {
  return [
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.map((row) => `${row.label}${row.value}`),
    ...pack.impact,
    ...pack.reactions,
  ];
}

function narrativeOf(pack: Pick<TopicPack, 'points' | 'timeline' | 'impact' | 'reactions' | 'figures'>): string {
  return [
    ...pack.points,
    ...pack.timeline.map((row) => row.text),
    ...pack.figures.map((row) => `${row.label}${row.value}`),
    ...pack.impact,
    ...pack.reactions,
  ].join('');
}

/** A pack worth indexing. Thin or still-Cantonese text stays off the sitemap. */
export function topicPublic(pack: TopicPack): boolean {
  // Workers AI drafts are not shown (Cantonese wording and unsourced claims in testing).
  if (pack.mode !== 'ai' || pack.provider === 'workers-ai') return false;
  if (!hasChinese(pack.title) || pack.points.length < 2) return false;
  if (!pack.timeline.length && !pack.figures.length) return false;
  const prose = narrativeOf(pack);
  // Topic lines are short single sentences, so the comma guard is applied line by line;
  // joined together they would fail it for having no 「，」 between sentences.
  const lines = narrativeLines(pack);
  if (!lines.every((line) => proseSane(line)) || cantoneseLeft(prose) || isMostlyEnglish(pack.title)) return false;
  return pack.points.every((point) => hasChinese(point));
}

/**
 * A rewrite must not replace a better version. Same 15% floor as explainers:
 * a public pack stays when the candidate is unlistable or materially thinner.
 */
export function keepStoredTopic(stored: TopicPack, next: TopicPack): boolean {
  if (!topicPublic(stored)) return false;
  if (!topicPublic(next)) return true;
  return topicRichness(next) < topicRichness(stored) * 0.85;
}

export function parseTopicPack(raw: string | null): TopicPack | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as TopicPack;
    if (!value || typeof value.slug !== 'string' || typeof value.title !== 'string') return null;
    if (!Array.isArray(value.points) || !Array.isArray(value.timeline) || !Array.isArray(value.seenLinks)) return null;
    return value;
  } catch {
    return null;
  }
}

function numbersGrounded(text: string, corpus: string): boolean {
  const nums = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => new RegExp(`(?<!\\d)${n.replace('.', '\\.')}(?!\\d)`).test(corpus));
}

/** Share of the line's Chinese character pairs that appear in the source text. */
export function groundedShare(line: string, corpus: string): number {
  const pairs: string[] = [];
  for (const run of line.match(/[\u3400-\u9fff]+/g) ?? []) {
    for (let i = 0; i + 1 < run.length; i += 1) pairs.push(run.slice(i, i + 2));
  }
  if (pairs.length < 6) return 1;
  return pairs.filter((pair) => corpus.includes(pair)).length / pairs.length;
}

/** Below this share a line is mostly words the sources never used: an invented detail or a guess. */
export const GROUNDED_MIN = 0.5;

/**
 * Wording that restates the same fact. A paraphrase of an anchored page often sits around 0.4,
 * under GROUNDED_MIN, even though the rate and the institution are the source's. These folds are
 * applied only for that check. They do not include 加息, 減息 or 維持.
 */
const SAME_FACT: readonly (readonly [RegExp, string])[] = [
  [/聯邦公開市場委員會/g, '聯儲局'],
  [/美國聯邦儲備局/g, '聯儲局'],
  [/聯邦儲備局/g, '聯儲局'],
  [/美聯儲/g, '聯儲局'],
  [/升至/g, '上調至'],
  [/調高至/g, '上調至'],
  [/提高到/g, '上調至'],
  [/上調到/g, '上調至'],
];

function sameFactWording(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SAME_FACT) out = out.replace(pattern, replacement);
  return out;
}

/**
 * Longest run of Chinese characters that no adjacent pair in the corpus covers.
 * A supported paraphrase leaves a gap of one or two characters. Four or more is a phrase the sources never used.
 */
function uncoveredGap(line: string, corpus: string): number {
  let longest = 0;
  for (const run of line.match(/[\u3400-\u9fff]+/g) ?? []) {
    const covered = Array<boolean>(run.length).fill(false);
    for (let i = 0; i + 1 < run.length; i += 1) {
      if (!corpus.includes(run.slice(i, i + 2))) continue;
      covered[i] = true;
      covered[i + 1] = true;
    }
    let gap = 0;
    for (const flag of covered) {
      gap = flag ? 0 : gap + 1;
      longest = Math.max(longest, gap);
    }
  }
  return longest;
}

const UNCOVERED_GAP_MAX = 3;

function wordingGrounded(line: string, corpus: string): boolean {
  const folded = sameFactWording(line);
  const foldedCorpus = sameFactWording(corpus);
  const changed = folded !== line || foldedCorpus !== corpus;
  const share = Math.max(groundedShare(line, corpus), changed ? groundedShare(folded, foldedCorpus) : 0);
  if (share < GROUNDED_MIN) return false;
  return uncoveredGap(folded, changed ? foldedCorpus : corpus) <= UNCOVERED_GAP_MAX;
}

function quotesGrounded(line: string, corpus: string): boolean {
  const quoted = [...line.matchAll(/[「“"]([^」”"]{2,})[」”"]/g)].map((match) => match[1]);
  return quoted.every((text) => corpus.includes(text) || corpus.includes(toHK(text)));
}

/**
 * A quote the model copied without its commas (e.g. 「經濟勢頭良好來之不易要為……」) gets the source's
 * punctuation back: each run of 10+ Chinese characters is looked up in the corpus allowing 「，、」
 * between characters, and replaced by the source wording when found.
 */
export function restorePunctuation(line: string, corpus: string): string {
  return line.replace(/[\u3400-\u9fff]{10,}/g, (run) => {
    if (corpus.includes(run)) return run;
    // 「陳茂波說經濟勢頭良好來之不易……」: the speaker is not part of the source run, so try each tail.
    for (let start = 0; start + 10 <= run.length; start += 1) {
      const tail = run.slice(start);
      if (!corpus.includes(tail.slice(0, 4))) continue;
      const match = new RegExp([...tail].join('[，、]?')).exec(corpus);
      if (match) return /[，、]/.test(match[0]) ? run.slice(0, start) + match[0] : run;
    }
    return run;
  });
}

function cleanLine(raw: unknown, corpus: string, strictNumbers: boolean): string {
  const source = String(raw ?? '');
  // A broken character (U+FFFD) means the model reply was cut mid-character: drop the line.
  if (source.includes('\uFFFD')) return '';
  const line = thousands(tidyDisplay(toHK(polishProse(source))).replace(/\s+/g, ' ').trim());
  if (!line || !hasChinese(line) || isMostlyEnglish(line)) return '';
  if (cantoneseLeft(line) || preachySentence(line) || DISCLAIMER.test(line)) return '';
  if (strictNumbers && !numbersGrounded(line, corpus)) return '';
  if (!wordingGrounded(line, corpus) || !quotesGrounded(line, corpus)) return '';
  return restorePunctuation(line, corpus);
}

/** Official pages write 1 900 or 35 000: show 1,900 and 35,000. */
export function thousands(text: string): string {
  return text.replace(/(?<![\d.,])(\d{1,3})(?:[ \u00a0\u2009\u202f](\d{3}))+(?![\d])/g, (all) => all.replace(/[ \u00a0\u2009\u202f]/g, ','));
}

/** Leading 「專題：」 or 「懶人包：」 copied from the prompt. */
function stripLabel(text: string): string {
  return text.replace(/^(?:專題|懶人包)[：:]\s*/, '');
}

/** Narrative lines end with a full stop, like the rest of the site's copy. */
function sentence(line: string): string {
  if (!line) return '';
  return /[。！？」』）)]$/.test(line) ? line : `${line}。`;
}

/** Headline clauses the model separated with spaces become one line joined by 「，」. */
function titleLine(raw: unknown): string {
  return String(raw ?? '').replace(/([\u3400-\u9fff」》])\s+(?=[\u3400-\u9fff「《])/g, '$1，').trim();
}

function cleanDate(raw: unknown, corpus: string): string {
  const match = /(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? ''));
  if (!match) return '';
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const month = String(Number(match[2]));
  const day = String(Number(match[3]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return '';
  if (corpus.includes(iso)) return iso;
  // The day must be written as a date (9月16日, 九月十六日, 16/9) in a corpus that names the year;
  // loose numbers scattered through a long official text do not ground a date.
  const yearOk = new RegExp(`(?<!\\d)${match[1]}(?!\\d)|${chineseYear(match[1])}`).test(corpus);
  const written = [
    `(?<!\\d)${month}月${day}日`,
    `(?<![一二三四五六七八九十])${chineseNumber(Number(month))}月${chineseNumber(Number(day))}日`,
    `(?<!\\d)${day}/${month}(?!\\d)`,
  ];
  return yearOk && written.some((pattern) => new RegExp(pattern).test(corpus)) ? iso : '';
}

function chineseNumber(value: number): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value < 10) return digits[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tens > 1 ? digits[tens] : ''}十${ones ? digits[ones] : ''}`;
}

function chineseYear(year: string): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const forms = [[...year].map((d) => digits[Number(d)]).join(''), [...year].map((d) => (d === '0' ? '零' : digits[Number(d)])).join('')];
  return forms.join('|');
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Model JSON, restricted to lines whose numbers appear in the source text. */
export function parseTopicDraft(raw: string, corpus: string, areas: readonly string[], strictNumbers = true, figureCap = FIGURE_CAP): TopicDraft | null {
  const text = raw.replace(/```json|```/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const allowed = new Set(areas);
  const points = asList(parsed.points).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, 3);
  const timeline: TopicEvent[] = [];
  for (const row of asList(parsed.timeline)) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const date = cleanDate(record.date, corpus);
    const line = sentence(cleanLine(record.text, corpus, strictNumbers));
    if (!date || !line) continue;
    if (timeline.some((item) => item.date === date && item.text === line)) continue;
    timeline.push({ date, text: line });
  }
  const figures: TopicFigure[] = [];
  for (const row of asList(parsed.figures)) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const area = tidyDisplay(String(record.area ?? '')).trim();
    const label = cleanLine(record.label, corpus, false);
    const value = cleanLine(record.value, corpus, strictNumbers);
    if (!area || !label || !value || !/\d/.test(value)) continue;
    if (allowed.size && !allowed.has(area)) continue;
    if (!numbersGrounded(value, corpus)) continue;
    figures.push({ area, label, value });
  }
  const draft: TopicDraft = {
    title: stripLabel(cleanLine(titleLine(parsed.title), corpus, strictNumbers) || cleanLine(titleLine(parsed.title), corpus, false)),
    description: sentence(cleanLine(parsed.description, corpus, strictNumbers)),
    points,
    timeline: timeline.slice(0, TIMELINE_CAP),
    figures: figures.slice(0, figureCap),
    impact: asList(parsed.impact).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, LIST_CAP),
    reactions: asList(parsed.reactions).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, LIST_CAP),
    background: asList(parsed.background).map((row) => sentence(cleanLine(row, corpus, strictNumbers))).filter(Boolean).slice(0, LIST_CAP),
  };
  if (!draft.title && !draft.points.length && !draft.timeline.length && !draft.figures.length) return null;
  return draft;
}

function sameEvent(a: TopicEvent, b: TopicEvent): boolean {
  return a.date === b.date && a.text === b.text;
}

/**
 * Update in place: keep the previous timeline, figures, impact, and reactions,
 * and append only new grounded lines. The three-line summary is replaced only
 * when the new lines are not materially thinner.
 */
export function applyTopicUpdate(
  previous: TopicPack | null,
  draft: TopicDraft,
  meta: { slug: string; now: string; provider: TopicPack['provider']; model?: string; figureCap?: number },
): TopicPack {
  const points = draft.points.length >= 2 && han(draft.points.join('')) >= han((previous?.points ?? []).join('')) * 0.85
    ? draft.points
    : (previous?.points?.length ? previous.points : draft.points);
  const timeline = [...(previous?.timeline ?? [])];
  for (const row of draft.timeline) {
    if (!timeline.some((item) => sameEvent(item, row))) timeline.push(row);
  }
  timeline.sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text, 'zh-HK'));
  const figures = [...(previous?.figures ?? [])];
  for (const row of draft.figures) {
    if (!figures.some((item) => item.area === row.area && item.value === row.value)) figures.push(row);
  }
  const append = (prior: string[] | undefined, extra: string[]) => {
    const next = [...(prior ?? [])];
    for (const line of extra) if (!next.includes(line)) next.push(line);
    return next.slice(0, LIST_CAP);
  };
  const pack: TopicPack = {
    slug: meta.slug,
    title: draft.title || previous?.title || '',
    description: draft.description || previous?.description || points[0] || '',
    points,
    timeline: timeline.slice(-TIMELINE_CAP),
    figures: figures.slice(-(meta.figureCap ?? FIGURE_CAP)),
    impact: append(previous?.impact, draft.impact),
    reactions: append(previous?.reactions, draft.reactions),
    ...(draft.background.length || previous?.background?.length
      ? { background: draft.background.length ? draft.background : previous?.background ?? [] }
      : {}),
    sources: previous?.sources ?? [],
    seenLinks: previous?.seenLinks ?? [],
    publishedAt: previous?.publishedAt || meta.now,
    updatedAt: meta.now,
    mode: 'ai',
    provider: meta.provider,
    ...(meta.model ? { model: meta.model } : {}),
  };
  return pack;
}

export function sourcesFromItems(items: NewsItem[], previous: SourceRef[] = [], cap = SOURCE_LIST_CAP): SourceRef[] {
  const out: SourceRef[] = [];
  const seen = new Set<string>();
  const push = (source: SourceRef) => {
    if (!source.url || seen.has(source.url) || out.length >= cap) return;
    seen.add(source.url);
    out.push(source);
  };
  for (const item of items) {
    push({
      title: item.title,
      url: item.link,
      source: item.source,
      ...(item.excerpt ? { excerpt: item.excerpt.slice(0, 280) } : {}),
      ...(item.category ? { category: item.category } : {}),
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      ...(item.image ? { image: item.image } : {}),
    });
  }
  for (const source of previous) push(source);
  return out;
}

/** Characters of each pinned source passed to the model on a full build. */
export const ANCHOR_PROMPT_CHARS = 6_000;

/**
 * Full build for an anchored topic (施政報告, 財政預算案, or a decision pinned to an official page):
 * pinned pages plus matched headlines. Every number, date and quote must come from this material.
 */
export function anchoredPrompt(topic: TopicConfig, items: NewsItem[]): { system: string; user: string; maxTokens: number } {
  const areas = topic.areas.join('、');
  const system = [
    `你是世界頭條的編輯，為「${topic.title}」寫一份完整的專題懶人包。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語，不要用台灣用語。`,
    '每一句都要有正常的中文標點：分句之間用「，」，並列用「、」，文件名稱用《》，句末用「。」。資料原文有些段落沒有標點，你寫的句子仍然必須加上標點。',
    '數字和年份一律用阿拉伯數字，千位用逗號（例如1,900、35,000）。句子裡的日期寫成「2026年9月16日」，不要寫「今日」「昨日」「明年」，改寫成資料所指的年份或日期。中文之間不要用空格。',
    '只可使用下面資料裡已經寫明的事實。禁止添加資料沒有的事實、數字、引言、人名、日期、地點或因果。每個數字必須在資料原文出現。',
    '沒有資料的欄位回傳空陣列。不要寫任何免責聲明、編者按，不要寫「AI」「專題」「資料」。回覆必須是 JSON，不要用 Markdown。',
  ].join('');
  // Oldest first, so the material reads as the chronology the timeline should follow.
  const ordered = [...items].sort((a, b) => (a.pubDate || '').localeCompare(b.pubDate || ''));
  const material = ordered.map((item, index) => ({
    n: index + 1,
    source: item.source,
    title: item.title,
    date: (item.pubDate || '').slice(0, 10),
    text: (item.excerpt || '').slice(0, ANCHOR_PROMPT_CHARS),
  }));
  const measureLines = [
    'points 寫三句完整的新聞句子，每句 30 至 50 字：第一句寫誰在哪一日發表、主題是甚麼；第二句寫最重要的措施；第三句寫與市民最相關的改變。',
    'timeline 逐篇檢查資料（已按日期由舊到新排列）：每一篇的 date 欄和正文寫明的日期都是一個階段，例如公眾諮詢展開、發表、答問會、立法會辯論、表決或通過。資料有多少個不同日期的階段就列多少項（通常四項以上），按日期排列；date 是 YYYY-MM-DD，必須是資料寫明的日期。資料的 date 欄是發稿日期；正文寫明事情在另一日發生（例如「將於下星期一（六月二十九日）展開」）時，用正文的日期。同一件事只列一次（例如公布諮詢安排和諮詢展開是同一件事，列在展開那一日）。text 一句，寫清楚那一日發生甚麼。',
    `figures 列出 16 至 24 項具體措施，盡量涵蓋資料提到的每個範疇。area 只可以是：${areas}；按措施性質歸類（例如水管、道路、鐵路歸交通與基建；學額、獎學金、人才計劃歸教育與人才）。label 寫措施內容（25 字以內），要寫清楚數字是「增加」「增至」「目標」還是「上限」。value 是資料原文裡含阿拉伯數字的數量和單位（例如「增至3萬元」「4.5年」「最多2萬元」），原文有「約」「超過」「最多」「逾」等字眼必須保留（原文「約400個」就寫「約400個」）；沒有數字的措施不要列。`,
    'impact 寫四至六句「對市民有什麼影響」，每句寫明哪些人受惠、金額或資格、何時生效，只寫資料明確寫出的內容，不要推測。',
    'reactions 為資料裡點名的每個政黨或團體各寫一句，先寫名稱，再概述其看法；如引用原話，用「」並逐字照錄、保留原文標點。資料沒有回應就回傳空陣列。',
    topic.background?.ask ?? '',
    '範例句子（格式示範，不是事實）：「行政長官在2026年9月16日發表《施政報告》，提出房屋、經濟和民生措施。」',
  ];
  const user = [
    `專題：${topic.title}`,
    topic.note ?? '',
    `title 寫一句 12 至 22 字的新聞標題，必須包含「${topic.title}」，不要加「專題：」。description 一句完整的新聞句子，60 字以內。`,
    ...(topic.anchorAsk ? [topic.anchorAsk] : measureLines),
    `回傳 {"title":"","description":"","points":[],"timeline":[{"date":"YYYY-MM-DD","text":""}],"figures":[{"area":"","label":"","value":""}],"impact":[],"reactions":[],"background":[]}`,
    `資料：${JSON.stringify(material)}`,
  ].filter(Boolean).join('\n');
  return { system, user, maxTokens: 4_000 };
}

export function topicPrompt(topic: TopicConfig, items: NewsItem[], previous: TopicPack | null): { system: string; user: string; maxTokens: number } {
  const areas = topic.areas.join('、');
  const system = [
    '你是世界頭條的編輯，整理一篇持續更新的專題。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語，不要用台灣用語。',
    '判斷用「是」。使用全形標點。數字和年份一律用阿拉伯數字。中文之間不要用空格。',
    '只可使用下面標題和摘錄裡已經寫明的事實。禁止添加來源沒有的事實、數字、引言、人名、日期、地點或因果。摘錄沒有的措施不要寫。',
    '與這個專題無關的摘錄整段略過。沒有資料的欄位回傳空陣列，不要寫「未有回應」「未有評論」或任何免責聲明、編者按。',
    '不要稱呼資料欄位，不要寫「AI」。回覆必須是 JSON，不要用 Markdown。',
    previous
      ? '這是更新，不是重寫。保留上一版仍然成立的日期和數字，只根據新摘錄增補或修正。沒有新事實的欄位回傳空陣列。'
      : '這是第一版。材料不夠就如實寫短，不要為了湊字重複。',
  ].join('');
  const material = items.slice(0, 6).map((item, index) => ({
    n: index + 1,
    source: item.source,
    title: item.title,
    date: (item.pubDate || '').slice(0, 10),
    excerpt: (item.excerpt || '').slice(0, 700),
  }));
  const prior = previous
    ? {
      title: previous.title,
      description: previous.description,
      points: previous.points,
      timeline: previous.timeline,
      figures: previous.figures,
      impact: previous.impact,
      reactions: previous.reactions,
    }
    : null;
  const user = [
    `專題：${topic.title}`,
    topic.note ?? '',
    `數字只可歸入這些欄：${areas}。沒有數字就不要輸出該欄。`,
    `title 寫一句 12 至 22 字，不要用空格分隔。points 寫三句，每句 40 字以內，概括目前發生了甚麼。points 和 timeline 只寫與「${topic.title}」直接相關的事；同一摘錄裡的其他新聞（例如採訪日誌列出的其他活動）一律略過。`,
    '引述官員或議員的話時保留原文的逗號。',
    'timeline 每項 date 用摘錄或標題裡的 YYYY-MM-DD，text 一句。',
    'figures 的 value 必須是摘錄裡出現過的數字。label 是這個數字指甚麼。',
    'impact 只寫摘錄明確寫出的、對香港市民的直接影響，不要推測「可能」「或會」；摘錄沒有寫就回傳空陣列。reactions 只寫摘錄裡點名的政黨、官員或團體的說法，引言必須逐字來自摘錄。',
    `回傳 {"title":"","description":"","points":[],"timeline":[{"date":"YYYY-MM-DD","text":""}],"figures":[{"area":"","label":"","value":""}],"impact":[],"reactions":[]}`,
    prior ? `上一版：${JSON.stringify(prior)}` : '',
    `資料：${JSON.stringify(material)}`,
  ].filter(Boolean).join('\n');
  return { system, user, maxTokens: previous ? 1_400 : 1_800 };
}
