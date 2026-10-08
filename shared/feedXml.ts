export interface FeedEntry {
  title: string;
  href: string;
  summary: string;
  publishedAt: string;
}

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] || char
  ));
}

function rfc822(iso: string): string {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return new Date(0).toUTCString();
  return time.toUTCString();
}

/** RSS 2.0 for briefings and explainers. Read-only. */
export function renderFeed(entries: FeedEntry[], now = new Date()): string {
  const items = entries.slice(0, 40).map((entry) => `    <item>
      <title>${xml(entry.title)}</title>
      <link>${xml(entry.href)}</link>
      <guid isPermaLink="true">${xml(entry.href)}</guid>
      <pubDate>${xml(rfc822(entry.publishedAt))}</pubDate>
      <description>${xml(entry.summary)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>世界頭條</title>
    <link>https://world-news.xyz/</link>
    <description>每日導讀與新聞懶人包。</description>
    <language>zh-HK</language>
    <lastBuildDate>${xml(now.toUTCString())}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
