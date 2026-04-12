import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '../types';
import { fetchAllNews } from '../utils/newsFetcher';
import { translateBatch } from '../utils/translate';

export function useNews(group: string, translateLang: string) {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setErrorMsg(''); }
    setStatus('loading');

    try {
      const items = await fetchAllNews(group);
      setNews(items);
      setStatus('done');
      if (items.length === 0) setErrorMsg('暫無新聞，請稍後再試');

      // 背景翻譯（用戶選擇的語言）
      if (items.length > 0 && translateLang !== 'en') {
        setTranslating(true);
        translateBatch(items, translateLang).then(updated => {
          const map = new Map(updated.map(n => [n.id, n]));
          setNews(prev => prev.map(n => map.get(n.id) || n));
          setTranslating(false);
        }).catch((err: unknown) => {
          console.error('[useNews] 翻譯失敗:', err);
          // 翻譯失敗不阻擋 UI，新聞以原文顯示
          setTranslating(false);
        });
      }
    } catch (e: any) {
      console.error('[useNews] fetch error:', e);
      setStatus('error');
      setErrorMsg(e?.message || '載入失敗');
      setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [group, translateLang]);

  useEffect(() => { loadNews(); }, [loadNews]);

  const refresh = useCallback(() => loadNews(true), [loadNews]);

  return {
    news,
    loading,
    refreshing,
    translating,
    status,
    errorMsg,
    refresh,
  };
}
