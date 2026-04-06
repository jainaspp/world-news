export interface NewsItem {
  id: number;
  title: string;
  titleTL: Record<string, string>;
  summary: string;
  summaryTL: Record<string, string>;
  link: string;
  source: string;
  pubDate: string;
  imageUrl?: string;
}
