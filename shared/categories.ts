export const CATEGORY_IDS = [
  'hk',
  'china',
  'asia',
  'world',
  'business',
  'tech',
  'science',
  'health',
  'sport',
  'entertainment',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: 'all' | CategoryId;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: '全部' },
  { id: 'hk', label: '香港' },
  { id: 'china', label: '中國' },
  { id: 'asia', label: '亞洲' },
  { id: 'world', label: '國際' },
  { id: 'business', label: '財經' },
  { id: 'tech', label: '科技' },
  { id: 'science', label: '科學' },
  { id: 'health', label: '健康' },
  { id: 'sport', label: '體育' },
  { id: 'entertainment', label: '娛樂' },
];

/** Tile colour and a brand icon from public/icons for stories with no photo. */
export const CATEGORY_TILE: Record<CategoryId, { color: string; icon: string }> = {
  hk: { color: '#C8102E', icon: 'hkg' },
  china: { color: '#9A3412', icon: 'asi' },
  asia: { color: '#0C3C78', icon: 'asi' },
  world: { color: '#1D4F91', icon: 'int' },
  business: { color: '#0B6B4F', icon: 'usa' },
  tech: { color: '#1E4D8C', icon: 'all' },
  science: { color: '#0F6E56', icon: 'int' },
  health: { color: '#8A4B08', icon: 'all' },
  sport: { color: '#8E1B2C', icon: 'all' },
  entertainment: { color: '#5B3A8C', icon: 'all' },
};

const RULES: { id: CategoryId; pattern: RegExp }[] = [
  { id: 'hk', pattern: /香港|hong kong|kowloon|九龍|立法會/i },
  { id: 'sport', pattern: /體育|奧運|奧運|world cup|football|soccer|\bnba\b|tennis|olympic/i },
  { id: 'business', pattern: /財經|股市|經濟|inflation|stock market|\bstocks?\b|央行|利率|貿易/i },
  { id: 'tech', pattern: /科技|人工智能|artificial intelligence|\bai\b|chip|semiconductor|軟件|software/i },
  { id: 'entertainment', pattern: /娛樂|電影|celebrity|box office|音樂|concert|藝人/i },
  { id: 'science', pattern: /科學|\bscience\b|\bnasa\b|\bspace\b|太空|氣候|\bclimate\b|天文|物理|化學/i },
  { id: 'health', pattern: /健康|疫苗|covid|醫學|hospital|病毒|疾病|醫療|衛生/i },
  { id: 'china', pattern: /中國|北京|上海|深圳|廣州|beijing|shanghai|xi jinping/i },
  { id: 'asia', pattern: /日本|韓國|印度|亞洲|japan|korea|india|asean|tokyo|seoul/i },
];

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? '國際';
}

export function categorize(title: string, fallback: CategoryId = 'world'): CategoryId {
  for (const rule of RULES) {
    if (rule.pattern.test(title)) return rule.id;
  }
  return fallback;
}
