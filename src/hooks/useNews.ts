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

      // 背景翻譯（progressive reveal：翻好一條顯示一條，不卡 UI）
      if (items.length > 0 && translateLang !== 'en') {
        setTranslating(true);
        (async () => {
          for (const item of items) {
            try {
              const translated = await translateBatch([item], translateLang);
              if (translated[0]) {
                setNews(prev => prev.map(n => n.id === translated[0].id ? translated[0] : n));
              }
            } catch (e: unknown) {
              console.error(`[useNews] 翻譯失敗 item ${item.id}:`, (e as Error)?.message);
            }
          }
          setTranslating(false);
        })();
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
