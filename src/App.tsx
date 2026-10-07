import { useEffect, useMemo, useState } from 'react';
import { breakingIds } from '../shared/breaking';
import { analysisSlug } from '../shared/content';
import { CATEGORIES } from '../shared/categories';
import { filterNews } from '../shared/filter';
import { REGIONS, sourcesForRegion } from '../shared/feeds';
import { categoryLabelI18n, t } from '../shared/i18n';
import type { ClusterMember } from '../shared/angles';
import { clusterStories, sourceCounts } from '../shared/trending';
import { displayTitle, normalizeLang, type UiLang } from '../shared/zh';
import type { NewsItem, TimeRange } from '../shared/types';
import { FEED_AD_EVERY, homeAllowsAds } from '../shared/adPolicy';
import { HOME_INTRO, HOME_SECTIONS } from '../shared/homeCopy';
import { FOOTER_LINKS } from '../shared/siteNav';
import { AdSlot } from './components/AdSlot';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageSelector } from './components/LanguageSelector';
import { NewsCard } from './components/NewsCard';
import { RegionIcon } from './components/RegionIcon';
import { SkeletonCard } from './components/SkeletonCard';
import { BackToTop } from './components/BackToTop';
import { AlertRow } from './components/AlertRow';
import { HkInfoStrip } from './components/HkInfoStrip';
import { MajorBanner } from './components/MajorBanner';
import { BoardToggles } from './components/BoardToggles';
import { MostRead } from './components/MostRead';
import { TrendingTopics } from './components/TrendingTopics';
import { trendingTopics } from '../shared/topics';
import { AD_SLOT_FEED, AD_SLOT_TOP, SITE_NAME, SITE_URL } from './config';
import { usePopular } from './hooks/useBoard';
import { useBoardPrefs } from './hooks/useBoardPrefs';
import { useBookmarks } from './hooks/useBookmarks';
import { useFollows } from './hooks/useFollows';
import { useNews } from './hooks/useNews';
import { readView, viewHref, type ViewState } from './routing';
import './App.css';

const TIMES: { id: TimeRange; labelKey: 'all' | 'hour' | 'today' | 'week' }[] = [
  { id: 'all', labelKey: 'all' },
  { id: 'hour', labelKey: 'hour' },
  { id: 'today', labelKey: 'today' },
  { id: 'week', labelKey: 'week' },
];

const TIME_LABEL: Record<string, Record<UiLang, string>> = {
  all: { 'zh-HK': '全部', 'zh-CN': '全部', en: 'All' },
  hour: { 'zh-HK': '1小時', 'zh-CN': '1小时', en: '1h' },
  today: { 'zh-HK': '今天', 'zh-CN': '今天', en: 'Today' },
  week: { 'zh-HK': '本週', 'zh-CN': '本周', en: 'Week' },
};

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

const clearSpecial = { bookmarks: false, following: false };

export default function App() {
  const { items, loading, error, partial, stale, refresh, freshCount, showPending, pending } = useNews();
  const { items: bookmarks, ids: bookmarkIds, toggle } = useBookmarks();
  const follows = useFollows();
  const [view, setView] = useState<ViewState>(readView);
  const [lang, setLang] = useState<UiLang>(() => normalizeLang(localStorage.getItem('wn_lang')));
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [searchHits, setSearchHits] = useState<Set<string> | null>(null);
  const [shownState, setShownState] = useState({ key: '', count: PAGE_SIZE });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const board = useBoardPrefs();
  const wide = useWide('(min-width: 1200px)');
  const topics = useMemo(() => trendingTopics(items), [items]);
  const showBlocks = !(view.bookmarks || view.following);
  const popular = usePopular(showBlocks && board.prefs.mostRead);
  const angleMap = useMemo(() => {
    const map = new Map<string, ClusterMember[]>();
    for (const cluster of clusterStories(items)) {
      const members: ClusterMember[] = cluster.items.slice(0, 8).map((row) => ({
        id: row.id,
        source: row.source,
        title: row.title,
        link: row.link,
        pubDate: row.pubDate,
      }));
      for (const member of members) map.set(member.id, members);
    }
    return map;
  }, [items]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute('content', dark ? '#0E141C' : '#1D4F91');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('wn_lang', lang);
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'zh-CN' ? 'zh-CN' : 'zh-HK';
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
  const scoped = useMemo(() => {
    let rows = filterNews(base, {
      region: view.bookmarks || view.following ? 'ALL' : view.region,
      source: view.bookmarks || view.following ? '' : view.source,
      category: view.bookmarks || view.following ? 'all' : view.category,
      q: '',
      time: view.bookmarks || view.following ? 'all' : view.time,
    });
    if (view.following) rows = rows.filter((item) => follows.matches(item));
    return rows;
  }, [base, view, follows]);

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

  const filterKey = `${view.region}|${view.category}|${view.source}|${view.time}|${view.q}|${view.bookmarks}|${view.following}`;
  const shown = shownState.key === filterKey ? shownState.count : PAGE_SIZE;
  const listed = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const clusters = useMemo(() => (view.bookmarks || view.following ? [] : clusterStories(scoped)), [scoped, view.bookmarks, view.following]);
  const counts = useMemo(() => sourceCounts(clusters.length ? clusters : clusterStories(items)), [clusters, items]);
  const analysisHrefs = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of clusterStories(items)) {
      if (cluster.count < 3) continue;
      const href = `/analysis/${analysisSlug(cluster.lead.title)}/`;
      for (const item of cluster.items) map.set(item.id, href);
    }
    return map;
  }, [items]);
  const hero = listed[0];
  const rest = listed.slice(1);
  const deskLead = wide && !view.bookmarks && !view.following;
  const secondary = deskLead ? rest.slice(0, 4) : [];
  const gridItems = deskLead ? rest.slice(4) : rest;
  const special = view.bookmarks || view.following;
  const filtersActive = view.source !== '' || view.region !== 'ALL' || (view.category !== 'all' && !special);
  const breaking = useMemo(() => breakingIds(hero ? [hero, ...gridItems] : gridItems), [hero, gridItems]);
  const followFresh = useMemo(() => {
    if (!pending || !follows.count) return 0;
    return pending.filter((item) => follows.matches(item) && !items.some((row) => row.id === item.id)).length;
  }, [pending, follows, items]);

  useEffect(() => {
    const query = view.q.trim();
    document.title = query ? `${t('search', lang)}「${query}」 — ${SITE_NAME}` : `${SITE_NAME} — 新聞標題、來源、原文連結`;
    const canonical = document.querySelector('link[rel="canonical"]');
    const path = query || view.bookmarks || view.following || view.source || view.time !== 'all' ? '/' : viewHref(view);
    canonical?.setAttribute('href', `${SITE_URL}${path === '' ? '/' : path}`);
    const top = (view.bookmarks || view.following ? visible : items).slice(0, 10);
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: SITE_NAME,
      itemListElement: top.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: item.link,
      })),
    };
    const node = document.getElementById('ld-stories');
    if (node) node.textContent = JSON.stringify(data);
  }, [items, view, visible, lang]);

  const emptyMessage = view.bookmarks
    ? t('emptyBookmarks', lang)
    : view.following
      ? t('emptyFollow', lang)
      : t('emptyFilter', lang);
  const allowAds = homeAllowsAds(view);
  const showSideAd = allowAds && wide && Boolean(hero);

  function titleOf(item: NewsItem): string {
    return displayTitle(item.title, lang);
  }

  return (
    <ErrorBoundary>
      <div className="page">
        <div className="chrome">
          <header className="masthead">
            <h1 className="masthead-title">
              <a
                className="logo-link"
                href="/"
                aria-label={SITE_NAME}
                onClick={(event) => {
                  event.preventDefault();
                  go({ region: 'ALL', category: 'all', source: '', q: '', time: 'all', ...clearSpecial });
                }}
              >
                <Logo />
              </a>
            </h1>
            <form className={searchOpen ? 'search-bar open' : 'search-bar'} role="search" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="news-search">
                {t('search', lang)}
              </label>
              <button type="button" className="icon-btn search-toggle" aria-label={t('search', lang)} aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
              <input id="news-search" value={view.q} placeholder={t('search', lang)} onChange={(event) => go({ ...view, q: event.target.value }, 'replace')} />
            </form>
            <div className="header-actions">
              <button type="button" className="icon-btn" aria-label={t('refresh', lang)} onClick={() => void refresh()} disabled={loading}>
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
                aria-label={bookmarkIds.size > 0 ? `${t('bookmarks', lang)} ${bookmarkIds.size}` : t('bookmarks', lang)}
                onClick={() => go({ ...view, bookmarks: !view.bookmarks, following: false })}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1z" fill={view.bookmarks ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                </svg>
                {bookmarkIds.size > 0 && <span className="count-badge">{bookmarkIds.size}</span>}
              </button>
              <button
                type="button"
                className={view.following ? 'icon-btn active' : 'icon-btn'}
                aria-pressed={view.following}
                aria-label={follows.count > 0 ? `${t('following', lang)} ${follows.count}` : t('following', lang)}
                onClick={() => go({ ...view, following: !view.following, bookmarks: false })}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" fill={view.following ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
                </svg>
                {(follows.count > 0 || followFresh > 0) && <span className="count-badge">{followFresh > 0 ? followFresh : follows.count}</span>}
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
              onClick={() => {
                setFiltersOpen((open) => !open);
                setLayoutOpen(false);
              }}
            >
              {t('filter', lang)}
            </button>
            <button
              type="button"
              className={layoutOpen ? 'chip layout-toggle active' : 'chip layout-toggle'}
              aria-expanded={layoutOpen}
              aria-controls="layout-panel"
              onClick={() => {
                setLayoutOpen((open) => !open);
                setFiltersOpen(false);
              }}
            >
              {t('layout', lang)}
            </button>
            <nav className="filters filters-primary" aria-label="time">
              {TIMES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={!special && view.time === item.id ? 'chip active' : 'chip'}
                  aria-pressed={!special && view.time === item.id}
                  onClick={() => go({ ...view, time: item.id, ...clearSpecial })}
                >
                  {TIME_LABEL[item.id][lang]}
                </button>
              ))}
              <button type="button" className={view.bookmarks ? 'chip active' : 'chip'} aria-pressed={view.bookmarks} onClick={() => go({ ...view, bookmarks: !view.bookmarks, following: false })}>
                {t('bookmarks', lang)}
              </button>
              {board.prefs.keywords && (
                <button
                  type="button"
                  className="chip more-topics"
                  onClick={() => document.getElementById('hot-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('more', lang)}
                </button>
              )}
            </nav>
          </div>

          {layoutOpen && (
            <div className="layout-panel" id="layout-panel">
              <BoardToggles prefs={board.prefs} onToggle={board.toggle} lang={lang} />
            </div>
          )}

          {filtersOpen && !special && (
            <div className="filter-panel" id="filter-panel">
              <p className="filter-label">{t('categories', lang)}</p>
              <nav className="filters" aria-label="categories">
                {CATEGORIES.map((category) => {
                  const followed = category.id !== 'all' && follows.categorySet.has(category.id);
                  return (
                    <span key={category.id} className="chip-wrap">
                      <button
                        type="button"
                        className={view.category === category.id ? 'chip active' : 'chip'}
                        aria-pressed={view.category === category.id}
                        onClick={() => go({ ...view, category: category.id, source: '', ...clearSpecial })}
                      >
                        {categoryLabelI18n(category.id, lang)}
                      </button>
                      {category.id !== 'all' && (
                        <button
                          type="button"
                          className={followed ? 'follow-mini on' : 'follow-mini'}
                          aria-label={followed ? `${t('unfollow', lang)} ${categoryLabelI18n(category.id, lang)}` : `${t('follow', lang)} ${categoryLabelI18n(category.id, lang)}`}
                          aria-pressed={followed}
                          onClick={() => follows.toggleCategory(category.id)}
                        >
                          {followed ? '★' : '☆'}
                        </button>
                      )}
                    </span>
                  );
                })}
              </nav>
              <p className="filter-label">{t('regions', lang)}</p>
              <nav className="filters" aria-label="regions">
                {REGIONS.map((region) => (
                  <button type="button" key={region.code} className={view.region === region.code ? 'chip active' : 'chip'} aria-pressed={view.region === region.code} onClick={() => go({ ...view, region: region.code, source: '', ...clearSpecial })}>
                    <RegionIcon code={region.code} />
                    {lang === 'en' ? region.code : region.label}
                  </button>
                ))}
              </nav>
              <p className="filter-label">{t('sources', lang)}</p>
              <nav className="filters" aria-label="sources">
                <button type="button" className={view.source === '' ? 'chip active' : 'chip'} aria-pressed={view.source === ''} onClick={() => go({ ...view, source: '' })}>
                  {t('allSources', lang)}
                </button>
                {sources.map((name) => {
                  const followed = follows.sourceSet.has(name);
                  return (
                    <span key={name} className="chip-wrap">
                      <button type="button" className={view.source === name ? 'chip active' : 'chip'} aria-pressed={view.source === name} onClick={() => go({ ...view, source: name, ...clearSpecial })}>
                        {name}
                      </button>
                      <button type="button" className={followed ? 'follow-mini on' : 'follow-mini'} aria-pressed={followed} aria-label={followed ? `${t('unfollow', lang)} ${name}` : `${t('follow', lang)} ${name}`} onClick={() => follows.toggleSource(name)}>
                        {followed ? '★' : '☆'}
                      </button>
                    </span>
                  );
                })}
              </nav>
              {board.prefs.keywords && (
                <button type="button" className="chip more-topics" onClick={() => document.getElementById('hot-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  {t('more', lang)} · {t('keywords', lang)}
                </button>
              )}
            </div>
          )}
        </div>

        <MajorBanner />
        <AlertRow />

        <div className="layout">
          <main id="news">
            {allowAds && (
              <section className="home-intro" aria-label="關於世界頭條">
                <p>{HOME_INTRO}</p>
                <ul className="home-sections">
                  {HOME_SECTIONS.map((section) => (
                    <li key={section.name}>
                      <strong>{section.name}</strong> {section.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {loading && !special && items.length === 0 ? (
              <div className="news-grid" aria-busy="true" aria-live="polite">
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : error && !special && items.length === 0 ? (
              <div className="status-panel" role="alert">
                <h2>{lang === 'en' ? 'No headlines' : '暫時沒有頭條'}</h2>
                <p>{error}</p>
                <button type="button" className="primary" onClick={() => void refresh()}>
                  {t('refresh', lang)}
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="status-panel">
                <h2>{lang === 'en' ? 'Nothing here' : '沒有符合的頭條'}</h2>
                <p>{emptyMessage}</p>
              </div>
            ) : (
              <>
                {(partial || stale) && !special && (
                  <p className="notice" role="status">
                    {stale ? (lang === 'en' ? 'Some sources are down; showing a recent cache.' : '部分來源暫時連不上，以下是較早儲存的標題。') : lang === 'en' ? 'Some sources did not reply; other headlines are still available.' : '部分來源暫時沒有回應，其餘頭條仍可閱讀。'}
                  </p>
                )}
                {!special && !wide && <HkInfoStrip />}
                {!special && (
                  <aside className="digest-strip">
                    <span className="badge">AI</span>
                    <a className="digest-primary" href="/digest/">{t('todayPicks', lang)}</a>
                    <a href="/weekly/">{t('weekly', lang)}</a>
                    <a href="/analysis/">{t('hotAnalysis', lang)}</a>
                  </aside>
                )}
                {(hero || secondary.length > 0) && (
                  <div className="top-stories">
                    {hero && (
                      <NewsCard
                        item={hero}
                        title={titleOf(hero)}
                        bookmarked={bookmarkIds.has(hero.id)}
                        onToggleBookmark={toggle}
                        sourceCount={counts.get(hero.id) ?? 0}
                        analysisHref={analysisHrefs.get(hero.id) || ''}
                        featured
                        lang={lang}
                        followedSource={follows.sourceSet.has(hero.source)}
                        onToggleSource={follows.toggleSource}
                        breaking={breaking.has(hero.id)}
                        angles={angleMap.get(hero.id)}
                      />
                    )}
                    {secondary.length > 0 && (
                      <div className="secondary-list">
                        {secondary.map((item) => (
                          <NewsCard
                            key={item.id}
                            item={item}
                            title={titleOf(item)}
                            bookmarked={bookmarkIds.has(item.id)}
                            onToggleBookmark={toggle}
                            sourceCount={counts.get(item.id) ?? 0}
                            analysisHref={analysisHrefs.get(item.id) || ''}
                            compact
                            lang={lang}
                            breaking={breaking.has(item.id)}
                            angles={angleMap.get(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!special && board.prefs.mostRead && <MostRead rows={popular} variant="feed" lang={lang} />}
                <div className="news-grid">
                  {gridItems.flatMap((item: NewsItem, index) => {
                    const card = (
                      <NewsCard
                        key={item.id}
                        item={item}
                        title={titleOf(item)}
                        bookmarked={bookmarkIds.has(item.id)}
                        onToggleBookmark={toggle}
                        sourceCount={counts.get(item.id) ?? 0}
                        analysisHref={analysisHrefs.get(item.id) || ''}
                        lang={lang}
                        followedSource={follows.sourceSet.has(item.source)}
                        onToggleSource={follows.toggleSource}
                        breaking={breaking.has(item.id)}
                        angles={angleMap.get(item.id)}
                      />
                    );
                    const ordinal = secondary.length + index + 1;
                    if (!allowAds || ordinal % FEED_AD_EVERY !== 0) return [card];
                    return [card, <AdSlot key={`feed-${item.id}`} slot={AD_SLOT_FEED} variant="feed" />];
                  })}
                </div>
                {shown < visible.length && (
                  <button type="button" className="primary more" onClick={() => setShownState({ key: filterKey, count: shown + PAGE_SIZE })}>
                    {t('loadMore', lang)} ({visible.length - shown})
                  </button>
                )}
              </>
            )}
          </main>
          <aside className="sidebar" aria-label="sidebar">
            <div className="board-prefs">
              <p className="filter-label">{t('layout', lang)}</p>
              <BoardToggles prefs={board.prefs} onToggle={board.toggle} lang={lang} />
            </div>
            {wide && !special && <HkInfoStrip />}
            {!special && board.prefs.mostRead && <MostRead rows={popular} variant="side" lang={lang} />}
            {!special && board.prefs.keywords && <TrendingTopics topics={topics} active={view.q} lang={lang} onPick={(term) => go({ ...view, q: term, ...clearSpecial }, 'replace')} />}
            {showSideAd && <AdSlot slot={AD_SLOT_TOP} variant="sidebar" />}
            {!special && board.prefs.coverage && !view.q.trim() && clusters.length > 0 && (
              <section className="trending" aria-label={t('multiCoverage', lang)}>
                <h2>{t('multiCoverage', lang)}</h2>
                <ol>
                  {clusters.slice(0, 5).map((cluster, index) => (
                    <li key={cluster.id}>
                      <span className="rank">{index + 1}</span>
                      <div>
                        <a href={cluster.lead.link} target="_blank" rel="noopener noreferrer">
                          {titleOf(cluster.lead)}
                        </a>
                        <span className="cluster-badge">
                          {cluster.count} {t('outlets', lang)}
                        </span>
                        {cluster.count >= 3 && (
                          <a className="analysis-box" href={`/analysis/${analysisSlug(cluster.lead.title)}/`}>
                            <span className="badge">AI</span>
                            {t('aiBox', lang)}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="side-card">
              <h2>{lang === 'en' ? 'This view' : '今次版面'}</h2>
              <p>
                {view.bookmarks ? t('bookmarks', lang) : view.following ? t('following', lang) : categoryLabelI18n(view.category, lang)}
                {view.region !== 'ALL' ? ` · ${REGIONS.find((region) => region.code === view.region)?.label}` : ''}
              </p>
              {view.following && follows.count > 0 && (
                <div className="follow-list">
                  {follows.categories.map((id) => (
                    <button key={id} type="button" className="chip follow-chip on" onClick={() => follows.toggleCategory(id)}>
                      {categoryLabelI18n(id, lang)} ×
                    </button>
                  ))}
                  {follows.sources.map((name) => (
                    <button key={name} type="button" className="chip follow-chip on" onClick={() => follows.toggleSource(name)}>
                      {name} ×
                    </button>
                  ))}
                </div>
              )}
              <p className="card-credit">{lang === 'en' ? 'Headlines and source links only — no full articles.' : '只列標題、來源同原文連結，不轉載內文。'}</p>
            </div>
          </aside>
        </div>

        <footer className="app-footer">
          <p>
            {SITE_NAME} {lang === 'en' ? 'lists headlines and source links only.' : '只列出標題同出處連結，不轉載內文。'}
            <a href={SITE_URL}> {SITE_URL.replace('https://', '')}</a>
            {' · '}
            <a href="/major/">{lang === 'en' ? 'Major updates' : '重大更新'}</a>
          </p>
          <nav className="footer-nav" aria-label="網站資料">
            {FOOTER_LINKS.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
        </footer>
        <BackToTop />
        {freshCount > 0 && (
          <button
            type="button"
            className="new-items"
            onClick={() => {
              showPending();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {lang === 'en' ? `${freshCount} ${t('newHeadlines', lang)}` : `有 ${freshCount} ${t('newHeadlines', lang)}`}
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}
