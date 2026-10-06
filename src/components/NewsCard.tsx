import { categoryLabel } from '../../shared/categories';
import type { NewsItem } from '../../shared/types';
import { timeAgo } from '../utils/time';
import { safeUrl } from '../utils/url';
import { RegionIcon } from './RegionIcon';
import { StoryMedia } from './StoryMedia';

interface Props {
  item: NewsItem;
  title: string;
  bookmarked: boolean;
  onToggleBookmark: (item: NewsItem) => void;
  sourceCount?: number;
  featured?: boolean;
  compact?: boolean;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function NewsCard({ item, title, bookmarked, onToggleBookmark, sourceCount = 0, featured = false, compact = false }: Props) {
  const articleUrl = safeUrl(item.link);
  const sourceUrl = safeUrl(item.sourceUrl);
  const faviconHost = hostOf(sourceUrl || articleUrl);
  const fresh = item.pubDate && Date.now() - new Date(item.pubDate).getTime() < 60 * 60 * 1000;
  const className = featured ? 'story story-hero' : compact ? 'story story-compact' : 'story';

  const media = articleUrl ? (
    <a className="story-media" href={articleUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
      <StoryMedia item={item} eager={featured} />
    </a>
  ) : (
    <div className="story-media">
      <StoryMedia item={item} eager={featured} />
    </div>
  );

  return (
    <article className={className}>
      {media}
      <div className="story-body">
        {!compact && (
          <div className="story-kicker">
            <span className="kicker-region">
              <RegionIcon code={item.regions[0] ?? 'ALL'} />
              {categoryLabel(item.category ?? 'world')}
            </span>
            {fresh && <span className="breaking">快訊</span>}
          </div>
        )}
        <h2 className="story-title">
          {articleUrl ? (
            <a href={articleUrl} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          ) : (
            title
          )}
        </h2>
        <div className="story-meta">
          {faviconHost && (
            <img
              className="favicon"
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(faviconHost)}&sz=32`}
              width={16}
              height={16}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          {sourceUrl ? (
            <a className="source-tag" href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {item.source}
            </a>
          ) : (
            <span className="source-tag">{item.source}</span>
          )}
          {item.pubDate && <time dateTime={item.pubDate}>{timeAgo(item.pubDate)}</time>}
          {sourceCount >= 2 && <span className="cluster-badge">{sourceCount} 個來源報道</span>}
          {!compact && (
            <button
              type="button"
              className={bookmarked ? 'bookmark on' : 'bookmark'}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? `取消收藏：${item.title}` : `收藏：${item.title}`}
              onClick={() => onToggleBookmark(item)}
            >
              {bookmarked ? '已收藏' : '收藏'}
            </button>
          )}
        </div>
        {!compact && articleUrl && (
          <a className="read-original" href={articleUrl} target="_blank" rel="noopener noreferrer">
            閱讀原文
          </a>
        )}
        {!compact && <p className="card-credit">標題來自 {item.source}。全文請到原文網站閱讀。</p>}
      </div>
    </article>
  );
}
