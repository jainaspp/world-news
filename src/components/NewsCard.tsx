import type { NewsItem } from '../../shared/types';
import { timeAgo } from '../utils/time';
import { safeUrl } from '../utils/url';

interface Props {
  item: NewsItem;
  title: string;
  bookmarked: boolean;
  onToggleBookmark: (item: NewsItem) => void;
}

export function NewsCard({ item, title, bookmarked, onToggleBookmark }: Props) {
  const articleUrl = safeUrl(item.link);
  const sourceUrl = safeUrl(item.sourceUrl);

  return (
    <article className="card">
      <div className="card-meta">
        {sourceUrl ? (
          <a className="source-tag" href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {item.source}
          </a>
        ) : (
          <span className="source-tag">{item.source}</span>
        )}
        {item.pubDate && <time dateTime={item.pubDate}>{timeAgo(item.pubDate)}</time>}
        <button
          type="button"
          className={bookmarked ? 'bookmark on' : 'bookmark'}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `取消收藏：${item.title}` : `收藏：${item.title}`}
          onClick={() => onToggleBookmark(item)}
        >
          {bookmarked ? '已收藏' : '收藏'}
        </button>
      </div>
      <h2 className="card-title">
        {articleUrl ? (
          <a href={articleUrl} target="_blank" rel="noopener noreferrer">
            {title}
          </a>
        ) : (
          title
        )}
      </h2>
      <p className="card-credit">標題來自 {item.source}。全文請到原文網站閱讀。</p>
    </article>
  );
}
