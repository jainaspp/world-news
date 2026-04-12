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

      // 背景翻譯（progressive reveal：每批 5 條並發，翻完一批更新一次 UI）
      if (items.length > 0 && translateLang !== 'en') {
        setTranslating(true);
        setStatus('translating');
        const BATCH = 5;
        (async () => {
          for (let i = 0; i < items.length; i += BATCH) {
            const batch = items.slice(i, i + BATCH);
            const translated = await translateBatch(batch, translateLang);
            const map = new Map(translated.map(n => [n.id, n]));
            setNews(prev => prev.map(n => map.get(n.id) || n));
          }
          setTranslating(false);
          setStatus('done');
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
