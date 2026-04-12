import { useState } from 'react';
import { NewsItem } from '../types';
import { SOURCE_INFO } from '../data/sources';
import { formatDate } from '../utils/translate';
import { analytics } from '../utils/analytics';

interface Props {
  item: NewsItem;
  lang: string;
  bookmarkIds: Set<string>;       // 全域書籤集合（useNews 統一管理）
  toggleBookmark: (id: string) => void; // 全域 toggle（useNews 統一管理）
}

// ─── URL 安全校驗（防 XSS / open-redirect）───────────────────────
function safeUrl(link: string): string {
  return link && (link.startsWith('http://') || link.startsWith('https://'))
    ? link : '#';
}

export function NewsCard({ item, lang, bookmarkIds, toggleBookmark }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const info = SOURCE_INFO[item.source] || { label: item.source || 'News', color: '#666', region: '' };
  const bm = bookmarkIds.has(String(item.id));

  // 從 link 域名提取 favicon（Worker image_url 為空時的主要圖片）
  const domain = (() => {
    try {
      const u = new URL(item.link.startsWith('http') ? item.link : 'https://example.com');
      return u.hostname.replace('www.', '');
    } catch { return ''; }
  })();
  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : '';
  const hasImage = Boolean(item.imageUrl);

  // favicon + emoji 作為無文章圖時的視覺補償
  const showFavicon = !hasImage && Boolean(faviconUrl);
  const title = item.titleTL[lang] || item.title;
  const summary = item.summaryTL[lang] || item.summary;
  const isTranslated = !!item.titleTL[lang];
  const link = safeUrl(item.link);


  function handleShare() {
    const text = `${title} - ${item.source}`;
    if (navigator.share) {
      navigator.share({ title, text, url: link }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text}\n${link}`).catch(() => {});
    }
  }

  function handleBookmark() {
    const id = String(item.id);
    const wasBookmarked = bookmarkIds.has(id);
    toggleBookmark(id);
    if (!wasBookmarked) analytics.bookmarkAdd(item.title);
    else analytics.bookmarkRemove(item.title);
  }

  function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
    const seed = (item.id % 900) + 100;
    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${seed}/800/450`;
  }

  return (
    <div className="card">
      {(() => {
        const img = item.imageUrl;
        const seed = (item.id % 900) + 100;
        const fallbackSrc = `https://picsum.photos/seed/${seed}/800/450`;
        if (!img) {
          return (
            <div className="card-image-wrap card-img-empty">
              {showFavicon ? (
                <img
                  className="card-favicon-img"
                  src={faviconUrl}
                  alt={domain}
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="card-img-emoji">🌍</span>
              )}
            </div>
          );
        }
        return (
          <div className="card-image-wrap">
            <img
              className="card-image"
              src={img}
              alt={title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={e => {
                setImgLoaded(true);
                (e.target as HTMLImageElement).src = faviconUrl || fallbackSrc;
              }}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
          </div>
        );
      })()}

      <div className="card-meta">
        <span className="source-tag" style={{ background: info.color }}>{info.label}</span>
        {info.region && <span className="source-region">{info.region}</span>}
        <span className="card-time">{formatDate(item.pubDate)}</span>
        <div className="card-actions">
          <button
            className={`card-action-btn${bm ? ' bookmarked' : ''}`}
            onClick={handleBookmark}
            title={bm ? '移除收藏' : '加入收藏'}
          >
            {bm ? '★' : '☆'}
          </button>
          <button className="card-action-btn" onClick={handleShare} title="分享">↗</button>
        </div>
      </div>

      <div className="card-title">{title}</div>

      {isTranslated && (
        <div className="card-orig">原文: {item.title.slice(0, 60)}{item.title.length > 60 ? '…' : ''}</div>
      )}

      <div className={`card-summary${expanded ? ' expanded' : ''}`}>
        {summary}
      </div>

      {summary.length > 150 && (
        <button className="show-more-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ 收合' : '▼ 閱讀更多'}
        </button>
      )}

      <div className="card-footer">
        <a href={link} target="_blank" rel="noopener noreferrer" className="read-link"
            onClick={() => analytics.newsClick(item.title, item.source, link)}>
          閱讀原文 ↗
        </a>
      </div>
    </div>
  );
}
