import type { NewsItem } from './types';

/** Words that are everywhere in headlines and say nothing about a topic. */
const ZH_STOP = new Set([
  '香港', '本港', '政府', '今日', '昨日', '明日', '表示', '一名', '兩名', '指出', '報道', '消息', '記者', '最新', '即時', '影片', '圖片',
  '宣布', '公布', '發現', '可能', '情況', '問題', '事件', '男子', '女子', '市民', '有關', '進行', '繼續', '成為', '超過', '萬元', '億元',
  '中國', '美國', '全球', '國際', '亞洲', '新聞', '今年', '去年', '年度', '一個', '我們', '他們', '如何', '為何', '什麼', '甚麼',
  '要求', '調查', '警方', '發生', '涉及', '包括', '開始', '完成', '獲得', '一度', '比利', '利時', '當局', '官員', '計劃', '回應', '關注',
  '支持', '反對', '提出', '推出', '舉行', '受傷', '死亡', '事故', '目前', '已經', '仍然', '其中', '方面', '透過', '工作', '人員', '公司',
]);
const EN_STOP = new Set([
  'The', 'A', 'An', 'And', 'Of', 'In', 'On', 'For', 'To', 'With', 'After', 'Before', 'How', 'What', 'Why', 'Who', 'Is', 'Are', 'Was',
  'As', 'At', 'By', 'From', 'Over', 'Into', 'New', 'Watch', 'Live', 'Latest', 'Update', 'Updates', 'Says', 'Say', 'Will', 'Could',
  'BBC', 'CNBC', 'Video', 'Photos', 'Opinion', 'Analysis', 'News', 'Week', 'Day', 'Year', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday', 'Here', 'This', 'That', 'It', 'Its', 'His', 'Her', 'Their', 'We', 'You', 'I', 'US', 'UK', 'Best',
]);

export interface Topic {
  term: string;
  outlets: number;
}

/**
 * Trending terms: English proper nouns and Chinese 2–4 character phrases that several different
 * outlets use in their headlines. Only literal words from headlines, nothing generated.
 */
export function trendingTopics(items: NewsItem[], now = Date.now(), hours = 12, limit = 10): Topic[] {
  const cutoff = now - hours * 3600 * 1000;
  const recent = items.filter((item) => {
    const at = Date.parse(item.pubDate);
    return !Number.isFinite(at) || at >= cutoff;
  });
  const bySource = new Map<string, Set<string>>();
  const add = (term: string, source: string) => {
    const set = bySource.get(term) ?? new Set<string>();
    set.add(source);
    bySource.set(term, set);
  };
  for (const item of recent) {
    const seen = new Set<string>();
    for (const match of item.title.matchAll(/\b[A-Z][a-zA-Z'’-]{2,}(?:\s[A-Z][a-zA-Z'’-]{2,})?/g)) {
      const term = match[0].replace(/['’]s$/, '');
      if (EN_STOP.has(term) || EN_STOP.has(term.split(' ')[0]!)) continue;
      seen.add(term);
    }
    for (const chunk of item.title.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
      for (let size = 2; size <= 4; size += 1) {
        for (let index = 0; index + size <= chunk.length; index += 1) {
          const term = chunk.slice(index, index + size);
          if (!ZH_STOP.has(term)) seen.add(term);
        }
      }
    }
    for (const term of seen) add(term, item.source);
  }
  const candidates = [...bySource.entries()]
    .map(([term, sources]) => ({ term, outlets: sources.size }))
    .filter((row) => row.outlets >= 2)
    .sort((a, b) => b.outlets - a.outlets || b.term.length - a.term.length);
  const picked: Topic[] = [];
  for (const row of candidates) {
    // Prefer the longer phrase when a shorter one has the same reach (港鐵加價 over 港鐵, 加價).
    if (picked.some((p) => p.term.includes(row.term) || (row.term.includes(p.term) && row.outlets < p.outlets))) continue;
    const longer = candidates.find((other) => other.term !== row.term && other.term.includes(row.term) && other.outlets === row.outlets);
    if (longer) continue;
    picked.push(row);
    if (picked.length >= limit) break;
  }
  return picked;
}
