import { useEffect, useMemo, useState } from 'react';
import { filterNews } from '../shared/filter';
import { REGIONS, sourcesForRegion } from '../shared/feeds';
import type { NewsItem, TimeRange } from '../shared/types';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { LanguageSelector } from './components/LanguageSelector';
import { NewsCard } from './components/NewsCard';
import { SkeletonCard } from './components/SkeletonCard';
import { SITE_NAME, SITE_URL } from './config';
import { useBookmarks } from './hooks/useBookmarks';
import { useNews } from './hooks/useNews';
import { translateTitles } from './utils/translate';
import './App.css';

const TIMES: { id: TimeRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'hour', label: '1小時' },
  { id: 'today', label: '今天' },
  { id: 'week', label: '本週' },
];

function initialRegion() {
  const code = new URLSearchParams(window.location.search).get('region') ?? '';
  return REGIONS.some((region) => region.code === code) ? code : 'ALL';
}

export default function App() {
  const { items, loading, error, partial, stale, refresh } = useNews();
  const { items: bookmarks, ids: bookmarkIds, toggle } = useBookmarks();
  const [region, setRegion] = useState(initialRegion);
  const [source, setSource] = useState('');
  const [time, setTime] = useState<TimeRange>('all');
  const [query, setQuery] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('wn_lang') || 'zh-TW');
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [translated, setTranslated] = useState<Record<string, string>>({});

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('wn_lang', lang);
  }, [lang]);

  const sources = sourcesForRegion(region);
  const base = showBookmarks ? bookmarks : items;
  const visible = useMemo(
    () =>
      filterNews(base, {
        region: showBookmarks ? 'ALL' : region,
        source: showBookmarks ? '' : source,
        q: query,
        time: showBookmarks ? 'all' : time,
      }),
    [base, region, source, query, time, showBookmarks],
  );

  useEffect(() => {
    let cancelled = false;
    if (lang === 'en' || visible.length === 0) {
      setTranslated({});
      return;
    }
    void translateTitles(
      visible.slice(0, 40).map((item) => ({ id: item.id, title: item.title })),
      lang,
    ).then((map) => {
      if (!cancelled) setTranslated(map);
    });
    return () => {
      cancelled = true;
    };
  }, [lang, visible]);

  function chooseRegion(code: string) {
    setRegion(code);
    setSource('');
    setShowBookmarks(false);
    const url = new URL(window.location.href);
    if (code === 'ALL') url.searchParams.delete('region');
    else url.searchParams.set('region', code);
    window.history.replaceState({}, '', url);
  }

  function share() {
    const url = SITE_URL;
    const text = `${SITE_NAME}：${url}`;
    if (navigator.share) {
      void navigator.share({ title: SITE_NAME, text, url }).catch(() => undefined);
      return;
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  const emptyMessage = showBookmarks
    ? '還沒有收藏。在頭條上按「收藏」就會留在這裡。'
    : query
      ? `沒有符合「${query}」的頭條。`
      : '這個篩選暫時沒有頭條。可以換地區、來源或時間。';

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#news">
        跳到頭條
      </a>
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <h1>{SITE_NAME}</h1>
            <p>只顯示標題、來源同原文連結</p>
          </div>
          <div className="header-actions">
            <button type="button" className="icon-btn" onClick={() => void refresh()} disabled={loading}>
              {loading ? '載入中' : '重新整理'}
            </button>
            <DarkModeToggle checked={dark} onChange={setDark} />
            <button
              type="button"
              className={showBookmarks ? 'icon-btn active' : 'icon-btn'}
              aria-pressed={showBookmarks}
              onClick={() => setShowBookmarks((value) => !value)}
            >
              收藏{bookmarkIds.size > 0 ? ` ${bookmarkIds.size}` : ''}
            </button>
            <LanguageSelector value={lang} onChange={setLang} />
          </div>
        </header>

        <form className="search-bar" role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="news-search">搜尋頭條</label>
          <input
            id="news-search"
            value={query}
            placeholder="搜尋標題或來源"
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <div className="filters" aria-label="地區">
          {REGIONS.map((item) => (
            <button
              type="button"
              key={item.code}
              className={region === item.code && !showBookmarks ? 'chip active' : 'chip'}
              aria-pressed={region === item.code && !showBookmarks}
              onClick={() => chooseRegion(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="filters" aria-label="來源">
          <button
            type="button"
            className={source === '' && !showBookmarks ? 'chip active' : 'chip'}
            aria-pressed={source === ''}
            onClick={() => {
              setSource('');
              setShowBookmarks(false);
            }}
          >
            全部來源
          </button>
          {sources.map((name) => (
            <button
              type="button"
              key={name}
              className={source === name && !showBookmarks ? 'chip active' : 'chip'}
              aria-pressed={source === name && !showBookmarks}
              onClick={() => {
                setSource(name);
                setShowBookmarks(false);
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {!showBookmarks && (
          <div className="filters" aria-label="時間">
            {TIMES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={time === item.id ? 'chip active' : 'chip'}
                aria-pressed={time === item.id}
                onClick={() => setTime(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <main id="news">
          {loading && !showBookmarks ? (
            <div className="news-grid" aria-busy="true" aria-live="polite">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : error && !showBookmarks ? (
            <div className="status-panel" role="alert">
              <h2>暫時沒有頭條</h2>
              <p>{error}</p>
              <button type="button" className="primary" onClick={() => void refresh()}>
                再試一次
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="status-panel">
              <h2>沒有符合的頭條</h2>
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <>
              {(partial || stale) && !showBookmarks && (
                <p className="notice" role="status">
                  {stale ? '部分來源暫時連不上，以下是較早儲存的標題。' : '部分來源暫時沒有回應，其餘頭條仍可閱讀。'}
                </p>
              )}
              <div className="news-grid">
                {visible.map((item: NewsItem) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    title={translated[item.id] || item.title}
                    bookmarked={bookmarkIds.has(item.id)}
                    onToggleBookmark={toggle}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <div className="share-row">
          <button type="button" className="primary" onClick={share}>
            分享這個網站
          </button>
        </div>

        <footer className="app-footer">
          <p>
            {SITE_NAME} 只列出標題同出處連結，不轉載內文。
            <a href={SITE_URL}> {SITE_URL.replace('https://', '')}</a>
          </p>
        </footer>
        <InstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
