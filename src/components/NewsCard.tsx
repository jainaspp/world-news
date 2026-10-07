import type { ClusterMember } from '../../shared/angles';
import type { NewsItem } from '../../shared/types';
import { titleLang, type UiLang } from '../../shared/zh';
import { categoryLabelI18n, t } from '../../shared/i18n';
import { timeAgo } from '../utils/time';
import { trackRead } from '../utils/trackRead';
import { safeUrl } from '../utils/url';
import { RegionIcon } from './RegionIcon';
import { StoryMedia } from './StoryMedia';

interface Props {
  item: NewsItem;
  title: string;
  bookmarked: boolean;
  onToggleBookmark: (item: NewsItem) => void;
  sourceCount?: number;
  analysisHref?: string;
  featured?: boolean;
  compact?: boolean;
  lang?: UiLang;
  followedSource?: boolean;
  onToggleSource?: (source: string) => void;
  breaking?: boolean;
  angles?: ClusterMember[];
  arriving?: boolean;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function NewsCard({
  item,
  title,
  bookmarked,
  onToggleBookmark,
  sourceCount = 0,
  analysisHref = '',
  featured = false,
  compact = false,
  lang = 'zh-HK',
  followedSource = false,
  onToggleSource,
  breaking = false,
  angles = [],
  arriving = false,
}: Props) {
  const articleUrl = safeUrl(item.link);
  const sourceUrl = safeUrl(item.sourceUrl);
  const faviconHost = hostOf(sourceUrl || articleUrl);
  const script = titleLang(title);
  const titleLangAttr = script === 'zh' ? (lang === 'zh-CN' ? 'zh-CN' : 'zh-HK') : script;
  const className = `${featured ? 'story story-hero' : compact ? 'story story-compact' : 'story'}${arriving ? ' story-arrive' : ''}`;
  const others = angles.filter((row) => row.id !== item.id && row.source !== item.source);
  const extra = new Set(others.map((row) => row.source)).size;
  const moreLabel = lang === 'en' ? `${extra} other outlets` : lang === 'zh-CN' ? `另有 ${extra} 家媒体报道` : `另有 ${extra} 間媒體報道`;
  const openStory = () => trackRead(item.id);

  const media = articleUrl ? (
    <a className="story-media" href={articleUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" onClick={openStory}>
      <StoryMedia item={item} eager={featured} />
    </a>
  ) : (
    <div className="story-media">
      <StoryMedia item={item} eager={featured} />
    </div>
  );

  return (
    <article className={className} data-story-id={item.id}>
      {media}
      <div className="story-body">
        {!compact && (
          <div className="story-kicker">
            <span className="kicker-region">
              <RegionIcon code={item.regions[0] ?? 'ALL'} />
              {categoryLabelI18n(item.category ?? 'world', lang)}
            </span>
            {breaking && <span className="breaking">{t('breaking', lang)}</span>}
          </div>
        )}
        <h2 className={script === 'zh' ? 'story-title' : 'story-title title-sans'} lang={titleLangAttr}>
          {articleUrl ? (
            <a href={articleUrl} target="_blank" rel="noopener noreferrer" onClick={openStory}>
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
          {onToggleSource && (
            <button
              type="button"
              className={followedSource ? 'follow-mini source-follow on' : 'follow-mini source-follow'}
              aria-pressed={followedSource}
              aria-label={followedSource ? `${t('unfollow', lang)} ${item.source}` : `${t('follow', lang)} ${item.source}`}
              onClick={() => onToggleSource(item.source)}
            >
              {followedSource ? '★' : '☆'}
            </button>
          )}
          {item.pubDate && <time dateTime={item.pubDate}>{timeAgo(item.pubDate)}</time>}
          {extra === 0 && sourceCount >= 2 && (
            <a className="cluster-badge cluster-link" href={`/story/${item.id}/`} aria-label={`${sourceCount} ${t('outlets', lang)}`}>
              {sourceCount} {t('outlets', lang)} →
            </a>
          )}
          {!featured && analysisHref && (
            <a className="analysis-link" href={analysisHref}>
              {t('analysis', lang)}
            </a>
          )}
          {!compact && (
            <button
              type="button"
              className={bookmarked ? 'bookmark on' : 'bookmark'}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? `${t('saved', lang)}：${item.title}` : `${t('save', lang)}：${item.title}`}
              onClick={() => onToggleBookmark(item)}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1z" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        {extra > 0 && (
          <details className="angle-more">
            <summary>{moreLabel}</summary>
            <ul>
              {others.map((row) => (
                <li key={row.id}>
                  <a href={safeUrl(row.link) || `/story/${row.id}/`} target="_blank" rel="noopener noreferrer" onClick={() => trackRead(row.id)}>
                    <strong>{row.source}</strong> {row.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {!compact && articleUrl && (
          <div className="card-links">
            <a className="read-original" href={articleUrl} target="_blank" rel="noopener noreferrer" onClick={openStory}>
              {t('readOriginal', lang)}
            </a>
            <a className="read-original story-link" href={`/story/${item.id}/`}>
              {sourceCount >= 2 ? t('coverage', lang) : t('related', lang)}
            </a>
          </div>
        )}
        {!compact && (
          <p className="card-credit">
            {t('credit', lang)} {item.source}
            {t('creditTail', lang)}
          </p>
        )}
        {featured && analysisHref && (
          <a className="analysis-box" href={analysisHref}>
            <span className="badge">AI</span>
            {t('aiBox', lang)}
          </a>
        )}
      </div>
    </article>
  );
}
