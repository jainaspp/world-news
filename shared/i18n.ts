import type { UiLang } from './zh.js';

const LABELS = {
  search: { 'zh-HK': '搜尋', 'zh-CN': '搜索', en: 'Search' },
  refresh: { 'zh-HK': '重新整理', 'zh-CN': '刷新', en: 'Refresh' },
  bookmarks: { 'zh-HK': '收藏', 'zh-CN': '收藏', en: 'Saved' },
  following: { 'zh-HK': '我的', 'zh-CN': '我的', en: 'Following' },
  follow: { 'zh-HK': '關注', 'zh-CN': '关注', en: 'Follow' },
  followingOn: { 'zh-HK': '已關注', 'zh-CN': '已关注', en: 'Following' },
  unfollow: { 'zh-HK': '取消關注', 'zh-CN': '取消关注', en: 'Unfollow' },
  filter: { 'zh-HK': '篩選', 'zh-CN': '筛选', en: 'Filter' },
  more: { 'zh-HK': '更多', 'zh-CN': '更多', en: 'More' },
  categories: { 'zh-HK': '分類', 'zh-CN': '分类', en: 'Categories' },
  regions: { 'zh-HK': '地區', 'zh-CN': '地区', en: 'Regions' },
  sources: { 'zh-HK': '來源', 'zh-CN': '来源', en: 'Sources' },
  allSources: { 'zh-HK': '全部來源', 'zh-CN': '全部来源', en: 'All sources' },
  readOriginal: { 'zh-HK': '閱讀原文', 'zh-CN': '阅读原文', en: 'Read original' },
  related: { 'zh-HK': '相關頭條', 'zh-CN': '相关头条', en: 'Related' },
  coverage: { 'zh-HK': '各媒體報道', 'zh-CN': '各媒体报道', en: 'Coverage' },
  outlets: { 'zh-HK': '間媒體報道', 'zh-CN': '家媒体报道', en: 'outlets' },
  analysis: { 'zh-HK': '分析', 'zh-CN': '分析', en: 'Analysis' },
  breaking: { 'zh-HK': '快訊', 'zh-CN': '快讯', en: 'New' },
  saved: { 'zh-HK': '已收藏', 'zh-CN': '已收藏', en: 'Saved' },
  save: { 'zh-HK': '收藏', 'zh-CN': '收藏', en: 'Save' },
  loadMore: { 'zh-HK': '載入更多', 'zh-CN': '加载更多', en: 'Load more' },
  emptyFollow: { 'zh-HK': '仲未關注分類或來源。撳芯片上嘅「關注」開始。', 'zh-CN': '还没关注分类或来源。点芯片上的「关注」开始。', en: 'No follows yet. Tap Follow on a category or source.' },
  emptyBookmarks: { 'zh-HK': '仲未收藏頭條。', 'zh-CN': '还没收藏头条。', en: 'No saved headlines yet.' },
  emptyFilter: { 'zh-HK': '呢個篩選暫時冇頭條。', 'zh-CN': '这个筛选暂时没有头条。', en: 'No headlines match this filter.' },
  newHeadlines: { 'zh-HK': '則新頭條 · 更新', 'zh-CN': '则新头条 · 更新', en: 'new · Refresh' },
  digest: { 'zh-HK': '日報', 'zh-CN': '日报', en: 'Digest' },
  weekly: { 'zh-HK': '週報', 'zh-CN': '周报', en: 'Weekly' },
  hotAnalysis: { 'zh-HK': '熱門分析', 'zh-CN': '热门分析', en: 'Analysis' },
  todayPicks: { 'zh-HK': '今日精選', 'zh-CN': '今日精选', en: "Today's picks" },
  keywords: { 'zh-HK': '標題熱詞', 'zh-CN': '标题热词', en: 'Keywords' },
  multiCoverage: { 'zh-HK': '多方報道', 'zh-CN': '多方报道', en: 'Coverage' },
  layout: { 'zh-HK': '版面', 'zh-CN': '版面', en: 'Layout' },
  credit: { 'zh-HK': '標題來自', 'zh-CN': '标题来自', en: 'Headline from' },
  creditTail: { 'zh-HK': '。全文請到原文網站閱讀。', 'zh-CN': '。全文请到原文网站阅读。', en: '. Read the full story on the source site.' },
  aiBox: { 'zh-HK': '背景、各方說法、與香港的關係', 'zh-CN': '背景、各方说法、与香港的关系', en: 'Background, angles, and Hong Kong angle' },
  justNow: { 'zh-HK': '剛剛', 'zh-CN': '刚刚', en: 'Just now' },
  minutesAgo: { 'zh-HK': '分鐘前', 'zh-CN': '分钟前', en: 'm ago' },
  hoursAgo: { 'zh-HK': '小時前', 'zh-CN': '小时前', en: 'h ago' },
  daysAgo: { 'zh-HK': '日前', 'zh-CN': '日前', en: 'd ago' },
  mostRead: { 'zh-HK': '最多人睇', 'zh-CN': '最多人看', en: 'Most read' },
  majorUpdate: { 'zh-HK': '重大更新', 'zh-CN': '重大更新', en: 'Major update' },
  dismiss: { 'zh-HK': '關閉', 'zh-CN': '关闭', en: 'Dismiss' },
} as const;

export type LabelKey = keyof typeof LABELS;

export function t(key: LabelKey, lang: UiLang): string {
  return LABELS[key][lang];
}

export const CATEGORY_LABELS: Record<string, Record<UiLang, string>> = {
  all: { 'zh-HK': '全部', 'zh-CN': '全部', en: 'All' },
  hk: { 'zh-HK': '香港', 'zh-CN': '香港', en: 'Hong Kong' },
  china: { 'zh-HK': '中國', 'zh-CN': '中国', en: 'China' },
  asia: { 'zh-HK': '亞洲', 'zh-CN': '亚洲', en: 'Asia' },
  world: { 'zh-HK': '國際', 'zh-CN': '国际', en: 'World' },
  business: { 'zh-HK': '財經', 'zh-CN': '财经', en: 'Business' },
  tech: { 'zh-HK': '科技', 'zh-CN': '科技', en: 'Tech' },
  science: { 'zh-HK': '科學', 'zh-CN': '科学', en: 'Science' },
  health: { 'zh-HK': '健康', 'zh-CN': '健康', en: 'Health' },
  sport: { 'zh-HK': '體育', 'zh-CN': '体育', en: 'Sport' },
  entertainment: { 'zh-HK': '娛樂', 'zh-CN': '娱乐', en: 'Entertainment' },
};

export function categoryLabelI18n(id: string, lang: UiLang): string {
  return CATEGORY_LABELS[id]?.[lang] ?? id;
}
