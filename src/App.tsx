import { useEffect, useMemo, useState } from 'react';
import { analysisSlug } from '../shared/content';
import { categoryLabel, CATEGORIES } from '../shared/categories';
import { filterNews } from '../shared/filter';
import { REGIONS, sourcesForRegion } from '../shared/feeds';
import { clusterStories, sourceCounts } from '../shared/trending';
import type { NewsItem, TimeRange } from '../shared/types';
import { AdSlot } from './components/AdSlot';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { LanguageSelector } from './components/LanguageSelector';
import { NewsCard } from './components/NewsCard';
import { RegionIcon } from './components/RegionIcon';
import { SkeletonCard } from './components/SkeletonCard';
import { AD_SLOT_FEED, AD_SLOT_TOP, SITE_NAME, SITE_URL } from './config';
import { useBookmarks } from './hooks/useBookmarks';
import { useNews } from './hooks/useNews';
import { readView, viewHref, type ViewState } from './routing';
import './App.css';

const TIMES: { id: TimeRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'hour', label: '1小時' },
  { id: 'today', label: '今天' },
  { id: 'week', label: '本週' },
];

const PAGE_SIZE = 12;

function useWide(query: string) {
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return wide;
}

function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="logo-word">{SITE_NAME}</span>;
  return (
    <>
      <img className="logo-full logo-light" src="/brand/logo.svg" alt="" onError={() => setFailed(true)} />
      <img className="logo-full logo-dark" src="/brand/logo-dark.svg" alt="" />
      <img className="logo-compact logo-light" src="/brand/logo-compact.svg" alt="" />
      <img className="logo-compact logo-dark" src="/brand/logo-compact-dark.svg" alt="" />
    </>
  );
}

export default function App() {
  const { items, loading, error, partial, stale, refresh } = useNews();
  const { items: bookmarks, ids: bookmarkIds, toggle } = useBookmarks();
  const [view, setView] = useState<ViewState>(readView);
  const [lang, setLang] = useState(() => localStorage.getItem('wn_lang') || 'zh-TW');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [searchHits, setSearchHits] = useState<Set<string> | null>(null);
  const [shownState, setShownState] = useState({ key: '', count: PAGE_SIZE });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const wide = useWide('(min-width: 1200px)');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute('content', dark ? '#0E141C' : '#1D4F91');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('wn_lang', lang);
  }, [lang]);

  useEffect(() => {
    const onPop = () => setView(readView());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(next: ViewState, mode: 'push' | 'replace' = 'push') {
    setView(next);
    const href = viewHref(next);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href === current) return;
    if (mode === 'push') window.history.pushState({}, '', href);
    else window.history.replaceState({}, '', href);
  }

  const sources = sourcesForRegion(view.region);
  const base = view.bookmarks ? bookmarks : items;
  const scoped = useMemo(
    () =>
      filterNews(base, {
        region: view.bookmarks ? 'ALL' : view.region,
        source: view.bookmarks ? '' : view.source,
        category: view.bookmarks ? 'all' : view.category,
        q: '',
        time: view.bookmarks ? 'all' : view.time,
      }),
    [base, view],
  );

  useEffect(() => {
    const query = view.q.trim();
    if (!query) {
      setSearchHits(null);
      return;
    }
    let cancel = false;
    void import('./search').then(({ createSearch }) => {
      if (cancel) return;
      const ids = createSearch(scoped.map((item) => ({ id: item.id, title: item.title, source: item.source }))).search(query);
      setSearchHits(new Set(ids));
    });
    return () => {
      cancel = true;
    };
  }, [scoped, view.q]);

  const visible = useMemo(() => {
    const query = view.q.trim().toLowerCase();
    if (!query) return scoped;
    return scoped.filter((item) => {
      const text = `${item.title} ${item.source}`.toLowerCase().includes(query);
      if (!searchHits) return text;
      return searchHits.has(item.id) || text;
    });
  }, [scoped, searchHits, view.q]);

  const filterKey = `${view.region}|${view.category}|${view.source}|${view.time}|${view.q}|${view.bookmarks}`;
  const shown = shownState.key === filterKey ? shownState.count : PAGE_SIZE;
  const listed = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const clusters = useMemo(() => (view.bookmarks ? [] : clusterStories(scoped)), [scoped, view.bookmarks]);
  const counts = useMemo(() => sourceCounts(clusters), [clusters]);
  const analysisHrefs = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of clusters) {
      if (cluster.count < 3) continue;
      const href = `/analysis/${analysisSlug(cluster.lead.title)}/`;
      for (const item of cluster.items) map.set(item.id, href);
    }
    return map;
  }, [clusters]);
  const hero = listed[0];
  const rest = listed.slice(1);
  const deskLead = wide && !view.bookmarks;
  const secondary = deskLead ? rest.slice(0, 4) : [];
  const gridItems = deskLead ? rest.slice(4) : rest;
  const filtersActive = view.time !== 'all' || view.source !== '' || view.region !== 'ALL';

  useEffect(() => {
    let cancel = false;
    if (lang === 'en' || listed.length === 0) {
      setTranslated({});
      return;
    }
    const timer = window.setTimeout(() => {
      void import('./utils/translate').then(({ translateTitles }) =>
        translateTitles(
          listed.map((item) => ({ id: item.id, title: item.title })),
          lang,
        ).then((map) => {
          if (!cancel) setTranslated(map);
        }),
      );
    }, 2000);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [lang, listed]);

  useEffect(() => {
    const query = view.q.trim();
    document.title = query ? `搜尋「${query}」 — ${SITE_NAME}` : `${SITE_NAME} — 新聞標題、來源、原文連結`;
    const top = (view.bookmarks ? visible : items).slice(0, 10);
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: SITE_NAME,
      itemListElement: top.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: item.link,
        ...(item.image ? { image: item.image } : {}),
      })),
    };
    const node = document.getElementById('ld-stories');
    if (node) node.textContent = JSON.stringify(data);
  }, [items, view.bookmarks, view.q, visible]);

  const emptyMessage = view.bookmarks
    ? '還沒有收藏。在頭條上按「收藏」就會留在這裡。'
    : view.q
      ? `沒有符合「${view.q}」的頭條。`
      : '這個篩選暫時沒有頭條。可以換分類、地區或時間。';

  const showTopAd = !view.bookmarks && !wide && Boolean(hero);
  const showSideAd = !view.bookmarks && wide && Boolean(hero);

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#news">
        跳到頭條
      </a>
      <div className="page">
        <div className="chrome">
          <header className="masthead">
            <h1 className="masthead-title">
              <a className="logo-link" href="/" aria-label={SITE_NAME} onClick={(event) => {
                event.preventDefault();
                go({ region: 'ALL', category: 'all', source: '', q: '', time: 'all', bookmarks: false });
              }}>
                <Logo />
              </a>
            </h1>
            <form className={searchOpen ? 'search-bar open' : 'search-bar'} role="search" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="news-search">搜尋</label>
              <button type="button" className="icon-btn search-toggle" aria-label="搜尋" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
              <input
                id="news-search"
                value={view.q}
                placeholder="搜尋"
                onChange={(event) => go({ ...view, q: event.target.value }, 'replace')}
              />
            </form>
            <div className="header-actions">
              <button type="button" className="icon-btn" aria-label="重新整理" onClick={() => void refresh()} disabled={loading}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.2-5.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <DarkModeToggle checked={dark} onChange={setDark} />
              <button
                type="button"
                className={view.bookmarks ? 'icon-btn active' : 'icon-btn'}
                aria-pressed={view.bookmarks}
                aria-label={bookmarkIds.size > 0 ? `收藏 ${bookmarkIds.size}` : '收藏'}
                onClick={() => go({ ...view, bookmarks: !view.bookmarks })}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1z" fill={view.bookmarks ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                </svg>
                {bookmarkIds.size > 0 && <span className="count-badge">{bookmarkIds.size}</span>}
              </button>
              <LanguageSelector value={lang} onChange={setLang} />
            </div>
          </header>

          <div className="tab-bar">
            <button
              type="button"
              className={filtersOpen || filtersActive ? 'chip active' : 'chip'}
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              篩選
            </button>
            <nav className="filters" aria-label="分類">
              {CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={view.category === category.id && !view.bookmarks ? 'chip active' : 'chip'}
                  aria-pressed={view.category === category.id && !view.bookmarks}
                  onClick={() => go({ ...view, category: category.id, source: '', bookmarks: false })}
                >
                  {category.label}
                </button>
              ))}
              <a className="chip" href="/digest/">日報</a>
              <a className="chip" href="/weekly/">週報</a>
            </nav>
          </div>

          {filtersOpen && !view.bookmarks && (
            <div className="filter-panel" id="filter-panel">
              <nav className="filters" aria-label="時間">
                {TIMES.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={view.time === item.id ? 'chip active' : 'chip'}
                    aria-pressed={view.time === item.id}
                    onClick={() => go({ ...view, time: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <nav className="filters" aria-label="來源">
                <button
                  type="button"
                  className={view.source === '' ? 'chip active' : 'chip'}
                  aria-pressed={view.source === ''}
                  onClick={() => go({ ...view, source: '' })}
                >
                  全部來源
                </button>
                {sources.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={view.source === name ? 'chip active' : 'chip'}
                    aria-pressed={view.source === name}
                    onClick={() => go({ ...view, source: name, bookmarks: false })}
                  >
                    {name}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {!view.bookmarks && (
            <nav className="filters filters-slim" aria-label="地區">
              {REGIONS.map((region) => (
                <button
                  type="button"
                  key={region.code}
                  className={view.region === region.code ? 'chip active' : 'chip'}
                  aria-pressed={view.region === region.code}
                  onClick={() => go({ ...view, region: region.code, source: '', bookmarks: false })}
                >
                  <RegionIcon code={region.code} />
                  {region.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="layout">
          <main id="news">
            {loading && !view.bookmarks ? (
              <div className="news-grid" aria-busy="true" aria-live="polite">
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : error && !view.bookmarks ? (
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
                {(partial || stale) && !view.bookmarks && (
                  <p className="notice" role="status">
                    {stale ? '部分來源暫時連不上，以下是較早儲存的標題。' : '部分來源暫時沒有回應，其餘頭條仍可閱讀。'}
                  </p>
                )}
                {showTopAd && <AdSlot slot={AD_SLOT_TOP} variant="banner" />}
                {!view.bookmarks && (
                  <aside className="digest-strip">
                    <span className="badge">AI 整合</span>
                    <a href="/digest/">今日精選</a>
                    <a href="/weekly/">一週科技 · 一週財經</a>
                  </aside>
                )}
                {(hero || secondary.length > 0) && (
                  <div className="top-stories">
                    {hero && (
                      <NewsCard
                        item={hero}
                        title={translated[hero.id] || hero.title}
                        bookmarked={bookmarkIds.has(hero.id)}
                        onToggleBookmark={toggle}
                        sourceCount={counts.get(hero.id) ?? 0}
                        analysisHref={analysisHrefs.get(hero.id) || ''}
                        featured
                      />
                    )}
                    {secondary.length > 0 && (
                      <div className="secondary-list">
                        {secondary.map((item) => (
                          <NewsCard
                            key={item.id}
                            item={item}
                            title={translated[item.id] || item.title}
                            bookmarked={bookmarkIds.has(item.id)}
                            onToggleBookmark={toggle}
                            sourceCount={counts.get(item.id) ?? 0}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="news-grid">
                  {gridItems.flatMap((item: NewsItem, index) => {
                    const card = (
                      <NewsCard
                        key={item.id}
                        item={item}
                        title={translated[item.id] || item.title}
                        bookmarked={bookmarkIds.has(item.id)}
                        onToggleBookmark={toggle}
                        sourceCount={counts.get(item.id) ?? 0}
                      />
                    );
                    if (view.bookmarks || !AD_SLOT_FEED || (index + 1) % 8 !== 0) return [card];
                    return [card, <AdSlot key={`feed-${item.id}`} slot={AD_SLOT_FEED} variant="feed" />];
                  })}
                </div>
                {shown < visible.length && (
                  <button type="button" className="primary more" onClick={() => setShownState({ key: filterKey, count: shown + PAGE_SIZE })}>
                    顯示更多（還有 {visible.length - shown} 則）
                  </button>
                )}
              </>
            )}
          </main>
          <aside className="sidebar" aria-label="側欄">
            {!view.bookmarks && !view.q.trim() && clusters.length > 0 && (
              <section className="trending" aria-label="熱門">
                <h2>熱門</h2>
                <ol>
                  {clusters.slice(0, 5).map((cluster, index) => (
                    <li key={cluster.id}>
                      <span className="rank">{index + 1}</span>
                      <div>
                        <a href={cluster.lead.link} target="_blank" rel="noopener noreferrer">
                          {translated[cluster.lead.id] || cluster.lead.title}
                        </a>
                        <span className="cluster-badge">{cluster.count} 個來源報道</span>
                        {cluster.count >= 3 && (
                          <a className="analysis-box" href={`/analysis/${analysisSlug(cluster.lead.title)}/`}>
                            <span className="badge">AI 整合</span>
                            背景、各方說法、與香港的關係
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {showSideAd && <AdSlot slot={AD_SLOT_TOP} variant="sidebar" />}
            <div className="side-card">
              <h2>今次版面</h2>
              <p>
                {view.bookmarks ? '收藏' : categoryLabel(view.category)}
                {view.region !== 'ALL' ? ` · ${REGIONS.find((region) => region.code === view.region)?.label}` : ''}
              </p>
              <p className="card-credit">只列標題、來源同原文連結，不轉載內文。</p>
            </div>
          </aside>
        </div>

        <div className="share-row">
          <button
            type="button"
            className="primary"
            onClick={() => {
              const url = `${SITE_URL}${viewHref(view)}`;
              const text = `${SITE_NAME}：${url}`;
              if (navigator.share) {
                void navigator.share({ title: SITE_NAME, text, url }).catch(() => undefined);
                return;
              }
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
            }}
          >
            分享這個版面
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
