import React from 'react';
import { useState, useEffect } from 'react';
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
import { getBookmarks } from './utils/translate';
import './App.css';

function filterByTime(items: NewsItem[], filter: string): NewsItem[] {
  if (filter === 'all') return items;
  const now = Date.now();
  const cutoff = filter === 'today' ? now - 86400000 : now - 604800000;
  return items.filter(n => new Date(n.pubDate).getTime() >= cutoff);
}

export default function App() {
  const [activeRegion, setActiveRegion] = useState('');
  const [SOURCES, setSOURCES] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<NewsItem[]>([]);
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

  const activeGroup = activeRegion;
  const { news: allNews, loading, refreshing, translating, status, refresh } = useNews('ALL', translateLang);
  const news = activeRegion ? allNews.filter(n => n.source === activeRegion) : allNews;

  // 首次載入：後台預先抓取並快取所有三個分類
  useEffect(() => {
    if (news.length > 0) {
      const sorted = [...news].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setLastUpdated(new Date(sorted[0].pubDate).toLocaleTimeString());
      const srcs = [...new Set(news.map(n => n.source).filter(Boolean))].sort();
      setSOURCES(srcs);
    }
    import('./utils/newsFetcher').then(m => {
      (['ALL', 'HKG'] as const).forEach(g => m.fetchAllNews(g).catch(() => {}));
    });
  }, [news]);

  function handleBookmarkChange() { setBookmarks(getBookmarks()); }

  const displayNews = filterByTime(
    showBookmarks ? bookmarks : searchQuery
      ? news.filter(n =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.source || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : news,
    newsTimeFilter
  );
  const trendingNews = news.slice(0, 8);

  return (
    <ErrorBoundary>
      <div className={'app ' + (darkMode ? 'dark' : '')}>

        <header className="app-header">
          <div className="header-left">
            <h1 className="site-title">🌏 世界頭條</h1>
            {news.length > 0 && (
              <span className="site-sources">
                {[...new Set(news.slice(0,10).map(n => n.source).filter(Boolean))].slice(0, 5).join(' · ')}
              </span>
            )}
          </div>
          <div className="header-right">
            <button className="icon-btn" onClick={refresh} disabled={loading} title="刷新">🔄</button>
            <DarkModeToggle checked={darkMode} onChange={setDarkMode} />
            <button className={'icon-btn' + (showBookmarks ? ' active' : '')} onClick={() => setShowBookmarks(v => !v)} title="收藏">
              {showBookmarks ? '🔙' : ('📖' + (bookmarks.length > 0 ? ' ' + bookmarks.length : ''))}
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
            onChange={e => setSearchQuery(e.target.value)}
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
          <button className={'toggle-btn ' + (group === 'topic' ? 'active' : '')} onClick={() => setGroup('topic')}>📌 主題</button>
        </div>

        {group === 'region' && (
          <div className="region-bar">
            {REGIONS.map(r => (
              <button key={r.code} className={'region-btn ' + (activeRegion === r.code ? 'active' : '')}
                onClick={() => { setActiveRegion(r.code); setShowBookmarks(false); }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        )}

        {group === 'topic' && (
          <div className="region-bar">
            {TOPICS.map(t => (
              <button key={t.code} className={'region-btn ' + (activeTopic === t.code ? 'active' : '')}
                onClick={() => { setActiveTopic(t.code); setShowBookmarks(false); }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {showBookmarks && (
          <div className="bookmarks-header">
            <h2>📌 已收藏（{bookmarks.length}）</h2>
          </div>
        )}

        {!showBookmarks && (
          <div className="time-filter-bar">
            <span className="time-filter-label">全球頭條</span>
            <div className="time-filter-btns">
              {([['全部', 'all'], ['1小時', 'hour'], ['今天', 'today'], ['本週', 'week']] as [string, string][]).map(([label, val]) => (
                <button key={val} className={'time-btn ' + (newsTimeFilter === val ? 'active' : '')}
                  onClick={() => { setNewsTimeFilter(val); localStorage.setItem('timeFilter', val); }}>
                  {label}
                </button>
              ))}
            </div>
            <span className="status-indicator">
              {status === 'refreshing' ? '🔄 更新中' : status === 'translating' ? '🌐 翻譯中' : '✅ 已就緒'}
            </span>
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
              <p>暫時沒有頭條，請稍後再試 🔄</p>
              <small>或切換地區 / 主題</small>
            </div>
          ) : showBookmarks && bookmarks.length === 0 ? (
            <div className="empty-state">
              <p>還沒有收藏</p>
              <small>點擊新聞卡右上書籤按鈕來收藏</small>
            </div>
          ) : (
            <div className="news-grid">
              {displayNews.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <NewsCard item={item} lang={translateLang} onBookmarkChange={handleBookmarkChange} />
                  {idx > 0 && idx % 4 === 0 && !showBookmarks && <InFeedAdBanner position={idx} every={4} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </main>

        {!loading && displayNews.length > 0 && !showBookmarks && (
          <div className="share-bar">
            <span className="share-bar-text">分享給朋友</span>
            <button className="share-btn twitter" onClick={function() {
              var t = encodeURIComponent('🌏 世界頭條 — 即時全球新聞：' + (displayNews[0] ? displayNews[0].title : ''));
              window.open('https://twitter.com/intent/tweet?text=' + t + '&url=' + encodeURIComponent('https://world-news.xyz'), '_blank');
            }}>🐦 Twitter</button>
            <button className="share-btn facebook" onClick={function() {
              window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://world-news.xyz'), '_blank');
            }}>📘 Facebook</button>
            <button className="share-btn whatsapp" onClick={function() {
              window.open('https://wa.me/?text=' + encodeURIComponent('🌏 世界頭條：https://world-news.xyz'), '_blank');
            }}>💬 WhatsApp</button>
          </div>
        )}

        <footer className="app-footer">
          <span>🌏 世界頭條 | 全球頭條</span>
          {lastUpdated && <span>更新於 {lastUpdated}</span>}
        </footer>

        {selected && <NewsModal item={selected} lang={translateLang} onClose={function() { setSelected(null); }} />}

        <InstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
