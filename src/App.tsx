import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { breakingIds } from '../shared/breaking';
import { analysisSlug } from '../shared/content';
import { CATEGORIES } from '../shared/categories';
import { filterNews } from '../shared/filter';
import { REGIONS, sourcesForRegion } from '../shared/feeds';
import { categoryLabelI18n, t } from '../shared/i18n';
import { clusterStories, sourceCounts } from '../shared/trending';
import { displayTitle, normalizeLang, type UiLang } from '../shared/zh';
import type { NewsItem } from '../shared/types';
import { FEED_AD_EVERY, homeAllowsAds } from '../shared/adPolicy';
import { renderBulletinClock } from '../shared/civilization/clock';
import { renderAxisBand, renderAxisRails, renderHomeChronicle, renderLayerAside, sliceHeadHtml } from '../shared/civilizationPage';
import { renderNearBridge } from '../shared/civilization/renderSlice';
import { columnHref, DEFAULT_BRIEFING_LINKS, homeDigestLinks, type HomeColumnLinks } from '../shared/homePage';
import { demoteGraphic } from '../shared/mustRead';
import { focusTarget } from '../shared/focusView';
import { siteBrand, siteTitle, swCacheName } from '../shared/brand';
import { HOME_INTRO, HOME_INTRO_LINE, HOME_SECTIONS } from '../shared/homeCopy';
import { FOOTER_LINKS } from '../shared/siteNav';
import { AdSlot } from './components/AdSlot';
import { MostRead } from './components/MostRead';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageSelector } from './components/LanguageSelector';
import { RankedList } from './components/RankedList';
import { RegionIcon } from './components/RegionIcon';
import { BackToTop } from './components/BackToTop';
import { AlertRow } from './components/AlertRow';
import { MajorBanner } from './components/MajorBanner';
import { WeekFocus } from './components/WeekFocus';
import { OnThisDay } from './components/OnThisDay';
import { AD_SLOT_FEED, SITE_URL } from './config';
import { usePopular } from './hooks/useBoard';
import { useBookmarks } from './hooks/useBookmarks';
import { useFollows } from './hooks/useFollows';
import { useNews } from './hooks/useNews';
import { readView, viewHref, type ViewState } from './routing';
import { scrollBehavior } from './utils/scroll';
import './App.css';

function HomeIntroBody() {
  const columns = useMemo(readHomeColumns, []);
  return (
    <>
      <p>{HOME_INTRO}</p>
      <ul className="home-sections">
        {HOME_SECTIONS.map((section) => {
          const href = section.href ? columnHref(columns, section.href) : null;
          return (
            <li key={section.name}>
              <strong>{href ? <a href={href}>{section.name}</a> : section.name}</strong> {section.text}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function HomeIntroTop() {
  return (
    <section className="home-intro home-intro-top" aria-label={`關於${siteBrand}`}>
      <p className="home-intro-line">{HOME_INTRO_LINE}</p>
    </section>
  );
}

function HomeIntroFoot() {
  return (
    <section className="home-intro home-intro-foot" aria-label={`關於${siteBrand}`}>
      <h2>關於{siteBrand}</h2>
      <HomeIntroBody />
    </section>
  );
}

const PAGE_SIZE = 16;

function Logo() {
  return (
    <span className="logo-frame">
      <img className="logo-full logo-light" src={`/brand/logo.svg?v=${swCacheName}`} alt="" />
      <img className="logo-full logo-dark" src={`/brand/logo-dark.svg?v=${swCacheName}`} alt="" />
      <img className="logo-compact logo-light" src={`/brand/logo-compact.svg?v=${swCacheName}`} alt="" />
      <img className="logo-compact logo-dark" src={`/brand/logo-compact-dark.svg?v=${swCacheName}`} alt="" />
    </span>
  );
}

function useSpinOnce() {
  const [on, setOn] = useState(false);
  const timer = useRef(0);
  const frame = useRef(0);
  const start = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.clearTimeout(timer.current);
    window.cancelAnimationFrame(frame.current);
    setOn(false);
    frame.current = requestAnimationFrame(() => {
      setOn(true);
      timer.current = window.setTimeout(() => setOn(false), 640);
    });
  }, []);
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.cancelAnimationFrame(frame.current);
  }, []);
  return [on, start] as const;
}

function SubscribeMenu() {
  const [telegram, setTelegram] = useState('');
  useEffect(() => {
    let cancel = false;
    void fetch('/api/subscribe')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { telegram?: string | null } | null) => {
        const href = data?.telegram || '';
        if (!cancel && /^https:\/\/(t\.me|telegram\.me|telegram\.dog)\//.test(href)) setTelegram(href);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);
  return (
    <details className="subscribe-menu">
      <summary className="chip">訂閱</summary>
      <div className="subscribe-panel" role="group" aria-label="訂閱">
        <a href="/feed.xml">RSS</a>
        {telegram ? <a className="subscribe-telegram" href={telegram} rel="noopener noreferrer">Telegram</a> : null}
      </div>
    </details>
  );
}

const clearSpecial = { bookmarks: false, following: false };

function readHomeColumns(): HomeColumnLinks {
  try {
    const node = document.getElementById('wn-columns');
    if (!node?.textContent) return {};
    const parsed = JSON.parse(node.textContent) as HomeColumnLinks;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function CivNav({
  lang,
  filtersOpen,
  filtersActive,
  onToggleFilters,
}: {
  lang: UiLang;
  filtersOpen: boolean;
  filtersActive: boolean;
  onToggleFilters: () => void;
}) {
  const columns = useMemo(readHomeColumns, []);
  return (
    <div className="civ-nav-row">
      <div className="chip-scroller">
        <nav className="civ-nav" aria-label="主欄目">
          <a className="chip civ-chip" href="/civilization/">文明</a>
          <a className="chip" href="/civilization/chronicle/">編年</a>
          <a className="chip" href="/#slice">今天</a>
          <a className="chip" href="/learn/">開蒙</a>
        </nav>
      </div>
      <details className="civ-more">
        <summary className={filtersActive ? 'chip active' : 'chip'}>更多</summary>
        <nav className="filters" aria-label="更多欄目">
          <a className="chip" href="/briefing/">導讀</a>
          <a className="chip" href="/explainer/">懶人包</a>
          {columns.topic ? <a className="chip" href="/topic/">專題</a> : null}
          <a className="chip" href="/data/">數據</a>
          <a className="chip" href="/today/" title="多方報道時間線，不是軸上的今天">多方時間線</a>
          <button
            type="button"
            className={filtersOpen || filtersActive ? 'chip active' : 'chip'}
            aria-expanded={filtersOpen}
            aria-controls="filter-panel"
            onClick={(event) => {
              onToggleFilters();
              const menu = event.currentTarget.closest('details');
              if (!(menu instanceof HTMLDetailsElement)) return;
              menu.open = false;
              const summary = menu.querySelector('summary');
              if (summary instanceof HTMLElement) summary.focus();
            }}
          >
            {t('filter', lang)}
          </button>
        </nav>
      </details>
      <SubscribeMenu />
    </div>
  );
}

function DigestStrip() {
  const columns = useMemo(readHomeColumns, []);
  const links = homeDigestLinks(DEFAULT_BRIEFING_LINKS, columns);
  return (
    <aside className="digest-strip" aria-label="切片入口">
      {links.map((link) => (
        <a key={`${link.href}-${link.label}`} className={link.primary ? 'chip digest-primary active' : 'chip digest-keep'} href={link.href}>{link.label}</a>
      ))}
    </aside>
  );
}

export default function App() {
  const { items, loading, error, partial, stale, refresh, freshCount, showPending, pending } = useNews();
  const [refreshing, spinRefresh] = useSpinOnce();
  const { items: bookmarks, ids: bookmarkIds } = useBookmarks();
  const follows = useFollows();
  const [view, setView] = useState<ViewState>(readView);
  const popular = usePopular(!view.bookmarks && !view.following);
  const [lang, setLang] = useState<UiLang>(() => normalizeLang(localStorage.getItem('wn_lang')));
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [searchHits, setSearchHits] = useState<Set<string> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const focusPage = focusTarget(view);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute('content', dark ? '#0E141C' : '#161c24');
  }, [dark]);

  const chooseLang = useCallback((next: UiLang) => {
    try {
      localStorage.setItem('wn_lang', next);
    } catch {
      /* private mode */
    }
    document.documentElement.lang = next === 'en' ? 'en' : next;
    setLang(next);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wn_lang', lang);
    } catch {
      /* private mode */
    }
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'zh-CN' ? 'zh-CN' : 'zh-HK';
  }, [lang]);

  useLayoutEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'zh-CN' ? 'zh-CN' : 'zh-HK';
    (window as Window & { __wnApplyLive?: () => void }).__wnApplyLive?.();
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

  const ordered = useMemo(() => demoteGraphic(visible), [visible]);
  const listed = useMemo(() => ordered.slice(0, PAGE_SIZE), [ordered]);
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
  const special = view.bookmarks || view.following;
  const poeticAxis = !special && view.region === 'ALL' && view.category === 'all' && !view.q.trim() && !view.source.trim() && view.time === 'all';
  const focusLabel = !focusPage
    ? ''
    : focusPage.scope === 'region'
      ? (REGIONS.find((region) => region.code.toLowerCase() === focusPage.id)?.label ?? '')
      : (CATEGORIES.find((category) => category.id === focusPage.id)?.label ?? '');
  const filtersActive = view.source !== '' || view.region !== 'ALL' || (view.category !== 'all' && !special);
  const rankBreaking = useMemo(() => breakingIds(listed), [listed]);
  const followFresh = useMemo(() => {
    if (!pending || !follows.count) return 0;
    return pending.filter((item) => follows.matches(item) && !items.some((row) => row.id === item.id)).length;
  }, [pending, follows, items]);

  useEffect(() => {
    const query = view.q.trim();
    document.title = query ? `${t('search', lang)}「${query}」 — ${siteBrand}` : siteTitle;
    const canonical = document.querySelector('link[rel="canonical"]');
    const path = query || view.bookmarks || view.following || view.source || view.time !== 'all' ? '/' : viewHref(view);
    canonical?.setAttribute('href', `${SITE_URL}${path === '' ? '/' : path}`);
    const top = (view.bookmarks || view.following ? visible : items).slice(0, 10);
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: siteBrand,
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
                aria-label={siteBrand}
                onClick={(event) => {
                  event.preventDefault();
                  go({ region: 'ALL', category: 'all', source: '', q: '', time: 'all', ...clearSpecial, list: view.list });
                }}
              >
                <Logo />
              </a>
            </h1>
            <form
              className={searchOpen ? 'search-bar open' : 'search-bar'}
              role="search"
              action="/search/"
              method="get"
              onSubmit={(event) => {
                event.preventDefault();
                const q = view.q.trim();
                if (!q) {
                  setSearchOpen(true);
                  return;
                }
                window.location.assign(`/search/?q=${encodeURIComponent(q)}`);
              }}
            >
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
              <button type="button" className={refreshing ? 'icon-btn refresh-btn is-refreshing' : 'icon-btn refresh-btn'} aria-label={t('refresh', lang)} onClick={() => { spinRefresh(); void refresh(); }} disabled={loading}>
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
              <LanguageSelector value={lang} onChange={chooseLang} />
            </div>
          </header>

          <CivNav
            lang={lang}
            filtersOpen={filtersOpen}
            filtersActive={filtersActive}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
          />

          {filtersOpen && !view.bookmarks && (
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
                {REGIONS.map((region) => {
                  const followed = region.code !== 'ALL' && follows.regionSet.has(region.code);
                  return (
                    <span key={region.code} className="chip-wrap">
                      <button type="button" className={view.region === region.code ? 'chip active' : 'chip'} aria-pressed={view.region === region.code} onClick={() => go({ ...view, region: region.code, source: '', ...clearSpecial })}>
                        <RegionIcon code={region.code} />
                        {lang === 'en' ? region.code : region.label}
                      </button>
                      {region.code !== 'ALL' && (
                        <button
                          type="button"
                          className={followed ? 'follow-mini on' : 'follow-mini'}
                          aria-pressed={followed}
                          aria-label={followed ? `${t('unfollow', lang)} ${region.label}` : `${t('follow', lang)} ${region.label}`}
                          onClick={() => follows.toggleRegion(region.code)}
                        >
                          {followed ? '★' : '☆'}
                        </button>
                      )}
                    </span>
                  );
                })}
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
            </div>
          )}
        </div>

        <div className="layout layout-span">
          <main id="today">
            {!special && (
              <div className="civ-home">
                <div className="axis-mount" dangerouslySetInnerHTML={{ __html: renderAxisBand({ asHeading: poeticAxis, strip: false, rails: false }) }} />
                <div dangerouslySetInnerHTML={{ __html: renderBulletinClock() }} />
                <div dangerouslySetInnerHTML={{ __html: renderHomeChronicle() }} />
                <div dangerouslySetInnerHTML={{ __html: renderAxisRails() }} />
                <OnThisDay />
                <section className="today-slice" id="slice" aria-label="今日切片">
                      {focusLabel ? <h1 className="focus-title">{focusLabel}</h1> : null}
                      <div dangerouslySetInnerHTML={{ __html: sliceHeadHtml() }} />
                      <div dangerouslySetInnerHTML={{ __html: renderNearBridge() }} />
                      <MajorBanner />
                      <AlertRow />
                      <HomeIntroTop />
                      {loading && items.length === 0 ? (
                        <div className="status-panel" aria-busy="true"><h2>{lang === 'en' ? 'Loading today' : '載入今日切片…'}</h2></div>
                      ) : error && items.length === 0 ? (
                        <div className="status-panel" role="alert">
                          <h2>{lang === 'en' ? 'No titles' : '今日切片暫時沒有標題'}</h2>
                          <p>{error}</p>
                          <button type="button" className="primary" onClick={() => void refresh()}>{t('refresh', lang)}</button>
                        </div>
                      ) : visible.length === 0 ? (
                        <div className="status-panel">
                          <h2>{lang === 'en' ? 'Nothing here' : '沒有符合的標題'}</h2>
                          <p>{emptyMessage}</p>
                        </div>
                      ) : (
                        <>
                          {(partial || stale) && (
                            <p className="notice" role="status">
                              {stale ? (lang === 'en' ? 'Some sources are down; showing a recent cache.' : '部分來源暫時連不上，以下是較早儲存的標題。') : lang === 'en' ? 'Some sources did not reply; other headlines are still available.' : '部分來源暫時沒有回應，其餘標題仍可閱讀。'}
                            </p>
                          )}
                          <DigestStrip />
                          {focusPage && <WeekFocus scope={focusPage.scope} id={focusPage.id} />}
                          <div className="home-list">
                            {Array.from({ length: Math.ceil(listed.length / FEED_AD_EVERY) }, (_, chunk) => {
                              const start = chunk * FEED_AD_EVERY;
                              const slice = listed.slice(start, start + FEED_AD_EVERY);
                              const tail = slice[slice.length - 1];
                              return (
                                <div key={slice[0]?.id ?? chunk} className="rank-chunk">
                                  <RankedList start={start} items={slice} counts={counts} breaking={rankBreaking} explainers={analysisHrefs} titleOf={titleOf} lang={lang} />
                                  {allowAds && slice.length === FEED_AD_EVERY && tail ? <AdSlot slot={AD_SLOT_FEED} variant="feed" /> : null}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                </section>
                <p className="more-today"><a href="/today/">更多今日</a><span>全日多方時間線，不是軸上的今天。</span></p>
                <div dangerouslySetInnerHTML={{ __html: renderLayerAside() }} />
                <MostRead rows={popular} variant="below" lang={lang} />
              </div>
            )}
            {special && (
              <section aria-label={view.bookmarks ? t('bookmarks', lang) : t('following', lang)}>
                {view.following && follows.count > 0 && (
                  <div className="follow-list">
                    {follows.regions.map((code) => (
                      <button key={code} type="button" className="chip follow-chip on" onClick={() => follows.toggleRegion(code)}>
                        {REGIONS.find((region) => region.code === code)?.label || code} ×
                      </button>
                    ))}
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
                {visible.length === 0 ? (
                  <div className="status-panel">
                    <h2>{lang === 'en' ? 'Nothing here' : '沒有符合的標題'}</h2>
                    <p>{emptyMessage}</p>
                  </div>
                ) : (
                  <div className="home-list">
                    <RankedList items={listed} counts={counts} breaking={rankBreaking} explainers={analysisHrefs} titleOf={titleOf} lang={lang} />
                  </div>
                )}
              </section>
            )}
          </main>
        </div>


        {allowAds && <HomeIntroFoot />}
        <footer className="app-footer">
          <p>
            {siteBrand}{lang === 'en' ? ' is a civilization axis. News is one slice of today: titles and source links only.' : '是文明時間軸。新聞是軸上的今天一片，只列出標題與出處連結，不轉載內文。'}
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
              window.scrollTo({ top: 0, behavior: scrollBehavior() });
            }}
          >
            {lang === 'en' ? `${freshCount} ${t('newHeadlines', lang)}` : `有 ${freshCount} ${t('newHeadlines', lang)}`}
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}
