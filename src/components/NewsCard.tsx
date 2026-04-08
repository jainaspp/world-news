import { useState } from 'react';
import { NewsItem } from '../types';
import { SOURCE_INFO } from '../data/sources';
import { formatDate, toggleBookmark } from '../utils/translate';

interface Props { item: NewsItem; lang: string; onBookmarkChange: () => void; }

// ─── URL 安全校驗（防 XSS / open-redirect）───────────────────────
function safeUrl(link: string): string {
  return link && (link.startsWith('http://') || link.startsWith('https://'))
    ? link : '#';
}

export function NewsCard({ item, lang, onBookmarkChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const info = SOURCE_INFO[item.source] || { label: item.source || 'News', color: '#666', region: '' };
  const title = item.titleTL[lang] || item.title;
  const summary = item.summaryTL[lang] || item.summary;
  const isTranslated = !!item.titleTL[lang];
  const link = safeUrl(item.link);

  const isBookmarked = (id: number | string) => {
    try { return JSON.parse(localStorage.getItem('wn_bookmarks') || '[]').includes(String(id)); }
    catch { return false; }
  };
  const [bm, setBm] = useState(() => isBookmarked(item.id));

  function handleShare() {
    const text = `${title} - ${item.source}`;
    if (navigator.share) {
      navigator.share({ title, text, url: link }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text}\n${link}`).catch(() => {});
    }
  }

  function handleBookmark() {
    const added = toggleBookmark(String(item.id));
    setBm(added);
    onBookmarkChange();
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
          // 無圖時：純色漸層 + 大emoji，無img標籤
          return (
            <div className="card-image-wrap card-img-empty">
              <span className="card-img-emoji">🌍</span>
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
              onError={e => {
                (e.target as HTMLImageElement).src = fallbackSrc;
              }}
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
        <a href={link} target="_blank" rel="noopener noreferrer" className="read-link">
          閱讀原文 ↗
        </a>
      </div>
    </div>
  );
}
