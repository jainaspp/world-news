import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '../types';
import { fetchAllNews } from '../utils/newsFetcher';
import { translateBatch } from '../utils/translate';

// ─── 帶自動重試的新聞獲取 ─────────────────────────────────────
async function fetchWithRetry(
  group: string,
  retries = 3,
  baseDelay = 1000,
): Promise<NewsItem[]> {
  let delay = baseDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const items = await fetchAllNews(group);
      if (items.length > 0) return items;
      // 0 結果可能是臨時的，再試
      if (attempt < retries) {
        console.log(`[useNews] 第 ${attempt} 次取得 0 結果，${delay}ms 後重試...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      }
    } catch (e: any) {
      console.error(`[useNews] 第 ${attempt} 次失敗:`, e?.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  return []; // 3 次都失敗
}

export function useNews(group: string, translateLang: string) {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'|'translating'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const loadNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setErrorMsg(''); }
    setStatus('loading');

    // 自動重試 3 次（1s → 2s → 4s）
    const items = await fetchWithRetry(group, 3, 1000);

    setNews(items);
    setStatus('done');

    if (items.length === 0) {
      setErrorMsg('⚠️ 網絡持續不穩，請檢查連線後點擊 🔄 刷新');
    }

    // 背景翻譯（progressive reveal：每批 5 條，翻完一批更新一次 UI）
    if (items.length > 0 && translateLang !== 'en') {
      setTranslating(true);
      setStatus('translating');
      const BATCH = 5;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        const translated = await translateBatch(batch, translateLang);
        const map = new Map(translated.map(n => [n.id, n]));
        setNews(prev => prev.map(n => map.get(n.id) || n));
      }
      setTranslating(false);
      setStatus('done');
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
