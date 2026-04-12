import { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import { getBookmarks, toggleBookmark } from '../utils/translate';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal';

export function BookmarksPage({ lang }: { lang: string }) {
  const [bmIds, setBmIds] = useState<string[]>([]);
  const [bmNews, setBmNews] = useState<NewsItem[]>([]);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  function load() {
    const ids = getBookmarks();
    setBmIds(ids);
    const all: NewsItem[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('wn_cache_')) {
        try {
          const { items } = JSON.parse(localStorage.getItem(key) || '{}');
          if (Array.isArray(items)) {
            items.forEach((item: NewsItem) => {
              if (ids.includes(String(item.id)) && !seen.has(String(item.id))) {
                seen.add(String(item.id));
                all.push(item);
              }
            });
          }
        } catch { /* ignore */ }
      }
    }
    setBmNews(all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
  }

  useEffect(() => { load(); }, []);

  function handleToggle(id: string) {
    toggleBookmark(id);
    load();
  }

  return (
    <div>
      <div className="stats-bar" style={{ marginBottom: 12 }}>
        <span className="stat">
          <span style={{ fontSize: '1.2em' }}>⭐</span>
          <span className="stat-num"> {bmIds.length}</span>
          <span className="stat-label"> 條收藏</span>
        </span>
      </div>

      {bmNews.length === 0 && (
        <div className="empty-state">還沒有收藏的新聞，點☆收藏感興趣的頭條 📰</div>
      )}

      <main className="main">
        {bmNews.map(item => (
          <div key={item.id} onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>
            <NewsCard
              item={item}
              lang={lang}
              bookmarkIds={new Set(bmIds)}
              toggleBookmark={handleToggle}
            />
          </div>
        ))}
      </main>

      {selected && (
        <NewsModal item={selected} lang={lang} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
