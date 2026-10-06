export const CATEGORY_IDS = [
  'world',
  'asia',
  'china',
  'hk',
  'business',
  'tech',
  'sport',
  'entertainment',
  'health',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: 'all' | CategoryId;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: '全部' },
  { id: 'world', label: '國際' },
  { id: 'asia', label: '亞洲' },
  { id: 'china', label: '中國' },
  { id: 'hk', label: '香港' },
  { id: 'business', label: '財經' },
  { id: 'tech', label: '科技' },
  { id: 'sport', label: '體育' },
  { id: 'entertainment', label: '娛樂' },
  { id: 'health', label: '健康/科學' },
];

const RULES: { id: CategoryId; pattern: RegExp }[] = [
  { id: 'hk', pattern: /香港|hong kong|kowloon|九龍|立法會/i },
  { id: 'sport', pattern: /體育|奧運|奧運|world cup|football|soccer|\bnba\b|tennis|olympic/i },
  { id: 'business', pattern: /財經|股市|經濟|inflation|stock market|\bstocks?\b|央行|利率|貿易/i },
  { id: 'tech', pattern: /科技|人工智能|artificial intelligence|\bai\b|chip|semiconductor|軟件|software/i },
  { id: 'entertainment', pattern: /娛樂|電影|celebrity|box office|音樂|concert/i },
  { id: 'health', pattern: /健康|疫苗|covid|nasa|space|科學|science|climate|氣候|醫學|hospital/i },
  { id: 'china', pattern: /中國|北京|上海|台灣|臺灣|beijing|taiwan|taipei|xi jinping/i },
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
