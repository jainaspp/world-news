import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useNews } from './hooks/useNews';
import { NewsCard } from './components/NewsCard';
import { NewsModal } from './components/NewsModal';
import { DarkModeToggle } from './components/DarkModeToggle';
import { LanguageSelector } from './components/LanguageSelector';
import { InstallPrompt } from './components/InstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NewsAdBanner, InFeedAdBanner } from './components/NewsAdBanner';
import { SkeletonCard } from './components/SkeletonCard';
import { NewsItem } from './types';
import { REGIONS } from './data/sources';
import { analytics } from './utils/analytics';
import { useBookmarks } from './hooks/useBookmarks';
import './App.css';

function filterByTime(items: NewsItem[], filter: string): NewsItem[] {
  if (filter === 'all') return items;
  const now = Date.now();
  const cutoff = filter === 'today' ? now - 86400000 : now - 604800000;
  return items.filter(n => new Date(n.pubDate).getTime() >= cutoff);
}

export default function App() {
  const [group, setGroup] = useState('region');
  const [activeRegion, setActiveRegion] = useState('ALL');
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [translateLang, setTranslateLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [lastUpdated, setLastUpdated] = useState('');
  const [newsTimeFilter, setNewsTimeFilter] = useState(() => localStorage.getItem('timeFilter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState('');

  const activeGroup = activeRegion;
  const { news, loading, refreshing, translating, status, refresh } = useNews(activeGroup, translateLang);
  const { bookmarkIds, toggle } = useBookmarks();

  useEffect(() => {
    if (news.length > 0) {
      const sorted = [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setLastUpdated(new Date(sorted[0].pubDate).toLocaleTimeString());
    }
    import('./utils/newsFetcher').then(m => {
      (['ALL', 'HKG'] as const).forEach(g => m.fetchAllNews(g).catch(() => {}));
    });
  }, [news]);

  const displayNews = useMemo(() => {
    let base = showBookmarks
      ? news.filter(n => bookmarkIds.has(String(n.id)))
      : searchQuery
        ? news.filter(n =>
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((n.summary || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
            ((n.source || '').toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : news;

    if (group === 'source' && activeSource) {
      const srcMap: Record<string, string[]> = {
        BBC:          ['bbc'],
        Reuters:      ['reuters'],
        'Al Jazeera': ['aljazeera', 'al jazeera'],
        NHK:          ['nhk'],
        France24:     ['france24'],
        DW:           ['dw.', 'dw.com', 'deutsche welle'],
        CNA:          ['channel news asia', 'cna'],
        SCMP:         ['scmp', 'south china morning'],
        Euronews:     ['euronews'],
        UN:           ['un news', 'news.un.org'],
      };
      const kw = srcMap[activeSource] || [activeSource.toLowerCase()];
      base = base.filter(n => kw.some(k => (n.source || '').toLowerCase().includes(k)));
    }

    return filterByTime(base, newsTimeFilter);
  }, [news, newsTimeFilter, showBookmarks, bookmarkIds, searchQuery, group, activeSource]);

  const trendingNews = useMemo(() => news.slice(0, 8), [news]);

  return (
    <ErrorBoundary>
      <div className={'app ' + (darkMode ? 'dark' : '')}>

        <header className="app-header">
          <div className="header-left">
            <h1 className="site-title">🌏 世界頭條</h1>
            {news.length > 0 && (
              <span className="site-sources">
                {[...new Set(news.slice(0, 10).map(n => n.source).filter(Boolean))].slice(0, 5).join(' · ')}
              </span>
            )}
          </div>
          <div className="header-right">
            <button className="icon-btn" onClick={() => { analytics.refresh(); refresh(); }} disabled={loading} title="刷新">🔄</button>
            <DarkModeToggle checked={darkMode} onChange={setDarkMode} />
            <button className={'icon-btn' + (showBookmarks ? ' active' : '')} onClick={() => setShowBookmarks(v => !v)} title="收藏">
              {showBookmarks ? '🔙' : ('📖' + (bookmarkIds.size > 0 ? ' ' + bookmarkIds.size : ''))}
            </button>
            <LanguageSelector value={translateLang} onChange={setTranslateLang} />
          </div>
        </header>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="搜尋全球頭條..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (e.target.value.length > 2) analytics.search(e.target.value, 0); }}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {!showBookmarks && trendingNews.length > 0 && (
          <div className="trending-strip">
            <span className="trending-label">🔥 熱門</span>
            <div className="trending-items">
              {trendingNews.map((item, i) => (
                <a key={item.id} className="trending-item" href={item.link} target="_blank" rel="noopener noreferrer">
                  <span className="trending-num">{i + 1}</span>
                  <span className="trending-title">{item.title.replace(/<[^>]+>/g, '').slice(0, 40)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="group-toggle">
          <button className={'toggle-btn ' + (group === 'region' ? 'active' : '')} onClick={() => setGroup('region')}>🌏 地區</button>
          <button className={'toggle-btn ' + (group === 'source' ? 'active' : '')} onClick={() => setGroup('source')}>📡 來源</button>
        </div>

        {group === 'region' && (
          <div className="region-bar">
            {REGIONS.filter(r => r.code !== 'SRC').map(r => (
              <button key={r.code}
                className={'region-btn ' + (activeRegion === r.code ? 'active' : '')}
                onClick={() => { setActiveRegion(r.code); setShowBookmarks(false); setActiveSource(''); analytics.regionChange(r.code); }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        )}

        {group === 'source' && (
          <div className="region-bar">
            {REGIONS.find(r => r.code === 'SRC')?.sources.map((s: any) => (
              <button key={s.code}
                className={'region-btn ' + (activeSource === s.code ? 'active' : '')}
                onClick={() => { setActiveSource(s.code); setShowBookmarks(false); setActiveRegion('ALL'); analytics.sourceChange(s.code); }}>
                {s.flag} {s.label}
              </button>
            ))}
          </div>
        )}

        {showBookmarks && (
          <div className="bookmarks-header">
            <h2>📌 已收藏（{bookmarkIds.size}）</h2>
          </div>
        )}

        {!showBookmarks && (
          <div className="time-filter-bar">
            <span className="time-filter-label">全球頭條</span>
            <div className="time-filter-btns">
              {([['全部', 'all'], ['1小時', 'hour'], ['今天', 'today'], ['本週', 'week']] as [string, string][]).map(([label, val]) => (
                <button key={val}
                  className={'time-btn ' + (newsTimeFilter === val ? 'active' : '')}
                  onClick={() => { setNewsTimeFilter(val); localStorage.setItem('timeFilter', val); }}>
                  {label}
                </button>
              ))}
            </div>
            <span className="status-indicator">
              {status === 'translating' ? '🌐 翻譯中' : '✅ 已就緒'}
            </span>
            {translating && (
              <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>🌐 翻譯中</span>
            )}
          </div>
        )}

        {!loading && !showBookmarks && <NewsAdBanner slot="YOUR_TOP_BANNER_SLOT" format="horiz" />}

        <main className="app-main">
          {loading ? (
            <div className="news-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayNews.length === 0 && !showBookmarks ? (
            <div className="empty-state">
              <p>⚠️ 暫時沒有頭條，請稍後再試 🔄</p>
              <small>或切換地區 / 來源</small>
            </div>
          ) : showBookmarks && bookmarkIds.size === 0 ? (
            <div className="empty-state">
              <p>還沒有收藏</p>
              <small>點擊新聞卡右上書籤按鈕來收藏</small>
            </div>
          ) : (
            <div className="news-grid">
              {displayNews.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <NewsCard item={item} lang={translateLang} bookmarkIds={bookmarkIds} toggleBookmark={toggle} />
                  {idx > 0 && idx % 4 === 0 && !showBookmarks && <InFeedAdBanner position={idx} every={4} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </main>

        {!loading && displayNews.length > 0 && !showBookmarks && (
          <div className="share-bar">
            <span className="share-bar-text">分享給朋友</span>
            <button className="share-btn twitter" onClick={() => {
              const t = encodeURIComponent('🌏 世界頭條 — 即時全球新聞：' + (displayNews[0] ? displayNews[0].title : ''));
              window.open('https://twitter.com/intent/tweet?text=' + t + '&url=' + encodeURIComponent('https://world-news.xyz'), '_blank');
            }}>🐦 Twitter</button>
            <button className="share-btn facebook" onClick={() => {
              window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://world-news.xyz'), '_blank');
            }}>📘 Facebook</button>
            <button className="share-btn whatsapp" onClick={() => {
              window.open('https://wa.me/?text=' + encodeURIComponent('🌏 世界頭條：https://world-news.xyz'), '_blank');
            }}>💬 WhatsApp</button>
          </div>
        )}

        <footer className="app-footer">
          <span>🌏 世界頭條 | 全球頭條</span>
          {lastUpdated && <span> 更新於 {lastUpdated}</span>}
        </footer>

        {selected && <NewsModal item={selected} lang={translateLang} onClose={() => setSelected(null)} />}

        <InstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
